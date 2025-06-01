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
} from 'react-native';
import { COLORS } from '../constants/colors';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { authViewModel } from '../viewmodels/AuthViewModel';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
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
    facebook: false
  });

  // Reset form state when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const resetForm = () => {
        setEmail('');
        setPassword('');
        setShowPassword(false);
        resetValidation();
        setSocialLoading({ google: false, facebook: false });
      };

      resetForm();
      return () => resetValidation(); // Reset validation when leaving screen
    }, [resetValidation])
  );

  const handleLogin = async () => {
    try {
      await login(email, password);
      
      // Check error state after login attempt
      const currentError = useAuthStore.getState().error;
      
      if (currentError) {
        Alert.alert('Error', currentError);
      } else {
        // Reset form before showing success
        setEmail('');
        setPassword('');
        setShowPassword(false);
        resetValidation();
        
        Alert.alert(
          'Success',
          'Welcome back!',
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
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setSocialLoading({ ...socialLoading, google: true });
      const response = await authViewModel.googleLogin(false);
      
      // Check error state after login attempt
      const currentError = authViewModel.error;
      
      if (currentError) {
        Alert.alert('Error', currentError);
      } else if (response) {
        // Show success message
        Alert.alert(
          'Success',
          'Welcome to KAPPI!',
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
        Alert.alert('Error', 'Failed to sign in with Google');
      }
    } finally {
      setSocialLoading({ ...socialLoading, google: false });
    }
  };

  const handleFacebookLogin = async () => {
    try {
      setSocialLoading({ ...socialLoading, facebook: true });
      const response = await authViewModel.facebookLogin(false);
      
      // Check error state after login attempt
      const currentError = authViewModel.error;
      
      if (currentError) {
        Alert.alert('Error', currentError);
      } else if (response) {
        // Show success message
        Alert.alert(
          'Success',
          'Welcome to KAPPI!',
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
        Alert.alert('Error', 'Failed to sign in with Facebook');
      }
    } finally {
      setSocialLoading({ ...socialLoading, facebook: false });
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
        validateField('password', value);
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
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>

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
                  onBlur={() => validateLoginField('email', email)}
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
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
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
                  <Text style={styles.loginButtonText}>Login</Text>
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
                  onPress={handleGoogleLogin}
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
                  onPress={handleFacebookLogin}
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

              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Don't have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.registerButtonText}>Sign Up</Text>
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
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonText: {
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
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  registerText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  registerButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 8,
    marginLeft: 8,
  },
  loginButtonDisabled: {
    backgroundColor: `${COLORS.primary}80`,
  },
  inputError: {
    borderColor: 'red',
  },
  passwordVisibilityButton: {
    padding: 8,
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
});

export default LoginScreen; 