import { Link, useLocation } from 'react-router';
import { Home, User, Settings, LogOut, Shield } from 'lucide-react';
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

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed left-0 top-0 h-screen w-64 p-6 glass border-y-0 border-l-0 rounded-none shadow-xl z-20"
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="mb-10">
          <h1 className="bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
            Crystal
          </h1>
          <p className="mt-1 text-sm text-[#8E8E93]">Корпоративный справочник</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                style={{
                  color: active ? 'var(--primary)' : 'var(--foreground)',
                }}
              >
                {active && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-lg bg-sidebar-accent"
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  />
                )}
                <Icon className="relative z-10 h-5 w-5" strokeWidth={1.5} />
                <span className="relative z-10 text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        {currentUser && (
          <div className="border-t border-black/5 pt-4">
            <div className="mb-3 flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-medium text-white shadow-md">
                  {currentUser.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                {currentUser.is_online && (
                  <motion.div
                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
                    style={{ background: '#34C759' }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-foreground">
                  {currentUser.full_name}
                </p>
                <p className="truncate text-xs text-muted-foreground">{currentUser.job_title}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#FF3B30] transition-colors hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              Выйти
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
