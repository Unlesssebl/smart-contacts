import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { calculateGridCapacity } from './gridCapacity';

const GRID_SELECTOR = '[data-adaptive-grid]';
const CARD_SELECTOR = '[data-card]';
const ESTIMATED_CARD_HEIGHT = 282;

const pixels = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const countComputedColumns = (template: string) => {
  if (!template || template === 'none') return 1;

  let depth = 0;
  let tracks = 0;
  let hasToken = false;

  for (const character of template.trim()) {
    if (character === '(') depth += 1;
    if (character === ')') depth = Math.max(0, depth - 1);

    if (/\s/.test(character) && depth === 0) {
      if (hasToken) tracks += 1;
      hasToken = false;
    } else {
      hasToken = true;
    }
  }

  return Math.max(1, tracks + (hasToken ? 1 : 0));
};

/** Keeps the server page size aligned with the number of complete visible rows. */
export function useAdaptiveLimit(containerRef: RefObject<HTMLDivElement | null>) {
  const setLimit = useAppStore((state) => state.setLimit);
  const currentLimit = useAppStore((state) => state.limit);
  const limitRef = useRef(currentLimit);
  const [isReady, setIsReady] = useState(false);

  limitRef.current = currentLimit;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frameId: number | null = null;
    let disposed = false;
    const observedCards = new Set<Element>();

    const calculate = () => {
      frameId = null;
      if (disposed) return;

      const grid = container.querySelector<HTMLElement>(GRID_SELECTOR);
      if (!grid) return;

      const gridStyle = window.getComputedStyle(grid);
      const cards = Array.from(grid.querySelectorAll<HTMLElement>(CARD_SELECTOR));
      const measuredCardHeight = cards.reduce(
        (height, card) => Math.max(height, card.offsetHeight),
        0,
      );

      const { limit } = calculateGridCapacity({
        containerHeight: container.clientHeight,
        cardHeight: measuredCardHeight || ESTIMATED_CARD_HEIGHT,
        columns: countComputedColumns(gridStyle.gridTemplateColumns),
        rowGap: pixels(gridStyle.rowGap),
        paddingTop: pixels(gridStyle.paddingTop),
        paddingBottom: pixels(gridStyle.paddingBottom),
      });

      if (limit !== limitRef.current) {
        limitRef.current = limit;
        setLimit(limit);
      }

      setIsReady(true);
    };

    const scheduleCalculation = () => {
      if (disposed) return;
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(calculate);
    };

    const resizeObserver = new ResizeObserver(scheduleCalculation);
    resizeObserver.observe(container);

    const observeCards = () => {
      const currentCards = new Set<Element>(
        Array.from(container.querySelectorAll(CARD_SELECTOR)),
      );

      observedCards.forEach((card) => {
        if (!currentCards.has(card)) {
          resizeObserver.unobserve(card);
          observedCards.delete(card);
        }
      });

      currentCards.forEach((card) => {
        if (!observedCards.has(card)) {
          observedCards.add(card);
          resizeObserver.observe(card);
        }
      });
    };

    const mutationObserver = new MutationObserver(() => {
      observeCards();
      scheduleCalculation();
    });
    mutationObserver.observe(container, { childList: true, subtree: true });

    observeCards();
    calculate();
    document.fonts?.ready.then(scheduleCalculation);

    return () => {
      disposed = true;
      if (frameId !== null) cancelAnimationFrame(frameId);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [containerRef, setLimit]);

  return { isReady };
}
