import type { StateCreator } from 'zustand';
import type { AppState, NotificationsSlice } from '../types';
import type { AppNotification } from '@/types';

const MAX_NOTIFICATIONS = 50;

const getStorageKey = (userGuid?: string) => `notifications_${userGuid || 'guest'}`;

export const createNotificationsSlice: StateCreator<AppState, [], [], NotificationsSlice> = (set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notifData) => {
    const state = get();
    const currentUser = state.currentUser;
    const key = getStorageKey(currentUser?.id);

    const newNotif: AppNotification = {
      ...notifData,
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [newNotif, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
    const unread = updated.filter((n) => !n.read).length;

    try {
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // LocalStorage error handling
    }

    set({ notifications: updated, unreadCount: unread });
  },

  markNotificationRead: (id) => {
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
  },

  markAllNotificationsRead: () => {
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

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },
});
