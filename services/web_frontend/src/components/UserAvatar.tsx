import { getAvatarColor } from '@/utils/avatar';

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

  let presenceTitle = '';
  if (presence === 'online') presenceTitle = 'В сети';
  else if (presence === 'away') presenceTitle = 'Отошел';
  else if (presence === 'offline') presenceTitle = 'Не в сети';

  return (
    <div className="relative flex-shrink-0 inline-flex">
      <div 
        className={`flex items-center justify-center rounded-full text-white font-semibold shadow-sm ${className}`}
        style={{ backgroundColor: color }}
      >
        {initials}
      </div>
      {presence && (
        <div
          title={presenceTitle}
          className={`absolute bottom-0 right-0 rounded-full border-white ${
            presence === 'online' ? 'bg-[#22C55E]' :
            presence === 'away' ? 'bg-amber-400' :
            'bg-[#CBD5E1]'
          } ${statusClassName}`}
        />
      )}
    </div>
  );
}


