import {
  ref,
  set,
  remove,
  update,
  get,
  query,
  orderByValue,
  equalTo,
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
  accessory?: string | null;
  seatId: string | null;
  status: ReaderStatus;
  joinedAt: number | object;
  lastActive: number | object;
  goal?: LiveReaderGoal | null;
  tabId?: string;
}

export type RoomPresenceMap = Record<string, ReaderPresence>;
export type RoomSeatsMap = Record<string, string>; // seatId -> uid

export interface RoomPresenceManager {
  claimSeat: (seatId: string) => Promise<boolean>;
  standUp: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  setStatus: (status: ReaderStatus) => Promise<void>;
  takeoverHere: () => Promise<void>;
  isPaused: () => boolean;
  cleanup: () => void;
}

export interface RoomPresenceOptions {
  onSeatConflict?: () => void;
  onTabTakeover?: () => void;
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
  optionsOrConflictHandler?: RoomPresenceOptions | (() => void)
): RoomPresenceManager {
  const options: RoomPresenceOptions =
    typeof optionsOrConflictHandler === 'function'
      ? { onSeatConflict: optionsOrConflictHandler }
      : optionsOrConflictHandler || {};

  const presenceRef: DatabaseReference = ref(rtdb, `rooms/${code}/presence/${uid}`);
  const connectedRef: DatabaseReference = ref(rtdb, '.info/connected');

  let currentSeatId: string | null = null;
  let currentStatus: ReaderStatus = 'browsing';
  let previousStatusBeforeAway: ReaderStatus = 'browsing';
  let isCleanedUp = false;
  let isPausedByOtherTab = false;

  // Generate unique tab ID for multi-tab takeover detection
  let myTabId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Multi-tab channel & storage coordination
  const channelName = `pl_tab_${code}_${uid}`;
  const storageKey = `pl_tab_ls_${code}_${uid}`;
  let channel: BroadcastChannel | null = null;

  const pausePresenceForOtherTab = async () => {
    if (isPausedByOtherTab || isCleanedUp) return;
    isPausedByOtherTab = true;

    // Cancel onDisconnect handlers so closing this inactive tab does NOT clear presence or seat
    try {
      await onDisconnect(presenceRef).cancel();
      if (currentSeatId) {
        await onDisconnect(ref(rtdb, `rooms/${code}/seats/${currentSeatId}`)).cancel();
      }
    } catch (err) {
      console.warn('Failed to cancel onDisconnect during tab takeover:', err);
    }

    if (options.onTabTakeover) {
      options.onTabTakeover();
    }
  };

  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      channel = new BroadcastChannel(channelName);
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'claim_tab') {
          if (event.data.tabId !== myTabId && !isCleanedUp) {
            pausePresenceForOtherTab();
          }
        }
      };
      // Announce this new tab to older tabs so the newest tab wins
      channel.postMessage({ type: 'claim_tab', tabId: myTabId, timestamp: Date.now() });
    } catch {
      channel = null;
    }
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === storageKey && e.newValue && e.newValue !== myTabId && !isCleanedUp) {
      pausePresenceForOtherTab();
    }
  };
  window.addEventListener('storage', handleStorage);
  try {
    localStorage.setItem(storageKey, myTabId);
  } catch {}

  /**
   * Helper: Find every seat currently owned by this uid in RTDB
   */
  const findSeatsOwnedByUid = async (): Promise<string[]> => {
    try {
      const seatsQuery = query(ref(rtdb, `rooms/${code}/seats`), orderByValue(), equalTo(uid));
      const snap = await get(seatsQuery);
      if (snap.exists()) {
        return Object.keys(snap.val());
      }
    } catch (err) {
      console.error('Failed to query seats owned by uid:', err);
    }
    return [];
  };

  /**
   * Restore on rejoin & reconnect:
   * 1. Register onDisconnect() for presence
   * 2. Query seats with orderByValue().equalTo(uid)
   * 3. If user owns a seat: restore it, keep the first, remove extras, re-register onDisconnect().remove()
   * 4. Set presence payload
   */
  const restoreAndRegisterPresence = async () => {
    if (isCleanedUp || isPausedByOtherTab) return;

    // Always register onDisconnect().remove() BEFORE writing anything!
    await onDisconnect(presenceRef).remove();

    // Query seats owned by this user
    const ownedSeats = await findSeatsOwnedByUid();

    if (ownedSeats.length > 0) {
      const restoredSeat = ownedSeats[0];
      currentSeatId = restoredSeat;
      currentStatus = 'studying';

      // If they own MORE than one, keep the first and remove the others
      if (ownedSeats.length > 1) {
        for (let i = 1; i < ownedSeats.length; i++) {
          const extraSeat = ownedSeats[i];
          try {
            await remove(ref(rtdb, `rooms/${code}/seats/${extraSeat}`));
            await onDisconnect(ref(rtdb, `rooms/${code}/seats/${extraSeat}`)).cancel();
          } catch (err) {
            console.warn('Failed to remove extra seat:', err);
          }
        }
      }

      // Re-register onDisconnect().remove() for the restored seat
      const seatRef = ref(rtdb, `rooms/${code}/seats/${restoredSeat}`);
      await onDisconnect(seatRef).remove();
    } else if (currentSeatId) {
      // Re-register onDisconnect for currently tracked seat
      const seatRef = ref(rtdb, `rooms/${code}/seats/${currentSeatId}`);
      await onDisconnect(seatRef).remove();
    }

    const initialPayload: ReaderPresence = {
      uid,
      username: profile.username,
      preset: profile.preset,
      presetIndex: profile.presetIndex ?? 0,
      accessory: profile.accessory || null,
      seatId: currentSeatId,
      status: currentStatus,
      joinedAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      tabId: myTabId,
    };

    await set(presenceRef, initialPayload);
  };

  // 1. Establish presence & re-register on disconnect / reconnect
  const unsubConnected: Unsubscribe = onValue(connectedRef, async (snap) => {
    if (snap.val() === true && !isCleanedUp && !isPausedByOtherTab) {
      await restoreAndRegisterPresence();
    }
  });

  // 2. Heartbeat: UPDATE lastActive every 30s
  const heartbeatInterval = setInterval(() => {
    if (isCleanedUp || isPausedByOtherTab) return;
    const lastActiveRef = ref(rtdb, `rooms/${code}/presence/${uid}/lastActive`);
    set(lastActiveRef, serverTimestamp()).catch(() => {});
  }, 30000);

  // 3. Tab visibility: AWAY if tab hidden for over 60s
  let hiddenTimer: NodeJS.Timeout | null = null;

  const handleVisibilityChange = () => {
    if (isPausedByOtherTab || isCleanedUp) return;

    if (document.hidden) {
      hiddenTimer = setTimeout(() => {
        if (!isCleanedUp && !isPausedByOtherTab && currentStatus !== 'away') {
          previousStatusBeforeAway = currentStatus;
          currentStatus = 'away';
          const statusRef = ref(rtdb, `rooms/${code}/presence/${uid}/status`);
          set(statusRef, 'away').catch(() => {});
        }
      }, 60000);
    } else {
      if (hiddenTimer) {
        clearTimeout(hiddenTimer);
        hiddenTimer = null;
      }
      if (!isCleanedUp && !isPausedByOtherTab && currentStatus === 'away') {
        currentStatus = previousStatusBeforeAway;
        const statusRef = ref(rtdb, `rooms/${code}/presence/${uid}/status`);
        set(statusRef, currentStatus).catch(() => {});
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // 4. Claim seat = Move:
  // Transaction on new seat -> remove every OTHER seat owned by uid -> update presence
  const claimSeat = async (newSeatId: string): Promise<boolean> => {
    if (isCleanedUp || isPausedByOtherTab) return false;
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
        if (options.onSeatConflict) options.onSeatConflict();
        return false;
      }

      // Register onDisconnect for new seat
      await onDisconnect(newSeatRef).remove();

      // Find ALL OTHER seats owned by this uid
      const allOwned = await findSeatsOwnedByUid();
      const otherSeats = allOwned.filter((s) => s !== newSeatId);
      if (currentSeatId && currentSeatId !== newSeatId && !otherSeats.includes(currentSeatId)) {
        otherSeats.push(currentSeatId);
      }

      // Cancel onDisconnect on all other seats
      for (const s of otherSeats) {
        try {
          await onDisconnect(ref(rtdb, `rooms/${code}/seats/${s}`)).cancel();
        } catch {}
      }

      // In one multi-path update after transaction succeeds:
      // remove every OTHER seat owned by this uid and set presence.seatId to the new seat
      const updates: Record<string, any> = {};
      updates[`rooms/${code}/presence/${uid}/seatId`] = newSeatId;
      updates[`rooms/${code}/presence/${uid}/status`] = 'studying';
      for (const s of otherSeats) {
        updates[`rooms/${code}/seats/${s}`] = null;
      }

      await update(ref(rtdb), updates);

      currentSeatId = newSeatId;
      currentStatus = 'studying';
      return true;
    } catch (err) {
      console.error('Error claiming seat:', err);
      return false;
    }
  };

  // 5. Stand up: remove EVERY seat owned by this uid, then update presence
  const standUp = async (): Promise<void> => {
    if (isCleanedUp || isPausedByOtherTab) return;

    try {
      const allOwned = await findSeatsOwnedByUid();
      if (currentSeatId && !allOwned.includes(currentSeatId)) {
        allOwned.push(currentSeatId);
      }

      for (const s of allOwned) {
        try {
          await onDisconnect(ref(rtdb, `rooms/${code}/seats/${s}`)).cancel();
        } catch {}
      }

      const updates: Record<string, any> = {};
      for (const s of allOwned) {
        updates[`rooms/${code}/seats/${s}`] = null;
      }
      updates[`rooms/${code}/presence/${uid}/seatId`] = null;
      updates[`rooms/${code}/presence/${uid}/status`] = 'browsing';
      updates[`rooms/${code}/presence/${uid}/goal`] = null;

      await update(ref(rtdb), updates);

      currentSeatId = null;
      currentStatus = 'browsing';
    } catch (err) {
      console.error('Error standing up:', err);
    }
  };

  // 6. Set status
  const setStatus = async (status: ReaderStatus): Promise<void> => {
    if (isCleanedUp || isPausedByOtherTab) return;
    currentStatus = status;
    const statusRef = ref(rtdb, `rooms/${code}/presence/${uid}/status`);
    await set(statusRef, status);
  };

  // 7. Leave room / Sign out: remove EVERY seat owned by this uid, then clear presence
  const leaveRoom = async (): Promise<void> => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    try {
      const allOwned = await findSeatsOwnedByUid();
      if (currentSeatId && !allOwned.includes(currentSeatId)) {
        allOwned.push(currentSeatId);
      }

      for (const s of allOwned) {
        try {
          await onDisconnect(ref(rtdb, `rooms/${code}/seats/${s}`)).cancel();
        } catch {}
      }
      try {
        await onDisconnect(presenceRef).cancel();
      } catch {}

      const updates: Record<string, any> = {};
      for (const s of allOwned) {
        updates[`rooms/${code}/seats/${s}`] = null;
      }
      updates[`rooms/${code}/presence/${uid}`] = null;

      await update(ref(rtdb), updates);
      currentSeatId = null;
    } catch (err) {
      console.error('Error leaving room:', err);
    }
  };

  // 8. Self-heal: every 60s, verify that client's own seats and presence agree
  const performSelfHeal = async () => {
    if (isCleanedUp || isPausedByOtherTab) return;

    try {
      const presSnap = await get(presenceRef);
      if (!presSnap.exists()) return;
      const presData = presSnap.val() as ReaderPresence;
      const presSeatId = presData.seatId || null;

      const ownedSeats = await findSeatsOwnedByUid();

      if (ownedSeats.length > 1) {
        // User owns multiple seats: keep one, delete the rest
        const targetSeat =
          presSeatId && ownedSeats.includes(presSeatId) ? presSeatId : ownedSeats[0];

        const updates: Record<string, any> = {};
        for (const s of ownedSeats) {
          if (s !== targetSeat) {
            updates[`rooms/${code}/seats/${s}`] = null;
            await onDisconnect(ref(rtdb, `rooms/${code}/seats/${s}`)).cancel();
          }
        }
        if (presSeatId !== targetSeat) {
          updates[`rooms/${code}/presence/${uid}/seatId`] = targetSeat;
          updates[`rooms/${code}/presence/${uid}/status`] = 'studying';
        }
        await update(ref(rtdb), updates);
        await onDisconnect(ref(rtdb, `rooms/${code}/seats/${targetSeat}`)).remove();
        currentSeatId = targetSeat;
      } else if (ownedSeats.length === 1) {
        const targetSeat = ownedSeats[0];
        if (presSeatId !== targetSeat) {
          // Presence seat desynchronized: update presence to match owned seat
          await set(ref(rtdb, `rooms/${code}/presence/${uid}/seatId`), targetSeat);
          await set(ref(rtdb, `rooms/${code}/presence/${uid}/status`), 'studying');
        }
        await onDisconnect(ref(rtdb, `rooms/${code}/seats/${targetSeat}`)).remove();
        currentSeatId = targetSeat;
      } else if (ownedSeats.length === 0) {
        if (presSeatId !== null) {
          // Presence says seated, but seat is gone: clear presence seat
          await set(ref(rtdb, `rooms/${code}/presence/${uid}/seatId`), null);
          await set(ref(rtdb, `rooms/${code}/presence/${uid}/status`), 'browsing');
          currentSeatId = null;
        }
      }
    } catch (err) {
      console.warn('Self-heal pass failed:', err);
    }
  };

  const selfHealInterval = setInterval(() => {
    performSelfHeal();
  }, 60000);

  // 9. Takeover here: when user clicks "Use here" on an inactive tab
  const takeoverHere = async () => {
    if (isCleanedUp) return;
    isPausedByOtherTab = false;
    myTabId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Announce to other tabs so they pause
    if (channel) {
      try {
        channel.postMessage({ type: 'claim_tab', tabId: myTabId, timestamp: Date.now() });
      } catch {}
    }
    try {
      localStorage.setItem(storageKey, myTabId);
    } catch {}

    await restoreAndRegisterPresence();
  };

  const isPaused = () => isPausedByOtherTab;

  const cleanup = () => {
    isCleanedUp = true;
    unsubConnected();
    clearInterval(heartbeatInterval);
    clearInterval(selfHealInterval);
    if (hiddenTimer) clearTimeout(hiddenTimer);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('storage', handleStorage);
    if (channel) {
      try {
        channel.close();
      } catch {}
    }
  };

  return {
    claimSeat,
    standUp,
    leaveRoom,
    setStatus,
    takeoverHere,
    isPaused,
    cleanup,
  };
}
