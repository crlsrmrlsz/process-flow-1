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
  const expanded = useFlowStore((s) => s.expanded);
  const setSelection = useFlowStore((s) => s.setSelection);
  const expandNode = useFlowStore((s) => s.expandNode);
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
        // Orient edges vertically: outgoing from bottom, incoming at top
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        // keep nodes non-animated to reduce noise
      }));
    const globalMax = Math.max(1, ...graph.edges.map((e) => e.count));
    const minW = 0.3; // thinnest possible while still visible
    const maxW = 3.0; // upper bound for very high counts
    const widthFor = (count: number) => {
      if (globalMax <= 1) return minW;
      const v = Math.log(count) / Math.log(globalMax); // 0..1
      return minW + v * (maxW - minW);
    };
    const meanDays = (ms?: number) => {
      if (!ms || ms <= 0) return '0d';
      const days = ms / (24 * 60 * 60 * 1000);
      return `${Math.round(days)}d`;
    };
    const labelBg = { fill: '#F9FAFB', fillOpacity: 0.95, stroke: '#E5E7EB', strokeWidth: 1 } as const; // light bg
    const labelText = { fill: '#111827', fontSize: 12 } as const; // dark text for contrast
    // Build base edges
    let baseEdges: Edge[] = graph.edges
      .filter((e) => visibleEdges.has(e.id))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'default',
        label: `(#${e.count}/${meanDays(e.meanMs)})`,
        labelShowBg: true,
        labelBgStyle: labelBg as any,
        labelStyle: labelText as any,
        style: { stroke: '#9ca3af', strokeWidth: widthFor(e.count) },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af' },
        selectable: true,
        interactionWidth: 24,
      }));

    // Overlay decoupled edges (person) replacing base edges only at decoupled nodes
    if (decoupleView) {
      const replaced = decoupleView.replacedEdgeIds;
      baseEdges = baseEdges.filter((e) => !replaced.has(e.id));
      const visibleGroups = decoupleView.groupEdges.filter((ge) => visibleEdges.has(`${ge.source}__${ge.target}`));
      // Offset labels for multiple groups on same base edge to avoid overlap
      const byBase = new Map<string, typeof visibleGroups>();
      for (const ge of visibleGroups) {
        const key = `${ge.source}__${ge.target}`;
        const arr = (byBase.get(key) || []) as any;
        arr.push(ge);
        byBase.set(key, arr);
      }
      const decoupledEdges: Edge[] = [];
      for (const [baseId, arr] of byBase.entries()) {
        const n = (arr as any[]).length;
        // center around 0, step 14px
        const step = 14;
        const start = -((n - 1) * step) / 2;
        (arr as any[]).forEach((ge: any, idx: number) => {
          const offsetY = start + idx * step;
          const mean = (ge as any).meanMs as number | undefined;
          const line1 = `(#${ge.count}/${meanDays(mean)})`;
          const line2 = `👤 ${ge.groupKey}`;
          decoupledEdges.push({
            id: ge.id,
            source: ge.source,
            target: ge.target,
            type: 'default',
            label: `${line1}\n${line2}`,
            labelStyle: { transform: `translateY(${offsetY}px)` },
            labelShowBg: true,
            labelBgStyle: labelBg as any,
            labelStyle: { ...(labelText as any), transform: `translateY(${offsetY}px)` },
            style: { stroke: '#9ca3af', strokeWidth: widthFor(ge.count) },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af' },
            selectable: true,
            interactionWidth: 24,
          });
        });
      }
      return { nodes, edges: [...baseEdges, ...decoupledEdges] };
    }
    const edges = baseEdges;
    return { nodes, edges };
  }, [graph, layout, getVisible, expanded, selection, decoupleView]);

  const onNodeClick = useCallback((_: unknown, n: Node) => { expandNode(n.id); setSelection({ type: 'node', id: n.id }); }, [expandNode, setSelection]);
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
  }, [graph, nodes.length, edges.length, fitView]);

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
        <Background color="#444" gap={24} />
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
