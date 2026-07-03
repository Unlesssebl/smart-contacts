import axios from 'axios';
import { useAppStore } from '../store/useAppStore';
import { toast } from 'sonner';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
  withCredentials: true,
});

// Helper to read cookie by name
function getCookie(name: string) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return match[2];
  return null;
}

// Request interceptor: add CSRF token
apiClient.interceptors.request.use((config) => {
  const csrfToken = getCookie('csrf_token');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// Response interceptor: handle 401 and 503
apiClient.interceptors.response.use(
  (response) => {
    // If we get a successful response, ensure adSyncUnavailable is false
    if (useAppStore.getState().adSyncUnavailable) {
      useAppStore.getState().setAdSyncStatus(false);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    const url = originalRequest.url || '';
    if (error.response?.status === 401 && !originalRequest._retry && !url.endsWith('/auth/sso') && !url.endsWith('/auth/login')) {
      originalRequest._retry = true;
      useAppStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Handle 503 Service Unavailable (AD Sync issues)
    if (error.response?.status === 503) {
      useAppStore.getState().setAdSyncStatus(true);
      toast.warning('Синхронизация недоступна', {
        description: 'Синхронизация с Active Directory временно недоступна. Изменения будут сохранены позже.',
        duration: 5000,
      });
    }

    // Handle other errors
    if (error.response?.status === 500) {
      toast.error('Ошибка сервера. Попробуйте позже.');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
