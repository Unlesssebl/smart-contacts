import { create } from 'zustand';
import { User, ChangeRequest, Report } from '../types';
import { mockUsers, mockChangeRequests, mockReports } from '../lib/mockData';

interface AppState {
  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (samAccount: string, password: string) => boolean;
  logout: () => void;

  // Users
  users: User[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  getFilteredUsers: () => User[];
  getUserById: (id: string) => User | undefined;
  updateUser: (id: string, updates: Partial<User>) => void;

  // Change Requests
  changeRequests: ChangeRequest[];
  addChangeRequest: (request: Omit<ChangeRequest, 'id' | 'requested_at'>) => void;
  approveChangeRequest: (id: string) => void;
  rejectChangeRequest: (id: string) => void;

  // Reports
  reports: Report[];
  addReport: (report: Omit<Report, 'id' | 'created_at'>) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  currentUser: null,
  isAuthenticated: false,

  login: (samAccount: string, password: string) => {
    // Mock authentication - in production this would call an API
    const user = mockUsers.find(u => u.sam_account === samAccount);
    if (user) {
      set({ currentUser: user, isAuthenticated: true });
      return true;
    }
    return false;
  },

  logout: () => {
    set({ currentUser: null, isAuthenticated: false });
  },

  // Users
  users: mockUsers,
  searchQuery: '',

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  getFilteredUsers: () => {
    const { users, searchQuery } = get();
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase();
    return users.filter(user =>
      user.full_name.toLowerCase().includes(query) ||
      user.job_title.toLowerCase().includes(query) ||
      user.department.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  },

  getUserById: (id: string) => {
    return get().users.find(u => u.id === id);
  },

  updateUser: (id: string, updates: Partial<User>) => {
    set(state => ({
      users: state.users.map(u => u.id === id ? { ...u, ...updates } : u),
      currentUser: state.currentUser?.id === id
        ? { ...state.currentUser, ...updates }
        : state.currentUser
    }));
  },

  // Change Requests
  changeRequests: mockChangeRequests,

  addChangeRequest: (request) => {
    const newRequest: ChangeRequest = {
      ...request,
      id: `cr${Date.now()}`,
      requested_at: new Date().toISOString(),
    };
    set(state => ({
      changeRequests: [...state.changeRequests, newRequest]
    }));
  },

  approveChangeRequest: (id: string) => {
    const request = get().changeRequests.find(r => r.id === id);
    if (request) {
      // Apply the change to the user
      const user = get().getUserById(request.user_id);
      if (user) {
        get().updateUser(request.user_id, {
          [request.attribute_name]: request.new_value
        });
      }

      // Update request status
      set(state => ({
        changeRequests: state.changeRequests.map(r =>
          r.id === id ? { ...r, status: 'approved' } : r
        )
      }));
    }
  },

  rejectChangeRequest: (id: string) => {
    set(state => ({
      changeRequests: state.changeRequests.map(r =>
        r.id === id ? { ...r, status: 'rejected' } : r
      )
    }));
  },

  // Reports
  reports: mockReports,

  addReport: (report) => {
    const newReport: Report = {
      ...report,
      id: `r${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    set(state => ({
      reports: [...state.reports, newReport]
    }));
  },
}));
