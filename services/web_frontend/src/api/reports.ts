import apiClient from './client';

export interface Report {
  id: string;
  user_id: string;
  description: string;
  status: 'pending' | 'processed';
  created_at: string;
}

export const createReport = async (data: { user_id: string; description: string }) => {
  const response = await apiClient.post('/reports', data);
  return response.data;
};

export const getAllReports = async () => {
  const response = await apiClient.get('/admin/reports');
  return response.data;
};

export const processReport = async (id: string) => {
  const response = await apiClient.patch(`/admin/reports/${id}/process`);
  return response.data;
};
