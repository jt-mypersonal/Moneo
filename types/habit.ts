export type Category = 'Wellness' | 'Professional' | 'Student';
export type FilterCategory = Category | 'All';
export type SoundChoice = 'default' | 'chime' | 'bell' | 'ping' | 'zen';
export type HabitResponseType = 'complete' | 'incomplete';

export interface Habit {
  id: string;
  name: string;
  streak: number;
  notificationIds: string[];
  nagNotificationIds: string[];
  intervalHours: number;
  startTime: string | null;
  category: Category;
  bestStreak: number;
  completions: string[];
  lastCompletedAt: string | null;
  soundChoice: SoundChoice;
  responses: HabitResponseEntry[];
}

export interface HabitResponseEntry {
  timestamp: string;
  type: HabitResponseType;
}

export interface SleepSchedule {
  enabled: boolean;
  startTime: string; // "HH:MM" — when sleep begins (e.g. "22:00")
  endTime: string;   // "HH:MM" — when sleep ends (e.g. "07:00")
}

export interface SoundOption {
  key: SoundChoice;
  label: string;
  icon: string;
  file?: string;
}
