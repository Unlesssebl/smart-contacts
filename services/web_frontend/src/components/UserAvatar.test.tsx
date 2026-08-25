// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { UserAvatar } from './UserAvatar';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(cleanup);

describe('UserAvatar presence', () => {
  it.each([
    ['online', 'Статус: В сети'],
    ['away', 'Статус: Отошёл'],
    ['offline', 'Статус: Не в сети'],
  ])('renders a semantic marker for %s', (presence, accessibleName) => {
    render(<UserAvatar name="Иванов Иван" presence={presence} />);
    expect(screen.getByRole('img', { name: accessibleName })).toBeInTheDocument();
  });

  it('does not mistake an unknown status for offline', () => {
    render(<UserAvatar name="Иванов Иван" presence="reconnecting" />);
    expect(screen.queryByRole('img')).toBeNull();
  });
});
