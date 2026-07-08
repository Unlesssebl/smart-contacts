import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Check, X, Shield, Plus, Trash2, ChevronDown, ChevronRight, ChevronsUpDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '../components/Sidebar';
import { useAppStore } from '../../store/useAppStore';
import { getAttributeLabel, getStatusLabel, getLdapErrorTranslation } from '../../lib/localization';
import { Popover, PopoverTrigger, PopoverContent } from '../components/ui/popover';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../components/ui/collapsible';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';

type Tab = 'requests' | 'reports' | 'settings' | 'ou-mapping';

function TreeNode({ 
  name, 
  path, 
  node, 
  usedOus, 
  onSelect, 
  selectedPath 
}: { 
  name: string, 
  path: string, 
  node: Record<string, any>, 
  usedOus: Set<string>, 
  onSelect: (path: string) => void,
  selectedPath: string
}) {
  const [isOpen, setIsOpen] = useState(false);
  const childrenKeys = Object.keys(node).sort();
  const hasChildren = childrenKeys.length > 0;
  const isUsed = usedOus.has(name);
  const isSelected = selectedPath === path;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div 
        className={`flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${isSelected ? 'bg-primary/10 text-primary font-medium' : ''} ${isUsed ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}`}
        onClick={() => {
          if (!isUsed) onSelect(path);
        }}
      >
        {hasChildren ? (
          <button 
            type="button"
            className="p-1 hover:bg-muted rounded-sm transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        ) : (
          <div className="w-5 h-5 shrink-0" /> 
        )}
        <span className="text-sm truncate select-none">{name}</span>
        {isSelected && <Check className="w-3.5 h-3.5 ml-auto text-primary shrink-0" />}
      </div>
      
      {hasChildren && (
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <div className="pl-4 border-l ml-2.5 mt-0.5 space-y-0.5">
            {childrenKeys.map(key => (
              <TreeNode 
                key={key} 
                name={key} 
                path={path ? `${path}/${key}` : key} 
                node={node[key]} 
                usedOus={usedOus} 
                onSelect={onSelect}
                selectedPath={selectedPath}
              />
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

function OUMappingTab({ ouMapping, updateOUMapping }: { ouMapping: Record<string, string>, updateOUMapping: (mapping: Record<string, string>) => Promise<void> }) {
  const [localMapping, setLocalMapping] = useState<{ou: string, org: string}[]>(() => 
    Object.entries(ouMapping || {}).map(([ou, org]) => ({ou, org}))
  );
  
  const [newOu, setNewOu] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [adOusTree, setAdOusTree] = useState<Record<string, any>>({});
  const [isLoadingOus, setIsLoadingOus] = useState(false);
  const [ouLoadError, setOuLoadError] = useState<string | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Fetch OU list from AD on mount
  useEffect(() => {
    const loadOus = async () => {
      setIsLoadingOus(true);
      setOuLoadError(null);
      try {
        const { settingsApi } = await import('../../api/settings');
        const ousTree = await settingsApi.getADOus();
        setAdOusTree(ousTree);
      } catch (e) {
        setOuLoadError('Не удалось загрузить список OU из AD. Введите вручную.');
      } finally {
        setIsLoadingOus(false);
      }
    };
    loadOus();
  }, []);

  // Update local state when prop changes
  useEffect(() => {
    setLocalMapping(Object.entries(ouMapping || {}).map(([ou, org]) => ({ou, org})));
  }, [ouMapping]);

  const fetchLDAPSettings = useAppStore(state => state.fetchLDAPSettings);
  
  // Poll LDAP settings when on settings tab
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTab === 'settings') {
      fetchLDAPSettings(true); // silent fetch
      interval = setInterval(() => {
        fetchLDAPSettings(true);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [activeTab, fetchLDAPSettings]);

  const handleAdd = () => {
    const shortName = newOu.split('/').pop()?.trim() || '';
    if (!shortName || !newOrg.trim()) {
      toast.error('Заполните оба поля');
      return;
    }
    if (localMapping.some(m => m.ou === shortName)) {
      toast.error('Такой OU уже существует в маппинге');
      return;
    }
    setLocalMapping([...localMapping, { ou: shortName, org: newOrg.trim() }]);
    setNewOu('');
    setNewOrg('');
  };

  const handleRemove = (ouToRemove: string) => {
    setLocalMapping(localMapping.filter(m => m.ou !== ouToRemove));
  };

  const handleSave = async () => {
    const mappingObj = localMapping.reduce((acc, curr) => {
      acc[curr.ou] = curr.org;
      return acc;
    }, {} as Record<string, string>);
    await updateOUMapping(mappingObj);
  };

  const rootKeys = Object.keys(adOusTree).sort();
  const usedOus = useMemo(() => new Set(localMapping.map(m => m.ou)), [localMapping]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium">Маппинг Организаций (OU)</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Здесь вы можете связать названия организационных единиц (OU) из Active Directory с названиями компаний, которые будут отображаться в профиле сотрудника.
        </p>
      </div>

      <div className="space-y-4 max-w-3xl">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-4 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground">
          <div>OU в Active Directory</div>
          <div>Название в системе</div>
          <div className="w-10"></div>
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {localMapping.map((item, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-4 items-center px-4 py-3 bg-card border rounded-lg shadow-sm">
              <div className="font-mono text-sm font-medium">{item.ou}</div>
              <div>{item.org}</div>
              <button 
                onClick={() => handleRemove(item.ou)}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                title="Удалить"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {localMapping.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
              Нет ни одной записи. Добавьте первую ниже.
            </div>
          )}
        </div>

        {/* Add New Row */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-4 items-end mt-6 p-4 border border-dashed rounded-lg bg-muted/10">
          <div className="space-y-1 min-w-0">
            <label className="text-xs font-medium text-muted-foreground">OU в Active Directory</label>
            {isLoadingOus ? (
              <div className="flex h-10 items-center px-3 text-sm text-muted-foreground border border-input rounded-md bg-background">
                Загрузка OU из AD...
              </div>
            ) : ouLoadError || rootKeys.length === 0 ? (
              // Fallback: text input if AD is unavailable
              <div className="space-y-1">
                <input 
                  type="text" 
                  placeholder="Например, IT Department" 
                  value={newOu}
                  onChange={e => setNewOu(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                {ouLoadError && <p className="text-xs text-amber-600">{ouLoadError}</p>}
              </div>
            ) : (
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full min-w-0">
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex h-10 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-left overflow-hidden"
                        >
                          <span className="truncate flex-1 min-w-0 block">
                            {newOu ? newOu.split('/').pop() : '— Выберите OU —'}
                          </span>
                          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
                        </button>
                      </PopoverTrigger>
                    </div>
                  </TooltipTrigger>
                  {newOu && (
                    <TooltipContent side="bottom" className="max-w-[400px] break-all font-mono text-xs">
                      {newOu}
                    </TooltipContent>
                  )}
                </Tooltip>
                <PopoverContent className="w-[300px] p-2 max-h-[350px] overflow-y-auto" align="start">
                  <div className="space-y-0.5">
                    {rootKeys.map(key => (
                      <TreeNode 
                        key={key} 
                        name={key} 
                        path={key} 
                        node={adOusTree[key]} 
                        usedOus={usedOus} 
                        onSelect={(path) => {
                          setNewOu(path);
                          setIsPopoverOpen(false);
                        }}
                        selectedPath={newOu}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="space-y-1 min-w-0">
            <label className="text-xs font-medium text-muted-foreground">Название в системе</label>
            <input 
              type="text" 
              placeholder="Например, АйТи ТЭМПО" 
              value={newOrg}
              onChange={e => setNewOrg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <button 
            onClick={handleAdd}
            disabled={!newOu || !newOrg}
            className="flex items-center gap-2 h-10 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Добавить
          </button>
        </div>

        <div className="pt-6 border-t mt-8">
          <button
            onClick={handleSave}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2"
          >
            Сохранить настройки
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const { changeRequests, reports, fetchAdminData, approveChangeRequest, rejectChangeRequest, ldapSettings, fetchLDAPSettings, updateLDAPSettings, ouMapping, fetchOUMapping, updateOUMapping, forceSync } = useAppStore();

  useEffect(() => {
    fetchAdminData();
    fetchLDAPSettings();
    fetchOUMapping();
    
    // Poll for updates to see transition from approved -> applied/conflict
    const interval = setInterval(() => {
      fetchAdminData();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchAdminData, fetchLDAPSettings, fetchOUMapping]);

  const activeRequests = changeRequests.filter((r) => r.status === 'pending' || r.status === 'conflict' || r.status === 'approved');

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar />

      <main className="ml-72 flex-1 relative">
        <div className="mx-auto max-w-7xl px-8 pt-12 pb-12">
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
                  className="absolute inset-0 rounded-lg bg-white shadow-sm"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              <span className="relative z-10">
                Запросы на изменения {activeRequests.length > 0 && `(${activeRequests.length})`}
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
                  className="absolute inset-0 rounded-lg bg-white shadow-sm"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              <span className="relative z-10">Жалобы ({reports.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className="relative rounded-lg px-6 py-2 text-sm font-medium transition-colors"
              style={{
                color: activeTab === 'settings' ? 'var(--foreground)' : 'var(--muted-foreground)',
              }}
            >
              {activeTab === 'settings' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-lg bg-white shadow-sm"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              <span className="relative z-10">Настройки LDAP</span>
            </button>
            <button
              onClick={() => setActiveTab('ou-mapping')}
              className="relative rounded-lg px-6 py-2 text-sm font-medium transition-colors"
              style={{
                color: activeTab === 'ou-mapping' ? 'var(--foreground)' : 'var(--muted-foreground)',
              }}
            >
              {activeTab === 'ou-mapping' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-lg bg-white shadow-sm"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              <span className="relative z-10">Организации (OU)</span>
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
                {activeRequests.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-lg text-muted-foreground">Нет активных запросов на изменение</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeRequests.map((request) => (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group flex flex-col gap-4 rounded-xl border border-black/5 bg-white/60 p-5 shadow-sm backdrop-blur-md transition-all hover:border-black/10 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">
                              {request.user_name || 'Неизвестный'}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              •{' '}
                              {new Date(request.created_at).toLocaleDateString('ru-RU', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Запрос на изменение поля{' '}
                            <span className="font-medium text-foreground">
                              {getAttributeLabel(request.field_name || request.attribute_name)}
                            </span>
                          </p>
                          
                          {request.status === 'conflict' && (
                            <div className="mt-2 text-sm text-destructive font-medium flex items-center gap-1.5">
                              <Shield className="w-4 h-4 shrink-0" />
                              <div className="flex-1">
                                <div>Ошибка применения в AD (Требуется ручная обработка или повторная попытка)</div>
                                {request.rejection_reason && (
                                  <div className="mt-1 text-xs opacity-90 font-normal">
                                    {getLdapErrorTranslation(request.rejection_reason)}
                                    <div className="mt-0.5 opacity-60 text-[10px] uppercase tracking-wider">{request.rejection_reason}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-black/5 px-3 py-1.5 text-sm dark:bg-white/10">
                            <span className="text-muted-foreground">Новое:</span>
                            <span className="font-medium text-foreground">
                              {(!request.new_value || request.new_value === '[]') ? (
                                <span className="italic font-normal opacity-70">Не указано</span>
                              ) : (
                                request.new_value
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 sm:shrink-0 sm:pt-0">
                          {request.status === 'approved' ? (
                            <div className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 sm:flex-none">
                              В процессе применения...
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={async () => {
                                  await rejectChangeRequest(request.id);
                                }}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 sm:flex-none"
                              >
                                <X className="h-4 w-4" strokeWidth={2} />
                                Отклонить
                              </button>
                              
                              <button
                                onClick={async () => {
                                  await approveChangeRequest(request.id);
                                }}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 sm:flex-none"
                              >
                                <Check className="h-4 w-4" strokeWidth={2} />
                                {request.status === 'conflict' ? 'Повторить' : 'Одобрить'}
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'reports' ? (
              <div className="p-6">
                {reports.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-lg text-muted-foreground">Жалоб нет</p>
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
                              <p className="font-medium text-foreground">{report.target_user_name || 'Неизвестный'}</p>
                              <span
                                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                                style={{
                                  background:
                                    report.status === 'processed'
                                      ? 'rgba(52, 199, 89, 0.15)'
                                      : report.status === 'pending'
                                      ? 'rgba(0, 147, 233, 0.15)'
                                      : 'rgba(255, 77, 79, 0.15)',
                                  color:
                                    report.status === 'processed'
                                      ? '#38A169'
                                      : report.status === 'pending'
                                      ? 'var(--primary)'
                                      : 'var(--destructive)',
                                }}
                              >
                                {getStatusLabel(report.status)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-medium text-primary">
                              Жалоба от: {report.reporter_user_name || 'Неизвестный'}
                            </p>
                            <p className="mt-2 text-sm text-foreground">{report.reason}</p>
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
            ) : activeTab === 'settings' ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-8 pb-6 border-b max-w-xl">
                  <div>
                    <h3 className="text-lg font-medium">Ручная синхронизация</h3>
                    <p className="text-sm text-muted-foreground mt-1">Принудительно запустить цикл синхронизации с Active Directory прямо сейчас.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => forceSync()} 
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2 whitespace-nowrap shrink-0"
                  >
                    Запустить синхронизацию
                  </button>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const ad_user = formData.get('ad_user') as string;
                    const ad_password = formData.get('ad_password') as string;
                    
                    const payload: import('../../api/settings').LDAPSettings = {};
                    if (ad_user !== null) payload.ad_user = ad_user;
                    if (ad_password) payload.ad_password = ad_password;
                    
                    await updateLDAPSettings(payload);
                  }}
                  className="space-y-6 max-w-xl"
                >
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">Учетная запись Active Directory</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Сервисная учетная запись для чтения пользователей из AD. Эти данные сохраняются в зашифрованном виде.
                      </p>
                    </div>
                    
                    {ldapSettings?.status === 'ok' && (
                      <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/15 text-green-600 border border-green-500/30 text-sm">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <div>Подключение установлено успешно. Воркер готов к синхронизации.</div>
                      </div>
                    )}
                    
                    {ldapSettings?.status === 'error' && (
                      <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/15 text-destructive border border-destructive/30 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium">Ошибка подключения:</div>
                          <div className="mt-1 text-xs opacity-90 break-all">
                            {getLdapErrorTranslation(ldapSettings.last_error)}
                            {ldapSettings.last_error && (
                              <div className="mt-1 opacity-60 text-[10px] uppercase tracking-wider">{ldapSettings.last_error}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label htmlFor="ad_user" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Имя пользователя (UPN или DN)
                      </label>
                      <input
                        id="ad_user"
                        name="ad_user"
                        type="text"
                        defaultValue={ldapSettings?.ad_user || ''}
                        placeholder="Например, service_account@corporate.loc"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="ad_password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Пароль {ldapSettings?.is_password_set && '(Уже установлен)'}
                      </label>
                      <input
                        id="ad_password"
                        name="ad_password"
                        type="password"
                        placeholder={ldapSettings?.is_password_set ? '•••••••• (оставьте пустым, чтобы не менять)' : 'Введите пароль'}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                  >
                    Сохранить настройки
                  </button>
                </form>
              </div>
            ) : activeTab === 'ou-mapping' ? (
              <OUMappingTab 
                ouMapping={ouMapping} 
                updateOUMapping={updateOUMapping} 
              />
            ) : null}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
