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
import { authService } from '../services/api';
import { useLanguage } from '../context/LanguageContext'; // Import LanguageContext

type VerifyOTPScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface RouteParams {
  email: string;
}

// Define the type for the verifyOTP response
interface VerifyOTPResponse {
  isValid: boolean;
  message: string;
  remainingAttempts?: number;
}

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get('window');

const VerifyOTPScreen = () => {
  const navigation = useNavigation<VerifyOTPScreenNavigationProp>();
  const route = useRoute();
  const { t } = useLanguage(); // Use LanguageContext
  const { email } = (route.params as RouteParams) || {};
  
  const { 
    loading, 
    error,
    resetPassword,
    resendOTP
  } = useAuthStore();
  
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  
  useEffect(() => {
    if (!email) {
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
  }, [email]);
  
  // Timer for OTP expiration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeRemaining]);
  
  // Timer for resend cooldown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleVerifyOTP = async () => {
    // Sanitize inputs
    const sanitizedOTP = sanitizeInput(otp.trim());
    const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
    
    if (sanitizedOTP !== otp.trim()) {
      Alert.alert(t('invalid_input'), t('input_contains_invalid_characters'));
      return;
    }
    
    // Client-side validation
    if (!sanitizedOTP) {
      Alert.alert(t('validation_error'), t('verification_code_required'));
      return;
    }
    
    if (!/^\d{6}$/.test(sanitizedOTP)) {
      Alert.alert(t('validation_error'), t('verification_code_must_be_6_digits'));
      return;
    }
    
    if (otpAttempts >= 5) {
      Alert.alert(
        t('too_many_attempts'),
        t('exceeded_max_attempts'),
        [
          {
            text: t('request_new_code'),
            onPress: handleResendOTP
          }
        ]
      );
      return;
    }
    
    try {
      // Call the backend to verify OTP using the API service
      const data = (await authService.verifyOTP(sanitizedEmail, sanitizedOTP)) as VerifyOTPResponse;
      if (data.isValid) {
        // OTP is valid, navigate to ResetPassword screen
        navigation.navigate('ResetPassword', { email: sanitizedEmail, otp: sanitizedOTP });
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle API service errors
      if (error.response) {
        const errorMessage = error.response.data?.message || t('verification_failed');
        console.log('Backend error message:', errorMessage);
        
        // Increment attempts for invalid OTP
        if (error.response.status === 400) {
          setOtpAttempts(prev => prev + 1);
        }
        
        Alert.alert(t('verification_failed'), errorMessage);
      } else {
        Alert.alert(t('error'), t('failed_to_verify_code'));
      }
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) {
      Alert.alert(
        t('please_wait'),
        t('request_new_code_in').replace('{time}', resendCooldown.toString())
      );
      return;
    }
    
    try {
      await resendOTP(email);
      
      if (!error) {
        setResendCooldown(60); // 60 second cooldown
        setTimeRemaining(600); // Reset timer to 10 minutes
        setOtpAttempts(0); // Reset attempts
        setOtp(''); // Clear current OTP
        
        Alert.alert(
          t('new_code_sent'),
          t('new_code_sent_message')
        );
      } else {
        Alert.alert(t('error'), error);
      }
    } catch (err) {
      Alert.alert(t('error'), t('failed_to_resend_code'));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isFormValid = otp.length === 6 && /^\d{6}$/.test(otp);
  const canSubmit = isFormValid && !loading && timeRemaining > 0;

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
                <Ionicons name="mail-outline" size={Math.min(48, width * 0.12)} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>{t('enter_verification_code')}</Text>
              <Text style={styles.subtitle}>
                {t('verification_code_sent').replace('{email}', email)}
              </Text>
              
              {timeRemaining > 0 ? (
                <View style={styles.timerContainer}>
                  <Ionicons name="time-outline" size={Math.min(16, width * 0.04)} color={COLORS.primary} />
                  <Text style={styles.timerText}>
                    {t('code_expires_in').replace('{time}', formatTime(timeRemaining))}
                  </Text>
                </View>
              ) : (
                <View style={styles.expiredContainer}>
                  <Ionicons name="warning-outline" size={Math.min(16, width * 0.04)} color={COLORS.error} />
                  <Text style={styles.expiredText}>{t('code_has_expired')}</Text>
                </View>
              )}
            </View>

            <View style={styles.formContainer}>
              {/* OTP Input */}
              <View style={[
                styles.inputContainer,
                otp.length > 0 && !/^\d{6}$/.test(otp) && styles.inputError
              ]}>
                <Ionicons 
                  name="shield-checkmark-outline" 
                  size={Math.min(20, width * 0.05)} 
                  color={otp.length > 0 && !/^\d{6}$/.test(otp) ? COLORS.error : COLORS.gray} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('verification_code')}
                  value={otp}
                  onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="numeric"
                  maxLength={6}
                  editable={!loading && timeRemaining > 0}
                  placeholderTextColor={COLORS.gray}
                />
              </View>
              
              {otp.length > 0 && otp.length < 6 && (
                <Text style={styles.errorText}>{t('code_must_be_6_digits')}</Text>
              )}
              
              {otpAttempts > 0 && (
                <Text style={styles.attemptsText}>
                  {t('attempts_remaining').replace('{attempts}', (5 - otpAttempts).toString())}
                </Text>
              )}

              <TouchableOpacity 
                style={[
                  styles.verifyButton, 
                  !canSubmit && styles.verifyButtonDisabled
                ]} 
                onPress={handleVerifyOTP}
                disabled={!canSubmit}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.verifyButtonText}>{t('verify_code')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.resendButton}
                onPress={handleResendOTP}
                disabled={resendCooldown > 0 || loading}
              >
                <Text style={styles.resendButtonText}>
                  {resendCooldown > 0 
                    ? t('resend_code_timer').replace('{time}', resendCooldown.toString())
                    : t('resend_code')
                  }
                </Text>
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
    marginBottom: Math.min(16, height * 0.02), // Responsive margin
    textAlign: 'center',
    lineHeight: Math.min(24, width * 0.06), // Responsive line height
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: Math.min(16, width * 0.04), // Responsive padding
    paddingVertical: Math.min(8, height * 0.01), // Responsive padding
    borderRadius: Math.min(20, width * 0.05), // Responsive border radius
    marginTop: Math.min(12, height * 0.015), // Responsive margin
  },
  timerText: {
    color: COLORS.primary,
    fontSize: Math.min(14, width * 0.035), // Responsive font size
    fontWeight: '600',
    marginLeft: Math.min(6, width * 0.015), // Responsive margin
  },
  expiredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.error}10`,
    paddingHorizontal: Math.min(16, width * 0.04), // Responsive padding
    paddingVertical: Math.min(8, height * 0.01), // Responsive padding
    borderRadius: Math.min(20, width * 0.05), // Responsive border radius
    marginTop: Math.min(12, height * 0.015), // Responsive margin
  },
  expiredText: {
    color: COLORS.error,
    fontSize: Math.min(14, width * 0.035), // Responsive font size
    fontWeight: '600',
    marginLeft: Math.min(6, width * 0.015), // Responsive margin
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
    textAlign: 'center',
    letterSpacing: Math.min(4, width * 0.01), // Responsive letter spacing
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    paddingVertical: Math.min(10, height * 0.015), // Responsive padding
  },
  errorText: {
    color: COLORS.error,
    fontSize: Math.min(12, width * 0.03), // Responsive font size
    marginTop: -Math.min(12, height * 0.015), // Responsive margin
    marginBottom: Math.min(8, height * 0.01), // Responsive margin
    marginLeft: Math.min(8, width * 0.02), // Responsive margin
  },
  attemptsText: {
    color: COLORS.error,
    fontSize: Math.min(12, width * 0.03), // Responsive font size
    marginTop: -Math.min(12, height * 0.015), // Responsive margin
    marginBottom: Math.min(8, height * 0.01), // Responsive margin
    marginLeft: Math.min(8, width * 0.02), // Responsive margin
    fontWeight: '600',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    height: Math.min(50, height * 0.07), // Responsive height
    borderRadius: Math.min(12, width * 0.03), // Responsive border radius
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Math.min(24, height * 0.03), // Responsive margin
  },
  verifyButtonText: {
    color: COLORS.white,
    fontSize: Math.min(16, width * 0.04), // Responsive font size
    fontWeight: 'bold',
  },
  verifyButtonDisabled: {
    backgroundColor: `${COLORS.primary}80`,
  },
  resendButton: {
    alignSelf: 'center',
    marginBottom: Math.min(24, height * 0.03), // Responsive margin
  },
  resendButtonText: {
    color: COLORS.primary,
    fontSize: Math.min(14, width * 0.035), // Responsive font size
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

export default VerifyOTPScreen;