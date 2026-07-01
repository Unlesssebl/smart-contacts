import apiClient from './client';
import type { User, PaginatedUsers } from '../types';

export const usersApi = {
  getUsers: async (q?: string, page: number = 1, limit: number = 100): Promise<PaginatedUsers> => {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    const response = await apiClient.get(`/users?${params.toString()}`);
    return response.data;
  },

  getUserByGuid: async (guid: string): Promise<User> => {
    const response = await apiClient.get(`/users/${guid}`);
    return response.data;
  }
};
