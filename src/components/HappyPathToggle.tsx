import { useFlowStore } from '@/state/store';

export function HappyPathToggle() {
  const { show, set } = useFlowStore((s) => ({ show: s.showHappyPath, set: s.setShowHappyPath }));
  return (
    <div className="pointer-events-auto absolute top-2 left-2 z-20">
      <label className="inline-flex items-center gap-2 text-xs bg-white/95 border border-zinc-200 rounded px-2 py-1 shadow">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => set(e.target.checked)}
        />
        <span className="text-zinc-700">Show happy path</span>
      </label>
    </div>
  );
}

