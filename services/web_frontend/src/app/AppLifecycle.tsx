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
