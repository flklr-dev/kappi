import axios from 'axios';
import { secureStorage } from '../utils/secureStorage';

const API_URL = 'http://192.168.1.118:5000/api';
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

// Add security headers and token to requests
api.interceptors.request.use(
  async (config) => {
    try {
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

    // If the error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // TODO: Implement token refresh logic here
        // const refreshToken = await secureStorage.getItem('refreshToken');
        // const response = await axios.post('/auth/refresh', { refreshToken });
        // await secureStorage.setItem(TOKEN_KEY, response.data);
        // originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
        // return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login
        await secureStorage.removeItem(TOKEN_KEY);
        return Promise.reject(refreshError);
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
};

export default api; 