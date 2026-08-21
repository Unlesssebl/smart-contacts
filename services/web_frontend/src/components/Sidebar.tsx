import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Home, User, LogOut, Shield, BookOpen, Sparkles, ArrowRight, Headphones } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { motion } from 'motion/react';
import { UserAvatar } from './UserAvatar';
import { SupportModal } from './SupportModal';
import { UserGuidesModal } from './UserGuidesModal';

export function Sidebar() {
  const location = useLocation();
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isGuidesModalOpen, setIsGuidesModalOpen] = useState(false);
  const { currentUser, logout } = useAppStore(
    useShallow((state) => ({ currentUser: state.currentUser, logout: state.logout })),
  );

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'it_operator';

  const navItems = [
    { icon: Home, label: 'Справочник', path: '/' },
    { icon: User, label: 'Мой профиль', path: `/profile/${currentUser?.id}` },
    ...(isAdmin ? [{ icon: Shield, label: 'Панель администратора', path: '/admin' }] : []),
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <aside
        className="fixed left-0 top-0 z-20 flex h-screen w-[17.25rem] flex-col shadow-[18px_0_48px_rgba(16,45,79,0.12)] transform-gpu"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.11) 0.8px, transparent 0.8px), linear-gradient(155deg, rgba(48, 96, 146, 0.8), rgba(20, 58, 104, 0.92)), url("/login_background.png")',
          backgroundSize: '4px 4px, cover, auto 100%',
          backgroundPosition: '0 0, center, center',
          backgroundRepeat: 'repeat, no-repeat, no-repeat'
        }}
      >
        <div className="flex h-full flex-col px-3.5 pb-5 pt-5">
          {/* Logo */}
          <div className="mb-10 flex items-center justify-center">
            <img
              src="/GK_logo.png"
              alt="ТЭМПО"
              className="h-10 w-auto object-contain brightness-0 invert"
            />
          </div>

          {/* Navigation */}
          <div className="flex-1">
            <nav className="flex flex-col space-y-1 rounded-[18px] border border-white/20 bg-white/[0.11] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group relative flex min-h-10 items-center gap-3 rounded-xl px-3 py-2.5 transition-[color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                      active ? 'text-white' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 rounded-xl bg-white/[0.24] shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_7px_18px_rgba(7,31,60,0.12)]"
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      />
                    )}
                    {!active && (
                      <div className="absolute inset-0 rounded-xl bg-white/5 opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                    <Icon className="relative z-10 h-5 w-5" strokeWidth={1.5} />
                    <span className="relative z-10 text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Help & Support Card */}
          <div className="relative mb-6 mt-auto overflow-hidden rounded-2xl border border-sky-300/30 bg-gradient-to-br from-white/[0.16] via-white/[0.08] to-sky-400/[0.14] p-4 shadow-[0_8px_28px_rgba(7,31,60,0.18),inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-xl transition-all duration-300 hover:border-sky-300/50 hover:shadow-[0_10px_32px_rgba(7,31,60,0.25)] group">
            {/* Ambient Background Glow */}
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-sky-400/20 blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <motion.div
                  animate={{ y: [0, -3, 0], rotate: [0, 4, -4, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/30 to-blue-600/30 border border-sky-200/40 text-sky-200 shadow-sm"
                >
                  <Sparkles className="h-4 w-4 text-sky-200" />
                </motion.div>
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">Помощь</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-300/90 uppercase tracking-wider">
                      IT онлайн
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="relative z-10 mt-2.5 text-xs text-white/75 leading-relaxed">
              Руководство по справочнику или обращение в службу поддержки.
            </p>

            <div className="relative z-10 mt-3.5 flex flex-col gap-2 border-t border-white/15 pt-3">
              {/* Guides Button */}
              <button
                type="button"
                onClick={() => setIsGuidesModalOpen(true)}
                className="flex items-center justify-between rounded-xl bg-white/15 hover:bg-white/25 px-3 py-2 text-xs font-semibold text-white transition-all shadow-sm hover:translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-sky-200" />
                  <span>Руководство</span>
                </span>
                <ArrowRight className="h-3 w-3 text-white/60" />
              </button>

              {/* Support Ticket Button */}
              <button
                type="button"
                onClick={() => setIsSupportModalOpen(true)}
                className="flex items-center justify-between rounded-xl bg-sky-500/20 hover:bg-sky-500/35 border border-sky-300/25 px-3 py-2 text-xs font-bold text-sky-100 transition-all hover:text-white hover:border-sky-300/40 shadow-sm group/btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <span className="flex items-center gap-1.5">
                  <Headphones className="h-3.5 w-3.5 text-sky-300" />
                  <span>Написать в поддержку</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-1" />
              </button>
            </div>
          </div>

          {/* User Profile */}
          {currentUser && (
            <div className="border-t border-white/10 pt-6 mt-4">
              <div className="mb-3 flex items-center gap-3 rounded-lg px-3 py-2">
                <UserAvatar
                  name={currentUser.full_name}
                  avatarColor={currentUser.avatar_color}
                  presence={currentUser.presence}
                  className="h-10 w-10 text-sm"
                  statusClassName="h-3 w-3 border-[2px]"
                />
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-white">
                    {currentUser.full_name}
                  </p>
                  <p className="truncate text-xs text-white/60">
                    {(!currentUser.job_title || currentUser.job_title === '[]') ? 'Не указано' : currentUser.job_title}
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-300 transition-[background-color,color,transform] duration-200 hover:bg-rose-300/10 hover:text-rose-200 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                Выйти
              </button>
            </div>
          )}
        </div>
      </aside>

      {isSupportModalOpen && (
        <SupportModal onClose={() => setIsSupportModalOpen(false)} />
      )}

      {isGuidesModalOpen && (
        <UserGuidesModal
          isOpen={isGuidesModalOpen}
          onClose={() => setIsGuidesModalOpen(false)}
          initialMode="catalog"
          onOpenSupport={() => setIsSupportModalOpen(true)}
        />
      )}
    </>
  );
}
