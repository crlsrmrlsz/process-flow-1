import { useMemo } from 'react';
import { useFlowStore } from '@/state/store';

export function DetailsPanel() {
  const graph = useFlowStore((s) => s.graph);
  const selection = useFlowStore((s) => s.selection);

  const content = useMemo(() => {
    if (!graph || !selection) return null;
    if (selection.type === 'node') {
      const nodeId = selection.id;
      // collect visits per case and timestamps
      const visits: Record<string, string[]> = {};
      for (const e of graph.edges) {
        if (e.target === nodeId) {
          e.traversals.forEach((t) => {
            if (!visits[t.caseId]) visits[t.caseId] = [];
            visits[t.caseId].push(t.endTs);
          });
        }
      }
      const rows = Object.entries(visits)
        .map(([caseId, ts]: [string, string[]]) => ({ caseId, count: ts.length, latest: ts[ts.length - 1] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      return (
        <div>
          <h2 className="font-semibold mb-2">Node: {nodeId}</h2>
          {rows.length === 0 ? (
            <div className="text-sm text-zinc-400">No visits</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-zinc-400">
                <tr>
                  <th className="text-left font-medium py-1">Case</th>
                  <th className="text-right font-medium py-1">Visits</th>
                  <th className="text-right font-medium py-1">Latest</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.caseId} className="border-t border-zinc-700/50">
                    <td className="py-1">{r.caseId}</td>
                    <td className="py-1 text-right">{r.count}</td>
                    <td className="py-1 text-right tabular-nums">{new Date(r.latest).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      );
    } else if (selection.type === 'edge') {
      const edge = graph.edges.find((e) => e.id === selection.id);
      if (!edge) return null;
      const durations = edge.traversals.map((t) => t.durationMs).filter((n: number) => n >= 0);
      const count = edge.count;
      const min = durations.length ? Math.min(...durations) : 0;
      const avg = durations.length ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length : 0;
      const max = durations.length ? Math.max(...durations) : 0;
      return (
        <div>
          <h2 className="font-semibold mb-2">Edge: {edge.source} → {edge.target}</h2>
          <div className="text-sm text-zinc-300 mb-2">Count: {count}</div>
          <div className="text-sm text-zinc-300 mb-3">
            Duration (ms) — min {Math.round(min)}, avg {Math.round(avg)}, max {Math.round(max)}
          </div>
          <table className="w-full text-sm">
            <thead className="text-zinc-400">
              <tr>
                <th className="text-left font-medium py-1">Case</th>
                <th className="text-right font-medium py-1">Duration (ms)</th>
              </tr>
            </thead>
            <tbody>
              {edge.traversals.slice(0, 10).map((t, i) => (
                <tr key={i} className="border-t border-zinc-700/50">
                  <td className="py-1">{t.caseId}</td>
                  <td className="py-1 text-right tabular-nums">{Math.round(t.durationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return null;
  }, [graph, selection]);

  if (!graph) return <div className="text-sm text-zinc-400">Loading…</div>;

  return (
    <div>
      <h2 className="font-semibold mb-2">Details</h2>
      {content ?? <div className="text-sm text-zinc-400">Select a node or edge</div>}
    </div>
  );
}
