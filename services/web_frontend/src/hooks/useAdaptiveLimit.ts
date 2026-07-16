import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

// Approximate card height in pixels (including gap). 
// Increased to 300 to guarantee 2 rows on 1080p and 3 rows on 1440p.
const CARD_HEIGHT = 300;
const CARD_GAP = 24;

/**
 * Hook that calculates the optimal number of cards to display without vertical scrolling.
 * Uses window.innerHeight to avoid positive feedback loops during animations.
 */
export function useAdaptiveLimit() {
  const setLimit = useAppStore((s) => s.setLimit);
  const lastLimitRef = useRef<number>(9);

  useEffect(() => {
    const calculate = () => {
      // Approximate vertical offsets: header(~75px) + paddings(~80px) = ~160px
      const verticalOffsets = 160; 
      const availableHeight = window.innerHeight - verticalOffsets;
      const rowHeight = CARD_HEIGHT + CARD_GAP;
      const rows = Math.max(1, Math.floor(availableHeight / rowHeight));

      let cols = 1;
      if (window.innerWidth > 1920) cols = 4;        // 2K and Ultrawide
      else if (window.innerWidth >= 1280) cols = 3;  // Full HD (xl)
      else if (window.innerWidth >= 1024) cols = 2;  // lg

      // Make sure we have a sensible fallback
      const newLimit = Math.max(cols, rows * cols);
      
      if (newLimit !== lastLimitRef.current) {
        lastLimitRef.current = newLimit;
        setLimit(newLimit);
      }
    };

    let timeoutId: ReturnType<typeof setTimeout>;
    const debouncedCalculate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(calculate, 150);
    };

    window.addEventListener('resize', debouncedCalculate);
    // Initial calculation should be immediate
    calculate();

    return () => {
      window.removeEventListener('resize', debouncedCalculate);
      clearTimeout(timeoutId);
    };
  }, [setLimit]);
}
