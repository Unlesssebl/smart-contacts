import React from 'react';
import type { User } from '../../types';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

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
    
    const cleanValue = (val: string | null | undefined) => (val === '[]' || !val) ? '' : val;
    const displayValue = (val: string | null | undefined) => {
      const cleaned = cleanValue(val);
      if (!cleaned.trim()) {
        return (
          <span className="inline-flex items-center rounded-full bg-black/5 px-2 py-0 text-[10px] font-medium text-muted-foreground/70">
            Не указано
          </span>
        );
      }
      return <HighlightedText text={cleaned} highlight={searchQuery} />;
    };

    return (
      <motion.div
        ref={ref}
        layoutId={user.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -4 }}
        onClick={onClick}
        className="group cursor-pointer p-6 glass-card hover:border-primary/30"
      >
      <div className="flex items-start gap-4">
        {/* Avatar with online status */}
        <div className="relative flex-shrink-0">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-lg font-medium text-white shadow-lg">
            {user.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <motion.div
            className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 ${
              user.presence === 'online' ? 'border-white bg-emerald-500' :
              user.presence === 'away' ? 'border-white bg-amber-400' :
              'border-slate-300 bg-white'
            }`}
            animate={user.presence === 'online' ? { scale: [1, 1.1, 1] } : { scale: 1 }}
            transition={user.presence === 'online' ? { repeat: Infinity, duration: 2 } : {}}
          />
        </div>

        {/* Info */}
        <div className="flex-1 overflow-hidden">
          <h3 className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
            <HighlightedText text={user.full_name} highlight={searchQuery} />
          </h3>
          {user.job_title && user.job_title !== '[]' && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{user.job_title}</p>
          )}
          {user.organization && user.organization !== '[]' && (
            <p className="mt-0.5 truncate text-sm font-medium text-muted-foreground">{user.organization}</p>
          )}
          {user.department && user.department !== '[]' && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{user.department}</p>
          )}

          {/* Contact Info */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
              {displayValue(user.email)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
              {displayValue(user.internal_phone)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
              {displayValue(user.office_location)}
            </div>
          </div>
        </div>
      </div>

      {/* Role Badge */}
      {(user.role === 'admin' || user.role === 'it_operator') && (
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-primary/10 text-primary">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          {user.role === 'admin' ? 'Администратор' : 'IT-Оператор'}
        </div>
      )}
    </motion.div>
  );
});
