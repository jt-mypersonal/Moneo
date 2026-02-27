import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SOUND_OPTIONS } from '@/constants/habits';
import { hoursToSeconds } from '@/utils/time';
import type { SoundChoice } from '@/types/habit';

/**
 * Ensure we always work in local device time.
 */

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
 * Given interval + start time, compute the next aligned local Date AFTER now.
 */
function computeNextAlignedTime(
  intervalH: number,
  startHHMM: string | null | undefined
): Date {
  const now = new Date();

  if (!startHHMM) {
    const fallback = new Date(now);
    fallback.setSeconds(fallback.getSeconds() + Math.max(5, hoursToSeconds(intervalH)));
    return fallback;
  }

  const [startHour, startMinute] = startHHMM.split(':').map((v) => parseInt(v, 10));

  const base = new Date(now);
  base.setHours(startHour, startMinute, 0, 0);

  if (base > now) {
    return base;
  }

  const next = new Date(base);
  const stepMs = intervalH * 60 * 60 * 1000;

  if (!Number.isFinite(stepMs) || stepMs <= 0) {
    const fallback = new Date(now);
    fallback.setSeconds(fallback.getSeconds() + 60);
    return fallback;
  }

  while (next <= now) {
    next.setTime(next.getTime() + stepMs);
  }

  return next;
}

export async function scheduleReminder(
  title: string,
  intervalH: number,
  startHHMM?: string | null,
  soundChoice: SoundChoice = 'default'
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  console.log('📅 Scheduling', { title, intervalH, startHHMM, soundChoice });

  const soundOption = SOUND_OPTIONS.find((s) => s.key === soundChoice);
  const soundValue: boolean | string = soundOption?.file ?? true;

  // More descriptive content: habit name in both title and body.
  const content = {
    title: `Moneo · ${title}`,
    body: `“${title}” is due now. Tap to review or complete this micro-habit. 🌱`,
    sound: soundValue,
  };

  try {
    // Daily habits aligned to a fixed clock time.
    if (intervalH === 24 && startHHMM) {
      const [hour, minute] = startHHMM.split(':').map((v) => parseInt(v, 10));
      const now = new Date();
      const triggerTime = new Date();
      triggerTime.setHours(hour, minute, 0, 0);
      if (triggerTime <= now) triggerTime.setDate(triggerTime.getDate() + 1);

      console.log('⏰ Daily habit scheduled for', triggerTime.toLocaleString());

      return await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: triggerTime.getHours(),
          minute: triggerTime.getMinutes(),
          repeats: true,
        },
      });
    }

    // Other intervals aligned to the chosen grid.
    const next = computeNextAlignedTime(intervalH, startHHMM ?? null);

    console.log('⏳ Interval habit scheduled for', next.toLocaleString(), 'local time');

    return await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: next.getHours(),
        minute: next.getMinutes(),
        repeats: true,
      },
    });
  } catch (e) {
    Alert.alert(
      'Reminder Failed',
      'Could not schedule the notification. The habit was saved but reminders may not fire.'
    );
    return null;
  }
}

export async function cancelReminder(notificationId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (_) {
    // best effort
  }
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
