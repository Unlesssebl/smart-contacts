import { describe, expect, it } from 'vitest';
import { buildAdminReviewItems, groupAdminReviewItems } from './reviewItems';
import type { ChangeRequest, Report } from '@/types';

describe('admin review items', () => {
  it('normalizes and groups active requests and reports', () => {
    const requests: ChangeRequest[] = [{
      id: 'request-1',
      user_id: 'user-1',
      user_name: 'Иван Иванов',
      field_name: 'mobile_phone',
      new_value: '+7 999 000-00-00',
      status: 'pending',
      created_at: '2026-01-01T10:00:00Z',
    }];
    const reports: Report[] = [{
      id: 'report-1',
      user_id: 'user-1',
      target_user_name: 'Иван Иванов',
      reporter_user_name: 'Пётр Петров',
      attribute_name: 'office_location',
      new_value: 'Москва',
      status: 'conflict',
      created_at: '2026-01-02T10:00:00Z',
    }];

    const items = buildAdminReviewItems(requests, reports);
    const groups = groupAdminReviewItems(items);

    expect(items.map((item) => item.id)).toEqual(['report-1', 'request-1']);
    expect(groups['user-1'].items).toHaveLength(2);
    expect(groups['user-1'].items[0].reporter_name).toBe('Пётр Петров');
  });

  it('correctly handles raw API payloads with user_guid and attribute_name across different users', () => {
    const requests = [
      {
        id: 'req-1',
        user_guid: 'guid-user-a',
        user_name: 'Инькова Елена',
        attribute_name: 'internal_phone',
        new_value: '71-66',
        status: 'pending',
        created_at: '2026-01-01T10:00:00Z',
      },
      {
        id: 'req-2',
        user_guid: 'guid-user-b',
        user_name: 'Гараев Ленар',
        attribute_name: 'mobile_phone',
        new_value: '+79063306560',
        status: 'pending',
        created_at: '2026-01-01T10:05:00Z',
      },
    ] as unknown as ChangeRequest[];

    const items = buildAdminReviewItems(requests, []);
    const groups = groupAdminReviewItems(items);

    expect(Object.keys(groups)).toHaveLength(2);
    expect(groups['guid-user-a'].user_name).toBe('Инькова Елена');
    expect(groups['guid-user-a'].items).toHaveLength(1);
    expect(groups['guid-user-b'].user_name).toBe('Гараев Ленар');
    expect(groups['guid-user-b'].items).toHaveLength(1);
  });
});
