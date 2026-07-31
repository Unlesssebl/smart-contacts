import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

/**
 * Hook that dynamically calculates the optimal number of cards to display per page
 * without vertical scrolling, using DOM measurements and ResizeObserver.
 *
 * To prevent the visible "jerk" on initial render, the container is hidden (opacity:0)
 * before the first calculation, and revealed with a smooth fade-in once the correct
 * grid-template-rows value has been applied and the DOM has settled (double-rAF).
 */
export function useAdaptiveLimit(containerRef?: React.RefObject<HTMLDivElement | null>) {
  const setLimit = useAppStore((s) => s.setLimit);
  const lastLimitRef = useRef<number>(9);

  useEffect(() => {
    const calculate = () => {
      let availableHeight = 0;
      let cols = 1;
      let cardHeight = 280;
      let gap = 20;

      const el = containerRef?.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        availableHeight = rect.height;

        const style = window.getComputedStyle(el);
        const gridCols = style.gridTemplateColumns;
        if (gridCols && gridCols !== 'none') {
          cols = gridCols.split(' ').filter(Boolean).length;
        } else {
          // Fallback matching Tailwind breakpoints: md: 2, lg: 3
          const w = window.innerWidth;
          if (w >= 1024) cols = 3;
          else if (w >= 768) cols = 2;
          else cols = 1;
        }

        const cardEl = el.querySelector('[data-card]') as HTMLElement | null;
        if (cardEl) {
          const cardRect = cardEl.getBoundingClientRect();
          if (cardRect.height > 50) {
            cardHeight = cardRect.height;
          }
        }
        const rowGap = parseFloat(style.rowGap || style.gap || '20');
        if (!isNaN(rowGap)) gap = rowGap;
      } else {
        // Fallback using window height
        const verticalOffsets = 140;
        availableHeight = Math.max(200, window.innerHeight - verticalOffsets);
        const w = window.innerWidth;
        if (w >= 1024) cols = 3;
        else if (w >= 768) cols = 2;
        else cols = 1;
      }

      const rowHeight = cardHeight + gap;
      let rows = Math.max(1, Math.floor((availableHeight + gap) / rowHeight));

      // Specifically for 2K monitors (width >= 2560 and height >= 1200), force 3 rows;
      // For FullHD monitors (width <= 1920 or height <= 1080), restrict to 2 rows (2x3 = 6 cards grid):
      if (window.innerWidth >= 2560 && window.innerHeight >= 1200) {
        rows = 3;
      } else if (window.innerWidth <= 1920 || window.innerHeight <= 1080) {
        rows = Math.min(rows, 2);
      }

      const newLimit = Math.max(cols, rows * cols);

      if (el) {
        el.style.setProperty('--grid-rows', String(rows));
      }

      if (newLimit !== lastLimitRef.current && newLimit > 0) {
        lastLimitRef.current = newLimit;
        setLimit(newLimit);
      }
    };

    let timeoutId: ReturnType<typeof setTimeout>;
    const debouncedCalculate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(calculate, 100);
    };

    const targetEl = containerRef?.current;

    // ── Hide the container before the first measurement to prevent the initial
    //    layout "jerk" (cards visibly resizing from default to calculated sizes).
    if (targetEl) {
      targetEl.style.opacity = '0';
    }

    let observer: ResizeObserver | null = null;
    if (targetEl && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(debouncedCalculate);
      observer.observe(targetEl);
    }

    window.addEventListener('resize', debouncedCalculate);

    // Run the initial calculation synchronously so --grid-rows is set immediately.
    calculate();

    // Double-rAF: wait for the browser to paint the updated layout (with correct
    // grid-template-rows) before fading in the container. This guarantees the
    // cards are already at their final size when they first become visible.
    const rafId = requestAnimationFrame(() => {
      // Second rAF: ensures React has committed the limit-change re-render.
      requestAnimationFrame(() => {
        if (targetEl) {
          targetEl.style.transition = 'opacity 0.2s ease';
          targetEl.style.opacity = '1';
        }
        // Secondary measurement now that cards have their real dimensions.
        calculate();
      });
    });

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', debouncedCalculate);
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      // Reset visibility on cleanup so remounts don't flash invisible.
      if (targetEl) {
        targetEl.style.opacity = '1';
        targetEl.style.transition = '';
      }
    };
  }, [containerRef, setLimit]);
}
