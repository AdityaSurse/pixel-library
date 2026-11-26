import { useState, useEffect } from 'react';

export type TimeOfDay = 'day' | 'night';
export type TimePreference = 'auto' | 'day' | 'night';

export const TIME_PREFERENCE_STORAGE_KEY = 'pixel_library_time_preference';

let testClockOverride: Date | null = null;

/**
 * Optional testing helper to fake the local clock.
 */
export function setTestClock(date: Date | null): void {
  testClockOverride = date;
}

/**
 * Returns "day" from 06:00 to 17:59 (local time), otherwise "night" (18:00 to 05:59).
 */
export function getTimeOfDay(date?: Date): TimeOfDay {
  const d = date || testClockOverride || new Date();
  const hours = d.getHours();
  return hours >= 6 && hours < 18 ? 'day' : 'night';
}

/**
 * Reads the stored time preference from localStorage. Defaults to 'auto'.
 */
export function getTimePreference(): TimePreference {
  if (typeof window === 'undefined') return 'auto';
  try {
    const val = localStorage.getItem(TIME_PREFERENCE_STORAGE_KEY);
    if (val === 'day' || val === 'night' || val === 'auto') {
      return val;
    }
  } catch {
    // Ignore storage errors
  }
  return 'auto';
}

/**
 * Saves the user's time preference to localStorage.
 */
export function setTimePreference(pref: TimePreference): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TIME_PREFERENCE_STORAGE_KEY, pref);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Resolves effective time of day ('day' | 'night') considering user preference and local clock.
 */
export function resolveEffectiveTimeOfDay(
  pref: TimePreference = getTimePreference(),
  date?: Date
): TimeOfDay {
  if (pref === 'day') return 'day';
  if (pref === 'night') return 'night';
  return getTimeOfDay(date);
}

/**
 * React hook that re-evaluates the time of day every minute and exposes the current preference.
 */
export function useTimeOfDay() {
  const [preference, setPrefState] = useState<TimePreference>(() => getTimePreference());
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() =>
    resolveEffectiveTimeOfDay(preference)
  );

  const setPreference = (newPref: TimePreference) => {
    setTimePreference(newPref);
    setPrefState(newPref);
    setTimeOfDay(resolveEffectiveTimeOfDay(newPref));
  };

  useEffect(() => {
    const checkTime = () => {
      setTimeOfDay(resolveEffectiveTimeOfDay(preference));
    };

    checkTime();

    // Re-check every minute (60,000ms)
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [preference]);

  return {
    timeOfDay,
    preference,
    setPreference,
  };
}
