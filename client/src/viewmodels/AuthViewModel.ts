import { makeAutoObservable } from 'mobx';
import { authService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socialAuthService } from '../services/socialAuthService';
import { Alert } from 'react-native';

interface User {
  id: string;
  fullName: string;
  email: string;
  providers?: string[];
}

interface AuthResponse {
  token: string;
  user: User;
  isNewUser?: boolean;
}

interface ValidationErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

class AuthViewModel {
  isAuthenticated = false;
  user: User | null = null;
  loading = false;
  error: string | null = null;
  validationErrors: ValidationErrors = {};
  touchedFields: { [key: string]: boolean } = {};
  loginAttempts = 0;
  lockoutUntil: number | null = null;

  constructor() {
    makeAutoObservable(this);
    this.checkAuth();
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  private setError(value: string | null) {
    this.error = value;
  }

  private setAuthenticated(value: boolean) {
    this.isAuthenticated = value;
  }

  private setUser(value: User | null) {
    this.user = value;
  }

  private setValidationErrors(value: ValidationErrors) {
    this.validationErrors = value;
  }

  private setTouchedField(field: string, value: boolean) {
    this.touchedFields[field] = value;
  }

  private setLoginAttempts(value: number) {
    this.loginAttempts = value;
  }

  private setLockoutUntil(value: number | null) {
    this.lockoutUntil = value;
  }

  private async checkAuth() {
    try {
      const token = await AsyncStorage.getItem('token');
      const user = await AsyncStorage.getItem('user');
      if (token && user) {
        this.setAuthenticated(true);
        this.setUser(JSON.parse(user));
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    }
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): boolean {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const hasMinLength = password.length >= 8;

    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && hasMinLength;
  }

  validateField(field: string, value: string, confirmPassword?: string) {
    this.setTouchedField(field, true);

    switch (field) {
      case 'fullName':
        if (!value.trim()) {
          this.setValidationErrors({ ...this.validationErrors, fullName: 'Full name is required' });
        } else {
          const { fullName, ...rest } = this.validationErrors;
          this.setValidationErrors(rest);
        }
        break;

      case 'email':
        if (!value.trim()) {
          this.setValidationErrors({ ...this.validationErrors, email: 'Email is required' });
        } else if (!this.validateEmail(value)) {
          this.setValidationErrors({ ...this.validationErrors, email: 'Invalid email format' });
        } else {
          const { email, ...rest } = this.validationErrors;
          this.setValidationErrors(rest);
        }
        break;

      case 'password':
        if (!value) {
          this.setValidationErrors({ ...this.validationErrors, password: 'Password is required' });
        } else if (!this.validatePassword(value)) {
          this.setValidationErrors({ ...this.validationErrors, password: 'Password does not meet requirements' });
        } else {
          const { password, ...rest } = this.validationErrors;
          this.setValidationErrors(rest);
        }
        break;

      case 'confirmPassword':
        if (!value) {
          this.setValidationErrors({ ...this.validationErrors, confirmPassword: 'Please confirm your password' });
        } else if (value !== confirmPassword) {
          this.setValidationErrors({ ...this.validationErrors, confirmPassword: 'Passwords do not match' });
        } else {
          const { confirmPassword, ...rest } = this.validationErrors;
          this.setValidationErrors(rest);
        }
        break;
    }
  }

  validateRegistration(fullName: string, email: string, password: string, confirmPassword: string): boolean {
    const errors: ValidationErrors = {};

    if (!fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!this.validateEmail(email)) {
      errors.email = 'Invalid email format';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (!this.validatePassword(password)) {
      errors.password = 'Password does not meet requirements';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    this.setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  validateLogin(email: string, password: string): boolean {
    const errors: ValidationErrors = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!this.validateEmail(email)) {
      errors.email = 'Invalid email format';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    this.setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async login(email: string, password: string) {
    if (this.lockoutUntil && Date.now() < this.lockoutUntil) {
      const remainingMinutes = Math.ceil((this.lockoutUntil - Date.now()) / 60000);
      this.setError(`Too many login attempts. Please try again in ${remainingMinutes} minutes.`);
      return;
    }

    if (!this.validateLogin(email, password)) {
      return;
    }

    try {
      this.setLoading(true);
      this.setError(null);
      const response = await authService.login(email, password) as AuthResponse;
      
      this.setLoginAttempts(0);
      this.setLockoutUntil(null);
      
      this.setAuthenticated(true);
      this.setUser(response.user);
      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));
    } catch (error: any) {
      const newAttempts = this.loginAttempts + 1;
      
      if (newAttempts >= 5) {
        const lockoutTime = Date.now() + (15 * 60 * 1000);
        this.setLoginAttempts(0);
        this.setLockoutUntil(lockoutTime);
        this.setError('Too many failed attempts. Account locked for 15 minutes.');
      } else {
        this.setLoginAttempts(newAttempts);
        
        if (error.response) {
          switch (error.response.status) {
            case 401:
              this.setError('Invalid email or password');
              break;
            case 404:
              this.setError('Account does not exist');
              break;
            default:
              this.setError(error.response.data?.message || 'An error occurred');
          }
        } else if (error.request) {
          this.setError('Network error. Please check your connection');
        } else {
          this.setError('An unexpected error occurred');
        }
      }
    } finally {
      this.setLoading(false);
    }
  }

  async register(fullName: string, email: string, password: string) {
    if (!this.validateRegistration(fullName, email, password, password)) {
      return;
    }

    try {
      this.setLoading(true);
      this.setError(null);
      const response = await authService.register(fullName, email, password) as AuthResponse;
      this.setAuthenticated(true);
      this.setUser(response.user);
      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));
    } catch (error: any) {
      if (error.response) {
        switch (error.response.status) {
          case 400:
            this.setError('Email already exists. Please log in instead.');
            break;
          case 500:
            this.setError('Server error. Please try again later');
            break;
          default:
            this.setError(error.response.data?.message || 'An error occurred');
        }
      } else if (error.request) {
        this.setError('Network error. Please check your connection');
      } else {
        this.setError('An unexpected error occurred');
      }
    } finally {
      this.setLoading(false);
    }
  }

  async googleLogin(isRegistration = false) {
    console.log('Google login');
    try {
      this.setLoading(true);
      this.setError(null);
      
      const response = await socialAuthService.signInWithGoogle(isRegistration) as AuthResponse;
      
      if (response) {
        // If this is a registration attempt and the user already exists (not a new user)
        if (isRegistration && !response.isNewUser) {
          this.setError('This email is already registered. Please use the login screen instead.');
          return null;
        }
        
        this.setAuthenticated(true);
        this.setUser(response.user);
        await AsyncStorage.setItem('token', response.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.user));
        
        // Let the UI know authentication was successful
        // The AppNavigator will handle navigation based on isAuthenticated state
        return response;
      }
    } catch (error: any) {
      if (error.message?.includes('cancelled')) {
        console.log('Google sign-in cancelled');
      } else if (error.response && error.response.status === 400 && error.response.data?.message?.includes('already exists')) {
        this.setError('Email already exists. Please log in instead.');
      } else if (error.response && error.response.status === 400 && error.response.data?.message?.includes('already registered')) {
        this.setError('This email is already registered. Please use the login screen instead.');
      } else {
        this.setError('Google login failed. Please try again.');
        console.error('Google login error:', error);
      }
      return null;
    } finally {
      this.setLoading(false);
    }
  }

  async facebookLogin(isRegistration = false) {
    console.log('Facebook login');
    try {
      this.setLoading(true);
      this.setError(null);
      
      const response = await socialAuthService.signInWithFacebook(isRegistration) as AuthResponse;
      
      if (response) {
        // If this is a registration attempt and the user already exists (not a new user)
        if (isRegistration && !response.isNewUser) {
          this.setError('This email is already registered. Please use the login screen instead.');
          return null;
        }
        
        this.setAuthenticated(true);
        this.setUser(response.user);
        await AsyncStorage.setItem('token', response.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.user));
        
        // Let the UI know authentication was successful
        // The AppNavigator will handle navigation based on isAuthenticated state
        return response;
      }
    } catch (error: any) {
      if (error.message?.includes('cancelled')) {
        console.log('Facebook sign-in cancelled');
      } else if (error.response && error.response.status === 400 && error.response.data?.message?.includes('already exists')) {
        this.setError('Email already exists. Please log in instead.');
      } else if (error.response && error.response.status === 400 && error.response.data?.message?.includes('already registered')) {
        this.setError('This email is already registered. Please use the login screen instead.');
      } else {
        this.setError('Facebook login failed. Please try again.');
        console.error('Facebook login error:', error);
      }
      return null;
    } finally {
      this.setLoading(false);
    }
  }

  async linkGoogleAccount() {
    if (!this.isAuthenticated || !this.user) {
      this.setError('You must be logged in to link accounts');
      return;
    }
    
    try {
      this.setLoading(true);
      this.setError(null);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      await socialAuthService.linkGoogleAccount(token);
      
      const updatedUser = {
        ...this.user,
        providers: [...(this.user.providers || []), 'google']
      };
      
      this.setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      Alert.alert('Success', 'Your Google account has been linked successfully');
    } catch (error: any) {
      if (error.message && error.message.includes('cancelled')) {
        console.log('Google account linking cancelled by user');
      } else if (error.message && error.message.includes('already linked')) {
        Alert.alert('Account Already Linked', 'This Google account is already linked to your profile');
      } else {
        this.setError('Failed to link Google account. Please try again.');
        console.error('Google account linking error:', error);
      }
    } finally {
      this.setLoading(false);
    }
  }

  async linkFacebookAccount() {
    if (!this.isAuthenticated || !this.user) {
      this.setError('You must be logged in to link accounts');
      return;
    }
    
    try {
      this.setLoading(true);
      this.setError(null);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      await socialAuthService.linkFacebookAccount(token);
      
      const updatedUser = {
        ...this.user,
        providers: [...(this.user.providers || []), 'facebook']
      };
      
      this.setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      Alert.alert('Success', 'Your Facebook account has been linked successfully');
    } catch (error: any) {
      if (error.message && error.message.includes('cancelled')) {
        console.log('Facebook account linking cancelled by user');
      } else if (error.message && error.message.includes('already linked')) {
        Alert.alert('Account Already Linked', 'This Facebook account is already linked to your profile');
      } else {
        this.setError('Failed to link Facebook account. Please try again.');
        console.error('Facebook account linking error:', error);
      }
    } finally {
      this.setLoading(false);
    }
  }

  async logout() {
    try {
      this.setAuthenticated(false);
      this.setUser(null);
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      this.setLoginAttempts(0);
      this.setLockoutUntil(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  resetValidation() {
    this.setValidationErrors({});
    this.touchedFields = {};
    this.setError(null);
  }
}

export const authViewModel = new AuthViewModel(); 