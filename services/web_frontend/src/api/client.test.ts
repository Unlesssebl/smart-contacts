// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { AxiosAdapter, AxiosResponse } from 'axios';

async function setup() {
  const { default: axios, AxiosError } = await import('axios');
  const { default: client } = await import('./client');
  const { useAppStore } = await import('@/store/useAppStore');
  useAppStore.setState({ isAuthenticated: true, unreadCount: 3 });
  const calls: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    calls.push(`${config.method} ${config.url}`);
    const response: AxiosResponse = {
      config, data: {}, status: 401, statusText: 'Unauthorized', headers: {},
    };
    if (config.url === '/auth/login') {
      return { ...response, status: 200, statusText: 'OK' };
    }
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, response);
  };
  client.defaults.adapter = adapter;
  const refreshError = new AxiosError('Refresh rejected', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 401,
  } as AxiosResponse);
  return { axios, client, useAppStore, calls, refreshError };
}

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
});

afterEach(() => vi.restoreAllMocks());

describe('session expiration', () => {
  it('shares a failed refresh, resets locally once, and blocks late refresh attempts', async () => {
    const { axios, client, useAppStore, calls, refreshError } = await setup();
    let rejectRefresh!: (reason: unknown) => void;
    const refresh = vi.spyOn(axios, 'post').mockImplementation(() => new Promise((_, reject) => {
      rejectRefresh = reject;
    }));
    const reset = vi.spyOn(useAppStore.getState(), 'resetSession');
    const pending = Promise.allSettled([client.get('/users'), client.get('/notifications')]);
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    rejectRefresh(refreshError);
    expect((await pending).map(result => result.status)).toEqual(['rejected', 'rejected']);
    await expect(client.get('/users')).rejects.toThrow('Unauthorized');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState()).toMatchObject({
      isAuthenticated: false, currentUser: null, notifications: [], unreadCount: 0,
    });
    expect(calls).toEqual(['get /users', 'get /notifications', 'get /users']);
  });

  it('refreshes the session when the websocket token request is rejected', async () => {
    const { axios, client, calls } = await setup();
    let wsTokenAttempts = 0;
    client.defaults.adapter = async (config) => {
      calls.push(`${config.method} ${config.url}`);
      const response: AxiosResponse = {
        config, data: {}, status: 401, statusText: 'Unauthorized', headers: {},
      };
      if (config.url === '/auth/ws-token') {
        wsTokenAttempts += 1;
        if (wsTokenAttempts === 1) {
          throw new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, response);
        }
        return { ...response, status: 200, statusText: 'OK', data: { ws_token: 'fresh-token' } };
      }
      return { ...response, status: 200, statusText: 'OK' };
    };
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });

    await expect(client.get('/auth/ws-token')).resolves.toMatchObject({
      data: { ws_token: 'fresh-token' },
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['get /auth/ws-token', 'get /auth/ws-token']);
  });

  it('allows refresh again after a successful login', async () => {
    const { axios, client, refreshError } = await setup();
    const refresh = vi.spyOn(axios, 'post').mockRejectedValue(refreshError);
    await expect(client.get('/users')).rejects.toThrow('Refresh rejected');
    await client.post('/auth/login');
    await expect(client.get('/users')).rejects.toThrow('Refresh rejected');
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('retries each concurrent request at most once after successful refresh', async () => {
    const { axios, client, calls } = await setup();
    let resolveRefresh!: (value: unknown) => void;
    const refresh = vi.spyOn(axios, 'post').mockImplementation(() => new Promise(resolve => {
      resolveRefresh = resolve;
    }));
    const pending = Promise.allSettled([client.get('/users'), client.get('/notifications')]);
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    resolveRefresh({ data: {} });
    expect((await pending).every(result => result.status === 'rejected')).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls.filter(call => call === 'get /users')).toHaveLength(2);
    expect(calls.filter(call => call === 'get /notifications')).toHaveLength(2);
  });

  it('does not expire the session permanently after a temporary refresh failure', async () => {
    const { axios, client, useAppStore } = await setup();
    const refresh = vi.spyOn(axios, 'post').mockRejectedValue(new Error('Network Error'));
    await expect(client.get('/users')).rejects.toThrow('Network Error');
    expect(useAppStore.getState().isAuthenticated).toBe(true);
    await expect(client.get('/users')).rejects.toThrow('Network Error');
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('logs out once without deleting server notifications or refreshing logout', async () => {
    const { axios, useAppStore, calls } = await setup();
    const refresh = vi.spyOn(axios, 'post');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('notifications_guest', '[]');
    await Promise.all([useAppStore.getState().logout(), useAppStore.getState().logout()]);
    expect(calls).toEqual(['post /auth/logout']);
    expect(refresh).not.toHaveBeenCalled();
    expect(localStorage.getItem('notifications_guest')).toBeNull();
    expect(useAppStore.getState().unreadCount).toBe(0);
  });

  it('preserves explicit server deletion from the clear notifications action', async () => {
    const { client, useAppStore, calls } = await setup();
    client.defaults.adapter = async config => {
      calls.push(`${config.method} ${config.url}`);
      return { config, data: {}, status: 200, statusText: 'OK', headers: {} };
    };
    await useAppStore.getState().clearNotifications();
    expect(calls).toEqual(['delete /notifications']);
    expect(useAppStore.getState().unreadCount).toBe(0);
  });
});
