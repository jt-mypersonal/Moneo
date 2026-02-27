import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function MonogramLogo() {
  return (
    <View style={styles.monogram}>
      <Text style={styles.monogramLetter}>M</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  monogram: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramLetter: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 28,
  },
});
