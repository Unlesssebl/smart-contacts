// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { SupportTicketsPanel } from './SupportTicketsPanel';
import { useAppStore } from '@/store/useAppStore';
import type { AppState } from '@/store/types';
import type { SupportTicket } from '@/types';

vi.mock('@/store/useAppStore');

afterEach(cleanup);

describe('SupportTicketsPanel', () => {
  it('renders empty state when there are no tickets', () => {
    vi.mocked(useAppStore).mockImplementation(((selector: (state: Partial<AppState>) => unknown) =>
      selector({
        supportTickets: [],
        closeSupportTicket: vi.fn(),
        reopenSupportTicket: vi.fn(),
      })) as unknown as typeof useAppStore);

    render(<SupportTicketsPanel />);
    expect(screen.getByText('Нет открытых обращений')).toBeInTheDocument();
  });

  it('renders tickets list when support tickets exist', () => {
    const mockTickets: SupportTicket[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_guid: '123e4567-e89b-12d3-a456-426614174001',
        sender_name: 'Иван Иванов',
        sender_contact: 'ivan@example.com',
        display_sender_name: 'Иван Иванов',
        display_sender_contact: 'ivan@example.com',
        department: 'IT Отдел',
        job_title: 'Инженер',
        is_guest: false,
        category: 'access',
        message: 'Не могу войти под своей учетной записью',
        status: 'open',
        closed_by: null,
        closer_name: null,
        closed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    vi.mocked(useAppStore).mockImplementation(((selector: (state: Partial<AppState>) => unknown) =>
      selector({
        supportTickets: mockTickets,
        closeSupportTicket: vi.fn(),
        reopenSupportTicket: vi.fn(),
      })) as unknown as typeof useAppStore);

    render(<SupportTicketsPanel />);
    expect(screen.getByText('Иван Иванов')).toBeInTheDocument();
    expect(screen.getByText('Не могу войти под своей учетной записью')).toBeInTheDocument();
    expect(screen.getByText('Закрыть обращение')).toBeInTheDocument();
  });
});
