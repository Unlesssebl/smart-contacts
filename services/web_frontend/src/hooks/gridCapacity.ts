export interface GridCapacityInput {
  containerHeight: number;
  cardHeight: number;
  columns: number;
  rowGap: number;
  paddingTop?: number;
  paddingBottom?: number;
}

export interface GridCapacity {
  columns: number;
  rows: number;
  limit: number;
}

const toNonNegative = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

/**
 * Calculates how many complete card rows fit inside the grid viewport.
 * Keeping this DOM-independent makes the layout rule deterministic and testable.
 */
export function calculateGridCapacity({
  containerHeight,
  cardHeight,
  columns,
  rowGap,
  paddingTop = 0,
  paddingBottom = 0,
}: GridCapacityInput): GridCapacity {
  const safeColumns = Math.max(1, Math.floor(toNonNegative(columns)));
  const safeCardHeight = toNonNegative(cardHeight);
  const safeGap = toNonNegative(rowGap);
  const usableHeight = Math.max(
    0,
    toNonNegative(containerHeight) -
      toNonNegative(paddingTop) -
      toNonNegative(paddingBottom),
  );

  const rows = safeCardHeight > 0
    ? Math.max(1, Math.floor((usableHeight + safeGap) / (safeCardHeight + safeGap)))
    : 1;

  return {
    columns: safeColumns,
    rows,
    limit: safeColumns * rows,
  };
}
