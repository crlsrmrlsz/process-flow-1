import { memo, useCallback } from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position, NodeToolbar } from 'reactflow';
import { useFlowStore } from '@/state/store';

export type ProcessNodeData = { label: string; title?: string; active?: boolean; terminalInfo?: string };

export const ProcessNode = memo(function ProcessNode({ id, data }: NodeProps<ProcessNodeData>) {
  const setSelection = useFlowStore((s) => s.setSelection);
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        setSelection({ type: 'node', id });
      }
    },
    [id, setSelection],
  );
  const isTerminal = Boolean(data?.terminalInfo);
  return (
    <div
      data-testid={`node-${id}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      title={data?.title || data?.label}
      className={`focus-ring rounded-lg px-3 py-1.5 text-sm shadow-sm border transition-colors ${
        isTerminal
          ? 'bg-zinc-100 border-zinc-200 text-zinc-600'
          : data?.active
          ? 'bg-blue-50 border-blue-300 text-blue-900 cursor-pointer'
          : 'bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 cursor-pointer'
      }`}
    >
      {/* Multiple hidden handles along top/bottom so parallel edges can anchor without overlapping */}
      {[-3, -2, -1, 0, 1, 2, 3].map((slot) => (
        <Handle
          key={`t${slot}`}
          id={`t${slot}`}
          type="target"
          position={Position.Top}
          style={{ opacity: 0, left: `${50 + slot * 10}%`, transform: 'translateX(-50%)' }}
        />
      ))}
      <div>{data.label}</div>
      {/* Terminal metrics outside the node via toolbar overlay */}
      {isTerminal && (
        <NodeToolbar position={Position.Bottom} isVisible className="pointer-events-none">
          <div className="px-2 py-0.5 rounded bg-white/95 border border-zinc-200 text-[11px] text-zinc-600 shadow">
            {data?.terminalInfo}
          </div>
        </NodeToolbar>
      )}
      {[-3, -2, -1, 0, 1, 2, 3].map((slot) => (
        <Handle
          key={`s${slot}`}
          id={`s${slot}`}
          type="source"
          position={Position.Bottom}
          style={{ opacity: 0, left: `${50 + slot * 10}%`, transform: 'translateX(-50%)' }}
        />
      ))}
    </div>
  );
});
