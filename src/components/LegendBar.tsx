export function LegendBar() {
  const items = [
    { name: 'much faster', color: '#16a34a' },
    { name: 'faster', color: '#86efac' },
    { name: 'normal', color: '#9ca3af' },
    { name: 'slower', color: '#f59e0b' },
    { name: 'much slower', color: '#dc2626' },
  ];
  return (
    <div className="pointer-events-none fixed bottom-2 left-1/2 -translate-x-1/2 text-xs text-zinc-700">
      <div className="flex items-center gap-4 px-3 py-1.5 rounded-md bg-white/95 border border-zinc-200 shadow">
        <span>Thickness = #cases</span>
        <span>Performance:</span>
        {items.map((it) => (
          <span key={it.name} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded" style={{ background: it.color }} />
            <span>{it.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
