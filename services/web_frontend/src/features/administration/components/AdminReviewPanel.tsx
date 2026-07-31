import { Check, Loader2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { getAttributeLabel, getLdapErrorTranslation } from '@/lib/localization';
import { useAppStore } from '@/store/useAppStore';
import type { AdminReviewGroup, AdminReviewItem } from '../model/reviewItems';

interface AdminReviewPanelProps {
  groups: Record<string, AdminReviewGroup>;
}

async function applyAction(item: AdminReviewItem, action: 'approve' | 'reject') {
  const store = useAppStore.getState();
  if (item.item_type === 'report') {
    await (action === 'approve' ? store.approveReport(item.id) : store.rejectReport(item.id));
    return;
  }
  await (action === 'approve' ? store.approveChangeRequest(item.id) : store.rejectChangeRequest(item.id));
}

async function applyGroup(items: AdminReviewItem[], action: 'approve' | 'reject') {
  for (const item of items) {
    if (item.status !== 'approved') await applyAction(item, action);
  }
}

export function AdminReviewPanel({ groups }: AdminReviewPanelProps) {
  const entries = Object.entries(groups);

  if (entries.length === 0) {
    return <div className="p-6 py-12 text-center text-lg text-muted-foreground">Нет активных запросов на изменение</div>;
  }

  return (
    <div className="space-y-4 p-6">
      {entries.map(([userId, group]) => (
        <motion.section
          key={userId}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-xl border border-black/5 bg-white/60 p-4 shadow-sm backdrop-blur-md"
        >
          <header className="mb-3 flex items-center justify-between border-b border-black/5 pb-2">
            <h4 className="text-base font-semibold">{group.user_name}</h4>
            <div className="flex gap-2">
              <button onClick={() => void applyGroup(group.items, 'reject')} className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-rose-600 shadow-sm hover:bg-rose-50">
                <X className="h-3.5 w-3.5" /> Отклонить всё
              </button>
              <button onClick={() => void applyGroup(group.items, 'approve')} className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 shadow-sm hover:bg-emerald-100">
                <Check className="h-3.5 w-3.5" /> Одобрить всё
              </button>
            </div>
          </header>

          <div className="space-y-2">
            {group.items.map((item) => (
              <article key={`${item.item_type}-${item.id}`} className={`flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center ${item.item_type === 'report' ? 'bg-red-50/50' : 'bg-black/5'}`}>
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <p className="flex w-40 shrink-0 flex-col text-sm text-muted-foreground">
                    <span>{getAttributeLabel(item.field_name)}</span>
                    {item.reporter_name && <span className="mt-0.5 text-xs text-red-500/80">от: {item.reporter_name}</span>}
                  </p>
                  {item.status === 'conflict' && (
                    <div className="text-sm font-medium text-destructive">
                      Ошибка применения в AD
                      {item.rejection_reason && <div className="text-xs font-normal">{getLdapErrorTranslation(item.rejection_reason)}</div>}
                    </div>
                  )}
                  <div className="inline-flex items-center gap-2 rounded-md bg-white/70 px-2 py-1 text-sm shadow-sm">
                    <span className="text-xs text-muted-foreground">Новое:</span>
                    {item.new_value || <span className="italic text-rose-500 line-through">Удалить</span>}
                  </div>
                  {item.item_type === 'report' && <time className="text-[10px] text-muted-foreground/60">{new Date(item.created_at).toLocaleString('ru-RU')}</time>}
                </div>

                {item.status === 'approved' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <div className="flex gap-1.5">
                    <button onClick={() => void applyAction(item, 'reject')} className="rounded-md bg-white p-2 text-rose-600 shadow-sm hover:bg-rose-50" aria-label="Отклонить"><X className="h-3.5 w-3.5" /></button>
                    <button onClick={() => void applyAction(item, 'approve')} className="rounded-md bg-emerald-50 p-2 text-emerald-600 shadow-sm hover:bg-emerald-100" aria-label="Одобрить"><Check className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </motion.section>
      ))}
    </div>
  );
}
