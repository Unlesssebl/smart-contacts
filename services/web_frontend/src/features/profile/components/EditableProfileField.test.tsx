// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { Phone } from 'lucide-react';
import { EditableProfileField } from './EditableProfileField';

afterEach(() => {
  cleanup();
});

describe('EditableProfileField', () => {
  it('renders field label and value in view mode', () => {
    render(
      <EditableProfileField
        icon={Phone}
        label="Внутренний телефон"
        value="12-34"
      />,
    );

    expect(screen.getByText('Внутренний телефон')).toBeInTheDocument();
    expect(screen.getByText('12-34')).toBeInTheDocument();
  });

  it('renders "Не указано" badge when value is empty in view mode', () => {
    render(
      <EditableProfileField
        icon={Phone}
        label="Внутренний телефон"
        value=""
      />,
    );

    expect(screen.getByText('Не указано')).toBeInTheDocument();
  });

  it('renders pending value with "На рассмотрении" badge', () => {
    render(
      <EditableProfileField
        icon={Phone}
        label="Внутренний телефон"
        value="12-34"
        pendingValue="56-78"
      />,
    );

    expect(screen.getByText('12-34')).toBeInTheDocument();
    expect(screen.getByText('56-78')).toBeInTheDocument();
    expect(screen.getByText('На рассмотрении')).toBeInTheDocument();
  });

  it('renders input with mask and hint in editing mode', () => {
    const onChange = vi.fn();
    render(
      <EditableProfileField
        icon={Phone}
        label="Внутренний телефон"
        value="12-34"
        isEditing={true}
        onChange={onChange}
        mask="00-00"
        placeholder="20-20"
        hint="Формат: 00-00 (например: 24-12)"
      />,
    );

    expect(screen.getByText('Формат: 00-00 (например: 24-12)')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('20-20');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('12-34');

    fireEvent.change(input, { target: { value: '9988' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('renders plain input without mask when mask prop is not passed', () => {
    const onChange = vi.fn();
    render(
      <EditableProfileField
        icon={Phone}
        label="Офис / Расположение"
        value="Кабинет 101"
        isEditing={true}
        onChange={onChange}
        placeholder="Например: Кабинет 402"
        hint="Укажите номер кабинета или здания"
      />,
    );

    expect(screen.getByText('Укажите номер кабинета или здания')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Например: Кабинет 402');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Кабинет 101');

    fireEvent.change(input, { target: { value: 'Кабинет 202' } });
    expect(onChange).toHaveBeenCalledWith('Кабинет 202');
  });

  it('renders copy button in view mode when value is present', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText,
      },
    });

    render(
      <EditableProfileField
        icon={Phone}
        label="Внутренний телефон"
        value="12-34"
      />,
    );

    const copyBtn = screen.getByRole('button', { name: 'Скопировать внутренний телефон: 12-34' });
    expect(copyBtn).toBeInTheDocument();

    fireEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith('12-34');
  });
});
