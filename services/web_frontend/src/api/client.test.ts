// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import apiClient, { getCookie } from './client';
import { useAppStore } from '@/store/useAppStore';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  const mockPost = vi.fn();
  const mockCreate = vi.fn(() => {
    const instance = actual.default.create();
    return instance;
  });
  return {
    ...actual,
    default: {
      ...actual.default,
      create: mockCreate,
      post: mockPost,
    },
  };
});

describe('apiClient interceptor & auth error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      isAuthenticated: false,
      currentUser: null,
      adSyncUnavailable: false,
      isApiDown: false,
    });
    document.cookie = '';
  });

  it('should extract cookie correctly with getCookie', () => {
    document.cookie = 'csrf_token=test_csrf_value';
    document.cookie = 'other_cookie=123';
    expect(getCookie('csrf_token')).toBe('test_csrf_value');
    expect(getCookie('other_cookie')).toBe('123');
    expect(getCookie('nonexistent')).toBeNull();
  });

  it('does not trigger refresh when request is an auth endpoint', async () => {
    useAppStore.setState({ isAuthenticated: true });

    const authUrls = [
      '/auth/sso',
      '/auth/login',
      '/auth/refresh',
      '/auth/logout',
      '/auth/ws-token',
    ];

    for (const url of authUrls) {
      const error = {
        config: { url },
        response: { status: 401 },
      };

      const handlers = (apiClient.interceptors.response as unknown as {
        handlers: Array<{ rejected: (err: unknown) => Promise<unknown> }>;
      }).handlers;
      const responseInterceptor = handlers[0].rejected;

      await expect(responseInterceptor(error)).rejects.toEqual(error);
      expect(axios.post).not.toHaveBeenCalled();
    }
  });

  it('does not trigger refresh when user is not authenticated', async () => {
    useAppStore.setState({ isAuthenticated: false });

    const error = {
      config: { url: '/users' },
      response: { status: 401 },
    };

    const handlers = (apiClient.interceptors.response as unknown as {
      handlers: Array<{ rejected: (err: unknown) => Promise<unknown> }>;
    }).handlers;
    const responseInterceptor = handlers[0].rejected;

    await expect(responseInterceptor(error)).rejects.toEqual(error);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('triggers logout safely without reentrancy when refresh fails', async () => {
    useAppStore.setState({ isAuthenticated: true });
    vi.mocked(axios.post).mockRejectedValueOnce({ response: { status: 401 } });

    const logoutSpy = vi.spyOn(useAppStore.getState(), 'logout');

    const error = {
      config: { url: '/users' },
      response: { status: 401 },
    };

    const handlers = (apiClient.interceptors.response as unknown as {
      handlers: Array<{ rejected: (err: unknown) => Promise<unknown> }>;
    }).handlers;
    const responseInterceptor = handlers[0].rejected;

    await expect(responseInterceptor(error)).rejects.toBeDefined();
    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().isAuthenticated).toBe(false);
  });
});
