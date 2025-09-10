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
} from 'react-native';
import { COLORS } from '../constants/colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { sanitizeInput } from '../utils/secureStorage';
import { authService } from '../services/api';

type VerifyOTPScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface RouteParams {
  email: string;
}

const VerifyOTPScreen = () => {
  const navigation = useNavigation<VerifyOTPScreenNavigationProp>();
  const route = useRoute();
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
        'Invalid Request',
        'Please start from the forgot password screen.',
        [
          {
            text: 'OK',
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
      Alert.alert('Invalid Input', 'Input contains invalid characters.');
      return;
    }
    
    // Client-side validation
    if (!sanitizedOTP) {
      Alert.alert('Validation Error', 'Verification code is required.');
      return;
    }
    
    if (!/^\d{6}$/.test(sanitizedOTP)) {
      Alert.alert('Validation Error', 'Verification code must be 6 digits.');
      return;
    }
    
    if (otpAttempts >= 5) {
      Alert.alert(
        'Too Many Attempts',
        'You have exceeded the maximum number of attempts. Please request a new code.',
        [
          {
            text: 'Request New Code',
            onPress: handleResendOTP
          }
        ]
      );
      return;
    }
    
    try {
      // Call the backend to verify OTP using the API service
      const data = await authService.verifyOTP(sanitizedEmail, sanitizedOTP);
      if (data.isValid) {
        // OTP is valid, navigate to ResetPassword screen
        navigation.navigate('ResetPassword', { email: sanitizedEmail, otp: sanitizedOTP });
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle API service errors
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Invalid verification code. Please try again.';
        console.log('Backend error message:', errorMessage);
        
        // Increment attempts for invalid OTP
        if (error.response.status === 400) {
          setOtpAttempts(prev => prev + 1);
        }
        
        Alert.alert('Verification Failed', errorMessage);
      } else {
        Alert.alert('Error', 'Failed to verify code. Please check your connection and try again.');
      }
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) {
      Alert.alert(
        'Please Wait',
        `You can request a new code in ${resendCooldown} seconds.`
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
          'New Code Sent! 📧',
          'A new verification code has been sent to your email.'
        );
      } else {
        Alert.alert('Error', error);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to resend verification code. Please try again.');
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
                <Ionicons name="mail-outline" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>Enter Verification Code</Text>
              <Text style={styles.subtitle}>
                We've sent a 6-digit code to {email}. Enter the code below to verify your identity.
              </Text>
              
              {timeRemaining > 0 ? (
                <View style={styles.timerContainer}>
                  <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.timerText}>
                    Code expires in {formatTime(timeRemaining)}
                  </Text>
                </View>
              ) : (
                <View style={styles.expiredContainer}>
                  <Ionicons name="warning-outline" size={16} color={COLORS.error} />
                  <Text style={styles.expiredText}>Code has expired</Text>
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
                  size={20} 
                  color={otp.length > 0 && !/^\d{6}$/.test(otp) ? COLORS.error : COLORS.gray} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="X X X X X X"
                  value={otp}
                  onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="numeric"
                  maxLength={6}
                  editable={!loading && timeRemaining > 0}
                />
              </View>
              
              {otp.length > 0 && otp.length < 6 && (
                <Text style={styles.errorText}>Code must be 6 digits</Text>
              )}
              
              {otpAttempts > 0 && (
                <Text style={styles.attemptsText}>
                  {5 - otpAttempts} attempts remaining
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
                  <Text style={styles.verifyButtonText}>Verify Code</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.resendButton}
                onPress={handleResendOTP}
                disabled={resendCooldown > 0 || loading}
              >
                <Text style={styles.resendButtonText}>
                  {resendCooldown > 0 
                    ? `Resend Code (${resendCooldown}s)`
                    : 'Resend Code'
                  }
                </Text>
              </TouchableOpacity>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Remember your password?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginButtonText}>Sign In</Text>
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
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  formContainer: {
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 16,
    textAlign: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  expiredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.error}10`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  expiredText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: COLORS.white,
  },
  inputIcon: {
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: COLORS.black,
    textAlign: 'center',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    paddingRight: 52, // Balance the left icon padding to center the cursor
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: -12,
    marginBottom: 8,
    marginLeft: 8,
  },
  attemptsText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: -12,
    marginBottom: 8,
    marginLeft: 8,
    fontWeight: '600',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  verifyButtonDisabled: {
    backgroundColor: `${COLORS.primary}80`,
  },
  resendButton: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  resendButtonText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  loginButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default VerifyOTPScreen;