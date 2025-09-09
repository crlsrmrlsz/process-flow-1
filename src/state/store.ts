import { create } from 'zustand';
import { sampleEvents } from '@/data/sampleEvents';
import { buildGraph, START_NODE_ID } from '@/lib/graph';
import { computeLayout } from '@/lib/layout';
import { computeVisible, maxDepth } from '@/lib/step';
import type { Graph } from '@/types';

type Selection = { type: 'node' | 'edge'; id: string } | null;

type FlowState = {
  eventsLoaded: boolean;
  graph: Graph | null;
  layout: Record<string, { x: number; y: number }>;
  step: number;
  maxStep: number;
  selection: Selection;
  init: () => void;
  setStep: (n: number) => void;
  nextStep: () => void;
  setSelection: (sel: Selection) => void;
  getVisible: () => { visibleEdges: Set<string>; visibleNodes: Set<string> };
};

export const useFlowStore = create<FlowState>((set, get) => ({
  eventsLoaded: false,
  graph: null,
  layout: {},
  step: 0,
  maxStep: 0,
  selection: null,

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
  getVisible: () => {
    const { graph, step } = get();
    if (!graph) return { visibleEdges: new Set(), visibleNodes: new Set() };
    return computeVisible(graph, { step });
  },
}));
