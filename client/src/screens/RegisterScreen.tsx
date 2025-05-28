import React, { useState, useContext } from 'react';
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
  Linking,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../navigation/RootNavigator';
import Header from '../components/Header';

type RegisterNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen = () => {
  // Form data
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigation = useNavigation<RegisterNavigationProp>();
  const { setIsAuthenticated } = useContext(AuthContext);

  const getPasswordStrength = (): { label: string; color: string; progress: number } => {
    if (password.length === 0) {
      return { label: '', color: '', progress: 0 };
    }
    if (password.length < 6) {
      return { label: 'Weak', color: '#F44336', progress: 0.3 };
    }
    if (password.length < 10) {
      return { label: 'Okay', color: '#FFC107', progress: 0.6 };
    }
    return { label: 'Strong', color: '#4CAF50', progress: 1 };
  };

  const passwordStrength = getPasswordStrength();

  const handleUseCurrentLocation = () => {
    // In a real app, this would use geolocation
    setLocation('Bukidnon, Philippines');
  };

  const handleTermsLink = (type: 'terms' | 'privacy') => {
    const url = type === 'terms' 
      ? 'https://kappi.com/terms' 
      : 'https://kappi.com/privacy';
    Linking.openURL(url);
  };

  const handleRegister = async () => {
    if (!isFormValid) return;
    
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = fullName && email && password && confirmPassword && termsAgreed && password === confirmPassword;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <Header
        title="Create Account"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoIconContainer}>
              <Ionicons name="leaf" size={80} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>KAPPI</Text>
            <Text style={styles.subtitle}>Your coffee crop health companion</Text>
          </View>
          
          <View style={styles.formContainer}>
            {/* Full Name */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWithIcon}>
                <Ionicons name="person-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>
            
            {/* Email */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWithIcon}>
                <Ionicons name="mail-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
            
            {/* Mobile Number */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWithIcon}>
                <Ionicons name="call-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mobile Number (Optional)"
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            
            {/* Location */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWithIcon}>
                <Ionicons name="location-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <View style={styles.locationInputContainer}>
                  <TextInput
                    style={styles.locationInput}
                    placeholder="Farm Location"
                    value={location}
                    onChangeText={setLocation}
                  />
                  <TouchableOpacity 
                    style={styles.locationButton}
                    onPress={handleUseCurrentLocation}
                  >
                    <Ionicons name="locate" size={20} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            {/* Password */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWithIcon}>
                <Ionicons name="key-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
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
              </View>
            </View>
            
            {password.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <View style={styles.passwordStrengthBar}>
                  <View 
                    style={[
                      styles.passwordStrengthProgress,
                      { 
                        width: `${passwordStrength.progress * 100}%`,
                        backgroundColor: passwordStrength.color
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.strengthValue, {color: passwordStrength.color}]}>
                  {passwordStrength.label}
                </Text>
              </View>
            )}
            
            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWithIcon}>
                <Ionicons name="key-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
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
              </View>
            </View>
            
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.errorMessage}>Passwords don't match</Text>
            )}
            
            {/* Terms and Register */}
            <View style={styles.termsRow}>
              <Switch
                value={termsAgreed}
                onValueChange={setTermsAgreed}
                trackColor={{ false: '#767577', true: `${COLORS.primary}80` }}
                thumbColor={termsAgreed ? COLORS.primary : '#f4f3f4'}
              />
              <Text style={styles.termsText}>
                I agree to the {' '}
                <Text style={styles.termsLink} onPress={() => handleTermsLink('terms')}>
                  Terms & Conditions
                </Text>
                {' '} and {' '}
                <Text style={styles.termsLink} onPress={() => handleTermsLink('privacy')}>
                  Privacy Policy
                </Text>
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.registerButton,
                !isFormValid && styles.registerButtonDisabled
              ]}
              onPress={handleRegister}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <View style={styles.loadingSpinner} />
                  <Text style={styles.registerButtonText}>Creating Account...</Text>
                </View>
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.loginPrompt}>
              <Text style={styles.loginPromptText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.loginLink}>Log in here</Text>
              </TouchableOpacity>
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
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  logoIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
  },
  inputIcon: {
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  locationButton: {
    backgroundColor: COLORS.primary,
    height: 50,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  passwordVisibilityButton: {
    paddingHorizontal: 16,
    height: 50,
    justifyContent: 'center',
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -12,
    marginBottom: 16,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginRight: 8,
    overflow: 'hidden',
  },
  passwordStrengthProgress: {
    height: '100%',
    borderRadius: 2,
  },
  strengthValue: {
    fontSize: 12,
    fontWeight: 'bold',
    minWidth: 50,
  },
  errorMessage: {
    color: '#F44336',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 16,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  termsText: {
    fontSize: 14,
    color: COLORS.black,
    marginLeft: 12,
    flex: 1,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  registerButtonDisabled: {
    backgroundColor: `${COLORS.primary}80`,
    elevation: 0,
    shadowOpacity: 0,
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.white,
    borderRightColor: 'transparent',
    marginRight: 10,
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginPromptText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  loginLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default RegisterScreen; 