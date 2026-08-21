import apiClient from './client';

export const updateAvatarColor = async (color: string) => {
  const response = await apiClient.patch('/profile/me/avatar-color', { avatar_color: color });
  return response.data;
};

export const acknowledgeGatekeeper = async (action: 'confirm' | 'skip') => {
  const response = await apiClient.post<{ is_verified: boolean; grace_period_left: number }>(
    '/profile/me/acknowledge',
    { action }
  );
  return response.data;
};

