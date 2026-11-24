// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { UserProfile } from '@/types';

const profile: UserProfile = {
  id: 'user-a', full_name: 'User A', sam_account_name: 'user.a', role: 'employee',
  is_verified: true, is_protected: false, grace_period_left: 0,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function setup() {
  const { default: axios, AxiosError } = await import('axios');
  const { default: client } = await import('@/api/client');
  const { useAppStore: store } = await import('./useAppStore');
  const calls: string[] = [];
  const respond = (config: InternalAxiosRequestConfig, data: unknown = {}): AxiosResponse => ({
    config, data, status: 200, statusText: 'OK', headers: {},
  });
  const fail = (config: InternalAxiosRequestConfig, status?: number) => new AxiosError(
    'Request failed', status ? 'ERR_BAD_RESPONSE' : 'ERR_NETWORK', config, undefined,
    status ? { ...respond(config), status } : undefined,
  );
  client.defaults.adapter = async config => {
    calls.push(config.url || '');
    if (config.url === '/auth/me') return respond(config, profile);
    if (config.url === '/profile/me/change-requests') return respond(config, []);
    return respond(config);
  };
  return { axios, client, store, calls, respond, fail };
}

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('profile and login failures', () => {
  it.each([undefined, 500, 502, 503])('preserves an existing session on profile failure %s', async status => {
    const { client, store, fail, calls } = await setup();
    store.setState({ currentUser: profile, isAuthenticated: true });
    client.defaults.adapter = async config => {
      calls.push(config.url || '');
      throw fail(config, status);
    };
    await expect(store.getState().fetchMe()).rejects.toThrow('Request failed');
    expect(store.getState()).toMatchObject({ currentUser: profile, isAuthenticated: true });
    expect(calls).toEqual(['/auth/me']);
  });

  it.each([401, 403])('clears the session on confirmed authorization failure %s', async status => {
    const { axios, client, store, fail } = await setup();
    store.setState({ currentUser: profile, isAuthenticated: true });
    client.defaults.adapter = async config => { throw fail(config, status); };
    vi.spyOn(axios, 'post').mockRejectedValue(new axios.AxiosError(
      'Refresh rejected', 'ERR_BAD_REQUEST', undefined, undefined, { status } as AxiosResponse,
    ));
    await expect(store.getState().fetchMe()).rejects.toThrow();
    expect(store.getState()).toMatchObject({ currentUser: null, isAuthenticated: false });
  });

  it('reports login failure when credentials succeed but the profile cannot load', async () => {
    const { client, store, fail, respond, calls } = await setup();
    client.defaults.adapter = async config => {
      calls.push(config.url || '');
      if (config.url === '/auth/me') throw fail(config);
      return respond(config);
    };
    const result = await store.getState().login('user.a', 'test-password');
    expect(result).toEqual({ success: false, error: 'Не удалось загрузить профиль. Попробуйте войти ещё раз.' });
    expect(store.getState()).toMatchObject({ isAuthenticated: false, currentUser: null });
    expect(calls).toEqual(['/auth/login', '/auth/me']);
  });

  it('reports success only after loading the profile', async () => {
    const { store } = await setup();
    expect(await store.getState().login('user.a', 'test-password')).toEqual({ success: true });
    expect(store.getState()).toMatchObject({ isAuthenticated: true, currentUser: profile });
  });
});

describe('session boundaries', () => {
  it('ignores a profile response that arrives after logout', async () => {
    const { client, store, respond } = await setup();
    store.setState({ currentUser: profile, isAuthenticated: true });
    const started = deferred<InternalAxiosRequestConfig>();
    const response = deferred<AxiosResponse>();
    client.defaults.adapter = async config => {
      if (config.url === '/auth/me') { started.resolve(config); return response.promise; }
      return respond(config);
    };
    const pending = store.getState().fetchMe();
    const rejected = expect(pending).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    const config = await started.promise;
    await store.getState().logout();
    response.resolve(respond(config, profile));
    await rejected;
    expect(store.getState()).toMatchObject({ isAuthenticated: false, currentUser: null });
  });

  it('cancels a pending login when logout occurs before the login response', async () => {
    const { client, store, respond, calls } = await setup();
    const started = deferred<InternalAxiosRequestConfig>();
    const response = deferred<AxiosResponse>();
    client.defaults.adapter = async config => {
      calls.push(config.url || '');
      started.resolve(config);
      return response.promise;
    };
    const pending = store.getState().login('user.a', 'test-password');
    const config = await started.promise;
    await store.getState().logout();
    response.resolve(respond(config));
    expect((await pending).success).toBe(false);
    expect(calls).toEqual(['/auth/login']);
    expect(store.getState().isAuthenticated).toBe(false);
  });

  it('does not restore old notifications or their storage after a new session for the same user', async () => {
    const { client, store, respond } = await setup();
    store.setState({ currentUser: profile, isAuthenticated: true });
    const started = deferred<InternalAxiosRequestConfig>();
    const response = deferred<AxiosResponse>();
    client.defaults.adapter = async config => { started.resolve(config); return response.promise; };
    const pending = store.getState().fetchNotifications();
    const config = await started.promise;
    store.getState().resetSession();
    store.setState({ currentUser: profile, isAuthenticated: true, unreadCount: 7 });
    response.resolve(respond(config, { items: [], unread_count: 9 }));
    await pending;
    expect(store.getState()).toMatchObject({ notifications: [], unreadCount: 7 });
    expect(localStorage.getItem(`notifications_${profile.id}`)).toBeNull();
  });

  it('does not clear new pending fields when an old request fails', async () => {
    const { client, store, fail } = await setup();
    store.setState({ currentUser: profile, isAuthenticated: true });
    const started = deferred<InternalAxiosRequestConfig>();
    const response = deferred<AxiosResponse>();
    client.defaults.adapter = async config => { started.resolve(config); return response.promise; };
    const pending = store.getState().fetchMyPendingFields();
    const config = await started.promise;
    store.getState().resetSession();
    store.setState({ currentUser: profile, isAuthenticated: true, pendingFields: { department: 'New' } });
    response.reject(fail(config, 503));
    await pending;
    expect(store.getState().pendingFields).toEqual({ department: 'New' });
    expect(store.getState().adSyncUnavailable).toBe(false);
  });

  it.each(['success', 'failure'])('ignores an old refresh %s after a new login', async outcome => {
    const { axios, client, store, respond, fail } = await setup();
    const refresh = deferred<AxiosResponse>();
    const refreshCall = vi.spyOn(axios, 'post').mockReturnValue(refresh.promise);
    client.defaults.adapter = async config => {
      if (config.url === '/users') throw fail(config, 401);
      if (config.url === '/auth/me') return respond(config, profile);
      return respond(config, []);
    };
    const pending = Promise.allSettled([client.get('/users')]);
    await vi.waitFor(() => expect(refreshCall).toHaveBeenCalledTimes(1));
    expect((await store.getState().login('user.a', 'test-password')).success).toBe(true);
    if (outcome === 'success') refresh.resolve({ data: {} } as AxiosResponse);
    else refresh.reject(new axios.AxiosError('Old refresh failed', 'ERR_BAD_REQUEST', undefined, undefined, { status: 401 } as AxiosResponse));
    expect((await pending)[0].status).toBe('rejected');
    expect(store.getState()).toMatchObject({ currentUser: profile, isAuthenticated: true });
    expect(refreshCall).toHaveBeenCalledTimes(1);
  });

  it('clears user data and moderation marks on reset', async () => {
    const { store } = await setup();
    store.setState({
      currentUser: profile, isAuthenticated: true, users: [profile],
      pendingFields: { department: 'Old' }, rejectedFields: { office_location: true },
      globalPresence: { 'user-a': 'online' }, searchQuery: 'Old',
      filters: { department: 'Old' }, initialLoaded: true, totalUsers: 1,
    });
    const version = store.getState().sessionVersion;
    store.getState().resetSession();
    expect(store.getState()).toMatchObject({
      sessionVersion: version + 1, currentUser: null, isAuthenticated: false,
      users: [], pendingFields: null, rejectedFields: {}, globalPresence: {},
      searchQuery: '', filters: {}, initialLoaded: false, totalUsers: 0,
      supportTickets: [], securityIncidents: [], ldapSettings: null,
    });
  });
});
