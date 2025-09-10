import { create } from 'zustand';
import { sampleEvents } from '@/data/sampleEvents';
import { buildGraph, START_NODE_ID } from '@/lib/graph';
import { computeLayout } from '@/lib/layout';
import { computeVisible, maxDepth } from '@/lib/step';
import type { Graph } from '@/types';

type Selection = { type: 'node' | 'edge'; id: string } | null;
type CtxTarget = { type: 'node' | 'edge'; id: string };

type FlowState = {
  eventsLoaded: boolean;
  graph: Graph | null;
  layout: Record<string, { x: number; y: number }>;
  step: number;
  maxStep: number;
  selection: Selection;
  ctxMenu: { open: boolean; pos: { x: number; y: number } | null; target: CtxTarget | null };
  init: () => void;
  setStep: (n: number) => void;
  nextStep: () => void;
  setSelection: (sel: Selection) => void;
  setNodePosition: (id: string, pos: { x: number; y: number }) => void;
  getVisible: () => { visibleEdges: Set<string>; visibleNodes: Set<string> };
  openCtxMenu: (target: CtxTarget, pos: { x: number; y: number }) => void;
  closeCtxMenu: () => void;
};

export const useFlowStore = create<FlowState>((set, get) => ({
  eventsLoaded: false,
  graph: null,
  layout: {},
  step: 0,
  maxStep: 0,
  selection: null,
  ctxMenu: { open: false, pos: null, target: null },

  init: () => {
    const graph = buildGraph(sampleEvents);
    const layout = computeLayout(graph, [START_NODE_ID]);
    const m = maxDepth(graph);
    set({ graph, layout, eventsLoaded: true, maxStep: m, step: 0 });
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
}));
