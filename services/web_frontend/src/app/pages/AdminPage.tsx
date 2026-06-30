import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, X, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '../components/Sidebar';
import { useAppStore } from '../../store/useAppStore';
import { getAttributeLabel, getStatusLabel } from '../../lib/localization';

type Tab = 'requests' | 'reports';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const { changeRequests, reports, approveChangeRequest, rejectChangeRequest } = useAppStore();

  const pendingRequests = changeRequests.filter((r) => r.status === 'pending');

  return (
    <div className="flex min-h-screen bg-transparent">
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
              <div className="rounded-2xl bg-gradient-to-br from-primary to-accent p-3 shadow-lg">
                <Shield className="h-6 w-6 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  Панель администратора
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Управление запросами на изменение и жалобами пользователей
                </p>
              </div>
            </div>
          </motion.div>

          {/* Tabs (Apple-style Segmented Control) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8 inline-flex rounded-xl p-1 glass-card"
          >
            <button
              onClick={() => setActiveTab('requests')}
              className="relative rounded-lg px-6 py-2 text-sm font-medium transition-colors"
              style={{
                color: activeTab === 'requests' ? 'var(--foreground)' : 'var(--muted-foreground)',
              }}
            >
              {activeTab === 'requests' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-lg bg-background/50 shadow-sm"
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
                color: activeTab === 'reports' ? 'var(--foreground)' : 'var(--muted-foreground)',
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
              <span className="relative z-10">Жалобы ({reports.length})</span>
            </button>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="overflow-hidden glass-card p-0"
          >
            {activeTab === 'requests' ? (
              <div className="p-6">
                {pendingRequests.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-lg text-[#8E8E93]">Нет ожидающих запросов на изменение</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-xl border border-black/5 bg-black/5 backdrop-blur-sm p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{request.user_name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Запрос на изменение поля{' '}
                              <span className="font-medium text-foreground">
                                {getAttributeLabel(request.attribute_name)}
                              </span>
                            </p>
                            <div className="mt-3 space-y-1 text-sm">
                              <p className="text-muted-foreground">
                                <span className="font-medium">Старое:</span>{' '}
                                <span className="line-through">{request.old_value}</span>
                              </p>
                              <p className="text-primary">
                                <span className="font-medium">Новое:</span> {request.new_value}
                              </p>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {new Date(request.requested_at).toLocaleDateString('ru-RU', {
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
                                toast.success('Изменение одобрено', {
                                  description: `Поле "${getAttributeLabel(request.attribute_name)}" пользователя ${request.user_name} обновлено`,
                                });
                              }}
                              className="flex items-center gap-2 rounded-lg bg-[#34C759] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#2FB350]"
                            >
                              <Check className="h-4 w-4" strokeWidth={2} />
                              Одобрить
                            </motion.button>

                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                rejectChangeRequest(request.id);
                                toast.error('Изменение отклонено', {
                                  description: `Запрос пользователя ${request.user_name} был отклонен`,
                                });
                              }}
                              className="flex items-center gap-2 rounded-lg bg-[#FF3B30] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#E6342A]"
                            >
                              <X className="h-4 w-4" strokeWidth={2} />
                              Отклонить
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
                    <p className="text-lg text-[#8E8E93]">Жалоб нет</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <motion.div
                        key={report.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-xl border border-black/5 bg-black/5 backdrop-blur-sm p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <p className="font-medium text-foreground">{report.user_name}</p>
                              <span
                                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                                style={{
                                  background:
                                    report.status === 'resolved'
                                      ? 'rgba(52, 199, 89, 0.15)'
                                      : report.status === 'in_progress'
                                      ? 'rgba(0, 147, 233, 0.15)'
                                      : 'rgba(255, 77, 79, 0.15)',
                                  color:
                                    report.status === 'resolved'
                                      ? '#38A169'
                                      : report.status === 'in_progress'
                                      ? 'var(--primary)'
                                      : 'var(--destructive)',
                                }}
                              >
                                {getStatusLabel(report.status)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-medium text-primary">
                              {report.category}
                            </p>
                            <p className="mt-2 text-sm text-foreground">{report.description}</p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {new Date(report.created_at).toLocaleDateString('ru-RU', {
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
