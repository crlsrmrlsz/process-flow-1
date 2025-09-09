import { EventLogEvent, Graph, GraphEdge, GraphNode, Traversal } from '@/types';

export const START_NODE_ID = 'START';

function byTimestamp(a: EventLogEvent, b: EventLogEvent) {
  return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
}

export function buildGraph(events: EventLogEvent[]): Graph {
  // sort per case by timestamp
  const byCase: Record<string, EventLogEvent[]> = {};
  for (const e of events) {
    if (!byCase[e.caseId]) byCase[e.caseId] = [];
    byCase[e.caseId].push(e);
  }
  for (const k of Object.keys(byCase)) byCase[k].sort(byTimestamp);

  const nodeSet = new Set<string>();
  const edgesMap = new Map<string, GraphEdge>();
  const adjacency: Record<string, string[]> = {};
  const reverse: Record<string, string[]> = {};

  // add START node synthetic
  nodeSet.add(START_NODE_ID);

  const addEdge = (source: string, target: string, traversal?: Traversal) => {
    const id = `${source}__${target}`;
    let e = edgesMap.get(id);
    if (!e) {
      e = { id, source, target, count: 0, traversals: [] };
      edgesMap.set(id, e);
    }
    e.count++;
    if (traversal) e.traversals.push(traversal);
    adjacency[source] = adjacency[source] || [];
    reverse[target] = reverse[target] || [];
    if (!adjacency[source].includes(target)) adjacency[source].push(target);
    if (!reverse[target].includes(source)) reverse[target].push(source);
  };

  for (const [caseId, list] of Object.entries(byCase)) {
    if (list.length === 0) continue;
    // Edge from START to first activity
    const first = list[0];
    nodeSet.add(first.activity);
    addEdge(START_NODE_ID, first.activity, {
      caseId,
      startTs: first.timestamp,
      endTs: first.timestamp,
      durationMs: 0,
    });

    for (let i = 0; i < list.length - 1; i++) {
      const a = list[i];
      const b = list[i + 1];
      nodeSet.add(a.activity);
      nodeSet.add(b.activity);
      const t: Traversal = {
        caseId,
        startTs: a.timestamp,
        endTs: b.timestamp,
        durationMs:
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      };
      addEdge(a.activity, b.activity, t);
    }
  }

  const nodes: GraphNode[] = Array.from(nodeSet).map((id) => ({ id, label: id }));
  const edges: GraphEdge[] = Array.from(edgesMap.values());

  return { nodes, edges, adjacency, reverse };
}

export function bfsLayers(
  g: Graph,
  roots: string[] = [START_NODE_ID],
): Record<string, number> {
  const dist: Record<string, number> = {};
  const q: string[] = [];
  for (const r of roots) {
    dist[r] = 0;
    q.push(r);
  }
  while (q.length) {
    const u = q.shift()!;
    const neighbors = g.adjacency[u] || [];
    for (const v of neighbors) {
      if (dist[v] == null) {
        dist[v] = dist[u] + 1;
        q.push(v);
      }
    }
  }
  return dist;
}

