import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Search,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  Building2,
  Briefcase,
  Layers,
  ArrowRight,
  Info,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi, type CanonicalSuggestionCluster } from '@/api/settings';

type SubTab = 'departments' | 'job_titles';

interface CanonicalMappingPanelProps {
  deptMapping: Record<string, string>;
  jobTitleMapping: Record<string, string>;
  onSaveDeptMapping: (mapping: Record<string, string>) => Promise<void>;
  onSaveJobTitleMapping: (mapping: Record<string, string>) => Promise<void>;
}

export function CanonicalMappingPanel({
  deptMapping,
  jobTitleMapping,
  onSaveDeptMapping,
  onSaveJobTitleMapping,
}: CanonicalMappingPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('departments');
  const [localDeptMapping, setLocalDeptMapping] = useState<Record<string, string>>({});
  const [localJobTitleMapping, setLocalJobTitleMapping] = useState<Record<string, string>>({});
  const [deptSuggestions, setDeptSuggestions] = useState<CanonicalSuggestionCluster[]>([]);
  const [jobSuggestions, setJobSuggestions] = useState<CanonicalSuggestionCluster[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form inputs for manual addition
  const [rawInput, setRawInput] = useState('');
  const [canonicalInput, setCanonicalInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync initial props to local state
  useEffect(() => {
    setLocalDeptMapping({ ...deptMapping });
  }, [deptMapping]);

  useEffect(() => {
    setLocalJobTitleMapping({ ...jobTitleMapping });
  }, [jobTitleMapping]);

  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const data = await settingsApi.getCanonicalSuggestions();
      setDeptSuggestions(data.departments || []);
      setJobSuggestions(data.job_titles || []);
    } catch (err) {
      console.error('Failed to load canonical suggestions', err);
      toast.error('Не удалось загрузить автоматические предложения');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    void loadSuggestions();
  }, []);

  const currentMapping = activeSubTab === 'departments' ? localDeptMapping : localJobTitleMapping;
  const setMapping = activeSubTab === 'departments' ? setLocalDeptMapping : setLocalJobTitleMapping;
  const initialMapping = activeSubTab === 'departments' ? deptMapping : jobTitleMapping;
  const currentSuggestions = activeSubTab === 'departments' ? deptSuggestions : jobSuggestions;
  const setSuggestions = activeSubTab === 'departments' ? setDeptSuggestions : setJobSuggestions;

  // Filter out suggestions that are already completely mapped in currentMapping
  const visibleSuggestions = useMemo(() => {
    const mappingLower = new Set(
      Object.keys(currentMapping).map((k) => k.toLowerCase().trim()),
    );
    return currentSuggestions.filter((cluster) => {
      const unmapped = cluster.variants.filter(
        (v) => !currentMapping[v] && !mappingLower.has(v.toLowerCase().trim()),
      );
      if (unmapped.length === 0) return false;
      if (
        unmapped.length === 1 &&
        unmapped[0].trim().toLowerCase() ===
          cluster.suggested_canonical.trim().toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [currentSuggestions, currentMapping]);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(currentMapping) !== JSON.stringify(initialMapping);
  }, [currentMapping, initialMapping]);

  // Group mappings by canonical name: canonical -> list of raw values
  const groupedByCanonical = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const [raw, canonical] of Object.entries(currentMapping)) {
      if (!groups[canonical]) {
        groups[canonical] = [];
      }
      groups[canonical].push(raw);
    }
    return groups;
  }, [currentMapping]);

  // Filtered canonical groups based on search
  const filteredCanonicalKeys = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return Object.keys(groupedByCanonical).sort((a, b) => a.localeCompare(b, 'ru'));

    return Object.keys(groupedByCanonical)
      .filter((canonical) => {
        if (canonical.toLowerCase().includes(q)) return true;
        const variants = groupedByCanonical[canonical] || [];
        return variants.some((v) => v.toLowerCase().includes(q));
      })
      .sort((a, b) => a.localeCompare(b, 'ru'));
  }, [groupedByCanonical, searchQuery]);

  // Distinct known canonical values for auto-complete suggestions
  const knownCanonicalOptions = useMemo(() => {
    return Object.keys(groupedByCanonical).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [groupedByCanonical]);

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = rawInput.trim();
    const canonical = canonicalInput.trim();
    if (!raw || !canonical) {
      toast.warning('Заполните оба поля: вариант из AD и эталонное наименование');
      return;
    }

    setMapping((prev) => ({
      ...prev,
      [raw]: canonical,
    }));

    setRawInput('');
    toast.success(`Добавлено сопоставление: "${raw}" → "${canonical}"`);
  };

  const handleRemoveVariant = (raw: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      delete next[raw];
      return next;
    });
  };

  const handleRemoveGroup = (canonical: string) => {
    const variantsToRemove = groupedByCanonical[canonical] || [];
    setMapping((prev) => {
      const next = { ...prev };
      variantsToRemove.forEach((raw) => delete next[raw]);
      return next;
    });
    toast.info(`Удалена группа "${canonical}"`);
  };

  const handleApplySuggestion = (cluster: CanonicalSuggestionCluster) => {
    setMapping((prev) => {
      const next = { ...prev };
      cluster.variants.forEach((v) => {
        next[v] = cluster.suggested_canonical;
      });
      return next;
    });

    // Remove from suggestions list
    setSuggestions((prev) => prev.filter((item) => item.suggested_canonical !== cluster.suggested_canonical));
    toast.success(`Применено объединение для "${cluster.suggested_canonical}"`);
  };

  const handleDismissSuggestion = (cluster: CanonicalSuggestionCluster) => {
    setSuggestions((prev) => prev.filter((item) => item.suggested_canonical !== cluster.suggested_canonical));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeSubTab === 'departments') {
        await onSaveDeptMapping(localDeptMapping);
      } else {
        await onSaveJobTitleMapping(localJobTitleMapping);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 p-8">
      {/* Header & Sub-tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Канонические справочники эталонов
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Объединяйте синонимы, аббревиатуры и разные варианты написания из AD в единые эталонные названия без изменения исходных данных в Active Directory.
          </p>
        </div>

        {/* Sub-tab switcher */}
        <div className="inline-flex rounded-xl p-1 glass-card self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('departments')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeSubTab === 'departments'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Отделы</span>
            <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {Object.keys(localDeptMapping).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('job_titles')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeSubTab === 'job_titles'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>Должности</span>
            <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {Object.keys(localJobTitleMapping).length}
            </span>
          </button>
        </div>
      </div>

      {/* AI Suggestions Section */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Автоматическое обнаружение дублей ({visibleSuggestions.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Система анализирует записи пользователей из AD и предлагает объединить похожие наименования
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadSuggestions()}
            disabled={isLoadingSuggestions}
            className="flex items-center gap-2 rounded-lg border border-primary/20 bg-background/50 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-background disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingSuggestions ? 'animate-spin' : ''}`} />
            <span>Обновить предложения</span>
          </button>
        </div>

        {isLoadingSuggestions ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Поиск похожих записей...</span>
          </div>
        ) : visibleSuggestions.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-primary/20 bg-background/40 p-4 text-center text-sm text-muted-foreground">
            Все найденные варианты уже объединены в справочнике или новых дублей не обнаружено.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-1 md:grid-cols-2">
            {visibleSuggestions.map((cluster, idx) => (
              <motion.div
                key={cluster.suggested_canonical + idx}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Эталон
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {cluster.variants.length} вариантов
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {cluster.suggested_canonical}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cluster.variants.map((variant) => (
                      <span
                        key={variant}
                        className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-foreground"
                      >
                        {variant}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
                  <button
                    type="button"
                    onClick={() => handleDismissSuggestion(cluster)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Отклонить</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplySuggestion(cluster)}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Объединить</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Add Card */}
      <form
        onSubmit={handleAddManual}
        className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Plus className="h-4 w-4 text-primary" />
          <span>Добавить сопоставление вручную</span>
        </h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-1 md:grid-cols-12 items-end">
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {activeSubTab === 'departments' ? 'Вариант отдела из AD' : 'Вариант должности из AD'}
            </label>
            <input
              type="text"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={activeSubTab === 'departments' ? 'Например: ПЭО или ОТиЗ' : 'Например: зам начальника'}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="hidden md:flex md:col-span-1 items-center justify-center pb-2 text-muted-foreground">
            <ArrowRight className="h-4 w-4" />
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Эталонное наименование (будет отображаться)
            </label>
            <input
              type="text"
              list="canonical-options"
              value={canonicalInput}
              onChange={(e) => setCanonicalInput(e.target.value)}
              placeholder={activeSubTab === 'departments' ? 'Планово-экономический отдел' : 'Заместитель начальника'}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <datalist id="canonical-options">
              {knownCanonicalOptions.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              <span>Добавить</span>
            </button>
          </div>
        </div>
      </form>

      {/* Existing Mappings Section */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-base font-semibold text-foreground">
              Текущие эталонные группы ({filteredCanonicalKeys.length})
            </h3>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по эталону или AD..."
              className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {filteredCanonicalKeys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
            <Info className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h4 className="mt-3 text-sm font-medium text-foreground">Нет сохраненных сопоставлений</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Воспользуйтесь автоматическими предложениями выше или добавьте правила вручную.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {filteredCanonicalKeys.map((canonical) => {
                const variants = groupedByCanonical[canonical] || [];
                return (
                  <motion.div
                    key={canonical}
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm transition hover:border-border sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground truncate">
                          {canonical}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0">
                          {variants.length} {variants.length === 1 ? 'вариант' : variants.length < 5 ? 'варианта' : 'вариантов'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground mr-1">AD варианты:</span>
                        {variants.map((variant) => (
                          <span
                            key={variant}
                            className="group inline-flex items-center gap-1 rounded-md border border-border/80 bg-background/80 px-2 py-0.5 text-xs text-foreground shadow-2xs"
                          >
                            <span>{variant}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(variant)}
                              className="opacity-60 hover:opacity-100 transition text-destructive"
                              title={`Удалить вариант "${variant}"`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveGroup(canonical)}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive/80 transition hover:bg-destructive/10 hover:text-destructive"
                        title="Удалить всю группу"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Удалить группу</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Save bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2">
          {hasUnsavedChanges ? (
            <span className="flex items-center gap-2 text-xs font-medium text-amber-500">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Есть несохраненные изменения в справочнике {activeSubTab === 'departments' ? 'отделов' : 'должностей'}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-xs font-medium text-emerald-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Все изменения сохранены
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!hasUnsavedChanges || isSaving}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Сохранение и пересчет...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              <span>Сохранить справочник</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
