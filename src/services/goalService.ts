import { ref, set, remove } from 'firebase/database';
import { collection, addDoc, getDocs, query, where, serverTimestamp as firestoreServerTimestamp } from 'firebase/firestore';
import { rtdb, db } from '../lib/firebase';

export type GoalStatus = 'open' | 'done' | 'missed';

export interface LiveReaderGoal {
  text: string;
  status: GoalStatus;
  setAt: number | object;
}

export interface StoredGoalRecord {
  text: string;
  status: 'done' | 'missed';
  roomCode: string;
  theme: string;
  endedAt: unknown;
}

/**
 * Sets an active session goal for a reader in RTDB.
 */
export async function setReaderGoal(roomCode: string, uid: string, text: string): Promise<void> {
  const cleanText = text.trim().slice(0, 60);
  const goalRef = ref(rtdb, `rooms/${roomCode}/presence/${uid}/goal`);
  const payload: LiveReaderGoal = {
    text: cleanText,
    status: 'open',
    setAt: Date.now(),
  };
  await set(goalRef, payload);
}

/**
 * Updates the status of an active goal in RTDB ('done' | 'missed').
 */
export async function updateReaderGoalStatus(
  roomCode: string,
  uid: string,
  status: 'done' | 'missed'
): Promise<void> {
  const statusRef = ref(rtdb, `rooms/${roomCode}/presence/${uid}/goal/status`);
  await set(statusRef, status);
}

/**
 * Clears the reader's desk note goal in RTDB.
 */
export async function clearReaderGoal(roomCode: string, uid: string): Promise<void> {
  const goalRef = ref(rtdb, `rooms/${roomCode}/presence/${uid}/goal`);
  await remove(goalRef);
}

/**
 * Saves a completed or missed goal record to Firestore at users/{uid}/goals.
 */
export async function saveCompletedGoalToFirestore(
  uid: string,
  goal: {
    text: string;
    status: 'done' | 'missed';
    roomCode: string;
    theme: string;
  }
): Promise<string> {
  const goalsCol = collection(db, 'users', uid, 'goals');
  const docRef = await addDoc(goalsCol, {
    text: goal.text.trim().slice(0, 60),
    status: goal.status,
    roomCode: goal.roomCode,
    theme: goal.theme || 'classic',
    endedAt: firestoreServerTimestamp(),
  });
  return docRef.id;
}

/**
 * Returns the count of done goals completed this week (week starting Monday 00:00:00 local time).
 */
export async function getWeeklyGoalsDoneCount(uid: string): Promise<number> {
  try {
    const now = new Date();
    // In JavaScript, getDay(): Sunday = 0, Monday = 1, ..., Saturday = 6
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const mondayTimestampMs = monday.getTime();

    const goalsCol = collection(db, 'users', uid, 'goals');
    const q = query(goalsCol, where('status', '==', 'done'));
    const snapshot = await getDocs(q);

    let count = 0;
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const endedAt = data.endedAt;
      if (endedAt) {
        // Handle Firestore Timestamp or Date object or milliseconds
        let endedMs = 0;
        if (typeof endedAt.toMillis === 'function') {
          endedMs = endedAt.toMillis();
        } else if (typeof endedAt.toDate === 'function') {
          endedMs = endedAt.toDate().getTime();
        } else if (endedAt instanceof Date) {
          endedMs = endedAt.getTime();
        } else if (typeof endedAt === 'number') {
          endedMs = endedAt;
        }

        if (endedMs >= mondayTimestampMs) {
          count++;
        }
      }
    });

    return count;
  } catch (err) {
    console.error('Failed to get weekly goals done count:', err);
    return 0;
  }
}
