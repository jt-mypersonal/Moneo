import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CATEGORIES } from '@/constants/habits';
import type { Category } from '@/types/habit';

interface SegmentedTabsProps<T extends string = Category> {
  value: T;
  onChange: (val: T) => void;
  options?: readonly T[];
  compact?: boolean;
}

export function SegmentedTabs<T extends string = Category>({
  value,
  onChange,
  options,
  compact = false,
}: SegmentedTabsProps<T>) {
  const items = (options ?? CATEGORIES) as readonly T[];
  return (
    <View style={[styles.tabsContainer, compact && styles.tabsContainerCompact]}>
      {items.map((item) => {
        const selected = value === item;
        return (
          <TouchableOpacity
            key={item}
            onPress={() => onChange(item)}
            activeOpacity={0.9}
            style={[
              styles.tabPill,
              compact && styles.tabPillCompact,
              selected ? styles.tabPillSelected : styles.tabPillUnselected,
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                compact && styles.tabLabelCompact,
                selected ? styles.tabLabelSelected : styles.tabLabelUnselected,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    padding: 3,
    borderRadius: 999,
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  tabsContainerCompact: {
    padding: 2,
    marginBottom: 0,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  tabPillCompact: {
    paddingVertical: 5,
  },
  tabPillSelected: {
    backgroundColor: '#16a34a',
  },
  tabPillUnselected: {
    backgroundColor: 'transparent',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabLabelCompact: {
    fontSize: 12,
  },
  tabLabelSelected: {
    color: '#ffffff',
  },
  tabLabelUnselected: {
    color: '#374151',
  },
});
