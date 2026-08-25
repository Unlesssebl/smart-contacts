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
  it('renders existing OU mapping rows and allows saving updated organization name', async () => {
    const mapping: Record<string, OUMappingValue> = {
      OU_ALPHA: { org: 'Альфа' },
      OU_BETA: { org: 'Бета' },
    };
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<OuMappingPanel mapping={mapping} onSave={onSave} />);

    expect(screen.getByText('OU_ALPHA')).toBeInTheDocument();
    expect(screen.getByText('OU_BETA')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Сохранить маппинг' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      OU_ALPHA: { org: 'Альфа' },
      OU_BETA: { org: 'Бета' },
    });
  });
});
