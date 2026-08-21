import { motion } from 'motion/react';

export type AdminTab = 'requests' | 'tickets' | 'settings' | 'ou-mapping';

interface AdminTabsProps {
  activeTab: AdminTab;
  requestCount: number;
  ticketsCount?: number;
  onChange: (tab: AdminTab) => void;
}

const TABS: Array<{ id: AdminTab; label: string }> = [
  { id: 'requests', label: 'Запросы на изменения' },
  { id: 'tickets', label: 'Обращения' },
  { id: 'settings', label: 'Настройки LDAP' },
  { id: 'ou-mapping', label: 'Организации (OU)' },
];

export function AdminTabs({ activeTab, requestCount, ticketsCount = 0, onChange }: AdminTabsProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 flex justify-center">
      <div className="inline-flex rounded-xl p-1 glass-card">
        {TABS.map((tab) => {
          let countBadge = '';
          if (tab.id === 'requests' && requestCount > 0) {
            countBadge = ` (${requestCount})`;
          } else if (tab.id === 'tickets' && ticketsCount > 0) {
            countBadge = ` (${ticketsCount})`;
          }

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="relative rounded-lg px-5 py-2 text-sm font-medium transition-colors"
              style={{ color: activeTab === tab.id ? 'var(--foreground)' : 'var(--muted-foreground)' }}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeAdminTab"
                  className="absolute inset-0 rounded-lg bg-white shadow-sm"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              <span className="relative z-10">
                {tab.label}
                {countBadge}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
