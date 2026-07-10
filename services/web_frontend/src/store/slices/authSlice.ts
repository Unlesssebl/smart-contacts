import type { StateCreator } from 'zustand';
import { login, getMe } from '@/api/auth';
import type { AppState, AuthSlice } from '../types';

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
  currentUser: null,
  isAuthenticated: false,

  login: async (samAccount, password) => {
    try {
      await login(samAccount, password);
      set({ isAuthenticated: true });
      await get().fetchMe();
      return { success: true };
    } catch (error: any) {
      console.error('Login failed:', error);
      let errorMessage = 'Ошибка авторизации. Сервер недоступен.';
      if (error.response?.status === 401) {
        errorMessage = 'Неверный логин или пароль';
      } else if (error.response?.status === 429) {
        errorMessage = 'Вход временно ограничен. Превышено количество попыток.';
      }
      return { success: false, error: errorMessage };
    }
  },

  logout: async () => {
    set({ currentUser: null, isAuthenticated: false, users: [], changeRequests: [], reports: [] });
    try {
      await import('@/api/client').then(m => m.default.post('/auth/logout'));
    } catch (e) {
      console.error('Logout API failed', e);
    }
  },

  fetchMe: async () => {
    try {
      const profile = await getMe();
      set({ currentUser: profile });
      await get().fetchMyPendingFields();
    } catch (error) {
      console.error('Failed to fetch profile', error);
      if (!get().adSyncUnavailable) {
        get().logout();
      }
    }
  },
});
