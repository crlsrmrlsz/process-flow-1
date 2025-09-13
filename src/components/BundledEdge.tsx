import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from 'reactflow';
import { useRef } from 'react';
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
  } = props as EdgeProps & { data?: { idx?: number; count?: number; isBase?: boolean } };

  const isBase = (props as any).data?.isBase === true;

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

  // Label aesthetics: plain text, subtle shadow; no boxes
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

  // Drag handle for manual bend adjustment (disabled for base edges)
  const startPos = useRef<{x:number;y:number;dx:number;dy:number}|null>(null);
  const onDragStart = (e: React.MouseEvent) => {
    if (isBase) return; // base edges are not draggable
    e.preventDefault();
    e.stopPropagation();
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

  // Midpoint handle position along the curve for dragging
  const th = 0.5;
  const hx = cubicAt(th, sourceX, c1x, c2x, targetX);
  const hy = cubicAt(th, sourceY, c1y, c2y, targetY);

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      {/* Draggable midpoint handle (decoupled only) */}
      {!isBase && (
        <EdgeLabelRenderer>
          <div
            title="Drag to bend"
            onMouseDown={onDragStart}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${hx}px, ${hy}px)`,
              width: 5,
              height: 5,
              borderRadius: 999,
              background: '#FFFFFF',
              border: `1px solid #E5E7EB`,
              boxShadow: '0 1px 1px rgba(0,0,0,0.10)',
              cursor: 'grab',
              zIndex: 5,
              pointerEvents: 'all',
              userSelect: 'none',
            }}
            className="nodrag nopan"
            data-testid="edge-bend-handle"
            data-edgeid={id}
            data-dx={bend.dx || 0}
            data-dy={bend.dy || 0}
          />
        </EdgeLabelRenderer>
      )}
      {label ? (
        <EdgeLabelRenderer>
          <div
            onMouseDown={onDragStart}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`,
              color: labelText,
              padding: '0px 2px',
              fontSize: 10,
              lineHeight: 1.0,
              whiteSpace: 'pre',
              textShadow: '0 1px 0 rgba(255,255,255,0.85)',
              cursor: isBase ? 'default' : 'grab',
              pointerEvents: 'all',
              userSelect: 'none',
            }}
            className="nodrag nopan"
          >
            {String(label)}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
