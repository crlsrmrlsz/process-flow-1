import type { EventLogEvent } from '@/types';

export type Variant = {
  id: string;
  label: string;
  count: number;
  path: string[]; // sequence of activities from first to last (no START)
};

// Mine top-N most frequent full-case paths.
export function mineTopTraces(events: EventLogEvent[], topN: number = 6): Variant[] {
  const by = new Map<string, EventLogEvent[]>();
  for (const e of events) {
    const arr = by.get(e.caseId) || [];
    arr.push(e);
    by.set(e.caseId, arr);
  }
  for (const arr of by.values()) arr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const counts = new Map<string, { count: number; path: string[] }>();
  for (const arr of by.values()) {
    if (arr.length === 0) continue;
    const path = arr.map((e) => e.activity);
    const key = path.join('>');
    const cur = counts.get(key) || { count: 0, path };
    cur.count += 1;
    counts.set(key, cur);
  }

  const variants: Variant[] = Array.from(counts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, Math.max(1, topN))
    .map(([key, v], i) => ({
      id: `var-${i}-${key.slice(0, 80)}`,
      label: v.path.join(' → '),
      count: v.count,
      path: v.path,
    }));
  return variants;
}

