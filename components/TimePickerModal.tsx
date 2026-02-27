import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TimePickerModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  tempTime: Date | null;
  setTempTime: (date: Date) => void;
}

export function TimePickerModal({ visible, onCancel, onConfirm, tempTime, setTempTime }: TimePickerModalProps) {
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
            <TouchableOpacity style={styles.modalButton} onPress={onCancel}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={onConfirm}>
              <Text style={[styles.modalButtonText, styles.modalButtonPrimaryText]}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  timeModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  modalButtonPrimary: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  modalButtonPrimaryText: {
    color: '#ffffff',
  },
});
