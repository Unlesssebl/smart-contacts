import React from 'react';

const getAvatarColorForName = (name: string) => {
  const colors = [
    'bg-gradient-to-br from-blue-500 to-blue-600',
    'bg-gradient-to-br from-indigo-500 to-indigo-600',
    'bg-gradient-to-br from-cyan-500 to-cyan-600',
    'bg-gradient-to-br from-sky-500 to-sky-600',
    'bg-gradient-to-br from-teal-500 to-teal-600',
    'bg-gradient-to-br from-emerald-500 to-emerald-600',
  ];

  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

interface UserAvatarProps {
  name: string;
  presence?: 'online' | 'offline' | 'away' | string | null;
  className?: string;
  statusClassName?: string;
}

export function UserAvatar({ name, presence, className = "h-10 w-10 text-sm", statusClassName = "h-2.5 w-2.5 border-2" }: UserAvatarProps) {
  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="relative flex-shrink-0 inline-flex">
      <div className={`flex items-center justify-center rounded-full text-white shadow-sm ring-1 ring-inset ring-white/20 ${getAvatarColorForName(name)} font-semibold ${className}`}>
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
