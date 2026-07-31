import { motion } from 'motion/react';

export type AdminTab = 'requests' | 'settings' | 'ou-mapping';

interface AdminTabsProps {
  activeTab: AdminTab;
  requestCount: number;
  onChange: (tab: AdminTab) => void;
}

const TABS: Array<{ id: AdminTab; label: string }> = [
  { id: 'requests', label: 'Запросы на изменения' },
  { id: 'settings', label: 'Настройки LDAP' },
  { id: 'ou-mapping', label: 'Организации (OU)' },
];

export function AdminTabs({ activeTab, requestCount, onChange }: AdminTabsProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 flex justify-center">
      <div className="inline-flex rounded-xl p-1 glass-card">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="relative rounded-lg px-6 py-2 text-sm font-medium transition-colors"
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
              {tab.id === 'requests' && requestCount > 0 ? ` (${requestCount})` : ''}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
