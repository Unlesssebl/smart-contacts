import React, { useState } from 'react';
import type { User } from '@/types';
import { Mail, Phone, MapPin, Edit } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ReportModal } from './ReportModal';

const cleanValue = (val: string | null | undefined) => (val === '[]' || !val) ? '' : val;

const getAvatarColorForName = (name: string) => {
  const colors = [
    'from-blue-500/40 to-blue-500/15 text-blue-800 border-blue-500/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_4px_10px_rgba(59,130,246,0.25)]',
    'from-emerald-500/40 to-emerald-500/15 text-emerald-800 border-emerald-500/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_4px_10px_rgba(16,185,129,0.25)]',
    'from-purple-500/40 to-purple-500/15 text-purple-800 border-purple-500/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_4px_10px_rgba(168,85,247,0.25)]',
    'from-rose-500/40 to-rose-500/15 text-rose-800 border-rose-500/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_4px_10px_rgba(244,63,94,0.25)]',
    'from-amber-500/40 to-amber-500/15 text-amber-800 border-amber-500/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_4px_10px_rgba(245,158,11,0.25)]',
    'from-teal-500/40 to-teal-500/15 text-teal-800 border-teal-500/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_4px_10px_rgba(20,184,166,0.25)]',
    'from-indigo-500/40 to-indigo-500/15 text-indigo-800 border-indigo-500/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_4px_10px_rgba(99,102,241,0.25)]',
    'from-fuchsia-500/40 to-fuchsia-500/15 text-fuchsia-800 border-fuchsia-500/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_4px_10px_rgba(217,70,239,0.25)]',
    'from-cyan-500/40 to-cyan-500/15 text-cyan-800 border-cyan-500/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_4px_10px_rgba(6,182,212,0.25)]',
    'from-orange-500/40 to-orange-500/15 text-orange-800 border-orange-500/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_4px_10px_rgba(249,115,22,0.25)]',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const HighlightedText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }
  
  const terms = highlight.split(' ').filter(Boolean);
  if (terms.length === 0) return <span>{text}</span>;

  const regexParts = terms.map(t => {
    // Если запрос состоит только из цифр, разрешаем любые нецифровые символы между ними
    // Например, "4987" превратится в "4\D*9\D*8\D*7", что найдет "49-87" или "+7 (498) 7..."
    if (/^\d+$/.test(t)) {
      return t.split('').join('\\D*');
    }
    return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });

  const regex = new RegExp(`(${regexParts.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className="truncate">
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-primary/20 text-foreground rounded-[2px]">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

interface EmployeeCardProps {
  user: User;
  onClick: () => void;
}

export const EmployeeCard = React.forwardRef<HTMLDivElement, EmployeeCardProps>(
  ({ user, onClick }, ref) => {
    const searchQuery = useAppStore(state => state.searchQuery);
    const currentUser = useAppStore(state => state.currentUser);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const isOwnProfile = currentUser?.id === user.id;
    
    const displayValue = (val: string | null | undefined) => {
      const cleaned = cleanValue(val);
      if (!cleaned.trim()) {
        return (
          <span className="text-slate-300 font-normal">
            Не указано
          </span>
        );
      }
      return <HighlightedText text={cleaned} highlight={searchQuery} />;
    };

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={`relative group cursor-pointer p-6 bg-white border border-slate-200/50 rounded-3xl hover:border-slate-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 flex flex-col h-full ${user.is_hidden ? 'opacity-60 grayscale-[0.2]' : ''}`}
      >
        {!isOwnProfile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsReportModalOpen(true);
            }}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors opacity-0 group-hover:opacity-100 border border-slate-200 bg-white shadow-sm"
          >
            <Edit className="h-[18px] w-[18px]" strokeWidth={2} />
            <span className="text-sm font-medium">Исправить</span>
          </button>
        )}

        {/* TOP: Avatar and Primary Info */}
        <div className="flex items-start gap-4">
          {/* Avatar with online status */}
          <div className="relative flex-shrink-0">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full border bg-gradient-to-br backdrop-blur-sm ${getAvatarColorForName(user.full_name)} text-xl font-medium`}>
              {user.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()}
            </div>
            <div
              className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-[3px] ${
                user.presence === 'online' ? 'border-white bg-emerald-500' :
                user.presence === 'away' ? 'border-white bg-amber-400' :
                'border-white bg-slate-200'
              }`}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="truncate font-semibold text-slate-900 text-[17px] tracking-tight leading-tight">
              <HighlightedText text={user.full_name} highlight={searchQuery} />
            </h3>
            {user.job_title && user.job_title !== '[]' && (
              <p className="mt-1.5 truncate text-[14px] text-slate-500 font-medium leading-snug">{user.job_title}</p>
            )}

            {/* Sub Info: Org, Dept, Role */}
            <div className="mt-2.5 flex items-center flex-wrap gap-x-1.5 gap-y-1 text-[13px] text-slate-500">
              {(user.role === 'admin' || user.role === 'it_operator') && (
                <span className="inline-flex items-center gap-1 text-rose-500 font-medium mr-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  {user.role === 'admin' ? 'Админ' : 'IT'}
                </span>
              )}
              {user.is_hidden && (
                <span className="inline-flex items-center gap-1 text-slate-500 font-medium mr-1 border border-slate-200 rounded px-1.5 py-0.5">
                  Скрыта
                </span>
              )}
              {cleanValue(user.organization) && (
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 truncate max-w-full">
                  {cleanValue(user.organization)}
                </span>
              )}
              {cleanValue(user.department) && (
                <span className="inline-flex items-center rounded-md bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary/80 ring-1 ring-inset ring-primary/20 truncate max-w-full">
                  {cleanValue(user.department)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM: Contact Info Block */}
        <div className="mt-auto pt-8">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-3.5 text-[14px] text-slate-700">
              <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary/5 text-primary/60">
                <Mail className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className="truncate flex-1 font-medium">{displayValue(user.email)}</div>
            </div>
            <div className="flex items-center gap-3.5 text-[14px] text-slate-700">
              <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary/5 text-primary/60">
                <Phone className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className="truncate flex-1 font-medium">{displayValue(user.internal_phone)}</div>
            </div>
            <div className="flex items-center gap-3.5 text-[14px] text-slate-700">
              <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary/5 text-primary/60">
                <MapPin className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className="truncate flex-1 font-medium">{displayValue(user.office_location)}</div>
            </div>
          </div>
        </div>

        {isReportModalOpen && (
          <ReportModal
            user={user}
            onClose={() => setIsReportModalOpen(false)}
          />
        )}
      </div>
    );
  }
);
