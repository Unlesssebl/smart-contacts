import { Link, useLocation } from 'react-router';
import { Home, User, LogOut, Shield } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { motion } from 'motion/react';
import { UserAvatar } from './UserAvatar';

export function Sidebar() {
  const location = useLocation();
  const { currentUser, logout } = useAppStore();

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'it_operator';

  const navItems = [
    { icon: Home, label: 'Справочник', path: '/' },
    { icon: User, label: 'Мой профиль', path: `/profile/${currentUser?.id}` },
    ...(isAdmin ? [{ icon: Shield, label: 'Панель администратора', path: '/admin' }] : []),
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-72 z-20 flex flex-col shadow-[20px_0_60px_rgba(0,0,0,0.1)]"
      style={{
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(53, 114, 179, 0.7), rgba(27, 72, 126, 0.86)), url("/login_background.png")',
        backgroundSize: '4px 4px, cover, cover',
        backgroundPosition: '0 0, center, center',
        backgroundRepeat: 'repeat, no-repeat, no-repeat'
      }}
    >
      <div className="flex h-full flex-col px-6 py-6">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-start">
          <img
            src="/GK_logo.png"
            alt="ТЭМПО"
            className="h-10 w-auto object-contain invert brightness-0"
          />
        </div>

        {/* Navigation */}
        <div className="flex-1 mt-4">
          <nav className="flex flex-col space-y-1 bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-2xl shadow-sm">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors group ${active ? 'text-white' : 'text-white/70 hover:text-white'}`}
                >
                  {active && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-xl bg-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
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
        <div className="mt-auto mb-6 rounded-2xl bg-white/10 p-4 border border-white/20 backdrop-blur-md shadow-sm">
          <h4 className="text-sm font-medium text-white">Нужна помощь?</h4>
          <p className="mt-1 text-xs text-white/70 leading-relaxed">
            Если у вас возникли проблемы с доступом или поиском сотрудников, обратитесь в поддержку.
          </p>
          <a
            href="#"
            className="mt-3 inline-block text-xs font-medium text-white/90 transition-colors hover:text-white"
          >
            Написать в поддержку &rarr;
          </a>
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
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              Выйти
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
