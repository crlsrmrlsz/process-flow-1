import { Graph } from '@/types';
import { START_NODE_ID, bfsLayers } from './graph';

export type StepFilterOptions = {
  step: number; // 0..N
};

export function computeVisible(
  g: Graph,
  { step }: StepFilterOptions,
) {
  const roots = [START_NODE_ID];
  const dist = bfsLayers(g, roots);
  const visibleEdges = new Set<string>();
  const visibleNodes = new Set<string>(roots);

  for (const e of g.edges) {
    const dSrc = dist[e.source];
    const dTgt = dist[e.target];
    if (dSrc == null || dTgt == null) continue;
    // include edge if it is within the step frontier
    if (dTgt <= step) {
      visibleEdges.add(e.id);
      visibleNodes.add(e.source);
      visibleNodes.add(e.target);
    }
  }

  return { visibleEdges, visibleNodes };
}

export function maxDepth(g: Graph) {
  const d = bfsLayers(g, [START_NODE_ID]);
  return Object.values(d).reduce((m, x) => (x > m ? x : m), 0);
}
