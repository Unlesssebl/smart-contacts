import React, { useState } from 'react';
import type { User } from '@/types';
import { Mail, Phone, Smartphone, MapPin, Edit } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ReportModal } from './ReportModal';
import { UserAvatar } from './UserAvatar';

const cleanValue = (val: string | null | undefined) => (val === '[]' || !val) ? '' : val;

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
        className={`relative group cursor-pointer p-6 bg-white/40 backdrop-blur-md border border-white/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl hover:-translate-y-1 hover:border-primary/30 hover:bg-white/60 hover:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col h-full overflow-hidden ${user.is_hidden ? 'opacity-60 grayscale-[0.2]' : ''}`}
      >
        {/* Top hover accent line */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-primary origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100 z-10" />
        {!isOwnProfile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsReportModalOpen(true);
            }}
            className="btn-secondary absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-xs px-3 py-1.5"
          >
            <Edit className="h-[14px] w-[14px]" strokeWidth={2} />
            <span className="text-sm font-medium">Исправить</span>
          </button>
        )}

        {/* TOP: Avatar and Primary Info */}
        <div className="flex items-start gap-4">
          {/* Avatar with online status */}
          <UserAvatar 
            name={user.full_name} 
            presence={user.presence} 
            className="h-16 w-16 text-xl shadow-md"
            statusClassName="h-4 w-4 border-[3px]"
          />

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
                <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary/80 ring-1 ring-inset ring-primary/20 truncate max-w-full">
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
              <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary/5 text-primary/70 shadow-sm border border-primary/10">
                <Mail className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <div className="truncate flex-1 font-medium">{displayValue(user.email)}</div>
            </div>
            {/* Phone Block (Consistent 2 slots) */}
            <div className="flex items-center gap-3.5 text-[14px] text-slate-700">
              <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary/5 text-primary/70 shadow-sm border border-primary/10">
                <Phone className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <div className="truncate flex-1 font-medium">{displayValue(user.internal_phone)}</div>
            </div>
            
            <div className="flex items-center gap-3.5 text-[14px] text-slate-700">
              <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary/5 text-primary/70 shadow-sm border border-primary/10">
                <Smartphone className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <div className="truncate flex-1 font-medium">{displayValue(user.mobile_phone)}</div>
            </div>

            <div className="flex items-center gap-3.5 text-[14px] text-slate-700">
              <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary/5 text-primary/70 shadow-sm border border-primary/10">
                <MapPin className="h-4 w-4" strokeWidth={2.5} />
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
