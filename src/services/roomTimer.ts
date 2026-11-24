import {
  ref,
  set,
  onValue,
  runTransaction,
  serverTimestamp,
} from 'firebase/database';
import { rtdb } from '../lib/firebase';

export interface RoomTimerData {
  mode: 'focus' | 'break';
  durationMs: number;
  startedAt: number | null;
  pausedRemainingMs: number | null;
  round: number;
  updatedBy: string;
}

// Global server time offset cache
let cachedServerOffset = 0;
let offsetListening = false;

export function initServerTimeOffset(): void {
  if (offsetListening) return;
  offsetListening = true;
  const offsetRef = ref(rtdb, '.info/serverTimeOffset');
  onValue(offsetRef, (snap) => {
    cachedServerOffset = typeof snap.val() === 'number' ? snap.val() : 0;
  });
}

export function getServerTimeOffset(): number {
  return cachedServerOffset;
}

/**
 * Computes exact remaining milliseconds using RTDB server time offset.
 * NEVER count down locally; always derive from startedAt + durationMs - serverNow.
 */
export function computeRemainingMs(timer: RoomTimerData | null): number {
  if (!timer) return 0;

  if (timer.startedAt !== null) {
    const serverNow = Date.now() + cachedServerOffset;
    const elapsed = serverNow - timer.startedAt;
    return Math.max(0, timer.durationMs - elapsed);
  }

  return timer.pausedRemainingMs !== null ? timer.pausedRemainingMs : timer.durationMs;
}

export function subscribeToRoomTimer(
  code: string,
  onTimerChange: (timer: RoomTimerData | null) => void
): () => void {
  initServerTimeOffset();
  const timerRef = ref(rtdb, `rooms/${code}/timer`);

  const unsub = onValue(timerRef, (snap) => {
    if (snap.exists()) {
      onTimerChange(snap.val() as RoomTimerData);
    } else {
      onTimerChange(null);
    }
  });

  return unsub;
}

export async function startTimer(
  code: string,
  focusMinutes: number,
  username: string
): Promise<void> {
  const timerRef = ref(rtdb, `rooms/${code}/timer`);
  const payload: RoomTimerData = {
    mode: 'focus',
    durationMs: focusMinutes * 60 * 1000,
    startedAt: serverTimestamp() as unknown as number,
    pausedRemainingMs: null,
    round: 1,
    updatedBy: username,
  };
  await set(timerRef, payload);
}

export async function pauseTimer(
  code: string,
  currentTimer: RoomTimerData,
  remainingMs: number,
  username: string
): Promise<void> {
  const timerRef = ref(rtdb, `rooms/${code}/timer`);
  const payload: RoomTimerData = {
    ...currentTimer,
    startedAt: null,
    pausedRemainingMs: Math.max(0, remainingMs),
    updatedBy: username,
  };
  await set(timerRef, payload);
}

export async function resumeTimer(
  code: string,
  currentTimer: RoomTimerData,
  username: string
): Promise<void> {
  const timerRef = ref(rtdb, `rooms/${code}/timer`);
  const durationMs = currentTimer.pausedRemainingMs ?? currentTimer.durationMs;
  const payload: RoomTimerData = {
    ...currentTimer,
    durationMs,
    startedAt: serverTimestamp() as unknown as number,
    pausedRemainingMs: null,
    updatedBy: username,
  };
  await set(timerRef, payload);
}

export async function resetTimer(
  code: string,
  focusMinutes: number,
  username: string
): Promise<void> {
  const timerRef = ref(rtdb, `rooms/${code}/timer`);
  const payload: RoomTimerData = {
    mode: 'focus',
    durationMs: focusMinutes * 60 * 1000,
    startedAt: null,
    pausedRemainingMs: null,
    round: 1,
    updatedBy: username,
  };
  await set(timerRef, payload);
}

export async function skipTimer(
  code: string,
  currentTimer: RoomTimerData,
  focusMinutes: number,
  breakMinutes: number,
  username: string
): Promise<void> {
  const timerRef = ref(rtdb, `rooms/${code}/timer`);
  const nextMode = currentTimer.mode === 'focus' ? 'break' : 'focus';
  const nextDurationMs = (nextMode === 'break' ? breakMinutes : focusMinutes) * 60 * 1000;
  const nextRound = currentTimer.mode === 'break' ? currentTimer.round + 1 : currentTimer.round;

  const payload: RoomTimerData = {
    mode: nextMode,
    durationMs: nextDurationMs,
    startedAt: serverTimestamp() as unknown as number,
    pausedRemainingMs: null,
    round: nextRound,
    updatedBy: username,
  };
  await set(timerRef, payload);
}

/**
 * Concurrency-safe phase advance.
 * Only succeeds if round and mode match what triggered the advance, preventing duplicate advancements.
 */
export async function advanceTimerPhase(
  code: string,
  triggeringRound: number,
  triggeringMode: 'focus' | 'break',
  focusMinutes: number,
  breakMinutes: number
): Promise<boolean> {
  const timerRef = ref(rtdb, `rooms/${code}/timer`);

  try {
    const result = await runTransaction(timerRef, (current: RoomTimerData | null) => {
      if (!current) return current;

      // Abort if another client already advanced
      if (current.round !== triggeringRound || current.mode !== triggeringMode) {
        return undefined;
      }

      const nextMode = current.mode === 'focus' ? 'break' : 'focus';
      const nextDurationMs = (nextMode === 'break' ? breakMinutes : focusMinutes) * 60 * 1000;
      const nextRound = current.mode === 'break' ? current.round + 1 : current.round;

      return {
        mode: nextMode,
        durationMs: nextDurationMs,
        startedAt: serverTimestamp(),
        pausedRemainingMs: null,
        round: nextRound,
        updatedBy: 'Clock',
      };
    });

    return result.committed;
  } catch (err) {
    console.warn('Error in advanceTimerPhase transaction:', err);
    return false;
  }
}
