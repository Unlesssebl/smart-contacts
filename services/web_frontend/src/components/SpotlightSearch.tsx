import { useEffect, useRef, useState, useMemo } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence } from 'motion/react';
import { FilterCombobox } from './ui/FilterCombobox';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

export function SpotlightSearch() {
  const {
    searchQuery, setSearchQuery, isSearching,
    filters, setFilters,
    departments, organizations, jobTitles, fetchFilterOptions,
    currentUser
  } = useAppStore(useShallow((state) => ({
    searchQuery: state.searchQuery,
    setSearchQuery: state.setSearchQuery,
    isSearching: state.isSearching,
    filters: state.filters,
    setFilters: state.setFilters,
    departments: state.departments,
    organizations: state.organizations,
    jobTitles: state.jobTitles,
    fetchFilterOptions: state.fetchFilterOptions,
    currentUser: state.currentUser,
  })));

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'it_operator';

  const inputRef = useRef<HTMLInputElement>(null);
  const [localQuery, setLocalQuery] = useState(searchQuery);

  // Show filters if any filter is active, or if user explicitly toggles it
  const hasActiveFilters = useMemo(() => Boolean(
    filters.department || filters.organization || filters.job_title ||
    filters.has_phone || filters.has_email || filters.hidden_only
  ), [filters]);

  const [showFilters, setShowFilters] = useState(hasActiveFilters);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    if (hasActiveFilters) {
      setShowFilters(true);
    }
  }, [hasActiveFilters]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== searchQuery) {
        setSearchQuery(localQuery);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localQuery, searchQuery, setSearchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="relative mx-auto w-full max-w-3xl"
    >
      <div
        className="relative overflow-hidden border border-black/5 bg-white/60 backdrop-blur-xl p-0 shadow-sm transition-all focus-within:shadow-md focus-within:bg-white focus-within:border-primary/20"
        style={{ borderRadius: 'var(--radius)' }}
      >
        <div className="flex items-center gap-4 px-6 py-4">
          <Search className={`h-5 w-5 ${isSearching ? 'text-blue-500 animate-pulse' : 'text-muted-foreground'}`} strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Поиск сотрудников"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className="flex-1 bg-transparent text-base text-foreground placeholder-muted-foreground outline-none"
          />

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${showFilters || hasActiveFilters
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-black/5 hover:text-foreground'
              }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Фильтры</span>
            {hasActiveFilters && (
              <span className="flex h-2 w-2 rounded-full bg-primary" />
            )}
          </button>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-black/5 bg-white/40"
            >
              <div className="flex flex-wrap items-center gap-4 px-6 py-4">
                <FilterCombobox
                  options={organizations}
                  value={filters.organization}
                  onChange={(v) => setFilters({ organization: v })}
                  placeholder="Организация"
                />

                <FilterCombobox
                  options={departments}
                  value={filters.department}
                  onChange={(v) => setFilters({ department: v })}
                  placeholder="Отдел"
                />

                <FilterCombobox
                  options={jobTitles}
                  value={filters.job_title}
                  onChange={(v) => setFilters({ job_title: v })}
                  placeholder="Должность"
                />

                <div className="flex items-center space-x-2 ml-auto">
                  <Switch
                    id="has-phone"
                    checked={filters.has_phone || false}
                    onCheckedChange={(c) => setFilters({ has_phone: c })}
                  />
                  <Label htmlFor="has-phone" className="text-sm font-medium cursor-pointer">С телефоном</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="has-email"
                    checked={filters.has_email || false}
                    onCheckedChange={(c) => setFilters({ has_email: c })}
                  />
                  <Label htmlFor="has-email" className="text-sm font-medium cursor-pointer">С email</Label>
                </div>

                {isAdmin && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hidden-only"
                      checked={filters.hidden_only || false}
                      onCheckedChange={(c) => setFilters({ hidden_only: c })}
                    />
                    <Label htmlFor="hidden-only" className="text-sm font-medium cursor-pointer">Скрытые УЗ</Label>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>


      </div>
    </motion.div>
  );
}
