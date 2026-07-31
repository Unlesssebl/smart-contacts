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
  hidden_only?: boolean;
}

export const usersApi = {
  getOrgColors: async (): Promise<Record<string, string>> => {
    const response = await apiClient.get<Record<string, string>>('/users/org-colors');
    return response.data;
  },

  getUsers: async (q?: string, filters?: UserFilters, page: number = 1, limit: number = 100, signal?: AbortSignal): Promise<PaginatedUsers> => {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    
    if (filters) {
      if (filters.department) params.append('department', filters.department);
      if (filters.organization) params.append('organization', filters.organization);
      if (filters.job_title) params.append('job_title', filters.job_title);
      if (filters.has_phone) params.append('has_phone', 'true');
      if (filters.has_email) params.append('has_email', 'true');
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

  getDepartments: async (): Promise<string[]> => {
    const response = await apiClient.get('/users/departments');
    return response.data;
  },

  getOrganizations: async (): Promise<string[]> => {
    const response = await apiClient.get('/users/organizations');
    return response.data;
  },

  getJobTitles: async (): Promise<string[]> => {
    const response = await apiClient.get('/users/job-titles');
    return response.data;
  }
};
