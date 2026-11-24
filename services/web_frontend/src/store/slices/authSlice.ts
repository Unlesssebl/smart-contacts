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
  sessionVersion: 0,

  login: async (samAccount, password) => {
    get().resetSession();
    const sessionVersion = get().sessionVersion;
    let credentialsAccepted = false;
    try {
      await login(samAccount, password);
      if (get().sessionVersion !== sessionVersion) throw new axios.CanceledError('Session changed');
      credentialsAccepted = true;
      await get().fetchMe();
      if (get().sessionVersion !== sessionVersion) throw new axios.CanceledError('Session changed');
      return { success: true };
    } catch (error: unknown) {
      if (axios.isCancel(error)) return { success: false, error: 'Вход отменён: сессия изменилась.' };
      console.error('Login failed:', error);
      let errorMessage = credentialsAccepted
        ? 'Не удалось загрузить профиль. Попробуйте войти ещё раз.'
        : 'Ошибка авторизации. Сервер недоступен.';
      if (!credentialsAccepted && getErrorStatus(error) === 401) {
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

  resetSession: () => {
    get().resetNotifications();
    set((state) => ({
      sessionVersion: state.sessionVersion + 1,
      currentUser: null, isAuthenticated: false,
      users: [], searchQuery: '', isSearching: false, initialLoaded: false,
      filters: {}, page: 1, totalUsers: 0,
      departments: [], organizations: [], jobTitles: [], globalPresence: {},
      changeRequests: [], pendingFields: null, rejectedFields: {}, reports: [],
      supportTickets: [], totalSupportTickets: 0, supportTicketPage: 1,
      supportTicketTotalPages: 0, isLoadingSupportTickets: false,
      securityIncidents: [], isLoadingSecurity: false,
      ldapSettings: null, ouMapping: {}, deptMapping: {}, jobTitleMapping: {},
      canonicalSuggestions: null, isLoadingSuggestions: false, adSyncUnavailable: false,
    }));
  },

  logout: async () => {
    const hadSession = get().isAuthenticated || !!get().currentUser;
    get().resetSession();
    if (!hadSession) return;
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.error('Logout API failed', e);
    }
  },

  fetchMe: async () => {
    const sessionVersion = get().sessionVersion;
    try {
      const profile = await getMe();
      if (get().sessionVersion !== sessionVersion) throw new axios.CanceledError('Session changed');
      set({ currentUser: profile, isAuthenticated: true });
      get().loadNotificationsFromStorage(profile.id);
      await get().fetchMyPendingFields();
      if (get().sessionVersion !== sessionVersion) throw new axios.CanceledError('Session changed');
    } catch (error) {
      if (!axios.isCancel(error)) console.error('Failed to fetch profile', error);
      if (get().sessionVersion === sessionVersion && [401, 403].includes(getErrorStatus(error) ?? 0)) {
        get().resetSession();
      }
      throw error;
    }
  },

  acknowledgeGatekeeper: async (action: 'confirm' | 'skip') => {
    const sessionVersion = get().sessionVersion;
    try {
      const data = await acknowledgeGatekeeper(action);
      if (get().sessionVersion !== sessionVersion) throw new axios.CanceledError('Session changed');
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

