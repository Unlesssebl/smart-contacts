import apiClient from './client';
import type { ChangeRequest, Report } from '../types';

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

  processReport: async (id: string): Promise<Report> => {
    const response = await apiClient.patch(`/admin/reports/${id}/process`);
    return response.data;
  }
};
