import type { StateCreator } from 'zustand';
import { usersApi } from '@/api/users';
import type { AppState, UsersSlice } from '../types';

let searchAbortController: AbortController | null = null;

export const createUsersSlice: StateCreator<AppState, [], [], UsersSlice> = (set, get) => ({
  users: [],
  searchQuery: '',
  isSearching: false,
  filters: {},
  page: 1,
  limit: 9,
  totalUsers: 0,
  departments: [],
  organizations: [],
  jobTitles: [],
  globalPresence: {},

  setSearchQuery: (query) => {
    set({ searchQuery: query, page: 1 });
    get().fetchUsers(query, 1);
  },

  setFilters: (newFilters) => {
    set((state) => ({ filters: { ...state.filters, ...newFilters }, page: 1 }));
    get().fetchUsers(undefined, 1);
  },

  setLimit: (limit) => {
    set({ limit, page: 1 });
    get().fetchUsers(undefined, 1);
  },

  setPage: (page) => {
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

  fetchUsers: async (query, pageOverride) => {
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
      const updatedUsers = response.items.map((u) => ({
        ...u,
        presence: presences[u.id] || u.presence,
      }));

      set({
        users: updatedUsers,
        isSearching: false,
        totalUsers: response.total,
      });
    } catch (error: any) {
      if (error.name === 'CanceledError' || error.message?.includes('abort') || error.name === 'AbortError') {
        return; // Игнорируем отмененные запросы
      }
      console.error('Failed to fetch users', error);
      set({ isSearching: false });
    }
  },

  getUserById: (id) => {
    return get().users.find((u) => u.id === id);
  },

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
      currentUser:
        state.currentUser && presences[state.currentUser.id]
          ? { ...state.currentUser, presence: presences[state.currentUser.id] }
          : state.currentUser,
    }));
  },

  updateUserInStore: (id, updates) => {
    set((state) => ({
      users: state.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
      currentUser: state.currentUser?.id === id ? { ...state.currentUser, ...updates } : state.currentUser,
    }));
  },
});
