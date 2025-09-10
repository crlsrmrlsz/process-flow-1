import { createPortal } from 'react-dom';
import { useFlowStore } from '@/state/store';

export function EdgeTooltip() {
  const hover = useFlowStore((s) => s.hover);
  if (!hover) return null;
  return createPortal(
    <div
      className="fixed z-50 px-2 py-1 rounded text-xs bg-zinc-800/95 border border-zinc-600 text-zinc-100 shadow"
      style={{ left: hover.x + 12, top: hover.y + 12 }}
    >
      {hover.text}
    </div>,
    document.body,
  );
}

