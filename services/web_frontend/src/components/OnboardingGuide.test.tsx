// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { OnboardingGuide } from './OnboardingGuide';
import { useAppStore } from '@/store/useAppStore';
import type { CurrentUser } from '@/types';

afterEach(cleanup);

const mockUser: CurrentUser = {
  id: 'user-1',
  object_guid: 'guid-1',
  sam_account_name: 'test.user',
  full_name: 'Тестовый Пользователь',
  first_name: 'Тестовый',
  last_name: 'Пользователь',
  middle_name: '',
  title: 'Инженер',
  company: 'АО НТЗ',
  department: 'ИТ отдел',
  work_phone: '',
  internal_phone: '2040',
  mobile_phone: '',
  email: 'test@example.com',
  city: '',
  cabinet: '',
  is_active: true,
  is_verified: true,
  grace_period_left: 0,
  organization: 'АО НТЗ ТЭМ-ПО',
  is_admin: false,
};

describe('OnboardingGuide', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    useAppStore.setState({ currentUser: mockUser });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens onboarding modal after delay when not completed', async () => {
    render(<OnboardingGuide />);

    expect(screen.queryByText('Знакомство со справочником')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByText('Знакомство со справочником')).toBeInTheDocument();
  });

  it('does not open onboarding modal when already completed in localStorage', () => {
    localStorage.setItem('smart_contacts_onboarding_completed', 'true');
    render(<OnboardingGuide />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('Знакомство со справочником')).not.toBeInTheDocument();
  });
});
