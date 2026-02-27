import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Habit, FilterCategory } from '@/types/habit';
import { FREE_HABIT_LIMIT } from '@/constants/habits';
import { toDateString } from '@/utils/time';
import { calculateStreak, sanitizeHabitName } from '@/utils/habits';
import {
  ensureNotificationPermissions,
  setupAndroidChannel,
  scheduleReminder,
  cancelReminder,
  cancelAllReminders,
} from '@/utils/notifications';
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
  last7Days: {
    date: string;
    dayLabel: string;
    hasCompletion: boolean;
    isToday: boolean;
  }[];
}

export function useHabits(filterCategory: FilterCategory) {
  const { isPro } = useSubscription();
  const [habits, setHabits] = useState<Habit[]>([]);

  const filteredHabits = useMemo(() => {
    if (filterCategory === 'All') return habits;
    return habits.filter((h) => h.category === filterCategory);
  }, [habits, filterCategory]);

  // --- Persistence ---

  const loadHabits = async (): Promise<Habit[]> => {
    try {
      const stored = await AsyncStorage.getItem('habits');
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const hydrated = parsed.map((h: any) => ({
          ...h,
          completions: h.completions ?? [],
          bestStreak: h.bestStreak ?? h.streak ?? 0,
          lastCompletedAt: h.lastCompletedAt ?? null,
          soundChoice: h.soundChoice ?? 'default',
        }));
        setHabits(hydrated);
        return hydrated;
      }
    } catch (e) {
      Alert.alert('Load Error', 'Your saved habits could not be read and were reset.');
      await AsyncStorage.removeItem('habits');
    }
    return [];
  };

  const saveHabits = async (updated: Habit[]) => {
    setHabits(updated);
    try {
      await AsyncStorage.setItem('habits', JSON.stringify(updated));
    } catch (e) {
      Alert.alert('Save Failed', 'Your habits could not be saved. Changes may be lost if you close the app.');
    }
  };

  // --- Lifecycle ---

  useEffect(() => {
    (async () => {
      await cancelAllReminders();
      const loaded = await loadHabits();
      await ensureNotificationPermissions();
      await setupAndroidChannel();

      if (loaded.length > 0) {
        const rescheduled = await Promise.all(
          loaded.map(async (h) => {
            const notifId = await scheduleReminder(h.name, h.intervalHours, h.startTime, h.soundChoice);
            return { ...h, notificationId: notifId };
          })
        );
        await saveHabits(rescheduled);
      }
    })();
  }, []);

  // --- CRUD ---

  const createHabit = async (formData: HabitFormData) => {
    const cleaned = sanitizeHabitName(formData.name);
    if (!cleaned) {
      Alert.alert('Missing Name', 'Please enter a habit name.');
      return false;
    }
    const notifId = await scheduleReminder(cleaned, formData.intervalHours, formData.startTime, formData.soundChoice);
    const newHabit: Habit = {
      id: Date.now().toString(),
      name: cleaned,
      streak: 0,
      notificationId: notifId,
      intervalHours: formData.intervalHours,
      startTime: formData.startTime,
      category: formData.category,
      bestStreak: 0,
      completions: [],
      lastCompletedAt: null,
      soundChoice: formData.soundChoice,
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

    if (habit.notificationId) {
      await cancelReminder(habit.notificationId);
    }

    const notifId = await scheduleReminder(cleaned, formData.intervalHours, formData.startTime, formData.soundChoice);
    const updated = habits.map((h) =>
      h.id === id
        ? {
            ...h,
            name: cleaned,
            intervalHours: formData.intervalHours,
            startTime: formData.startTime,
            category: formData.category,
            notificationId: notifId,
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
            if (habit.notificationId) {
              await cancelReminder(habit.notificationId);
            }
            const updated = habits.filter((h) => h.id !== id);
            await saveHabits(updated);
          },
        },
      ]
    );
  };

  const completeHabit = async (id: string) => {
    const today = toDateString(new Date());
    const habit = habits.find((h) => h.id === id);
    if (!habit || habit.completions.includes(today)) return;
    const completions = [...habit.completions, today];
    const streak = calculateStreak(completions);
    const bestStreak = Math.max(habit.bestStreak, streak);
    const updated = habits.map((h) =>
      h.id === id
        ? { ...h, completions, streak, bestStreak, lastCompletedAt: new Date().toISOString() }
        : h
    );
    await saveHabits(updated);
  };

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

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const ds = toDateString(d);
      const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      return {
        date: ds,
        dayLabel: dayLabels[d.getDay()],
        hasCompletion: habits.some((h) => h.completions.includes(ds)),
        isToday: ds === today,
      };
    });

    return { completedToday, totalHabits, weekRate, bestStreak, last7Days };
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
    completeHabit,
  };
}
