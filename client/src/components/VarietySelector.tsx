import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export type CoffeeVariety = 'arabica' | 'robusta';

interface VarietySelectorProps {
  value: CoffeeVariety;
  onChange: (value: CoffeeVariety) => void;
}

const VARIETIES: { label: string; value: CoffeeVariety }[] = [
  { label: 'Arabica', value: 'arabica' },
  { label: 'Robusta', value: 'robusta' },
];

const VarietySelector: React.FC<VarietySelectorProps> = ({ value, onChange }) => {
  return (
    <View style={styles.container}>
      {VARIETIES.map((v) => (
        <TouchableOpacity
          key={v.value}
          style={[styles.button, value === v.value && styles.buttonActive]}
          onPress={() => onChange(v.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === v.value }}
        >
          <Text style={[styles.buttonText, value === v.value && styles.buttonTextActive]}>{v.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 12,
    backgroundColor: 'transparent',
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonTextActive: {
    color: '#fff',
  },
});

export default VarietySelector; 