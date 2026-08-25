import type {
  User,
  UserProfile,
  ChangeRequest,
  Report,
  SupportTicket,
  SupportTicketCreateInput,
  AppNotification,
  BulkReviewResult,
} from '@/types';
import type { UserFilters } from '@/api/users';
import type { LDAPSettings } from '@/api/settings';

export interface AuthSlice {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  login: (samAccount: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  acknowledgeGatekeeper: (action: 'confirm' | 'skip') => Promise<{ success: boolean; error?: string }>;
}

export interface UsersSlice {
  users: User[];
  searchQuery: string;
  isSearching: boolean;
  initialLoaded: boolean;
  filters: UserFilters;
  page: number;
  limit: number;
  totalUsers: number;
  departments: string[];
  organizations: string[];
  jobTitles: string[];
  setSearchQuery: (query: string) => void;
  setFilters: (newFilters: Partial<UserFilters>) => void;
  setPage: (page: number) => void;
  fetchFilterOptions: () => Promise<void>;
  fetchUsers: (query?: string, pageOverride?: number) => Promise<void>;
  getUserById: (id: string) => User | undefined;
  setLimit: (limit: number) => void;
  globalPresence: Record<string, 'online' | 'away' | 'offline'>;
  setPresence: (id: string, presence: 'online' | 'away' | 'offline') => void;
  setBulkPresence: (presences: Record<string, 'online' | 'away' | 'offline'>) => void;
  updateUserInStore: (id: string, updates: Partial<User>) => void;
}

export interface ChangeRequestsSlice {
  changeRequests: ChangeRequest[];
  pendingFields: Record<string, string> | null;
  rejectedFields: Record<string, boolean>;
  markFieldRejected: (field: string) => void;
  clearRejectedField: (field: string) => void;
  fetchMyPendingFields: () => Promise<void>;
  addChangeRequest: (request: { attribute_name: string; new_value: string }) => Promise<void>;
  approveChangeRequest: (id: string) => Promise<void>;
  rejectChangeRequest: (id: string) => Promise<void>;
  updateChangeRequestValue: (id: string, newValue: string | null) => Promise<void>;
  bulkApproveReviewItems: (requestIds: string[], reportIds: string[]) => Promise<BulkReviewResult>;
  bulkRejectReviewItems: (requestIds: string[], reportIds: string[]) => Promise<BulkReviewResult>;
}

export interface ReportsSlice {
  reports: Report[];
  addReport: (report: { target_user_id: string; changes: { attribute_name: string; new_value: string }[] }) => Promise<void>;
  approveReport: (id: string) => Promise<void>;
  rejectReport: (id: string) => Promise<void>;
  updateReportValue: (id: string, newValue: string | null) => Promise<void>;
}

export interface SupportSlice {
  supportTickets: SupportTicket[];
  totalSupportTickets: number;
  supportTicketPage: number;
  supportTicketPageSize: number;
  supportTicketTotalPages: number;
  isLoadingSupportTickets: boolean;
  fetchSupportTickets: (params?: { status?: string; page?: number; pageSize?: number; search?: string }) => Promise<void>;
  sendSupportTicket: (data: SupportTicketCreateInput) => Promise<{ success: boolean; error?: string }>;
  closeSupportTicket: (id: string) => Promise<void>;
  reopenSupportTicket: (id: string) => Promise<void>;
}

export interface NotificationsSlice {
  notifications: AppNotification[];
  unreadCount: number;
  isLoadingNotifications: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  addNotification: (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & { id?: string; createdAt?: string; read?: boolean }) => boolean;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  loadNotificationsFromStorage: (userGuid?: string) => void;
  clearNotifications: () => Promise<void>;
}

export interface AdminSlice {

  securityIncidents: import('@/types').SecurityIncident[];
  isLoadingSecurity: boolean;
  fetchAdminData: () => Promise<void>;
  fetchSecurityIncidents: () => Promise<void>;
  unblockIp: (ip: string) => Promise<boolean>;
  blockIp: (ip: string, permanent?: boolean, durationSeconds?: number) => Promise<boolean>;
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
  ouMapping: Record<string, import('@/api/settings').OUMappingValue>;
  fetchOUMapping: () => Promise<void>;
  updateOUMapping: (mapping: Record<string, import('@/api/settings').OUMappingValue>) => Promise<void>;
  deptMapping: Record<string, string>;
  jobTitleMapping: Record<string, string>;
  canonicalSuggestions: import('@/api/settings').CanonicalSuggestionsResponse | null;
  isLoadingSuggestions: boolean;
  fetchDeptMapping: () => Promise<void>;
  updateDeptMapping: (mapping: Record<string, string>) => Promise<void>;
  fetchJobTitleMapping: () => Promise<void>;
  updateJobTitleMapping: (mapping: Record<string, string>) => Promise<void>;
  fetchCanonicalSuggestions: () => Promise<void>;
}

export type AppState = AuthSlice &
  UsersSlice &
  ChangeRequestsSlice &
  ReportsSlice &
  SupportSlice &
  NotificationsSlice &
  AdminSlice &
  InfraSlice &
  SettingsSlice;
