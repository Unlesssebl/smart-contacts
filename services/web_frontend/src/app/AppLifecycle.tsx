import { useEffect } from 'react';
import { OverlayScrollbars } from 'overlayscrollbars';
import { usePresence } from '@/hooks/usePresence';
import { useAppStore } from '@/store/useAppStore';

export function AppLifecycle() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const currentUser = useAppStore((state) => state.currentUser);
  const fetchMyPendingFields = useAppStore((state) => state.fetchMyPendingFields);
  const loadNotificationsFromStorage = useAppStore((state) => state.loadNotificationsFromStorage);
  const fetchNotifications = useAppStore((state) => state.fetchNotifications);

  usePresence();

  useEffect(() => {
    if (isAuthenticated && currentUser?.id) {
      void fetchMyPendingFields();
      loadNotificationsFromStorage(currentUser.id);
      void fetchNotifications();
    }
  }, [isAuthenticated, currentUser?.id, fetchMyPendingFields, loadNotificationsFromStorage, fetchNotifications]);

  // Sync notifications when the user returns to the tab or regains window focus.
  // This is a cheap, event-driven fallback (no polling) that catches events
  // missed while the tab was in the background or the WS was reconnecting.
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void useAppStore.getState().fetchNotifications();
      }
    };

    const handleFocus = () => {
      void useAppStore.getState().fetchNotifications();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const instance = OverlayScrollbars(document.body, {
      scrollbars: {
        theme: 'os-theme-dark',
        autoHide: 'scroll',
        autoHideDelay: 800,
      },
    });

    return () => instance.destroy();
  }, []);

  return null;
}
