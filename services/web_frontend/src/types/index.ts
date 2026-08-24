export type UserRole = 'employee' | 'it_operator' | 'admin';
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected' | 'conflict';
export type ReportStatus = 'pending' | 'processed' | 'approved' | 'rejected' | 'conflict';

export interface User {
  id: string; // From object_guid
  full_name: string;
  internal_phone?: string | null;
  mobile_phone?: string | null;
  department?: string | null;
  office_location?: string | null;
  organization?: string | null;
  job_title?: string | null;
  tg_id?: number | null;
  email?: string | null;
  manager_id?: string | null;
  presence?: 'online' | 'away' | 'offline';
  ad_dn?: string | null;
  is_hidden?: boolean;
  avatar_color?: string | null;
  role?: UserRole;
}

export interface UserProfile extends User {
  sam_account_name: string;
  status?: string;
  role: UserRole;
  is_verified: boolean;
  is_protected: boolean;
  grace_period_left: number;
  last_sync_timestamp?: string | null;
}

export interface PaginatedUsers {
  total: number;
  page: number;
  limit: number;
  items: User[];
}

export interface ChangeRequest {
  id: string;
  user_id: string;
  user_guid?: string;
  user_name?: string | null;
  field_name: string;
  attribute_name?: string;
  old_value?: string | null;
  new_value: string;
  status: ChangeRequestStatus;
  rejection_reason?: string | null;
  is_protected?: boolean;
  user_status?: string;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  target_user_guid?: string;
  target_user_name?: string | null;
  reporter_user_guid?: string | null;
  reporter_user_name?: string | null;
  attribute_name: string;
  field_name?: string;
  old_value?: string | null;
  new_value: string | null;
  rejection_reason?: string | null;
  description?: string;
  status: ReportStatus;
  is_protected?: boolean;
  user_status?: string;
  created_at: string;
}

export type SupportCategory = 'access' | 'data_error' | 'bug' | 'suggestion' | 'other';
export type SupportStatus = 'open' | 'closed';

export interface SupportTicket {
  id: string;
  user_guid?: string | null;
  sender_name?: string | null;
  sender_contact?: string | null;
  display_sender_name: string;
  display_sender_contact: string;
  department?: string | null;
  job_title?: string | null;
  is_guest: boolean;
  category: SupportCategory;
  message: string;
  status: SupportStatus;
  closed_by?: string | null;
  closer_name?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedSupportTickets {
  items: SupportTicket[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BulkReviewResult {
  approved: number;
  rejected: number;
  skipped: number;
  errors: string[];
}

export interface AppNotification {
  id: string;
  type: 'field_applied' | 'field_rejected' | 'ticket_closed';
  title: string;
  body: string;
  field?: string;
  read: boolean;
  createdAt: string;
}

export interface SupportTicketCreateInput {
  category: SupportCategory;
  message: string;
  sender_name?: string;
  sender_contact?: string;
}

export interface SecurityIncident {
  ip: string;
  attempts: number;
  is_blocked: boolean;
  is_permanent: boolean;
  retry_after: number;
  last_sam?: string | null;
  last_attempt_at?: string | null;
}

