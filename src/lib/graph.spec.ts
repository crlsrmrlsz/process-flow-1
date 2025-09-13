import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { EventLogEvent } from '@/types';
import { buildGraph, START_NODE_ID } from './graph';

describe('buildGraph', () => {
  const events: EventLogEvent[] = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'public/data/permit.prod.events.json'), 'utf8'),
  );
  const g = buildGraph(events);

  it('includes START node and key permit activities', () => {
    const ids = new Set(g.nodes.map((n) => n.id));
    expect(ids.has(START_NODE_ID)).toBe(true);
    const expectedSome = ['APP_SUBMIT', 'INITIAL_REVIEW', 'REQ_CHECK', 'HEALTH_INSPECTION', 'APPROVED'];
    for (const act of expectedSome) {
      expect(ids.has(act)).toBe(true);
    }
  });

  it('builds edges with counts and traversals', () => {
    const e1 = g.edges.find((e) => e.source === 'APP_SUBMIT');
    expect(e1).toBeDefined();
    expect(e1!.count).toBeGreaterThan(0);
    expect(e1!.traversals.length).toBe(e1!.count);
  });

  it('connects START to first activities', () => {
    const e = g.edges.filter((e) => e.source === START_NODE_ID);
    expect(e.length).toBeGreaterThan(0);
  });
});
