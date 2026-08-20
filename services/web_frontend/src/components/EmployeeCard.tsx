import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { User } from '@/types';
import { Mail, Phone, Smartphone, MapPin, Edit } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAppStore } from '@/store/useAppStore';
import { ReportModal } from './ReportModal';
import { UserAvatar } from './UserAvatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cleanProfileValue as cleanValue } from '@/features/profile/lib/profileValues';
import { FALLBACK_ORG_COLOR, getOrgColor } from '@/theme/departmentColors';
import { getOrganizationTextColor } from '@/theme/organizationColors';
import { getAvatarColor } from '@/utils/avatar';

const HighlightedText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }

  const terms = highlight.split(' ').filter(Boolean);
  if (terms.length === 0) return <span>{text}</span>;

  const regexParts = terms.map((term) => {
    if (/^\d+$/.test(term)) {
      return term.split('').join('\\D*');
    }
    return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });

  const source = `(${regexParts.join('|')})`;
  const parts = text.split(new RegExp(source, 'gi'));
  const matches = new RegExp(`^${source}$`, 'i');

  return (
    <span>
      {parts.map((part, index) =>
        matches.test(part) ? (
          <mark key={index} className="rounded-[2px] bg-primary/20 text-foreground">{part}</mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
};

interface OverflowTooltipProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  tooltipContent?: React.ReactNode;
}

const OverflowTooltip = ({ value, children, className, tooltipContent }: OverflowTooltipProps) => {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const measureOverflow = useCallback(() => {
    const element = triggerRef.current;
    if (!element) return;
    setIsOverflowing(element.scrollWidth > element.clientWidth + 1);
  }, []);

  useLayoutEffect(() => {
    measureOverflow();
    const element = triggerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(measureOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isOverflowing, measureOverflow]);

  const trigger = (
    <span ref={triggerRef} className={className}>
      {children}
    </span>
  );

  if (!value || !isOverflowing) return trigger;

  return (
    <Tooltip delayDuration={350}>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="pointer-events-none max-w-[min(30rem,calc(100vw-2rem))] break-words text-left"
      >
        {tooltipContent ?? value}
      </TooltipContent>
    </Tooltip>
  );
};

const normalizeCardValue = (value: string | null | undefined) => {
  const normalized = cleanValue(value).trim();
  return normalized === '[]' ? '' : normalized;
};

const normalizedKey = (value: string) => value.toLocaleLowerCase('ru-RU');

interface EmployeeCardProps {
  user: User;
  onClick: () => void;
}

export const EmployeeCard = React.forwardRef<HTMLElement, EmployeeCardProps>(
  ({ user, onClick }, ref) => {
    const searchQuery = useAppStore((state) => state.searchQuery);
    const currentUser = useAppStore((state) => state.currentUser);
    const orgColors = useAppStore((state) => state.orgColors);
    const reduceMotion = useReducedMotion();
    const editButtonRef = useRef<HTMLButtonElement>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isTabExtended, setIsTabExtended] = useState(false);
    const isOwnProfile = currentUser?.id === user.id;

    const fullName = normalizeCardValue(user.full_name) || 'Имя не указано';
    const jobTitle = normalizeCardValue(user.job_title);
    const email = normalizeCardValue(user.email);
    const internalPhone = normalizeCardValue(user.internal_phone);
    const mobilePhone = normalizeCardValue(user.mobile_phone);
    const officeLocation = normalizeCardValue(user.office_location);
    const organization = normalizeCardValue(user.organization);
    const department = normalizeCardValue(user.department);
    const visibleDepartment = organization && normalizedKey(organization) === normalizedKey(department)
      ? ''
      : department;
    const avatarColor = getAvatarColor(fullName, user.avatar_color);
    const organizationColor = organization
      ? getOrgColor(organization, orgColors)
      : FALLBACK_ORG_COLOR;
    const organizationTextColor = getOrganizationTextColor(organizationColor);
    const organizationTabLabel = organization || 'Без организации';
    const contactItems = [
      { icon: Mail, label: 'Email', value: email, isPhone: false },
      { icon: Phone, label: 'Внутренний телефон', value: internalPhone, isPhone: true },
      { icon: Smartphone, label: 'Мобильный телефон', value: mobilePhone, isPhone: true },
      { icon: MapPin, label: 'Расположение', value: officeLocation, isPhone: false },
    ];
    const hasAnyContacts = contactItems.some(({ value }) => Boolean(value));

    const closeReportModal = () => {
      setIsReportModalOpen(false);
      requestAnimationFrame(() => editButtonRef.current?.focus());
    };

    const handleArticleClick = (event: React.MouseEvent<HTMLElement>) => {
      if ((event.target as Element).closest('[data-card-action]')) return;
      onClick();
    };

    return (
      <article
        data-card
        ref={ref}
        onClick={handleArticleClick}
        onPointerEnter={() => setIsTabExtended(true)}
        onPointerLeave={() => setIsTabExtended(false)}
        onFocusCapture={() => setIsTabExtended(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsTabExtended(false);
          }
        }}
        className={`group relative h-[328px] cursor-pointer overflow-visible rounded-[20px] border border-[#d9e5ee] bg-white shadow-[0_16px_36px_-28px_rgba(35,74,110,0.38)] transition-[transform,border-color,box-shadow,opacity,filter] duration-300 hover:-translate-y-0.5 hover:border-[#9fbcd2] hover:shadow-[0_24px_44px_-28px_rgba(35,74,110,0.52)] active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
          user.is_hidden ? 'opacity-65 grayscale-[0.12]' : ''
        }`}
      >
        <button
          type="button"
          data-card-trigger
          data-card-action
          aria-label={`Открыть профиль: ${fullName}`}
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
          className="absolute inset-0 z-[5] rounded-[19px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f70aa]/40 focus-visible:ring-offset-2"
        />

        <Tooltip delayDuration={350}>
          <TooltipTrigger asChild>
            <motion.span
              data-organization-tab
              tabIndex={0}
              aria-label={`Организация: ${organization || 'не указана'}`}
              initial={false}
              animate={{
                y: reduceMotion ? 0 : isTabExtended ? 0 : 17,
                boxShadow: !reduceMotion && isTabExtended
                  ? '0 7px 16px -6px rgba(22, 52, 78, 0.5)'
                  : '0 3px 8px -5px rgba(22, 52, 78, 0.4)',
              }}
              transition={{
                type: 'tween',
                duration: reduceMotion ? 0 : 0.25,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="absolute -top-[22px] left-5.5 z-0 flex h-7 min-w-14 max-w-[154px] items-start rounded-b-[2px] rounded-t-[7px] px-2.5 pt-1.5 text-[10px] font-semibold leading-3.5 tracking-[0.01em] shadow-sm outline-none will-change-transform focus-visible:ring-2 focus-visible:ring-[#2f70aa]/40 focus-visible:ring-offset-2"
              style={{ backgroundColor: organizationColor, color: organizationTextColor }}
            >
              <span className="truncate">{organizationTabLabel}</span>
            </motion.span>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>{organization || 'Организация не указана'}</TooltipContent>
        </Tooltip>

        <div className="relative z-10 h-[132px] overflow-hidden rounded-t-[19px] bg-[linear-gradient(145deg,#f8fbff_0%,#f2f7fb_100%)] px-5 pb-3 pt-5">
          <div className="flex h-full items-start gap-4">
            <UserAvatar
              name={fullName}
              avatarColor={avatarColor}
              presence={user.presence}
              className="h-16 w-16 text-xl shadow-[0_10px_22px_-14px_rgba(31,72,108,0.45)] ring-[3px] ring-[#bfd9e9]"
              statusClassName="h-4 w-4 border-[3px] !border-[#f7fbff]"
            />

            <div className="flex h-full min-w-0 flex-1 flex-col pt-0.5">
              <OverflowTooltip
                value={fullName}
                className="block h-6 truncate text-[19px] font-semibold leading-6 tracking-[-0.025em] text-[#102f4a]"
                tooltipContent={<HighlightedText text={fullName} highlight={searchQuery} />}
              >
                <HighlightedText text={fullName} highlight={searchQuery} />
              </OverflowTooltip>

              <OverflowTooltip
                value={jobTitle}
                className={`mt-1 block h-5 truncate text-[14px] font-medium leading-5 ${jobTitle ? 'text-[#3f607a]' : 'text-[#71879a]'}`}
                tooltipContent={<HighlightedText text={jobTitle} highlight={searchQuery} />}
              >
                {jobTitle ? <HighlightedText text={jobTitle} highlight={searchQuery} /> : 'Должность не указана'}
              </OverflowTooltip>

              <OverflowTooltip
                value={visibleDepartment}
                className={`mt-1 block h-[18px] truncate leading-[18px] ${visibleDepartment ? 'text-[12px] text-[#607b91]' : 'text-[12px] text-[#71879a]'}`}
                tooltipContent={<HighlightedText text={visibleDepartment} highlight={searchQuery} />}
              >
                {visibleDepartment ? (
                  <span className="text-[12px] font-normal">
                    <HighlightedText text={visibleDepartment} highlight={searchQuery} />
                  </span>
                ) : (
                  'Подразделение не указано'
                )}
              </OverflowTooltip>

              <div className={`mt-auto flex h-7 min-w-0 items-center gap-1.5 overflow-hidden ${!isOwnProfile ? 'pr-[88px]' : ''}`}>
                {(user.role === 'admin' || user.role === 'it_operator') && (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold leading-4 text-[#4c6378]">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    {user.role === 'admin' ? 'Админ' : 'IT'}
                  </span>
                )}
                {user.is_hidden && (
                  <span className="shrink-0 rounded border border-[#d3dee8] bg-white/80 px-1.5 py-0.5 text-[10px] font-medium leading-4 text-[#71869a]">
                    Скрыта
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {!isOwnProfile && (
          <button
            ref={editButtonRef}
            type="button"
            data-card-action
            onClick={(event) => {
              event.stopPropagation();
              setIsReportModalOpen(true);
            }}
            className="btn-secondary absolute right-5 top-[92px] z-30 h-7 border border-[#dbe6ef] px-2.5 py-1 text-xs opacity-0 shadow-sm transition-[opacity,transform] group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
          >
            <Edit className="h-[13px] w-[13px]" strokeWidth={2} />
            <span className="text-[12px] font-medium">Исправить</span>
          </button>
        )}

        <div className="relative z-10 h-[194px] px-5 pb-5 pt-4">
          {hasAnyContacts ? (
            <div className="flex flex-col gap-2.5">
              {contactItems.map(({ icon: Icon, label, value, isPhone }) => {
                const hasValue = Boolean(value);

                return (
                  <div
                    key={label}
                    aria-label={`${label}: ${hasValue ? value : 'Не указано'}`}
                    className={`flex h-8 min-w-0 items-center gap-3 text-[14px] ${hasValue ? 'text-[#1d3b55]' : 'text-[#8094a5]'}`}
                  >
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] ${
                        hasValue ? 'bg-[#edf5fa] text-[#2774aa]' : 'bg-[#f5f7f9] text-[#9aabb8]'
                      }`}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={hasValue ? 1.9 : 1.65} />
                    </div>
                    <OverflowTooltip
                      value={value}
                      className={`block min-w-0 flex-1 truncate ${hasValue ? 'font-medium' : 'text-[13px] font-normal'} ${isPhone ? 'tabular-nums' : ''}`}
                      tooltipContent={<HighlightedText text={value} highlight={searchQuery} />}
                    >
                      {hasValue ? <HighlightedText text={value} highlight={searchQuery} /> : 'Не указано'}
                    </OverflowTooltip>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[158px] items-center justify-center rounded-[12px] border border-dashed border-[#dce6ed] bg-[#f8fafb] text-[13px] text-[#7d92a3]">
              Контакты не указаны
            </div>
          )}
        </div>

        {isReportModalOpen && (
          <ReportModal
            user={user}
            onClose={closeReportModal}
          />
        )}
      </article>
    );
  }
);
