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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { sanitizeInput } from '../utils/secureStorage';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
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
      Alert.alert('Invalid Input', 'Email contains invalid characters.');
      return;
    }
    
    // Client-side validation
    if (!sanitizedEmail) {
      Alert.alert('Validation Error', 'Email is required.');
      return;
    }
    
    if (!validateEmail(sanitizedEmail)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }
    
    try {
      await resetPassword(sanitizedEmail);
      
      if (!error) {
        // Navigate directly to VerifyOTP screen
        navigation.navigate('VerifyOTP', { email: sanitizedEmail });
      } else {
        Alert.alert(
          'Error',
          error.includes('Too many') 
            ? 'Too many reset attempts. Please wait before trying again.'
            : error
        );
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
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
                <Ionicons name="key-outline" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                Don't worry! Enter your email address and we'll send you a verification code to reset your password.
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={[
                styles.inputContainer,
                touchedFields.email && validationErrors.email && styles.inputError
              ]}>
                <Ionicons 
                  name="mail-outline" 
                  size={20} 
                  color={touchedFields.email && validationErrors.email ? COLORS.error : COLORS.gray} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onBlur={() => validateField('email', email)}
                  editable={!loading}
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
                  <Text style={styles.sendButtonText}>Send Verification Code</Text>
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
  },
  inputIcon: {
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: COLORS.black,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: -12,
    marginBottom: 8,
    marginLeft: 8,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  sendButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  sendButtonDisabled: {
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

export default ForgotPasswordScreen; 