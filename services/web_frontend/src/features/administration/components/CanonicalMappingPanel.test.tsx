// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CanonicalMappingPanel } from './CanonicalMappingPanel';

vi.mock('@/api/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/settings')>();
  return {
    ...actual,
    settingsApi: {
      ...actual.settingsApi,
      getCanonicalSuggestions: vi.fn().mockResolvedValue({
        departments: [
          {
            suggested_canonical: 'Планово-экономический отдел',
            variants: ['ПЭО', 'ПЭО мк'],
          },
        ],
        job_titles: [],
      }),
    },
  };
});

afterEach(cleanup);

describe('CanonicalMappingPanel', () => {
  it('renders existing mappings and applies AI suggestions', async () => {
    const deptMapping = {
      ОТиЗ: 'Отдел труда и заработной платы',
    };
    const jobTitleMapping = {
      'зам начальника': 'Заместитель начальника',
    };
    const onSaveDept = vi.fn().mockResolvedValue(undefined);
    const onSaveJob = vi.fn().mockResolvedValue(undefined);

    render(
      <CanonicalMappingPanel
        deptMapping={deptMapping}
        jobTitleMapping={jobTitleMapping}
        onSaveDeptMapping={onSaveDept}
        onSaveJobTitleMapping={onSaveJob}
      />,
    );

    // Check existing dept mapping is displayed
    expect(screen.getByText('Отдел труда и заработной платы')).toBeInTheDocument();
    expect(screen.getByText('ОТиЗ')).toBeInTheDocument();

    // Check suggestions rendered
    await waitFor(() => {
      expect(screen.getByText('Планово-экономический отдел')).toBeInTheDocument();
      expect(screen.getByText('ПЭО')).toBeInTheDocument();
    });

    // Click "Объединить" on the suggestion
    const mergeBtn = screen.getByRole('button', { name: /объединить/i });
    fireEvent.click(mergeBtn);

    // Verify it added to active list
    expect(screen.getAllByText('Планово-экономический отдел').length).toBeGreaterThan(0);

    // Save button should be active
    const saveBtn = screen.getByRole('button', { name: /сохранить справочник/i });
    expect(saveBtn).not.toBeDisabled();

    fireEvent.click(saveBtn);
    await waitFor(() => expect(onSaveDept).toHaveBeenCalledTimes(1));
    expect(onSaveDept).toHaveBeenCalledWith(
      expect.objectContaining({
        ОТиЗ: 'Отдел труда и заработной платы',
        ПЭО: 'Планово-экономический отдел',
        'ПЭО мк': 'Планово-экономический отдел',
      }),
    );
  });
});
