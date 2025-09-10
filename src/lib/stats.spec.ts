import { describe, it, expect } from 'vitest';
import { mean, quantileSorted, summarizeDurationsMs } from './stats';

describe('stats utilities', () => {
  it('mean works on simple arrays', () => {
    expect(mean([])).toBe(0);
    expect(mean([2])).toBe(2);
    expect(mean([1, 2, 3])).toBeCloseTo(2);
  });

  it('quantileSorted uses nearest-rank', () => {
    const arr = [1, 2, 3];
    expect(quantileSorted(arr, 0.5)).toBe(2);
    expect(quantileSorted(arr, 0.9)).toBe(3);
    expect(quantileSorted(arr, 0.1)).toBe(1);
  });

  it('summarizeDurationsMs returns expected fields', () => {
    const ms = [600_000, 1_200_000, 1_800_000]; // 10, 20, 30 minutes
    const s = summarizeDurationsMs(ms);
    expect(Math.round(s.mean)).toBe(1_200_000);
    expect(s.median).toBe(1_200_000);
    expect(s.min).toBe(600_000);
    expect(s.max).toBe(1_800_000);
    expect(s.p90).toBe(1_800_000);
  });
});

