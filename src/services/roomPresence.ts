import {
  ref,
  set,
  remove,
  onValue,
  onDisconnect,
  runTransaction,
  serverTimestamp,
  DatabaseReference,
  Unsubscribe,
} from 'firebase/database';
import { rtdb } from '../lib/firebase';
import { UserProfile } from '../context/AuthContext';
import { LiveReaderGoal } from './goalService';

export type ReaderStatus = 'browsing' | 'studying' | 'break' | 'away';

export interface ReaderPresence {
  uid: string;
  username: string;
  preset: string;
  presetIndex: number;
  seatId: string | null;
  status: ReaderStatus;
  joinedAt: number | object;
  lastActive: number | object;
  goal?: LiveReaderGoal | null;
}

export type RoomPresenceMap = Record<string, ReaderPresence>;
export type RoomSeatsMap = Record<string, string>; // seatId -> uid

export interface RoomPresenceManager {
  claimSeat: (seatId: string) => Promise<boolean>;
  standUp: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  setStatus: (status: ReaderStatus) => Promise<void>;
  cleanup: () => void;
}

export function subscribeToRoomData(
  code: string,
  onPresenceChange: (presence: RoomPresenceMap) => void,
  onSeatsChange: (seats: RoomSeatsMap) => void
): () => void {
  const presenceRef = ref(rtdb, `rooms/${code}/presence`);
  const seatsRef = ref(rtdb, `rooms/${code}/seats`);

  const unsubPresence = onValue(presenceRef, (snapshot) => {
    if (snapshot.exists()) {
      onPresenceChange(snapshot.val() as RoomPresenceMap);
    } else {
      onPresenceChange({});
    }
  });

  const unsubSeats = onValue(seatsRef, (snapshot) => {
    if (snapshot.exists()) {
      onSeatsChange(snapshot.val() as RoomSeatsMap);
    } else {
      onSeatsChange({});
    }
  });

  return () => {
    unsubPresence();
    unsubSeats();
  };
}

export function initRoomPresence(
  code: string,
  uid: string,
  profile: UserProfile,
  onSeatConflict?: () => void
): RoomPresenceManager {
  const presenceRef: DatabaseReference = ref(rtdb, `rooms/${code}/presence/${uid}`);
  const connectedRef: DatabaseReference = ref(rtdb, '.info/connected');

  let currentSeatId: string | null = null;
  let currentStatus: ReaderStatus = 'browsing';
  let previousStatusBeforeAway: ReaderStatus = 'browsing';
  let isCleanedUp = false;

  // 1. Establish presence & re-register on disconnect
  const unsubConnected: Unsubscribe = onValue(connectedRef, async (snap) => {
    if (snap.val() === true && !isCleanedUp) {
      // REGISTER onDisconnect().remove() BEFORE writing!
      await onDisconnect(presenceRef).remove();

      if (currentSeatId) {
        const seatRef = ref(rtdb, `rooms/${code}/seats/${currentSeatId}`);
        await onDisconnect(seatRef).remove();
      }

      const initialPayload: ReaderPresence = {
        uid,
        username: profile.username,
        preset: profile.preset,
        presetIndex: profile.presetIndex ?? 0,
        seatId: currentSeatId,
        status: currentStatus,
        joinedAt: serverTimestamp(),
        lastActive: serverTimestamp(),
      };

      await set(presenceRef, initialPayload);
    }
  });

  // 2. Heartbeat: UPDATE lastActive every 30s
  const heartbeatInterval = setInterval(() => {
    if (isCleanedUp) return;
    const lastActiveRef = ref(rtdb, `rooms/${code}/presence/${uid}/lastActive`);
    set(lastActiveRef, serverTimestamp()).catch(() => {});
  }, 30000);

  // 3. Tab visibility: AWAY if tab hidden for over 60s
  let hiddenTimer: NodeJS.Timeout | null = null;

  const handleVisibilityChange = () => {
    if (document.hidden) {
      hiddenTimer = setTimeout(() => {
        if (!isCleanedUp && currentStatus !== 'away') {
          previousStatusBeforeAway = currentStatus;
          currentStatus = 'away';
          const statusRef = ref(rtdb, `rooms/${code}/presence/${uid}/status`);
          set(statusRef, 'away').catch(() => {});
        }
      }, 60000); // 60s
    } else {
      if (hiddenTimer) {
        clearTimeout(hiddenTimer);
        hiddenTimer = null;
      }
      if (!isCleanedUp && currentStatus === 'away') {
        currentStatus = previousStatusBeforeAway;
        const statusRef = ref(rtdb, `rooms/${code}/presence/${uid}/status`);
        set(statusRef, currentStatus).catch(() => {});
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // 4. Claim seat with runTransaction so two people can never sit in the same chair
  const claimSeat = async (newSeatId: string): Promise<boolean> => {
    if (isCleanedUp) return false;
    const newSeatRef = ref(rtdb, `rooms/${code}/seats/${newSeatId}`);

    try {
      const txResult = await runTransaction(newSeatRef, (currentVal) => {
        if (currentVal !== null && currentVal !== uid) {
          // Chair is occupied! Abort transaction.
          return undefined;
        }
        return uid; // Successfully claimed!
      });

      if (!txResult.committed) {
        if (onSeatConflict) onSeatConflict();
        return false;
      }

      // If already in another seat, release old seat
      if (currentSeatId && currentSeatId !== newSeatId) {
        const oldSeatRef = ref(rtdb, `rooms/${code}/seats/${currentSeatId}`);
        await remove(oldSeatRef);
        await onDisconnect(oldSeatRef).cancel();
      }

      currentSeatId = newSeatId;
      currentStatus = 'studying';

      // Register onDisconnect for new seat
      await onDisconnect(newSeatRef).remove();

      // Update presence
      await set(ref(rtdb, `rooms/${code}/presence/${uid}/seatId`), newSeatId);
      await set(ref(rtdb, `rooms/${code}/presence/${uid}/status`), 'studying');

      return true;
    } catch (err) {
      console.error('Error claiming seat:', err);
      return false;
    }
  };

  // 5. Stand up: release seat but stay in the room (status browsing)
  const standUp = async (): Promise<void> => {
    if (!currentSeatId || isCleanedUp) return;
    const oldSeatId = currentSeatId;
    currentSeatId = null;
    currentStatus = 'browsing';

    try {
      const oldSeatRef = ref(rtdb, `rooms/${code}/seats/${oldSeatId}`);
      await remove(oldSeatRef);
      await onDisconnect(oldSeatRef).cancel();

      await set(ref(rtdb, `rooms/${code}/presence/${uid}/seatId`), null);
      await set(ref(rtdb, `rooms/${code}/presence/${uid}/status`), 'browsing');
      await remove(ref(rtdb, `rooms/${code}/presence/${uid}/goal`));
    } catch (err) {
      console.error('Error standing up:', err);
    }
  };

  // 6. Set status (studying, break, etc.)
  const setStatus = async (status: ReaderStatus): Promise<void> => {
    if (isCleanedUp) return;
    currentStatus = status;
    const statusRef = ref(rtdb, `rooms/${code}/presence/${uid}/status`);
    await set(statusRef, status);
  };

  // 7. Leave room: release presence & seat
  const leaveRoom = async (): Promise<void> => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    try {
      if (currentSeatId) {
        const seatRef = ref(rtdb, `rooms/${code}/seats/${currentSeatId}`);
        await remove(seatRef);
        await onDisconnect(seatRef).cancel();
      }
      await remove(presenceRef);
      await onDisconnect(presenceRef).cancel();
    } catch (err) {
      console.error('Error leaving room:', err);
    }
  };

  const cleanup = () => {
    isCleanedUp = true;
    unsubConnected();
    clearInterval(heartbeatInterval);
    if (hiddenTimer) clearTimeout(hiddenTimer);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };

  return {
    claimSeat,
    standUp,
    leaveRoom,
    setStatus,
    cleanup,
  };
}
