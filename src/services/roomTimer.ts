import {
  ref,
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

export type TimerUIState = 'running' | 'paused' | 'idle';

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
 * Derives the UI timer state strictly from data:
 * - running = startedAt != null
 * - paused = startedAt == null && pausedRemainingMs != null
 * - idle = startedAt == null && pausedRemainingMs == null
 */
export function getTimerUIState(timer: RoomTimerData | null): TimerUIState {
  if (!timer) return 'idle';
  if (timer.startedAt != null) return 'running';
  if (timer.pausedRemainingMs != null) return 'paused';
  return 'idle';
}

/**
 * Computes exact remaining milliseconds using RTDB server time offset.
 * NEVER count down locally; always derive from startedAt + durationMs - serverNow.
 */
export function computeRemainingMs(timer: RoomTimerData | null): number {
  if (!timer) return 0;

  // Running: startedAt != null
  if (timer.startedAt != null) {
    const serverNow = Date.now() + cachedServerOffset;
    const elapsed = Math.max(0, serverNow - timer.startedAt);
    return Math.max(0, timer.durationMs - elapsed);
  }

  // Paused: frozen remaining time
  if (timer.pausedRemainingMs != null) {
    return Math.max(0, timer.pausedRemainingMs);
  }

  // Idle: full duration
  return timer.durationMs;
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

/**
 * START (idle): startedAt = serverTimestamp, durationMs = full length, pausedRemainingMs = null.
 */
export async function startTimer(
  code: string,
  focusMinutes: number,
  username: string
): Promise<void> {
  const timerRef = ref(rtdb, `rooms/${code}/timer`);
  await runTransaction(timerRef, (current: RoomTimerData | null) => {
    // If already running, do nothing
    if (current && current.startedAt != null) {
      return current;
    }
    const fullDurationMs = focusMinutes * 60 * 1000;
    return {
      mode: 'focus',
      durationMs: fullDurationMs,
      startedAt: serverTimestamp(),
      pausedRemainingMs: null,
      round: current?.round || 1,
      updatedBy: username,
    };
  });
}

/**
 * PAUSE (running): pausedRemainingMs = current remaining ms (computed with .info/serverTimeOffset), startedAt = null.
 */
export async function pauseTimer(
  code: string,
  username: string
): Promise<void> {
  const timerRef = ref(rtdb, `rooms/${code}/timer`);
  await runTransaction(timerRef, (current: RoomTimerData | null) => {
    // Only pause if currently running
    if (!current || current.startedAt == null) {
      return current;
    }
    const serverNow = Date.now() + cachedServerOffset;
    const elapsed = Math.max(0, serverNow - current.startedAt);
    const remainingMs = Math.max(0, current.durationMs - elapsed);

    return {
      ...current,
      startedAt: null,
      pausedRemainingMs: remainingMs,
      updatedBy: username,
    };
  });
}

/**
 * RESUME (paused): startedAt = serverTimestamp, durationMs = pausedRemainingMs, pausedRemainingMs = null.
 */
export async function resumeTimer(
  code: string,
  username: string
): Promise<void> {
  const timerRef = ref(rtdb, `rooms/${code}/timer`);
  await runTransaction(timerRef, (current: RoomTimerData | null) => {
    // Only resume if currently paused
    if (!current || current.startedAt != null || current.pausedRemainingMs == null) {
      return current;
    }
    return {
      ...current,
      durationMs: current.pausedRemainingMs,
      startedAt: serverTimestamp(),
      pausedRemainingMs: null,
      updatedBy: username,
    };
  });
}

/**
 * RESET: back to idle focus with the full focus length, round unchanged.
 */
export async function resetTimer(
  code: string,
  focusMinutes: number,
  username: string
): Promise<void> {
  const timerRef = ref(rtdb, `rooms/${code}/timer`);
  await runTransaction(timerRef, (current: RoomTimerData | null) => {
    const fullDurationMs = focusMinutes * 60 * 1000;
    return {
      mode: 'focus',
      durationMs: fullDurationMs,
      startedAt: null,
      pausedRemainingMs: null,
      round: current?.round || 1,
      updatedBy: username,
    };
  });
}

/**
 * SKIP: advance to next phase immediately.
 */
export async function skipTimer(
  code: string,
  focusMinutes: number,
  breakMinutes: number,
  username: string
): Promise<void> {
  const timerRef = ref(rtdb, `rooms/${code}/timer`);
  await runTransaction(timerRef, (current: RoomTimerData | null) => {
    const nextMode = current?.mode === 'focus' ? 'break' : 'focus';
    const nextDurationMs = (nextMode === 'break' ? breakMinutes : focusMinutes) * 60 * 1000;
    const nextRound = current?.mode === 'break' ? (current.round || 1) + 1 : (current?.round || 1);

    return {
      mode: nextMode,
      durationMs: nextDurationMs,
      startedAt: serverTimestamp(),
      pausedRemainingMs: null,
      round: nextRound,
      updatedBy: username,
    };
  });
}

/**
 * Updates timer duration immediately if currently idle.
 */
export async function updateIdleTimerDuration(
  code: string,
  newFocusMinutes: number
): Promise<void> {
  const timerRef = ref(rtdb, `rooms/${code}/timer`);
  await runTransaction(timerRef, (current: RoomTimerData | null) => {
    // Only apply immediately if idle (startedAt == null && pausedRemainingMs == null)
    if (!current || (current.startedAt == null && current.pausedRemainingMs == null)) {
      return {
        mode: 'focus',
        durationMs: newFocusMinutes * 60 * 1000,
        startedAt: null,
        pausedRemainingMs: null,
        round: current?.round || 1,
        updatedBy: 'Settings',
      };
    }
    return current;
  });
}

/**
 * Concurrency-safe phase advance.
 * NEVER fires if paused or idle (startedAt must be non-null).
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

      // CRITICAL: NEVER auto-advance if paused or idle!
      if (current.startedAt == null) {
        return undefined;
      }

      // Abort if another client already advanced
      if (current.round !== triggeringRound || current.mode !== triggeringMode) {
        return undefined;
      }

      const serverNow = Date.now() + cachedServerOffset;
      const elapsed = serverNow - current.startedAt;
      if (elapsed < current.durationMs) {
        // Not yet expired
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
