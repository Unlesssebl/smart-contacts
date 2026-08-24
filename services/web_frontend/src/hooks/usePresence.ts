import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

import { getWsToken } from '@/api/auth';
import { usersApi } from '@/api/users';
import { toast } from 'sonner';
import { getAttributeLabel } from '@/lib/localization';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const THROTTLE_MS = 2000; // 2 seconds

export const usePresence = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const statusRef = useRef<'online' | 'away' | 'offline'>('offline');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isActiveRef = useRef<boolean>(false); // tracks whether the current effect is still alive
  
  const { setPresence, setBulkPresence, isAuthenticated } = useAppStore(
    useShallow((state) => ({
      setPresence: state.setPresence,
      setBulkPresence: state.setBulkPresence,
      isAuthenticated: state.isAuthenticated,
    })),
  );

  useEffect(() => {
    if (!isAuthenticated) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      return;
    }

    isActiveRef.current = true;

    const connect = async () => {
      if (!isActiveRef.current) return;
      try {
        const token = await getWsToken();
        if (!isActiveRef.current) return; // logged out while waiting for token
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
        let wsUrl = '';
        
        if (baseUrl.startsWith('http')) {
          wsUrl = baseUrl.replace(/^http/, 'ws') + `/ws/presence?token=${token}`;
        } else {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${window.location.host}${baseUrl}/ws/presence?token=${token}`;
        }
        
        const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Presence] WebSocket connected successfully!');
        statusRef.current = 'online';
        reconnectAttemptsRef.current = 0; // reset attempts on success
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'full_state') {
            console.log('[Presence] Received full state:', data.data);
            setBulkPresence(data.data);
          } else if (data.type === 'presence_update') {
            console.log('[Presence] Received update:', data.user_id, data.status);
            setPresence(data.user_id, data.status);
          } else if (data.type === 'admin_update') {
            if (window.location.pathname.includes('/admin')) {
              useAppStore.getState().fetchAdminData();
            }
          } else if (data.type === 'ldap_status_updated') {
            if (window.location.pathname.includes('/admin')) {
              useAppStore.getState().fetchLDAPSettings(true);
            }
          } else if (data.type === 'profile_updated') {
            const state = useAppStore.getState();
            const currentUser = state.currentUser;
            if (currentUser && currentUser.id === data.user_id) {
              state.fetchMyPendingFields();
              usersApi.getUserByGuid(data.user_id).then((user) => {
                state.updateUserInStore(user.id, user);
              });

              if (Array.isArray(data.applied_fields) && data.applied_fields.length > 0) {
                data.applied_fields.forEach((field: string) => {
                  const label = getAttributeLabel(field);
                  state.addNotification({
                    type: 'field_applied',
                    title: `${label.charAt(0).toUpperCase() + label.slice(1)} обновлён`,
                    body: `Ваша заявка на изменение поля «${label}» принята и успешно применена в Active Directory`,
                    field,
                  });
                  toast.success(`✓ Ваш ${label} обновлён и применён`);
                });
              }

              if (Array.isArray(data.rejected_fields) && data.rejected_fields.length > 0) {
                data.rejected_fields.forEach((field: string) => {
                  const label = getAttributeLabel(field);
                  state.markFieldRejected(field);
                  state.addNotification({
                    type: 'field_rejected',
                    title: `Заявка на «${label}» отклонена`,
                    body: `Заявка на изменение поля «${label}» была отклонена администратором`,
                    field,
                  });
                  toast.warning(`Заявка на изменение поля «${label}» отклонена`);
                });
              }
            }
          } else if (data.type === 'ticket_closed') {
            const state = useAppStore.getState();
            const currentUser = state.currentUser;
            if (currentUser && currentUser.id === data.user_guid) {
              state.addNotification({
                type: 'ticket_closed',
                title: 'Обращение в поддержку рассмотрено',
                body: 'Ваше обращение в службу поддержки было закрыто администратором',
              });
              toast.info('✓ Ваше обращение в службу поддержки рассмотрено');
            }
          }
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      ws.onclose = () => {
        statusRef.current = 'offline';
        if (isActiveRef.current) {
          const delay = Math.min(1000 * (2 ** reconnectAttemptsRef.current) + Math.random() * 1000, 30000);
          reconnectAttemptsRef.current += 1;
          reconnectTimerRef.current = setTimeout(connect, delay);
        }
      };
      } catch (err) {
        console.error('Failed to setup presence WS', err);
        if (isActiveRef.current) {
          const delay = Math.min(1000 * (2 ** reconnectAttemptsRef.current) + Math.random() * 1000, 30000);
          reconnectAttemptsRef.current += 1;
          reconnectTimerRef.current = setTimeout(connect, delay);
        }
      }
    };

    connect();

    return () => {
      isActiveRef.current = false; // stop any pending reconnects
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, setPresence, setBulkPresence]);

  // Activity tracking
  useEffect(() => {
    if (!isAuthenticated) return;

    const setAway = () => {
      if (statusRef.current === 'online' && wsRef.current?.readyState === WebSocket.OPEN) {
        statusRef.current = 'away';
        wsRef.current.send(JSON.stringify({ action: 'set_presence', status: 'away' }));
      }
    };

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current < THROTTLE_MS) return;
      lastActivityRef.current = now;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(setAway, INACTIVITY_TIMEOUT);

      if (statusRef.current === 'away' && wsRef.current?.readyState === WebSocket.OPEN) {
        statusRef.current = 'online';
        wsRef.current.send(JSON.stringify({ action: 'set_presence', status: 'online' }));
      }
    };

    // Initial timer start
    handleActivity();

    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('click', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isAuthenticated]);
};
