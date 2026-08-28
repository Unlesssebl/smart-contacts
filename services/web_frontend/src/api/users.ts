import apiClient from './client';
import type { User, PaginatedUsers } from '@/types';

interface UserApiItem extends User {
  object_guid?: string;
}

type PaginatedUsersApiResponse = Omit<PaginatedUsers, 'items'> & { items: UserApiItem[] };

export interface UserFilters {
  department?: string;
  organization?: string;
  job_title?: string;
  has_phone?: boolean;
  has_email?: boolean;
  is_online?: boolean;
  hidden_only?: boolean;
}

export const usersApi = {
  getUsers: async (q?: string, filters?: UserFilters, page: number = 1, limit: number = 100, signal?: AbortSignal): Promise<PaginatedUsers> => {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    
    if (filters) {
      if (filters.department) params.append('department', filters.department);
      if (filters.organization) params.append('organization', filters.organization);
      if (filters.job_title) params.append('job_title', filters.job_title);
      if (filters.has_phone) params.append('has_phone', 'true');
      if (filters.has_email) params.append('has_email', 'true');
      if (filters.is_online) params.append('is_online', 'true');
      if (filters.hidden_only) params.append('hidden_only', 'true');
    }

    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    const response = await apiClient.get<PaginatedUsersApiResponse>(`/users?${params.toString()}`, { signal });
    const data = response.data;
    if (data && data.items) {
      data.items = data.items.map((item) => ({
        ...item,
        id: item.object_guid || item.id,
      }));
    }
    return data as PaginatedUsers;
  },

  getUserByGuid: async (guid: string): Promise<User> => {
    const response = await apiClient.get<UserApiItem>(`/users/${guid}`);
    return {
      ...response.data,
      id: response.data.object_guid || response.data.id,
    };
  },

  getDepartments: async (filters?: { organization?: string; job_title?: string }): Promise<string[]> => {
    const params = new URLSearchParams();
    if (filters?.organization) params.append('organization', filters.organization);
    if (filters?.job_title) params.append('job_title', filters.job_title);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<string[]>(`/users/departments${query}`);
    return response.data;
  },

  getOrganizations: async (filters?: { department?: string; job_title?: string }): Promise<string[]> => {
    const params = new URLSearchParams();
    if (filters?.department) params.append('department', filters.department);
    if (filters?.job_title) params.append('job_title', filters.job_title);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<string[]>(`/users/organizations${query}`);
    return response.data;
  },

  getJobTitles: async (filters?: { organization?: string; department?: string }): Promise<string[]> => {
    const params = new URLSearchParams();
    if (filters?.organization) params.append('organization', filters.organization);
    if (filters?.department) params.append('department', filters.department);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<string[]>(`/users/job-titles${query}`);
    return response.data;
  }
};
