import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, UserProfile, ChangeRequest, Report } from '../types';
import { usersApi } from '../api/users';
import { changeRequestsApi } from '../api/changeRequests';
import { adminApi } from '../api/admin';
import { reportsApi } from '../api/reports';
import { login, getMe } from '../api/auth';
import { toast } from 'sonner';

interface AppState {
  // Auth
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (samAccount: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchMe: () => Promise<void>;

  // Users
  users: User[];
  searchQuery: string;
  isSearching: boolean;
  setSearchQuery: (query: string) => void;
  fetchUsers: (query?: string) => Promise<void>;
  getUserById: (id: string) => User | undefined;

  // Change Requests
  changeRequests: ChangeRequest[];
  addChangeRequest: (request: { attribute_name: string; new_value: string }) => Promise<void>;
  approveChangeRequest: (id: string) => Promise<void>;
  rejectChangeRequest: (id: string) => Promise<void>;

  // Reports
  reports: Report[];
  addReport: (report: { target_user_id: string; reason: string }) => Promise<void>;

  // Admin Data
  fetchAdminData: () => Promise<void>;

  // Infrastructure
  adSyncUnavailable: boolean;
  setAdSyncStatus: (status: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      currentUser: null,
      isAuthenticated: false,
      accessToken: null,

      login: async (samAccount: string, password: string) => {
        try {
          const authData = await login(samAccount, password);
          set({ accessToken: authData.access_token, isAuthenticated: true });
          await get().fetchMe();
          return true;
        } catch (error: any) {
          console.error('Login failed:', error);
          if (error.response?.status === 401) {
            toast.error('Неверный логин или пароль');
          } else {
            toast.error('Ошибка авторизации. Сервер недоступен.');
          }
          return false;
        }
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false, accessToken: null, users: [], changeRequests: [], reports: [] });
      },

      fetchMe: async () => {
        try {
          const profile = await getMe();
          set({ currentUser: profile });
        } catch (error) {
          console.error('Failed to fetch profile', error);
          if (!get().adSyncUnavailable) {
            get().logout();
          }
        }
      },

      // Users
      users: [],
      searchQuery: '',
      isSearching: false,

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
        get().fetchUsers(query);
      },

      fetchUsers: async (query?: string) => {
        set({ isSearching: true });
        try {
          // Add debouncing at component level, but here we just fetch
          const response = await usersApi.getUsers(query || get().searchQuery);
          set({ users: response.items, isSearching: false });
        } catch (error) {
          console.error('Failed to fetch users', error);
          set({ isSearching: false });
        }
      },

      getUserById: (id: string) => {
        return get().users.find(u => u.id === id);
      },

      // Change Requests
      changeRequests: [],

      addChangeRequest: async (request) => {
        try {
          const newRequest = await changeRequestsApi.createChangeRequest(request);
          set(state => ({
            changeRequests: [newRequest, ...state.changeRequests]
          }));
          toast.success('Заявка на изменение контактов успешно создана');
        } catch (error) {
          console.error('Failed to create change request', error);
          toast.error('Ошибка при создании заявки');
        }
      },

      approveChangeRequest: async (id: string) => {
        try {
          const updatedRequest = await adminApi.approveChangeRequest(id);
          set(state => ({
            changeRequests: state.changeRequests.map(r =>
              r.id === id ? updatedRequest : r
            )
          }));
          toast.success('Заявка одобрена');
        } catch (error) {
          console.error('Failed to approve request', error);
          toast.error('Не удалось одобрить заявку');
        }
      },

      rejectChangeRequest: async (id: string) => {
        try {
          const updatedRequest = await adminApi.rejectChangeRequest(id);
          set(state => ({
            changeRequests: state.changeRequests.map(r =>
              r.id === id ? updatedRequest : r
            )
          }));
          toast.success('Заявка отклонена');
        } catch (error) {
          console.error('Failed to reject request', error);
          toast.error('Не удалось отклонить заявку');
        }
      },

      // Reports
      reports: [],

      addReport: async (report) => {
        try {
          const newReport = await reportsApi.createReport(report);
          set(state => ({
            reports: [newReport, ...state.reports]
          }));
          toast.success('Жалоба успешно отправлена');
        } catch (error) {
          console.error('Failed to create report', error);
          toast.error('Ошибка при отправке жалобы');
        }
      },

      // Admin
      fetchAdminData: async () => {
        try {
          const [requests, reportsData] = await Promise.all([
            adminApi.getChangeRequests(),
            adminApi.getReports()
          ]);
          set({ changeRequests: requests, reports: reportsData });
        } catch (error) {
          console.error('Failed to fetch admin data', error);
          toast.error('Не удалось загрузить данные панели администратора');
        }
      },

      // Infrastructure
      adSyncUnavailable: false,
      setAdSyncStatus: (status: boolean) => set({ adSyncUnavailable: status }),
    }),
    {
      name: 'smart-contacts-storage',
      partialize: (state) => ({ 
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser,
        adSyncUnavailable: state.adSyncUnavailable
      }),
    }
  )
);
