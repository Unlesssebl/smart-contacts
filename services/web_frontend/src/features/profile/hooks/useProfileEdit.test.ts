// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useProfileEdit } from './useProfileEdit';
import type { User } from '@/types';

const mockUser: User = {
  id: 'u1',
  full_name: 'Иван Иванов',
  email: 'ivanov@corp.local',
  internal_phone: '12-34',
  mobile_phone: '+7 (999) 111-22-33',
  office_location: 'Кабинет 101',
  job_title: 'Разработчик',
  department: 'IT',
  organization: 'Головной офис',
  manager_id: null,
  avatar_color: '#3b82f6',
  is_hidden: false,
};

describe('useProfileEdit', () => {
  it('initializes fields from user object', () => {
    const addChangeRequest = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useProfileEdit({
        user: mockUser,
        pendingFields: {},
        addChangeRequest,
      }),
    );

    expect(result.current.internalPhone).toBe('12-34');
    expect(result.current.mobilePhone).toBe('+7 (999) 111-22-33');
    expect(result.current.officeLocation).toBe('Кабинет 101');
    expect(result.current.hasChanges).toBe(false);
    expect(result.current.isEditing).toBe(false);
  });

  it('detects changes in internal_phone, mobile_phone and office_location', () => {
    const addChangeRequest = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useProfileEdit({
        user: mockUser,
        pendingFields: {},
        addChangeRequest,
      }),
    );

    act(() => {
      result.current.setInternalPhone('56-78');
    });
    expect(result.current.hasChanges).toBe(true);

    act(() => {
      result.current.setInternalPhone('12-34');
    });
    expect(result.current.hasChanges).toBe(false);

    act(() => {
      result.current.setMobilePhone('+7 (999) 000-00-00');
    });
    expect(result.current.hasChanges).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(result.current.hasChanges).toBe(false);
    expect(result.current.mobilePhone).toBe('+7 (999) 111-22-33');
  });

  it('submits change requests for changed fields and excludes pending fields', async () => {
    const addChangeRequest = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useProfileEdit({
        user: mockUser,
        pendingFields: { mobile_phone: '+7 (999) 555-55-55' },
        addChangeRequest,
      }),
    );

    act(() => {
      result.current.setIsEditing(true);
      result.current.setInternalPhone('99-88');
      result.current.setMobilePhone('+7 (999) 777-77-77'); // Should be ignored because in pendingFields
      result.current.setOfficeLocation('Кабинет 202');
    });

    await act(async () => {
      const success = await result.current.submit();
      expect(success).toBe(true);
    });

    expect(addChangeRequest).toHaveBeenCalledTimes(2);
    expect(addChangeRequest).toHaveBeenCalledWith({
      attribute_name: 'internal_phone',
      new_value: '99-88',
    });
    expect(addChangeRequest).toHaveBeenCalledWith({
      attribute_name: 'office_location',
      new_value: 'Кабинет 202',
    });
    expect(result.current.isEditing).toBe(false);
  });
});
