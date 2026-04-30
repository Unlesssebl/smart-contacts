import { User } from '../../types';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin } from 'lucide-react';

interface EmployeeCardProps {
  user: User;
  onClick: () => void;
}

export function EmployeeCard({ user, onClick }: EmployeeCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="group cursor-pointer rounded-2xl border p-6 transition-all"
      style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(40px)',
        border: '0.5px solid rgba(255, 255, 255, 0.4)',
        boxShadow:
          'inset 0.5px 0.5px 0 rgba(255, 255, 255, 0.4), 0 2px 8px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.06)',
      }}
    >
      <div className="flex items-start gap-4">
        {/* Avatar with online status */}
        <div className="relative flex-shrink-0">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-lg font-medium text-white shadow-lg">
            {user.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          {user.is_online && (
            <motion.div
              className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white"
              style={{ background: '#34C759' }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 overflow-hidden">
          <h3 className="truncate font-semibold text-[#1C1C1E] transition-colors group-hover:text-[#007AFF]">
            {user.full_name}
          </h3>
          <p className="mt-0.5 truncate text-sm text-[#8E8E93]">{user.job_title}</p>
          <p className="mt-0.5 truncate text-sm text-[#8E8E93]">{user.department}</p>

          {/* Contact Info */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
              <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
              <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{user.internal_phone}</span>
            </div>
            {user.office_location && (
              <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
                <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="truncate">{user.office_location}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role Badge */}
      {(user.role === 'admin' || user.role === 'it_operator') && (
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{
          background: 'rgba(0, 122, 255, 0.1)',
          color: '#007AFF'
        }}>
          <div className="h-1.5 w-1.5 rounded-full bg-[#007AFF]" />
          {user.role === 'admin' ? 'Admin' : 'IT Operator'}
        </div>
      )}
    </motion.div>
  );
}
