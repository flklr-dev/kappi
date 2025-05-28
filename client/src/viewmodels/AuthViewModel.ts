import { makeAutoObservable, action } from 'mobx';
import { authService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  fullName: string;
  email: string;
}

interface AuthResponse {
  token: string;
  user: User;
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

  constructor() {
    makeAutoObservable(this, {
      setLoading: action,
      setError: action,
      setAuthenticated: action,
      setUser: action,
      setValidationErrors: action,
      setTouchedField: action,
      resetValidation: action,
    });
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
    if (!this.validateLogin(email, password)) {
      return;
    }

    try {
      this.setLoading(true);
      this.setError(null);
      const response = await authService.login(email, password) as AuthResponse;
      this.setAuthenticated(true);
      this.setUser(response.user);
      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));
    } catch (error: any) {
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
            this.setError('Account already exists');
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

  async logout() {
    try {
      this.setAuthenticated(false);
      this.setUser(null);
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
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