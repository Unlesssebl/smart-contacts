// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { EmployeeCard } from './EmployeeCard';

vi.mock('./ReportModal', () => ({
  ReportModal: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Исправление данных">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        Закрыть
      </button>
    </div>
  ),
}));

const baseUser: User = {
  id: 'employee-1',
  full_name: 'Иванов Иван Иванович',
  job_title: 'Ведущий инженер',
  organization: 'Альфа',
  department: 'Технический отдел',
  email: 'ivanov@example.test',
  internal_phone: '37-09',
  mobile_phone: '+7 999 123-45-67',
  office_location: 'Корпус 1, кабинет 203',
  presence: 'online',
  role: 'employee',
};

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });

  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
});

beforeEach(() => {
  useAppStore.setState({
    searchQuery: '',
    currentUser: null,
    orgColors: { 'Альфа': '#0F9D58' },
  });
});

afterEach(cleanup);

describe('EmployeeCard', () => {
  it('keeps fixed geometry and valid interactive nesting', () => {
    const { container } = render(<EmployeeCard user={baseUser} onClick={vi.fn()} />);
    const card = container.querySelector('[data-card]');

    expect(card).toBeInstanceOf(HTMLElement);
    expect(card).toHaveClass('h-[328px]');
    expect(card?.tagName).toBe('ARTICLE');
    expect(card?.querySelector('button button')).toBeNull();
    expect(screen.getByRole('button', { name: `Открыть профиль: ${baseUser.full_name}` })).toBeInTheDocument();
  });

  it('keeps all four positions when only some contacts are present', () => {
    render(
      <EmployeeCard
        user={{ ...baseUser, email: null, mobile_phone: null }}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Email: Не указано')).toBeInTheDocument();
    expect(screen.getByLabelText('Внутренний телефон: 37-09')).toBeInTheDocument();
    expect(screen.getByLabelText('Мобильный телефон: Не указано')).toBeInTheDocument();
    expect(screen.getByLabelText('Расположение: Корпус 1, кабинет 203')).toBeInTheDocument();
  });

  it('uses one fixed-size empty state when every contact is absent', () => {
    const { container } = render(
      <EmployeeCard
        user={{
          ...baseUser,
          email: '  ',
          internal_phone: null,
          mobile_phone: '[]',
          office_location: undefined,
        }}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText('Контакты не указаны')).toHaveClass('h-[158px]');
    expect(container.querySelector('[data-card]')).toHaveClass('h-[328px]');
  });

  it('moves organization into the tab and keeps only the department in the header', () => {
    const { rerender } = render(
      <EmployeeCard
        user={{ ...baseUser, organization: '  Альфа ', department: 'альфа' }}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Альфа')).toHaveLength(1);
    expect(document.querySelector('[data-organization-tab]')).toHaveStyle({ backgroundColor: '#0F9D58' });

    rerender(
      <EmployeeCard
        user={{ ...baseUser, organization: null, department: 'Отдел автоматизации' }}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText('Отдел автоматизации').closest('.font-normal')).not.toBeNull();
    expect(screen.getByText('Без организации')).toBeInTheDocument();
  });

  it('shows the organization mapping value unchanged in the organization-colored tab', () => {
    useAppStore.setState({ orgColors: { 'АО НТЗ ТЭМ-ПО': '#D97706' } });
    const { container } = render(
      <EmployeeCard
        user={{ ...baseUser, organization: 'АО НТЗ ТЭМ-ПО', department: 'Технический отдел' }}
        onClick={vi.fn()}
      />,
    );

    const tab = container.querySelector('[data-organization-tab]');
    expect(tab).toHaveTextContent('АО НТЗ ТЭМ-ПО');
    expect(tab).toHaveStyle({ backgroundColor: '#D97706', color: '#102F4A' });
  });

  it('opens profile once and keeps the edit action independent', () => {
    const openProfile = vi.fn();
    render(<EmployeeCard user={baseUser} onClick={openProfile} />);

    fireEvent.click(screen.getByRole('button', { name: `Открыть профиль: ${baseUser.full_name}` }));
    expect(openProfile).toHaveBeenCalledTimes(1);

    const editButton = screen.getByRole('button', { name: 'Исправить' });
    fireEvent.click(editButton);
    expect(openProfile).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog', { name: 'Исправление данных' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(editButton).toHaveFocus();
  });
});
