import { useEffect } from 'react';
import { OverlayScrollbars } from 'overlayscrollbars';
import { usePresence } from '@/hooks/usePresence';
import { useAppStore } from '@/store/useAppStore';

export function AppLifecycle() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const fetchMyPendingFields = useAppStore((state) => state.fetchMyPendingFields);

  usePresence();

  useEffect(() => {
    if (isAuthenticated) {
      void fetchMyPendingFields();
    }
  }, [isAuthenticated, fetchMyPendingFields]);

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
