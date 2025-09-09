import { useMemo, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useFlowStore } from '@/state/store';
import { ProcessNode } from './ProcessNode';
import { SmoothEdge } from './SmoothEdge';
import { START_NODE_ID } from '@/lib/graph';

const nodeTypes = { process: ProcessNode } as const;
const edgeTypes = { smooth: SmoothEdge } as const;

function CanvasInner() {
  const graph = useFlowStore((s) => s.graph);
  const layout = useFlowStore((s) => s.layout);
  const getVisible = useFlowStore((s) => s.getVisible);
  const selection = useFlowStore((s) => s.selection);
  const setSelection = useFlowStore((s) => s.setSelection);
  const step = useFlowStore((s) => s.step);
  const { fitView } = useReactFlow();

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
    const edges: Edge[] = graph.edges
      .filter((e) => visibleEdges.has(e.id))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'default',
        label: String(e.count),
        style: { stroke: '#9ca3af', strokeWidth: 3 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af' },
        selectable: true,
        interactionWidth: 24,
      }));
    return { nodes, edges };
  }, [graph, layout, getVisible, step, selection]);

  const onNodeClick = useCallback((_: unknown, n: Node) => setSelection({ type: 'node', id: n.id }), [setSelection]);
  const onEdgeClick = useCallback((_: unknown, e: Edge) => setSelection({ type: 'edge', id: e.id }), [setSelection]);

  const selectedEdgeId = selection?.type === 'edge' ? selection.id : undefined;
  const selectedNodeId = selection?.type === 'node' ? selection.id : undefined;

  const rfNodes = useMemo(() => {
    return nodes.map((n) => ({ ...n, selected: n.id === selectedNodeId }));
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
        edgeTypes={edgeTypes}
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap pannable zoomable />
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
