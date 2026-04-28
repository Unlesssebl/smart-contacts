import apiClient from './client';

export interface UserProfile {
  id: string;
  full_name: string;
  department: string;
  job_title: string;
  internal_phone: string | null;
  mobile_phone: string | null;
  office_location: string | null;
  status: 'ACTIVE' | 'RESIGNED' | 'ON_LEAVE';
  is_verified: boolean;
  grace_period_left: number;
}

export const searchUsers = async (params: { query?: string; department?: string }) => {
  const response = await apiClient.get('/users', { params });
  return response.data;
};

export const getDepartments = async () => {
  const response = await apiClient.get('/users/departments');
  return response.data;
};
