import React from 'react';
import type { User } from '../../types';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin } from 'lucide-react';

interface EmployeeCardProps {
  user: User;
  onClick: () => void;
}

export const EmployeeCard = React.forwardRef<HTMLDivElement, EmployeeCardProps>(
  ({ user, onClick }, ref) => {
    return (
      <motion.div
        ref={ref}
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
          {user.is_online && (
            <motion.div
              className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white"
              style={{ background: 'var(--online-status)' }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 overflow-hidden">
          <h3 className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
            {user.full_name}
          </h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{user.job_title}</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{user.department}</p>

          {/* Contact Info */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{user.internal_phone}</span>
            </div>
            {user.office_location && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="truncate">{user.office_location}</span>
              </div>
            )}
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
