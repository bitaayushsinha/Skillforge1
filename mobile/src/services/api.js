import axios from 'axios';
import { API_BASE_URL } from '../config/env';
import authStorage from './authStorage';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Callback registry for handling 401 Unauthorized globally
let unauthorizedCallback = null;
export const setUnauthorizedCallback = (callback) => {
  unauthorizedCallback = callback;
};

// Request Interceptor: Attach JWT token if available
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await authStorage.getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error attaching token in API interceptor:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle errors globally (including 401 Unauthorized)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    
    if (status === 401) {
      console.warn('API returned 401 Unauthorized - clearing token and session.');
      await authStorage.clearAll();
      if (unauthorizedCallback) {
        unauthorizedCallback();
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
