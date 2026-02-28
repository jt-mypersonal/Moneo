import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SOUND_OPTIONS } from '@/constants/habits';
import type { SoundChoice } from '@/types/habit';

interface SoundPickerProps {
  value: SoundChoice;
  onChange: (choice: SoundChoice) => void;
  isPro?: boolean;
  onUpgradeRequest?: () => void;
}

export function SoundPicker({ value, onChange, isPro = true, onUpgradeRequest }: SoundPickerProps) {
  const handleLockedPress = () => {
    if (onUpgradeRequest) {
      onUpgradeRequest();
    } else {
      Alert.alert(
        'Pro Feature',
        'Custom notification sounds are available with Moneo Pro.',
      );
    }
  };

  return (
    <View style={styles.intervalRow}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.intervalBar}>
        {SOUND_OPTIONS.map((opt) => {
          const selected = value === opt.key;
          const locked = !isPro && opt.key !== 'default';
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => { locked ? handleLockedPress() : onChange(opt.key); }}
              activeOpacity={locked ? 0.7 : 0.9}
              style={[
                styles.soundPill,
                selected ? styles.intervalPillSelected : styles.intervalPillUnselected,
                locked && styles.soundPillLocked,
              ]}
            >
              <Text style={[styles.soundPillIcon, locked && styles.lockedText]}>
                {locked ? '\u{1F512}' : opt.icon}
              </Text>
              <Text
                style={[
                  styles.soundPillLabel,
                  selected ? styles.intervalLabelSelected : styles.intervalLabelUnselected,
                  locked && styles.lockedText,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  intervalBar: {
    paddingVertical: 2,
  },
  soundPill: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 56,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 6,
    gap: 4,
  },
  soundPillLocked: {
    opacity: 0.45,
  },
  intervalPillSelected: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  intervalPillUnselected: {
    backgroundColor: 'transparent',
    borderColor: '#d1d5db',
  },
  soundPillIcon: {
    fontSize: 14,
  },
  soundPillLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  intervalLabelSelected: {
    color: '#ffffff',
  },
  intervalLabelUnselected: {
    color: '#111827',
  },
  lockedText: {
    color: '#9ca3af',
  },
});
