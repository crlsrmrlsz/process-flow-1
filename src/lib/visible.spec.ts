import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { EventLogEvent } from '@/types';
import { buildGraph, START_NODE_ID } from './graph';
import { computeVisibleFromExpanded } from './visible';

describe('computeVisibleFromExpanded', () => {
  const events: EventLogEvent[] = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'public/data/permit.prod.events.json'), 'utf8'),
  );
  const g = buildGraph(events);

  it('shows only START when nothing expanded; stubs indicate expandability from START', () => {
    const res = computeVisibleFromExpanded(g, new Set());
    expect(res.visibleEdges.size).toBe(0);
    expect(res.visibleNodes.has(START_NODE_ID)).toBe(true);
    // If START has outgoing edges in data, we should see stubs
    expect(res.stubs.length).toBeGreaterThan(0);
  });

  it('expanding START reveals its outgoing edges and neighbors', () => {
    const res = computeVisibleFromExpanded(g, new Set([START_NODE_ID]));
    expect(res.visibleEdges.size).toBeGreaterThan(0);
    // Some nodes beyond START should now be visible
    const hasNonStartNode = Array.from(res.visibleNodes).some((n) => n !== START_NODE_ID);
    expect(hasNonStartNode).toBe(true);
  });

  it('stubs appear on visible, non-expanded nodes that have hidden outgoing edges', () => {
    const res = computeVisibleFromExpanded(g, new Set([START_NODE_ID]));
    // After revealing first layer, at least one visible node should have further unseen neighbors → stubs > 0
    expect(res.stubs.length).toBeGreaterThan(0);
  });
});
