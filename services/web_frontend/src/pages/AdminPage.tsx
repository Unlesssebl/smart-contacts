import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { Sidebar } from '@/components/Sidebar';
import { useAppStore } from '@/store/useAppStore';
import { AdminReviewPanel } from '@/features/administration/components/AdminReviewPanel';
import { AdminTabs, type AdminTab } from '@/features/administration/components/AdminTabs';
import { LdapSettingsPanel } from '@/features/administration/components/LdapSettingsPanel';
import { OuMappingPanel } from '@/features/administration/components/OuMappingPanel';
import { SupportTicketsPanel } from '@/features/administration/components/SupportTicketsPanel';
import { SecurityPanel } from '@/features/administration/components/SecurityPanel';
import { buildAdminReviewItems, groupAdminReviewItems } from '@/features/administration/model/reviewItems';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('requests');
  const {
    changeRequests,
    reports,
    supportTickets,
    securityIncidents,
    fetchAdminData,
    fetchSupportTickets,
    fetchSecurityIncidents,
    ldapSettings,
    fetchLDAPSettings,
    updateLDAPSettings,
    ouMapping,
    fetchOUMapping,
    updateOUMapping,
    forceSync,
  } = useAppStore(
    useShallow((state) => ({
      changeRequests: state.changeRequests,
      reports: state.reports,
      supportTickets: state.supportTickets,
      securityIncidents: state.securityIncidents,
      fetchAdminData: state.fetchAdminData,
      fetchSupportTickets: state.fetchSupportTickets,
      fetchSecurityIncidents: state.fetchSecurityIncidents,
      ldapSettings: state.ldapSettings,
      fetchLDAPSettings: state.fetchLDAPSettings,
      updateLDAPSettings: state.updateLDAPSettings,
      ouMapping: state.ouMapping,
      fetchOUMapping: state.fetchOUMapping,
      updateOUMapping: state.updateOUMapping,
      forceSync: state.forceSync,
    })),
  );

  useEffect(() => {
    void Promise.all([fetchAdminData(), fetchLDAPSettings(), fetchOUMapping()]);
  }, [fetchAdminData, fetchLDAPSettings, fetchOUMapping]);

  useEffect(() => {
    if (activeTab === 'settings') void fetchLDAPSettings(true);
    if (activeTab === 'tickets') void fetchSupportTickets();
    if (activeTab === 'security') void fetchSecurityIncidents();
  }, [activeTab, fetchLDAPSettings, fetchSupportTickets, fetchSecurityIncidents]);

  const reviewGroups = useMemo(
    () => groupAdminReviewItems(buildAdminReviewItems(changeRequests, reports)),
    [changeRequests, reports],
  );
  const requestCount = Object.keys(reviewGroups).length;
  const openTicketsCount = useMemo(
    () => supportTickets.filter((t) => t.status === 'open').length,
    [supportTickets]
  );
  const securityIncidentCount = useMemo(
    () => securityIncidents.filter((i) => i.is_blocked || i.attempts >= 3).length,
    [securityIncidents]
  );

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar />
      <main className="relative ml-[19.5rem] flex-1">
        <div className="mx-auto max-w-7xl px-8 pb-12 pt-12">
          <AdminTabs
            activeTab={activeTab}
            requestCount={requestCount}
            ticketsCount={openTicketsCount}
            securityCount={securityIncidentCount}
            onChange={setActiveTab}
          />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden glass-card p-0">
            {activeTab === 'requests' && <AdminReviewPanel groups={reviewGroups} />}
            {activeTab === 'tickets' && <SupportTicketsPanel />}
            {activeTab === 'security' && <SecurityPanel />}
            {activeTab === 'settings' && (
              <LdapSettingsPanel settings={ldapSettings} onSave={updateLDAPSettings} onForceSync={forceSync} />
            )}
            {activeTab === 'ou-mapping' && <OuMappingPanel mapping={ouMapping} onSave={updateOUMapping} />}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
