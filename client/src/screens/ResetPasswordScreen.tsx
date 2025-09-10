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
import PasswordComplexity from '../components/PasswordComplexity';

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface RouteParams {
  email: string;
  otp: string;
}

const ResetPasswordScreen = () => {
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();
  const route = useRoute();
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
  }, [email, otp]);

  const handleResetPassword = async () => {
    // Sanitize only email and OTP - NOT passwords!
    const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
    const sanitizedOTP = sanitizeInput(otp.trim());
    
    // Client-side validation
    if (!newPassword || !confirmPassword) {
      Alert.alert('Validation Error', 'Both password fields are required.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }
    
    if (!validatePassword(newPassword)) {
      Alert.alert(
        'Password Requirements',
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character.'
      );
      return;
    }
    
    try {
      await verifyOTPAndResetPassword(sanitizedEmail, sanitizedOTP, newPassword, confirmPassword);
      
      if (!error) {
        Alert.alert(
          'Success! 🎉',
          'Your password has been reset successfully. You can now log in with your new password.',
          [
            {
              text: 'Go to Login',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } else {
        Alert.alert('Error', error);
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
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
                <Ionicons name="lock-closed-outline" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your new password below. Make sure it's strong and secure.
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
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  editable={!loading}
                />
                <TouchableOpacity 
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.passwordVisibilityButton}
                >
                  <Ionicons 
                    name={showNewPassword ? "eye-off" : "eye"} 
                    size={20} 
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
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  editable={!loading}
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.passwordVisibilityButton}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={COLORS.gray} 
                  />
                </TouchableOpacity>
              </View>
              
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={styles.errorText}>Passwords do not match</Text>
              )}
              
              {confirmPassword.length > 0 && newPassword === confirmPassword && newPassword.length >= 8 && (
                <Text style={styles.successText}>✓ Passwords match</Text>
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
                  <Text style={styles.resetButtonText}>Reset Password</Text>
                )}
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
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
  },
  passwordComplexityContainer: {
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: COLORS.black,
  },
  passwordVisibilityButton: {
    padding: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: -12,
    marginBottom: 8,
    marginLeft: 8,
  },
  successText: {
    color: COLORS.success,
    fontSize: 12,
    marginTop: -12,
    marginBottom: 8,
    marginLeft: 8,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  resetButton: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  resetButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButtonDisabled: {
    backgroundColor: `${COLORS.primary}80`,
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

export default ResetPasswordScreen;