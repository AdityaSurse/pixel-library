// 30 short original study lines (max 40 chars, calm & cozy, zero emojis)

export const STUDY_QUOTES: string[] = [
  'A quiet room, a steady mind.',
  'Turn the page and begin again.',
  'One focused breath at a time.',
  'The quietest hours hold the most.',
  'Soft rain and steady thoughts.',
  'Let the world wait outside.',
  'Each word brings you closer.',
  'Find stillness in the work.',
  'A warm light on an open page.',
  'Patience builds every chapter.',
  'Here, time moves at your pace.',
  'Step by step, the work is done.',
  'Silence is where focus blooms.',
  'Settle in and find your flow.',
  'Small efforts quietly add up.',
  'The ink remembers your devotion.',
  'A calm desk for a busy mind.',
  'Rest your eyes, then read on.',
  'Every journey begins with a line.',
  'Your thoughts are safe here.',
  'Slow progress is still progress.',
  'The library holds your space.',
  'Breathe deep and write on.',
  'Curiosity is a gentle guide.',
  'Soft lamplight on quiet wood.',
  'One peaceful chapter at a time.',
  'Focus is a quiet gift to yourself.',
  'Between these shelves, you belong.',
  'Clear thoughts, steady hands.',
  'The best work unfolds softly.',
];

/**
 * Returns a stable daily quote based on the user's local date.
 * Everyone viewing on the same local date sees the same quote.
 */
export function getDailyQuote(date: Date = new Date()): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const diff = date.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const index = Math.abs((year * 366 + dayOfYear) % STUDY_QUOTES.length);
  return STUDY_QUOTES[index];
}
