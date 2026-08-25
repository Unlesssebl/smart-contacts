import { useState, useEffect, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
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
  const {
    supportTickets,
    totalSupportTickets,
    supportTicketPage,
    supportTicketPageSize,
    supportTicketTotalPages,
    isLoadingSupportTickets,
    fetchSupportTickets,
    closeSupportTicket,
    reopenSupportTicket,
  } = useAppStore(
    useShallow((state) => ({
      supportTickets: state.supportTickets,
      totalSupportTickets: state.totalSupportTickets,
      supportTicketPage: state.supportTicketPage,
      supportTicketPageSize: state.supportTicketPageSize,
      supportTicketTotalPages: state.supportTicketTotalPages,
      isLoadingSupportTickets: state.isLoadingSupportTickets,
      fetchSupportTickets: state.fetchSupportTickets,
      closeSupportTicket: state.closeSupportTicket,
      reopenSupportTicket: state.reopenSupportTicket,
    }))
  );

  const [activeFilter, setActiveFilter] = useState<FilterTab>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTicketIds, setExpandedTicketIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch tickets with debounce search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      void fetchSupportTickets({
        status: activeFilter === 'all' ? undefined : activeFilter,
        page: 1,
        pageSize: 20,
        search: searchQuery.trim() || undefined,
      });
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [activeFilter, searchQuery, fetchSupportTickets]);

  const handlePageChange = (newPage: number) => {
    void fetchSupportTickets({
      status: activeFilter === 'all' ? undefined : activeFilter,
      page: newPage,
      pageSize: supportTicketPageSize,
      search: searchQuery.trim() || undefined,
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedTicketIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClose = async (id: string) => {
    if (processingIds.has(id)) return;
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await closeSupportTicket(id);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleReopen = async (id: string) => {
    if (processingIds.has(id)) return;
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await reopenSupportTicket(id);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

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
                ? 'bg-white text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Открытые</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-white text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Все</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('closed')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === 'closed'
                ? 'bg-white text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Закрытые</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по обращениям..."
            className="w-full rounded-xl border border-black/10 bg-white/80 py-1.5 pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 backdrop-blur-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tickets List or Skeletons or Empty state */}
      {isLoadingSupportTickets ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-black/5 bg-white/60 p-5 shadow-xs animate-pulse space-y-3"
            >
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <div className="h-4 w-40 bg-black/10 rounded-md" />
                <div className="h-4 w-20 bg-black/10 rounded-md" />
              </div>
              <div className="h-3 w-60 bg-black/10 rounded-md" />
              <div className="h-12 w-full bg-black/5 rounded-xl" />
            </div>
          ))}
        </div>
      ) : supportTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">
            {searchQuery
              ? `Ничего не найдено по запросу «${searchQuery}»`
              : activeFilter === 'open'
              ? 'Нет открытых обращений'
              : 'Обращения отсутствуют'}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs font-semibold text-primary underline"
              >
                Сбросить поиск
              </button>
            ) : (
              'Все обращения пользователей обработаны'
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {supportTickets.map((ticket) => {
              const meta = CATEGORY_META[ticket.category] || CATEGORY_META.other;
              const Icon = meta.icon;
              const isOpen = ticket.status === 'open';
              const isExpanded = expandedTicketIds.has(ticket.id);
              const isProcessing = processingIds.has(ticket.id);
              const isLong = ticket.message.length > 220 || ticket.message.includes('\n');

              return (
                <motion.article
                  key={ticket.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-2xl border bg-white/70 p-5 shadow-xs backdrop-blur-md transition-all ${
                    isOpen
                      ? 'border-black/5 hover:border-black/15'
                      : 'border-slate-200/60 bg-slate-50/40 opacity-80'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 pb-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {ticket.display_sender_name}
                      </span>

                      {ticket.is_guest ? (
                        <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                          Гость
                        </span>
                      ) : (
                        <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          Сотрудник
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}
                      >
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                    </div>

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

                  {/* Sender Metadata */}
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

                  {/* Message body with clamp & expand */}
                  <div className="mt-3.5 rounded-xl border border-black/5 bg-slate-50/70 p-3.5 text-sm text-foreground leading-relaxed break-words overflow-wrap-anywhere">
                    <p className={`whitespace-pre-wrap ${!isExpanded && isLong ? 'line-clamp-4' : ''}`}>
                      {ticket.message}
                    </p>
                    {isLong && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(ticket.id)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" /> Свернуть
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" /> Развернуть полностью
                          </>
                        )}
                      </button>
                    )}
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
                            `(${new Date(ticket.closed_at).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })})`}
                        </span>
                      </div>
                    )}

                    <div>
                      {isOpen ? (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => void handleClose(ticket.id)}
                          className="btn-primary flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold shadow-xs hover:shadow-sm disabled:opacity-50 transition-all"
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCheck className="h-3.5 w-3.5" />
                          )}
                          <span>Закрыть обращение</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => void handleReopen(ticket.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          <span>Открыть снова</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>

          {/* Pagination Controls */}
          {supportTicketTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-black/5 pt-4">
              <span className="text-xs text-muted-foreground">
                Показано {supportTickets.length} из {totalSupportTickets} обращений
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={supportTicketPage <= 1 || isLoadingSupportTickets}
                  onClick={() => handlePageChange(supportTicketPage - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-muted-foreground hover:bg-black/5 hover:text-foreground disabled:opacity-40"
                  aria-label="Предыдущая страница"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="px-3 text-xs font-bold text-foreground">
                  {supportTicketPage} / {supportTicketTotalPages}
                </span>

                <button
                  type="button"
                  disabled={supportTicketPage >= supportTicketTotalPages || isLoadingSupportTickets}
                  onClick={() => handlePageChange(supportTicketPage + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-muted-foreground hover:bg-black/5 hover:text-foreground disabled:opacity-40"
                  aria-label="Следующая страница"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
