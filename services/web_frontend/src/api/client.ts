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
  const request = config as RetryableRequestConfig;
  const sessionVersion = useAppStore.getState().sessionVersion;
  if (request._sessionVersion !== undefined && request._sessionVersion !== sessionVersion) {
    throw new axios.CanceledError('Session changed');
  }
  request._sessionVersion = sessionVersion;
  const csrfToken = getCookie('csrf_token');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _sessionVersion?: number;
  _retry?: boolean;
  _csrfRetry?: boolean;
}

let refreshRequest: { sessionVersion: number; promise: Promise<unknown> } | null = null;
let sessionExpired = false;

// Response interceptor: handle 401 and 503
apiClient.interceptors.response.use(
  (response) => {
    const store = useAppStore.getState();
    if ((response.config as RetryableRequestConfig)._sessionVersion !== store.sessionVersion) {
      throw new axios.CanceledError('Session changed');
    }
    if (/\/auth\/(login|sso|me)$/.test(response.config.url || '')) {
      sessionExpired = false;
    }
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
    if (axios.isCancel(error)) return Promise.reject(error);
    if (originalRequest?._sessionVersion !== undefined && originalRequest._sessionVersion !== store.sessionVersion) {
      return Promise.reject(new axios.CanceledError('Session changed'));
    }

    // Handle Network Error or Vite proxy errors (502, 504)
    if (!error.response || error.response.status === 502 || error.response.status === 504) {
      if (!store.isApiDown) {
        store.setApiDown(true);
      }
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    const url = originalRequest?.url || '';
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !/\/auth\/(sso|login|refresh|logout|ws-token)$/.test(url)) {
      if (sessionExpired) return Promise.reject(error);
      // Every waiting request may be retried only once, even if it still gets 401.
      originalRequest._retry = true;
      const sessionVersion = store.sessionVersion;
      if (!refreshRequest || refreshRequest.sessionVersion !== sessionVersion) {
        // Bypass this interceptor and share one refresh across concurrent requests.
        const promise = axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {}, {
          withCredentials: true,
          timeout: apiClient.defaults.timeout,
        })
          .catch((err) => {
            if (useAppStore.getState().sessionVersion === sessionVersion && axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) {
              sessionExpired = true;
              useAppStore.getState().resetSession();
            }
            throw err;
          })
          .finally(() => {
            if (refreshRequest?.sessionVersion === sessionVersion) refreshRequest = null;
          });
        refreshRequest = { sessionVersion, promise };
      }
      await refreshRequest.promise;
      return apiClient(originalRequest);
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
