import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { EventLogEvent } from '@/types';
import { useFlowStore } from './store';
import { buildGraph } from '@/lib/graph';

describe('expanded visibility actions', () => {
  beforeEach(() => {
    const events: EventLogEvent[] = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'public/data/permit.prod.events.json'), 'utf8'),
    );
    const graph = buildGraph(events);
    useFlowStore.setState({ graph, expanded: new Set() });
  });

  it('expandNode adds node to expanded set', () => {
    useFlowStore.getState().expandNode('START');
    expect(useFlowStore.getState().expanded.has('START')).toBe(true);
  });

  it('collapseNode removes node from expanded set', () => {
    useFlowStore.setState({ expanded: new Set(['START', 'X']) });
    useFlowStore.getState().collapseNode('START');
    expect(useFlowStore.getState().expanded.has('START')).toBe(false);
    expect(useFlowStore.getState().expanded.has('X')).toBe(true);
  });

  it('resetExpanded clears all expanded nodes', () => {
    useFlowStore.setState({ expanded: new Set(['A', 'B']) });
    useFlowStore.getState().resetExpanded();
    expect(useFlowStore.getState().expanded.size).toBe(0);
  });
});
