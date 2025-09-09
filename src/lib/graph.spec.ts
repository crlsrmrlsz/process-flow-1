import { describe, it, expect } from 'vitest';
import { sampleEvents } from '@/data/sampleEvents';
import { buildGraph, START_NODE_ID } from './graph';

describe('buildGraph', () => {
  const g = buildGraph(sampleEvents);

  it('includes START node and activities', () => {
    const ids = new Set(g.nodes.map((n) => n.id));
    expect(ids.has(START_NODE_ID)).toBe(true);
    for (const act of ['A', 'B', 'C', 'Review', 'Done']) {
      expect(ids.has(act)).toBe(true);
    }
  });

  it('builds edges with counts and traversals', () => {
    const e1 = g.edges.find((e) => e.source === 'A' && e.target === 'B');
    expect(e1).toBeDefined();
    expect(e1!.count).toBeGreaterThan(0);
    expect(e1!.traversals.length).toBe(e1!.count);
  });

  it('connects START to first activities', () => {
    const e = g.edges.filter((e) => e.source === START_NODE_ID);
    expect(e.length).toBeGreaterThan(0);
  });
});

