import { describe, it, expect } from 'vitest';
import { decoupleCompositeDownstream } from './decouple';
import type { EventLogEvent } from '@/types';

const base = new Date('2025-01-01T09:00:00Z').getTime();
const t = (m: number) => new Date(base + m * 60_000).toISOString();

const events: EventLogEvent[] = [
  { caseId: 'X', activity: 'A', timestamp: t(0), department: 'Fin' },
  { caseId: 'X', activity: 'B', timestamp: t(10), department: 'Fin', resource: 'p1' },
  { caseId: 'X', activity: 'C', timestamp: t(20), department: 'Fin', resource: 'p1' },
  { caseId: 'Y', activity: 'A', timestamp: t(0), department: 'Legal' },
  { caseId: 'Y', activity: 'B', timestamp: t(12), department: 'Legal', resource: 'p2' },
  { caseId: 'Y', activity: 'C', timestamp: t(24), department: 'Legal', resource: 'p2' },
];

describe('decoupleCompositeDownstream', () => {
  it('builds grouped edges with layered keys Dept then Person', () => {
    const view = decoupleCompositeDownstream(
      { nodes: [], edges: [], adjacency: {}, reverse: {} } as any,
      events,
      [
        { target: { type: 'node', id: 'A' }, selector: (e) => e.department, label: 'Dept' },
        { target: { type: 'node', id: 'B' }, selector: (e) => e.resource, label: 'Person' },
      ],
    );
    const keys = new Set(view.groupEdges.map((e) => e.groupKey));
    expect(keys.has('Dept: Fin | Person: p1')).toBe(true);
    expect(keys.has('Dept: Legal | Person: p2')).toBe(true);
  });
});

