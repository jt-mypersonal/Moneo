export type Category = 'Wellness' | 'Professional' | 'Student';
export type FilterCategory = Category | 'All';
export type SoundChoice = 'default' | 'chime' | 'bell' | 'ping' | 'zen';

export interface Habit {
  id: string;
  name: string;
  streak: number;
  notificationId: string | null;
  intervalHours: number;
  startTime: string | null;
  category: Category;
  bestStreak: number;
  completions: string[];
  lastCompletedAt: string | null;
  soundChoice: SoundChoice;
}

export interface SoundOption {
  key: SoundChoice;
  label: string;
  icon: string;
  file?: string;
}
