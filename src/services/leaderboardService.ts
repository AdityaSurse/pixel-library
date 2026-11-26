import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface RoomMemberRecord {
  uid: string;
  username: string;
  preset: string;
  accessory?: string | null;
  weekKey: string;
  weekMinutes: number;
  weekPomodoros: number;
  lastSeen?: unknown;
}

/**
 * Returns the ISO 8601 week key for a given date in reader local time, e.g. "2026-W48".
 */
export function getISOWeekKey(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNum = d.getDay() || 7; // Sunday is 7 in ISO
  d.setDate(d.getDate() + 4 - dayNum);
  const year = d.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${year}-W${weekNo < 10 ? '0' + weekNo : weekNo}`;
}

/**
 * Returns the ISO 8601 week number (e.g. 48) for display in subtitle.
 */
export function getISOWeekNumber(date: Date = new Date()): number {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const year = d.getFullYear();
  const yearStart = new Date(year, 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Updates Firestore rooms/{code}/members/{uid} when a focus phase is counted.
 * Resets weekMinutes/weekPomodoros if stored weekKey differs from current local weekKey.
 */
export async function recordRoomMemberFocus(
  roomCode: string,
  uid: string,
  profile: {
    username: string;
    preset: string;
    accessory?: string | null;
  },
  focusMinutes: number
): Promise<void> {
  const cleanCode = roomCode.toUpperCase();
  const memberRef = doc(db, 'rooms', cleanCode, 'members', uid);
  const currentWeekKey = getISOWeekKey(new Date());

  try {
    const snap = await getDoc(memberRef);
    let weekMinutes = focusMinutes;
    let weekPomodoros = 1;

    if (snap.exists()) {
      const data = snap.data();
      if (data.weekKey === currentWeekKey) {
        weekMinutes = (data.weekMinutes || 0) + focusMinutes;
        weekPomodoros = (data.weekPomodoros || 0) + 1;
      }
    }

    await setDoc(
      memberRef,
      {
        username: profile.username,
        preset: profile.preset,
        accessory: profile.accessory || null,
        weekKey: currentWeekKey,
        weekMinutes,
        weekPomodoros,
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to record room member focus session:', err);
  }
}

/**
 * Subscribes to rooms/{code}/members live with onSnapshot, returning
 * members filtered for the current week and sorted by weekMinutes descending.
 */
export function subscribeToRoomLeaderboard(
  roomCode: string,
  onUpdate: (members: RoomMemberRecord[], topLeaderUid: string | null) => void
): () => void {
  const cleanCode = roomCode.toUpperCase();
  const membersColl = collection(db, 'rooms', cleanCode, 'members');
  const currentWeek = getISOWeekKey(new Date());

  return onSnapshot(
    membersColl,
    (snapshot) => {
      const allMembers: RoomMemberRecord[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.weekKey === currentWeek) {
          allMembers.push({
            uid: docSnap.id,
            username: d.username || 'reader',
            preset: d.preset || 'aditya',
            accessory: d.accessory || null,
            weekKey: d.weekKey,
            weekMinutes: typeof d.weekMinutes === 'number' ? d.weekMinutes : 0,
            weekPomodoros: typeof d.weekPomodoros === 'number' ? d.weekPomodoros : 0,
            lastSeen: d.lastSeen,
          });
        }
      });

      // Sort descending: highest minutes first, then highest pomodoros
      allMembers.sort((a, b) => {
        if (b.weekMinutes !== a.weekMinutes) {
          return b.weekMinutes - a.weekMinutes;
        }
        return b.weekPomodoros - a.weekPomodoros;
      });

      const topLeader = allMembers.length > 0 ? allMembers[0].uid : null;
      onUpdate(allMembers, topLeader);
    },
    (err) => {
      console.error('Error subscribing to room leaderboard:', err);
    }
  );
}
