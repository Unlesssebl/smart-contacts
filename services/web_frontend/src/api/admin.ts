import apiClient from './client';
import type { ChangeRequest, Report, BulkReviewResult } from '@/types';

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

  updateChangeRequestValue: async (id: string, new_value: string | null): Promise<ChangeRequest> => {
    const response = await apiClient.patch(`/admin/change-requests/${id}/value`, { new_value });
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

  updateReportValue: async (id: string, new_value: string | null): Promise<Report> => {
    const response = await apiClient.patch(`/admin/reports/${id}/value`, { new_value });
    return response.data;
  },

  bulkApprove: async (request_ids: string[], report_ids: string[]): Promise<BulkReviewResult> => {
    const response = await apiClient.post('/admin/review-items/bulk-approve', { request_ids, report_ids });
    return response.data;
  },

  bulkReject: async (request_ids: string[], report_ids: string[]): Promise<BulkReviewResult> => {
    const response = await apiClient.post('/admin/review-items/bulk-reject', { request_ids, report_ids });
    return response.data;
  },

  forceSync: async (): Promise<{status: string; message: string}> => {
    const response = await apiClient.post('/admin/sync/force');
    return response.data;
  },

  updateUserVisibility: async (id: string, is_hidden: boolean): Promise<{status: string; is_hidden: boolean}> => {
    const response = await apiClient.patch(`/admin/users/${id}/visibility`, { is_hidden });
    return response.data;
  },

  getSecurityIncidents: async (): Promise<import('@/types').SecurityIncident[]> => {
    const response = await apiClient.get('/admin/security/incidents');
    return response.data;
  },

  unblockIp: async (ip: string): Promise<{status: string; message: string}> => {
    const response = await apiClient.post('/admin/security/unblock', { ip });
    return response.data;
  },

  blockIp: async (ip: string, permanent: boolean = true, durationSeconds: number = 3600): Promise<{status: string; message: string}> => {
    const response = await apiClient.post('/admin/security/block', { ip, permanent, duration_seconds: durationSeconds });
    return response.data;
  }
};

