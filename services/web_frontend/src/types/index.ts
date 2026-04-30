export type UserRole = 'employee' | 'it_operator' | 'admin';

export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  full_name: string;
  job_title: string;
  department: string;
  internal_phone: string;
  mobile_phone: string;
  email: string;
  role: UserRole;
  is_online: boolean;
  avatar_url?: string;
  office_location?: string;
  manager_id?: string;
  sam_account: string;
}

export interface ChangeRequest {
  id: string;
  user_id: string;
  user_name: string;
  attribute_name: string;
  old_value: string;
  new_value: string;
  status: ChangeRequestStatus;
  requested_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  user_name: string;
  category: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
}
