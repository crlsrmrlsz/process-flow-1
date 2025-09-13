import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { EventLogEvent } from '@/types';
import { useFlowStore } from './store';
import { buildGraph } from '@/lib/graph';

describe('decouple downstream actions', () => {
  beforeEach(() => {
    // Initialize store with sample graph
    const events: EventLogEvent[] = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'public/data/permit.prod.events.json'), 'utf8'),
    );
    const graph = buildGraph(events);
    useFlowStore.setState({ graph, events, decouples: [], decoupleView: null });
  });

  it('undoDecoupleByPathDownstream removes matching concept layers downstream of node', () => {
    const nodeId = 'INITIAL_REVIEW';
    // Apply a decouple by Person at the node
    useFlowStore.getState().decoupleByPath({ type: 'node', id: nodeId }, 'resource', 'Person');
    expect(useFlowStore.getState().decouples.length).toBe(1);
    useFlowStore.getState().undoDecoupleByPathDownstream(nodeId, 'resource');
    expect(useFlowStore.getState().decouples.length).toBe(0);
    expect(useFlowStore.getState().decoupleView).toBeNull();
  });

  it('resetDecouplesDownstream removes all downstream layers and preserves upstream', () => {
    // Create two layers: one at APP_SUBMIT (upstream), one at INITIAL_REVIEW (downstream of APP_SUBMIT)
    useFlowStore.getState().decoupleByPath({ type: 'node', id: 'APP_SUBMIT' }, 'resource', 'Person');
    useFlowStore.getState().decoupleByPath({ type: 'node', id: 'INITIAL_REVIEW' }, 'resource', 'Person');
    expect(useFlowStore.getState().decouples.length).toBe(2);
    // Reset from Intake Review: should remove the layer at/after Intake Review only
    useFlowStore.getState().resetDecouplesDownstream('INITIAL_REVIEW');
    const layers = useFlowStore.getState().decouples;
    expect(layers.length).toBe(1);
    expect(layers[0].target.id).toBe('APP_SUBMIT');
  });
});
