import { create } from 'zustand';
import { authService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  fullName: string;
  email: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
  error?: string;
}

interface ValidationErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  validationErrors: ValidationErrors;
  touchedFields: { [key: string]: boolean };
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setUser: (user: User | null) => void;
  setValidationErrors: (errors: ValidationErrors) => void;
  setTouchedField: (field: string, value: boolean) => void;
  resetValidation: () => void;
  validateEmail: (email: string) => boolean;
  validatePassword: (password: string) => boolean;
  validateField: (field: string, value: string, confirmPassword?: string) => void;
  validateRegistration: (fullName: string, email: string, password: string, confirmPassword: string) => boolean;
  validateLogin: (email: string, password: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  validationErrors: {},
  touchedFields: {},

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setUser: (user) => set({ user }),
  setValidationErrors: (validationErrors) => set({ validationErrors }),
  setTouchedField: (field, value) => set((state) => ({
    touchedFields: { ...state.touchedFields, [field]: value }
  })),
  resetValidation: () => set({ validationErrors: {}, touchedFields: {}, error: null }),

  validateEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  validatePassword: (password: string): boolean => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const hasMinLength = password.length >= 8;

    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && hasMinLength;
  },

  validateField: (field: string, value: string, confirmPassword?: string) => {
    const { setTouchedField, setValidationErrors, validateEmail, validatePassword } = get();
    setTouchedField(field, true);

    switch (field) {
      case 'fullName':
        if (!value.trim()) {
          setValidationErrors({ fullName: 'Full name is required' });
        } else {
          const { fullName, ...rest } = get().validationErrors;
          setValidationErrors(rest);
        }
        break;

      case 'email':
        if (!value.trim()) {
          setValidationErrors({ email: 'Email is required' });
        } else if (!validateEmail(value)) {
          setValidationErrors({ email: 'Invalid email format' });
        } else {
          const { email, ...rest } = get().validationErrors;
          setValidationErrors(rest);
        }
        break;

      case 'password':
        if (!value) {
          setValidationErrors({ password: 'Password is required' });
        } else if (value === 'valid') {
          // Special case for login validation
          const { password, ...rest } = get().validationErrors;
          setValidationErrors(rest);
        } else if (!validatePassword(value)) {
          setValidationErrors({ password: 'Password does not meet requirements' });
        } else {
          const { password, ...rest } = get().validationErrors;
          setValidationErrors(rest);
        }
        break;

      case 'confirmPassword':
        if (!value) {
          setValidationErrors({ confirmPassword: 'Please confirm your password' });
        } else if (value !== confirmPassword) {
          setValidationErrors({ confirmPassword: 'Passwords do not match' });
        } else {
          const { confirmPassword, ...rest } = get().validationErrors;
          setValidationErrors(rest);
        }
        break;
    }
  },

  validateRegistration: (fullName: string, email: string, password: string, confirmPassword: string): boolean => {
    const { validateEmail, validatePassword, setValidationErrors } = get();
    const errors: ValidationErrors = {};

    if (!fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Invalid email format';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (!validatePassword(password)) {
      errors.password = 'Password does not meet requirements';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  },

  validateLogin: (email: string, password: string): boolean => {
    const { validateEmail, setValidationErrors } = get();
    const errors: ValidationErrors = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Invalid email format';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  },

  login: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const response = await authService.login(email, password) as AuthResponse;
      
      if (response.error) {
        set({ error: response.error, loading: false });
        return;
      }
      
      set({ 
        isAuthenticated: true,
        user: response.user,
        loading: false,
        error: null 
      });
      
      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred';
      
      if (error.response) {
        switch (error.response.status) {
          case 401:
            errorMessage = 'Invalid email or password';
            break;
          case 404:
            errorMessage = 'Account does not exist';
            break;
          default:
            errorMessage = error.response.data?.message || 'An error occurred';
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection';
      }
      
      set({ error: errorMessage, loading: false });
    }
  },

  register: async (fullName: string, email: string, password: string) => {
    const { setLoading, setError, setAuthenticated, setUser, validateRegistration } = get();

    if (!validateRegistration(fullName, email, password, password)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await authService.register(fullName, email, password) as AuthResponse;
      setAuthenticated(true);
      setUser(response.user);
      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));
    } catch (error: any) {
      if (error.response) {
        switch (error.response.status) {
          case 400:
            setError('Account already exists');
            break;
          case 500:
            setError('Server error. Please try again later');
            break;
          default:
            setError(error.response.data?.message || 'An error occurred');
        }
      } else if (error.request) {
        setError('Network error. Please check your connection');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  },

  logout: async () => {
    const { setAuthenticated, setUser } = get();
    try {
      setAuthenticated(false);
      setUser(null);
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  },

  checkAuth: async () => {
    const { setAuthenticated, setUser } = get();
    try {
      const token = await AsyncStorage.getItem('token');
      const user = await AsyncStorage.getItem('user');
      if (token && user) {
        setAuthenticated(true);
        setUser(JSON.parse(user));
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    }
  },
})); 