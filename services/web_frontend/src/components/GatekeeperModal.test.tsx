// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { GatekeeperModal } from './GatekeeperModal';
import { useAppStore } from '@/store/useAppStore';
import type { UserProfile } from '@/types';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockUser: UserProfile = {
  id: 'user-1',
  object_guid: 'user-1',
  sam_account_name: 'test.user',
  full_name: 'Тестовый Пользователь',
  email: 'test@company.loc',
  internal_phone: '10-20',
  mobile_phone: '+7 999 000 00 00',
  organization: 'АО ТЭМПО',
  department: 'ИТ',
  job_title: 'Инженер',
  office_location: '402',
  avatar_color: '#3B7FB2',
  is_verified: false,
  grace_period_left: 3,
  is_protected: false,
  role: 'employee',
};

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

describe('GatekeeperModal', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useAppStore.setState({
      currentUser: mockUser,
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders verification modal when user is not verified and on directory page', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <GatekeeperModal />
      </MemoryRouter>,
    );

    expect(screen.getByText('Проверка контактных данных')).toBeInTheDocument();
    expect(screen.getByText('Перейти к проверке')).toBeInTheDocument();
    expect(screen.getByText('Напомнить позже')).toBeInTheDocument();
  });

  it('does not render on profile page', () => {
    render(
      <MemoryRouter initialEntries={['/profile/user-1']}>
        <GatekeeperModal />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Проверка контактных данных')).not.toBeInTheDocument();
  });

  it('dismisses gatekeeper and navigates on click', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <GatekeeperModal />
      </MemoryRouter>,
    );

    const checkBtn = screen.getByRole('button', { name: 'Перейти к проверке' });
    fireEvent.click(checkBtn);

    expect(window.sessionStorage.getItem('gatekeeper_dismissed_user-1')).toBe('true');
  });

  it('skips gatekeeper on remind later', async () => {
    const acknowledgeGatekeeper = vi.fn().mockResolvedValue({ success: true });
    useAppStore.setState({ acknowledgeGatekeeper });

    render(
      <MemoryRouter initialEntries={['/']}>
        <GatekeeperModal />
      </MemoryRouter>,
    );

    const remindBtn = screen.getByRole('button', { name: 'Напомнить позже' });
    fireEvent.click(remindBtn);

    expect(acknowledgeGatekeeper).toHaveBeenCalledWith('skip');
    expect(window.sessionStorage.getItem('gatekeeper_dismissed_user-1')).toBe('true');
  });
});
