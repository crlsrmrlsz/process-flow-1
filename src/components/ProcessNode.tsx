import { memo, useCallback } from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';
import { useFlowStore } from '@/state/store';

export type ProcessNodeData = { label: string };

export const ProcessNode = memo(function ProcessNode({ id, data, selected }: NodeProps<ProcessNodeData>) {
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
        selected
          ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200 hover:bg-indigo-500/30 hover:border-indigo-300'
          : 'bg-zinc-700/50 border-zinc-500 text-zinc-100 hover:bg-zinc-600/60 hover:border-zinc-400'
      } hover:border-2`}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      {data.label}
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
});
