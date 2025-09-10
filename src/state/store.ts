import { create } from 'zustand';
import { sampleEvents } from '@/data/sampleEvents';
import { buildGraph, START_NODE_ID } from '@/lib/graph';
import { computeLayout } from '@/lib/layout';
import { computeVisible, maxDepth } from '@/lib/step';
import type { EventLogEvent, Graph } from '@/types';
import { decoupleByDepartmentDownstream, type DecoupleTarget, type DecoupleView } from '@/lib/decouple';

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
  decouple: { dim: 'department'; target: CtxTarget; view: DecoupleView } | null;
  init: () => void;
  setStep: (n: number) => void;
  nextStep: () => void;
  setSelection: (sel: Selection) => void;
  setNodePosition: (id: string, pos: { x: number; y: number }) => void;
  getVisible: () => { visibleEdges: Set<string>; visibleNodes: Set<string> };
  openCtxMenu: (target: CtxTarget, pos: { x: number; y: number }) => void;
  closeCtxMenu: () => void;
  decoupleByDepartment: (target: DecoupleTarget) => void;
  clearDecouple: () => void;
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
  decouple: null,

  init: () => {
    const events = sampleEvents;
    const graph = buildGraph(events);
    const layout = computeLayout(graph, [START_NODE_ID]);
    const m = maxDepth(graph);
    set({ events, graph, layout, eventsLoaded: true, maxStep: m, step: 0 });
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
    const view = decoupleByDepartmentDownstream(graph, events, target);
    set({ decouple: { dim: 'department', target, view } });
  },
  clearDecouple: () => set({ decouple: null }),
}));
