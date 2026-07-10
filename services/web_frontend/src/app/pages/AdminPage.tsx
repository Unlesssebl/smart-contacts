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
  }, [fetchAdminData, fetchLDAPSettings, fetchOUMapping]);

  // Initial fetch when switching to settings tab
  useEffect(() => {
    if (activeTab === 'settings') {
      fetchLDAPSettings(true); // silent fetch
    }
  }, [activeTab, fetchLDAPSettings]);

  const activeRequests = changeRequests.filter((r) => r.status === 'pending' || r.status === 'conflict' || r.status === 'approved');
  const activeReports = reports.filter((r) => r.status === 'pending' || r.status === 'conflict' || r.status === 'approved');
  
  const activeItems = [
    ...activeRequests.map(r => ({ ...r, item_type: 'request' })),
    ...activeReports.map(r => ({ ...r, item_type: 'report' }))
  ].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const groupedItems = activeItems.reduce((acc, item) => {
    // @ts-ignore
    const key = item.user_id || item.target_user_guid || item.user_guid;
    // @ts-ignore
    const userName = item.user_name || item.target_user_name || 'Неизвестный';
    if (!acc[key]) acc[key] = { user_name: userName, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { user_name: string, items: any[] }>);
  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar />

      <main className="ml-72 flex-1 relative">
        <div className="mx-auto max-w-7xl px-8 pt-12 pb-12">
          {/* Tabs (Apple-style Segmented Control) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="mb-8 flex justify-center"
          >
            <div className="inline-flex rounded-xl p-1 glass-card">
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
                Запросы на изменения {activeItems.length > 0 && `(${activeItems.length})`}
              </span>
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
            </div>
          </motion.div>

          {/* Content Area */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden glass-card p-0"
          >
            {activeTab === 'requests' ? (
              <div className="p-6">
                {activeItems.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-lg text-muted-foreground">Нет активных запросов на изменение</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedItems).map(([userId, group]) => (
                      <motion.div
                        key={userId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-xl border border-black/5 bg-white/60 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="mb-3 flex items-center gap-2 border-b border-black/5 pb-2 dark:border-white/10">
                          <h4 className="font-semibold text-foreground text-base">
                            {group.user_name || 'Неизвестный'}
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {group.items.map((item) => (
                            <div key={item.item_type + '-' + item.id} className={`group flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between transition-colors ${item.item_type === 'report' ? 'bg-red-50/50 hover:bg-red-100/50 dark:bg-red-900/10 dark:hover:bg-red-900/20' : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'}`}>
                              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                {item.item_type === 'report' && (
                                  <span className="text-xs font-medium text-red-500/80 mb-1 sm:hidden">Жалоба от: {item.reporter_name || item.reporter_user_name}</span>
                                )}
                                <p className="text-sm text-muted-foreground w-40 shrink-0 flex flex-col">
                                  <span>{getAttributeLabel(item.field_name || item.attribute_name)}</span>
                                  {item.item_type === 'report' && (
                                    <span className="text-xs font-medium text-red-500/80 hidden sm:block mt-0.5">от: {item.reporter_name || item.reporter_user_name}</span>
                                  )}
                                </p>
                                
                                {item.status === 'conflict' && (
                                  <div className="text-sm text-destructive font-medium flex items-center gap-1.5">
                                    <div className="flex-1">
                                      <div>Ошибка применения в AD</div>
                                      {item.rejection_reason && (
                                        <div className="mt-0.5 text-xs opacity-90 font-normal">
                                          {getLdapErrorTranslation(item.rejection_reason)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                <div className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm shadow-sm ${item.item_type === 'report' ? 'bg-white/80 dark:bg-black/40' : 'bg-white/60 dark:bg-black/20'}`}>
                                  <span className="text-muted-foreground text-xs">Новое:</span>
                                  <span className="font-medium text-foreground text-sm">
                                    {(!item.new_value || item.new_value === '[]' || item.new_value === '<Удалить>') ? (
                                      <span className="italic font-normal opacity-70 text-rose-500 line-through">Удалить</span>
                                    ) : (
                                      item.new_value
                                    )}
                                  </span>
                                </div>
                                
                                {item.item_type === 'report' && (
                                  <span className="text-[10px] text-muted-foreground/50 hidden sm:block">
                                    {new Date(item.created_at).toLocaleDateString('ru-RU', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 pt-2 sm:shrink-0 sm:pt-0">
                                {item.status === 'approved' ? (
                                  <div className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 sm:flex-none">
                                    В процессе...
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={async () => {
                                        if (item.item_type === 'report') {
                                          const useStore = await import('../../store/useAppStore');
                                          await useStore.useAppStore.getState().rejectReport(item.id);
                                        } else {
                                          await rejectChangeRequest(item.id);
                                        }
                                      }}
                                      className="flex items-center justify-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 shadow-sm sm:flex-none"
                                    >
                                      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                                    </button>
                                    
                                    <button
                                      onClick={async () => {
                                        if (item.item_type === 'report') {
                                          const useStore = await import('../../store/useAppStore');
                                          await useStore.useAppStore.getState().approveReport(item.id);
                                        } else {
                                          await approveChangeRequest(item.id);
                                        }
                                      }}
                                      className="flex items-center justify-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-100 shadow-sm sm:flex-none"
                                    >
                                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                                      {item.status === 'conflict' ? 'Повторить' : 'Одобрить'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
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
