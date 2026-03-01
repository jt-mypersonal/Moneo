import { useEffect, useMemo, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Habit, FilterCategory, SleepSchedule, HabitResponseType } from '@/types/habit';
import { FREE_HABIT_LIMIT, STORAGE_KEYS } from '@/constants/habits';
import { toDateString } from '@/utils/time';
import { calculateStreak, sanitizeHabitName } from '@/utils/habits';
import {
  ensureNotificationPermissions,
  setupAndroidChannel,
  registerNotificationCategory,
  scheduleReminder,
  cancelReminders,
  cancelAllReminders,
  markHabitResponded,
} from '@/utils/notifications';
import { loadSleepSchedule, saveSleepSchedule, wouldBeFullyBlocked } from '@/utils/sleepSchedule';
import { useSubscription } from '@/context/SubscriptionContext';

export interface HabitFormData {
  name: string;
  intervalHours: number;
  startTime: string;
  category: Habit['category'];
  soundChoice: Habit['soundChoice'];
}

export interface DashboardStats {
  completedToday: number;
  totalHabits: number;
  weekRate: number;
  bestStreak: number;
}

export function useHabits(filterCategory: FilterCategory) {
  const { isPro } = useSubscription();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [sleepSchedule, setSleepScheduleState] = useState<SleepSchedule>({
    enabled: false,
    startTime: '22:00',
    endTime: '07:00',
  });

  const filteredHabits = useMemo(() => {
    if (filterCategory === 'All') return habits;
    return habits.filter((h) => h.category === filterCategory);
  }, [habits, filterCategory]);

  // --- Persistence ---

  const loadHabits = async (): Promise<Habit[]> => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.HABITS);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const hydrated = parsed.map((h: any) => ({
          ...h,
          completions: h.completions ?? [],
          bestStreak: h.bestStreak ?? h.streak ?? 0,
          lastCompletedAt: h.lastCompletedAt ?? null,
          soundChoice: h.soundChoice ?? 'default',
          responses: h.responses ?? [],
          // Migrate old single notificationId to notificationIds array
          notificationIds: h.notificationIds ?? (h.notificationId ? [h.notificationId] : []),
          nagNotificationIds: h.nagNotificationIds ?? [],
        }));
        setHabits(hydrated);
        return hydrated;
      }
    } catch (e) {
      Alert.alert('Load Error', 'Your saved habits could not be read and were reset.');
      await AsyncStorage.removeItem(STORAGE_KEYS.HABITS);
    }
    return [];
  };

  const saveHabits = async (updated: Habit[]) => {
    setHabits(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(updated));
    } catch (e) {
      Alert.alert('Save Failed', 'Your habits could not be saved. Changes may be lost if you close the app.');
    }
  };

  // --- Lifecycle ---

  useEffect(() => {
    (async () => {
      await cancelAllReminders();
      const [loaded, schedule] = await Promise.all([loadHabits(), loadSleepSchedule()]);
      setSleepScheduleState(schedule);
      await ensureNotificationPermissions();
      await setupAndroidChannel();
      await registerNotificationCategory();

      if (loaded.length > 0) {
        const rescheduled = await Promise.all(
          loaded.map(async (h) => {
            const { mainIds, nagIds } = await scheduleReminder(
              h.id, h.name, h.intervalHours, h.startTime, h.soundChoice, schedule
            );
            return { ...h, notificationIds: mainIds, nagNotificationIds: nagIds };
          })
        );
        await saveHabits(rescheduled);
      }
    })();
  }, []);

  // --- Sleep schedule ---

  const updateSleepSchedule = useCallback(async (schedule: SleepSchedule) => {
    setSleepScheduleState(schedule);
    await saveSleepSchedule(schedule);

    // Reschedule all habits with new sleep window
    await cancelAllReminders();
    const rescheduled = await Promise.all(
      habits.map(async (h) => {
        const { mainIds, nagIds } = await scheduleReminder(
          h.id, h.name, h.intervalHours, h.startTime, h.soundChoice, schedule
        );
        return { ...h, notificationIds: mainIds, nagNotificationIds: nagIds };
      })
    );
    await saveHabits(rescheduled);
  }, [habits]);

  // --- CRUD ---

  const createHabit = async (formData: HabitFormData) => {
    const cleaned = sanitizeHabitName(formData.name);
    if (!cleaned) {
      Alert.alert('Missing Name', 'Please enter a habit name.');
      return false;
    }

    if ((formData.intervalHours === 12 || formData.intervalHours === 24) &&
        wouldBeFullyBlocked(formData.intervalHours, formData.startTime, sleepSchedule)) {
      Alert.alert(
        'Sleep Conflict',
        `This ${formData.intervalHours}h reminder would fire during your sleep schedule. Choose a different start time or interval.`
      );
      return false;
    }

    const { mainIds, nagIds } = await scheduleReminder(
      Date.now().toString(), cleaned, formData.intervalHours, formData.startTime,
      formData.soundChoice, sleepSchedule
    );
    const newHabit: Habit = {
      id: Date.now().toString(),
      name: cleaned,
      streak: 0,
      notificationIds: mainIds,
      nagNotificationIds: nagIds,
      intervalHours: formData.intervalHours,
      startTime: formData.startTime,
      category: formData.category,
      bestStreak: 0,
      completions: [],
      lastCompletedAt: null,
      soundChoice: formData.soundChoice,
      responses: [],
    };
    await saveHabits([...habits, newHabit]);
    return true;
  };

  const updateHabit = async (id: string, formData: HabitFormData) => {
    const cleaned = sanitizeHabitName(formData.name);
    if (!cleaned) {
      Alert.alert('Missing Name', 'Please enter a habit name.');
      return false;
    }
    const habit = habits.find((h) => h.id === id);
    if (!habit) return false;

    if ((formData.intervalHours === 12 || formData.intervalHours === 24) &&
        wouldBeFullyBlocked(formData.intervalHours, formData.startTime, sleepSchedule)) {
      Alert.alert(
        'Sleep Conflict',
        `This ${formData.intervalHours}h reminder would fire during your sleep schedule. Choose a different start time or interval.`
      );
      return false;
    }

    await cancelReminders([...habit.notificationIds, ...habit.nagNotificationIds]);

    const { mainIds, nagIds } = await scheduleReminder(
      id, cleaned, formData.intervalHours, formData.startTime,
      formData.soundChoice, sleepSchedule
    );
    const updated = habits.map((h) =>
      h.id === id
        ? {
            ...h,
            name: cleaned,
            intervalHours: formData.intervalHours,
            startTime: formData.startTime,
            category: formData.category,
            notificationIds: mainIds,
            nagNotificationIds: nagIds,
            soundChoice: formData.soundChoice,
          }
        : h
    );
    await saveHabits(updated);
    return true;
  };

  const deleteHabit = async (id: string) => {
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;

    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habit.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await cancelReminders([...habit.notificationIds, ...habit.nagNotificationIds]);
            const updated = habits.filter((h) => h.id !== id);
            await saveHabits(updated);
          },
        },
      ]
    );
  };

  // --- Response handling (from notification actions or in-app modal) ---

  const recordResponse = useCallback(async (habitId: string, type: HabitResponseType) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    // Cancel pending nag notifications so the phone stops re-alerting.
    // Main notifications are kept — they continue firing on schedule.
    // Nags are rescheduled on next app startup (cancelAll + reschedule in lifecycle).
    markHabitResponded(habitId);
    if (habit.nagNotificationIds.length > 0) {
      await cancelReminders(habit.nagNotificationIds);
    }

    const now = new Date();
    const entry = { timestamp: now.toISOString(), type };
    const responses = [...habit.responses, entry];

    // Always log the response — each fire is independent.
    // completions[] tracks which calendar days had at least one "complete" (for streaks).
    const today = toDateString(now);
    const completions = (type === 'complete' && !habit.completions.includes(today))
      ? [...habit.completions, today]
      : habit.completions;
    const streak = calculateStreak(completions);
    const bestStreak = Math.max(habit.bestStreak, streak);
    const lastCompletedAt = type === 'complete' ? now.toISOString() : habit.lastCompletedAt;

    const updated = habits.map((h) =>
      h.id === habitId
        ? { ...h, responses, completions, streak, bestStreak, lastCompletedAt, nagNotificationIds: [] }
        : h
    );
    await saveHabits(updated);
  }, [habits]);

  // --- Dashboard stats ---

  const dashboardStats = useMemo((): DashboardStats | null => {
    if (habits.length === 0) return null;
    const today = toDateString(new Date());
    const completedToday = habits.filter((h) => h.completions.includes(today)).length;
    const totalHabits = habits.length;

    const now = new Date();
    let totalSlots = 0;
    let filledSlots = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = toDateString(d);
      for (const h of habits) {
        totalSlots++;
        if (h.completions.includes(ds)) filledSlots++;
      }
    }
    const weekRate = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

    const bestStreak = Math.max(0, ...habits.map((h) => h.bestStreak));

    return { completedToday, totalHabits, weekRate, bestStreak };
  }, [habits]);

  const canCreateHabit = isPro || habits.length < FREE_HABIT_LIMIT;

  return {
    habits,
    filteredHabits,
    dashboardStats,
    canCreateHabit,
    createHabit,
    updateHabit,
    deleteHabit,
    recordResponse,
    sleepSchedule,
    updateSleepSchedule,
  };
}
