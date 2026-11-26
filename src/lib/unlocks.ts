import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, UserStats } from '../context/AuthContext';
import { ThemeId } from '../engine/themes';

export type AccessoryId =
  | 'beanie'
  | 'crown'
  | 'headphones'
  | 'wizard_hat'
  | 'flower_crown'
  | 'cat_ears'
  | 'grad_cap';

export interface AccessoryDef {
  id: AccessoryId;
  name: string;
  row: number;
  pomodoros?: number;
  streakDays?: number;
}

export const ACCESSORIES: AccessoryDef[] = [
  { id: 'flower_crown', name: 'Flower Crown', row: 4, pomodoros: 5 },
  { id: 'beanie', name: 'Beanie', row: 0, pomodoros: 15 },
  { id: 'headphones', name: 'Headphones', row: 2, pomodoros: 30 },
  { id: 'cat_ears', name: 'Cat Ears', row: 5, streakDays: 3 },
  { id: 'crown', name: 'Royal Crown', row: 1, streakDays: 14 },
  { id: 'wizard_hat', name: 'Wizard Hat', row: 3, pomodoros: 75 },
  { id: 'grad_cap', name: 'Graduation Cap', row: 6, pomodoros: 150 },
];

export function getAccessoryRow(id: string): number {
  const item = ACCESSORIES.find((a) => a.id === id);
  return item ? item.row : -1;
}

export function isThemeUnlocked(_themeId?: ThemeId, _stats?: UserStats): boolean {
  return true;
}

export function getThemeUnlockProgress(_themeId?: ThemeId, _stats?: UserStats): UnlockProgress {
  return { label: 'Unlocked', current: 1, target: 1, percent: 100, isUnlocked: true };
}

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  pomodoros?: number;
  streakDays?: number;
  isTimeBased?: boolean;
  timeWindow?: string;
}

export const BADGES: BadgeDef[] = [
  { id: 'first_pomodoro', name: 'First Pomodoro', description: 'Complete 1 Pomodoro', pomodoros: 1 },
  { id: 'bronze_10', name: 'Bronze Scholar', description: 'Complete 10 Pomodoros', pomodoros: 10 },
  { id: 'silver_50', name: 'Silver Scholar', description: 'Complete 50 Pomodoros', pomodoros: 50 },
  { id: 'gold_100', name: 'Gold Scholar', description: 'Complete 100 Pomodoros', pomodoros: 100 },
  { id: 'streak_7', name: 'Weekly Habit', description: 'Achieve a 7-day streak', streakDays: 7 },
  { id: 'streak_30', name: 'Dedicated Reader', description: 'Achieve a 30-day streak', streakDays: 30 },
  { id: 'night_owl', name: 'Night Owl', description: 'Finish a pomodoro between 00:00 and 04:00', isTimeBased: true, timeWindow: '00:00–04:00' },
  { id: 'early_bird', name: 'Early Bird', description: 'Finish a pomodoro between 05:00 and 08:00', isTimeBased: true, timeWindow: '05:00–08:00' },
];

export interface UnlockProgress {
  label: string;
  current: number;
  target: number;
  percent: number;
  isUnlocked: boolean;
}

export function getAccessoryUnlockProgress(id: string, stats?: UserStats): UnlockProgress {
  const def = ACCESSORIES.find((a) => a.id === id);
  if (!def) {
    return { label: 'Locked', current: 0, target: 1, percent: 0, isUnlocked: false };
  }

  const p = stats?.pomodoros || 0;
  const s = stats?.streakDays || 0;

  if (def.pomodoros) {
    const cur = Math.min(def.pomodoros, p);
    return {
      label: `Study ${def.pomodoros} Pomodoros (${cur}/${def.pomodoros})`,
      current: cur,
      target: def.pomodoros,
      percent: Math.min(100, Math.floor((cur / def.pomodoros) * 100)),
      isUnlocked: p >= def.pomodoros,
    };
  }

  if (def.streakDays) {
    const cur = Math.min(def.streakDays, s);
    return {
      label: `Achieve a ${def.streakDays}-day streak (${cur}/${def.streakDays})`,
      current: cur,
      target: def.streakDays,
      percent: Math.min(100, Math.floor((cur / def.streakDays) * 100)),
      isUnlocked: s >= def.streakDays,
    };
  }

  return { label: 'Locked', current: 0, target: 1, percent: 0, isUnlocked: false };
}

export function isAccessoryUnlocked(id: string, stats?: UserStats): boolean {
  return getAccessoryUnlockProgress(id, stats).isUnlocked;
}

export function isBadgeEarned(
  badgeId: string,
  stats?: UserStats,
  userBadges?: Record<string, boolean | string>
): boolean {
  if (userBadges && userBadges[badgeId]) {
    return true;
  }

  const def = BADGES.find((b) => b.id === badgeId);
  if (!def) return false;

  if (def.pomodoros && (stats?.pomodoros || 0) >= def.pomodoros) {
    return true;
  }

  if (def.streakDays && (stats?.streakDays || 0) >= def.streakDays) {
    return true;
  }

  return false;
}

export function evaluateAllUnlocks(
  stats?: UserStats,
  userBadges?: Record<string, boolean | string>
): { accessories: string[]; badges: string[] } {
  const accessories = ACCESSORIES.filter((a) => isAccessoryUnlocked(a.id, stats)).map((a) => a.id);
  const badges = BADGES.filter((b) => isBadgeEarned(b.id, stats, userBadges)).map((b) => b.id);

  return { accessories, badges };
}

/**
 * Finds next closest locked item to show as goal in celebration modal.
 */
export function findNextGoal(stats?: UserStats): string {
  // 1. Check locked accessories
  const lockedAcc = ACCESSORIES.find((a) => !isAccessoryUnlocked(a.id, stats));
  if (lockedAcc) {
    if (lockedAcc.pomodoros) {
      return `Next: ${lockedAcc.name} at ${lockedAcc.pomodoros} Pomodoros`;
    }
    if (lockedAcc.streakDays) {
      return `Next: ${lockedAcc.name} at ${lockedAcc.streakDays}-Day Streak`;
    }
  }

  // 2. Check locked badges
  const lockedBadge = BADGES.find((b) => !isBadgeEarned(b.id, stats));
  if (lockedBadge) {
    return `Next: ${lockedBadge.name} (${lockedBadge.description})`;
  }

  return 'All current milestones accomplished!';
}

export interface UnlockCelebrationItem {
  type: 'accessory' | 'badge';
  id: string;
  name: string;
  title: string;
  spriteSrc: string;
  nextGoal: string;
}

/**
 * Checks if the user unlocked any new items not yet stored in users/{uid}.unlocked.
 */
export function checkForNewUnlocks(profile: UserProfile): UnlockCelebrationItem[] {
  const all = evaluateAllUnlocks(profile.stats, profile.badges);

  const seenAccessories = new Set(profile.unlocked?.accessories || []);
  const seenBadges = new Set(profile.unlocked?.badges || []);

  const newItems: UnlockCelebrationItem[] = [];
  const next = findNextGoal(profile.stats);

  // Check accessories
  for (const aid of all.accessories) {
    if (!seenAccessories.has(aid)) {
      const def = ACCESSORIES.find((a) => a.id === aid);
      newItems.push({
        type: 'accessory',
        id: aid,
        name: def?.name || aid,
        title: `Unlocked: ${def?.name || aid}!`,
        spriteSrc: `/pixel-library-themes/unlockables/accessories_preview@4x.png`,
        nextGoal: next,
      });
    }
  }

  // Check badges
  for (const bid of all.badges) {
    if (!seenBadges.has(bid)) {
      const def = BADGES.find((b) => b.id === bid);
      newItems.push({
        type: 'badge',
        id: bid,
        name: def?.name || bid,
        title: `Unlocked: ${def?.name || bid}!`,
        spriteSrc: `/pixel-library-themes/badges/${bid}@4x.png`,
        nextGoal: next,
      });
    }
  }

  return newItems;
}

/**
 * Persists all current unlocks in Firestore so celebrations appear only once.
 */
export async function markUnlocksAsSeen(
  uid: string,
  currentUnlocked: { accessories: string[]; badges: string[] }
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    'unlocked.accessories': Array.from(new Set(currentUnlocked.accessories)),
    'unlocked.badges': Array.from(new Set(currentUnlocked.badges)),
  });
}

/**
 * Checks if current local time qualifies for night_owl (00:00–04:00) or early_bird (05:00–08:00).
 */
export async function checkTimeBasedBadges(
  uid: string,
  currentBadges?: Record<string, boolean | string>
): Promise<{ night_owl?: boolean; early_bird?: boolean }> {
  const now = new Date();
  const hour = now.getHours();

  const updates: Record<string, boolean> = {};

  // Night owl: 00:00 - 04:00 (i.e. hour 0, 1, 2, 3, or exactly 4:00)
  if ((hour >= 0 && hour < 4) || (hour === 4 && now.getMinutes() === 0)) {
    if (!currentBadges?.night_owl) {
      updates['badges.night_owl'] = true;
    }
  }

  // Early bird: 05:00 - 08:00 (i.e. hour 5, 6, 7, or exactly 8:00)
  if ((hour >= 5 && hour < 8) || (hour === 8 && now.getMinutes() === 0)) {
    if (!currentBadges?.early_bird) {
      updates['badges.early_bird'] = true;
    }
  }

  if (Object.keys(updates).length > 0) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, updates);
    } catch (err) {
      console.error('Failed to update time-based badges:', err);
    }
  }

  return {
    night_owl: Boolean(currentBadges?.night_owl || updates['badges.night_owl']),
    early_bird: Boolean(currentBadges?.early_bird || updates['badges.early_bird']),
  };
}

// Celebration modal event emitter
type CelebrationListener = (item: UnlockCelebrationItem) => void;
const celebrationListeners = new Set<CelebrationListener>();

export function onNewUnlockCelebration(listener: CelebrationListener): () => void {
  celebrationListeners.add(listener);
  return () => {
    celebrationListeners.delete(listener);
  };
}

export function triggerUnlockCelebration(item: UnlockCelebrationItem): void {
  celebrationListeners.forEach((fn) => {
    try {
      fn(item);
    } catch (e) {
      console.error('Celebration listener error:', e);
    }
  });
}
