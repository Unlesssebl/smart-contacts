import apiClient from './client';
import type { ChangeRequest, Report } from '@/types';

export const adminApi = {
  getChangeRequests: async (): Promise<ChangeRequest[]> => {
    const response = await apiClient.get('/admin/change-requests');
    return response.data;
  },

  approveChangeRequest: async (id: string): Promise<ChangeRequest> => {
    const response = await apiClient.patch(`/admin/change-requests/${id}/approve`);
    return response.data;
  },

  rejectChangeRequest: async (id: string): Promise<ChangeRequest> => {
    const response = await apiClient.patch(`/admin/change-requests/${id}/reject`);
    return response.data;
  },

  getReports: async (): Promise<Report[]> => {
    const response = await apiClient.get('/admin/reports');
    return response.data;
  },

  approveReport: async (id: string): Promise<Report> => {
    const response = await apiClient.patch(`/admin/reports/${id}/approve`);
    return response.data;
  },

  rejectReport: async (id: string): Promise<Report> => {
    const response = await apiClient.patch(`/admin/reports/${id}/reject`);
    return response.data;
  },

  forceSync: async (): Promise<{status: string; message: string}> => {
    const response = await apiClient.post('/admin/sync/force');
    return response.data;
  },

  updateUserVisibility: async (id: string, is_hidden: boolean): Promise<{status: string; is_hidden: boolean}> => {
    const response = await apiClient.patch(`/admin/users/${id}/visibility`, { is_hidden });
    return response.data;
  }
};
