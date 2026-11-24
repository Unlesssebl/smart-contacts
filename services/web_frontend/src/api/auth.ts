import apiClient from './client';
import { useAppStore } from '@/store/useAppStore';

export const login = async (username: string, password: string) => {
  // In a real app, this would be a POST request to your auth endpoint
  const response = await apiClient.post('/auth/login', { username, password });
  return response.data;
};

export const refreshToken = async () => {
  const response = await apiClient.post('/auth/refresh');
  return response.data;
};

export const getMe = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

export const checkSso = async () => {
  useAppStore.getState().resetSession();
  const response = await apiClient.get('/auth/sso');
  return response.data;
};

export const getWsToken = async () => {
  const response = await apiClient.get('/auth/ws-token');
  return response.data.ws_token;
};
