import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

import { getWsToken } from '../api/auth';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const THROTTLE_MS = 2000; // 2 seconds

export const usePresence = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const statusRef = useRef<'online' | 'away' | 'offline'>('offline');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(0);
  
  const { setPresence, setBulkPresence, isAuthenticated } = useAppStore();

  useEffect(() => {
    if (!isAuthenticated) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      return;
    }

    const connect = async () => {
      try {
        const token = await getWsToken();
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
          }
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      ws.onclose = () => {
        statusRef.current = 'offline';
        // Try to reconnect in 5 seconds
        setTimeout(connect, 5000);
      };
      } catch (err) {
        console.error('Failed to setup presence WS', err);
        setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
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

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isAuthenticated]);
};
