import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';

interface HabitResponseModalProps {
  visible: boolean;
  habitName: string;
  onComplete: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}

export function HabitResponseModal({
  visible,
  habitName,
  onComplete,
  onSkip,
  onDismiss,
}: HabitResponseModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>{habitName}</Text>
          <Text style={styles.subtitle}>How did it go?</Text>

          <TouchableOpacity style={styles.completeButton} onPress={onComplete} activeOpacity={0.8}>
            <Text style={styles.completeIcon}>{'\u2713'}</Text>
            <Text style={styles.completeText}>Complete</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={onSkip} activeOpacity={0.8}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} activeOpacity={0.8}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>Tip: Long-press notifications for quick actions</Text>
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    marginBottom: 10,
    gap: 8,
  },
  completeIcon: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '700',
  },
  completeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  skipButton: {
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#d97706',
  },
  dismissButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  },
  hint: {
    fontSize: 11,
    color: '#c0c4cc',
    marginTop: 14,
    textAlign: 'center',
  },
});
