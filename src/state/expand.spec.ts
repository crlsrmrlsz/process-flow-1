import { describe, it, expect, beforeEach } from 'vitest';
import { useFlowStore } from './store';
import { buildGraph } from '@/lib/graph';
import { sampleEvents } from '@/data/sampleEvents';

describe('expanded visibility actions', () => {
  beforeEach(() => {
    const graph = buildGraph(sampleEvents);
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

