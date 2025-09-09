import { memo, useMemo, useCallback, useState } from 'react';
import { EdgeProps, EdgeLabelRenderer, getBezierPath, BaseEdge } from 'reactflow';
import { motion } from 'framer-motion';
import { useFlowStore } from '@/state/store';

export const SmoothEdge = memo(function SmoothEdge({ id, selected, sourceX, sourceY, targetX, targetY, markerEnd, style, data }: EdgeProps) {
  const setSelection = useFlowStore((s) => s.setSelection);
  const [hovered, setHovered] = useState(false);

  // Use d3-shape to generate a smooth path between points
  const edgePath = useMemo(() => {
    const [p] = getBezierPath({ sourceX, sourceY, targetX, targetY });
    return p;
  }, [sourceX, sourceY, targetX, targetY]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGGElement>) => {
      if (e.key === 'Enter') setSelection({ type: 'edge', id });
    },
    [id, setSelection],
  );

  const stroke = selected ? '#a5b4fc' : hovered ? '#cbd5e1' : '#9ca3af';
  const strokeWidth = selected ? 4 : hovered ? 3.5 : 3;

  return (
    <g
      data-testid="edge"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="focus-ring cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...(style || {}), stroke: stroke, strokeWidth: strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' }}
      />
      <EdgeLabelRenderer>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%)`,
            left: `${(sourceX + targetX) / 2}px`,
            top: `${(sourceY + targetY) / 2}px`,
            pointerEvents: 'none',
          }}
          data-testid={`edge-label-${id}`}
          className={`px-1.5 py-0.5 rounded text-[10px] leading-none select-none shadow ${
            selected
              ? 'bg-indigo-500/30 text-indigo-200'
              : hovered
                ? 'bg-zinc-700/80 text-zinc-200'
                : 'bg-zinc-800/80 text-zinc-300'
          }`}
        >
          {typeof (data as any)?.count === 'number' ? (data as any).count : ''}
        </motion.div>
      </EdgeLabelRenderer>
    </g>
  );
});
