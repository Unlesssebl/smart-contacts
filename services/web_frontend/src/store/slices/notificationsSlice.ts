import type { StateCreator } from 'zustand';
import type { AppState, NotificationsSlice } from '../types';
import type { AppNotification } from '@/types';
import { notificationsApi, mapNotificationDtoToApp } from '@/api/notifications';

const MAX_NOTIFICATIONS = 50;

const getStorageKey = (userGuid?: string) => `notifications_${userGuid || 'guest'}`;

export const createNotificationsSlice: StateCreator<AppState, [], [], NotificationsSlice> = (set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoadingNotifications: false,

  fetchNotifications: async () => {
    const currentUser = get().currentUser;
    if (!currentUser?.id) return;

    set({ isLoadingNotifications: true });
    try {
      const data = await notificationsApi.getNotifications({ limit: MAX_NOTIFICATIONS });
      const mapped = data.items.map(mapNotificationDtoToApp);
      const unread = data.unread_count;

      const key = getStorageKey(currentUser.id);
      try {
        localStorage.setItem(key, JSON.stringify(mapped));
      } catch {
        // LocalStorage fallback
      }

      set({ notifications: mapped, unreadCount: unread, isLoadingNotifications: false });
    } catch (e) {
      console.error('Failed to fetch notifications from server', e);
      set({ isLoadingNotifications: false });
    }
  },

  fetchUnreadCount: async () => {
    const currentUser = get().currentUser;
    if (!currentUser?.id) return;

    try {
      const count = await notificationsApi.getUnreadCount();
      set({ unreadCount: count });
    } catch (e) {
      console.error('Failed to fetch unread notification count', e);
    }
  },

  addNotification: (notifData) => {
    const state = get();
    const currentUser = state.currentUser;
    const key = getStorageKey(currentUser?.id);

    // Deduplication check: ignore if an identical notification was added in the last 60 seconds
    const now = Date.now();
    const isDuplicate = state.notifications.some((n) => {
      if (notifData.id && n.id === notifData.id) return true;
      const isSameContent =
        n.type === notifData.type &&
        n.title === notifData.title &&
        n.body === notifData.body &&
        n.field === notifData.field;
      if (!isSameContent) return false;
      const createdTime = new Date(n.createdAt).getTime();
      return now - createdTime < 60000;
    });

    if (isDuplicate) {
      return false;
    }

    const newNotif: AppNotification = {
      ...notifData,
      id: notifData.id || (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`),
      read: notifData.read ?? false,
      createdAt: notifData.createdAt || new Date().toISOString(),
    };

    const updated = [newNotif, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
    const unread = updated.filter((n) => !n.read).length;

    try {
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // LocalStorage error handling
    }

    set({ notifications: updated, unreadCount: unread });
    return true;
  },

  markNotificationRead: async (id) => {
    const state = get();
    const currentUser = state.currentUser;
    const key = getStorageKey(currentUser?.id);

    const updated = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    const unread = updated.filter((n) => !n.read).length;

    try {
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // LocalStorage error handling
    }

    set({ notifications: updated, unreadCount: unread });

    try {
      await notificationsApi.markAsRead(id);
    } catch (e) {
      console.error(`Failed to mark notification ${id} as read on server`, e);
    }
  },

  deleteNotification: async (id) => {
    const state = get();
    const currentUser = state.currentUser;
    const key = getStorageKey(currentUser?.id);

    const updated = state.notifications.filter((n) => n.id !== id);
    const unread = updated.filter((n) => !n.read).length;

    try {
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // LocalStorage error handling
    }

    set({ notifications: updated, unreadCount: unread });

    try {
      await notificationsApi.deleteNotification(id);
    } catch (e) {
      console.error(`Failed to delete notification ${id} on server`, e);
    }
  },

  markAllNotificationsRead: async () => {
    const state = get();
    const currentUser = state.currentUser;
    const key = getStorageKey(currentUser?.id);

    const updated = state.notifications.map((n) => ({ ...n, read: true }));

    try {
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // LocalStorage error handling
    }

    set({ notifications: updated, unreadCount: 0 });

    try {
      await notificationsApi.markAllAsRead();
    } catch (e) {
      console.error('Failed to mark all notifications as read on server', e);
    }
  },

  loadNotificationsFromStorage: (userGuid) => {
    const key = getStorageKey(userGuid);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: AppNotification[] = JSON.parse(raw);
        const unread = parsed.filter((n) => !n.read).length;
        set({ notifications: parsed, unreadCount: unread });
        return;
      }
    } catch {
      // Ignore JSON parse errors
    }
    set({ notifications: [], unreadCount: 0 });
  },

  clearNotifications: async () => {
    const state = get();
    const currentUser = state.currentUser;
    const key = getStorageKey(currentUser?.id);
    try {
      localStorage.removeItem(key);
    } catch {
      // LocalStorage error handling
    }
    set({ notifications: [], unreadCount: 0 });

    try {
      await notificationsApi.clearNotifications();
    } catch (e) {
      console.error('Failed to clear notifications on server', e);
    }
  },
});
