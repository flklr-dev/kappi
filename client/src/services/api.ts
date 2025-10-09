import axios from 'axios';
import { secureStorage } from '../utils/secureStorage';
import { useAuthStore } from '../stores/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api';
// Derive server origin (without /api) for building absolute asset URLs
export const API_ORIGIN = API_URL.replace(/\/?api\/?$/, '');
const TOKEN_KEY = '@kappi_auth_token';

// Create axios instance with security headers
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // Protect against CSRF
  },
  withCredentials: true, // Enable secure cookie handling
});

// Track if we're already logging out to prevent multiple logout attempts
let isLoggingOut = false;

// Add security headers and token to requests
api.interceptors.request.use(
  async (config: any) => {
    try {
      // If we're logging out, reject the request immediately
      if (isLoggingOut) {
        return Promise.reject(new Error('Logging out'));
      }
      
      const tokenData = await secureStorage.getItem(TOKEN_KEY);
      if (tokenData) {
        const { token, expiresAt } = tokenData;
        
        // Check if token is not expired
        if (Date.now() < expiresAt && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
          // Add security headers
          config.headers['X-Frame-Options'] = 'DENY';
          config.headers['X-Content-Type-Options'] = 'nosniff';
          config.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
        } else {
          // Token is expired, clean up
          await secureStorage.removeItem(TOKEN_KEY);
        }
      }
      return config;
    } catch (error) {
      console.error('Error getting token:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we're not already logging out
    if (error.response?.status === 401 && !isLoggingOut) {
      isLoggingOut = true;
      
      try {
        // Remove token and user data
        await secureStorage.removeItem(TOKEN_KEY);
        await secureStorage.removeItem('@kappi_auth_user');
        
        // Update auth store state
        useAuthStore.getState().setAuthenticated(false);
        useAuthStore.getState().setUser(null);
      } catch (logoutError) {
        console.error('Error during logout:', logoutError);
      } finally {
        isLoggingOut = false;
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { 
        email, 
        password,
        deviceInfo: {
          platform: 'mobile',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Network error');
      } else {
        throw new Error('An unexpected error occurred');
      }
    }
  },

  register: async (fullName: string, email: string, password: string) => {
    try {
      const response = await api.post('/auth/register', { 
        fullName, 
        email, 
        password,
        deviceInfo: {
          platform: 'mobile',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Network error');
      } else {
        throw new Error('An unexpected error occurred');
      }
    }
  },

  socialLogin: async (data: { email: string, fullName: string, provider: string, providerId: string, isRegistration?: boolean }) => {
    try {
      const response = await api.post('/auth/social-login', {
        ...data,
        deviceInfo: {
          platform: 'mobile',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Network error');
      } else {
        throw new Error('An unexpected error occurred');
      }
    }
  },

  linkSocialAccount: async (data: { provider: string, providerId: string, token: string }) => {
    try {
      const response = await api.post('/auth/link-social', data);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Network error');
      } else {
        throw new Error('An unexpected error occurred');
      }
    }
  },
  
  updateLocation: async (location: { 
    coordinates: { latitude: number; longitude: number; }, 
    address: { barangay: string; cityMunicipality: string; province: string; } 
  }) => {
    try {
      const response = await api.put('/auth/location', location);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Network error');
      } else {
        throw new Error('An unexpected error occurred');
      }
    }
  },

  updateProfile: async (fullName: string, token: string) => {
    try {
      const response = await api.put(
        '/auth/profile',
        { fullName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  async changePassword(oldPassword: string, newPassword: string, confirmPassword: string, token: string) {
    try {
      const response = await api.put(
        '/auth/change-password',
        { oldPassword, newPassword, confirmPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  async getUserAuthCapabilities() {
    try {
      const response = await api.get('/auth/capabilities');
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Network error');
      } else {
        throw new Error('An unexpected error occurred');
      }
    }
  },

  async forgotPassword(email: string) {
    try {
      const response = await api.post('/auth/forgot-password', { 
        email,
        deviceInfo: {
          platform: 'mobile',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Network error');
      } else {
        throw new Error('An unexpected error occurred');
      }
    }
  },

  async resetPassword(token: string, newPassword: string, confirmPassword: string) {
    try {
      const response = await api.post('/auth/reset-password', { 
        token,
        newPassword,
        confirmPassword,
        deviceInfo: {
          platform: 'mobile',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Network error');
      } else {
        throw new Error('An unexpected error occurred');
      }
    }
  },

  async verifyOTP(email: string, otp: string) {
    try {
      const response = await api.post('/auth/verify-otp', { 
        email,
        otp,
        deviceInfo: {
          platform: 'mobile',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Network error');
      } else {
        throw new Error('An unexpected error occurred');
      }
    }
  },

  async verifyOTPAndResetPassword(email: string, otp: string, newPassword: string, confirmPassword: string) {
    try {
      const response = await api.post('/auth/verify-otp-reset', { 
        email,
        otp,
        newPassword,
        confirmPassword,
        deviceInfo: {
          platform: 'mobile',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Network error');
      } else {
        throw new Error('An unexpected error occurred');
      }
    }
  },

  async resendOTP(email: string) {
    try {
      const response = await api.post('/auth/resend-otp', { 
        email,
        deviceInfo: {
          platform: 'mobile',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Network error');
      } else {
        throw new Error('An unexpected error occurred');
      }
    }
  },
};

export const getRemoteScans = async (filters?: { disease?: string, stage?: string }) => {
  try {
    const params = new URLSearchParams();
    if (filters?.disease) {
      params.append('disease', filters.disease);
    }
    if (filters?.stage) {
      params.append('stage', filters.stage);
    }

    const response = await api.get(`/scans?${params.toString()}`);
    return (response.data as any).scans || [];
  } catch (error: any) {
    if (error.response) {
      throw error;
    } else if (error.request) {
      throw new Error('Network error');
    } else {
      throw new Error('An unexpected error occurred');
    }
  }
};

export default api; 

// Helper to resolve image URIs that may be relative (e.g., "/uploads/...")
export const resolveImageUri = (uri?: string): string | undefined => {
  if (!uri) return undefined;
  if (/^https?:\/\//i.test(uri)) return uri;
  if (uri.startsWith('/')) return `${API_ORIGIN}${uri}`;
  return uri;
};