import { useMemo } from 'react';
import { useFlowStore } from '@/state/store';

export function VariantsPanel() {
  const { variants, activeVariantId, setActiveVariant, events } = useFlowStore((s) => ({
    variants: s.variants,
    activeVariantId: s.activeVariantId,
    setActiveVariant: s.setActiveVariant,
    events: s.events,
  }));

  const top = useMemo(() => variants.slice(0, 10), [variants]);
  const totalCases = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) set.add(e.caseId);
    return set.size || 1;
  }, [events]);
  if (top.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute top-2 right-2 z-20">
      <div className="flex flex-col gap-1 rounded-md bg-white/95 border border-zinc-200 shadow px-2 py-1.5 min-w-[220px]">
        <div className="text-[11px] font-semibold text-zinc-700 px-1">Top Variants</div>
        <div className="flex flex-col gap-1">
          {top.map((v, i) => {
            const active = v.id === activeVariantId;
            return (
              <button
                key={v.id}
                className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-xs border transition-colors ${
                  active
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                    : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                }`}
                onClick={() => { if (!active) setActiveVariant(v.id); }}
                title={`${Math.round((v.count / totalCases) * 100)}% of cases`}
              >
                <span className="inline-flex items-center gap-2 truncate">
                  <span className={`inline-flex items-center justify-center h-4 w-4 rounded text-[10px] ${active ? 'bg-indigo-600 text-white' : 'bg-zinc-200 text-zinc-700'}`}>{i + 1}</span>
                  <span className="truncate max-w-[180px]">
                    {v.label} — {Math.round((v.count / totalCases) * 100)}% cases
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
