import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Home, User, LogOut, Shield } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { motion } from 'motion/react';
import { UserAvatar } from './UserAvatar';
import { SupportModal } from './SupportModal';

export function Sidebar() {
  const location = useLocation();
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
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

          {/* Help / Support Card */}
          <div className="mb-6 mt-auto rounded-2xl border border-white/20 bg-white/[0.11] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
            <h4 className="text-sm font-semibold text-white">Нужна помощь?</h4>
            <p className="mt-1 text-xs text-white/70 leading-relaxed">
              Если у вас возникли проблемы с доступом или поиском сотрудников, обратитесь в поддержку.
            </p>
            <button
              type="button"
              onClick={() => setIsSupportModalOpen(true)}
              className="mt-3 inline-block rounded text-xs font-semibold text-white/90 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Написать в поддержку &rarr;
            </button>
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
    </>
  );
}
