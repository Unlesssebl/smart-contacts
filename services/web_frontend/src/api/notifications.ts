import apiClient from './client';
import type { AppNotification } from '@/types';

export interface NotificationDto {
  id: string;
  user_guid: string;
  type: string;
  title: string;
  body: string;
  field?: string | null;
  category?: string | null;
  payload?: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
}

export interface NotificationListResponse {
  items: NotificationDto[];
  unread_count: number;
  total: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export const mapNotificationDtoToApp = (dto: NotificationDto): AppNotification => ({
  id: dto.id,
  type: dto.type as AppNotification['type'],
  title: dto.title,
  body: dto.body,
  field: dto.field || undefined,
  category: dto.category || undefined,
  read: dto.is_read,
  createdAt: dto.created_at,
});

export const notificationsApi = {
  getNotifications: async (params?: { limit?: number; offset?: number; unread_only?: boolean }): Promise<NotificationListResponse> => {
    const res = await apiClient.get<NotificationListResponse>('/notifications', { params });
    return res.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    return res.data.unread_count;
  },

  markAsRead: async (id: string): Promise<NotificationDto> => {
    const res = await apiClient.patch<NotificationDto>(`/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async (): Promise<{ status: string; updated_count: number }> => {
    const res = await apiClient.post<{ status: string; updated_count: number }>('/notifications/read-all');
    return res.data;
  },

  deleteNotification: async (id: string): Promise<{ status: string }> => {
    const res = await apiClient.delete<{ status: string }>(`/notifications/${id}`);
    return res.data;
  },

  clearNotifications: async (): Promise<{ status: string; deleted_count: number }> => {
    const res = await apiClient.delete<{ status: string; deleted_count: number }>('/notifications');
    return res.data;
  },
};
