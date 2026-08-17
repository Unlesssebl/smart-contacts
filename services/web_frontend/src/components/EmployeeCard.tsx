import React, { useState } from 'react';
import type { User } from '@/types';
import { Mail, Phone, Smartphone, MapPin, Edit } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppStore } from '@/store/useAppStore';
import { ReportModal } from './ReportModal';
import { UserAvatar } from './UserAvatar';
import { cleanProfileValue as cleanValue } from '@/features/profile/lib/profileValues';
import { getAvatarColor } from '@/utils/avatar';

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
    <span>
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
    const [isTabExtended, setIsTabExtended] = useState(false);
    const isOwnProfile = currentUser?.id === user.id;

    const jobTitle = cleanValue(user.job_title);
    const email = cleanValue(user.email);
    const internalPhone = cleanValue(user.internal_phone);
    const mobilePhone = cleanValue(user.mobile_phone);
    const officeLocation = cleanValue(user.office_location);
    const organization = cleanValue(user.organization);
    const department = cleanValue(user.department);
    const affiliation = [organization, department].filter(Boolean).join(' · ');
    const avatarColor = getAvatarColor(user.full_name, user.avatar_color);
    const contactItems = [
      { icon: Mail, label: 'Email', value: email },
      { icon: Phone, label: 'Внутренний телефон', value: internalPhone },
      { icon: Smartphone, label: 'Мобильный телефон', value: mobilePhone },
      { icon: MapPin, label: 'Расположение', value: officeLocation },
    ];

    return (
      <div
        data-card
        ref={ref}
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={`Открыть профиль: ${user.full_name}`}
        onPointerEnter={() => setIsTabExtended(true)}
        onPointerLeave={() => setIsTabExtended(false)}
        onFocusCapture={() => setIsTabExtended(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsTabExtended(false);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
          }
        }}
        className={`group relative flex cursor-pointer flex-col overflow-visible rounded-[20px] border border-[#d9e5ee] bg-white shadow-[0_16px_36px_-28px_rgba(35,74,110,0.38)] transition-[transform,border-color,box-shadow,opacity,filter] duration-300 hover:-translate-y-0.5 hover:border-[#9fbcd2] hover:shadow-[0_24px_44px_-28px_rgba(35,74,110,0.52)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f70aa]/40 focus-visible:ring-offset-2 ${
          user.is_hidden ? 'opacity-65 grayscale-[0.12]' : ''
        }`}
      >
        {!isOwnProfile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsReportModalOpen(true);
            }}
            className="btn-secondary absolute right-4 top-4 z-20 border border-[#dbe6ef] px-3 py-1.5 text-xs opacity-0 shadow-sm transition-[opacity,transform] group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
          >
            <Edit className="h-[14px] w-[14px]" strokeWidth={2} />
            <span className="text-sm font-medium">Исправить</span>
          </button>
        )}

        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{
            y: isTabExtended ? 0 : 5,
            boxShadow: isTabExtended
              ? '0 7px 16px -6px rgba(22, 52, 78, 0.5)'
              : '0 3px 8px -5px rgba(22, 52, 78, 0.4)',
          }}
          transition={{ type: 'tween', duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          className="pointer-events-none absolute -top-2 left-5.5 z-0 h-[11px] w-14 rounded-b-[2px] rounded-t-[6px] will-change-transform"
          style={{ backgroundColor: avatarColor }}
        />

        {/* Identity */}
        <div className="relative z-10 h-[132px] shrink-0 overflow-hidden rounded-t-[19px] bg-[linear-gradient(145deg,#f8fbff_0%,#f2f7fb_100%)] px-5 pb-4 pt-5">
          <div className="flex items-start gap-4">
            <UserAvatar
              name={user.full_name}
              avatarColor={avatarColor}
              presence={user.presence}
              className="h-16 w-16 text-xl shadow-[0_10px_22px_-14px_rgba(31,72,108,0.45)] ring-[3px] ring-[#bfd9e9]"
              statusClassName="h-4 w-4 border-[3px] !border-[#f7fbff]"
            />

            <div className="min-w-0 flex-1 pt-0.5">
              <h3 title={user.full_name} className="truncate text-[19px] font-semibold leading-6 tracking-[-0.025em] text-[#102f4a]">
                <HighlightedText text={user.full_name} highlight={searchQuery} />
              </h3>
              <p
                title={jobTitle || undefined}
                className={`mt-1.5 h-5 truncate text-[14px] font-medium leading-5 ${jobTitle ? 'text-[#3f607a]' : 'text-[#71879a]'}`}
              >
                {jobTitle ? <HighlightedText text={jobTitle} highlight={searchQuery} /> : 'Должность не указана'}
              </p>

              <div className="mt-1.5 flex h-[18px] min-w-0 items-center gap-1.5 text-[12px] leading-[18px] text-[#536f86]">
                {(user.role === 'admin' || user.role === 'it_operator') && (
                  <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#4c6378]">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    {user.role === 'admin' ? 'Админ' : 'IT'}
                  </span>
                )}
                {user.is_hidden && (
                  <span className="shrink-0 rounded border border-[#d3dee8] bg-white px-1.5 py-0.5 text-[11px] font-medium text-[#71869a]">
                    Скрыта
                  </span>
                )}
                <span
                  title={affiliation || undefined}
                  className={`min-w-0 truncate ${affiliation ? 'font-medium text-[#536f86]' : 'text-[#71879a]'}`}
                >
                  {affiliation || 'Подразделение не указано'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contacts */}
        <div className="px-5 pb-5 pt-4">
          <div className="flex flex-col gap-2.5">
            {contactItems.map(({ icon: Icon, label, value }) => {
              const hasValue = Boolean(value.trim());

              return (
                <div
                  key={label}
                  aria-label={`${label}: ${hasValue ? value : 'Не указано'}`}
                  className={`flex min-h-8 min-w-0 items-center gap-3 text-[14px] ${hasValue ? 'text-[#1d3b55]' : 'text-[#71879a]'}`}
                >
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] ${
                      hasValue ? 'bg-[#edf5fa] text-[#2774aa]' : 'bg-[#f3f6f8] text-[#829bac]'
                    }`}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={hasValue ? 2 : 1.75} />
                  </div>
                  <div title={hasValue ? value : undefined} className={`min-w-0 flex-1 truncate ${hasValue ? 'font-medium' : 'text-[13px] font-normal'}`}>
                    {hasValue ? <HighlightedText text={value} highlight={searchQuery} /> : 'Не указано'}
                  </div>
                </div>
              );
            })}
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


