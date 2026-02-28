import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SOUND_OPTIONS } from '@/constants/habits';
import type { SoundChoice, SleepSchedule } from '@/types/habit';
import { computeDailySlots } from './sleepSchedule';

const CATEGORY_ID = 'habit-reminder';

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
        buttonTitle: 'Incomplete',
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

/**
 * Schedule reminders for a habit across all daily time slots.
 *
 * For sub-daily intervals (1h, 2h, 4h, 8h, 12h): schedules one repeating
 * CALENDAR trigger per slot in the day, skipping sleep hours.
 *
 * For 24h: single repeating CALENDAR trigger at the start time.
 *
 * Returns array of notification IDs (one per slot).
 */
export async function scheduleReminder(
  habitId: string,
  title: string,
  intervalH: number,
  startHHMM: string | null | undefined,
  soundChoice: SoundChoice = 'default',
  sleepSchedule: SleepSchedule = { enabled: false, startTime: '22:00', endTime: '07:00' }
): Promise<string[]> {
  if (Platform.OS === 'web') return [];

  const effectiveStart = startHHMM ?? formatNowHHMM();

  console.log('Scheduling', { title, intervalH, startHHMM: effectiveStart, soundChoice });

  const soundOption = SOUND_OPTIONS.find((s) => s.key === soundChoice);
  const soundValue: boolean | string = soundOption?.file ?? true;

  const content: Notifications.NotificationContentInput = {
    title: `Moneo - ${title}`,
    body: `"${title}" is due now. How did it go?`,
    sound: soundValue,
    categoryIdentifier: CATEGORY_ID,
    data: { habitId },
  };

  const slots = computeDailySlots(intervalH, effectiveStart, sleepSchedule);

  if (slots.length === 0) {
    console.warn('No notification slots — all times fall in sleep window');
    return [];
  }

  const ids: string[] = [];

  for (const slot of slots) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: slot.hour,
          minute: slot.minute,
          repeats: true,
        },
      });
      ids.push(id);
    } catch (e) {
      console.warn('Failed to schedule slot', slot, e);
    }
  }

  if (ids.length === 0) {
    Alert.alert(
      'Reminder Failed',
      'Could not schedule notifications. The habit was saved but reminders may not fire.'
    );
  } else {
    console.log(`Scheduled ${ids.length} notification(s) for "${title}"`);
  }

  return ids;
}

function formatNowHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

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
