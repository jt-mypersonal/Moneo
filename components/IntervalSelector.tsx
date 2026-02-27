import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { INTERVAL_OPTIONS } from '@/constants/habits';

interface IntervalSelectorProps {
  value: number;
  onChange: (hours: number) => void;
}

export function IntervalSelector({ value, onChange }: IntervalSelectorProps) {
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

const styles = StyleSheet.create({
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  intervalBar: {
    paddingVertical: 2,
  },
  intervalPill: {
    minWidth: 56,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intervalPillSelected: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  intervalPillUnselected: {
    backgroundColor: 'transparent',
    borderColor: '#d1d5db',
  },
  intervalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  intervalLabelSelected: {
    color: '#ffffff',
  },
  intervalLabelUnselected: {
    color: '#111827',
  },
});
