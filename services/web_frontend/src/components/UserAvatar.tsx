import { getAvatarColor } from '@/utils/avatar';

interface UserAvatarProps {
  name: string;
  avatarColor?: string | null;
  presence?: 'online' | 'offline' | 'away' | string | null;
  className?: string;
  statusClassName?: string;
}

export function UserAvatar({ name, avatarColor, presence, className = "h-10 w-10 text-sm", statusClassName = "h-2.5 w-2.5 border-2" }: UserAvatarProps) {
  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const color = getAvatarColor(name, avatarColor);

  return (
    <div className="relative flex-shrink-0 inline-flex">
      <div 
        className={`flex items-center justify-center rounded-full text-white shadow-sm ring-1 ring-inset ring-white/20 font-semibold ${className}`}
        style={{ backgroundColor: color }}
      >
        {initials}
      </div>
      {presence && (
        <div
          className={`absolute bottom-0 right-0 rounded-full border-white ${presence === 'online' ? 'bg-emerald-500' :
            presence === 'away' ? 'bg-amber-400' :
              'bg-slate-200'
            } ${statusClassName}`}
        />
      )}
    </div>
  );
}
