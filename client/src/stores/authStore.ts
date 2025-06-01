import { create } from 'zustand';
import { authService } from '../services/api';
import { secureStorage } from '../utils/secureStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocationData {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address: {
    barangay: string;
    cityMunicipality: string;
    province: string;
  };
}

interface User {
  id: string;
  fullName: string;
  email: string;
  location?: LocationData;
  providers?: string[];
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

interface TokenData {
  token: string;
  expiresAt: number;
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
  loginAttempts: number;
  lockoutUntil: number | null;
  updateUserLocation: (location: LocationData) => Promise<void>;
}

// Storage keys
const TOKEN_KEY = '@kappi_auth_token';
const USER_KEY = '@kappi_auth_user';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  validationErrors: {},
  touchedFields: {},
  loginAttempts: 0,
  lockoutUntil: null,

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setUser: (user) => set({ user }),
  setValidationErrors: (validationErrors) => set({ validationErrors }),
  setTouchedField: (field, value) => set((state) => ({
    touchedFields: { ...state.touchedFields, [field]: value }
  })),
  resetValidation: () => set((state) => ({ 
    validationErrors: {}, 
    touchedFields: {}, 
    error: null,
    loginAttempts: state.loginAttempts,
    lockoutUntil: state.lockoutUntil
  })),

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
    const state = get();
    const { setTouchedField, setValidationErrors, validateEmail, validatePassword } = state;
    
    // Start with a fresh validation state for this field
    const currentErrors: ValidationErrors = {};
    setTouchedField(field, true);

    switch (field) {
      case 'fullName':
        if (!value.trim()) {
          currentErrors.fullName = 'Full name is required';
        }
        break;

      case 'email':
        if (!value.trim()) {
          currentErrors.email = 'Email is required';
        } else if (!validateEmail(value)) {
          currentErrors.email = 'Invalid email format';
        }
        break;

      case 'password':
        if (!value) {
          currentErrors.password = 'Password is required';
        } else if (value !== 'valid' && !validatePassword(value)) {
          currentErrors.password = 'Password does not meet requirements';
        }
        break;

      case 'confirmPassword':
        if (!value) {
          currentErrors.confirmPassword = 'Please confirm your password';
        } else if (value !== confirmPassword) {
          currentErrors.confirmPassword = 'Passwords do not match';
        }
        break;
    }

    // Only set errors for the current field being validated
    setValidationErrors(currentErrors);
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

  checkAuth: async () => {
    const { setAuthenticated, setUser } = get();
    try {
      const tokenData = await secureStorage.getItem(TOKEN_KEY) as TokenData | null;
      const user = await secureStorage.getItem(USER_KEY);
      
      if (tokenData && user) {
        const { expiresAt } = tokenData;
        
        // Check if token is not expired
        if (Date.now() < expiresAt) {
          setAuthenticated(true);
          setUser(user);
        } else {
          // Token is expired, clean up
          await secureStorage.removeItem(TOKEN_KEY);
          await secureStorage.removeItem(USER_KEY);
          setAuthenticated(false);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      // Clean up on error
      await secureStorage.removeItem(TOKEN_KEY);
      await secureStorage.removeItem(USER_KEY);
      setAuthenticated(false);
      setUser(null);
    }
  },

  login: async (email: string, password: string) => {
    const state = get();
    
    // Check for lockout
    if (state.lockoutUntil && Date.now() < state.lockoutUntil) {
      const remainingMinutes = Math.ceil((state.lockoutUntil - Date.now()) / 60000);
      set({ 
        error: `Too many login attempts. Please try again in ${remainingMinutes} minutes.`,
        loading: false 
      });
      return;
    }

    try {
      set({ loading: true, error: null });
      const response = await authService.login(email, password) as AuthResponse;
      
      if (response.error) {
        // Increment login attempts on failure
        const newAttempts = state.loginAttempts + 1;
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          set({
            loginAttempts: 0,
            lockoutUntil: Date.now() + LOCKOUT_DURATION,
            error: 'Too many failed attempts. Account locked for 15 minutes.',
            loading: false
          });
          return;
        }
        
        set({ 
          error: response.error, 
          loading: false,
          loginAttempts: newAttempts
        });
        return;
      }
      
      // Reset login attempts on success
      set({ loginAttempts: 0, lockoutUntil: null });
      
      // Calculate expiration (7 days from now)
      const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000);
      
      // Store token and user data securely
      await secureStorage.setItem(TOKEN_KEY, {
        token: response.token,
        expiresAt
      });
      await secureStorage.setItem(USER_KEY, response.user);
      
      set({ 
        isAuthenticated: true,
        user: response.user,
        loading: false,
        error: null 
      });
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
      await secureStorage.removeItem(TOKEN_KEY);
      await secureStorage.removeItem(USER_KEY);
      // Reset security-related state
      set({ loginAttempts: 0, lockoutUntil: null });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  },

  updateUserLocation: async (location: LocationData) => {
    try {
      const { user, setUser } = get();
      if (!user) return;

      // Update user object with new location
      const updatedUser = {
        ...user,
        location
      };

      // Save to secure storage
      await secureStorage.setItem(USER_KEY, updatedUser);
      
      // Update state
      setUser(updatedUser);

      // TODO: You might want to add an API call here to update the location on your backend
      // await authService.updateLocation(location);
      
    } catch (error) {
      console.error('Error updating location:', error);
    }
  },
})); 