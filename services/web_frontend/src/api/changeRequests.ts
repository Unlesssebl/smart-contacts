import apiClient from './client';

export interface ChangeRequest {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string;
  status: 'pending' | 'approved' | 'rejected' | 'conflict';
  created_at: string;
}

export const getMyRequests = async () => {
  const response = await apiClient.get('/profile/me/change-requests');
  return response.data;
};

export const createChangeRequest = async (data: any) => {
  const response = await apiClient.post('/profile/me/change-request', data);
  return response.data;
};

export const acknowledgeGatekeeper = async (action: 'confirm' | 'skip') => {
  const response = await apiClient.post('/profile/me/acknowledge', { action });
  return response.data;
};

export const getAllRequests = async () => {
  const response = await apiClient.get('/admin/change-requests');
  return response.data;
};

export const processRequest = async (id: string, action: 'approve' | 'reject') => {
  const response = await apiClient.patch(`/admin/change-requests/${id}/${action}`);
  return response.data;
};
