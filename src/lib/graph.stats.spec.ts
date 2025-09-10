import { describe, it, expect } from 'vitest';
import { buildGraph } from './graph';
import type { EventLogEvent } from '@/types';

// Construct a tiny dataset with known durations/resources/departments
const base = new Date('2025-01-01T09:00:00Z').getTime();
const t = (mins: number) => new Date(base + mins * 60_000).toISOString();

const events: EventLogEvent[] = [
  // Case A: 10 min A->B (Fin/r1), then terminal
  { caseId: 'A', activity: 'A', timestamp: t(0), resource: 'r1', department: 'Fin' },
  { caseId: 'A', activity: 'B', timestamp: t(10), resource: 'r1', department: 'Fin' },

  // Case B: 20 min A->B (Fin/r2)
  { caseId: 'B', activity: 'A', timestamp: t(0), resource: 'r2', department: 'Fin' },
  { caseId: 'B', activity: 'B', timestamp: t(20), resource: 'r2', department: 'Fin' },

  // Case C: 30 min A->B (Legal/r1)
  { caseId: 'C', activity: 'A', timestamp: t(0), resource: 'r1', department: 'Legal' },
  { caseId: 'C', activity: 'B', timestamp: t(30), resource: 'r1', department: 'Legal' },
];

describe('graph stats enrichment', () => {
  const g = buildGraph(events);
  const eAB = g.edges.find((e) => e.source === 'A' && e.target === 'B');

  it('computes counts and traversals', () => {
    expect(eAB).toBeDefined();
    expect(eAB!.count).toBe(3);
    expect(eAB!.traversals.length).toBe(3);
  });

  it('computes duration stats (mean/median/p90/min/max)', () => {
    // durations: 10, 20, 30 minutes
    expect(Math.round(eAB!.meanMs || 0)).toBe(1_200_000);
    expect(eAB!.medianMs).toBe(1_200_000);
    expect(eAB!.p90Ms).toBe(1_800_000);
    expect(eAB!.minMs).toBe(600_000);
    expect(eAB!.maxMs).toBe(1_800_000);
  });

  it('tracks unique resources and departments on edges', () => {
    expect(eAB!.uniqueResources).toBe(2); // r1, r2
    expect(eAB!.uniqueDepartments).toBe(2); // Fin, Legal
  });
});

