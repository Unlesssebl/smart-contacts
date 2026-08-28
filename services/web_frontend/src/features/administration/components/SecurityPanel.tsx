import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  RefreshCw, 
  Search, 
  Unlock, 
  Lock, 
  Clock, 
  AlertTriangle, 
  User, 
  Globe, 
  X
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

export function SecurityPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'blocked' | 'permanent' | 'suspicious'>('all');
  const [isManualBlockModalOpen, setIsManualBlockModalOpen] = useState(false);
  const [blockIpInput, setBlockIpInput] = useState('');
  const [blockPermanent, setBlockPermanent] = useState(true);
  const [blockDurationHours, setBlockDurationHours] = useState(1);
  const [actionLoadingIp, setActionLoadingIp] = useState<string | null>(null);

  const {
    securityIncidents,
    isLoadingSecurity,
    fetchSecurityIncidents,
    unblockIp,
    blockIp,
  } = useAppStore(
    useShallow((state) => ({
      securityIncidents: state.securityIncidents,
      isLoadingSecurity: state.isLoadingSecurity,
      fetchSecurityIncidents: state.fetchSecurityIncidents,
      unblockIp: state.unblockIp,
      blockIp: state.blockIp,
    }))
  );

  const filteredIncidents = useMemo(() => {
    return securityIncidents.filter((inc) => {
      const matchSearch =
        inc.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inc.last_sam && inc.last_sam.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (filterType === 'blocked') return inc.is_blocked;
      if (filterType === 'permanent') return inc.is_permanent;
      if (filterType === 'suspicious') return inc.attempts >= 3 && !inc.is_permanent;

      return true;
    });
  }, [securityIncidents, searchTerm, filterType]);

  const stats = useMemo(() => {
    const total = securityIncidents.length;
    const permanent = securityIncidents.filter((i) => i.is_permanent).length;
    const temporary = securityIncidents.filter((i) => i.is_blocked && !i.is_permanent).length;
    const suspicious = securityIncidents.filter((i) => i.attempts >= 3 && !i.is_blocked).length;
    return { total, permanent, temporary, suspicious };
  }, [securityIncidents]);

  const handleUnblock = async (ip: string) => {
    setActionLoadingIp(ip);
    await unblockIp(ip);
    setActionLoadingIp(null);
  };

  const handleManualBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockIpInput.trim()) return;

    await blockIp(blockIpInput.trim(), blockPermanent, blockDurationHours * 3600);
    setBlockIpInput('');
    setIsManualBlockModalOpen(false);
  };

  const formatRetryAfter = (seconds: number) => {
    if (seconds <= 0) return 'Истек';
    if (seconds >= 3600) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return m > 0 ? `${h} ч. ${m} мин.` : `${h} ч.`;
    }
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m} мин. ${s} сек.` : `${s} сек.`;
  };

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="p-6">
      {/* Header & Stats */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Контроль попыток входа и безопасности
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Мониторинг подозрительной активности, прогрессивные блокировки и перманентные баны.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => void fetchSecurityIncidents()}
            disabled={isLoadingSecurity}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingSecurity ? 'animate-spin' : ''}`} />
            Обновить
          </button>
          <button
            onClick={() => setIsManualBlockModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-medium transition-colors shadow-sm"
          >
            <Lock className="h-4 w-4" />
            Заблокировать IP
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white/60 dark:bg-slate-900/60 dark:border-slate-800 p-4 shadow-sm backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Всего в журнале
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-red-200/80 bg-red-50/40 dark:bg-red-950/20 dark:border-red-900/50 p-4 shadow-sm backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
            Перманентный бан
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.permanent}</div>
        </div>
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/50 p-4 shadow-sm backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Временный бан
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.temporary}</div>
        </div>
        <div className="rounded-2xl border border-yellow-200/80 bg-yellow-50/40 dark:bg-yellow-950/20 dark:border-yellow-900/50 p-4 shadow-sm backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-yellow-700 dark:text-yellow-400">
            Подозрительные (&gt;3)
          </div>
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mt-1">{stats.suspicious}</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по IP или логину..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-sm placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 self-start sm:self-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Все ({stats.total})
          </button>
          <button
            onClick={() => setFilterType('permanent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'permanent'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Перманентные ({stats.permanent})
          </button>
          <button
            onClick={() => setFilterType('blocked')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'blocked'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Все баны ({stats.permanent + stats.temporary})
          </button>
          <button
            onClick={() => setFilterType('suspicious')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'suspicious'
                ? 'bg-yellow-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Подозрительные ({stats.suspicious})
          </button>
        </div>
      </div>

      {/* Table */}
      {filteredIncidents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-emerald-500/80 mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Подозрительной активности не обнаружено
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Все запросы авторизации укладываются в допустимые нормы.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">IP-адрес</th>
                  <th className="px-5 py-3.5">Последний логин</th>
                  <th className="px-5 py-3.5 text-center">Попытки</th>
                  <th className="px-5 py-3.5">Статус безопасности</th>
                  <th className="px-5 py-3.5">Последняя активность</th>
                  <th className="px-5 py-3.5 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredIncidents.map((incident) => {
                  return (
                    <tr
                      key={incident.ip}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* IP */}
                      <td className="px-5 py-4 font-mono font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Globe className="h-4 w-4 text-slate-400" />
                        {incident.ip}
                      </td>

                      {/* Last login */}
                      <td className="px-5 py-4">
                        {incident.last_sam ? (
                          <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {incident.last_sam}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Attempts */}
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            incident.attempts >= 15
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                              : incident.attempts >= 5
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {incident.attempts}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {incident.is_permanent ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800">
                            <Lock className="h-3 w-3" />
                            Перманентный бан
                          </span>
                        ) : incident.is_blocked ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="h-3 w-3" />
                            Бан: {formatRetryAfter(incident.retry_after)}
                          </span>
                        ) : incident.attempts >= 3 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-950/80 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                            <AlertTriangle className="h-3 w-3" />
                            Подозрительно ({incident.attempts} поп.)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Норма
                          </span>
                        )}
                      </td>

                      {/* Last Attempt */}
                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {formatDateTime(incident.last_attempt_at)}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleUnblock(incident.ip)}
                          disabled={actionLoadingIp === incident.ip}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300 transition-all shadow-sm"
                        >
                          <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                          Разблокировать
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Block Modal */}
      <AnimatePresence>
        {isManualBlockModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-red-600" />
                  Блокировка IP-адреса
                </h3>
                <button
                  onClick={() => setIsManualBlockModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleManualBlockSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    IP-адрес
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например, 192.168.1.15"
                    value={blockIpInput}
                    onChange={(e) => setBlockIpInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-sm font-mono outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Тип блокировки
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBlockPermanent(true)}
                      className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors ${
                        blockPermanent
                          ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Lock className="h-4 w-4" />
                      Перманентно
                    </button>
                    <button
                      type="button"
                      onClick={() => setBlockPermanent(false)}
                      className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors ${
                        !blockPermanent
                          ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                      Временно
                    </button>
                  </div>
                </div>

                {!blockPermanent && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Длительность (в часах)
                    </label>
                    <select
                      value={blockDurationHours}
                      onChange={(e) => setBlockDurationHours(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-sm outline-none"
                    >
                      <option value={1}>1 час</option>
                      <option value={6}>6 часов</option>
                      <option value={24}>24 часа (1 день)</option>
                      <option value={72}>72 часа (3 дня)</option>
                      <option value={168}>168 часов (7 дней)</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsManualBlockModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors shadow-sm"
                  >
                    Заблокировать
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
