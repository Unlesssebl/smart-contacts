import apiClient from './client';

export const updateAvatarColor = async (color: string) => {
  const response = await apiClient.patch('/profile/me/avatar-color', { avatar_color: color });
  return response.data;
};
