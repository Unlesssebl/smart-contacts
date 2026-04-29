import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, X, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '../components/Sidebar';
import { useAppStore } from '../../store/useAppStore';

type Tab = 'requests' | 'reports';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const { changeRequests, reports, approveChangeRequest, rejectChangeRequest } = useAppStore();

  const pendingRequests = changeRequests.filter((r) => r.status === 'pending');

  return (
    <div className="flex min-h-screen" style={{ background: '#F5F5F7' }}>
      <Sidebar />

      <main className="ml-64 flex-1">
        <div className="mx-auto max-w-7xl px-8 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] p-3 shadow-lg">
                <Shield className="h-6 w-6 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-[#1C1C1E]">
                  Admin Panel
                </h1>
                <p className="mt-1 text-sm text-[#8E8E93]">
                  Manage change requests and user reports
                </p>
              </div>
            </div>
          </motion.div>

          {/* Tabs (Apple-style Segmented Control) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8 inline-flex rounded-xl p-1"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(40px)',
              border: '0.5px solid rgba(255, 255, 255, 0.4)',
            }}
          >
            <button
              onClick={() => setActiveTab('requests')}
              className="relative rounded-lg px-6 py-2 text-sm font-medium transition-colors"
              style={{
                color: activeTab === 'requests' ? '#1C1C1E' : '#8E8E93',
              }}
            >
              {activeTab === 'requests' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-lg shadow-sm"
                  style={{ background: 'rgba(255, 255, 255, 0.9)' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              <span className="relative z-10">
                Change Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className="relative rounded-lg px-6 py-2 text-sm font-medium transition-colors"
              style={{
                color: activeTab === 'reports' ? '#1C1C1E' : '#8E8E93',
              }}
            >
              {activeTab === 'reports' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-lg shadow-sm"
                  style={{ background: 'rgba(255, 255, 255, 0.9)' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              <span className="relative z-10">Reports ({reports.length})</span>
            </button>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="overflow-hidden rounded-2xl shadow-lg"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(40px)',
              border: '0.5px solid rgba(255, 255, 255, 0.4)',
              boxShadow:
                'inset 0.5px 0.5px 0 rgba(255, 255, 255, 0.4), 0 4px 16px rgba(0, 0, 0, 0.06), 0 16px 48px rgba(0, 0, 0, 0.08)',
            }}
          >
            {activeTab === 'requests' ? (
              <div className="p-6">
                {pendingRequests.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-lg text-[#8E8E93]">No pending change requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-xl border border-black/5 bg-white/50 p-5"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-[#1C1C1E]">{request.user_name}</p>
                            <p className="mt-1 text-sm text-[#8E8E93]">
                              Requesting to update{' '}
                              <span className="font-medium text-[#1C1C1E]">
                                {request.attribute_name.replace('_', ' ')}
                              </span>
                            </p>
                            <div className="mt-3 space-y-1 text-sm">
                              <p className="text-[#8E8E93]">
                                <span className="font-medium">Old:</span>{' '}
                                <span className="line-through">{request.old_value}</span>
                              </p>
                              <p className="text-[#007AFF]">
                                <span className="font-medium">New:</span> {request.new_value}
                              </p>
                            </div>
                            <p className="mt-2 text-xs text-[#8E8E93]">
                              {new Date(request.requested_at).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                approveChangeRequest(request.id);
                                toast.success('Change approved', {
                                  description: `${request.user_name}'s ${request.attribute_name.replace('_', ' ')} has been updated`,
                                });
                              }}
                              className="flex items-center gap-2 rounded-lg bg-[#34C759] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#2FB350]"
                            >
                              <Check className="h-4 w-4" strokeWidth={2} />
                              Approve
                            </motion.button>

                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                rejectChangeRequest(request.id);
                                toast.error('Change rejected', {
                                  description: `${request.user_name}'s request has been declined`,
                                });
                              }}
                              className="flex items-center gap-2 rounded-lg bg-[#FF3B30] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#E6342A]"
                            >
                              <X className="h-4 w-4" strokeWidth={2} />
                              Reject
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6">
                {reports.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-lg text-[#8E8E93]">No reports</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <motion.div
                        key={report.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-xl border border-black/5 bg-white/50 p-5"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <p className="font-medium text-[#1C1C1E]">{report.user_name}</p>
                              <span
                                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                                style={{
                                  background:
                                    report.status === 'resolved'
                                      ? 'rgba(52, 199, 89, 0.15)'
                                      : report.status === 'in_progress'
                                      ? 'rgba(0, 122, 255, 0.15)'
                                      : 'rgba(255, 59, 48, 0.15)',
                                  color:
                                    report.status === 'resolved'
                                      ? '#34C759'
                                      : report.status === 'in_progress'
                                      ? '#007AFF'
                                      : '#FF3B30',
                                }}
                              >
                                {report.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-medium text-[#007AFF]">
                              {report.category}
                            </p>
                            <p className="mt-2 text-sm text-[#1C1C1E]">{report.description}</p>
                            <p className="mt-2 text-xs text-[#8E8E93]">
                              {new Date(report.created_at).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
