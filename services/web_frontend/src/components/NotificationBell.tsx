import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Bell, CheckCheck, CheckCircle2, XCircle, MessageSquare, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import type { AppNotification } from '@/types';

export function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoMarkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { notifications, unreadCount, markAllNotificationsRead, clearRejectedField, currentUser } =
    useAppStore(
      useShallow((state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        markAllNotificationsRead: state.markAllNotificationsRead,
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
      }, 1800);
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
        return `сегодня в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
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
          className={`group relative flex items-center gap-2.5 rounded-2xl border px-3.5 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            isOpen
              ? 'border-primary/40 bg-primary/10 text-primary shadow-xs'
              : 'border-[#d6e3ee] bg-white/95 text-[#334d66] shadow-xs hover:border-[#b8cfe0] hover:bg-white hover:text-[#142e47]'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <Bell className="h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[13px] font-semibold">Уведомления</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[11px] font-bold text-rose-600">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Popover Dropdown aligned directly to the button */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 top-full z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-black/10 bg-white/95 shadow-xl backdrop-blur-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">Уведомления</span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                      {unreadCount} новых
                    </span>
                  )}
                </div>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsRead()}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Прочитать все
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40 overscroll-contain">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-9 px-6 text-center">
                    <p className="text-sm font-semibold text-foreground">Нет новых уведомлений</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[240px] leading-relaxed">
                      Здесь будут отображаться решения по вашим заявкам и обращениям
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isApplied = notif.type === 'field_applied';
                    const isRejected = notif.type === 'field_rejected';
                    const isTicket = notif.type === 'ticket_closed';

                    return (
                      <div
                        key={notif.id}
                        className={`relative p-3.5 transition-colors ${
                          !notif.read
                            ? 'bg-blue-50/40 border-l-[3px] ' +
                              (isApplied
                                ? 'border-l-emerald-500'
                                : isRejected
                                ? 'border-l-rose-500'
                                : 'border-l-sky-500')
                            : 'hover:bg-muted/30 border-l-[3px] border-l-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 mt-0.5">
                            {isApplied && (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                <CheckCircle2 className="h-4 w-4" />
                              </div>
                            )}
                            {isRejected && (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                                <XCircle className="h-4 w-4" />
                              </div>
                            )}
                            {isTicket && (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                                <MessageSquare className="h-4 w-4" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {notif.title}
                              </p>
                              <span className="text-[10px] text-muted-foreground/75 shrink-0 tabular-nums">
                                {formatNotificationTime(notif.createdAt)}
                              </span>
                            </div>

                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                              {notif.body}
                            </p>

                            {isRejected && (
                              <button
                                type="button"
                                onClick={() => handleReapply(notif)}
                                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                              >
                                Подать снова
                                <ArrowRight className="h-3 w-3" />
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
