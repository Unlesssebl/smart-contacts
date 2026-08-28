// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SpotlightSearch } from './SpotlightSearch';
import { useAppStore } from '@/store/useAppStore';

beforeEach(() => {
  useAppStore.setState({
    searchQuery: '',
    filters: {},
    departments: ['ИТ отдел', 'Бухгалтерия'],
    organizations: ['АО ТЭМПО'],
    jobTitles: ['Инженер'],
    currentUser: {
      id: 'test-user',
      full_name: 'Тестовый Пользователь',
      sam_account_name: 'test.user',
      role: 'employee',
      is_verified: true,
      is_protected: false,
      grace_period_left: 3,
    },
  });
});

afterEach(cleanup);

describe('SpotlightSearch - В сети filter', () => {
  it('renders "В сети" switch in filters panel and toggles filter on change', () => {
    render(<SpotlightSearch />);

    // Open filters panel
    const filterBtn = screen.getByRole('button', { name: /Фильтры/i });
    fireEvent.click(filterBtn);

    // Find the "В сети" switch
    const onlineSwitch = screen.getByLabelText('В сети');
    expect(onlineSwitch).toBeInTheDocument();
    expect(onlineSwitch).not.toBeChecked();

    // Toggle switch on
    fireEvent.click(onlineSwitch);
    expect(useAppStore.getState().filters.is_online).toBe(true);
  });

  it('resets "В сети" filter when "Очистить всё" is clicked', () => {
    useAppStore.setState({
      filters: { is_online: true },
    });

    render(<SpotlightSearch />);

    // Open filters panel if not already open
    const clearBtn = screen.getByRole('button', { name: /Очистить всё/i });
    expect(clearBtn).not.toBeDisabled();

    fireEvent.click(clearBtn);
    expect(useAppStore.getState().filters.is_online).toBe(false);
  });
});
