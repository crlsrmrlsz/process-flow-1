export function LegendBar() {
  return (
    <div className="pointer-events-none fixed bottom-2 left-1/2 -translate-x-1/2 text-xs text-zinc-200">
      <div className="flex items-center gap-3 px-3 py-1.5 rounded-md bg-zinc-800/80 border border-zinc-700 shadow">
        <span>Thickness = #cases</span>
        <span>Color = mean duration</span>
        <div className="h-2 w-24 rounded" style={{
          background: 'linear-gradient(90deg, hsl(210 70% 60%) 0%, hsl(15 70% 50%) 100%)'
        }} />
      </div>
    </div>
  );
}

