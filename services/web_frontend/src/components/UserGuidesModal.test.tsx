// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { UserGuidesModal } from './UserGuidesModal';

afterEach(cleanup);

describe('UserGuidesModal', () => {
  it('renders tour mode with step navigation', async () => {
    const onClose = vi.fn();
    render(<UserGuidesModal isOpen={true} onClose={onClose} initialMode="tour" />);

    expect(screen.getByText('Знакомство со справочником')).toBeInTheDocument();
    expect(screen.getByText('Мгновенный умный поиск')).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: /Далее/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText('Удобные карточки сотрудников')).toBeInTheDocument();
    });
  });

  it('renders catalog mode with guides list', () => {
    const onClose = vi.fn();
    render(<UserGuidesModal isOpen={true} onClose={onClose} initialMode="catalog" />);

    expect(screen.getByText('Руководство пользователя')).toBeInTheDocument();
    expect(screen.getByText('Как эффективно искать сотрудников')).toBeInTheDocument();
  });
});
