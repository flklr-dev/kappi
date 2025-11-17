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
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { authViewModel } from '../viewmodels/AuthViewModel';
import { useLanguage } from '../context/LanguageContext'; // Import LanguageContext

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const { width, height } = Dimensions.get('window');

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { t } = useLanguage(); // Use LanguageContext
  const { 
    login, 
    loading, 
    error, 
    validationErrors, 
    touchedFields, 
    validateField, 
    resetValidation 
  } = useAuthStore();
  
  // Form data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState({
    google: false,
  });

  // Reset form state when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const resetForm = () => {
        setEmail('');
        setPassword('');
        setShowPassword(false);
        resetValidation();
        setSocialLoading({ google: false });
      };

      resetForm();
      return () => resetValidation(); // Reset validation when leaving screen
    }, [resetValidation])
  );

  const handleLogin = async () => {
    try {
      await login(email, password);
      
      // Check authentication state after login attempt
      const currentState = useAuthStore.getState();
      const currentError = currentState.error;
      const isAuthenticated = currentState.isAuthenticated;
      
      if (currentError) {
        Alert.alert(t('error'), currentError);
      } else if (isAuthenticated) {
        // Reset form before showing success
        setEmail('');
        setPassword('');
        setShowPassword(false);
        resetValidation();
        
        // Show success message and automatically navigate after 1 second
        Alert.alert(
          t('success'),
          t('welcome_back_message'),
          [
            {
              text: 'OK',
              onPress: () => {
                setTimeout(() => {
                  navigation.navigate('MainTabs', { screen: 'HomeTab' });
                }, 1000);
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert(t('error'), t('an_unexpected_error_occurred'));
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setSocialLoading({ ...socialLoading, google: true });
      const response = await authViewModel.googleLogin(false);
      
      // Check error state after login attempt
      const currentError = authViewModel.error;
      
      if (currentError) {
        Alert.alert(t('error'), currentError);
      } else if (response) {
        // Show success message and automatically navigate after 1 second
        Alert.alert(
          t('success'),
          t('welcome_to_kappi_message'),
          [
            {
              text: 'OK',
              onPress: () => {
                setTimeout(() => {
                  navigation.navigate('MainTabs', { screen: 'HomeTab' });
                }, 1000);
              }
            }
          ]
        );
      }
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        Alert.alert(t('error'), t('failed_to_sign_in_with_google'));
      }
    } finally {
      setSocialLoading({ ...socialLoading, google: false });
    }
  };

  const validateLoginField = (field: string, value: string) => {
    if (field === 'email') {
      if (value.trim()) {
        validateField('email', value);
      } else {
        // Clear validation for empty field
        resetValidation();
      }
    } else if (field === 'password') {
      if (value.trim()) {
        // For login, we only check if password is provided
        // We don't validate password complexity like in registration
        if (!value) {
          // Set a simple "required" error without complexity validation
          useAuthStore.getState().setValidationErrors({ ...validationErrors, password: t('this_field_is_required') });
          useAuthStore.getState().setTouchedField('password', true);
        } else {
          // Clear password error for login
          const newErrors = { ...validationErrors };
          delete newErrors.password;
          useAuthStore.getState().setValidationErrors(newErrors);
          useAuthStore.getState().setTouchedField('password', true);
        }
      } else {
        // Clear validation for empty field
        resetValidation();
      }
    }
  };

  const isFormValid = email && password && !validationErrors.email && !validationErrors.password;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {__DEV__ && (
        <TouchableOpacity 
          style={styles.onboardingButton}
          onPress={() => navigation.navigate('Onboarding')}
        >
          <Text style={styles.onboardingButtonText}>Onboarding (DEV)</Text>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.content}>
            <View style={styles.formContainer}>
              <Image 
                source={require('../assets/colored-logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>{t('welcome_back')}</Text>
              <Text style={styles.subtitle}>{t('detect_diseases_early_and_save_your_harvest')}</Text>

              <Text style={styles.label}>{t('email')}</Text>
              <View style={[
                styles.inputContainer,
                touchedFields.email && validationErrors.email && styles.inputError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder={t('enter_your_email')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onBlur={() => validateLoginField('email', email)}
                />
              </View>
              {touchedFields.email && validationErrors.email && (
                <Text style={styles.errorText}>{validationErrors.email}</Text>
              )}

              <Text style={styles.label}>{t('password')}</Text>
              <View style={[
                styles.inputContainer,
                touchedFields.password && validationErrors.password && styles.inputError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder={t('enter_your_password')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onBlur={() => validateLoginField('password', password)}
                />
                <TouchableOpacity
                  style={styles.passwordVisibilityButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={COLORS.gray} 
                  />
                </TouchableOpacity>
              </View>
              {touchedFields.password && validationErrors.password && (
                <Text style={styles.errorText}>{validationErrors.password}</Text>
              )}

              <TouchableOpacity 
                style={styles.forgotPasswordButton}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotPasswordText}>{t('forgot_password')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.loginButton, !isFormValid && styles.loginButtonDisabled]} 
                onPress={handleLogin}
                disabled={!isFormValid || loading}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.white} />
                  </View>
                ) : (
                  <Text style={styles.loginButtonText}>{t('login')}</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>{t('or')}</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity 
                  style={styles.socialButton} 
                  onPress={handleGoogleLogin}
                  disabled={socialLoading.google || loading}
                >
                  {socialLoading.google ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Image 
                        source={require('../assets/google-icon.png')} 
                        style={styles.socialIcon}
                      />
                      <Text style={styles.socialButtonText}>{t('continue_with_google')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.registerContainer}>
                  <Text style={styles.registerText}>{t('dont_have_an_account')}</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.registerButtonText}>{t('sign_up')}</Text>
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
  content: {
    flex: 1,
    padding: width * 0.06, // 24px on 400px width screen
    justifyContent: 'space-between',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.45, // 180px on 400px width screen
    height: height * 0.125, // 100px on 800px height screen
    alignSelf: 'center',
    marginTop: -height * 0.025, // -20px on 800px height screen
  },
  title: {
    fontSize: Math.min(28, width * 0.07), // Responsive font size
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: height * 0.01, // 8px on 800px height screen
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Math.min(16, width * 0.04), // Responsive font size
    color: COLORS.gray,
    marginBottom: height * 0.04, // 32px on 800px height screen
    textAlign: 'center',
  },
  label: {
    fontSize: Math.min(16, width * 0.04), // Responsive font size
    color: COLORS.black,
    marginBottom: height * 0.01, // 8px on 800px height screen
    fontWeight: '600',
    textAlign: 'left',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    marginBottom: height * 0.02, // 16px on 800px height screen
    backgroundColor: COLORS.white,
  },
  input: {
    flex: 1,
    height: height * 0.0625, // 50px on 800px height screen
    fontSize: Math.min(16, width * 0.04), // Responsive font size
    color: COLORS.black,
    paddingHorizontal: width * 0.04, // 16px on 400px width screen
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: height * 0.03, // 24px on 800px height screen
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: Math.min(14, width * 0.035), // Responsive font size
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    height: height * 0.0625, // 50px on 800px height screen
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.03, // 24px on 800px height screen
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: Math.min(16, width * 0.04), // Responsive font size
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.03, // 24px on 800px height screen
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.lightGray,
  },
  dividerText: {
    marginHorizontal: width * 0.04, // 16px on 400px width screen
    color: COLORS.gray,
    fontSize: Math.min(14, width * 0.035), // Responsive font size
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center', // Changed to center for single button
    marginBottom: height * 0.03, // 24px on 800px height screen
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: height * 0.0625, // 50px on 800px height screen
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginHorizontal: width * 0.02, // 8px on 400px width screen
    backgroundColor: COLORS.white,
  },
  socialIcon: {
    width: width * 0.065, // Reverted and increased width for better visibility
    height: height * 0.03, // Increased height to prevent cutting
    marginRight: width * 0.02, // 8px on 400px width screen
  },
  socialButtonText: {
    fontSize: Math.min(16, width * 0.04), // Responsive font size
    color: COLORS.black,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: height * 0.01, // 8px on 800px height screen
  },
  registerText: {
    color: COLORS.gray,
    fontSize: Math.min(14, width * 0.035), // Responsive font size
  },
  registerButtonText: {
    color: COLORS.primary,
    fontSize: Math.min(14, width * 0.035), // Responsive font size
    fontWeight: 'bold',
    marginLeft: width * 0.0125, // 5px on 400px width screen
  },
  errorText: {
    color: 'red',
    fontSize: Math.min(12, width * 0.03), // Responsive font size
    marginTop: -height * 0.015, // -12px on 800px height screen
    marginBottom: height * 0.01, // 8px on 800px height screen
    marginLeft: width * 0.02, // 8px on 400px width screen
  },
  loginButtonDisabled: {
    backgroundColor: `${COLORS.primary}80`,
  },
  inputError: {
    borderColor: 'red',
  },
  passwordVisibilityButton: {
    padding: width * 0.04, // 16px on 400px width screen
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 8,
  },
  onboardingButtonText: {
    color: COLORS.white,
    fontSize: 12,
  },
});

export default LoginScreen;