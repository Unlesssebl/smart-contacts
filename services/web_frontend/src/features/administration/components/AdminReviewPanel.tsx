import { useState } from 'react';
import {
  Check,
  Loader2,
  X,
  Shield,
  UserX,
  AlertTriangle,
  Pencil,
  Save,
  Clock,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAttributeLabel, getLdapErrorTranslation } from '@/lib/localization';
import { useAppStore } from '@/store/useAppStore';
import type { AdminReviewGroup, AdminReviewItem } from '../model/reviewItems';

interface AdminReviewPanelProps {
  groups: Record<string, AdminReviewGroup>;
}

export function AdminReviewPanel({ groups }: AdminReviewPanelProps) {
  const entries = Object.entries(groups);

  const approveChangeRequest = useAppStore((state) => state.approveChangeRequest);
  const rejectChangeRequest = useAppStore((state) => state.rejectChangeRequest);
  const approveReport = useAppStore((state) => state.approveReport);
  const rejectReport = useAppStore((state) => state.rejectReport);
  const updateChangeRequestValue = useAppStore((state) => state.updateChangeRequestValue);
  const updateReportValue = useAppStore((state) => state.updateReportValue);
  const bulkApproveReviewItems = useAppStore((state) => state.bulkApproveReviewItems);
  const bulkRejectReviewItems = useAppStore((state) => state.bulkRejectReviewItems);

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [processingGroups, setProcessingGroups] = useState<Set<string>>(new Set());
  const [confirmRejectGroup, setConfirmRejectGroup] = useState<{ userId: string; group: AdminReviewGroup } | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleAction = async (item: AdminReviewItem, action: 'approve' | 'reject') => {
    if (processingIds.has(item.id)) return;
    setProcessingIds((prev) => new Set(prev).add(item.id));
    try {
      if (item.item_type === 'report') {
        if (action === 'approve') await approveReport(item.id);
        else await rejectReport(item.id);
      } else {
        if (action === 'approve') await approveChangeRequest(item.id);
        else await rejectChangeRequest(item.id);
      }
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleBulkApprove = async (userId: string, group: AdminReviewGroup) => {
    if (processingGroups.has(userId)) return;
    setProcessingGroups((prev) => new Set(prev).add(userId));
    const reqIds = group.items.filter((i) => i.item_type === 'request' && i.status !== 'approved').map((i) => i.id);
    const repIds = group.items.filter((i) => i.item_type === 'report' && i.status !== 'approved').map((i) => i.id);
    try {
      await bulkApproveReviewItems(reqIds, repIds);
    } finally {
      setProcessingGroups((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleBulkReject = async (userId: string, group: AdminReviewGroup) => {
    if (processingGroups.has(userId)) return;
    setProcessingGroups((prev) => new Set(prev).add(userId));
    const reqIds = group.items.filter((i) => i.item_type === 'request').map((i) => i.id);
    const repIds = group.items.filter((i) => i.item_type === 'report').map((i) => i.id);
    try {
      await bulkRejectReviewItems(reqIds, repIds);
      setConfirmRejectGroup(null);
    } finally {
      setProcessingGroups((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const startEdit = (item: AdminReviewItem) => {
    setEditingItemId(item.id);
    setEditValue(item.new_value || '');
  };

  const saveEdit = async (item: AdminReviewItem) => {
    if (processingIds.has(item.id)) return;
    setProcessingIds((prev) => new Set(prev).add(item.id));
    try {
      const val = editValue.trim() || null;
      if (item.item_type === 'report') {
        await updateReportValue(item.id, val);
      } else {
        await updateChangeRequestValue(item.id, val);
      }
      setEditingItemId(null);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const isDelayedApproval = (createdAt: string) => {
    try {
      const created = new Date(createdAt).getTime();
      const now = Date.now();
      return (now - created) > 2 * 60 * 60 * 1000; // > 2 hours
    } catch {
      return false;
    }
  };

  if (entries.length === 0) {
    return (
      <div className="p-6 py-12 text-center text-lg text-muted-foreground">
        Нет активных запросов на изменение
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {entries.map(([userId, group]) => {
        const isGroupProcessing = processingGroups.has(userId);
        const isResigned = group.user_status === 'resigned';
        const isProtected = Boolean(group.is_protected);

        return (
          <motion.section
            key={userId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl border border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur-md"
          >
            {/* Group Header */}
            <header className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-semibold text-foreground">{group.user_name}</h4>
                {isProtected && (
                  <span
                    className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200"
                    title="VIP-профиль: автосинхронизация с AD отключена. Требуется ручное изменение в AD"
                  >
                    <Shield className="h-3 w-3" /> VIP-профиль
                  </span>
                )}
                {isResigned && (
                  <span
                    className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200"
                    title="Сотрудник уволен / удалён из AD. Одобрение изменений заблокировано"
                  >
                    <UserX className="h-3 w-3" /> Уволен
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isGroupProcessing}
                  onClick={() => setConfirmRejectGroup({ userId, group })}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 shadow-xs hover:bg-rose-50 disabled:opacity-50 transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Отклонить всё
                </button>

                <button
                  type="button"
                  disabled={isGroupProcessing || isResigned}
                  onClick={() => void handleBulkApprove(userId, group)}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-xs hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                  title={isResigned ? 'Нельзя одобрить изменения для уволенного сотрудника' : 'Одобрить все активные заявки'}
                >
                  {isGroupProcessing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Одобрить всё
                </button>
              </div>
            </header>

            {/* Items List */}
            <div className="space-y-2.5">
              {group.items.map((item) => {
                const isItemProcessing = processingIds.has(item.id) || isGroupProcessing;
                const isEditing = editingItemId === item.id;
                const hasPeerConflict = Boolean(item.has_conflict_with_peer);
                const isApproved = item.status === 'approved';
                const isConflict = item.status === 'conflict';
                const delayed = isApproved && isDelayedApproval(item.created_at);

                return (
                  <article
                    key={`${item.item_type}-${item.id}`}
                    className={`flex flex-col gap-3 rounded-xl p-3.5 transition-all sm:flex-row sm:items-center ${
                      hasPeerConflict
                        ? 'border border-amber-300 bg-amber-50/40 shadow-xs'
                        : item.item_type === 'report'
                        ? 'bg-rose-50/40 border border-rose-100/60'
                        : 'bg-black/[0.03] border border-black/5'
                    }`}
                  >
                    {/* Left: Field Name & Reporter */}
                    <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 min-w-0">
                      <div className="flex w-44 shrink-0 flex-col">
                        <span className="text-sm font-semibold text-foreground">
                          {getAttributeLabel(item.field_name)}
                        </span>
                        {item.reporter_name ? (
                          <span className="text-xs text-rose-600/90 font-medium">от: {item.reporter_name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">заявка сотрудника</span>
                        )}
                        <time className="text-[10px] text-muted-foreground/75 mt-0.5">
                          {new Date(item.created_at).toLocaleString('ru-RU')}
                        </time>
                      </div>

                      {/* Values diff: Old -> New */}
                      <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
                        {/* Old Value */}
                        <div
                          className="inline-flex items-center gap-1.5 rounded-lg bg-black/[0.04] px-2.5 py-1 text-xs text-muted-foreground shrink-0"
                          title="Значение на момент подачи заявки"
                        >
                          <span className="text-[10px] uppercase font-bold text-muted-foreground/70">Было:</span>
                          <span className="line-through opacity-75">{item.old_value || '—'}</span>
                          <Info className="h-3 w-3 opacity-40" />
                        </div>

                        <span className="text-xs font-bold text-muted-foreground/60">→</span>

                        {/* New Value (or Inline Edit) */}
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 min-w-[200px]">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="Новое значение"
                              className="flex-1 rounded-lg border border-primary/40 bg-white px-2.5 py-1 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <button
                              type="button"
                              onClick={() => void saveEdit(item)}
                              disabled={isItemProcessing}
                              className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"
                              title="Сохранить значение"
                            >
                              <Save className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className="rounded-lg bg-muted p-1.5 text-muted-foreground hover:bg-muted/80"
                              title="Отмена"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-foreground shadow-xs shrink-0">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Новое:</span>
                            {item.new_value || <span className="italic text-rose-500 line-through">Удалить</span>}
                            {isConflict && (
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="ml-1 text-muted-foreground hover:text-primary transition-colors"
                                title="Отредактировать значение перед повторным одобрением"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Status Warnings */}
                      {isConflict && (
                        <div className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs text-rose-700 font-medium">
                          Ошибка применения в AD
                          {item.rejection_reason && (
                            <div className="text-[11px] font-normal text-rose-600 mt-0.5">
                              {getLdapErrorTranslation(item.rejection_reason)}
                            </div>
                          )}
                        </div>
                      )}

                      {hasPeerConflict && !isApproved && (
                        <div className="flex items-center gap-1 rounded-lg bg-amber-100/80 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          Конкурирующая заявка
                        </div>
                      )}
                    </div>

                    {/* Right: Actions / Approved State */}
                    <div className="shrink-0 flex items-center gap-1.5 sm:ml-auto">
                      {isApproved ? (
                        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200/60">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                          <span>Ожидает синхронизации с AD</span>
                          {delayed && (
                            <span
                              className="text-amber-600 font-bold"
                              title="Заявка одобрена более 2 часов назад, синхронизация задерживается"
                            >
                              ⚠️ Задержка
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            disabled={isItemProcessing}
                            onClick={() => void handleAction(item, 'reject')}
                            className="rounded-lg border border-rose-200 bg-white p-2 text-rose-600 shadow-xs hover:bg-rose-50 disabled:opacity-50 transition-colors"
                            aria-label="Отклонить"
                            title="Отклонить"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isItemProcessing || isResigned}
                            onClick={() => void handleAction(item, 'approve')}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 shadow-xs hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                            aria-label="Одобрить"
                            title={isResigned ? 'Сотрудник уволен' : 'Одобрить'}
                          >
                            {isItemProcessing ? (
                              <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </motion.section>
        );
      })}

      {/* Reject All Confirm Modal */}
      <AnimatePresence>
        {confirmRejectGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-rose-600 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Подтверждение отклонения</h3>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Вы действительно хотите отклонить все заявки ({confirmRejectGroup.group.items.length} шт.) для сотрудника{' '}
                <span className="font-semibold text-foreground">{confirmRejectGroup.group.user_name}</span>? Это действие необратимо.
              </p>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmRejectGroup(null)}
                  className="rounded-xl border border-border bg-muted/50 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => void handleBulkReject(confirmRejectGroup.userId, confirmRejectGroup.group)}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors"
                >
                  Отклонить всё
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
