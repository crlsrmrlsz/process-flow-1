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
import { BundledEdge } from './BundledEdge';
import { START_NODE_ID } from '@/lib/graph';
import { friendlyName, truncateLabel } from '@/lib/friendly';

const nodeTypes = { process: ProcessNode } as const;
const edgeTypes = { bundled: BundledEdge } as const;

function CanvasInner() {
  const graph = useFlowStore((s) => s.graph);
  const layout = useFlowStore((s) => s.layout);
  const getVisible = useFlowStore((s) => s.getVisible);
  const selection = useFlowStore((s) => s.selection);
  const expanded = useFlowStore((s) => s.expanded);
  const events = useFlowStore((s) => s.events);
  const setSelection = useFlowStore((s) => s.setSelection);
  const expandNode = useFlowStore((s) => s.expandNode);
  const { fitView } = useReactFlow();
  const setNodePosition = useFlowStore((s) => s.setNodePosition);
  const openCtxMenu = useFlowStore((s) => s.openCtxMenu);
  const decoupleView = useFlowStore((s) => s.decoupleView);
  const activeVariantId = useFlowStore((s) => s.activeVariantId);
  const setHover = useFlowStore((s) => s.setHover);
  const clearHover = useFlowStore((s) => s.clearHover);
  const expectedMins = useFlowStore((s) => s.expectedMins);

  const showHappyPath = useFlowStore((s) => s.showHappyPath);
  const happyPath = useFlowStore((s) => s.happyPath);

  const { nodes, edges } = useMemo(() => {
    if (!graph) return { nodes: [] as Node[], edges: [] as Edge[] };
    const { visibleEdges, visibleNodes, terminals } = getVisible();

    // Compute terminal stats: per terminal node, count of cases reaching it and mean time-to-reach
    const termInfo: Record<string, { cases: number; meanMs: number }> = {};
    if (terminals.size > 0 && events.length > 0) {
      const by = new Map<string, { activity: string; timestamp: string }[]>();
      for (const e of events) {
        const arr = by.get(e.caseId) || [];
        arr.push({ activity: e.activity, timestamp: e.timestamp });
        by.set(e.caseId, arr);
      }
      for (const arr of by.values()) arr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      for (const arr of by.values()) {
        if (arr.length === 0) continue;
        const start = new Date(arr[0].timestamp).getTime();
        const seen = new Set<string>();
        for (const ev of arr) {
          if (!terminals.has(ev.activity) || seen.has(ev.activity)) continue;
          const dt = new Date(ev.timestamp).getTime() - start;
          const cur = termInfo[ev.activity] || { cases: 0, meanMs: 0 };
          const nextCases = cur.cases + 1;
          const nextMean = cur.meanMs + (dt - cur.meanMs) / nextCases;
          termInfo[ev.activity] = { cases: nextCases, meanMs: nextMean };
          seen.add(ev.activity);
        }
      }
    }
    // Build set of happy-path nodes when toggled
    const happySet: Set<string> = (() => {
      if (!showHappyPath || happyPath.length === 0) return new Set<string>();
      const s = new Set<string>([START_NODE_ID, ...happyPath]);
      return s;
    })();

    const nodes: Node[] = graph.nodes
      .filter((n) => visibleNodes.has(n.id) || n.id === START_NODE_ID)
      .map((n) => ({
        id: n.id,
        type: 'process',
        position: layout[n.id] || { x: 0, y: 0 },
        data: {
          label: truncateLabel(friendlyName(n.id)),
          title: friendlyName(n.id),
          active: selection?.type === 'node' && selection.id === n.id,
          happy: happySet.has(n.id),
          terminalInfo: terminals.has(n.id)
            ? (() => {
                const st = termInfo[n.id];
                if (!st || st.cases <= 0) return '0 cases';
                const fmt = (ms: number) => {
                  if (ms <= 0) return '0m';
                  const mins = ms / 60000;
                  if (mins < 60) return `${mins.toFixed(0)}m`;
                  const hrs = mins / 60;
                  if (hrs < 48) return `${hrs.toFixed(1)}h`;
                  const days = hrs / 24;
                  return `${days.toFixed(1)}d`;
                };
                return `${st.cases} cases • μ${fmt(st.meanMs)}`;
              })()
            : undefined,
        },
        draggable: false,
        selectable: false,
        className: 'text-xs',
        // Orient edges vertically: outgoing from bottom, incoming at top
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        // keep nodes non-animated to reduce noise
      }));
    // Systematic width mapping based on counts (visible scope)
    const minW = 1.0;
    const maxW = 5.0;
    const widthFor = (count: number, minC: number, maxC: number) => {
      if (maxC <= minC) return minW;
      const t = Math.sqrt((count - minC) / Math.max(1, maxC - minC));
      return minW + t * (maxW - minW);
    };
    // Five-category performance color mapping based on expected vs actual
    const perfColor = (actualMs?: number, expectedMin?: number) => {
      if (!actualMs || !expectedMin || expectedMin <= 0) return '#9ca3af';
      const r = actualMs / (expectedMin * 60_000);
      // Lighter palette for standard transitions so happy path stands out
      if (r <= 0.7) return '#34d399'; // much faster (green-400)
      if (r <= 0.9) return '#a7f3d0'; // faster (green-200)
      if (r < 1.1) return '#cbd5e1'; // normal (slate-300)
      if (r <= 1.4) return '#fcd34d'; // slower (amber-300)
      return '#f87171'; // much slower (red-400)
    };
    const meanDays = (ms?: number) => {
      if (!ms || ms <= 0) return '0d';
      const days = ms / (24 * 60 * 60 * 1000);
      return `${Math.round(days)}d`;
    };
    const labelText = { fill: '#111827', fontSize: 10 } as const; // dark text
    // Build base edges; colors/thickness computed after we know min/max counts in scope
    let baseEdgesRaw = graph.edges
      .filter((e) => visibleEdges.has(e.id))
      .map((e) => ({ e, id: e.id, source: e.source, target: e.target, label: `(#${e.count}/${meanDays(e.meanMs)})` }));

    // Happy path overlay edges (underlay: light gray, overlay: darker accent)
    const overlayUnderEdges: Edge[] = (() => {
      if (!showHappyPath || happyPath.length === 0) return [];
      const ids: string[] = [];
      if (happyPath.length > 0) ids.push(`${START_NODE_ID}__${happyPath[0]}`);
      for (let i = 0; i < happyPath.length - 1; i++) ids.push(`${happyPath[i]}__${happyPath[i + 1]}`);
      const set = new Set(ids);
      return Array.from(set).map((id) => {
        const [src, tgt] = id.split('__');
        return {
          id: `hpUnder:${id}`,
          source: src,
          target: tgt,
          type: 'bundled',
          data: { idx: 0, count: 1, isBase: true, isOverlay: true },
          style: { stroke: '#d1d5db', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#d1d5db', width: 9, height: 9, orient: 'auto' },
          interactionWidth: 0,
        } as Edge;
      });
    })();
    const overlayTopEdges: Edge[] = (() => {
      if (!showHappyPath || happyPath.length === 0) return [];
      const ids: string[] = [];
      if (happyPath.length > 0) ids.push(`${START_NODE_ID}__${happyPath[0]}`);
      for (let i = 0; i < happyPath.length - 1; i++) ids.push(`${happyPath[i]}__${happyPath[i + 1]}`);
      const set = new Set(ids);
      return Array.from(set).map((id) => {
        const [src, tgt] = id.split('__');
        return {
          id: `hpTop:${id}`,
          source: src,
          target: tgt,
          type: 'bundled',
          data: { idx: 0, count: 1, isBase: true, isOverlay: true },
          style: { stroke: '#374151', strokeWidth: 1.8, opacity: 0.95 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#374151', width: 8, height: 8, orient: 'auto' },
          interactionWidth: 0,
        } as Edge;
      });
    })();

    // Overlay decoupled edges (person) replacing base edges only at decoupled nodes
    if (decoupleView) {
      const replaced = decoupleView.replacedEdgeIds;
      baseEdgesRaw = baseEdgesRaw.filter((be) => !replaced.has(be.id));
      const visibleGroups = decoupleView.groupEdges.filter((ge) => visibleEdges.has(`${ge.source}__${ge.target}`));
      // Offset labels for multiple groups on same base edge to avoid overlap
      const byBase = new Map<string, typeof visibleGroups>();
      for (const ge of visibleGroups) {
        const key = `${ge.source}__${ge.target}`;
        const arr = (byBase.get(key) || []) as any;
        arr.push(ge);
        byBase.set(key, arr);
      }
      // Compute min/max count across both base and decoupled edges in scope
      const counts: number[] = [
        ...baseEdgesRaw.map((be: any) => be.e.count as number),
        ...visibleGroups.map((ge: any) => ge.count as number),
      ];
      const minC = counts.length ? Math.min(...counts) : 1;
      const maxC = counts.length ? Math.max(...counts) : 1;
      const decoupledEdges: Edge[] = [];
      for (const [, arr] of byBase.entries()) {
        const n = (arr as any[]).length;
        (arr as any[]).forEach((ge: any, idx: number) => {
          const mean = (ge as any).meanMs as number | undefined;
          const line1 = `(#${ge.count}/${meanDays(mean)})`;
          const line2 = `👤 ${ge.groupKey}`;
          const col = perfColor(mean, expectedMins[ge.source]);
          decoupledEdges.push({
            id: ge.id,
            source: ge.source,
            target: ge.target,
            type: 'bundled',
            label: `${line1}\n${line2}`,
            data: { idx, count: n },
            sourceHandle: 's0',
            targetHandle: 't0',
            style: { stroke: col, strokeWidth: widthFor(ge.count, minC, maxC) },
            markerEnd: { type: MarkerType.ArrowClosed, color: col, width: 11, height: 11, orient: 'auto' },
            interactionWidth: 24,
          });
        });
      }
      // Finalize base edges with styles
      const baseEdges: Edge[] = baseEdgesRaw.map((be) => {
        const col = perfColor(be.e.meanMs, expectedMins[be.source]);
        return {
          id: be.id,
          source: be.source,
          target: be.target,
          type: 'bundled',
          data: { idx: 0, count: 1, isBase: true },
          label: be.label,
          labelStyle: labelText as any,
          style: { stroke: col, strokeWidth: widthFor(be.e.count, minC, maxC) },
          markerEnd: { type: MarkerType.ArrowClosed, color: col, width: 11, height: 11, orient: 'auto' },
          interactionWidth: 24,
        } as Edge;
      });
      return { nodes, edges: [...overlayUnderEdges, ...baseEdges, ...decoupledEdges, ...overlayTopEdges] };
    }
    // No decouple overlay: compute min/max counts only on base edges
    const counts = baseEdgesRaw.map((be: any) => be.e.count as number);
    const minC = counts.length ? Math.min(...counts) : 1;
    const maxC = counts.length ? Math.max(...counts) : 1;
    const edges: Edge[] = [
      ...overlayUnderEdges,
      ...baseEdgesRaw.map((be) => {
      const col = perfColor(be.e.meanMs, expectedMins[be.source]);
      return {
        id: be.id,
        source: be.source,
        target: be.target,
        type: 'bundled',
        data: { idx: 0, count: 1, isBase: true },
        label: be.label,
        labelStyle: labelText as any,
        style: { stroke: col, strokeWidth: widthFor(be.e.count, minC, maxC) },
        markerEnd: { type: MarkerType.ArrowClosed, color: col, width: 11, height: 11, orient: 'auto' },
        interactionWidth: 24,
      } as Edge;
    }),
      ...overlayTopEdges,
    ];
    return { nodes, edges };
  }, [graph, layout, getVisible, expanded, selection, decoupleView, events.length, activeVariantId, expectedMins, showHappyPath, happyPath.join('|')]);

  const onNodeClick = useCallback((_: unknown, n: Node) => {
    expandNode(n.id);
    setSelection({ type: 'node', id: n.id });
    window.setTimeout(() => setSelection(null), 120);
  }, [expandNode, setSelection]);
  const onEdgeClick = useCallback((_: unknown, e: Edge) => {
    setSelection({ type: 'edge', id: e.id });
    window.setTimeout(() => setSelection(null), 120);
  }, [setSelection]);
  const onNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
    changes.forEach((ch) => {
      if (ch.type === 'position' && ch.position) {
        setNodePosition(ch.id, ch.position);
      }
    });
  }, [setNodePosition]);

  const onNodeContextMenu = useCallback((e: React.MouseEvent, n: Node) => {
    e.preventDefault();
    const { terminals } = useFlowStore.getState().getVisible();
    if (terminals.has(n.id)) return; // disable menu for terminal nodes
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

  const rfNodes = useMemo(() => nodes.map((n) => ({ ...n, draggable: true })), [nodes]);
  const rfEdges = useMemo(() => edges.map((e) => ({ ...e })), [edges]);

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

  // Keep diagram centered on window resize
  useEffect(() => {
    if (!graph) return;
    let timer: number | null = null;
    const onResize = () => {
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        try {
          fitView({ padding: 0.2, duration: 250 });
        } catch {}
        timer = null;
      }, 120);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (timer != null) window.clearTimeout(timer);
    };
  }, [graph, fitView]);

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
        elementsSelectable={false}
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
        <Background color="#e5e7eb" gap={24} />
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
