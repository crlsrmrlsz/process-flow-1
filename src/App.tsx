import { ControlsPanel } from '@/components/ControlsPanel';
import { DetailsPanel } from '@/components/DetailsPanel';
import { FlowCanvas } from '@/components/FlowCanvas';
import { ContextMenu } from '@/components/ContextMenu';
import { EdgeTooltip } from '@/components/EdgeTooltip';
import { useFlowStore } from '@/state/store';
import { useEffect } from 'react';

export default function App() {
  const init = useFlowStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="h-full grid grid-cols-12 gap-2 p-2">
      <aside className="pane col-span-3 lg:col-span-2 rounded-md p-3">
        <h1 className="text-lg font-semibold mb-3">Process Flow Explorer</h1>
        <ControlsPanel />
      </aside>
      <main className="pane col-span-6 lg:col-span-8 rounded-md overflow-hidden">
        <FlowCanvas />
      </main>
      <aside className="pane col-span-3 lg:col-span-2 rounded-md p-3">
        <DetailsPanel />
      </aside>
      {/* Portal-based context menu mounts once at app root */}
      <ContextMenu />
      <EdgeTooltip />
    </div>
  );
}
