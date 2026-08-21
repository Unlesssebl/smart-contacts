import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCheck,
  RotateCcw,
  Search,
  KeyRound,
  FileEdit,
  AlertCircle,
  Lightbulb,
  HelpCircle,
  User as UserIcon,
  Building,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { SupportCategory } from '@/types';

type FilterTab = 'open' | 'all' | 'closed';

const CATEGORY_META: Record<
  SupportCategory,
  { label: string; icon: typeof KeyRound; badgeClass: string }
> = {
  access: {
    label: 'Доступ / Вход',
    icon: KeyRound,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
  },
  data_error: {
    label: 'Ошибка в данных',
    icon: FileEdit,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
  },
  bug: {
    label: 'Сбой / Ошибка',
    icon: AlertCircle,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
  },
  suggestion: {
    label: 'Идея / Улучшение',
    icon: Lightbulb,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  },
  other: {
    label: 'Другое',
    icon: HelpCircle,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export function SupportTicketsPanel() {
  const supportTickets = useAppStore((state) => state.supportTickets);
  const closeSupportTicket = useAppStore((state) => state.closeSupportTicket);
  const reopenSupportTicket = useAppStore((state) => state.reopenSupportTicket);

  const [activeFilter, setActiveFilter] = useState<FilterTab>('open');
  const [searchQuery, setSearchQuery] = useState('');

  const openCount = useMemo(
    () => supportTickets.filter((t) => t.status === 'open').length,
    [supportTickets]
  );
  const closedCount = useMemo(
    () => supportTickets.filter((t) => t.status === 'closed').length,
    [supportTickets]
  );

  const filteredTickets = useMemo(() => {
    return supportTickets.filter((ticket) => {
      if (activeFilter === 'open' && ticket.status !== 'open') return false;
      if (activeFilter === 'closed' && ticket.status !== 'closed') return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        (ticket.display_sender_name || '').toLowerCase().includes(q) ||
        (ticket.display_sender_contact || '').toLowerCase().includes(q) ||
        (ticket.message || '').toLowerCase().includes(q) ||
        (ticket.department ? ticket.department.toLowerCase().includes(q) : false)
      );
    });
  }, [supportTickets, activeFilter, searchQuery]);

  return (
    <div className="p-6 space-y-6">
      {/* Header controls: Filter tabs & search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Pills */}
        <div className="inline-flex rounded-xl bg-slate-100/80 p-1 border border-black/5">
          <button
            type="button"
            onClick={() => setActiveFilter('open')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === 'open'
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Открытые</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                openCount > 0
                  ? 'bg-primary text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {openCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Все</span>
            <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
              {supportTickets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('closed')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === 'closed'
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Закрытые</span>
            <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
              {closedCount}
            </span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по обращениям..."
            className="w-full rounded-xl border border-black/10 bg-white/80 py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 backdrop-blur-sm"
          />
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">
            {activeFilter === 'open'
              ? 'Нет открытых обращений'
              : 'Обращения не найдены'}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            {searchQuery
              ? 'Попробуйте изменить поисковый запрос'
              : 'Все обращения пользователей обработаны'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {filteredTickets.map((ticket) => {
              const meta =
                CATEGORY_META[ticket.category] || CATEGORY_META.other;
              const Icon = meta.icon;
              const isOpen = ticket.status === 'open';

              return (
                <motion.article
                  key={ticket.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-2xl border bg-white/70 p-5 shadow-sm backdrop-blur-md transition-all ${
                    isOpen
                      ? 'border-black/5 hover:border-black/15'
                      : 'border-slate-200/60 bg-slate-50/40 opacity-80'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 pb-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Sender Name */}
                      <span className="text-sm font-bold text-foreground">
                        {ticket.display_sender_name}
                      </span>

                      {/* Guest vs Employee badge */}
                      {ticket.is_guest ? (
                        <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                          Гость
                        </span>
                      ) : (
                        <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          Сотрудник
                        </span>
                      )}

                      {/* Category Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}
                      >
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                    </div>

                    {/* Date and Status Badge */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <time>
                          {new Date(ticket.created_at).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </div>

                      {isOpen ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                          Новое
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          Закрыто
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sender Metadata (contact, department, title) */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                      <span>{ticket.display_sender_contact}</span>
                    </div>

                    {ticket.department && (
                      <div className="flex items-center gap-1">
                        <Building className="h-3.5 w-3.5 text-slate-400" />
                        <span>{ticket.department}</span>
                      </div>
                    )}

                    {ticket.job_title && ticket.job_title !== '[]' && (
                      <div className="flex items-center gap-1 text-slate-500">
                        <span>• {ticket.job_title}</span>
                      </div>
                    )}
                  </div>

                  {/* Message body */}
                  <div className="mt-3.5 rounded-xl border border-black/5 bg-slate-50/70 p-3.5 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {ticket.message}
                  </div>

                  {/* Action / Resolution Footer */}
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    {isOpen ? (
                      <div className="text-xs text-muted-foreground italic">
                        Требует рассмотрения
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-700 flex items-center gap-1.5">
                        <CheckCheck className="h-4 w-4" />
                        <span>
                          Закрыл(а):{' '}
                          <strong className="font-semibold">
                            {ticket.closer_name || 'Администратор'}
                          </strong>{' '}
                          {ticket.closed_at &&
                            `(${new Date(ticket.closed_at).toLocaleString(
                              'ru-RU',
                              {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )})`}
                        </span>
                      </div>
                    )}

                    <div>
                      {isOpen ? (
                        <button
                          type="button"
                          onClick={() => void closeSupportTicket(ticket.id)}
                          className="btn-primary flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold shadow-sm hover:shadow"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          <span>Закрыть обращение</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void reopenSupportTicket(ticket.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Открыть снова</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
