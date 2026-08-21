import type { ChangeRequest, ChangeRequestStatus, Report, ReportStatus } from '@/types';

export interface AdminReviewItem {
  id: string;
  item_type: 'request' | 'report';
  user_id: string;
  user_name: string;
  field_name: string;
  new_value: string | null;
  status: ChangeRequestStatus | ReportStatus;
  rejection_reason?: string | null;
  created_at: string;
  reporter_name?: string | null;
}

export interface AdminReviewGroup {
  user_name: string;
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
      const field = request.field_name || (request as unknown as { attribute_name?: string }).attribute_name || '';
      return {
        id: request.id,
        item_type: 'request',
        user_id: request.user_id,
        user_name: request.user_name || 'Неизвестный',
        field_name: field,
        new_value: request.new_value,
        status: request.status,
        rejection_reason: request.rejection_reason,
        created_at: request.created_at,
      };
    });

  const reportItems: AdminReviewItem[] = (reports || [])
    .filter((report) => report && ACTIVE_STATUSES.has(report.status))
    .map((report) => {
      const field = report.attribute_name || (report as unknown as { field_name?: string }).field_name || '';
      return {
        id: report.id,
        item_type: 'report',
        user_id: report.user_id,
        user_name: report.target_user_name || 'Неизвестный',
        field_name: field,
        new_value: report.new_value,
        status: report.status,
        rejection_reason: report.rejection_reason,
        created_at: report.created_at,
        reporter_name: report.reporter_user_name,
      };
    });

  return [...requestItems, ...reportItems].sort(
    (left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime(),
  );
}

export function groupAdminReviewItems(items: AdminReviewItem[]): Record<string, AdminReviewGroup> {
  return items.reduce<Record<string, AdminReviewGroup>>((groups, item) => {
    groups[item.user_id] ??= { user_name: item.user_name, items: [] };
    groups[item.user_id].items.push(item);
    return groups;
  }, {});
}
