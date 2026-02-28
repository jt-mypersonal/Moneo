import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { SleepSchedule } from '@/types/habit';
import { formatTimeDisplay } from '@/utils/time';

interface SleepScheduleModalProps {
  visible: boolean;
  schedule: SleepSchedule;
  onSave: (schedule: SleepSchedule) => void;
  onDismiss: () => void;
}

function hhmmToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map((v) => parseInt(v, 10));
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function SleepScheduleModal({ visible, schedule, onSave, onDismiss }: SleepScheduleModalProps) {
  const [enabled, setEnabled] = useState(schedule.enabled);
  const [startDate, setStartDate] = useState(hhmmToDate(schedule.startTime));
  const [endDate, setEndDate] = useState(hhmmToDate(schedule.endTime));
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    setEnabled(schedule.enabled);
    setStartDate(hhmmToDate(schedule.startTime));
    setEndDate(hhmmToDate(schedule.endTime));
    setPicking(null);
  }, [visible, schedule]);

  const handleSave = () => {
    onSave({
      enabled,
      startTime: dateToHHMM(startDate),
      endTime: dateToHHMM(endDate),
    });
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>Sleep Schedule</Text>
          <Text style={styles.subtitle}>
            Notifications will be silenced during this window
          </Text>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Enable quiet hours</Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ true: '#16a34a', false: '#d1d5db' }}
              thumbColor="#ffffff"
            />
          </View>

          {enabled && (
            <>
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Sleep starts</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setPicking(picking === 'start' ? null : 'start')}
                >
                  <Text style={styles.timeValue}>{formatTimeDisplay(dateToHHMM(startDate))}</Text>
                </TouchableOpacity>
              </View>

              {picking === 'start' && (
                <DateTimePicker
                  value={startDate}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  themeVariant="light"
                  onChange={(_, date) => { if (date) setStartDate(date); }}
                />
              )}

              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Wake up</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setPicking(picking === 'end' ? null : 'end')}
                >
                  <Text style={styles.timeValue}>{formatTimeDisplay(dateToHHMM(endDate))}</Text>
                </TouchableOpacity>
              </View>

              {picking === 'end' && (
                <DateTimePicker
                  value={endDate}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  themeVariant="light"
                  onChange={(_, date) => { if (date) setEndDate(date); }}
                />
              )}
            </>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onDismiss}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  timeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
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
});
