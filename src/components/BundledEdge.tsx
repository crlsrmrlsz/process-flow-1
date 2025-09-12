import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from 'reactflow';

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
  const spacing = 16; // horizontal separation at mid
  const midX = (sourceX + targetX) / 2 + (idx - (count - 1) / 2) * spacing;
  const midY = (sourceY + targetY) / 2;
  const path = `M ${sourceX},${sourceY} Q ${midX},${midY} ${targetX},${targetY}`;

  // Label with light background for readability
  const labelBg = 'rgba(249, 250, 251, 0.95)'; // gray-50
  const labelBorder = '#E5E7EB'; // gray-200
  const labelText = '#111827'; // gray-900

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${midX}px, ${midY - 12}px)`,
              background: labelBg,
              color: labelText,
              border: `1px solid ${labelBorder}`,
              borderRadius: 6,
              padding: '2px 6px',
              fontSize: 12,
              whiteSpace: 'pre',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
            }}
          >
            {String(label)}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

