export type UserRole = 'employee' | 'it_operator' | 'admin';
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected' | 'conflict';
export type ReportStatus = 'new' | 'pending' | 'processed';

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
  user_id: string; // from user_guid
  user_name?: string | null;
  field_name: string; // from attribute_name
  new_value: string;
  status: ChangeRequestStatus;
  rejection_reason?: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string; // from target_user_guid
  target_user_name?: string | null;
  reporter_user_guid?: string | null;
  reporter_user_name?: string | null;
  description: string; // from reason
  status: ReportStatus;
  created_at: string;
}
