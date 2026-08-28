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
export function getCookie(name: string) {
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

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
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

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  const cleanUrl = url.split('?')[0];
  return (
    cleanUrl.endsWith('/auth/sso') ||
    cleanUrl.endsWith('/auth/login') ||
    cleanUrl.endsWith('/auth/refresh') ||
    cleanUrl.endsWith('/auth/logout') ||
    cleanUrl.endsWith('/auth/ws-token')
  );
}

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
    const originalRequest = error?.config as RetryableRequestConfig | undefined;
    const store = useAppStore.getState();

    // Handle Network Error or Vite proxy errors (502, 504)
    if (!error.response || error.response.status === 502 || error.response.status === 504) {
      if (!store.isApiDown) {
        store.setApiDown(true);
      }
      return Promise.reject(error);
    }

    const url = originalRequest?.url || '';

    // Handle 401 Unauthorized
    // Only attempt refresh if:
    // 1. Request config exists
    // 2. HTTP status is 401
    // 3. User is currently marked as authenticated in store
    // 4. Request was not already retried
    // 5. Target URL is not an auth endpoint (sso, login, refresh, logout, ws-token)
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      store.isAuthenticated &&
      !isAuthEndpoint(url)
    ) {
      if (isRefreshing) {
        return new Promise<void>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        const csrfToken = getCookie('csrf_token');
        const headers: Record<string, string> = {};
        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
        }

        // Use clean axios instance to avoid interceptor loops
        axios
          .post(`${apiClient.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true, headers })
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

    // Handle 503 Service Unavailable (AD Sync issues)
    if (error.response?.status === 503) {
      store.setAdSyncStatus(true);
      toast.warning('Синхронизация недоступна', {
        description: 'Синхронизация с Active Directory временно недоступна. Изменения будут сохранены позже.',
        duration: 5000,
      });
    }

    // Handle other server errors
    if (error.response?.status === 500) {
      toast.error('Ошибка сервера. Попробуйте позже.');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
