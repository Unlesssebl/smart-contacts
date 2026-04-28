import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { message, notification } from 'antd';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
});

// Request interceptor: add Bearer token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 and 503
apiClient.interceptors.response.use(
  (response) => {
    // If we get a successful response, ensure adSyncUnavailable is false
    if (useAuthStore.getState().adSyncUnavailable) {
      useAuthStore.getState().setAdSyncStatus(false);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      // In a real app, you might try to refresh the token here.
      // For now, we'll just logout if we get a 401 on a non-retry request.
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Handle 503 Service Unavailable (AD Sync issues)
    if (error.response?.status === 503) {
      useAuthStore.getState().setAdSyncStatus(true);
      notification.warning({
        message: 'Синхронизация недоступна',
        description: 'Синхронизация с Active Directory временно недоступна. Изменения будут сохранены позже.',
        duration: 0, // Keep it visible
        key: 'ad-sync-503',
      });
    }

    // Handle other errors
    if (error.response?.status === 500) {
      message.error('Ошибка сервера. Попробуйте позже.');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
