// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OUMappingValue } from '@/api/settings';
import { OuMappingPanel } from './OuMappingPanel';

vi.mock('@/api/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/settings')>();
  return {
    ...actual,
    settingsApi: {
      ...actual.settingsApi,
      getADOus: vi.fn().mockResolvedValue({}),
    },
  };
});

afterEach(cleanup);

describe('OuMappingPanel', () => {
  it('keeps the page position when a color palette is opened for a lower row', () => {
    const mapping = Object.fromEntries(Array.from({ length: 40 }, (_, index) => [
      `OU_${index}`,
      { org: `Предприятие ${index}`, color: '#2B5FE0' },
    ]));
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 1400 });

    render(<OuMappingPanel mapping={mapping} onSave={vi.fn()} />);
    const colorButtons = screen.getAllByRole('button', { name: 'Цвет предприятия' });
    fireEvent.click(colorButtons.at(-2)!);

    expect(screen.getByRole('listbox', { name: 'Палитра предприятия' })).toBeInTheDocument();
    expect(window.scrollY).toBe(1400);
    expect(scrollTo).not.toHaveBeenCalled();
    scrollTo.mockRestore();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  });

  it('selects enterprises rather than OU rows and assigns duplicate colors in bulk', async () => {
    const mapping: Record<string, OUMappingValue> = {
      OU_ALPHA_1: { org: 'Альфа', color: '#2B5FE0' },
      OU_ALPHA_2: { org: 'Альфа', color: '#2B5FE0' },
      OU_BETA: { org: 'Бета', color: '#0F9D58' },
    };
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<OuMappingPanel mapping={mapping} onSave={onSave} />);

    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Выбрать предприятие Альфа' })[0]);
    expect(screen.getByText('Выбрано предприятий: 1')).toBeInTheDocument();
    for (const checkbox of screen.getAllByRole('checkbox', { name: 'Выбрать предприятие Альфа' })) {
      expect(checkbox).toHaveAttribute('data-state', 'checked');
    }

    fireEvent.click(screen.getByRole('checkbox', { name: 'Выбрать предприятие Бета' }));
    expect(screen.getByText('Выбрано предприятий: 2')).toBeInTheDocument();

    const colorSelects = screen.getAllByRole('button', { name: 'Цвет предприятия' });
    fireEvent.click(colorSelects[0]);
    fireEvent.click(screen.getByRole('option', { name: 'Розовый' }));
    fireEvent.click(screen.getByRole('button', { name: 'Назначить цвет' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить маппинг' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      OU_ALPHA_1: { org: 'Альфа', color: '#DB2777' },
      OU_ALPHA_2: { org: 'Альфа', color: '#DB2777' },
      OU_BETA: { org: 'Бета', color: '#DB2777' },
    });
  });
});
