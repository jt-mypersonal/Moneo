import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SleepSchedule } from '@/types/habit';
import { STORAGE_KEYS, DEFAULT_SLEEP_SCHEDULE } from '@/constants/habits';

export async function loadSleepSchedule(): Promise<SleepSchedule> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.SLEEP_SCHEDULE);
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  return { ...DEFAULT_SLEEP_SCHEDULE };
}

export async function saveSleepSchedule(schedule: SleepSchedule): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.SLEEP_SCHEDULE, JSON.stringify(schedule));
}

/**
 * Parse "HH:MM" into total minutes since midnight.
 */
function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((v) => parseInt(v, 10));
  return h * 60 + m;
}

/**
 * Check if a given hour:minute falls within the sleep window.
 * Handles overnight ranges (e.g. 22:00 → 07:00).
 */
export function isInSleepWindow(
  hour: number,
  minute: number,
  schedule: SleepSchedule
): boolean {
  if (!schedule.enabled) return false;

  const time = hour * 60 + minute;
  const start = hhmmToMinutes(schedule.startTime);
  const end = hhmmToMinutes(schedule.endTime);

  if (start <= end) {
    // Same-day range (e.g. 13:00 → 15:00)
    return time >= start && time < end;
  }
  // Overnight range (e.g. 22:00 → 07:00)
  return time >= start || time < end;
}

/**
 * Generate all firing hours for a given interval, start time, and sleep schedule.
 * Returns array of { hour, minute } objects representing daily fire slots.
 */
export function computeDailySlots(
  intervalH: number,
  startHHMM: string,
  schedule: SleepSchedule
): { hour: number; minute: number }[] {
  const [startHour, startMinute] = startHHMM.split(':').map((v) => parseInt(v, 10));
  const stepMinutes = intervalH * 60;
  const slots: { hour: number; minute: number }[] = [];

  let currentMinutes = startHour * 60 + startMinute;
  const visited = new Set<number>();

  // Walk through 24 hours of slots
  for (let i = 0; i < Math.ceil(1440 / stepMinutes); i++) {
    const wrapped = ((currentMinutes % 1440) + 1440) % 1440;
    if (visited.has(wrapped)) break;
    visited.add(wrapped);

    const hour = Math.floor(wrapped / 60);
    const minute = wrapped % 60;

    if (!isInSleepWindow(hour, minute, schedule)) {
      slots.push({ hour, minute });
    }

    currentMinutes += stepMinutes;
  }

  return slots;
}

/**
 * Check if a 12h or 24h interval with the given start time would have
 * ALL its fire times fall within the sleep window.
 */
export function wouldBeFullyBlocked(
  intervalH: number,
  startHHMM: string,
  schedule: SleepSchedule
): boolean {
  if (!schedule.enabled) return false;
  const slots = computeDailySlots(intervalH, startHHMM, schedule);
  return slots.length === 0;
}
