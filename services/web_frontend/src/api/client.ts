import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
  withCredentials: true,
});

// Helper to read cookie by name
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

// Request interceptor: add CSRF token
apiClient.interceptors.request.use((config) => {
  const csrfToken = getCookie('csrf_token');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _csrfRetry?: boolean;
}

interface RefreshQueueItem {
  resolve: () => void;
  reject: (reason?: unknown) => void;
}

let isRefreshing = false;
let failedQueue: RefreshQueueItem[] = [];

const processQueue = (error?: unknown) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor: handle 401 and 503
apiClient.interceptors.response.use(
  (response) => {
    const store = useAppStore.getState();
    // If we get a successful response, ensure adSyncUnavailable is false
    if (store.adSyncUnavailable) {
      store.setAdSyncStatus(false);
    }
    // Also clear api down state if it was true
    if (store.isApiDown) {
      store.setApiDown(false);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const store = useAppStore.getState();

    // Handle Network Error or Vite proxy errors (502, 504)
    if (!error.response || error.response.status === 502 || error.response.status === 504) {
      if (!store.isApiDown) {
        store.setApiDown(true);
      }
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    const url = originalRequest?.url || '';
    if (error.response?.status === 401 && !originalRequest._retry && !url.endsWith('/auth/sso') && !url.endsWith('/auth/login') && !url.endsWith('/auth/refresh') && !url.endsWith('/auth/ws-token')) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve: () => resolve(undefined), reject });
        }).then(() => {
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise(function (resolve, reject) {
        // Use a new axios instance to avoid interceptor loops
        axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
          .then(() => {
            processQueue();
            resolve(apiClient(originalRequest));
          })
          .catch((err) => {
            processQueue(err);
            store.logout();
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    // Handle 403 CSRF token error retry
    if (
      error.response?.status === 403 &&
      originalRequest &&
      !originalRequest._csrfRetry &&
      error.response?.data?.detail === 'Ошибка проверки CSRF-токена'
    ) {
      originalRequest._csrfRetry = true;
      try {
        await axios.get(`${apiClient.defaults.baseURL}/auth/me`, { withCredentials: true });
        const newCsrf = getCookie('csrf_token');
        if (newCsrf && originalRequest.headers) {
          originalRequest.headers['X-CSRF-Token'] = newCsrf;
        }
        return apiClient(originalRequest);
      } catch (csrfErr) {
        return Promise.reject(csrfErr);
      }
    }

    // Handle 503 Service Unavailable (AD Sync issues)
    if (error.response?.status === 503) {
      store.setAdSyncStatus(true);
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
