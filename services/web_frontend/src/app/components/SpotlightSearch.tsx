import { useEffect, useRef } from 'react';
import { Search, Command } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { motion, AnimatePresence } from 'motion/react';

export function SpotlightSearch() {
  const { searchQuery, setSearchQuery } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative mx-auto w-full max-w-2xl"
    >
      <div 
        className="relative overflow-hidden border border-black/5 bg-white/60 backdrop-blur-xl p-0 shadow-sm transition-all focus-within:shadow-md focus-within:bg-white focus-within:border-primary/20"
        style={{ borderRadius: 'var(--radius)' }}
      >
        <div className="flex items-center gap-4 px-6 py-4">
          <Search className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Поиск сотрудников по имени, должности или отделу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-base text-foreground placeholder-muted-foreground outline-none"
          />
          <div className="flex items-center gap-1 rounded-lg bg-black/5 px-2 py-1 text-xs text-muted-foreground">
            <Command className="h-3 w-3" strokeWidth={1.5} />
            <span>K</span>
          </div>
        </div>

        {/* Search hint */}
        <AnimatePresence>
          {searchQuery && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-black/5 bg-white/40 px-6 py-3"
            >
              <p className="text-sm text-muted-foreground">
                Нажмите <kbd className="rounded bg-black/5 px-1.5 py-0.5 text-xs">Enter</kbd>, чтобы перейти к результатам
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
