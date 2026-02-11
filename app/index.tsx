import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

// Notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const INTERVAL_OPTIONS = [1, 2, 4, 8, 12, 24];
const DEFAULT_INTERVAL_HOURS = 2;
const CATEGORIES = ['Wellness', 'Professional', 'Student'];

function pad2(x: number) {
  return String(x).padStart(2, '0');
}
function hoursToSeconds(h: number | string) {
  const n = Number(h);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 3600) : 0;
}
function sanitizeHabitName(name: any) {
  return (name ?? '').toString().replace(/\s+/g, ' ').trim();
}
function dateToHHMM(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function formatTimeDisplay(hhmm: string | null) {
  if (!hhmm) return '--:--';
  const [hourStr, minuteStr] = hhmm.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${pad2(minute)} ${ampm}`;
}

const TEMPLATES = {
  Wellness: [{ emoji: '💧', name: 'Drink Water', intervalHours: 2 }],
  Professional: [{ emoji: '📧', name: 'Inbox Zero Check', intervalHours: 4 }],
  Student: [{ emoji: '📚', name: 'Homework Block', intervalHours: 4 }],
};

// Tabs
function SegmentedTabs({ value, onChange }) {
  return (
    <View style={styles.tabsContainer}>
      {CATEGORIES.map((cat) => {
        const selected = value === cat;
        return (
          <TouchableOpacity
            key={cat}
            onPress={() => onChange(cat)}
            activeOpacity={0.9}
            style={[styles.tabPill, selected ? styles.tabPillSelected : styles.tabPillUnselected]}
          >
            <Text style={[styles.tabLabel, selected ? styles.tabLabelSelected : styles.tabLabelUnselected]}>
              {cat}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Interval selector
function IntervalSelector({ value, onChange }) {
  return (
    <View style={styles.intervalRow}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.intervalBar}>
        {INTERVAL_OPTIONS.map((hr) => {
          const selected = value === hr;
          return (
            <TouchableOpacity
              key={hr}
              onPress={() => onChange(hr)}
              activeOpacity={0.9}
              style={[styles.intervalPill, selected ? styles.intervalPillSelected : styles.intervalPillUnselected]}
            >
              <Text style={[styles.intervalLabel, selected ? styles.intervalLabelSelected : styles.intervalLabelUnselected]}>
                {hr}h
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Time picker modal
function TimePickerModal({ visible, onCancel, onConfirm, tempTime, setTempTime }) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.timeModalBackdrop}>
        <View style={styles.timeModalContainer}>
          <DateTimePicker
            value={tempTime || new Date()}
            mode="time"
            is24Hour={false}
            display="spinner"
            themeVariant="light"
            onChange={(e, date) => {
              if (date) setTempTime(date);
            }}
          />
          <View style={styles.timeModalButtons}>
            <Button title="Cancel" onPress={onCancel} />
            <Button title="Confirm" onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function Index() {
  const [selectedCategory, setSelectedCategory] = useState('Wellness');
  const [habitName, setHabitName] = useState('');
  const [intervalHours, setIntervalHours] = useState(DEFAULT_INTERVAL_HOURS);
  const [startTime, setStartTime] = useState<string>(dateToHHMM(new Date()));
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [tempTime, setTempTime] = useState<Date | null>(null);
  const [habits, setHabits] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ Cleared all scheduled notifications (dev)');
      await loadHabits();
      await ensureNotificationPermissions();
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('moneo-default', {
            name: 'Moneo Reminders',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        } catch (e) {
          console.warn('Channel setup failed:', e);
        }
      }
    })();
  }, []);

  const ensureNotificationPermissions = async () => {
    if (Platform.OS === 'web') return;
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (!settings.granted) await Notifications.requestPermissionsAsync();
    } catch (e) {
      console.warn('Permission request failed:', e);
    }
  };

  const loadHabits = async () => {
    try {
      const stored = await AsyncStorage.getItem('habits');
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setHabits(parsed);
    } catch (e) {
      console.warn('Failed to load habits, resetting:', e);
      await AsyncStorage.removeItem('habits');
    }
  };

  const saveHabits = async (updated: any[]) => {
    setHabits(updated);
    try {
      await AsyncStorage.setItem('habits', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist habits:', e);
    }
  };

  // --- Scheduling with console logs ---
  const scheduleReminder = async (title: string, intervalH: number, startHHMM?: string | null) => {
    if (Platform.OS === 'web') return null;
    console.log('📅 Scheduling', { title, intervalH, startHHMM });

    try {
      if (intervalH === 24 && startHHMM) {
        const [hour, minute] = startHHMM.split(':').map((v) => parseInt(v, 10));
        const now = new Date();
        const triggerTime = new Date();
        triggerTime.setHours(hour, minute, 0, 0);
        if (triggerTime <= now) triggerTime.setDate(triggerTime.getDate() + 1);
        console.log('⏰ Daily habit scheduled for', triggerTime.toLocaleString());

        return await Notifications.scheduleNotificationAsync({
          content: { title: `Moneo: ${title}`, body: 'Your micro-habit is due. 🌱' },
          trigger: { hour: triggerTime.getHours(), minute: triggerTime.getMinutes(), repeats: true },
        });
      } else {
        const offsetSeconds = Math.max(5, hoursToSeconds(intervalH)); // min 5 sec grace
        console.log('⏳ Interval habit scheduled for', offsetSeconds, 'seconds from now');

        return await Notifications.scheduleNotificationAsync({
          content: { title: `Moneo: ${title}`, body: 'Your micro-habit is due. 🌱' },
          trigger: {
            seconds: offsetSeconds,
            repeats: true,
            channelId: Platform.OS === 'android' ? 'moneo-default' : undefined,
          },
        });
      }
    } catch (e) {
      console.warn('Failed to schedule notification:', e);
      return null;
    }
  };

  const addHabit = async () => {
    const cleaned = sanitizeHabitName(habitName);
    if (!cleaned) return;
    const notifId = await scheduleReminder(cleaned, intervalHours, startTime);
    const newHabit = {
      id: Date.now().toString(),
      name: cleaned,
      streak: 0,
      notificationId: notifId,
      intervalHours,
      startTime,
      category: selectedCategory,
    };
    await saveHabits([...habits, newHabit]);
    Alert.alert(
      'Habit Created',
      `“${cleaned}” has been created. First reminder in ${intervalHours} hour${intervalHours !== 1 ? 's' : ''}.`
    );
    setHabitName('');
    setIntervalHours(DEFAULT_INTERVAL_HOURS);
    setStartTime(dateToHHMM(new Date()));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Moneo 🌿</Text>
      <Text style={styles.subtitle}>Gentle reminders for meaningful micro-habits</Text>

      <SegmentedTabs value={selectedCategory} onChange={setSelectedCategory} />

      <Text style={styles.sectionHeader}>Add Habit</Text>
      <View style={styles.nameRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="e.g. Drink Water"
          value={habitName}
          onChangeText={setHabitName}
          returnKeyType="done"
          onSubmitEditing={addHabit}
        />
        <TouchableOpacity style={styles.timeDisplayButton} onPress={() => { setTempTime(new Date()); setShowTimePickerModal(true); }}>
          <Text style={styles.clockIcon}>🕒</Text>
          <Text style={styles.timeText}>{formatTimeDisplay(startTime)}</Text>
        </TouchableOpacity>
      </View>

      <IntervalSelector value={intervalHours} onChange={setIntervalHours} />

      <TimePickerModal
        visible={showTimePickerModal}
        tempTime={tempTime}
        setTempTime={setTempTime}
        onCancel={() => setShowTimePickerModal(false)}
        onConfirm={() => {
          if (tempTime) setStartTime(dateToHHMM(tempTime));
          setShowTimePickerModal(false);
        }}
      />

      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listItemText}>{item.name}</Text>
              <Text style={styles.listItemMeta}>
                {item.category} • every {item.intervalHours}h • starts {formatTimeDisplay(item.startTime)} • 🔥 {item.streak}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

// ---- Styles ----
const PILL_HEIGHT = 48;
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#ffffff' },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#4b5563', marginBottom: 12 },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 4,
    borderRadius: 999,
    marginBottom: 12,
    alignSelf: 'stretch',
  },
  tabPill: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  tabPillSelected: { backgroundColor: '#16a34a' },
  tabPillUnselected: { backgroundColor: 'transparent' },
  tabLabel: { fontSize: 14, fontWeight: '600' },
  tabLabelSelected: { color: '#ffffff' },
  tabLabelUnselected: { color: '#111827' },

  sectionHeader: { fontSize: 16, fontWeight: '700', marginTop: 6, marginBottom: 8 },

  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  timeDisplayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  clockIcon: { fontSize: 18, marginRight: 4 },
  timeText: { fontSize: 14, fontWeight: '600', color: '#111827' },

  intervalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  intervalBar: { paddingVertical: 2 },
  intervalPill: {
    minWidth: 64,
    height: PILL_HEIGHT,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intervalPillSelected: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  intervalPillUnselected: { backgroundColor: 'transparent', borderColor: '#d1d5db' },
  intervalLabel: { fontSize: 16, fontWeight: '600' },
  intervalLabelSelected: { color: '#ffffff' },
  intervalLabelUnselected: { color: '#111827' },

  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
  },

  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  listItemText: { fontSize: 16, fontWeight: '600' },
  listItemMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  timeModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  timeModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '80%',
    alignItems: 'center',
  },
  timeModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 12,
  },
});
