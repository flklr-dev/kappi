import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

interface PasswordComplexityProps {
  password: string;
}

const PasswordComplexity: React.FC<PasswordComplexityProps> = ({ password }) => {
  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter', met: /[a-z]/.test(password) },
    { label: 'At least one number', met: /[0-9]/.test(password) },
    { label: 'At least one special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  const metRequirements = requirements.filter(req => req.met).length;
  const totalRequirements = requirements.length;
  const strengthPercentage = (metRequirements / totalRequirements) * 100;

  const getStrengthText = () => {
    if (strengthPercentage === 0) return 'Very Weak';
    if (strengthPercentage <= 20) return 'Weak';
    if (strengthPercentage <= 40) return 'Fair';
    if (strengthPercentage <= 60) return 'Good';
    if (strengthPercentage <= 80) return 'Strong';
    return 'Very Strong';
  };

  const getStrengthColor = () => {
    if (strengthPercentage === 0) return '#ff4444';
    if (strengthPercentage <= 20) return '#ffbb33';
    if (strengthPercentage <= 40) return '#ffeb3b';
    if (strengthPercentage <= 60) return '#00C851';
    if (strengthPercentage <= 80) return '#007E33';
    return '#2E7D32';
  };

  return (
    <View style={styles.container}>
      {requirements.map((requirement, index) => (
        <View key={index} style={styles.requirementRow}>
          <View style={styles.requirementLeft}>
            <View style={[styles.checkbox, requirement.met && styles.checkboxMet]} />
            <Text style={[styles.requirementText, requirement.met && styles.requirementMet]}>
              {requirement.label}
            </Text>
          </View>
          {index === 0 && (
            <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
              {getStrengthText()}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  requirementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.gray,
    marginRight: 8,
  },
  checkboxMet: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  requirementText: {
    fontSize: 14,
    color: COLORS.gray,
    flex: 1,
  },
  requirementMet: {
    color: COLORS.primary,
  },
  strengthText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default PasswordComplexity; 