import { useEffect, useRef, useState, useMemo } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { motion } from 'motion/react';
import { FilterCombobox } from './ui/FilterCombobox';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

export function SpotlightSearch() {
  const {
    searchQuery, setSearchQuery,
    filters, setFilters,
    departments, organizations, jobTitles, fetchFilterOptions,
    currentUser
  } = useAppStore(useShallow((state) => ({
    searchQuery: state.searchQuery,
    setSearchQuery: state.setSearchQuery,
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
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Show filters if any filter is active, or if user explicitly toggles it
  const hasActiveFilters = useMemo(() => Boolean(
    filters.department || filters.organization || filters.job_title ||
    filters.has_phone || filters.has_email || filters.hidden_only
  ), [filters]);

  const [showFilters, setShowFilters] = useState(hasActiveFilters);

  const toggleFilters = () => {
    setShowFilters((isOpen) => !isOpen);
  };

  const clearFilters = () => {
    setFilters({
      organization: undefined,
      department: undefined,
      job_title: undefined,
      has_phone: false,
      has_email: false,
      hidden_only: false,
    });
  };

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
      const activeElement = document.activeElement;
      const isInputActive =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement as HTMLElement).isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      if (isInputActive) return;

      // Focus search automatically if the user types a printable character (not space)
      if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        inputRef.current?.focus();
      } else if (e.key === 'Backspace' && inputRef.current?.value) {
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
      className="relative mx-auto w-full"
    >
      <motion.div
        animate={{
          borderBottomLeftRadius: showFilters ? 0 : 12,
          borderBottomRightRadius: showFilters ? 0 : 12,
        }}
        transition={{
          duration: showFilters ? 0.24 : 0.18,
          ease: showFilters ? [0.22, 1, 0.36, 1] : [0.4, 0, 1, 1],
        }}
        className={`relative rounded-t-xl border bg-white p-0 transition-[border-color,box-shadow] duration-200 ${
          isInputFocused 
            ? 'border-[#668aab] shadow-[0_10px_25px_-18px_rgba(26,54,84,0.35)]'
            : 'border-[#dce3ea] shadow-[0_10px_24px_-20px_rgba(26,54,84,0.32)]'
        }`}
      >
        <div className="flex min-h-[64px] items-center gap-4 px-6 py-3.5">
          <Search className={`h-5 w-5 transition-colors ${isInputFocused ? 'text-slate-900' : 'text-slate-400'}`} strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Поиск сотрудников"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            className="flex-1 bg-transparent text-base text-slate-900 placeholder-slate-400 outline-none"
          />

          <button
            onClick={toggleFilters}
            aria-expanded={showFilters}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-[background-color,color,transform] duration-200 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#356b99]/35 ${showFilters || hasActiveFilters
                ? 'bg-[#eaf1f8] text-[#0b4f92] hover:bg-[#dfeaf5]'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Фильтры</span>
            {hasActiveFilters && (
              <span className="flex h-2 w-2 rounded-full bg-slate-900" />
            )}
          </button>
        </div>

        {/* Filters Panel */}
        <motion.div
          initial={false}
          animate={showFilters
            ? {
                opacity: 1,
                y: 0,
                visibility: 'visible',
                transition: {
                  duration: 0.24,
                  ease: [0.22, 1, 0.36, 1],
                  opacity: { duration: 0.16, ease: 'easeOut' },
                },
              }
            : {
                opacity: 0,
                y: -4,
                transition: {
                  duration: 0.18,
                  ease: [0.4, 0, 1, 1],
                  opacity: { duration: 0.1, ease: 'linear' },
                },
                transitionEnd: { visibility: 'hidden' },
              }}
          aria-hidden={!showFilters}
          inert={!showFilters}
          className="absolute -left-px -right-px top-full z-30 -mt-px rounded-b-xl shadow-[0_18px_36px_-20px_rgba(26,54,84,0.38)]"
          style={{ pointerEvents: showFilters ? 'auto' : 'none' }}
        >
          <motion.div
            initial={false}
            animate={{
              clipPath: showFilters ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)',
              transition: {
                duration: showFilters ? 0.24 : 0.18,
                ease: showFilters ? [0.22, 1, 0.36, 1] : [0.4, 0, 1, 1],
              },
            }}
            className={`overflow-hidden rounded-b-xl border border-t-0 bg-[#f8fafc] transition-colors duration-200 ${
              isInputFocused ? 'border-[#668aab]' : 'border-[#dce3ea]'
            }`}
          >
                <div className="flex flex-col gap-4 px-6 py-4">
                  <div className="flex flex-wrap items-center gap-4">
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

                    <button
                      type="button"
                      disabled={!hasActiveFilters}
                      onClick={clearFilters}
                      className="ml-auto flex shrink-0 items-center rounded-md border border-rose-200 bg-rose-50/70 px-3 py-1.5 text-sm font-medium text-rose-700 shadow-sm transition-[background-color,border-color,color,box-shadow] hover:border-rose-300 hover:bg-rose-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-white disabled:text-slate-400 disabled:shadow-none disabled:hover:border-slate-200 disabled:hover:bg-white"
                    >
                      Очистить всё
                    </button>
                  </div>

                  <div className="flex items-center gap-5 overflow-x-auto">
                    <div className="flex shrink-0 items-center gap-2">
                      <Switch
                        id="has-phone"
                        checked={filters.has_phone || false}
                        onCheckedChange={(c) => setFilters({ has_phone: c })}
                      />
                      <Label htmlFor="has-phone" className="cursor-pointer whitespace-nowrap text-sm font-medium">С телефоном</Label>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Switch
                        id="has-email"
                        checked={filters.has_email || false}
                        onCheckedChange={(c) => setFilters({ has_email: c })}
                      />
                      <Label htmlFor="has-email" className="cursor-pointer whitespace-nowrap text-sm font-medium">С email</Label>
                    </div>

                    {isAdmin && (
                      <div className="flex shrink-0 items-center gap-2">
                        <Switch
                          id="hidden-only"
                          checked={filters.hidden_only || false}
                          onCheckedChange={(c) => setFilters({ hidden_only: c })}
                        />
                        <Label htmlFor="hidden-only" className="cursor-pointer whitespace-nowrap text-sm font-medium">Скрытые УЗ</Label>
                      </div>
                    )}

                  </div>
                </div>
          </motion.div>
        </motion.div>


      </motion.div>
    </motion.div>
  );
}
