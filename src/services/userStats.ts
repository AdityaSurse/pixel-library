import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getLocalDateString, notifyHeatmapUpdate } from './heatmapService';

export interface PomodoroCompletionResult {
  awarded: boolean;
  streakIncreased: boolean;
  newStreak: number;
}

/**
 * Records Pomodoro completion for Google-linked user profile in Firestore.
 * Counts each round once per user (idempotent via lastCountedRound).
 */
export async function recordPomodoroCompletion(
  uid: string,
  roundId: string,
  focusMinutes: number
): Promise<PomodoroCompletionResult> {
  const userRef = doc(db, 'users', uid);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return { awarded: false, streakIncreased: false, newStreak: 0 };
    }

    const data = snap.data();
    if (data.lastCountedRound === roundId) {
      // Already counted this round
      return { awarded: false, streakIncreased: false, newStreak: data.stats?.streakDays || 1 };
    }

    const today = getLocalDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = getLocalDateString(yesterdayDate);

    const oldStreak = data.stats?.streakDays || 0;
    const oldLongest = data.stats?.longestStreak || 0;
    const lastStudyDate = data.stats?.lastStudyDate;

    let newStreak = 1;
    let streakIncreased = false;

    if (lastStudyDate === today) {
      // Already studied today: maintain streak
      newStreak = Math.max(1, oldStreak);
    } else if (lastStudyDate === yesterday) {
      // Studied yesterday: increment streak
      newStreak = oldStreak + 1;
      streakIncreased = true;
    } else {
      // Streak broken or first day
      newStreak = 1;
      streakIncreased = oldStreak === 0;
    }

    const newLongest = Math.max(newStreak, oldLongest);

    await updateDoc(userRef, {
      'stats.pomodoros': increment(1),
      'stats.minutesFocused': increment(focusMinutes),
      'stats.streakDays': newStreak,
      'stats.longestStreak': newLongest,
      'stats.lastStudyDate': today,
      lastCountedRound: roundId,
    });

    // Also increment users/{uid}/days/{YYYY-MM-DD} (user's LOCAL date)
    const dayRef = doc(db, 'users', uid, 'days', today);
    await setDoc(
      dayRef,
      {
        pomodoros: increment(1),
        minutes: increment(focusMinutes),
      },
      { merge: true }
    );

    // Notify session heatmap cache & trigger today's cell outline blink
    notifyHeatmapUpdate(uid, today, focusMinutes);

    return {
      awarded: true,
      streakIncreased,
      newStreak,
    };
  } catch (err) {
    console.error('Failed to record pomodoro stats:', err);
    return { awarded: false, streakIncreased: false, newStreak: 0 };
  }
}
