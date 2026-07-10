import type { User, UserProfile, ChangeRequest, Report } from '@/types';
import type { UserFilters } from '@/api/users';
import type { LDAPSettings } from '@/api/settings';

export interface AuthSlice {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  login: (samAccount: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export interface UsersSlice {
  users: User[];
  searchQuery: string;
  isSearching: boolean;
  filters: UserFilters;
  page: number;
  limit: number;
  totalUsers: number;
  departments: string[];
  organizations: string[];
  jobTitles: string[];
  fetchFilterOptions: () => Promise<void>;
  fetchUsers: (query?: string, pageOverride?: number) => Promise<void>;
  getUserById: (id: string) => User | undefined;
  globalPresence: Record<string, 'online' | 'away' | 'offline'>;
  setPresence: (id: string, presence: 'online' | 'away' | 'offline') => void;
  setBulkPresence: (presences: Record<string, 'online' | 'away' | 'offline'>) => void;
  updateUserInStore: (id: string, updates: Partial<User>) => void;
}

export interface ChangeRequestsSlice {
  changeRequests: ChangeRequest[];
  pendingFields: Record<string, string> | null;
  fetchMyPendingFields: () => Promise<void>;
  addChangeRequest: (request: { attribute_name: string; new_value: string }) => Promise<void>;
  approveChangeRequest: (id: string) => Promise<void>;
  rejectChangeRequest: (id: string) => Promise<void>;
}

export interface ReportsSlice {
  reports: Report[];
  addReport: (report: { target_user_id: string; changes: { attribute_name: string; new_value: string }[] }) => Promise<void>;
  approveReport: (id: string) => Promise<void>;
  rejectReport: (id: string) => Promise<void>;
}

export interface AdminSlice {
  fetchAdminData: () => Promise<void>;
  forceSync: () => Promise<void>;
}

export interface InfraSlice {
  adSyncUnavailable: boolean;
  setAdSyncStatus: (status: boolean) => void;
  isApiDown: boolean;
  setApiDown: (status: boolean) => void;
}

export interface SettingsSlice {
  ldapSettings: LDAPSettings | null;
  fetchLDAPSettings: (silent?: boolean) => Promise<void>;
  updateLDAPSettings: (settings: LDAPSettings) => Promise<void>;
  ouMapping: Record<string, string>;
  fetchOUMapping: () => Promise<void>;
  updateOUMapping: (mapping: Record<string, string>) => Promise<void>;
}

export type AppState = AuthSlice &
  UsersSlice &
  ChangeRequestsSlice &
  ReportsSlice &
  AdminSlice &
  InfraSlice &
  SettingsSlice;
