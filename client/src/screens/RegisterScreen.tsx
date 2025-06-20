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
  Switch,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import PasswordComplexity from '../components/PasswordComplexity';
import { useAuthStore } from '../stores/authStore';
import { authViewModel } from '../viewmodels/AuthViewModel';

type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

const RegisterScreen = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
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
  const [termsAgreed, setTermsAgreed] = useState(false);
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordComplexity, setShowPasswordComplexity] = useState(false);
  const [socialLoading, setSocialLoading] = useState({
    google: false,
    facebook: false
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
        setTermsAgreed(false);
        setShowPasswordComplexity(false);
        setSocialLoading({ google: false, facebook: false });
        resetValidation();
      };

      resetForm();
      return () => resetValidation(); // Reset validation when leaving screen
    }, [resetValidation])
  );

  const validateRegisterField = (field: string, value: string) => {
    if (!value.trim()) {
      resetValidation();
      return;
    }

    switch (field) {
      case 'fullName':
        validateField('fullName', value);
        break;
      case 'email':
        validateField('email', value);
        break;
      case 'password':
        validateField('password', value);
        break;
      case 'confirmPassword':
        validateField('confirmPassword', value, password);
        break;
    }
  };

  const handleRegister = async () => {
    if (!termsAgreed) {
      Alert.alert('Error', 'Please agree to the Terms & Conditions');
      return;
    }

    await register(fullName, email, password);
    
    if (error) {
      if (error.includes('already exists')) {
        Alert.alert('Error', 'Email already exists. Please log in instead.');
      } else {
        Alert.alert('Error', error);
      }
    } else {
      // Reset form before showing success
      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setTermsAgreed(false);
      resetValidation();

      Alert.alert(
        'Success',
        'Account successfully registered.',
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
            'Account Already Exists',
            'This email is already registered. Please login instead.',
            [
              {
                text: 'Go to Login',
                onPress: () => navigation.navigate('Login')
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
        } else {
          Alert.alert('Error', currentError);
        }
      } else if (response && response.isNewUser === true) {
        // Show success message for new accounts only
        Alert.alert(
          'Success',
          'Account successfully registered.',
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
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        Alert.alert('Error', 'Failed to sign up with Google');
      }
    } finally {
      setSocialLoading({ ...socialLoading, google: false });
    }
  };

  const handleFacebookSignUp = async () => {
    try {
      setSocialLoading({ ...socialLoading, facebook: true });
      
      // Pass isRegistration=true to indicate this is a registration attempt
      const response = await authViewModel.facebookLogin(true);
      
      // Check error state after login attempt
      const currentError = authViewModel.error;
      
      if (currentError) {
        if (currentError.includes('already registered') || currentError.includes('already exists')) {
          Alert.alert(
            'Account Already Exists',
            'This email is already registered. Please use the login screen instead.',
            [
              {
                text: 'Go to Login',
                onPress: () => navigation.navigate('Login')
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
        } else {
          Alert.alert('Error', currentError);
        }
      } else if (response && response.isNewUser === true) {
        // Show success message for new accounts only
        Alert.alert(
          'Success',
          'Account successfully registered.',
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
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        Alert.alert('Error', 'Failed to sign up with Facebook');
      }
    } finally {
      setSocialLoading({ ...socialLoading, facebook: false });
    }
  };

  const isFormValid = fullName && email && password && confirmPassword && termsAgreed && 
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
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Sign up to get started</Text>

              <View style={[
                styles.inputContainer,
                touchedFields.fullName && validationErrors.fullName && styles.inputError
              ]}>
                <Ionicons 
                  name="person-outline" 
                  size={20} 
                  color={touchedFields.fullName && validationErrors.fullName ? 'red' : COLORS.gray} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  onBlur={() => validateRegisterField('fullName', fullName)}
                />
              </View>
              {touchedFields.fullName && validationErrors.fullName && (
                <Text style={styles.errorText}>{validationErrors.fullName}</Text>
              )}

              <View style={[
                styles.inputContainer,
                touchedFields.email && validationErrors.email && styles.inputError
              ]}>
                <Ionicons 
                  name="mail-outline" 
                  size={20} 
                  color={touchedFields.email && validationErrors.email ? 'red' : COLORS.gray} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onBlur={() => validateRegisterField('email', email)}
                />
              </View>
              {touchedFields.email && validationErrors.email && (
                <Text style={styles.errorText}>{validationErrors.email}</Text>
              )}

              <View style={[
                styles.inputContainer,
                touchedFields.password && validationErrors.password && styles.inputError
              ]}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color={touchedFields.password && validationErrors.password ? 'red' : COLORS.gray} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
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
              {showPasswordComplexity && <PasswordComplexity password={password} />}
              {touchedFields.password && validationErrors.password && (
                <Text style={styles.errorText}>{validationErrors.password}</Text>
              )}

              <View style={[
                styles.inputContainer,
                touchedFields.confirmPassword && validationErrors.confirmPassword && styles.inputError
              ]}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color={touchedFields.confirmPassword && validationErrors.confirmPassword ? 'red' : COLORS.gray} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (text) {
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

              <View style={styles.termsContainer}>
                <Switch
                  value={termsAgreed}
                  onValueChange={setTermsAgreed}
                  trackColor={{ false: '#767577', true: `${COLORS.primary}80` }}
                  thumbColor={termsAgreed ? COLORS.primary : '#f4f3f4'}
                />
                <Text style={styles.termsText}>
                  I agree to the Terms & Conditions and Privacy Policy
                </Text>
              </View>

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
                  <Text style={styles.registerButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity 
                  style={styles.socialButton} 
                  onPress={handleGoogleSignUp}
                  disabled={socialLoading.google || socialLoading.facebook || loading}
                >
                  {socialLoading.google ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Image 
                        source={require('../assets/google-icon.png')} 
                        style={styles.socialIcon}
                      />
                      <Text style={styles.socialButtonText}>Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.socialButton} 
                  onPress={handleFacebookSignUp}
                  disabled={socialLoading.facebook || socialLoading.google || loading}
                >
                  {socialLoading.facebook ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Image 
                        source={require('../assets/facebook-icon.png')} 
                        style={styles.socialIcon}
                      />
                      <Text style={styles.socialButtonText}>Facebook</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account?</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
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
    justifyContent: 'space-between',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
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
  passwordVisibilityButton: {
    paddingHorizontal: 16,
    height: 50,
    justifyContent: 'center',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 12,
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  registerButtonDisabled: {
    backgroundColor: `${COLORS.primary}80`,
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.lightGray,
  },
  dividerText: {
    marginHorizontal: 16,
    color: COLORS.gray,
    fontSize: 14,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginHorizontal: 8,
    backgroundColor: COLORS.white,
  },
  socialIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  socialButtonText: {
    fontSize: 16,
    color: COLORS.black,
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
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RegisterScreen; 