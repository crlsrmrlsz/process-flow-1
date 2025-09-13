import type { EventLogEvent } from '@/types';
import { friendlyName, truncateLabel } from '@/lib/friendly';

export type Variant = {
  id: string;
  label: string;
  path: string[]; // ordered activity ids (excluding START)
  count: number; // number of cases that follow exactly this path
};

function byTimestamp(a: EventLogEvent, b: EventLogEvent) {
  return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
}

function pathKey(parts: string[]): string {
  return parts.join('|');
}

function dedupeConsecutive(list: string[]): string[] {
  if (list.length === 0) return list;
  const out: string[] = [list[0]];
  for (let i = 1; i < list.length; i++) {
    if (list[i] !== list[i - 1]) out.push(list[i]);
  }
  return out;
}

/**
 * Mine the most common complete paths (variants) from the event log.
 * Groups by caseId, sorts by timestamp, collapses consecutive duplicates,
 * then ranks unique paths by frequency.
 */
export function mineTopTraces(events: EventLogEvent[], topN = 6): Variant[] {
  if (!Array.isArray(events) || events.length === 0) return [];

  // Group events by case and order by time
  const byCase: Record<string, EventLogEvent[]> = {};
  for (const e of events) {
    if (!byCase[e.caseId]) byCase[e.caseId] = [];
    byCase[e.caseId].push(e);
  }
  for (const k of Object.keys(byCase)) byCase[k].sort(byTimestamp);

  // Count identical paths
  const counts = new Map<string, { path: string[]; count: number }>();
  for (const list of Object.values(byCase)) {
    const rawPath = list.map((e) => e.activity);
    const path = dedupeConsecutive(rawPath);
    const key = pathKey(path);
    const prev = counts.get(key);
    if (prev) prev.count += 1; else counts.set(key, { path, count: 1 });
  }

  // Rank by frequency desc, then lexicographically for stability
  const ranked = Array.from(counts.values())
    .sort((a, b) => (b.count - a.count) || pathKey(a.path).localeCompare(pathKey(b.path)));

  const top = ranked.slice(0, Math.max(0, topN));
  return top.map(({ path, count }) => {
    const id = pathKey(path);
    const labelFriendly = path.map((p) => friendlyName(p)).join(' → ');
    return {
      id,
      label: truncateLabel(labelFriendly, 120),
      path,
      count,
    } satisfies Variant;
  });
}

