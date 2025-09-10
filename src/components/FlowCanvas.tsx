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
    const globalMax = Math.max(1, ...graph.edges.map((e) => e.count));
    const minW = 0.3; // thinnest possible while still visible
    const maxW = 3.0; // upper bound for very high counts
    const widthFor = (count: number) => {
      if (globalMax <= 1) return minW;
      const v = Math.log(count) / Math.log(globalMax); // 0..1
      return minW + v * (maxW - minW);
    };
    // Build base edges
    let baseEdges: Edge[] = graph.edges
      .filter((e) => visibleEdges.has(e.id))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'default',
        label: String(e.count),
        style: { stroke: '#9ca3af', strokeWidth: widthFor(e.count) },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af' },
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
          label: String(ge.count) + ` (${ge.groupKey})`,
          style: { stroke: '#9ca3af', strokeWidth: widthFor(ge.count) },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af' },
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
