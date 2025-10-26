import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useLanguage } from '../context/LanguageContext'; // Import LanguageContext

interface PasswordComplexityProps {
  password: string;
}

const PasswordComplexity: React.FC<PasswordComplexityProps> = ({ password }) => {
  const { t } = useLanguage(); // Use LanguageContext
  
  const requirements = [
    { label: t('at_least_8_characters'), met: password.length >= 8 },
    { label: t('at_least_one_uppercase_letter'), met: /[A-Z]/.test(password) },
    { label: t('at_least_one_lowercase_letter'), met: /[a-z]/.test(password) },
    { label: t('at_least_one_number'), met: /[0-9]/.test(password) },
    { label: t('at_least_one_special_character'), met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  const metRequirements = requirements.filter(req => req.met).length;
  const totalRequirements = requirements.length;
  const strengthPercentage = (metRequirements / totalRequirements) * 100;

  const getStrengthText = () => {
    if (strengthPercentage === 0) return t('very_weak');
    if (strengthPercentage <= 20) return t('weak');
    if (strengthPercentage <= 40) return t('fair');
    if (strengthPercentage <= 60) return t('good');
    if (strengthPercentage <= 80) return t('strong');
    return t('very_strong');
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
            <View style={[styles.checkbox, requirement.met && styles.checkboxMet]}>
              {requirement.met && (
                <Ionicons 
                  name="checkmark" 
                  size={14} 
                  color={COLORS.white} 
                  style={styles.checkmarkIcon}
                />
              )}
            </View>
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
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.gray,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxMet: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  checkmarkIcon: {
    marginTop: -1,
  },
  requirementText: {
    fontSize: 14,
    color: COLORS.gray,
    flex: 1,
  },
  requirementMet: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  strengthText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default PasswordComplexity;