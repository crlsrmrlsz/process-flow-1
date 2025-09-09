import { Graph, LayoutPositions } from '@/types';
import { bfsLayers } from './graph';

export function computeLayout(
  g: Graph,
  roots: string[],
  spacing = { x: 220, y: 140 },
): LayoutPositions {
  const dist = bfsLayers(g, roots);
  const layers: Record<number, string[]> = {};
  for (const n of g.nodes) {
    const d = dist[n.id] ?? Infinity;
    if (!Number.isFinite(d)) continue;
    layers[d] = layers[d] || [];
    layers[d].push(n.id);
  }
  const pos: LayoutPositions = {};
  const maxWidth = Object.values(layers).reduce(
    (m, arr) => Math.max(m, arr.length),
    1,
  );
  const centerOffset = (count: number) => ((maxWidth - count) * spacing.x) / 2;
  for (const [dStr, ids] of Object.entries(layers)) {
    ids.sort();
    const d = Number(dStr);
    const y = d * spacing.y + 60;
    const offsetX = centerOffset(ids.length);
    ids.forEach((id, i) => {
      pos[id] = { x: offsetX + i * spacing.x + 80, y };
    });
  }
  return pos;
}

