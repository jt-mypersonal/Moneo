import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SOUND_OPTIONS } from '@/constants/habits';
import type { SoundChoice, SleepSchedule } from '@/types/habit';
import { computeDailySlots } from './sleepSchedule';

const CATEGORY_ID = 'habit-reminder';

/** Minutes after each main notification to fire nag reminders. */
const NAG_OFFSETS_MINUTES = [2, 4];

/** Suppress window: nags are suppressed if user responded within this many ms. */
const SUPPRESS_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// --- Foreground nag suppression ---

const respondedHabits = new Map<string, number>();

/**
 * Mark a habit as recently responded so foreground nags are suppressed.
 */
export function markHabitResponded(habitId: string) {
  respondedHabits.set(habitId, Date.now());
}

/**
 * Check if a habit was responded to within the suppression window.
 * Used by the notification handler to silently suppress nag notifications
 * when the user already recorded a response.
 */
export function isHabitRecentlyResponded(habitId: string): boolean {
  const respondedAt = respondedHabits.get(habitId);
  if (!respondedAt) return false;
  if (Date.now() - respondedAt > SUPPRESS_WINDOW_MS) {
    respondedHabits.delete(habitId);
    return false;
  }
  return true;
}

/**
 * Register notification category with Complete / Incomplete action buttons.
 * Must be called once at startup before any notifications fire.
 */
export async function registerNotificationCategory() {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
      {
        identifier: 'complete',
        buttonTitle: 'Complete',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'incomplete',
        buttonTitle: 'Skip',
        options: { opensAppToForeground: false },
      },
    ]);
  } catch (e) {
    console.warn('Failed to register notification category:', e);
  }
}

export async function ensureNotificationPermissions() {
  if (Platform.OS === 'web') return;
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (!settings.granted) await Notifications.requestPermissionsAsync();
  } catch (e) {
    Alert.alert(
      'Permissions',
      'Could not request notification permissions. Please enable them in Settings.'
    );
  }
}

export async function setupAndroidChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('moneo-default', {
      name: 'Moneo Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch (e) {
    Alert.alert(
      'Notification Setup',
      'Could not configure notification channel. Reminders may not work.'
    );
  }
}

// --- Helpers ---

function addMinutes(hour: number, minute: number, add: number): { hour: number; minute: number } {
  const total = hour * 60 + minute + add;
  return {
    hour: Math.floor(total / 60) % 24,
    minute: total % 60,
  };
}

function formatNowHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// --- Scheduling ---

/**
 * Schedule reminders for a habit across all daily time slots.
 *
 * For sub-daily intervals (1h, 2h, 4h, 8h, 12h): schedules one repeating
 * CALENDAR trigger per slot in the day, skipping sleep hours.
 *
 * For 24h: single repeating CALENDAR trigger at the start time.
 *
 * Also schedules follow-up nag notifications at +2 and +4 minutes per slot
 * so the phone re-alerts until the user interacts.
 *
 * Returns main IDs and nag IDs separately so nags can be canceled on response
 * without losing the main repeating reminders.
 */
export async function scheduleReminder(
  habitId: string,
  title: string,
  intervalH: number,
  startHHMM: string | null | undefined,
  soundChoice: SoundChoice = 'default',
  sleepSchedule: SleepSchedule = { enabled: false, startTime: '22:00', endTime: '07:00' }
): Promise<{ mainIds: string[]; nagIds: string[] }> {
  if (Platform.OS === 'web') return { mainIds: [], nagIds: [] };

  const effectiveStart = startHHMM ?? formatNowHHMM();

  console.log('Scheduling', { title, intervalH, startHHMM: effectiveStart, soundChoice });

  const soundOption = SOUND_OPTIONS.find((s) => s.key === soundChoice);
  const soundValue: boolean | string = soundOption?.file ?? true;

  const mainContent: Notifications.NotificationContentInput = {
    title: `Moneo - ${title}`,
    body: `"${title}" is due now. Long-press for options.`,
    sound: soundValue,
    categoryIdentifier: CATEGORY_ID,
    data: { habitId },
  };

  const nagContent: Notifications.NotificationContentInput = {
    title: `Moneo - ${title}`,
    body: `Reminder: "${title}" — still waiting!`,
    sound: soundValue,
    categoryIdentifier: CATEGORY_ID,
    data: { habitId, isNag: true },
  };

  const slots = computeDailySlots(intervalH, effectiveStart, sleepSchedule);

  if (slots.length === 0) {
    console.warn('No notification slots — all times fall in sleep window');
    return { mainIds: [], nagIds: [] };
  }

  const mainIds: string[] = [];
  const nagIds: string[] = [];

  // First pass: schedule all main notifications (priority — survive iOS 64 limit)
  for (const slot of slots) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: mainContent,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: slot.hour,
          minute: slot.minute,
          repeats: true,
        },
      });
      mainIds.push(id);
    } catch (e) {
      console.warn('Failed to schedule main slot', slot, e);
    }
  }

  // Second pass: schedule nag notifications (+2min, +4min per slot)
  for (const slot of slots) {
    for (const offsetMin of NAG_OFFSETS_MINUTES) {
      const nag = addMinutes(slot.hour, slot.minute, offsetMin);
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: nagContent,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: nag.hour,
            minute: nag.minute,
            repeats: true,
          },
        });
        nagIds.push(id);
      } catch (e) {
        console.warn('Failed to schedule nag', nag, e);
      }
    }
  }

  if (mainIds.length === 0) {
    Alert.alert(
      'Reminder Failed',
      'Could not schedule notifications. The habit was saved but reminders may not fire.'
    );
  } else {
    console.log(`Scheduled ${mainIds.length} main + ${nagIds.length} nag notification(s) for "${title}"`);
  }

  return { mainIds, nagIds };
}

// --- Cancellation ---

export async function cancelReminders(notificationIds: string[]) {
  for (const id of notificationIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (_) {
      // best effort
    }
  }
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
