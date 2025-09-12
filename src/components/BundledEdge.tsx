import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from 'reactflow';
import { useRef, useEffect } from 'react';
import { useFlowStore } from '@/state/store';

function cubicAt(t: number, p0: number, p1: number, p2: number, p3: number) {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

export function BundledEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style,
    markerEnd,
    label,
    data,
  } = props as EdgeProps & { data?: { idx?: number; count?: number } };

  const idx = data?.idx ?? 0;
  const count = data?.count ?? 1;
  const laneSep = 24; // horizontal separation per lane
  const lane = idx - (count - 1) / 2;
  const dx = lane * laneSep;
  const dy = Math.max(60, Math.abs(targetY - sourceY) * 0.25);
  const bend = useFlowStore((s) => s.edgeBends[props.id] || { dx: 0, dy: 0 });
  const setBend = useFlowStore((s) => s.setEdgeBend);
  const c1x = sourceX + dx + bend.dx;
  const c1y = sourceY + dy + bend.dy;
  const c2x = targetX + dx + bend.dx;
  const c2y = targetY - dy + bend.dy;
  const path = `M ${sourceX},${sourceY} C ${c1x},${c1y} ${c2x},${c2y} ${targetX},${targetY}`;

  // Label with light background for readability
  const labelBg = 'rgba(249, 250, 251, 0.95)'; // gray-50
  const labelBorder = '#E5E7EB'; // gray-200
  const labelText = '#111827'; // gray-900

  // Choose label position along the curve based on lane index
  const tSlotsByCount: Record<number, number[]> = {
    1: [0.50],
    2: [0.44, 0.56],
    3: [0.42, 0.50, 0.58],
    4: [0.40, 0.48, 0.56, 0.64],
    5: [0.38, 0.46, 0.54, 0.62, 0.70],
    6: [0.36, 0.44, 0.52, 0.60, 0.68, 0.76],
    7: [0.34, 0.42, 0.50, 0.58, 0.66, 0.74, 0.82],
  };
  const tList = tSlotsByCount[count] || tSlotsByCount[7]!;
  const clampedIdx = Math.max(0, Math.min(tList.length - 1, idx));
  const t = tList[clampedIdx];
  const baseLx = cubicAt(t, sourceX, c1x, c2x, targetX);
  const baseLy = cubicAt(t, sourceY, c1y, c2y, targetY) - 10; // lift above curve
  // Extra horizontal spread for labels to avoid overlap
  const labelSpread = 110;
  const lx = baseLx + lane * labelSpread;
  const ly = baseLy;

  // Drag handle for manual bend adjustment
  const startPos = useRef<{x:number;y:number;dx:number;dy:number}|null>(null);
  const onHandleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startPos.current = { x: e.clientX, y: e.clientY, dx: bend.dx || 0, dy: bend.dy || 0 };
    const onMove = (ev: MouseEvent) => {
      if (!startPos.current) return;
      const { x, y, dx, dy } = startPos.current;
      const ndx = dx + (ev.clientX - x) * 0.5; // damped sensitivity
      const ndy = dy + (ev.clientY - y) * 0.5;
      setBend(props.id, { dx: ndx, dy: ndy });
    };
    const onUp = () => {
      startPos.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            onMouseDown={onHandleMouseDown}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`,
              background: labelBg,
              color: labelText,
              border: `1px solid ${labelBorder}`,
              borderRadius: 6,
              padding: '0px 4px',
              fontSize: 8.5,
              lineHeight: 1.0,
              whiteSpace: 'pre',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              cursor: 'grab'
            }}
          >
            {String(label)}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
