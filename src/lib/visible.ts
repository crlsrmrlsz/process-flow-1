import type { Graph, EdgeId, NodeId } from '@/types';

export type Stub = { id: EdgeId; source: NodeId; target: NodeId };

export type VisibleResult = {
  visibleNodes: Set<NodeId>;
  visibleEdges: Set<EdgeId>;
  stubs: Stub[];
  terminals: Set<NodeId>; // among currently visible nodes
};

/**
 * Compute visible nodes/edges from a set of expanded nodes.
 * - Expanded nodes contribute all their outgoing edges and adjacent targets.
 * - Non-expanded visible nodes contribute "stubs" for their hidden outgoing edges.
 * - Always includes START in visible nodes.
 */
export function computeVisibleFromExpanded(
  g: Graph,
  expanded: Set<NodeId>,
  alwaysVisibleRoots: Set<NodeId> = new Set(['START']),
): VisibleResult {
  const visibleNodes = new Set<NodeId>(alwaysVisibleRoots);
  const visibleEdges = new Set<EdgeId>();
  const stubs: Stub[] = [];

  // Precompute outgoing edges by source
  const outBySource = new Map<NodeId, { target: NodeId; id: EdgeId }[]>();
  for (const e of g.edges) {
    const list = outBySource.get(e.source) || [];
    list.push({ target: e.target, id: e.id });
    outBySource.set(e.source, list);
  }

  // 1) Include edges from expanded nodes and mark their targets visible
  for (const src of expanded) {
    const outs = outBySource.get(src) || [];
    if (outs.length === 0) visibleNodes.add(src); // terminal can be expanded too
    for (const { target, id } of outs) {
      visibleEdges.add(id);
      visibleNodes.add(src);
      visibleNodes.add(target);
    }
  }

  // 2) Add stubs for visible nodes that are not expanded but have hidden outgoing
  const candidates = new Set<NodeId>(visibleNodes);
  for (const src of candidates) {
    if (expanded.has(src)) continue; // already fully revealed
    const outs = outBySource.get(src) || [];
    for (const { target, id } of outs) {
      if (!visibleEdges.has(id)) {
        // Edge not yet revealed; draw a stub indicating expandability toward target
        stubs.push({ id, source: src, target });
      }
    }
  }

  // 3) Terminals among currently visible nodes: no outgoing edges in full graph
  const terminals = new Set<NodeId>();
  for (const n of visibleNodes) {
    const outs = outBySource.get(n) || [];
    if (outs.length === 0) terminals.add(n);
  }

  return { visibleNodes, visibleEdges, stubs, terminals };
}

