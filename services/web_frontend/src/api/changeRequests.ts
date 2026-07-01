import apiClient from './client';
import type { ChangeRequest } from '../types';

export interface ChangeRequestCreate {
  attribute_name: string;
  new_value: string;
}

export const changeRequestsApi = {
  createChangeRequest: async (data: ChangeRequestCreate): Promise<ChangeRequest> => {
    const response = await apiClient.post('/profile/me/change-request', data);
    return response.data;
  },
  
  getMyChangeRequests: async (): Promise<ChangeRequest[]> => {
    const response = await apiClient.get('/profile/me/change-requests');
    return response.data;
  }
};
