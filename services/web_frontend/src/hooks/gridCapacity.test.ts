import { describe, expect, it } from 'vitest';
import { calculateGridCapacity } from './gridCapacity';

describe('calculateGridCapacity', () => {
  it('counts only complete rows', () => {
    expect(calculateGridCapacity({
      containerHeight: 684,
      cardHeight: 328,
      columns: 3,
      rowGap: 20,
      paddingTop: 8,
    })).toEqual({ columns: 3, rows: 2, limit: 6 });
  });

  it('does not add a row when it is short by one pixel', () => {
    expect(calculateGridCapacity({
      containerHeight: 683,
      cardHeight: 328,
      columns: 3,
      rowGap: 20,
      paddingTop: 8,
    }).rows).toBe(1);
  });

  it('always keeps one row available on a very small viewport', () => {
    expect(calculateGridCapacity({
      containerHeight: 200,
      cardHeight: 328,
      columns: 2,
      rowGap: 20,
    })).toEqual({ columns: 2, rows: 1, limit: 2 });
  });

  it('normalizes invalid measurements', () => {
    expect(calculateGridCapacity({
      containerHeight: Number.NaN,
      cardHeight: Number.NaN,
      columns: 0,
      rowGap: -10,
    })).toEqual({ columns: 1, rows: 1, limit: 1 });
  });
});
