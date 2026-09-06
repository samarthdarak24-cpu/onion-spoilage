import { describe, it, expect } from 'vitest';
import { normalizePercentages, normalizeComposition } from '../src/utils/percentages';

describe('normalizePercentages', () => {
  it('always sums to exactly 100', () => {
    for (const parts of [[40, 35, 25], [1, 1, 1], [0, 0, 100], [33, 33, 33]]) {
      const r = normalizePercentages(parts);
      expect(r.reduce((a, b) => a + b, 0)).toBe(100);
    }
  });

  it('keeps non-negative integers', () => {
    const r = normalizePercentages([1, 1, 1]);
    expect(r.every((x) => Number.isInteger(x) && x >= 0)).toBe(true);
  });

  it('returns zeros when total is zero', () => {
    expect(normalizePercentages([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('normalizes a composition object', () => {
    const c = normalizeComposition({ gradeA: 50, urs: 30, rejected: 20 });
    expect(c.gradeA + c.urs + c.rejected).toBe(100);
  });
});
