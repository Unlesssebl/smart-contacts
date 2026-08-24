import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RadialPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function RadialPagination({ currentPage, totalPages, onPageChange }: RadialPaginationProps) {
  // We want to show a fixed number of items around the current page, e.g., 2 above and 2 below.
  const visibleRange = 2; // Number of items visible on each side of the active item
  
  // Calculate the range of pages to render.
  // We want to always show the same number of "slots" to maintain the radial structure,
  // but some slots might be empty if we are at the very beginning or end.
  const pages = [];
  for (let offset = -visibleRange; offset <= visibleRange; offset++) {
    const pageNum = currentPage + offset;
    pages.push({
      pageNum,
      offset, // Distance from the center (-2, -1, 0, 1, 2)
      isValid: pageNum >= 1 && pageNum <= totalPages
    });
  }

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  // Math for the arc
  // Math for the drum effect
  const getTransform = (offset: number) => {
    const absOffset = Math.abs(offset);
    // Keep them vertically aligned, use scale and opacity for depth
    const scale = 1 - absOffset * 0.2;
    const opacity = 1 - absOffset * 0.4;
    return { x: 0, scale, opacity };
  };

  return (
    <div className="fixed right-5 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center justify-center">
      {/* Unified Glass Pill Container */}
      <div className="flex min-h-[320px] w-[64px] transform-gpu flex-col items-center justify-center gap-2 rounded-full border border-white/90 bg-white/88 py-4 shadow-[0_16px_42px_-18px_rgba(32,73,112,0.32)] backdrop-blur-xl">
        
        {/* Prev Arrow */}
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          aria-label="Предыдущая страница"
          className="rounded-full border border-transparent p-2 text-[#2b5982] shadow-sm transition-[background-color,color,transform] hover:border-white/80 hover:bg-white/90 hover:text-[#0e304f] active:translate-y-px disabled:pointer-events-none disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 cursor-pointer"
        >
          <ChevronUp className="h-5 w-5" strokeWidth={2.2} />
        </button>

        {/* Page Nodes */}
        <div className="relative flex flex-col items-center gap-3 w-full flex-1 justify-center py-2">
          {/* Soft guide: visually interrupted by the page labels */}
          <div className="pointer-events-none absolute bottom-3 left-1/2 top-3 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#9db9ce]/30 to-transparent" />
          
          <AnimatePresence mode="popLayout">
            {pages.map((p) => {
              if (!p.isValid) {
                if (p.pageNum === 0) {
                  const style = getTransform(p.offset);
                  return (
                    <motion.div
                      layout
                      key={`zero-${p.offset}`}
                      initial={{ opacity: 0, scale: 0.5, y: style.scale > 0 ? 20 : -20 }}
                      animate={{ opacity: style.opacity * 0.5, x: style.x, scale: style.scale, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      className="relative z-10 shrink-0 flex items-center justify-center h-10 w-10 rounded-full font-bold text-[14px] text-slate-400 select-none pointer-events-none"
                    >
                      <span className="rounded-[4px] bg-white/95 px-1.5 shadow-[0_0_0_3px_rgba(255,255,255,0.72)]">00</span>
                    </motion.div>
                  );
                }
                return <div key={`empty-${p.offset}`} className="h-10 w-10 shrink-0" />;
              }

              const style = getTransform(p.offset);
              const isActive = p.offset === 0;

              return (
                <motion.button
                  layout
                  key={p.pageNum}
                  initial={{ opacity: 0, scale: 0.5, y: style.scale > 0 ? 20 : -20 }}
                  animate={{ opacity: style.opacity, x: style.x, scale: style.scale, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  onClick={() => onPageChange(p.pageNum)}
                  aria-label={`Страница ${p.pageNum}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                    relative z-10 shrink-0 flex items-center justify-center
                    h-10 w-10 rounded-full font-bold text-[14px] transition-colors cursor-pointer
                    ${isActive 
                      ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/60' 
                      : 'bg-transparent text-slate-500 hover:bg-white/60 hover:text-slate-800'
                    }
                  `}
                >
                  <span className={isActive ? undefined : 'rounded-[4px] bg-white/95 px-1.5 shadow-[0_0_0_3px_rgba(255,255,255,0.72)]'}>
                    {String(p.pageNum).padStart(2, '0')}
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Next Arrow */}
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          aria-label="Следующая страница"
          className="rounded-full border border-transparent p-2 text-[#2b5982] shadow-sm transition-[background-color,color,transform] hover:border-white/80 hover:bg-white/90 hover:text-[#0e304f] active:translate-y-px disabled:pointer-events-none disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 cursor-pointer"
        >
          <ChevronDown className="h-5 w-5" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
