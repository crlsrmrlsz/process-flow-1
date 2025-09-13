import { create } from 'zustand';
import { sampleEvents } from '@/data/sampleEvents';
import { buildGraph, START_NODE_ID, bfsLayers } from '@/lib/graph';
import { computeLayout } from '@/lib/layout';
import { computeVisibleFromExpanded } from '@/lib/visible';
import type { EventLogEvent, Graph } from '@/types';
import { decoupleNodeLocalByPath, type DecoupleTarget, type DecoupleView } from '@/lib/decouple';
import { mineTopTraces, type Variant } from '@/lib/traces';

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
  edgeBends: Record<string, { dx: number; dy: number }>;
  variants: Variant[];
  activeVariantId: string | null;
  expectedMins: Record<string, number>; // expected minutes per state id (fallback from observed graph)
  showHappyPath: boolean;
  happyPath: string[];
  init: () => void;
  expandNode: (id: string) => void;
  collapseNode: (id: string) => void;
  expandAllFrom: (id: string) => void;
  resetExpanded: () => void;
  setExpandedTo: (ids: string[]) => void;
  setSelection: (sel: Selection) => void;
  setNodePosition: (id: string, pos: { x: number; y: number }) => void;
  getVisible: () => { visibleEdges: Set<string>; visibleNodes: Set<string>; terminals: Set<string> };
  openCtxMenu: (target: CtxTarget, pos: { x: number; y: number }) => void;
  closeCtxMenu: () => void;
  decoupleByPath: (target: DecoupleTarget, path: string, label?: string) => void;
  clearLastDecouple: () => void;
  resetDecouples: () => void;
  resetDecouplesDownstream: (nodeId: string) => void;
  undoDecoupleByPathDownstream: (nodeId: string, path: string) => void;
  setHover: (pos: { x: number; y: number }, text: string) => void;
  clearHover: () => void;
  setEdgeBend: (edgeId: string, bend: { dx: number; dy: number }) => void;
  resetEdgeBend: (edgeId: string) => void;
  setActiveVariant: (id: string | null) => void;
  setShowHappyPath: (val: boolean) => void;
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
  edgeBends: {},
  variants: [],
  activeVariantId: null,
  expectedMins: {},
  showHappyPath: false,
  happyPath: [],

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

      const computeExpectedMins = (g: Graph): Record<string, number> => {
        const out: Record<string, number> = {};
        for (const n of g.nodes) {
          if (n.id === START_NODE_ID) continue;
          const outs = g.edges.filter((e) => e.source === n.id && (e.meanMs || 0) > 0).map((e) => e.meanMs || 0);
          if (outs.length === 0) { out[n.id] = 0; continue; }
          const sorted = outs.slice().sort((a, b) => a - b);
          const med = sorted[Math.ceil(0.5 * sorted.length) - 1] || 0;
          out[n.id] = med / 60000; // minutes
        }
        return out;
      };

      try {
        if (typeof window !== 'undefined' && 'fetch' in window) {
          const controller = new AbortController();
          const timer = window.setTimeout(() => controller.abort(), 1200);
          try {
            async function tryBase(base: string) {
              const [gRes, eRes] = await Promise.all([
                fetch(`/data/${base}.graph.json`, { signal: controller.signal }).catch(() => null),
                fetch(`/data/${base}.events.json`, { signal: controller.signal }).catch(() => null),
              ]);
              if (gRes && gRes.ok && eRes && eRes.ok) {
                return [await gRes.json(), await eRes.json()] as const;
              }
              return null;
            }
            const loaded = (await tryBase('permit.prod')) || (await tryBase('permit.small'));
            if (loaded) {
              const [graphPre, eventsRaw] = loaded as [Graph, any[]];
              const events = normalizeEvents(eventsRaw);
              const graph = needsStartRebuild(graphPre) ? buildGraph(events) : graphPre;
              const layout = computeLayout(graph, [START_NODE_ID]);
              const expectedMins = computeExpectedMins(graph);
              const variants = mineTopTraces(events, 6);
              set({ events, graph, layout, eventsLoaded: true, expanded: new Set([START_NODE_ID]), variants, expectedMins, happyPath: variants.length ? variants[0].path : [] });
              if (variants.length > 0) {
                get().setActiveVariant(variants[0].id);
              }
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
      const expectedMins = computeExpectedMins(graph);
      const variants = mineTopTraces(events, 6);
      set({ events, graph, layout, eventsLoaded: true, expanded: new Set([START_NODE_ID]), variants, expectedMins, happyPath: variants.length ? variants[0].path : [] });
      if (variants.length > 0) {
        get().setActiveVariant(variants[0].id);
      }
    })();
  },
  expandNode: (id) => set((state) => ({ expanded: new Set<string>([...state.expanded, id]), activeVariantId: null })),
  collapseNode: (id) => set((state) => {
    const { graph } = state;
    if (!graph) return {} as any;
    const dist = bfsLayers(graph, [id]);
    const next = new Set(state.expanded);
    for (const n of Object.keys(dist)) next.delete(n);
    return { expanded: next, activeVariantId: null };
  }),
  expandAllFrom: (id) => set((state) => {
    const { graph } = state;
    if (!graph) return {} as any;
    const dist = bfsLayers(graph, [id]);
    const next = new Set(state.expanded);
    for (const n of Object.keys(dist)) next.add(n);
    return { expanded: next, activeVariantId: null };
  }),
  resetExpanded: () => set({ expanded: new Set<string>() }),
  setExpandedTo: (ids) => set(() => ({ expanded: new Set<string>(ids) })),
  setSelection: (sel) => {
    set({ selection: sel });
  },
  setNodePosition: (id, pos) => {
    set((state) => ({ layout: { ...state.layout, [id]: pos } }));
  },
  getVisible: () => {
    const { graph, expanded, activeVariantId, variants } = get();
    if (!graph) return { visibleEdges: new Set(), visibleNodes: new Set(), terminals: new Set() };
    if (activeVariantId) {
      const v = variants.find((x) => x.id === activeVariantId);
      if (!v) return { visibleEdges: new Set(), visibleNodes: new Set(), terminals: new Set() };
      const visibleNodes = new Set<string>([START_NODE_ID, ...v.path]);
      const visibleEdges = new Set<string>();
      if (v.path.length > 0) {
        visibleEdges.add(`${START_NODE_ID}__${v.path[0]}`);
      }
      for (let i = 0; i < v.path.length - 1; i++) {
        visibleEdges.add(`${v.path[i]}__${v.path[i + 1]}`);
      }
      // terminals based on visible edges only
      const out = new Map<string, number>();
      for (const id of visibleEdges) {
        const [src] = id.split('__');
        out.set(src, (out.get(src) || 0) + 1);
      }
      const terminals = new Set<string>();
      for (const n of visibleNodes) {
        if ((out.get(n) || 0) === 0) terminals.add(n);
      }
      return { visibleEdges, visibleNodes, terminals };
    }
    const res = computeVisibleFromExpanded(graph, expanded);
    return { visibleEdges: res.visibleEdges, visibleNodes: res.visibleNodes, terminals: res.terminals };
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
    set({ activeVariantId: null });
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
    set({ activeVariantId: null });
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
    set({ activeVariantId: null });
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
    // Node-local semantics: remove only the layer at this node for the given path
    const { graph, events, decouples } = get();
    if (!graph || decouples.length === 0) return;
    set({ activeVariantId: null });
    const next = decouples.filter((l) => !(l.path === path && l.target.type === 'node' && l.target.id === nodeId));
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
  setEdgeBend: (edgeId, bend) => set((s) => ({ edgeBends: { ...s.edgeBends, [edgeId]: bend } })),
  resetEdgeBend: (edgeId) => set((s) => {
    const next = { ...s.edgeBends };
    delete next[edgeId];
    return { edgeBends: next } as any;
  }),
  setActiveVariant: (id) => {
    if (id == null) { set({ activeVariantId: null }); return; }
    const { variants } = get();
    const v = variants.find((x) => x.id === id);
    if (!v) { set({ activeVariantId: null }); return; }
    const expanded = new Set<string>([START_NODE_ID, ...v.path]);
    set({ expanded, activeVariantId: id, decouples: [], decoupleView: null });
  },
  setShowHappyPath: (val: boolean) => set({ showHappyPath: val }),
}));
