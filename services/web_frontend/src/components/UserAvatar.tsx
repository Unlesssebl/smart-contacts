import { getAvatarColor } from '@/utils/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface UserAvatarProps {
  name: string;
  avatarColor?: string | null;
  presence?: 'online' | 'offline' | 'away' | string | null;
  className?: string;
  statusClassName?: string;
}

export function UserAvatar({ 
  name, 
  avatarColor,
  presence, 
  className = "h-[56px] w-[56px] min-w-[56px] min-h-[56px] text-[18px]", 
  statusClassName = "h-[10px] w-[10px] border-[2px]" 
}: UserAvatarProps) {
  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const color = getAvatarColor(name, avatarColor);

  const presenceTitle = presence === 'online'
    ? 'В сети'
    : presence === 'away'
      ? 'Отошёл'
      : presence === 'offline'
        ? 'Не в сети'
        : '';

  const avatar = (
    <div className="relative inline-flex flex-shrink-0">
      <div 
        className={`flex items-center justify-center rounded-full text-white font-semibold shadow-sm ${className}`}
        style={{ backgroundColor: color }}
      >
        {initials}
      </div>
      {presenceTitle && (
        <span
          role="img"
          aria-label={`Статус: ${presenceTitle}`}
          className={`absolute bottom-0 right-0 flex items-center justify-center rounded-full border-white bg-white ${statusClassName}`}
        >
          {presence === 'online' && (
            <span aria-hidden="true" className="h-full w-full rounded-full bg-[#22C55E]" />
          )}
          {presence === 'away' && (
            <span aria-hidden="true" className="relative h-full w-full rounded-full border-2 border-amber-400 bg-white">
              <span className="absolute left-1/2 top-1/2 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500" />
            </span>
          )}
          {presence === 'offline' && (
            <span aria-hidden="true" className="h-full w-full rounded-full border-2 border-[#94A3B8] bg-white" />
          )}
        </span>
      )}
    </div>
  );

  if (!presenceTitle) return avatar;

  return (
    <Tooltip delayDuration={350}>
      <TooltipTrigger asChild>{avatar}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>{presenceTitle}</TooltipContent>
    </Tooltip>
  );
}


