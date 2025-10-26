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
import { COLORS } from '../constants/colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { sanitizeInput } from '../utils/secureStorage';
import PasswordComplexity from '../components/PasswordComplexity';
import { useLanguage } from '../context/LanguageContext'; // Import LanguageContext

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface RouteParams {
  email: string;
  otp: string;
}

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get('window');

const ResetPasswordScreen = () => {
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();
  const route = useRoute();
  const { t } = useLanguage(); // Use LanguageContext
  const { email, otp } = (route.params as RouteParams) || {};
  
  const { 
    verifyOTPAndResetPassword,
    loading, 
    error, 
    validatePassword 
  } = useAuthStore();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  useEffect(() => {
    if (!email || !otp) {
      Alert.alert(
        t('invalid_request'),
        t('please_start_from_forgot_password'),
        [
          {
            text: t('ok'),
            onPress: () => navigation.navigate('ForgotPassword')
          }
        ]
      );
      return;
    }
  }, [email, otp]);

  const handleResetPassword = async () => {
    // Sanitize only email and OTP - NOT passwords!
    const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
    const sanitizedOTP = sanitizeInput(otp.trim());
    
    // Client-side validation
    if (!newPassword || !confirmPassword) {
      Alert.alert(t('validation_error'), t('both_password_fields_required'));
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert(t('validation_error'), t('passwords_do_not_match_error'));
      return;
    }
    
    if (!validatePassword(newPassword)) {
      Alert.alert(
        t('password_requirements'),
        t('password_must_meet_requirements')
      );
      return;
    }
    
    try {
      await verifyOTPAndResetPassword(sanitizedEmail, sanitizedOTP, newPassword, confirmPassword);
      
      if (!error) {
        Alert.alert(
          t('password_reset_success'),
          t('password_reset_success_message'),
          [
            {
              text: t('go_to_login_button'),
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } else {
        Alert.alert(t('error'), error);
      }
    } catch (err) {
      Alert.alert(t('error'), t('an_unexpected_error_occurred'));
    }
  };

  const isFormValid = 
    newPassword.length >= 8 && 
    confirmPassword.length >= 8 && 
    newPassword === confirmPassword &&
    validatePassword(newPassword);

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
                <Ionicons name="lock-closed-outline" size={Math.min(48, width * 0.12)} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>{t('reset_password_title')}</Text>
              <Text style={styles.subtitle}>
                {t('reset_password_subtitle')}
              </Text>
            </View>

            <View style={styles.formContainer}>
              {/* New Password Field */}
              <View style={[
                styles.inputContainer,
                newPassword.length > 0 && !validatePassword(newPassword) && styles.inputError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder={t('enter_new_password')}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  editable={!loading}
                  placeholderTextColor={COLORS.gray}
                />
                <TouchableOpacity 
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.passwordVisibilityButton}
                >
                  <Ionicons 
                    name={showNewPassword ? "eye-off" : "eye"} 
                    size={Math.min(20, width * 0.05)} 
                    color={COLORS.gray} 
                  />
                </TouchableOpacity>
              </View>
              
              {/* Show PasswordComplexity only when password is being entered and doesn't meet requirements */}
              {newPassword.length > 0 && !validatePassword(newPassword) && (
                <View style={styles.passwordComplexityContainer}>
                  <PasswordComplexity password={newPassword} />
                </View>
              )}

              {/* Confirm Password Field */}
              <View style={[
                styles.inputContainer,
                confirmPassword.length > 0 && newPassword !== confirmPassword && styles.inputError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder={t('confirm_new_password')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  editable={!loading}
                  placeholderTextColor={COLORS.gray}
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.passwordVisibilityButton}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off" : "eye"} 
                    size={Math.min(20, width * 0.05)} 
                    color={COLORS.gray} 
                  />
                </TouchableOpacity>
              </View>
              
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={styles.errorText}>{t('passwords_do_not_match')}</Text>
              )}
              
              {confirmPassword.length > 0 && newPassword === confirmPassword && newPassword.length >= 8 && (
                <Text style={styles.successText}>{t('passwords_match')}</Text>
              )}

              <TouchableOpacity 
                style={[
                  styles.resetButton, 
                  !canSubmit && styles.resetButtonDisabled
                ]} 
                onPress={handleResetPassword}
                disabled={!canSubmit}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.resetButtonText}>{t('reset_password_button')}</Text>
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
    paddingHorizontal: Math.min(16, width * 0.04), // Responsive padding
    height: Math.min(50, height * 0.07), // Responsive height
  },
  passwordComplexityContainer: {
    marginBottom: Math.min(16, height * 0.02), // Responsive margin
  },
  input: {
    flex: 1,
    fontSize: Math.min(16, width * 0.04), // Responsive font size
    color: COLORS.black,
    paddingVertical: Math.min(10, height * 0.015), // Responsive padding
  },
  passwordVisibilityButton: {
    padding: Math.min(8, width * 0.02), // Responsive padding
  },
  errorText: {
    color: COLORS.error,
    fontSize: Math.min(12, width * 0.03), // Responsive font size
    marginTop: -Math.min(12, height * 0.015), // Responsive margin
    marginBottom: Math.min(8, height * 0.01), // Responsive margin
    marginLeft: Math.min(8, width * 0.02), // Responsive margin
  },
  successText: {
    color: COLORS.success,
    fontSize: Math.min(12, width * 0.03), // Responsive font size
    marginTop: -Math.min(12, height * 0.015), // Responsive margin
    marginBottom: Math.min(8, height * 0.01), // Responsive margin
    marginLeft: Math.min(8, width * 0.02), // Responsive margin
  },
  inputError: {
    borderColor: COLORS.error,
  },
  resetButton: {
    backgroundColor: COLORS.primary,
    height: Math.min(50, height * 0.07), // Responsive height
    borderRadius: Math.min(12, width * 0.03), // Responsive border radius
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Math.min(24, height * 0.03), // Responsive margin
  },
  resetButtonText: {
    color: COLORS.white,
    fontSize: Math.min(16, width * 0.04), // Responsive font size
    fontWeight: 'bold',
  },
  resetButtonDisabled: {
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

export default ResetPasswordScreen;