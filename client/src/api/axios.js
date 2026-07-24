import axios from 'axios';

// Vite env access for the API base URL
const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Crucial for receiving/sending HttpOnly Refresh cookie
  headers: {
    'Content-Type': 'application/json',
  }
});

// Memory cache for the Access Token
let accessToken = '';

export const setCachedToken = (token) => {
  accessToken = token;
};

export const getCachedToken = () => {
  return accessToken;
};

// Request Interceptor: Automatically inject Authorization Header
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Session recovery and token queuing parameters
let isRefreshing = false;
let failedQueue = [];
let onSessionExpiredCallback = null;

export const registerSessionExpiredCallback = (callback) => {
  onSessionExpiredCallback = callback;
};

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Catch 401 errors and handle silent token refresh transparently
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent recursive refresh loops or refreshing during login/registration
    if (
      error.response?.status === 401 && 
      !originalRequest._retry &&
      !originalRequest.url.includes('/api/auth/login') &&
      !originalRequest.url.includes('/api/auth/register')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt token refresh
        const res = await axios.post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true });
        const newToken = res.data.data.accessToken;

        setCachedToken(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        processQueue(null, newToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;

        if (onSessionExpiredCallback) {
          onSessionExpiredCallback();
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
