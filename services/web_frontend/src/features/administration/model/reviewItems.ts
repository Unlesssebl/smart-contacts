import type { ChangeRequest, ChangeRequestStatus, Report, ReportStatus } from '@/types';

export interface AdminReviewItem {
  id: string;
  item_type: 'request' | 'report';
  user_id: string;
  user_name: string;
  field_name: string;
  old_value?: string | null;
  new_value: string | null;
  status: ChangeRequestStatus | ReportStatus;
  rejection_reason?: string | null;
  created_at: string;
  reporter_name?: string | null;
  is_protected?: boolean;
  user_status?: string;
  has_conflict_with_peer?: boolean;
}

export interface AdminReviewGroup {
  user_name: string;
  is_protected?: boolean;
  user_status?: string;
  items: AdminReviewItem[];
}

const ACTIVE_STATUSES = new Set<ChangeRequestStatus | ReportStatus>([
  'pending',
  'conflict',
  'approved',
]);

export function buildAdminReviewItems(
  requests: ChangeRequest[],
  reports: Report[],
): AdminReviewItem[] {
  const requestItems: AdminReviewItem[] = (requests || [])
    .filter((request) => request && ACTIVE_STATUSES.has(request.status))
    .map((request) => {
      const field = request.field_name || request.attribute_name || (request as unknown as { attribute_name?: string }).attribute_name || '';
      const userId = request.user_id || request.user_guid || (request as unknown as { user_guid?: string }).user_guid || request.id;
      return {
        id: request.id,
        item_type: 'request',
        user_id: userId,
        user_name: request.user_name || 'Неизвестный',
        field_name: field,
        old_value: request.old_value,
        new_value: request.new_value,
        status: request.status,
        rejection_reason: request.rejection_reason,
        created_at: request.created_at,
        is_protected: Boolean(request.is_protected),
        user_status: request.user_status || 'active',
      };
    });

  const reportItems: AdminReviewItem[] = (reports || [])
    .filter((report) => report && ACTIVE_STATUSES.has(report.status))
    .map((report) => {
      const field = report.attribute_name || report.field_name || (report as unknown as { field_name?: string }).field_name || '';
      const userId = report.user_id || report.target_user_guid || (report as unknown as { target_user_guid?: string }).target_user_guid || report.id;
      return {
        id: report.id,
        item_type: 'report',
        user_id: userId,
        user_name: report.target_user_name || 'Неизвестный',
        field_name: field,
        old_value: report.old_value,
        new_value: report.new_value,
        status: report.status,
        rejection_reason: report.rejection_reason,
        created_at: report.created_at,
        reporter_name: report.reporter_user_name,
        is_protected: Boolean(report.is_protected),
        user_status: report.user_status || 'active',
      };
    });

  return [...requestItems, ...reportItems].sort(
    (left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime(),
  );
}

export function groupAdminReviewItems(items: AdminReviewItem[]): Record<string, AdminReviewGroup> {
  const groups = items.reduce<Record<string, AdminReviewGroup>>((acc, item) => {
    const groupKey = item.user_id || item.user_name || item.id;
    acc[groupKey] ??= {
      user_name: item.user_name,
      is_protected: item.is_protected,
      user_status: item.user_status,
      items: [],
    };
    if (item.is_protected) acc[groupKey].is_protected = true;
    if (item.user_status === 'resigned') acc[groupKey].user_status = 'resigned';
    acc[groupKey].items.push(item);
    return acc;
  }, {});

  // Mark peer conflicts within each group for identical field_name
  Object.values(groups).forEach((group) => {
    const fieldCount: Record<string, number> = {};
    group.items.forEach((item) => {
      fieldCount[item.field_name] = (fieldCount[item.field_name] || 0) + 1;
    });
    group.items.forEach((item) => {
      if ((fieldCount[item.field_name] || 0) > 1) {
        item.has_conflict_with_peer = true;
      }
    });
  });

  return groups;
}
