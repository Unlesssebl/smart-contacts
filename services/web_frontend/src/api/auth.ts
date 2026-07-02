import apiClient from './client';

export const login = async (username: string, password: string) => {
  // In a real app, this would be a POST request to your auth endpoint
  const response = await apiClient.post('/auth/login', { username, password });
  return response.data;
};

export const getMe = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

export const checkSso = async () => {
  // @ts-ignore - custom property for interceptor
  const response = await apiClient.get('/auth/sso', { _skipAuthRedirect: true });
  return response.data;
};

export const getWsToken = async () => {
  const response = await apiClient.get('/auth/ws-token');
  return response.data.ws_token;
};
