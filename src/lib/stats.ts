export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < values.length; i++) s += values[i];
  return s / values.length;
}

export function quantileSorted(valuesSortedAsc: number[], p: number): number {
  if (valuesSortedAsc.length === 0) return 0;
  const n = valuesSortedAsc.length;
  const rank = Math.ceil(p * n);
  const idx = Math.min(Math.max(rank - 1, 0), n - 1);
  return valuesSortedAsc[idx];
}

export function summarizeDurationsMs(values: number[]) {
  if (values.length === 0) {
    return { mean: 0, median: 0, min: 0, max: 0, p90: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const m = mean(values);
  const med = quantileSorted(sorted, 0.5);
  const p90 = quantileSorted(sorted, 0.9);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  return { mean: m, median: med, min, max, p90 };
}

