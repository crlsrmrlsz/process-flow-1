import { EventLogEvent } from '@/types';

// A tiny synthetic event log with ~36 events across 6 activities and 6 cases.
// Timestamps are spaced to allow simple duration derivations.
// Activities: Start>A>B>C>Review>Done with some loops/skips.

const base = new Date('2025-01-01T09:00:00Z').getTime();
const t = (mins: number) => new Date(base + mins * 60_000).toISOString();

export const sampleEvents: EventLogEvent[] = [
  // Case 1
  { caseId: 'C1', activity: 'A', timestamp: t(0), resource: 'R1' },
  { caseId: 'C1', activity: 'B', timestamp: t(5), resource: 'R2' },
  { caseId: 'C1', activity: 'C', timestamp: t(13), resource: 'R2' },
  { caseId: 'C1', activity: 'Review', timestamp: t(25), resource: 'R3' },
  { caseId: 'C1', activity: 'Done', timestamp: t(40), resource: 'R4' },

  // Case 2
  { caseId: 'C2', activity: 'A', timestamp: t(2), resource: 'R1' },
  { caseId: 'C2', activity: 'B', timestamp: t(8), resource: 'R2' },
  { caseId: 'C2', activity: 'C', timestamp: t(14), resource: 'R1' },
  { caseId: 'C2', activity: 'Review', timestamp: t(26), resource: 'R3' },
  { caseId: 'C2', activity: 'Done', timestamp: t(41), resource: 'R4' },

  // Case 3 (loop back B->A)
  { caseId: 'C3', activity: 'A', timestamp: t(4), resource: 'R1' },
  { caseId: 'C3', activity: 'B', timestamp: t(10), resource: 'R2' },
  { caseId: 'C3', activity: 'A', timestamp: t(16), resource: 'R1' },
  { caseId: 'C3', activity: 'B', timestamp: t(21), resource: 'R2' },
  { caseId: 'C3', activity: 'C', timestamp: t(30), resource: 'R2' },
  { caseId: 'C3', activity: 'Review', timestamp: t(42), resource: 'R3' },

  // Case 4 (skip C)
  { caseId: 'C4', activity: 'A', timestamp: t(6), resource: 'R1' },
  { caseId: 'C4', activity: 'B', timestamp: t(12), resource: 'R2' },
  { caseId: 'C4', activity: 'Review', timestamp: t(20), resource: 'R3' },
  { caseId: 'C4', activity: 'Done', timestamp: t(29), resource: 'R4' },

  // Case 5 (fast path)
  { caseId: 'C5', activity: 'A', timestamp: t(1), resource: 'R1' },
  { caseId: 'C5', activity: 'B', timestamp: t(3), resource: 'R2' },
  { caseId: 'C5', activity: 'C', timestamp: t(6), resource: 'R2' },
  { caseId: 'C5', activity: 'Done', timestamp: t(12), resource: 'R4' },

  // Case 6 (long review)
  { caseId: 'C6', activity: 'A', timestamp: t(7), resource: 'R1' },
  { caseId: 'C6', activity: 'B', timestamp: t(18), resource: 'R2' },
  { caseId: 'C6', activity: 'C', timestamp: t(32), resource: 'R2' },
  { caseId: 'C6', activity: 'Review', timestamp: t(60), resource: 'R3' },
  { caseId: 'C6', activity: 'Done', timestamp: t(85), resource: 'R4' },
];

