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

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-72 z-20 flex flex-col bg-white border-r border-[#EEF1F4] shadow-[4px_0_24px_rgba(15,34,58,0.015)] transform-gpu"
    >
      <div className="flex h-full flex-col px-6 py-6">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-start pl-2">
          <img
            src="/GK_logo.png"
            alt="ТЭМПО"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Navigation */}
        <div className="flex-1 mt-4">
          <nav className="flex flex-col space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-3 rounded-xl px-4 py-3 transition-all group ${
                    active 
                      ? 'text-[#2B5FE0] bg-[#EEF2FF] font-semibold' 
                      : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F1729] font-medium'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#2B5FE0] rounded-r-full"
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    />
                  )}
                  <Icon className={`relative z-10 h-[18px] w-[18px] ${active ? 'text-[#2B5FE0]' : 'text-[#94A3B8] group-hover:text-[#475569]'}`} strokeWidth={1.5} />
                  <span className="relative z-10 text-[14px]">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Help / Support Card */}
        <div className="mt-auto mb-6 rounded-2xl bg-[#F8FAFC] p-4 border border-[#EEF1F4] shadow-sm">
          <h4 className="text-[13px] font-semibold text-slate-800">Нужна помощь?</h4>
          <p className="mt-1.5 text-[12px] text-slate-500 leading-relaxed">
            Если у вас возникли проблемы с доступом или поиском сотрудников, обратитесь в поддержку.
          </p>
          <a
            href="#"
            className="mt-3 inline-block text-[12px] font-semibold text-[#2B5FE0] transition-colors hover:text-[#2B5FE0]/80"
          >
            Написать в поддержку &rarr;
          </a>
        </div>

        {/* User Profile */}
        {currentUser && (
          <div className="border-t border-[#EEF1F4] pt-6 mt-4">
            <div className="mb-3 flex items-center gap-3 rounded-lg px-2 py-2">
              <UserAvatar
                name={currentUser.full_name}
                avatarColor={currentUser.avatar_color}
                presence={currentUser.presence}
                className="h-10 w-10 text-sm"
                statusClassName="h-3 w-3 border-[2px] border-white"
              />
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-[13px] font-semibold text-slate-900">
                  {currentUser.full_name}
                </p>
                <p className="truncate text-[11px] text-slate-500 mt-0.5">
                  {(!currentUser.job_title || currentUser.job_title === '[]') ? 'Не указано' : currentUser.job_title}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
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

