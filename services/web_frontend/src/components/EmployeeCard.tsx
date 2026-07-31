import React, { useState } from 'react';
import type { User } from '@/types';
import { Mail, Phone, Smartphone, MapPin, Edit } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ReportModal } from './ReportModal';
import { UserAvatar } from './UserAvatar';
import { getOrgColor } from '@/theme/departmentColors';

const cleanValue = (val: string | null | undefined) => (val === '[]' || !val) ? '' : val;

const HighlightedText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }

  const terms = highlight.split(' ').filter(Boolean);
  if (terms.length === 0) return <span>{text}</span>;

  const regexParts = terms.map(t => {
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
    const orgColors = useAppStore(state => state.orgColors);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const isOwnProfile = currentUser?.id === user.id;

    const orgColor = getOrgColor(user.organization, orgColors);

    const email = cleanValue(user.email);
    const internalPhone = cleanValue(user.internal_phone);
    const mobilePhone = cleanValue(user.mobile_phone);
    const officeLocation = cleanValue(user.office_location);
    const displayValue = (val: string | null | undefined) => {
      const cleaned = cleanValue(val);
      if (!cleaned.trim()) {
        return (
          <span className="text-slate-400 font-medium italic text-[13px]">
            Не указано
          </span>
        );
      }
      return <HighlightedText text={cleaned} highlight={searchQuery} />;
    };

    return (
      <div
        data-card
        ref={ref}
        onClick={onClick}
        className={`relative group cursor-pointer p-6 bg-white border border-slate-200/90 shadow-[0_14px_34px_-28px_rgba(15,34,58,0.42)] rounded-[20px] hover:-translate-y-1 hover:border-[#9fb9d4] hover:shadow-[0_24px_42px_-28px_rgba(15,34,58,0.62)] transition-all duration-300 flex flex-col h-full overflow-hidden ${
          user.is_hidden ? 'opacity-60 grayscale-[0.2]' : ''
        }`}
      >
        {/* Top Blue Header Banner */}
        <div
          className="absolute inset-x-0 top-0 h-[124px] pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, #356b99 0%, #1b497a 100%)',
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[120px] pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'url("/login_background.png")',
            backgroundSize: '460px auto',
            backgroundPosition: 'center 56%',
          }}
        />
        <div className="absolute -right-12 top-[-116px] h-56 w-56 rounded-full border border-white/15 pointer-events-none" />
        <div className="absolute right-9 top-8 h-2.5 w-2.5 rounded-full bg-[#b9d9ee] shadow-[0_0_0_6px_rgba(185,217,238,0.1)] pointer-events-none" />
        <div className="absolute inset-x-0 top-[122px] h-[2px] bg-[#b9d9ee] pointer-events-none" />

        {!isOwnProfile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsReportModalOpen(true);
            }}
            className="btn-secondary absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-xs px-3 py-1.5 z-20 shadow-sm"
          >
            <Edit className="h-[14px] w-[14px]" strokeWidth={2} />
            <span className="text-sm font-medium">Исправить</span>
          </button>
        )}

        {/* TOP: Avatar and Primary Info (On Blue Banner) */}
        <div className="relative flex items-start gap-4 z-10">
          <UserAvatar
            name={user.full_name}
            avatarColor={user.avatar_color}
            presence={user.presence}
            className="h-16 w-16 text-xl shadow-[0_9px_20px_-10px_rgba(1,25,47,0.65)] ring-4 ring-white/25"
            statusClassName="h-4 w-4 border-[3px]"
          />

          <div className="flex-1 min-w-0 pt-1">
            <h3 className="truncate font-semibold text-white text-[18px] tracking-[-0.025em] leading-tight">
              <HighlightedText text={user.full_name} highlight={searchQuery} />
            </h3>
            {user.job_title && user.job_title !== '[]' && (
              <p className="mt-1.5 truncate text-[14px] text-white/80 font-medium leading-snug">
                <HighlightedText text={user.job_title} highlight={searchQuery} />
              </p>
            )}

            {/* Sub Info: Org, Dept, Role */}
            <div className="mt-2.5 flex items-center flex-wrap gap-x-1.5 gap-y-1 text-[13px] text-white/75">
              {(user.role === 'admin' || user.role === 'it_operator') && (
                <span className="inline-flex items-center gap-1 text-white font-medium mr-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-rose-200" />
                  {user.role === 'admin' ? 'Админ' : 'IT'}
                </span>
              )}
              {user.is_hidden && (
                <span className="inline-flex items-center gap-1 text-white/80 font-medium mr-1 border border-white/25 rounded px-1.5 py-0.5">
                  Скрыта
                </span>
              )}
              {cleanValue(user.organization) && (
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium truncate max-w-full bg-white/[0.16] text-white ring-1 ring-inset ring-white/20">
                  {cleanValue(user.organization)}
                </span>
              )}
              {cleanValue(user.department) && (
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium truncate max-w-full bg-white/[0.12] text-white/90 ring-1 ring-inset ring-white/15">
                  {cleanValue(user.department)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM: Contact Info Block (Below Banner) */}
        <div className="mt-auto pt-9">
          <div className="flex flex-col divide-y divide-slate-200/85 border-t border-slate-200/85">
            <div className="flex items-center gap-3.5 py-3 text-[14px] text-slate-700">
              <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-[#f0f5fa] text-[#3670a8]">
                <Mail className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <div className="truncate flex-1 font-medium">{displayValue(email)}</div>
            </div>
            <div className="flex items-center gap-3.5 py-3 text-[14px] text-slate-700">
              <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-[#f0f5fa] text-[#3670a8]">
                <Phone className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <div className="truncate flex-1 font-medium">{displayValue(internalPhone)}</div>
            </div>
            <div className="flex items-center gap-3.5 py-3 text-[14px] text-slate-700">
              <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-[#f0f5fa] text-[#3670a8]">
                <Smartphone className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <div className="truncate flex-1 font-medium">{displayValue(mobilePhone)}</div>
            </div>
            <div className="flex items-center gap-3.5 py-3 text-[14px] text-slate-700">
              <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-[#f0f5fa] text-[#3670a8]">
                <MapPin className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <div className="truncate flex-1 font-medium">{displayValue(officeLocation)}</div>
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


