import { create } from 'zustand';
import { sampleEvents } from '@/data/sampleEvents';
import { buildGraph, START_NODE_ID, bfsLayers } from '@/lib/graph';
import { computeLayout } from '@/lib/layout';
import { computeVisible, maxDepth } from '@/lib/step';
import type { EventLogEvent, Graph } from '@/types';
import { decoupleCompositeDownstream, type DecoupleTarget, type DecoupleView } from '@/lib/decouple';
import { selectorFromPath } from '@/lib/attr';

type Selection = { type: 'node' | 'edge'; id: string } | null;
type CtxTarget = { type: 'node' | 'edge'; id: string };

type FlowState = {
  eventsLoaded: boolean;
  events: EventLogEvent[];
  graph: Graph | null;
  layout: Record<string, { x: number; y: number }>;
  step: number;
  maxStep: number;
  selection: Selection;
  ctxMenu: { open: boolean; pos: { x: number; y: number } | null; target: CtxTarget | null };
  decouples: { label: string; path: string; target: CtxTarget }[];
  decoupleView: DecoupleView | null;
  hover: { x: number; y: number; text: string } | null;
  init: () => void;
  setStep: (n: number) => void;
  nextStep: () => void;
  setSelection: (sel: Selection) => void;
  setNodePosition: (id: string, pos: { x: number; y: number }) => void;
  getVisible: () => { visibleEdges: Set<string>; visibleNodes: Set<string> };
  openCtxMenu: (target: CtxTarget, pos: { x: number; y: number }) => void;
  closeCtxMenu: () => void;
  decoupleByDepartment: (target: DecoupleTarget) => void;
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
  step: 0,
  maxStep: 0,
  selection: null,
  ctxMenu: { open: false, pos: null, target: null },
  decouples: [],
  decoupleView: null,
  hover: null,

  init: () => {
    (async () => {
      function activityDepartment(act: string | undefined): string | undefined {
        if (!act) return undefined;
        // Coarse mapping for demo datasets generated from spec
        if (act.startsWith('APP_SUBMIT') || act.startsWith('INITIAL_REVIEW')) return 'Intake';
        if (act.startsWith('REQ_CHECK')) return 'Requirements';
        if (act.startsWith('HEALTH_INSPECTION')) return 'Health';
        if (act.startsWith('MANAGER_APPROVAL')) return 'Management';
        if (act.startsWith('CARD_REQUEST') || act.startsWith('QUALITY_CHECK') || act.startsWith('NOTIFY_APPLICANT')) return 'System';
        if (act.startsWith('CARD_PRODUCTION')) return 'Production';
        if (act.startsWith('PERMIT_DELIVERY')) return 'Logistics';
        if (act.startsWith('INFO_REQUEST')) return 'System';
        if (act.startsWith('APPLICANT_RESPONSE')) return 'Applicant';
        if (act.startsWith('REJECTED')) return 'Decision';
        return undefined;
      }

      function normalizeEvents(raw: any[]): EventLogEvent[] {
        if (!Array.isArray(raw)) return [];
        // If already in correct shape (caseId present), pass through
        if (raw.length && 'caseId' in raw[0]) return raw as EventLogEvent[];
        return raw.map((e: any) => {
          const channelRaw: string | undefined = e.application_type;
          const channel = channelRaw === 'in_person' ? 'in-person' : channelRaw;
          const attributes = channel ? { channel } : undefined;
          const department = e.department ?? activityDepartment(e.activity);
          return {
            caseId: e.case_id ?? e.caseId,
            activity: e.activity,
            timestamp: e.timestamp,
            resource: e.resource,
            department,
            attributes,
            attrs: attributes,
          } as EventLogEvent;
        });
      }

      function needsStartRebuild(g: Graph | null | undefined): boolean {
        if (!g) return true;
        const hasStartNode = g.nodes.some((n) => n.id === START_NODE_ID);
        const hasStartOut = Array.isArray((g as any).adjacency?.[START_NODE_ID]) && (g as any).adjacency[START_NODE_ID].length > 0;
        return !hasStartNode || !hasStartOut;
      }

      try {
        if (typeof window !== 'undefined' && 'fetch' in window) {
          const [gRes, eRes] = await Promise.allSettled([
            fetch('/data/permit.small.graph.json'),
            fetch('/data/permit.small.events.json'),
          ]);
          if (gRes.status === 'fulfilled' && gRes.value.ok && eRes.status === 'fulfilled' && eRes.value.ok) {
            const graphPre = (await gRes.value.json()) as Graph;
            const eventsRaw = (await eRes.value.json()) as any[];
            const events = normalizeEvents(eventsRaw);
            const graph = needsStartRebuild(graphPre) ? buildGraph(events) : graphPre;
            const layout = computeLayout(graph, [START_NODE_ID]);
            const m = maxDepth(graph);
            set({ events, graph, layout, eventsLoaded: true, maxStep: m, step: 0 });
            return;
          }
        }
      } catch {}
      // Fallback to bundled sample
      const events = sampleEvents;
      const graph = buildGraph(events);
      const layout = computeLayout(graph, [START_NODE_ID]);
      const m = maxDepth(graph);
      set({ events, graph, layout, eventsLoaded: true, maxStep: m, step: 0 });
    })();
  },

  setStep: (n) => set({ step: n }),
  nextStep: () => {
    const { step, maxStep } = get();
    set({ step: Math.min(maxStep, step + 1) });
  },
  setSelection: (sel) => {
    set({ selection: sel });
  },
  setNodePosition: (id, pos) => {
    set((state) => ({ layout: { ...state.layout, [id]: pos } }));
  },
  getVisible: () => {
    const { graph, step } = get();
    if (!graph) return { visibleEdges: new Set(), visibleNodes: new Set() };
    return computeVisible(graph, { step });
  },
  openCtxMenu: (target, pos) => {
    set({ ctxMenu: { open: true, pos, target } });
  },
  closeCtxMenu: () => {
    set({ ctxMenu: { open: false, pos: null, target: null } });
  },
  decoupleByDepartment: (target) => {
    const { graph, events } = get();
    if (!graph) return;
    // prevent duplicate layer for same target+path
    const exists = get().decouples.some((l) => l.target.type === target.type && l.target.id === target.id && l.path === 'department');
    const next = exists ? get().decouples : [...get().decouples, { label: 'Department', path: 'department', target }];
    const view = decoupleCompositeDownstream(
      graph,
      events,
      next.map((l) => ({ target: l.target, selector: selectorFromPath(l.path), label: l.label })),
    );
    set({ decouples: next, decoupleView: view });
  },
  decoupleByPath: (target, path, label) => {
    const { graph, events } = get();
    if (!graph) return;
    // prevent duplicate layer for same target+path
    const exists = get().decouples.some((l) => l.target.type === target.type && l.target.id === target.id && l.path === path);
    const next = exists ? get().decouples : [...get().decouples, { label: label ?? path, path, target }];
    const view = decoupleCompositeDownstream(
      graph,
      events,
      next.map((l) => ({ target: l.target, selector: selectorFromPath(l.path), label: l.label })),
    );
    set({ decouples: next, decoupleView: view });
  },
  clearLastDecouple: () => {
    const { decouples, graph, events } = get();
    if (!graph) return;
    const next = decouples.slice(0, -1);
    const view = next.length
      ? decoupleCompositeDownstream(
          graph,
          events,
          next.map((l) => ({ target: l.target, selector: selectorFromPath(l.path), label: l.label })),
        )
      : null;
    set({ decouples: next, decoupleView: view });
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
    const view = next.length
      ? decoupleCompositeDownstream(
          graph,
          events,
          next.map((l) => ({ target: l.target, selector: selectorFromPath(l.path), label: l.label })),
        )
      : null;
    set({ decouples: next, decoupleView: view });
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
    const view = next.length
      ? decoupleCompositeDownstream(
          graph,
          events,
          next.map((l) => ({ target: l.target, selector: selectorFromPath(l.path), label: l.label })),
        )
      : null;
    set({ decouples: next, decoupleView: view });
  },
  setHover: (pos, text) => set({ hover: { ...pos, text } }),
  clearHover: () => set({ hover: null }),
}));
