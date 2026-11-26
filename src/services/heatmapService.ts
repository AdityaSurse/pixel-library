import { collection, query, where, documentId, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserStats } from '../context/AuthContext';

export interface DayStudyData {
  date: string; // YYYY-MM-DD
  pomodoros: number;
  minutes: number;
}

export type DaysMap = Record<string, DayStudyData>;

export const HEATMAP_LEVEL_COLORS = [
  '#2a2030', // 0: none
  '#5a2a33', // 1: 1 pomodoro
  '#8e3a45', // 2: 2-3 pomodoros
  '#c8463d', // 3: 4-5 pomodoros
  '#f07a5e', // 4: 6+ pomodoros
] as const;

export function getHeatmapLevel(pomodoros: number): number {
  if (!pomodoros || pomodoros <= 0) return 0;
  if (pomodoros === 1) return 1;
  if (pomodoros <= 3) return 2;
  if (pomodoros <= 5) return 3;
  return 4;
}

/**
 * Returns YYYY-MM-DD in the user's LOCAL date.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates Monday of 25 weeks ago so the grid displays exactly 26 weeks ending with current week.
 */
export function getHeatmapStartMonday(referenceDate: Date = new Date()): Date {
  // Day of week with Monday = 0, Sunday = 6
  const dayIndex = (referenceDate.getDay() + 6) % 7;
  const currentMonday = new Date(referenceDate);
  currentMonday.setDate(referenceDate.getDate() - dayIndex);
  currentMonday.setHours(0, 0, 0, 0);

  const startMonday = new Date(currentMonday);
  startMonday.setDate(currentMonday.getDate() - 25 * 7);
  startMonday.setHours(0, 0, 0, 0);
  return startMonday;
}

// In-memory session cache: loaded once per session per uid
const sessionCache = new Map<string, DaysMap>();
const listeners = new Set<(uid: string, dateStr: string) => void>();

export function onHeatmapUpdate(listener: (uid: string, dateStr: string) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyHeatmapUpdate(uid: string, dateStr: string, focusMinutes: number = 25): void {
  const cached = sessionCache.get(uid);
  if (cached) {
    if (cached[dateStr]) {
      cached[dateStr].pomodoros += 1;
      cached[dateStr].minutes += focusMinutes;
    } else {
      cached[dateStr] = {
        date: dateStr,
        pomodoros: 1,
        minutes: focusMinutes,
      };
    }
  }

  listeners.forEach((fn) => {
    try {
      fn(uid, dateStr);
    } catch (e) {
      console.error('Heatmap update listener error:', e);
    }
  });
}

/**
 * Loads the last 26 weeks of daily study records from Firestore with one query.
 * Caches in memory for the duration of the session.
 */
export async function loadUserHeatmapDays(uid: string, forceRefresh = false): Promise<DaysMap> {
  if (!forceRefresh && sessionCache.has(uid)) {
    return sessionCache.get(uid)!;
  }

  const startMonday = getHeatmapStartMonday();
  const startDateStr = getLocalDateString(startMonday);

  try {
    const daysCol = collection(db, 'users', uid, 'days');
    const q = query(daysCol, where(documentId(), '>=', startDateStr));
    const snapshot = await getDocs(q);

    const map: DaysMap = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      map[docSnap.id] = {
        date: docSnap.id,
        pomodoros: Number(data.pomodoros || 0),
        minutes: Number(data.minutes || 0),
      };
    });

    sessionCache.set(uid, map);
    return map;
  } catch (err) {
    console.error('Failed to load user heatmap days:', err);
    return sessionCache.get(uid) || {};
  }
}

/**
 * Calculates current streak, longest streak, and total hours from days data and profile stats.
 */
export function calculateHeatmapStats(
  daysMap: DaysMap,
  profileStats?: UserStats
): { currentStreak: number; longestStreak: number; totalHours: number } {
  const today = getLocalDateString();
  const yDate = new Date();
  yDate.setDate(yDate.getDate() - 1);
  const yesterday = getLocalDateString(yDate);

  // 1. Calculate longest streak across all days in memory
  const allDates = Object.keys(daysMap)
    .filter((d) => (daysMap[d]?.pomodoros || 0) > 0)
    .sort();

  let maxStreak = 0;
  let runningStreak = 0;
  let prevDateMs = 0;

  for (const dateStr of allDates) {
    const parts = dateStr.split('-').map(Number);
    const dateMs = new Date(parts[0], parts[1] - 1, parts[2]).getTime();
    if (prevDateMs === 0) {
      runningStreak = 1;
    } else {
      const diffDays = Math.round((dateMs - prevDateMs) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        runningStreak++;
      } else if (diffDays > 1) {
        runningStreak = 1;
      }
    }
    prevDateMs = dateMs;
    if (runningStreak > maxStreak) {
      maxStreak = runningStreak;
    }
  }

  // 2. Current streak
  let currentStreak = profileStats?.streakDays || 0;
  if (!currentStreak) {
    // Fallback: check backwards from today or yesterday
    let checkDate = new Date();
    let count = 0;
    while (true) {
      const s = getLocalDateString(checkDate);
      if ((daysMap[s]?.pomodoros || 0) > 0) {
        count++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (s === today && (daysMap[yesterday]?.pomodoros || 0) > 0) {
        // Today not done yet, but yesterday was active
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    currentStreak = count;
  }

  // Longest streak: max of historical and calculated
  const longestStreak = Math.max(
    maxStreak,
    currentStreak,
    profileStats?.longestStreak || 0
  );

  // Total hours: profile stats or days calculation
  const totalMinutes = Math.max(
    profileStats?.minutesFocused || 0,
    Object.values(daysMap).reduce((sum, d) => sum + (d.minutes || 0), 0)
  );
  const totalHours = Math.floor(totalMinutes / 60);

  return {
    currentStreak,
    longestStreak,
    totalHours,
  };
}
