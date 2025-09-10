import { describe, it, expect } from 'vitest';
import { decoupleByDepartmentDownstream } from './decouple';
import { buildGraph } from './graph';
import type { EventLogEvent } from '@/types';

const base = new Date('2025-01-01T09:00:00Z').getTime();
const t = (m: number) => new Date(base + m * 60_000).toISOString();

// Two departments branching after A; ensure downstream propagation
const events: EventLogEvent[] = [
  { caseId: 'C1', activity: 'A', timestamp: t(0), department: 'Fin' },
  { caseId: 'C1', activity: 'B', timestamp: t(10), department: 'Fin' },
  { caseId: 'C1', activity: 'C', timestamp: t(20), department: 'Fin' },
  { caseId: 'C2', activity: 'A', timestamp: t(0), department: 'Legal' },
  { caseId: 'C2', activity: 'D', timestamp: t(15), department: 'Legal' },
  { caseId: 'C2', activity: 'C', timestamp: t(30), department: 'Legal' },
];

describe('decoupleByDepartmentDownstream', () => {
  const g = buildGraph(events);
  it('splits edges into department groups and replaces base downstream edges', () => {
    const view = decoupleByDepartmentDownstream(g, events, { type: 'node', id: 'A' });
    const labels = new Set(view.groupEdges.map((e) => e.groupKey));
    expect(labels.has('Fin')).toBe(true);
    expect(labels.has('Legal')).toBe(true);
    // Should produce grouped edges including A->B and A->D and downstream to C
    const ids = new Set(view.groupEdges.map((e) => `${e.source}__${e.target}`));
    expect(ids.has('A__B')).toBe(true);
    expect(ids.has('A__D')).toBe(true);
    expect(ids.has('B__C') || ids.has('D__C')).toBe(true);
    // Base edges downstream from A should be marked replaced
    expect(view.replacedEdgeIds.has('A__B') || view.replacedEdgeIds.has('A__D')).toBe(true);
  });
});

