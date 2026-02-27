import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import type { Category, FilterCategory, Habit } from '@/types/habit';
import {
  SOUND_OPTIONS,
  FILTER_OPTIONS,
  CATEGORY_COLORS,
  CATEGORY_BG_COLORS,
} from '@/constants/habits';
import { formatTimeDisplay, toDateString } from '@/utils/time';
import { MonogramLogo } from '@/components/MonogramLogo';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { IntervalSelector } from '@/components/IntervalSelector';
import { SoundPicker } from '@/components/SoundPicker';
import { TimePickerModal } from '@/components/TimePickerModal';
import { PaywallModal } from '@/components/PaywallModal';
import { useHabits } from '@/hooks/useHabits';
import { useHabitForm } from '@/hooks/useHabitForm';
import { useSubscription } from '@/context/SubscriptionContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function Index() {
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('All');
  const [showPaywall, setShowPaywall] = useState(false);
  const { isPro } = useSubscription();

  const {
    filteredHabits,
    dashboardStats,
    canCreateHabit,
    createHabit,
    updateHabit,
    deleteHabit,
    completeHabit,
    habits,
  } = useHabits(filterCategory);

  const form = useHabitForm(habits, filterCategory);

  // --- Inline renderers ---

  const handleCreate = async () => {
    const success = await createHabit(form.getFormData());
    if (success) form.closeExpanded();
  };

  const handleUpdate = async (id: string) => {
    const success = await updateHabit(id, form.getFormData());
    if (success) form.closeExpanded();
  };

  const handleDelete = (id: string) => {
    deleteHabit(id);
    form.closeExpanded();
  };

  const handleStartAdd = () => {
    if (!canCreateHabit) {
      setShowPaywall(true);
      return;
    }
    form.startAddHabit();
  };

  const renderDashboard = () => {
    if (!dashboardStats) return null;
    const { completedToday, totalHabits, weekRate, bestStreak, last7Days } = dashboardStats;
    const allDone = completedToday === totalHabits;
    const statColor = allDone ? '#16a34a' : completedToday > 0 ? '#d97706' : '#9ca3af';
    return (
      <View style={styles.dashboardSection}>
        <View style={styles.statCardsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: statColor }]}>
              {completedToday}/{totalHabits}
            </Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weekRate}%</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{bestStreak > 0 ? '\u{1F525} ' + bestStreak : '0'}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
        </View>
        <View style={styles.weekRow}>
          {last7Days.map((day) => (
            <View key={day.date} style={styles.dayColumn}>
              <View
                style={[
                  styles.dayDot,
                  day.hasCompletion
                    ? styles.dayDotFilled
                    : day.isToday
                    ? styles.dayDotToday
                    : styles.dayDotEmpty,
                ]}
              />
              <Text style={styles.dayLabel}>{day.dayLabel}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderTemplateRow = () => {
    const templates = form.getTemplatesForCurrentCategory();
    if (templates.length === 0) return null;

    return (
      <View style={styles.templatesSection}>
        <Text style={styles.templatesLabel}>Quick templates</Text>
        <View style={styles.templatesRow}>
          {templates.map((tpl) => (
            <TouchableOpacity
              key={tpl.name}
              style={styles.templatePill}
              onPress={() => form.applyTemplate(tpl)}
              activeOpacity={0.85}
            >
              <Text style={styles.templateEmoji}>{tpl.emoji}</Text>
              <Text style={styles.templateText}>{tpl.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderEditForm = (mode: 'new' | 'edit', habitId?: string) => (
    <View style={styles.editForm}>
      {mode === 'new' && renderTemplateRow()}

      <Text style={styles.editLabel}>Habit Name</Text>
      <TextInput
        style={styles.editInput}
        placeholder="e.g. Drink Water"
        value={form.editName}
        onChangeText={form.setEditName}
        returnKeyType="done"
        autoFocus={mode === 'new'}
      />

      <Text style={styles.editLabel}>Category</Text>
      <SegmentedTabs<Category> value={form.editCategory} onChange={form.setEditCategory} compact />

      <Text style={[styles.editLabel, { marginTop: 12 }]}>Reminder Interval</Text>
      <IntervalSelector value={form.editInterval} onChange={form.setEditInterval} />

      <Text style={[styles.editLabel, { marginTop: 12 }]}>Notification Sound</Text>
      <SoundPicker value={form.editSoundChoice} onChange={form.setEditSoundChoice} isPro={isPro} />

      <View style={styles.editTimeRow}>
        <Text style={styles.editLabel}>Start Time</Text>
        <TouchableOpacity style={styles.editTimeButton} onPress={form.openTimePicker}>
          <Text style={styles.clockIcon}>{'\u{1F552}'}</Text>
          <Text style={styles.timeText}>{formatTimeDisplay(form.editStartTime)}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.editActions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={mode === 'new' ? handleCreate : () => handleUpdate(habitId!)}
        >
          <Text style={styles.primaryButtonText}>
            {mode === 'new' ? 'Create Habit' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
        {mode === 'edit' && (
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(habitId!)}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.cancelButton} onPress={form.cancelEdit}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHabitCard = ({ item }: { item: Habit }) => {
    const isExpanded = form.expandedHabitId === item.id;
    const catColor = CATEGORY_COLORS[item.category];
    const catBg = CATEGORY_BG_COLORS[item.category];
    const today = toDateString(new Date());
    const doneToday = item.completions.includes(today);

    return (
      <View style={[styles.card, { borderLeftColor: catColor }]}>
        <View style={styles.cardRow}>
          {doneToday ? (
            <View style={styles.checkCircleDone}>
              <Text style={styles.checkMark}>{'\u2713'}</Text>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => completeHabit(item.id)}
              style={styles.checkCircle}
            />
          )}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => form.toggleExpand(item.id)}
            style={{ flex: 1 }}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.name}</Text>
                <View style={styles.cardMeta}>
                  <View style={[styles.metaPill, { backgroundColor: catBg }]}>
                    <Text style={[styles.metaPillText, { color: catColor }]}>{item.category}</Text>
                  </View>
                  <View style={styles.metaPillNeutral}>
                    <Text style={styles.metaPillNeutralText}>every {item.intervalHours}h</Text>
                  </View>
                  <View style={styles.metaPillNeutral}>
                    <Text style={styles.metaPillNeutralText}>
                      {formatTimeDisplay(item.startTime)}
                    </Text>
                  </View>
                  {item.soundChoice !== 'default' && (
                    <View style={styles.metaPillNeutral}>
                      <Text style={styles.metaPillNeutralText}>
                        {SOUND_OPTIONS.find((s) => s.key === item.soundChoice)?.icon}{' '}
                        {SOUND_OPTIONS.find((s) => s.key === item.soundChoice)?.label}
                      </Text>
                    </View>
                  )}
                  {item.streak > 0 && (
                    <View style={styles.streakPill}>
                      <Text style={styles.streakPillText}>{'\u{1F525}'} {item.streak}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={[styles.chevron, isExpanded && styles.chevronExpanded]}>
                {'\u203A'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        {isExpanded && renderEditForm('edit', item.id)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <MonogramLogo />
          <View style={styles.headerText}>
            <Text style={styles.title}>Moneo</Text>
            <Text style={styles.subtitle}>Micro-habit tracker</Text>
          </View>
        </View>

        <SegmentedTabs<FilterCategory>
          value={filterCategory}
          onChange={(val) => {
            setFilterCategory(val);
            if (form.expandedHabitId && form.expandedHabitId !== 'new') {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              form.closeExpanded();
            }
          }}
          options={FILTER_OPTIONS}
        />

        <Text style={styles.habitCount}>
          {filteredHabits.length} habit{filteredHabits.length !== 1 ? 's' : ''}
        </Text>

        <FlatList
          data={filteredHabits}
          keyExtractor={(item) => item.id}
          extraData={form.expandedHabitId}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              {renderDashboard()}
              {form.expandedHabitId === 'new' ? (
                <View style={[styles.card, styles.newCard]}>
                  <Text style={styles.newCardTitle}>New Habit</Text>
                  {renderEditForm('new')}
                </View>
              ) : null}
            </>
          }
          renderItem={renderHabitCard}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>{'\u{1F331}'}</Text>
              <Text style={styles.emptyTitle}>
                {filterCategory === 'All' ? 'No habits yet' : `No ${filterCategory} habits`}
              </Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to create your first micro-habit
              </Text>
            </View>
          }
        />

        {form.expandedHabitId !== 'new' && (
          <TouchableOpacity style={styles.fab} onPress={handleStartAdd} activeOpacity={0.85}>
            <Text style={styles.fabIcon}>+</Text>
          </TouchableOpacity>
        )}

        <TimePickerModal
          visible={form.showTimePickerModal}
          tempTime={form.tempTime}
          setTempTime={form.setTempTime}
          onCancel={form.cancelTimePicker}
          onConfirm={form.confirmTimePicker}
        />

        <PaywallModal
          visible={showPaywall}
          onDismiss={() => setShowPaywall(false)}
          onPurchaseSuccess={() => {
            setShowPaywall(false);
            form.startAddHabit();
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 4,
    paddingLeft: 4,
  },
  headerText: {
    marginLeft: 10,
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  habitCount: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#d1d5db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  newCard: {
    borderLeftColor: '#16a34a',
    marginBottom: 12,
  },
  newCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaPillNeutral: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: '#f3f4f6',
  },
  metaPillNeutralText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
  },
  streakPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: '#fff7ed',
  },
  streakPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ea580c',
  },
  chevron: {
    fontSize: 22,
    color: '#9ca3af',
    marginLeft: 8,
    fontWeight: '300',
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  editForm: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fafafa',
    marginBottom: 12,
  },
  editTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  editTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fafafa',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '300',
    lineHeight: 30,
  },
  dashboardSection: {
    marginBottom: 12,
  },
  statCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
  },
  dayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dayDotFilled: {
    backgroundColor: '#16a34a',
  },
  dayDotEmpty: {
    backgroundColor: '#d1d5db',
  },
  dayDotToday: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#16a34a',
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9ca3af',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 10,
    alignSelf: 'center',
  },
  checkCircleDone: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#16a34a',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  clockIcon: {
    fontSize: 18,
    marginRight: 4,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  templatesSection: {
    marginBottom: 12,
  },
  templatesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  templatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
  },
  templateEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  templateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338ca',
  },
});
