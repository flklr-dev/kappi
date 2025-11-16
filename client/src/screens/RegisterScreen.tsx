import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import PasswordComplexity from '../components/PasswordComplexity';
import { useAuthStore } from '../stores/authStore';
import { authViewModel } from '../viewmodels/AuthViewModel';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext'; // Import LanguageContext

type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

const { width, height } = Dimensions.get('window');

const RegisterScreen = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const { t } = useLanguage(); // Use LanguageContext
  const { 
    register, 
    loading, 
    error, 
    validationErrors, 
    touchedFields, 
    validateField, 
    resetValidation 
  } = useAuthStore();
  
  // Form data
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordComplexity, setShowPasswordComplexity] = useState(false);
  const [socialLoading, setSocialLoading] = useState({
    google: false,
  });

  // Reset form state when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const resetForm = () => {
        setFullName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setShowPasswordComplexity(false);
        setSocialLoading({ google: false });
        resetValidation();
      };

      resetForm();
      return () => resetValidation(); // Reset validation when leaving screen
    }, [resetValidation])
  );

  const validateRegisterField = (field: string, value: string) => {
    // Always validate regardless of content - this will show "This field is required" for empty fields
    switch (field) {
      case 'fullName':
        validateField('fullName', value, undefined, true);
        break;
      case 'email':
        validateField('email', value, undefined, true);
        break;
      case 'password':
        validateField('password', value, undefined, true);
        break;
      case 'confirmPassword':
        validateField('confirmPassword', value, password, true);
        break;
    }
  };

  const handleRegister = async () => {
    await register(fullName, email, password);
    
    // Add logging here to see the exact error state after registration attempt
    const currentError = useAuthStore.getState().error;
    console.log('RegisterScreen: Error after registration attempt:', currentError);

    if (currentError) {
      if (currentError.includes('already exists')) {
        Alert.alert(t('error'), t('email_already_exists'));
      } else {
        Alert.alert(t('error'), currentError);
      }
    } else {
      // Reset form before showing success
      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      resetValidation();

      Alert.alert(
        t('success'),
        t('account_successfully_registered'),
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to Login screen
              navigation.navigate('Login');
            }
          }
        ]
      );
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setSocialLoading({ ...socialLoading, google: true });
      
      // Pass isRegistration=true to indicate this is a registration attempt
      const response = await authViewModel.googleLogin(true);
      
      // Check error state after login attempt
      const currentError = authViewModel.error;
      
      if (currentError) {
        if (currentError.includes('already registered') || currentError.includes('already exists')) {
          Alert.alert(
            t('account_already_exists'),
            t('this_email_is_already_registered'),
            [
              {
                text: t('go_to_login'),
                onPress: () => navigation.navigate('Login')
              },
              {
                text: t('cancel'),
                style: 'cancel'
              }
            ]
          );
        } else {
          Alert.alert(t('error'), currentError);
        }
      } else if (response) {
        // Handle reactivation case
        if ((response as any).isReactivated) {
          // Show reactivation message
          Alert.alert(
            t('account_reactivated'),
            t('account_reactivated_message'),
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate to home screen
                  navigation.navigate('MainTabs', { screen: 'HomeTab' });
                }
              }
            ]
          );
        } else if (response.isNewUser === true) {
          // Show success message for new accounts only
          Alert.alert(
            t('success'),
            t('account_successfully_registered'),
            [
              {
                text: 'OK',
                onPress: () => {
                  // Force authentication state update
                  useAuthStore.getState().setAuthenticated(true);
                  // Force app reload to trigger navigation
                  setTimeout(() => {
                    console.log('Forcing navigation to home screen');
                    useAuthStore.getState().setAuthenticated(true);
                  }, 100);
                }
              }
            ]
          );
        }
      }
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        Alert.alert(t('error'), t('failed_to_sign_up_with_google'));
      }
    } finally {
      setSocialLoading({ ...socialLoading, google: false });
    }
  };

  const isFormValid = fullName && email && password && confirmPassword && 
    password === confirmPassword && !validationErrors.password;

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
        >
          <View style={styles.content}>
            <View style={styles.formContainer}>
              <Image 
                source={require('../assets/colored-logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>{t('create_account')}</Text>
              <Text style={styles.subtitle}>{t('get_ai_powered_disease_detection_tools')}</Text>

              <Text style={styles.label}>{t('full_name')}</Text>
              <View style={[
                styles.inputContainer,
                touchedFields.fullName && validationErrors.fullName && styles.inputError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder={t('enter_your_full_name')}
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    if (touchedFields.fullName) {
                      validateRegisterField('fullName', text);
                    }
                  }}
                  onBlur={() => validateRegisterField('fullName', fullName)}
                />
              </View>
              {touchedFields.fullName && validationErrors.fullName && (
                <Text style={styles.errorText}>{validationErrors.fullName}</Text>
              )}

              <Text style={styles.label}>{t('email')}</Text>
              <View style={[
                styles.inputContainer,
                touchedFields.email && validationErrors.email && styles.inputError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder={t('enter_your_email')}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (touchedFields.email) {
                      validateRegisterField('email', text);
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onBlur={() => validateRegisterField('email', email)}
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
                  onChangeText={(text) => {
                    setPassword(text);
                    if (touchedFields.password) {
                      validateRegisterField('password', text);
                    }
                  }}
                  secureTextEntry={!showPassword}
                  onFocus={() => setShowPasswordComplexity(true)}
                  onBlur={() => {
                    setShowPasswordComplexity(false);
                    validateRegisterField('password', password);
                  }}
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
              {/* Show password complexity when typing or when password doesn't meet requirements */}
              {(showPasswordComplexity || (password.length > 0 && validationErrors.password)) && (
                <PasswordComplexity password={password} />
              )}
              {touchedFields.password && validationErrors.password && (
                <Text style={styles.errorText}>{validationErrors.password}</Text>
              )}

              <Text style={styles.label}>{t('confirm_password')}</Text>
              <View style={[
                styles.inputContainer,
                touchedFields.confirmPassword && validationErrors.confirmPassword && styles.inputError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder={t('enter_your_password')}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (touchedFields.confirmPassword) {
                      validateRegisterField('confirmPassword', text);
                    }
                  }}
                  secureTextEntry={!showConfirmPassword}
                  onBlur={() => validateRegisterField('confirmPassword', confirmPassword)}
                />
                <TouchableOpacity
                  style={styles.passwordVisibilityButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={COLORS.gray} 
                  />
                </TouchableOpacity>
              </View>
              {touchedFields.confirmPassword && validationErrors.confirmPassword && (
                <Text style={styles.errorText}>{validationErrors.confirmPassword}</Text>
              )}
              
              {/* Show success message when passwords match */}
              {confirmPassword.length > 0 && password === confirmPassword && password.length >= 8 && !validationErrors.password && (
                <Text style={styles.successText}>✓ Passwords match</Text>
              )}

              <TouchableOpacity 
                style={[styles.registerButton, !isFormValid && styles.registerButtonDisabled]}
                onPress={handleRegister}
                disabled={!isFormValid || loading}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.white} />
                  </View>
                ) : (
                  <Text style={styles.registerButtonText}>{t('create_account_button')}</Text>
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
                  onPress={handleGoogleSignUp}
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

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>{t('already_have_an_account')}</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
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
    padding: width * 0.06, // 24px on 400px width screen
    justifyContent: 'space-between',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.45,
    height: height * 0.125,
    alignSelf: 'center',
    marginTop: -height * 0.030,
  },
  title: {
    fontSize: Math.min(28, width * 0.07), // Responsive font size
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: height * 0.01, // 8px on 800px height screen
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Math.min(16, width * 0.04),
    color: COLORS.gray,
    marginBottom: height * 0.02, 
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
    marginBottom: height * 0.015, // Reduced from 0.02 to make more compact
    backgroundColor: COLORS.white,
  },
  input: {
    flex: 1,
    height: height * 0.0625, // 50px on 800px height screen
    fontSize: Math.min(16, width * 0.04), // Responsive font size
    color: COLORS.black,
    paddingHorizontal: width * 0.04, // 16px on 400px width screen
  },
  passwordVisibilityButton: {
    padding: width * 0.04, // 16px on 400px width screen
    height: height * 0.0625, // 50px on 800px height screen
    justifyContent: 'center',
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    height: height * 0.0625, // 50px on 800px height screen
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.02, // Reduced from 0.03 to make more compact
  },
  registerButtonDisabled: {
    backgroundColor: `${COLORS.primary}80`,
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: Math.min(16, width * 0.04), // Responsive font size
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.02, // Reduced from 0.03 to make more compact
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
    marginBottom: height * 0.02, // Reduced from 0.03 to make more compact
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: height * 0.01, // 8px on 800px height screen
  },
  loginText: {
    color: COLORS.gray,
    fontSize: Math.min(14, width * 0.035), // Responsive font size
  },
  loginButtonText: {
    color: COLORS.primary,
    fontSize: Math.min(14, width * 0.035), // Responsive font size
    fontWeight: 'bold',
    marginLeft: width * 0.0125, // 5px on 400px width screen
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: Math.min(12, width * 0.03), // Responsive font size
    marginTop: -height * 0.015, // -12px on 800px height screen
    marginBottom: height * 0.01, // 8px on 800px height screen
    marginLeft: width * 0.02, // 8px on 400px width screen
  },
  successText: {
    color: COLORS.primary,
    fontSize: Math.min(12, width * 0.03), // Responsive font size
    marginTop: -height * 0.015, // -12px on 800px height screen
    marginBottom: height * 0.01, // 8px on 800px height screen
    marginLeft: width * 0.02, // 8px on 400px width screen
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RegisterScreen;