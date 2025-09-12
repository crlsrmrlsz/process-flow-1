import { FlowCanvas } from '@/components/FlowCanvas';
import { ContextMenu } from '@/components/ContextMenu';
import { EdgeTooltip } from '@/components/EdgeTooltip';
import { LegendBar } from '@/components/LegendBar';
import { useFlowStore } from '@/state/store';
import { useEffect } from 'react';

export default function App() {
  const init = useFlowStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="h-full p-2">
      <div className="pane h-full rounded-md overflow-hidden">
        <FlowCanvas />
      </div>
      {/* Portal-based context menu mounts once at app root */}
      <ContextMenu />
      <EdgeTooltip />
      <LegendBar />
    </div>
  );
}
