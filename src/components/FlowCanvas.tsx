import { useMemo, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  Position,
  type NodeChange,
  type OnNodesChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useFlowStore } from '@/state/store';
import { ProcessNode } from './ProcessNode';
import { START_NODE_ID } from '@/lib/graph';

const nodeTypes = { process: ProcessNode } as const;

function CanvasInner() {
  const graph = useFlowStore((s) => s.graph);
  const layout = useFlowStore((s) => s.layout);
  const getVisible = useFlowStore((s) => s.getVisible);
  const selection = useFlowStore((s) => s.selection);
  const setSelection = useFlowStore((s) => s.setSelection);
  const step = useFlowStore((s) => s.step);
  const { fitView } = useReactFlow();
  const setNodePosition = useFlowStore((s) => s.setNodePosition);
  const openCtxMenu = useFlowStore((s) => s.openCtxMenu);
  const decoupleView = useFlowStore((s) => s.decoupleView);
  const setHover = useFlowStore((s) => s.setHover);
  const clearHover = useFlowStore((s) => s.clearHover);

  const { nodes, edges } = useMemo(() => {
    if (!graph) return { nodes: [] as Node[], edges: [] as Edge[] };
    const { visibleEdges, visibleNodes } = getVisible();
    const nodes: Node[] = graph.nodes
      .filter((n) => visibleNodes.has(n.id) || n.id === START_NODE_ID)
      .map((n) => ({
        id: n.id,
        type: 'process',
        position: layout[n.id] || { x: 0, y: 0 },
        data: { label: n.label },
        draggable: false,
        selectable: true,
        className: 'text-xs',
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        // keep nodes non-animated to reduce noise
      }));
    // Edge width based on throughput (log-scaled)
    const globalMax = Math.max(1, ...graph.edges.map((e) => e.count));
    const minW = 1.0; // more readable on dark
    const maxW = 4.0;
    const widthFor = (count: number) => {
      if (globalMax <= 1) return minW;
      const v = Math.log(count) / Math.log(globalMax); // 0..1
      return minW + v * (maxW - minW);
    };

    // Edge color based on mean duration (blue → orange). Stable across whole graph.
    const durationValues = graph.edges.map((e) => e.meanMs || 0).filter((n) => n > 0);
    const dMin = durationValues.length ? Math.min(...durationValues) : 0;
    const dMax = durationValues.length ? Math.max(...durationValues) : 1;
    const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const hex = (n: number) => n.toString(16).padStart(2, '0');
    const rgb = (r: number, g: number, b: number) => `#${hex(Math.round(r))}${hex(Math.round(g))}${hex(Math.round(b))}`;
    const colorFor = (mean?: number) => {
      if (!mean || dMax <= dMin) return '#9ca3af'; // zinc-400 fallback
      const t = clamp01((mean - dMin) / (dMax - dMin));
      // From blue-400 (96,165,250) to amber-500 (245,158,11)
      const r = lerp(96, 245, t);
      const g = lerp(165, 158, t);
      const b = lerp(250, 11, t);
      return rgb(r, g, b);
    };
    const edgeLabel = (text: string) => (
      <div className="px-1.5 py-[1px] rounded bg-zinc-800/85 border border-zinc-600 text-[11px] text-zinc-100 shadow-sm max-w-[200px] truncate">
        {text}
      </div>
    );
    // Build base edges
    let baseEdges: Edge[] = graph.edges
      .filter((e) => visibleEdges.has(e.id))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'default',
        label: edgeLabel(String(e.count)),
        style: { stroke: colorFor(e.meanMs), strokeWidth: widthFor(e.count) },
        markerEnd: { type: MarkerType.ArrowClosed, color: colorFor(e.meanMs) },
        selectable: true,
        interactionWidth: 24,
      }));

    // Overlay decoupled edges (department) replacing base edges downstream
    if (decoupleView) {
      const replaced = decoupleView.replacedEdgeIds;
      baseEdges = baseEdges.filter((e) => !replaced.has(e.id));
      const decoupledEdges: Edge[] = decoupleView.groupEdges
        .filter((ge) => visibleEdges.has(`${ge.source}__${ge.target}`))
        .map((ge) => ({
          id: ge.id,
          source: ge.source,
          target: ge.target,
          type: 'default',
          label: edgeLabel(`${String(ge.count)} (${ge.groupKey})`),
          style: { stroke: colorFor((ge as any).meanMs), strokeWidth: widthFor(ge.count) },
          markerEnd: { type: MarkerType.ArrowClosed, color: colorFor((ge as any).meanMs) },
          selectable: true,
          interactionWidth: 24,
        }));
      return { nodes, edges: [...baseEdges, ...decoupledEdges] };
    }
    const edges = baseEdges;
    return { nodes, edges };
  }, [graph, layout, getVisible, step, selection, decoupleView]);

  const onNodeClick = useCallback((_: unknown, n: Node) => setSelection({ type: 'node', id: n.id }), [setSelection]);
  const onEdgeClick = useCallback((_: unknown, e: Edge) => setSelection({ type: 'edge', id: e.id }), [setSelection]);
  const onNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
    changes.forEach((ch) => {
      if (ch.type === 'position' && ch.position) {
        setNodePosition(ch.id, ch.position);
      }
    });
  }, [setNodePosition]);

  const onNodeContextMenu = useCallback((e: React.MouseEvent, n: Node) => {
    e.preventDefault();
    openCtxMenu({ type: 'node', id: n.id }, { x: e.clientX, y: e.clientY });
  }, [openCtxMenu]);

  const onEdgeContextMenu = useCallback((e: React.MouseEvent, ed: Edge) => {
    e.preventDefault();
    openCtxMenu({ type: 'edge', id: ed.id }, { x: e.clientX, y: e.clientY });
  }, [openCtxMenu]);

  const formatMs = (ms: number | undefined) => {
    if (!ms || ms <= 0) return 'n/a';
    const mins = ms / 60000;
    if (mins < 60) return `${mins.toFixed(1)} min`;
    const hrs = mins / 60;
    return `${hrs.toFixed(1)} h`;
  };

  const onEdgeMouseEnter = useCallback((e: React.MouseEvent, ed: Edge) => {
    // Find stats for base or decoupled edge
    const edgeId = ed.id;
    let text = '';
    const srcId = (ed as any).source as string;
    const tgtId = (ed as any).target as string;
    if (graph) {
      const base = graph.edges.find((x) => x.id === edgeId);
      if (base) {
        text = `mean ${formatMs(base.meanMs)} • p90 ${formatMs(base.p90Ms)}`;
      } else if (decoupleView) {
        const d = decoupleView.groupEdges.find((ge) => ge.id === edgeId);
        if (d) {
          const durs = d.traversals.map((t: any) => t.durationMs).sort((a: number, b: number) => a - b);
          const mean = durs.length ? durs.reduce((a: number, b: number) => a + b, 0) / durs.length : 0;
          const p90 = durs.length ? durs[Math.ceil(0.9 * durs.length) - 1] : 0;
          text = `mean ${formatMs(mean)} • p90 ${formatMs(p90)}`;
        }
      }
    }
    setHover({ x: e.clientX, y: e.clientY }, text || `${srcId}→${tgtId}`);
  }, [graph, decoupleView, setHover]);

  const onEdgeMouseMove = useCallback((e: React.MouseEvent) => {
    setHover({ x: e.clientX, y: e.clientY }, useFlowStore.getState().hover?.text || '');
  }, [setHover]);

  const onEdgeMouseLeave = useCallback(() => {
    clearHover();
  }, [clearHover]);

  const selectedEdgeId = selection?.type === 'edge' ? selection.id : undefined;
  const selectedNodeId = selection?.type === 'node' ? selection.id : undefined;

  const rfNodes = useMemo(() => {
    return nodes.map((n) => ({ ...n, draggable: true, selected: n.id === selectedNodeId }));
  }, [nodes, selectedNodeId]);
  const rfEdges = useMemo(() => {
    return edges.map((e) => ({ ...e, selected: e.id === selectedEdgeId }));
  }, [edges, selectedEdgeId]);

  // Auto-fit on step changes to keep new elements in view
  useEffect(() => {
    if (!graph) return;
    // small timeout lets React Flow apply element changes before fitting
    const id = window.setTimeout(() => {
      try {
        fitView({ padding: 0.2, duration: 300 });
      } catch {}
    }, 0);
    return () => window.clearTimeout(id);
  }, [graph, step, fitView]);

  if (!graph) return <div className="h-full w-full" />;

  return (
    <div className="h-full w-full">
      <ReactFlow
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onNodesChange={onNodesChange}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseMove={onEdgeMouseMove}
        onEdgeMouseLeave={onEdgeMouseLeave}
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <Background color="#3f3f46" gap={28} />
      </ReactFlow>
    </div>
  );
}

export function FlowCanvas() {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <CanvasInner />
      </ReactFlowProvider>
    </div>
  );
}
