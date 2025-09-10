import type { EventLogEvent, Graph, GraphEdge } from '@/types';
import { selectorFromPath } from '@/lib/attr';

export type GroupKey = string; // department or resource value

export type DecoupledEdge = GraphEdge & { groupKey: GroupKey };

export type DecoupleTarget = { type: 'node' | 'edge'; id: string };

export type DecoupleView = {
  groupEdges: DecoupledEdge[]; // edges partitioned by groupKey
  replacedEdgeIds: Set<string>; // underlying base edge ids replaced by groupEdges
};

function byCase(events: EventLogEvent[]): Map<string, EventLogEvent[]> {
  const m = new Map<string, EventLogEvent[]>();
  for (const e of events) {
    const arr = m.get(e.caseId) || [];
    arr.push(e);
    m.set(e.caseId, arr);
  }
  for (const [k, arr] of m) arr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return m;
}

export function decoupleByDepartmentDownstream(graph: Graph, events: EventLogEvent[], target: DecoupleTarget): DecoupleView {
  return decoupleDownstreamBySelector(graph, events, target, (e) => e.department || 'Unknown');
}

export function decoupleByResourceDownstream(graph: Graph, events: EventLogEvent[], target: DecoupleTarget): DecoupleView {
  return decoupleDownstreamBySelector(graph, events, target, (e) => e.resource || 'Unknown');
}

export function decoupleByPathDownstream(
  graph: Graph,
  events: EventLogEvent[],
  target: DecoupleTarget,
  path: string,
): DecoupleView {
  return decoupleDownstreamBySelector(graph, events, target, selectorFromPath(path));
}

export function decoupleDownstreamBySelector(
  graph: Graph,
  events: EventLogEvent[],
  target: DecoupleTarget,
  selector: (e: EventLogEvent) => string | undefined,
): DecoupleView {
  const cases = byCase(events);
  const groups = new Map<GroupKey, Map<string, DecoupledEdge>>();
  const replaced = new Set<string>();

  const pushEdge = (groupKey: GroupKey, source: string, target: string, durationMs: number, caseId: string, res?: string, dep?: string) => {
    const idBase = `${source}__${target}`;
    replaced.add(idBase);
    let bucket = groups.get(groupKey);
    if (!bucket) {
      bucket = new Map<string, DecoupledEdge>();
      groups.set(groupKey, bucket);
    }
    const id = `${groupKey}|${idBase}`;
    let e = bucket.get(id);
    if (!e) {
      e = { id, source, target, count: 0, traversals: [], groupKey } as DecoupledEdge;
      bucket.set(id, e);
    }
    e.count++;
    e.traversals.push({ caseId, startTs: '', endTs: '', durationMs, resource: res, department: dep });
  };

  const isEdgeTarget = target.type === 'edge';
  const edgeParts = isEdgeTarget ? target.id.split('__') : null;
  const edgeSrc = edgeParts?.[0];
  const edgeTgt = edgeParts?.[1];

  for (const [caseId, arr] of cases) {
    if (arr.length < 2) continue;
    if (target.type === 'node') {
      const idx = arr.findIndex((ev) => ev.activity === target.id);
      if (idx < 0) continue;
      const groupKey = selector(arr[idx]) || 'Unknown';
      for (let i = idx; i < arr.length - 1; i++) {
        const a = arr[i];
        const b = arr[i + 1];
        const dur = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        pushEdge(groupKey, a.activity, b.activity, dur, caseId, a.resource, a.department);
      }
    } else {
      // edge target: find any occurrence of (edgeSrc -> edgeTgt)
      for (let i = 0; i < arr.length - 1; i++) {
        const a = arr[i], b = arr[i + 1];
        if (a.activity === edgeSrc && b.activity === edgeTgt) {
          const groupKey = selector(a) || 'Unknown';
          for (let j = i; j < arr.length - 1; j++) {
            const x = arr[j], y = arr[j + 1];
            const dur = new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime();
            pushEdge(groupKey, x.activity, y.activity, dur, caseId, x.resource, x.department);
          }
          break;
        }
      }
    }
  }

  // finalize stats per group edge from traversals
  const groupEdges: DecoupledEdge[] = [];
  for (const bucket of groups.values()) {
    for (const e of bucket.values()) {
      const durs = e.traversals.map((t) => t.durationMs);
      if (durs.length) {
        const sorted = [...durs].sort((a, b) => a - b);
        const mean = durs.reduce((a, b) => a + b, 0) / durs.length;
        const med = sorted[Math.ceil(0.5 * sorted.length) - 1];
        const p90 = sorted[Math.ceil(0.9 * sorted.length) - 1];
        (e as any).meanMs = mean;
        (e as any).medianMs = med;
        (e as any).p90Ms = p90;
        (e as any).minMs = sorted[0];
        (e as any).maxMs = sorted[sorted.length - 1];
      }
    }
    groupEdges.push(...bucket.values());
  }

  return { groupEdges, replacedEdgeIds: replaced };
}

export type DecoupleLayer = { target: DecoupleTarget; selector: (e: EventLogEvent) => string | undefined; label: string };

// Composite downstream decouple: apply ordered layers; groupKey becomes a joined label:value chain.
export function decoupleCompositeDownstream(
  graph: Graph,
  events: EventLogEvent[],
  layers: DecoupleLayer[],
): DecoupleView {
  const cases = byCase(events);
  const groups = new Map<string, Map<string, DecoupledEdge>>();
  const replaced = new Set<string>();

  const pushEdge = (groupKey: string, source: string, target: string, durationMs: number, caseId: string, res?: string, dep?: string) => {
    const idBase = `${source}__${target}`;
    replaced.add(idBase);
    let bucket = groups.get(groupKey);
    if (!bucket) {
      bucket = new Map<string, DecoupledEdge>();
      groups.set(groupKey, bucket);
    }
    const id = `${groupKey}|${idBase}`;
    let e = bucket.get(id);
    if (!e) {
      e = { id, source, target, count: 0, traversals: [], groupKey } as DecoupledEdge;
      bucket.set(id, e);
    }
    e.count++;
    e.traversals.push({ caseId, startTs: '', endTs: '', durationMs, resource: res, department: dep });
  };

  for (const [caseId, arr] of cases) {
    if (arr.length < 2) continue;
    // For each layer, find pivot index and compute value when pivot is encountered downstream in order
    const layerStates: { idx: number; value?: string }[] = layers.map(() => ({ idx: -1 }));

    // Precompute for node targets – edge targets handled while walking
    for (let li = 0; li < layers.length; li++) {
      const L = layers[li];
      if (L.target.type === 'node') {
        const startIdx = li === 0 ? 0 : Math.max(0, layerStates[li - 1].idx);
        for (let i = startIdx; i < arr.length; i++) {
          if (arr[i].activity === L.target.id) {
            layerStates[li].idx = i;
            layerStates[li].value = L.selector(arr[i]) || 'Unknown';
            break;
          }
        }
      }
    }

    // Walk edges; update edge-target pivots on the fly and emit with current groupKey parts
    for (let i = 0; i < arr.length - 1; i++) {
      const a = arr[i], b = arr[i + 1];
      // Edge-target layers update when we step across matching edge
      for (let li = 0; li < layers.length; li++) {
        const L = layers[li];
        if (L.target.type === 'edge') {
          const [src, tgt] = L.target.id.split('__');
          if (a.activity === src && b.activity === tgt && (li === 0 || layerStates[li - 1].idx <= i)) {
            layerStates[li].idx = i + 1; // after this edge
            layerStates[li].value = L.selector(a) || 'Unknown';
          }
        }
      }
      const dur = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      // Build groupKey from all layers that have taken effect up to this point (idx set and <= i)
      const parts: string[] = [];
      for (let li = 0; li < layers.length; li++) {
        const st = layerStates[li];
        if (st.idx >= 0 && st.idx <= i) {
          parts.push(`${layers[li].label}: ${st.value ?? 'Unknown'}`);
        }
      }
      if (parts.length > 0) {
        pushEdge(parts.join(' | '), a.activity, b.activity, dur, caseId, a.resource, a.department);
      }
    }
  }

  const groupEdges: DecoupledEdge[] = [];
  for (const bucket of groups.values()) groupEdges.push(...bucket.values());
  return { groupEdges, replacedEdgeIds: replaced };
}
