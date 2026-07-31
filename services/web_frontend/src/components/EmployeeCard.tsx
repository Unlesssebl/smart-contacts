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

    const hasContacts = email || internalPhone || mobilePhone || officeLocation;

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={`relative group cursor-pointer bg-white rounded-[12px] flex flex-col h-full overflow-hidden transition-all duration-200 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.08)] hover:shadow-[0_4px_12px_rgba(16,24,40,0.08)] hover:-translate-y-0.5 ${
          user.is_hidden ? 'opacity-60 grayscale-[0.2]' : ''
        }`}
      >
        {/* Left 4px Accent Bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-[12px] transition-colors pointer-events-none z-10"
          style={{ backgroundColor: orgColor }}
        />

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

        <div className="p-5 md:p-6 flex-1 flex flex-col pl-6">
          {/* TOP: Avatar and Primary Info (Horizontal Layout) */}
          <div className="flex items-start gap-4">
            <UserAvatar
              name={user.full_name}
              avatarColor={user.avatar_color}
              presence={user.presence}
            />

            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="truncate font-semibold text-[#0F1729] text-[16px] leading-tight tracking-tight">
                <HighlightedText text={user.full_name} highlight={searchQuery} />
              </h3>
              
              {user.job_title && user.job_title !== '[]' && (
                <p className="mt-0.5 truncate text-[14px] text-[#64748B] font-normal leading-snug">
                  <HighlightedText text={user.job_title} highlight={searchQuery} />
                </p>
              )}

              {/* Badges */}
              <div className="mt-2 flex items-center flex-wrap gap-2 text-[11px]">
                {(user.role === 'admin' || user.role === 'it_operator') && (
                  <span className="inline-flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-100 font-medium px-2 py-0.5 rounded-md">
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    {user.role === 'admin' ? 'Админ' : 'IT'}
                  </span>
                )}
                
                {user.is_hidden && (
                  <span className="inline-flex items-center text-slate-500 bg-slate-100 border border-slate-200 font-medium rounded-md px-2 py-0.5">
                    Скрыта
                  </span>
                )}

                {cleanValue(user.department) && (
                  <span 
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] truncate max-w-full"
                    style={{ 
                      backgroundColor: `${orgColor}1F`, // 12% opacity hex
                      color: orgColor
                    }}
                  >
                    {cleanValue(user.department)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* BOTTOM: Contact Info Block (Conditional Rendering) */}
          {hasContacts && (
            <div className="mt-5 pt-4 flex flex-col gap-2.5 border-t border-slate-100">
              {email && (
                <div className="flex items-center gap-2.5 text-[13px] text-[#475569]">
                  <Mail className="h-[14px] w-[14px] text-[#94A3B8] shrink-0" strokeWidth={2} />
                  <div className="truncate font-medium"><HighlightedText text={email} highlight={searchQuery} /></div>
                </div>
              )}
              {internalPhone && (
                <div className="flex items-center gap-2.5 text-[13px] text-[#475569]">
                  <Phone className="h-[14px] w-[14px] text-[#94A3B8] shrink-0" strokeWidth={2} />
                  <div className="truncate font-medium"><HighlightedText text={internalPhone} highlight={searchQuery} /></div>
                </div>
              )}
              {mobilePhone && (
                <div className="flex items-center gap-2.5 text-[13px] text-[#475569]">
                  <Smartphone className="h-[14px] w-[14px] text-[#94A3B8] shrink-0" strokeWidth={2} />
                  <div className="truncate font-medium"><HighlightedText text={mobilePhone} highlight={searchQuery} /></div>
                </div>
              )}
              {officeLocation && (
                <div className="flex items-center gap-2.5 text-[13px] text-[#475569]">
                  <MapPin className="h-[14px] w-[14px] text-[#94A3B8] shrink-0" strokeWidth={2} />
                  <div className="truncate font-medium"><HighlightedText text={officeLocation} highlight={searchQuery} /></div>
                </div>
              )}
            </div>
          )}
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

