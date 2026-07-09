import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserProfile, ChangeRequest, Report } from '../types';
import { usersApi, type UserFilters } from '../api/users';
import { changeRequestsApi } from '../api/changeRequests';
import { adminApi } from '../api/admin';
import { reportsApi } from '../api/reports';
import { login, getMe } from '../api/auth';
import { toast } from 'sonner';

interface AppState {
  // Auth
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  login: (samAccount: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  fetchMe: () => Promise<void>;

  // Users
  users: User[];
  searchQuery: string;
  isSearching: boolean;
  filters: UserFilters;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<UserFilters>) => void;
  page: number;
  limit: number;
  totalUsers: number;
  setPage: (page: number) => void;
  fetchUsers: (query?: string, pageOverride?: number) => Promise<void>;
  
  // Filter options
  departments: string[];
  organizations: string[];
  jobTitles: string[];
  fetchFilterOptions: () => Promise<void>;
  getUserById: (id: string) => User | undefined;
  globalPresence: Record<string, 'online' | 'away' | 'offline'>;
  setPresence: (id: string, presence: 'online' | 'away' | 'offline') => void;
  setBulkPresence: (presences: Record<string, 'online' | 'away' | 'offline'>) => void;

  // Change Requests
  changeRequests: ChangeRequest[];
  pendingFields: Record<string, string> | null;
  fetchMyPendingFields: () => Promise<void>;
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

  // Settings
  ldapSettings: import('../api/settings').LDAPSettings | null;
  fetchLDAPSettings: (silent?: boolean) => Promise<void>;
  updateLDAPSettings: (settings: import('../api/settings').LDAPSettings) => Promise<void>;

  ouMapping: Record<string, string>;
  fetchOUMapping: () => Promise<void>;
  updateOUMapping: (mapping: Record<string, string>) => Promise<void>;

  forceSync: () => Promise<void>;
}

let searchAbortController: AbortController | null = null;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      currentUser: null,
      isAuthenticated: false,

      login: async (samAccount: string, password: string) => {
        try {
          await login(samAccount, password);
          set({ isAuthenticated: true });
          await get().fetchMe();
          return { success: true };
        } catch (error: any) {
          console.error('Login failed:', error);
          let errorMessage = 'Ошибка авторизации. Сервер недоступен.';
          if (error.response?.status === 401) {
            errorMessage = 'Неверный логин или пароль'; // Убрали длинную часть про учетную запись
          } else if (error.response?.status === 429) {
            errorMessage = 'Вход временно ограничен. Превышено количество попыток.';
          }
          // Мы убрали вызов toast.error(errorMessage) здесь, так как он вызывается в LoginPage с красным стилем
          return { success: false, error: errorMessage };
        }
      },

      logout: async () => {
        set({ currentUser: null, isAuthenticated: false, users: [], changeRequests: [], reports: [] });
        try {
          await import('../api/client').then(m => m.default.post('/auth/logout'));
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

      // Users
      users: [],
      searchQuery: '',
      isSearching: false,
      filters: {},
      page: 1,
      limit: 18,
      totalUsers: 0,
      departments: [],
      organizations: [],
      jobTitles: [],

      setSearchQuery: (query: string) => {
        set({ searchQuery: query, page: 1 });
        get().fetchUsers(query, 1);
      },

      setFilters: (newFilters: Partial<UserFilters>) => {
        set((state) => ({ filters: { ...state.filters, ...newFilters }, page: 1 }));
        get().fetchUsers(undefined, 1);
      },
      
      setPage: (page: number) => {
        set({ page });
        get().fetchUsers();
      },

      fetchFilterOptions: async () => {
        try {
          const [deps, orgs, jobs] = await Promise.all([
            usersApi.getDepartments(),
            usersApi.getOrganizations(),
            usersApi.getJobTitles(),
          ]);
          set({ departments: deps, organizations: orgs, jobTitles: jobs });
        } catch (error) {
          console.error('Failed to fetch filter options', error);
        }
      },

      fetchUsers: async (query?: string, pageOverride?: number) => {
        if (searchAbortController) {
          searchAbortController.abort();
        }
        searchAbortController = new AbortController();

        set({ isSearching: true });
        try {
          const currentPage = pageOverride ?? get().page;
          const currentLimit = get().limit;
          
          const response = await usersApi.getUsers(
            query ?? get().searchQuery, 
            get().filters, 
            currentPage, 
            currentLimit,
            searchAbortController.signal
          );
          
          // Merge global presence
          const presences = get().globalPresence;
          const updatedUsers = response.items.map(u => ({
            ...u,
            presence: presences[u.id] || u.presence
          }));
          
          set({ 
            users: updatedUsers, 
            isSearching: false,
            totalUsers: response.total 
          });
        } catch (error: any) {
          if (error.name === 'CanceledError' || error.message?.includes('abort') || error.name === 'AbortError') {
            return; // Игнорируем отмененные запросы
          }
          console.error('Failed to fetch users', error);
          set({ isSearching: false });
        }
      },

      getUserById: (id: string) => {
        return get().users.find(u => u.id === id);
      },

      globalPresence: {},

      setPresence: (id, presence) => {
        set((state) => ({
          globalPresence: { ...state.globalPresence, [id]: presence },
          users: state.users.map((u) => (u.id === id ? { ...u, presence } : u)),
          currentUser: state.currentUser?.id === id ? { ...state.currentUser, presence } : state.currentUser,
        }));
      },

      setBulkPresence: (presences) => {
        set((state) => ({
          globalPresence: { ...state.globalPresence, ...presences },
          users: state.users.map((u) => (presences[u.id] ? { ...u, presence: presences[u.id] } : u)),
          currentUser: state.currentUser && presences[state.currentUser.id] 
            ? { ...state.currentUser, presence: presences[state.currentUser.id] } 
            : state.currentUser,
        }));
      },

      // Change Requests
      changeRequests: [],
      pendingFields: null,

      fetchMyPendingFields: async () => {
        if (!get().currentUser) return;
        try {
          const requests = await changeRequestsApi.getMyChangeRequests();
          const activePending: Record<string, string> = {};
          requests.forEach(r => {
            if (r.status === 'pending' || r.status === 'conflict' || r.status === 'approved') {
              const fieldKey = r.field_name || (r as any).attribute_name;
              if (fieldKey) activePending[fieldKey] = r.new_value;
            }
          });
          set({ pendingFields: activePending });
        } catch (error) {
          console.error('Failed to fetch pending fields', error);
          set({ pendingFields: {} });
        }
      },

      addChangeRequest: async (request) => {
        try {
          const newRequest = await changeRequestsApi.createChangeRequest(request);
          set(state => ({
            changeRequests: [newRequest, ...state.changeRequests],
            pendingFields: state.pendingFields 
              ? { ...state.pendingFields, [request.attribute_name]: request.new_value }
              : { [request.attribute_name]: request.new_value }
          }));
          toast.success('Заявка на изменение контактов успешно создана');
        } catch (error: any) {
          console.error('Failed to create change request', error);
          if (error.response?.status === 422) {
            toast.error('Неверный формат введённых данных');
          } else if (error.response?.status === 409) {
            set(state => ({
              pendingFields: state.pendingFields 
                ? { ...state.pendingFields, [request.attribute_name]: request.new_value }
                : { [request.attribute_name]: request.new_value }
            }));
            toast.error('Для этого поля уже есть заявка на рассмотрении');
          } else {
            toast.error('Ошибка при создании заявки');
          }
          throw error;
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
          toast.success('Заявка одобрена и будет применена в AD');
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

      forceSync: async () => {
        try {
          const res = await adminApi.forceSync();
          toast.success('Синхронизация с AD запущена');
        } catch (error) {
          console.error('Failed to force sync', error);
          toast.error('Ошибка при запуске синхронизации');
        }
      },

      // Infrastructure
      adSyncUnavailable: false,
      setAdSyncStatus: (status: boolean) => set({ adSyncUnavailable: status }),

      // Settings
      ldapSettings: null,
      fetchLDAPSettings: async (silent = false) => {
        try {
          const { settingsApi } = await import('../api/settings');
          const settings = await settingsApi.getLDAPSettings();
          set({ ldapSettings: settings });
        } catch (error) {
          console.error('Failed to fetch LDAP settings', error);
          if (!silent) toast.error('Не удалось загрузить настройки LDAP');
        }
      },
      updateLDAPSettings: async (newSettings) => {
        try {
          const { settingsApi } = await import('../api/settings');
          const settings = await settingsApi.updateLDAPSettings(newSettings);
          set({ ldapSettings: settings });
          toast.success('Настройки LDAP успешно сохранены');
        } catch (error) {
          console.error('Failed to update LDAP settings', error);
          toast.error('Ошибка при сохранении настроек LDAP');
        }
      },

      ouMapping: {},
      fetchOUMapping: async () => {
        try {
          const { settingsApi } = await import('../api/settings');
          const mapping = await settingsApi.getOUMapping();
          set({ ouMapping: mapping });
        } catch (error) {
          console.error('Failed to fetch OU mapping', error);
          toast.error('Не удалось загрузить маппинг OU');
        }
      },
      updateOUMapping: async (mapping) => {
        try {
          const { settingsApi } = await import('../api/settings');
          const newMapping = await settingsApi.updateOUMapping(mapping);
          set({ ouMapping: newMapping });
          toast.success('Маппинг OU успешно сохранен');
        } catch (error) {
          console.error('Failed to update OU mapping', error);
          toast.error('Ошибка при сохранении маппинга OU');
        }
      },
    }),
    {
      name: 'smart-contacts-storage',
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser,
        adSyncUnavailable: state.adSyncUnavailable
      }),
    }
  )
);
