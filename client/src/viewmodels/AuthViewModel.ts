import { makeAutoObservable } from 'mobx';
import { authService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socialAuthService } from '../services/socialAuthService';
import { Alert } from 'react-native';
import { secureStorage } from '../utils/secureStorage';

interface User {
  id: string;
  fullName: string;
  email: string;
  providers?: (string | { provider: string; })[];
  location?: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    address: {
      barangay: string;
      cityMunicipality: string;
      province: string;
    };
  };
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

interface UserCapabilities {
  canSetPassword: boolean;
  hasPasswordAuth: boolean;
  providers: string[];
  user?: User;
}

// Storage keys
const TOKEN_KEY = '@kappi_auth_token';
const USER_KEY = '@kappi_auth_user';
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

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
      // Try to get token from secure storage first
      const tokenData = await secureStorage.getItem(TOKEN_KEY);
      const userData = await secureStorage.getItem(USER_KEY);
      
      // If secure storage has the data, use it
      if (tokenData && userData) {
        const { token, expiresAt } = tokenData;
        
        // Check if token is not expired
        if (Date.now() < expiresAt) {
          this.setAuthenticated(true);
          this.setUser(userData);
          return;
        }
      }
      
      // Fallback to AsyncStorage for backward compatibility
      const token = await AsyncStorage.getItem('token');
      const user = await AsyncStorage.getItem('user');
      
      if (token && user) {
        // Migrate to secure storage
        const expiresAt = Date.now() + TOKEN_EXPIRY;
        await secureStorage.setItem(TOKEN_KEY, { token, expiresAt });
        await secureStorage.setItem(USER_KEY, JSON.parse(user));
        
        // Clean up old storage
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        
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
      
      // Calculate expiration (7 days from now)
      const expiresAt = Date.now() + TOKEN_EXPIRY;
      
      // Store token and user data securely
      await secureStorage.setItem(TOKEN_KEY, {
        token: response.token,
        expiresAt
      });
      await secureStorage.setItem(USER_KEY, response.user);
      
      // Remove old storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      this.setAuthenticated(true);
      this.setUser(response.user);
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
      
      // Calculate expiration (7 days from now)
      const expiresAt = Date.now() + TOKEN_EXPIRY;
      
      // Store token and user data securely
      await secureStorage.setItem(TOKEN_KEY, {
        token: response.token,
        expiresAt
      });
      await secureStorage.setItem(USER_KEY, response.user);
      
      // Remove old storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      this.setAuthenticated(true);
      this.setUser(response.user);
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
        // Handle reactivation case
        if ((response as any).isReactivated) {
          // Show reactivation message
          Alert.alert('Account Reactivated', 'Your account has been reactivated successfully.');
          
          // Calculate expiration (7 days from now)
          const expiresAt = Date.now() + TOKEN_EXPIRY;
          
          // Store token and user data securely
          await secureStorage.setItem(TOKEN_KEY, {
            token: response.token,
            expiresAt
          });
          await secureStorage.setItem(USER_KEY, response.user);
          
          // Remove old storage
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          
          this.setAuthenticated(true);
          this.setUser(response.user);
          
          return response;
        }
        
        // If this is a registration attempt and the user already exists (not a new user)
        if (isRegistration && !response.isNewUser) {
          this.setError('This email is already registered. Please use the login screen instead.');
          return null;
        }
        
        // Calculate expiration (7 days from now)
        const expiresAt = Date.now() + TOKEN_EXPIRY;
        
        // Store token and user data securely
        await secureStorage.setItem(TOKEN_KEY, {
          token: response.token,
          expiresAt
        });
        await secureStorage.setItem(USER_KEY, response.user);
        
        // Remove old storage
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        
        this.setAuthenticated(true);
        this.setUser(response.user);
        
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
    console.log('Facebook login attempt, isRegistration:', isRegistration);
    try {
      this.setLoading(true);
      this.setError(null);
      
      const response = await socialAuthService.signInWithFacebook(isRegistration) as AuthResponse;
      
      if (response) {
        // Handle reactivation case
        if ((response as any).isReactivated) {
          // Show reactivation message
          Alert.alert('Account Reactivated', 'Your account has been reactivated successfully.');
          
          // Calculate expiration (7 days from now)
          const expiresAt = Date.now() + TOKEN_EXPIRY;
          
          // Store token and user data securely
          await secureStorage.setItem(TOKEN_KEY, {
            token: response.token,
            expiresAt
          });
          await secureStorage.setItem(USER_KEY, response.user);
          
          // Remove old storage
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          
          this.setAuthenticated(true);
          this.setUser(response.user);
          
          console.log('Facebook authentication successful');
          return response;
        }
        
        // If this is a registration attempt and the user already exists (not a new user)
        if (isRegistration && !response.isNewUser) {
          this.setError('This email is already registered. Please use the login screen instead.');
          return null;
        }
        
        // Calculate expiration (7 days from now)
        const expiresAt = Date.now() + TOKEN_EXPIRY;
        
        // Store token and user data securely
        await secureStorage.setItem(TOKEN_KEY, {
          token: response.token,
          expiresAt
        });
        await secureStorage.setItem(USER_KEY, response.user);
        
        // Remove old storage
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        
        this.setAuthenticated(true);
        this.setUser(response.user);
        
        console.log('Facebook authentication successful');
        return response;
      }
    } catch (error: any) {
      console.error('Facebook login error in AuthViewModel:', error);
      
      if (error.message?.includes('cancelled')) {
        console.log('Facebook sign-in cancelled by user');
        // Don't show error for cancellation
        return null;
      }
      
      // Handle specific error messages
      if (error.message?.includes('Email permission')) {
        this.setError('Email access is required to complete Facebook login. Please try again and allow email permission.');
      } else if (error.message?.includes('Network error')) {
        this.setError('Network error. Please check your internet connection and try again.');
      } else if (error.message?.includes('already registered')) {
        this.setError('This email is already registered. Please use the login screen instead.');
      } else if (error.response?.status === 400) {
        // Backend validation errors
        const backendMessage = error.response.data?.message;
        if (backendMessage?.includes('already exists') || backendMessage?.includes('already registered')) {
          this.setError('This email is already registered. Please use the login screen instead.');
        } else {
          this.setError(backendMessage || 'Registration failed. Please try again.');
        }
      } else {
        // Generic error
        this.setError(error.message || 'Facebook login failed. Please try again.');
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
      
      const tokenData = await secureStorage.getItem(TOKEN_KEY);
      if (!tokenData) {
        throw new Error('Authentication token not found');
      }
      
      await socialAuthService.linkGoogleAccount(tokenData.token);
      
      const updatedUser = {
        ...this.user,
        providers: [...(this.user.providers || []), 'google']
      };
      
      this.setUser(updatedUser);
      await secureStorage.setItem(USER_KEY, updatedUser);
      
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
      
      const tokenData = await secureStorage.getItem(TOKEN_KEY);
      if (!tokenData) {
        throw new Error('Authentication token not found');
      }
      
      await socialAuthService.linkFacebookAccount(tokenData.token);
      
      const updatedUser = {
        ...this.user,
        providers: [...(this.user.providers || []), 'facebook']
      };
      
      this.setUser(updatedUser);
      await secureStorage.setItem(USER_KEY, updatedUser);
      
      Alert.alert('Success', 'Your Facebook account has been linked successfully');
    } catch (error: any) {
      console.error('Facebook account linking error:', error);
      
      if (error.message?.includes('cancelled')) {
        console.log('Facebook account linking cancelled by user');
        // Don't show error for cancellation
        return;
      }
      
      if (error.message?.includes('already linked')) {
        Alert.alert('Account Already Linked', 'This Facebook account is already linked to your profile');
      } else if (error.message?.includes('already associated')) {
        Alert.alert('Account Conflict', 'This Facebook account is already associated with another user');
      } else if (error.message?.includes('Email is required')) {
        this.setError('Email access is required to link your Facebook account. Please try again and allow email permission.');
      } else {
        this.setError(error.message || 'Failed to link Facebook account. Please try again.');
      }
    } finally {
      this.setLoading(false);
    }
  }

  async logout() {
    try {
      this.setAuthenticated(false);
      this.setUser(null);
      await secureStorage.removeItem(TOKEN_KEY);
      await secureStorage.removeItem(USER_KEY);
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      this.setLoginAttempts(0);
      this.setLockoutUntil(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  async changePassword(oldPassword: string, newPassword: string, confirmPassword: string) {
    try {
      this.setLoading(true);
      this.setError(null);
      
      const tokenData = await secureStorage.getItem('@kappi_auth_token');
      if (!tokenData || !tokenData.token) {
        this.setError('Authentication token not found');
        return { success: false, message: 'Authentication token not found' };
      }

      // Get current user capabilities from backend
      let isSettingFirstPassword = false;
      try {
        const capabilities = await authService.getUserAuthCapabilities() as UserCapabilities;
        isSettingFirstPassword = capabilities.canSetPassword;
      } catch (error) {
        // Fallback to local check if API fails
        isSettingFirstPassword = this.canSetPassword();
      }
      
      // Validate fields based on scenario (frontend validation)
      if (isSettingFirstPassword) {
        if (!newPassword?.trim() || !confirmPassword?.trim()) {
          this.setError('New password and confirmation are required');
          return { success: false, message: 'New password and confirmation are required' };
        }
      } else {
        if (!oldPassword?.trim() || !newPassword?.trim() || !confirmPassword?.trim()) {
          this.setError('Current password, new password, and confirmation are all required');
          return { success: false, message: 'Current password, new password, and confirmation are all required' };
        }
      }
      
      if (newPassword !== confirmPassword) {
        this.setError('New passwords do not match');
        return { success: false, message: 'New passwords do not match' };
      }
      
      if (!this.validatePassword(newPassword)) {
        this.setError('Password does not meet requirements');
        return { success: false, message: 'Password does not meet requirements' };
      }
      
      // Call backend API
      const response = await authService.changePassword(oldPassword, newPassword, confirmPassword, tokenData.token) as { 
        isFirstPassword?: boolean; 
        message: string;
        token?: string;
        user?: any;
      };
      
      // Update user data if provided by backend
      if (response.user) {
        this.setUser(response.user);
        await secureStorage.setItem(USER_KEY, response.user);
      } else if (response.isFirstPassword && this.user) {
        // Fallback: manually update providers if backend didn't return user
        const updatedUser = {
          ...this.user,
          providers: [...(this.user.providers || []), 'email']
        };
        this.setUser(updatedUser);
        await secureStorage.setItem(USER_KEY, updatedUser);
      }
      
      // Handle token update for password changes
      if (response.token) {
        // Update token in secure storage
        const expiresAt = Date.now() + TOKEN_EXPIRY;
        await secureStorage.setItem(TOKEN_KEY, {
          token: response.token,
          expiresAt
        });
        
        // For first-time password setting, don't logout
        if (response.isFirstPassword) {
          return { success: true, message: response.message };
        } else {
          // For regular password changes, logout and require re-login
          await this.logout();
          return { success: true, message: 'Password changed successfully. Please log in again.' };
        }
      } else if (!response.isFirstPassword) {
        // Handle logout for password changes (not first-time password setting) when no new token
        await this.logout();
        return { success: true, message: 'Password changed successfully. Please log in again.' };
      }
      
      return { success: true, message: response.message };
      
    } catch (error: any) {
      let message = 'Failed to change password';
      if (error.response && error.response.data && error.response.data.message) {
        message = error.response.data.message;
      }
      this.setError(message);
      return { success: false, message };
    } finally {
      this.setLoading(false);
    }
  }

  async updateProfile(fullName: string) {
    try {
      this.setLoading(true);
      this.setError(null);
      
      const tokenData = await secureStorage.getItem('@kappi_auth_token');
      if (!tokenData || !tokenData.token) {
        this.setError('Authentication token not found');
        return { success: false, message: 'Authentication token not found' };
      }

      // Validate input
      if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
        this.setError('Full name is required');
        return { success: false, message: 'Full name is required' };
      }

      const trimmedName = fullName.trim();
      
      // Check if name has actually changed
      if (this.user && this.user.fullName === trimmedName) {
        this.setError('Name is already set to this value');
        return { success: false, message: 'Name is already set to this value' };
      }

      // Call backend API
      const response = await authService.updateProfile(trimmedName, tokenData.token) as { 
        message: string;
        user?: any;
      };
      
      // Update user data if provided by backend
      if (response.user) {
        this.setUser(response.user);
        await secureStorage.setItem(USER_KEY, response.user);
      }
      
      return { success: true, message: response.message, user: response.user };
      
    } catch (error: any) {
      let message = 'Failed to update profile';
      if (error.response && error.response.data && error.response.data.message) {
        message = error.response.data.message;
      }
      this.setError(message);
      return { success: false, message };
    } finally {
      this.setLoading(false);
    }
  }

  // Helper method to refresh user capabilities from backend
  async refreshUserCapabilities(): Promise<UserCapabilities | null> {
    try {
      const capabilities = await authService.getUserAuthCapabilities() as UserCapabilities;
      if (capabilities.user) {
        this.setUser(capabilities.user);
        await secureStorage.setItem(USER_KEY, capabilities.user);
      }
      return capabilities;
    } catch (error) {
      console.error('Failed to refresh user capabilities:', error);
      return null;
    }
  }

  // Helper method to determine if user can set a password (social-only users)
  canSetPassword(): boolean {
    if (!this.user?.providers || this.user.providers.length === 0) {
      return false;
    }
    
    // Handle both string providers and object providers
    const providerNames = this.user.providers.map(p => 
      typeof p === 'string' ? p : p.provider
    );
    
    // User can set password if they only have social providers (no email)
    return !providerNames.includes('email');
  }

  // Helper method to determine if user has password capability (email/password users)
  hasPasswordAuth(): boolean {
    if (!this.user?.providers || this.user.providers.length === 0) {
      return false;
    }
    
    // Handle both string providers and object providers
    const providerNames = this.user.providers.map(p => 
      typeof p === 'string' ? p : p.provider
    );
    
    return providerNames.includes('email');
  }

  resetValidation() {
    this.setValidationErrors({});
    this.touchedFields = {};
    this.setError(null);
  }
}

export const authViewModel = new AuthViewModel(); 