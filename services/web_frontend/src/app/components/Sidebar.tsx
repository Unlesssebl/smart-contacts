import { Link, useLocation } from 'react-router';
import { Home, User, LogOut, Shield } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { motion } from 'motion/react';

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
      className="fixed left-0 top-0 h-screen w-72 bg-white border-r border-border z-20 flex flex-col"
    >
      <div className="flex h-full flex-col px-6 py-6">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-start">
          <img
            src="/GK_logo.png"
            alt="ТЭМПО"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                style={{
                  color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
                }}
              >
                {active && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-lg bg-black/5"
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  />
                )}
                <Icon className="relative z-10 h-5 w-5" strokeWidth={1.5} />
                <span className="relative z-10 text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Help / Support Card */}
        <div className="mt-auto mb-6 rounded-xl bg-black/5 p-4 border border-black/5">
          <h4 className="text-sm font-medium text-foreground">Нужна помощь?</h4>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Если у вас возникли проблемы с доступом или поиском сотрудников, обратитесь в поддержку.
          </p>
          <a
            href="#"
            className="mt-3 inline-block text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            Написать в поддержку &rarr;
          </a>
        </div>

        {/* User Profile */}
        {currentUser && (
          <div className="border-t border-black/5 pt-6 mt-4">
            <div className="mb-3 flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-medium text-white shadow-md">
                  {getInitials(currentUser.full_name)}
                </div>
                <motion.div
                  className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border ${
                    currentUser.presence === 'online' ? 'border-white bg-emerald-500' :
                    currentUser.presence === 'away' ? 'border-white bg-amber-400' :
                    'border-slate-300 bg-white'
                  }`}
                  animate={currentUser.presence === 'online' ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                  transition={currentUser.presence === 'online' ? { repeat: Infinity, duration: 2 } : {}}
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-foreground">
                  {currentUser.full_name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {(!currentUser.job_title || currentUser.job_title === '[]') ? 'Не указано' : currentUser.job_title}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
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
