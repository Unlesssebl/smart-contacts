import apiClient from './client';
import type { Report } from '../types';

export interface ReportCreate {
  target_user_id: string;
  changes: { attribute_name: string; new_value: string }[];
}

export const reportsApi = {
  createReport: async (data: ReportCreate): Promise<Report> => {
    const response = await apiClient.post('/reports', data);
    return response.data;
  }
};
