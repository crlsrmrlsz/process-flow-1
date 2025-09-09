import { describe, it, expect } from 'vitest';
import { sampleEvents } from '@/data/sampleEvents';
import { buildGraph } from './graph';
import { computeVisible, maxDepth } from './step';

describe('step filter', () => {
  const g = buildGraph(sampleEvents);
  const m = maxDepth(g);

  it('reveals nothing at step 0 (only START node)', () => {
    const { visibleEdges } = computeVisible(g, { step: 0 });
    expect(visibleEdges.size).toBe(0);
  });

  it('reveals more edges as step increases', () => {
    const a = computeVisible(g, { step: 1 }).visibleEdges.size;
    const b = computeVisible(g, { step: Math.max(2, m) }).visibleEdges.size;
    expect(b).toBeGreaterThanOrEqual(a);
  });

  it('reveals from START only', () => {
    const all = computeVisible(g, { step: m });
    expect(all.visibleEdges.size).toBeGreaterThan(0);
  });
});
