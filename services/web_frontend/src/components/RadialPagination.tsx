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
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center justify-center">
      {/* Unified Glass Pill Container */}
      <div className="flex flex-col items-center justify-center gap-2 min-h-[320px] w-[64px] py-4 rounded-full bg-white/50 backdrop-blur-xl border border-white shadow-[0_8px_32px_-4px_rgba(32,92,158,0.15)]">
        
        {/* Prev Arrow */}
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="p-2 rounded-full text-primary/60 hover:text-primary hover:bg-white/60 transition-colors disabled:opacity-30 disabled:pointer-events-none shadow-sm border border-transparent hover:border-white/50"
        >
          <ChevronUp className="h-5 w-5" />
        </button>

        {/* Page Nodes */}
        <div className="relative flex flex-col items-center gap-3 w-full flex-1 justify-center py-2">
          {/* Decorative Track Line */}
          <div className="absolute left-1/2 top-2 bottom-2 w-[2px] -translate-x-1/2 bg-gradient-to-b from-transparent via-slate-300/40 to-transparent pointer-events-none" />
          
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
                      00
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
                  className={`
                    relative z-10 shrink-0 flex items-center justify-center
                    h-10 w-10 rounded-full font-bold text-[14px] transition-colors cursor-pointer
                    ${isActive 
                      ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/60' 
                      : 'bg-transparent text-slate-500 hover:bg-white/60 hover:text-slate-800'
                    }
                  `}
                >
                  {String(p.pageNum).padStart(2, '0')}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Next Arrow */}
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="p-2 rounded-full text-primary/60 hover:text-primary hover:bg-white/60 transition-colors disabled:opacity-30 disabled:pointer-events-none shadow-sm border border-transparent hover:border-white/50"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
