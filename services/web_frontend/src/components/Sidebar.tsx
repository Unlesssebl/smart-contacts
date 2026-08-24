import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Home, User, LogOut, Shield } from 'lucide-react';
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
        className="fixed left-0 top-0 z-20 flex h-screen w-[19.5rem] flex-col shadow-[18px_0_48px_rgba(16,45,79,0.12)] transform-gpu"
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
          <div className="relative mb-6 mt-auto overflow-hidden rounded-2xl border border-sky-300/35 bg-gradient-to-br from-white/[0.18] via-white/[0.09] to-sky-400/[0.16] p-4 shadow-[0_8px_28px_rgba(7,31,60,0.18),inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-xl transition-all duration-300 hover:border-sky-300/50 hover:shadow-[0_10px_32px_rgba(7,31,60,0.25)] group">
            {/* Ambient Background Glow */}
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-sky-400/20 blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />

            <div className="relative z-10 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white tracking-tight">Помощь</h4>
              <span className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-200 backdrop-blur-sm">
                IT-служба
              </span>
            </div>

            <p className="relative z-10 mt-2 text-xs leading-relaxed text-white/80">
              Руководство по справочнику или обращение в службу поддержки.
            </p>

            {/* Divider */}
            <div className="relative z-10 my-3.5 h-px w-full bg-gradient-to-r from-transparent via-white/25 to-transparent" />

            <div className="relative z-10 flex flex-col gap-2">
              {/* Guides Button (Secondary) */}
              <button
                type="button"
                onClick={() => setIsGuidesModalOpen(true)}
                className="flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2 text-xs font-medium text-white/85 transition-all duration-200 hover:border-white/25 hover:bg-white/[0.14] hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Руководство
              </button>

              {/* Support Ticket Button (Primary Matte Blue Action) */}
              <button
                type="button"
                onClick={() => setIsSupportModalOpen(true)}
                className="flex w-full items-center justify-center rounded-xl border border-sky-300/30 bg-sky-500/25 px-3 py-2 text-xs font-medium text-white transition-all duration-200 hover:border-sky-300/45 hover:bg-sky-500/35 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Написать в поддержку
              </button>
            </div>
          </div>

          {/* User Profile */}
          {currentUser && (() => {
            const clean = (val?: string | null) => {
              if (!val || val === '[]' || val.trim() === '') return null;
              return val.trim();
            };

            const userSubtitle =
              clean(currentUser.job_title) ||
              clean(currentUser.department) ||
              clean(currentUser.organization) ||
              clean(currentUser.email) ||
              clean(currentUser.internal_phone) ||
              clean(currentUser.mobile_phone) ||
              clean(currentUser.office_location) ||
              '(контактные данные не указаны)';

            return (
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
                    <p className="truncate text-sm font-medium text-white" title={currentUser.full_name}>
                      {currentUser.full_name}
                    </p>
                    <p className="truncate text-xs text-white/60" title={userSubtitle}>
                      {userSubtitle}
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
            );
          })()}
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
