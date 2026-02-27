import { toDateString } from './time';

export function sanitizeHabitName(name: string) {
  return (name ?? '').toString().replace(/\s+/g, ' ').trim();
}

export function calculateStreak(completions: string[]): number {
  if (completions.length === 0) return 0;
  const sorted = [...completions].sort();
  const today = new Date();
  let check = toDateString(today);
  if (!sorted.includes(check)) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    check = toDateString(yesterday);
    if (!sorted.includes(check)) return 0;
  }
  let streak = 0;
  const cursor = new Date(check);
  while (sorted.includes(toDateString(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
