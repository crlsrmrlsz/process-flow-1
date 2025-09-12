import { create } from 'zustand';
import { sampleEvents } from '@/data/sampleEvents';
import { buildGraph, START_NODE_ID, bfsLayers } from '@/lib/graph';
import { computeLayout } from '@/lib/layout';
import { computeVisibleFromExpanded } from '@/lib/visible';
import type { EventLogEvent, Graph } from '@/types';
import { decoupleNodeLocalByPath, type DecoupleTarget, type DecoupleView } from '@/lib/decouple';
import { selectorFromPath } from '@/lib/attr';

type Selection = { type: 'node' | 'edge'; id: string } | null;
type CtxTarget = { type: 'node' | 'edge'; id: string };

type FlowState = {
  eventsLoaded: boolean;
  events: EventLogEvent[];
  graph: Graph | null;
  layout: Record<string, { x: number; y: number }>;
  expanded: Set<string>;
  selection: Selection;
  ctxMenu: { open: boolean; pos: { x: number; y: number } | null; target: CtxTarget | null };
  decouples: { label: string; path: string; target: CtxTarget }[];
  decoupleView: DecoupleView | null;
  hover: { x: number; y: number; text: string } | null;
  init: () => void;
  expandNode: (id: string) => void;
  collapseNode: (id: string) => void;
  expandAllFrom: (id: string) => void;
  resetExpanded: () => void;
  setSelection: (sel: Selection) => void;
  setNodePosition: (id: string, pos: { x: number; y: number }) => void;
  getVisible: () => { visibleEdges: Set<string>; visibleNodes: Set<string> };
  openCtxMenu: (target: CtxTarget, pos: { x: number; y: number }) => void;
  closeCtxMenu: () => void;
  decoupleByPath: (target: DecoupleTarget, path: string, label?: string) => void;
  clearLastDecouple: () => void;
  resetDecouples: () => void;
  resetDecouplesDownstream: (nodeId: string) => void;
  undoDecoupleByPathDownstream: (nodeId: string, path: string) => void;
  setHover: (pos: { x: number; y: number }, text: string) => void;
  clearHover: () => void;
};

export const useFlowStore = create<FlowState>((set, get) => ({
  eventsLoaded: false,
  events: [],
  graph: null,
  layout: {},
  expanded: new Set<string>(),
  selection: null,
  ctxMenu: { open: false, pos: null, target: null },
  decouples: [],
  decoupleView: null,
  hover: null,

  init: () => {
    (async () => {
      function normalizeEvents(raw: any[]): EventLogEvent[] {
        if (!Array.isArray(raw)) return [];
        // If already in correct shape (caseId present), pass through
        if (raw.length && 'caseId' in raw[0]) return raw as EventLogEvent[];
        return raw.map((e: any) => ({
          caseId: e.case_id ?? e.caseId,
          activity: e.activity,
          timestamp: e.timestamp,
          resource: e.resource,
        } as EventLogEvent));
      }

      function needsStartRebuild(g: Graph | null | undefined): boolean {
        if (!g) return true;
        const hasStartNode = g.nodes.some((n) => n.id === START_NODE_ID);
        const hasStartOut = Array.isArray((g as any).adjacency?.[START_NODE_ID]) && (g as any).adjacency[START_NODE_ID].length > 0;
        return !hasStartNode || !hasStartOut;
      }

      try {
        if (typeof window !== 'undefined' && 'fetch' in window) {
          const controller = new AbortController();
          const timer = window.setTimeout(() => controller.abort(), 1200);
          try {
            const [gRes, eRes] = await Promise.all([
              fetch('/data/permit.small.graph.json', { signal: controller.signal }).catch(() => null),
              fetch('/data/permit.small.events.json', { signal: controller.signal }).catch(() => null),
            ]);
            if (gRes && gRes.ok && eRes && eRes.ok) {
              const graphPre = (await gRes.json()) as Graph;
              const eventsRaw = (await eRes.json()) as any[];
              const events = normalizeEvents(eventsRaw);
              const graph = needsStartRebuild(graphPre) ? buildGraph(events) : graphPre;
              const layout = computeLayout(graph, [START_NODE_ID]);
              set({ events, graph, layout, eventsLoaded: true, expanded: new Set([START_NODE_ID]) });
              return;
            }
          } finally {
            window.clearTimeout(timer);
          }
        }
      } catch {}
      // Fallback to bundled sample
      const events = sampleEvents;
      const graph = buildGraph(events);
      const layout = computeLayout(graph, [START_NODE_ID]);
      set({ events, graph, layout, eventsLoaded: true, expanded: new Set([START_NODE_ID]) });
    })();
  },
  expandNode: (id) => set((state) => ({ expanded: new Set<string>([...state.expanded, id]) })),
  collapseNode: (id) => set((state) => {
    const { graph } = state;
    if (!graph) return {} as any;
    const dist = bfsLayers(graph, [id]);
    const next = new Set(state.expanded);
    for (const n of Object.keys(dist)) next.delete(n);
    return { expanded: next };
  }),
  expandAllFrom: (id) => set((state) => {
    const { graph } = state;
    if (!graph) return {} as any;
    const dist = bfsLayers(graph, [id]);
    const next = new Set(state.expanded);
    for (const n of Object.keys(dist)) next.add(n);
    return { expanded: next };
  }),
  resetExpanded: () => set({ expanded: new Set<string>() }),
  setSelection: (sel) => {
    set({ selection: sel });
  },
  setNodePosition: (id, pos) => {
    set((state) => ({ layout: { ...state.layout, [id]: pos } }));
  },
  getVisible: () => {
    const { graph, expanded } = get();
    if (!graph) return { visibleEdges: new Set(), visibleNodes: new Set() };
    const res = computeVisibleFromExpanded(graph, expanded);
    return { visibleEdges: res.visibleEdges, visibleNodes: res.visibleNodes };
  },
  openCtxMenu: (target, pos) => {
    set({ ctxMenu: { open: true, pos, target } });
  },
  closeCtxMenu: () => {
    set({ ctxMenu: { open: false, pos: null, target: null } });
  },
  decoupleByPath: (target, path, label) => {
    const { graph, events } = get();
    if (!graph) return;
    // prevent duplicate layer for same target+path
    const exists = get().decouples.some((l) => l.target.type === target.type && l.target.id === target.id && l.path === path);
    const next = exists ? get().decouples : [...get().decouples, { label: label ?? path, path, target }];
    let replaced = new Set<string>();
    const groupEdgesAll: any[] = [];
    for (const l of next) {
      const v = decoupleNodeLocalByPath(graph, events, l.target, l.path);
      v.groupEdges.forEach((ge) => groupEdgesAll.push(ge));
      v.replacedEdgeIds.forEach((id) => replaced.add(id));
    }
    set({ decouples: next, decoupleView: { groupEdges: groupEdgesAll as any, replacedEdgeIds: replaced } });
  },
  clearLastDecouple: () => {
    const { decouples, graph, events } = get();
    if (!graph) return;
    const next = decouples.slice(0, -1);
    if (next.length === 0) { set({ decouples: [], decoupleView: null }); return; }
    let replaced = new Set<string>();
    const groupEdgesAll: any[] = [];
    for (const l of next) {
      const v = decoupleNodeLocalByPath(graph, events, l.target, l.path);
      v.groupEdges.forEach((ge) => groupEdgesAll.push(ge));
      v.replacedEdgeIds.forEach((id) => replaced.add(id));
    }
    set({ decouples: next, decoupleView: { groupEdges: groupEdgesAll as any, replacedEdgeIds: replaced } });
  },
  resetDecouples: () => set({ decouples: [], decoupleView: null }),
  resetDecouplesDownstream: (nodeId) => {
    const { graph, events, decouples } = get();
    if (!graph || decouples.length === 0) return;
    const dist = bfsLayers(graph, [nodeId]);
    const isDown = (t: CtxTarget) => {
      if (t.type === 'node') return dist[t.id] != null;
      const [src] = t.id.split('__');
      return dist[src] != null;
    };
    const next = decouples.filter((l) => !isDown(l.target));
    if (next.length === 0) { set({ decouples: [], decoupleView: null }); return; }
    let replaced = new Set<string>();
    const groupEdgesAll: any[] = [];
    for (const l of next) {
      const v = decoupleNodeLocalByPath(graph, events, l.target, l.path);
      v.groupEdges.forEach((ge) => groupEdgesAll.push(ge));
      v.replacedEdgeIds.forEach((id) => replaced.add(id));
    }
    set({ decouples: next, decoupleView: { groupEdges: groupEdgesAll as any, replacedEdgeIds: replaced } });
  },
  undoDecoupleByPathDownstream: (nodeId, path) => {
    const { graph, events, decouples } = get();
    if (!graph || decouples.length === 0) return;
    const dist = bfsLayers(graph, [nodeId]);
    const isDown = (t: CtxTarget) => {
      if (t.type === 'node') return dist[t.id] != null;
      const [src] = t.id.split('__');
      return dist[src] != null;
    };
    const next = decouples.filter((l) => !(l.path === path && isDown(l.target)));
    if (next.length === 0) { set({ decouples: [], decoupleView: null }); return; }
    let replaced = new Set<string>();
    const groupEdgesAll: any[] = [];
    for (const l of next) {
      const v = decoupleNodeLocalByPath(graph, events, l.target, l.path);
      v.groupEdges.forEach((ge) => groupEdgesAll.push(ge));
      v.replacedEdgeIds.forEach((id) => replaced.add(id));
    }
    set({ decouples: next, decoupleView: { groupEdges: groupEdgesAll as any, replacedEdgeIds: replaced } });
  },
  setHover: (pos, text) => set({ hover: { ...pos, text } }),
  clearHover: () => set({ hover: null }),
}));
