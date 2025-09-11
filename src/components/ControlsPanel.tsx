import { useFlowStore } from '@/state/store';

export function ControlsPanel() {
  const step = useFlowStore((s) => s.step);
  const maxStep = useFlowStore((s) => s.maxStep);
  const setStep = useFlowStore((s) => s.setStep);
  const nextStep = useFlowStore((s) => s.nextStep);
  const getVisible = useFlowStore((s) => s.getVisible);
  const visibleCount = getVisible().visibleEdges.size;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-zinc-300">Step</label>
        <div className="flex items-center gap-2 mt-2">
          <input
            aria-label="Step slider"
            type="range"
            min={0}
            max={maxStep}
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
            className="w-full accent-indigo-400"
          />
          <span className="text-sm tabular-nums w-12 text-right">{step}</span>
        </div>
        <div className="text-xs text-zinc-400 mt-1">Max: {maxStep}</div>
      </div>
      <div className="text-xs text-zinc-400">Transitions visible: <span data-testid="visible-edges-count" className="text-zinc-200">{visibleCount}</span></div>

      <div className="flex gap-2 items-center">
        <button
          className="px-3 py-1.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200"
          onClick={nextStep}
        >
          Next step
        </button>
      </div>
      <div className="mt-2 border border-zinc-700/60 rounded p-2 text-xs text-zinc-300 space-y-2">
        <div className="font-medium text-zinc-200">Legend</div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md px-2 py-[2px] bg-zinc-700/50 border border-zinc-500 text-zinc-100 text-[11px]">A</span>
          <span>State (node)</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="64" height="20" aria-hidden>
            <path d="M4,12 C20,4 44,4 60,12" fill="none" stroke="#94a3b8" strokeWidth="2"/>
            <circle cx="32" cy="8" r="8" fill="rgba(39,39,42,0.85)" />
            <text x="32" y="11" textAnchor="middle" fontSize="9" fill="#e5e7eb">12</text>
          </svg>
          <span>Transition (edge) • count label</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="64" height="14" aria-hidden>
            <defs>
              <linearGradient id="durRamp" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#60a5fa"/>
                <stop offset="100%" stopColor="#f59e0b"/>
              </linearGradient>
            </defs>
            <rect x="4" y="2" width="56" height="8" rx="4" fill="url(#durRamp)" stroke="#52525b"/>
          </svg>
          <span>Edge color: duration (short → long)</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="64" height="16" aria-hidden>
            <path d="M6,6 L58,6" stroke="#a1a1aa" strokeWidth="1"/>
            <path d="M6,12 L58,12" stroke="#a1a1aa" strokeWidth="4"/>
          </svg>
          <span>Edge width ≈ count (log)</span>
        </div>
        <div className="text-[11px] text-zinc-400">Hover highlights; select to see details →</div>
      </div>
    </div>
  );
}
