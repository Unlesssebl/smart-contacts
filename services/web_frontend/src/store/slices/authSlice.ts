import type { StateCreator } from 'zustand';
import axios from 'axios';
import { login, getMe } from '@/api/auth';
import { acknowledgeGatekeeper } from '@/api/profile';
import apiClient from '@/api/client';
import type { AppState, AuthSlice } from '../types';
import { getErrorStatus } from '@/api/errors';

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
  currentUser: null,
  isAuthenticated: false,

  login: async (samAccount, password) => {
    try {
      await login(samAccount, password);
      set({ isAuthenticated: true });
      await get().fetchMe();
      return { success: true };
    } catch (error: unknown) {
      console.error('Login failed:', error);
      let errorMessage = 'Ошибка авторизации. Сервер недоступен.';
      if (getErrorStatus(error) === 401) {
        errorMessage = 'Неверный логин или пароль';
      } else if (getErrorStatus(error) === 429) {
        if (axios.isAxiosError(error) && error.response?.data?.detail) {
          errorMessage = typeof error.response.data.detail === 'string'
            ? error.response.data.detail
            : 'Вход временно ограничен. Превышено количество попыток.';
        } else {
          errorMessage = 'Вход временно ограничен. Превышено количество попыток.';
        }
      }
      return { success: false, error: errorMessage };
    }
  },

  logout: async () => {
    // Reset only local state — do NOT delete notifications from the server
    // so the user's history is preserved across sessions.
    get().resetNotificationsState();
    set({ currentUser: null, isAuthenticated: false, users: [], changeRequests: [], reports: [] });
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.error('Logout API failed', e);
    }
  },

  fetchMe: async () => {
    try {
      const profile = await getMe();
      set({ currentUser: profile, isAuthenticated: true });
      // Restore cached notifications immediately for instant UI, then sync with server
      get().loadNotificationsFromStorage(profile.id);
      await get().fetchMyPendingFields();
      // Fetch fresh notifications from server — ensures missed events (WS down, offline) are picked up
      void get().fetchNotifications();
    } catch (error) {
      console.error('Failed to fetch profile', error);
      if (!get().adSyncUnavailable) {
        get().logout();
      }
    }
  },

  acknowledgeGatekeeper: async (action: 'confirm' | 'skip') => {
    try {
      const data = await acknowledgeGatekeeper(action);
      const currentUser = get().currentUser;
      if (currentUser) {
        set({
          currentUser: {
            ...currentUser,
            is_verified: data.is_verified,
            grace_period_left: data.grace_period_left,
          },
        });
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to acknowledge gatekeeper', error);
      return { success: false, error: 'Не удалось обновить статус проверки' };
    }
  },
});

