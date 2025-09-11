import { describe, it, expect, beforeEach } from 'vitest';
import { useFlowStore } from './store';
import { sampleEvents } from '@/data/sampleEvents';
import { buildGraph } from '@/lib/graph';

describe('decouple downstream actions', () => {
  beforeEach(() => {
    // Initialize store with sample graph
    const graph = buildGraph(sampleEvents);
    const events = sampleEvents;
    useFlowStore.setState({ graph, events, decouples: [], decoupleView: null });
  });

  it('undoDecoupleByPathDownstream removes matching concept layers downstream of node', () => {
    const nodeId = 'Intake Review';
    // Apply a decouple by Person at the node
    useFlowStore.getState().decoupleByPath({ type: 'node', id: nodeId }, 'resource', 'Person');
    expect(useFlowStore.getState().decouples.length).toBe(1);
    useFlowStore.getState().undoDecoupleByPathDownstream(nodeId, 'resource');
    expect(useFlowStore.getState().decouples.length).toBe(0);
    expect(useFlowStore.getState().decoupleView).toBeNull();
  });

  it('resetDecouplesDownstream removes all downstream layers and preserves upstream', () => {
    // Create two layers: one at Submit Application (upstream), one at Initial Review (downstream of Submit)
    useFlowStore.getState().decoupleByPath({ type: 'node', id: 'Submit Application' }, 'resource', 'Person');
    useFlowStore.getState().decoupleByPath({ type: 'node', id: 'Intake Review' }, 'department', 'Department');
    expect(useFlowStore.getState().decouples.length).toBe(2);
    // Reset from Intake Review: should remove the layer at/after Intake Review only
    useFlowStore.getState().resetDecouplesDownstream('Intake Review');
    const layers = useFlowStore.getState().decouples;
    expect(layers.length).toBe(1);
    expect(layers[0].target.id).toBe('Submit Application');
  });
});

