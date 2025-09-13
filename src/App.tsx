import { FlowCanvas } from '@/components/FlowCanvas';
import { ContextMenu } from '@/components/ContextMenu';
import { EdgeTooltip } from '@/components/EdgeTooltip';
import { LegendBar } from '@/components/LegendBar';
import { VariantsPanel } from '@/components/VariantsPanel';
import { HappyPathToggle } from '@/components/HappyPathToggle';
import { useFlowStore } from '@/state/store';
import { useEffect } from 'react';

export default function App() {
  const init = useFlowStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="h-full p-2">
      <div className="relative pane h-full rounded-md overflow-hidden">
        <FlowCanvas />
        <VariantsPanel />
        <HappyPathToggle />
      </div>
      {/* Portal-based context menu mounts once at app root */}
      <ContextMenu />
      <EdgeTooltip />
      <LegendBar />
    </div>
  );
}
