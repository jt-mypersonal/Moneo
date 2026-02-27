import { useCallback, useState } from 'react';
import { LayoutAnimation } from 'react-native';

import type { Category, FilterCategory, Habit, SoundChoice } from '@/types/habit';
import { DEFAULT_INTERVAL_HOURS, TEMPLATES } from '@/constants/habits';
import { dateToHHMM } from '@/utils/time';
import type { HabitFormData } from './useHabits';

export function useHabitForm(habits: Habit[], filterCategory: FilterCategory) {
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editInterval, setEditInterval] = useState(DEFAULT_INTERVAL_HOURS);
  const [editStartTime, setEditStartTime] = useState<string>(dateToHHMM(new Date()));
  const [editCategory, setEditCategory] = useState<Category>('Wellness');
  const [editSoundChoice, setEditSoundChoice] = useState<SoundChoice>('default');

  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [tempTime, setTempTime] = useState<Date | null>(null);

  /**
   * NEW: when creating a habit, you can select a template for the
   * current category; we expose the templates for the active category
   * and a helper to apply one.
   */
  const getTemplatesForCurrentCategory = (): { emoji: string; name: string; intervalHours: number }[] => {
    const cat: Category =
      filterCategory === 'All' ? 'Wellness' : (filterCategory as Category);
    return TEMPLATES[cat] ?? [];
  };

  const applyTemplate = useCallback(
    (template: { emoji: string; name: string; intervalHours: number }) => {
      // Only meant to be used when adding a new habit.
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setEditName(`${template.emoji} ${template.name}`);
      setEditInterval(template.intervalHours);
      setEditStartTime(dateToHHMM(new Date()));
      setEditCategory(filterCategory === 'All' ? 'Wellness' : (filterCategory as Category));
      setEditSoundChoice('default');
      setExpandedHabitId('new');
    },
    [filterCategory]
  );

  const toggleExpand = useCallback(
    (id: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedHabitId((prev) => {
        if (prev === id) return null;
        if (id !== 'new') {
          const habit = habits.find((h) => h.id === id);
          if (habit) {
            setEditName(habit.name);
            setEditInterval(habit.intervalHours);
            setEditStartTime(habit.startTime ?? dateToHHMM(new Date()));
            setEditCategory(habit.category);
            setEditSoundChoice(habit.soundChoice);
          }
        }
        return id;
      });
    },
    [habits]
  );

  const startAddHabit = useCallback(
    () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setEditName('');
      setEditInterval(DEFAULT_INTERVAL_HOURS);
      setEditStartTime(dateToHHMM(new Date()));
      setEditCategory(filterCategory === 'All' ? 'Wellness' : filterCategory);
      setEditSoundChoice('default');
      setExpandedHabitId('new');
    },
    [filterCategory]
  );

  const cancelEdit = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedHabitId(null);
  }, []);

  const closeExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedHabitId(null);
  }, []);

  const getFormData = (): HabitFormData => ({
    name: editName,
    intervalHours: editInterval,
    startTime: editStartTime,
    category: editCategory,
    soundChoice: editSoundChoice,
  });

  const openTimePicker = useCallback(() => {
    setTempTime(new Date());
    setShowTimePickerModal(true);
  }, []);

  const cancelTimePicker = useCallback(() => {
    setShowTimePickerModal(false);
  }, []);

  const confirmTimePicker = useCallback(() => {
    if (tempTime) setEditStartTime(dateToHHMM(tempTime));
    setShowTimePickerModal(false);
  }, [tempTime]);

  return {
    expandedHabitId,
    editName,
    setEditName,
    editInterval,
    setEditInterval,
    editStartTime,
    editCategory,
    setEditCategory,
    editSoundChoice,
    setEditSoundChoice,
    showTimePickerModal,
    tempTime,
    setTempTime,
    toggleExpand,
    startAddHabit,
    cancelEdit,
    closeExpanded,
    getFormData,
    openTimePicker,
    cancelTimePicker,
    confirmTimePicker,

    // NEW exports for template support
    getTemplatesForCurrentCategory,
    applyTemplate,
  };
}
