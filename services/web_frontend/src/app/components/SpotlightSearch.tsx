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
        className="relative overflow-hidden rounded-2xl border shadow-2xl transition-all focus-within:shadow-3xl"
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(40px)',
          border: '0.5px solid rgba(255, 255, 255, 0.5)',
          boxShadow:
            'inset 0.5px 0.5px 0 rgba(255, 255, 255, 0.5), 0 4px 16px rgba(0, 0, 0, 0.06), 0 16px 48px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div className="flex items-center gap-4 px-6 py-4">
          <Search className="h-5 w-5 text-[#8E8E93]" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search employees by name, title, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-base text-[#1C1C1E] placeholder-[#8E8E93] outline-none"
          />
          <div className="flex items-center gap-1 rounded-lg bg-white/60 px-2 py-1 text-xs text-[#8E8E93]">
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
              <p className="text-sm text-[#8E8E93]">
                Press <kbd className="rounded bg-white/60 px-1.5 py-0.5 text-xs">Enter</kbd> to focus
                results
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
