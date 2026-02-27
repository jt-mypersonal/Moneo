import type { Category, FilterCategory, SoundOption } from '@/types/habit';

export const INTERVAL_OPTIONS = [1, 2, 4, 8, 12, 24];
export const DEFAULT_INTERVAL_HOURS = 2;
export const CATEGORIES: readonly Category[] = ['Wellness', 'Professional', 'Student'] as const;
export const FILTER_OPTIONS: readonly FilterCategory[] = ['All', ...CATEGORIES] as const;

export const SOUND_OPTIONS: SoundOption[] = [
  { key: 'default', label: 'Default', icon: '\u{1F514}' },
  { key: 'chime', label: 'Chime', icon: '\u{1F3B5}', file: 'chime.wav' },
  { key: 'bell', label: 'Bell', icon: '\u{1F515}', file: 'bell.wav' },
  { key: 'ping', label: 'Ping', icon: '\u{1F4CC}', file: 'ping.wav' },
  { key: 'zen', label: 'Zen', icon: '\u{1F9D8}', file: 'zen.wav' },
];

export const CATEGORY_COLORS: Record<Category, string> = {
  Wellness: '#16a34a',
  Professional: '#2563eb',
  Student: '#7c3aed',
};

export const CATEGORY_BG_COLORS: Record<Category, string> = {
  Wellness: '#f0fdf4',
  Professional: '#eff6ff',
  Student: '#f5f3ff',
};

export const TEMPLATES: Record<Category, { emoji: string; name: string; intervalHours: number }[]> = {
  Wellness: [{ emoji: '\u{1F4A7}', name: 'Drink Water', intervalHours: 2 }],
  Professional: [{ emoji: '\u{1F4E7}', name: 'Inbox Zero Check', intervalHours: 4 }],
  Student: [{ emoji: '\u{1F4DA}', name: 'Homework Block', intervalHours: 4 }],
};

export const FREE_HABIT_LIMIT = 3;
