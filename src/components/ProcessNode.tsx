import { memo, useCallback } from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';
import { useFlowStore } from '@/state/store';

export type ProcessNodeData = { label: string; active?: boolean };

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
  return (
    <div
      data-testid={`node-${id}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={`focus-ring rounded-md px-3 py-1.5 text-sm shadow-sm border transition-colors cursor-pointer ${
        data?.active
          ? 'bg-zinc-600/70 border-zinc-400 text-zinc-100'
          : 'bg-zinc-700/50 border-zinc-500 text-zinc-100 hover:bg-zinc-600/60 hover:border-zinc-400'
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
      {data.label}
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
