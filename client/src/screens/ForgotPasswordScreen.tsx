import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { COLORS } from '../constants/colors';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { sanitizeInput } from '../utils/secureStorage';
import { useLanguage } from '../context/LanguageContext'; // Import LanguageContext

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get('window');

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const { t } = useLanguage(); // Use LanguageContext
  const { 
    resetPassword, 
    loading, 
    error, 
    validationErrors, 
    touchedFields, 
    validateField, 
    resetValidation,
    validateEmail 
  } = useAuthStore();
  
  const [email, setEmail] = useState('');
  
  useEffect(() => {
    // Reset validation when component mounts
    resetValidation();
  }, []);
  


  const handleSendCode = async () => {
    // Sanitize input
    const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
    
    if (sanitizedEmail !== email.toLowerCase().trim()) {
      Alert.alert(t('error'), t('please_enter_a_valid_email'));
      return;
    }
    
    // Client-side validation
    if (!sanitizedEmail) {
      Alert.alert(t('validation_error'), t('this_field_is_required'));
      return;
    }
    
    if (!validateEmail(sanitizedEmail)) {
      Alert.alert(t('validation_error'), t('please_enter_a_valid_email'));
      return;
    }
    
    try {
      // Check network connectivity before attempting to send code
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        Alert.alert(t('error'), t('network_error_please_check_connection'));
        return;
      }
      
      const success = await resetPassword(sanitizedEmail);
      
      if (success && !error) {
        // Navigate directly to VerifyOTP screen only if the request was successful
        navigation.navigate('VerifyOTP', { email: sanitizedEmail });
      } else if (error) {
        Alert.alert(
          t('error'),
          error.includes('Too many') 
            ? t('too_many_reset_attempts') 
            : error.includes('Network') 
            ? t('network_error_please_check_connection')
            : error
        );
      }
    } catch (err) {
      Alert.alert(t('error'), t('an_unexpected_error_occurred'));
    }
  };



  const isFormValid = email.trim() && !validationErrors.email && validateEmail(email.trim());
  const canSubmit = isFormValid && !loading;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.headerContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="key-outline" size={Math.min(48, width * 0.12)} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>{t('forgot_password_title')}</Text>
              <Text style={styles.subtitle}>
                {t('forgot_password_subtitle')}
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={[
                styles.inputContainer,
                touchedFields.email && validationErrors.email && styles.inputError
              ]}>
                <Ionicons 
                  name="mail-outline" 
                  size={Math.min(20, width * 0.05)} 
                  color={touchedFields.email && validationErrors.email ? COLORS.error : COLORS.gray} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('email')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onBlur={() => validateField('email', email)}
                  editable={!loading}
                  placeholderTextColor={COLORS.gray}
                />
              </View>
              
              {touchedFields.email && validationErrors.email && (
                <Text style={styles.errorText}>{validationErrors.email}</Text>
              )}

              <TouchableOpacity 
                style={[
                  styles.sendButton, 
                  !canSubmit && styles.sendButtonDisabled
                ]} 
                onPress={handleSendCode}
                disabled={!canSubmit}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.sendButtonText}>{t('send_verification_code')}</Text>
                )}
              </TouchableOpacity>



              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>{t('remember_your_password')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginButtonText}>{t('sign_in')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: Math.min(24, width * 0.06), // Responsive padding
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Math.min(32, height * 0.04), // Responsive margin
    marginTop: Math.min(40, height * 0.05), // Responsive margin
  },
  iconContainer: {
    width: Math.min(80, width * 0.2), // Responsive width
    height: Math.min(80, width * 0.2), // Responsive height (square)
    borderRadius: Math.min(40, width * 0.1), // Responsive border radius
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Math.min(20, height * 0.025), // Responsive margin
  },
  formContainer: {
  },
  title: {
    fontSize: Math.min(28, width * 0.07), // Responsive font size
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: Math.min(8, height * 0.01), // Responsive margin
    textAlign: 'center', // Center align for better responsiveness
  },
  subtitle: {
    fontSize: Math.min(16, width * 0.04), // Responsive font size
    color: COLORS.gray,
    marginBottom: Math.min(32, height * 0.04), // Responsive margin
    textAlign: 'center',
    lineHeight: Math.min(24, width * 0.06), // Responsive line height
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: Math.min(12, width * 0.03), // Responsive border radius
    marginBottom: Math.min(16, height * 0.02), // Responsive margin
    backgroundColor: COLORS.white,
    height: Math.min(50, height * 0.07), // Responsive height
  },
  inputIcon: {
    paddingHorizontal: Math.min(16, width * 0.04), // Responsive padding
  },
  input: {
    flex: 1,
    fontSize: Math.min(16, width * 0.04), // Responsive font size
    color: COLORS.black,
    paddingVertical: Math.min(10, height * 0.015), // Responsive padding
  },
  errorText: {
    color: COLORS.error,
    fontSize: Math.min(12, width * 0.03), // Responsive font size
    marginTop: -Math.min(12, height * 0.015), // Responsive margin
    marginBottom: Math.min(8, height * 0.01), // Responsive margin
    marginLeft: Math.min(8, width * 0.02), // Responsive margin
  },
  inputError: {
    borderColor: COLORS.error,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    height: Math.min(50, height * 0.07), // Responsive height
    borderRadius: Math.min(12, width * 0.03), // Responsive border radius
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Math.min(24, height * 0.03), // Responsive margin
  },
  sendButtonText: {
    color: COLORS.white,
    fontSize: Math.min(16, width * 0.04), // Responsive font size
    fontWeight: 'bold',
  },
  sendButtonDisabled: {
    backgroundColor: `${COLORS.primary}80`,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Math.min(8, height * 0.01), // Responsive margin
    flexWrap: 'wrap', // Allow wrapping on small screens
  },
  loginText: {
    color: COLORS.gray,
    fontSize: Math.min(14, width * 0.035), // Responsive font size
  },
  loginButtonText: {
    color: COLORS.primary,
    fontSize: Math.min(14, width * 0.035), // Responsive font size
    fontWeight: 'bold',
    marginLeft: Math.min(5, width * 0.012), // Responsive margin
  },
});

export default ForgotPasswordScreen;