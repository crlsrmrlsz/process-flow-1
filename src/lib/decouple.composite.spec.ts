import { describe, it, expect } from 'vitest';
import { decoupleNodeLocalByPath } from './decouple';
import type { EventLogEvent } from '@/types';

const base = new Date('2025-01-01T09:00:00Z').getTime();
const t = (m: number) => new Date(base + m * 60_000).toISOString();

const events: EventLogEvent[] = [
  { caseId: 'X', activity: 'A', timestamp: t(0) },
  { caseId: 'X', activity: 'B', timestamp: t(10), resource: 'p1' },
  { caseId: 'X', activity: 'C', timestamp: t(20), resource: 'p1' },
  { caseId: 'Y', activity: 'A', timestamp: t(0) },
  { caseId: 'Y', activity: 'B', timestamp: t(12), resource: 'p2' },
  { caseId: 'Y', activity: 'C', timestamp: t(24), resource: 'p2' },
];

describe('decoupleCompositeDownstream', () => {
  it('builds grouped edges by person for outgoing edges from a node', () => {
    const view = decoupleNodeLocalByPath(
      { nodes: [], edges: [], adjacency: {}, reverse: {} } as any,
      events,
      { type: 'node', id: 'B' },
      'resource',
    );
    const keys = new Set(view.groupEdges.map((e) => e.groupKey));
    expect(keys.has('p1')).toBe(true);
    expect(keys.has('p2')).toBe(true);
  });
});
