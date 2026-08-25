import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Lightbulb,
  ArrowRight,
  Trash2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import type { AppNotification } from '@/types';

export function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoMarkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    notifications,
    unreadCount,
    markAllNotificationsRead,
    clearNotifications,
    deleteNotification,
    clearRejectedField,
    currentUser,
  } = useAppStore(
    useShallow((state) => ({
      notifications: state.notifications,
      unreadCount: state.unreadCount,
      markAllNotificationsRead: state.markAllNotificationsRead,
      clearNotifications: state.clearNotifications,
      deleteNotification: state.deleteNotification,
      clearRejectedField: state.clearRejectedField,
      currentUser: state.currentUser,
    }))
  );

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark all as read after opening with slight delay so user sees what was new
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      autoMarkTimerRef.current = setTimeout(() => {
        markAllNotificationsRead();
      }, 1500);
    }
    return () => {
      if (autoMarkTimerRef.current) {
        clearTimeout(autoMarkTimerRef.current);
      }
    };
  }, [isOpen, unreadCount, markAllNotificationsRead]);

  const handleReapply = (notification: AppNotification) => {
    if (notification.field) {
      clearRejectedField(notification.field);
    }
    setIsOpen(false);
    if (currentUser?.id) {
      navigate(`/profile/${currentUser.id}`);
    }
  };

  const formatNotificationTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      if (isToday) {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="hidden w-[220px] shrink-0 justify-end sm:flex">
      <div ref={containerRef} className="relative inline-flex">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Уведомления"
          className={`group relative flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            isOpen
              ? 'border-primary/40 bg-primary/10 text-primary shadow-xs'
              : 'border-[#d6e3ee] bg-white/95 text-[#334d66] shadow-xs hover:border-[#b8cfe0] hover:bg-white hover:text-[#142e47]'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <Bell className="h-4 w-4 transition-transform duration-200 group-hover:scale-105" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white shadow-xs animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span>Уведомления</span>
          {unreadCount > 0 && (
            <span className="rounded-md bg-rose-50 px-1 py-0.2 text-[10px] font-bold text-rose-600">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Popover Dropdown aligned directly to the button */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="absolute right-0 top-full z-50 mt-1.5 w-80 sm:w-[330px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-black/10 bg-white/95 shadow-lg backdrop-blur-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 bg-muted/20">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">Уведомления</span>
                  {unreadCount > 0 && (
                    <span className="rounded-md bg-rose-100 px-1.5 py-0.2 text-[10px] font-semibold text-rose-700">
                      +{unreadCount}
                    </span>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllNotificationsRead()}
                        title="Отметить все прочитанными"
                        className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <CheckCheck className="h-3 w-3" />
                        Прочитать
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => clearNotifications()}
                      title="Очистить все уведомления"
                      className="flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Очистить
                    </button>
                  </div>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-[300px] overflow-y-auto divide-y divide-border/30 overscroll-contain">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                    <p className="text-xs font-semibold text-foreground">Нет уведомлений</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px] leading-relaxed">
                      История пуста
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isApplied = notif.type === 'field_applied' || notif.type === 'report_approved';
                    const isRejected = notif.type === 'field_rejected' || notif.type === 'report_rejected';
                    const isTicket = notif.type === 'ticket_closed';
                    const isSuggestion = isTicket && notif.category === 'suggestion';

                    return (
                      <div
                        key={notif.id}
                        className={`group relative px-3 py-2 transition-colors ${
                          !notif.read
                            ? 'bg-blue-50/30 border-l-[3px] ' +
                              (isApplied
                                ? 'border-l-emerald-500'
                                : isRejected
                                ? 'border-l-rose-500'
                                : isSuggestion
                                ? 'border-l-amber-500'
                                : 'border-l-sky-500')
                            : 'hover:bg-muted/20 border-l-[3px] border-l-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Status Icon */}
                          <div className="shrink-0 mt-0.5">
                            {isApplied && (
                              <div className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </div>
                            )}
                            {isRejected && (
                              <div className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                                <XCircle className="h-3.5 w-3.5" />
                              </div>
                            )}
                            {isTicket && (
                              <div
                                className={`flex h-5.5 w-5.5 items-center justify-center rounded-full ${
                                  isSuggestion ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'
                                }`}
                              >
                                {isSuggestion ? <Lightbulb className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <p className="text-[11.5px] font-semibold text-foreground truncate">
                                {notif.title}
                              </p>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[9.5px] text-muted-foreground/70 tabular-nums">
                                  {formatNotificationTime(notif.createdAt)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => deleteNotification(notif.id)}
                                  title="Удалить"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground/60 hover:text-rose-600 hover:bg-rose-50"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            </div>

                            <p className="text-[10.5px] text-muted-foreground/90 mt-0.5 leading-snug break-words">
                              {notif.body}
                            </p>

                            {notif.type === 'field_rejected' && notif.field && (
                              <button
                                type="button"
                                onClick={() => handleReapply(notif)}
                                className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                              >
                                Подать снова
                                <ArrowRight className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
