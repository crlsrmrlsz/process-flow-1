#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseArgs() {
  const args = process.argv.slice(2);
  let inPath = 'data/permit.small.events.jsonl';
  let outDir = 'public/data';
  let name = 'permit.small';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--in') inPath = args[++i];
    else if (a === '--outdir') outDir = args[++i];
    else if (a === '--name') name = args[++i];
  }
  return { inPath, outDir, name };
}

function buildGraph(events) {
  const START = 'START';
  const nodesSet = new Set([START]);
  const edgesMap = new Map(); // key: source__target
  const adjacency = {};
  const reverse = {};
  for (const ev of events) nodesSet.add(ev.activity);
  // department/attributes removed in simplified model

  for (const [caseId, list] of Object.entries(groupBy(events, (e) => e.case_id))) {
    list.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    if (list.length > 0) {
      const first = list[0];
      const k0 = `${START}__${first.activity}`;
      let e0 = edgesMap.get(k0);
      if (!e0) {
        e0 = { id: k0, source: START, target: first.activity, count: 0, traversals: [], uniqueResources: 0 };
        e0._res = new Set();
        edgesMap.set(k0, e0);
      }
      e0.count++;
      e0.traversals.push({ caseId, startTs: first.timestamp, endTs: first.timestamp, durationMs: 0, resource: first.resource });
      e0._res.add(first.resource);
      (adjacency[START] ??= []).includes(first.activity) || adjacency[START].push(first.activity);
      (reverse[first.activity] ??= []).includes(START) || reverse[first.activity].push(START);
    }
    for (let i = 0; i < list.length - 1; i++) {
      const a = list[i], b = list[i + 1];
      const key = `${a.activity}__${b.activity}`;
      let e = edgesMap.get(key);
      if (!e) {
        e = { id: key, source: a.activity, target: b.activity, count: 0, traversals: [], uniqueResources: 0 };
        e._res = new Set();
        edgesMap.set(key, e);
      }
      e.count++;
      e.traversals.push({ caseId, startTs: a.timestamp, endTs: b.timestamp, durationMs: new Date(b.timestamp) - new Date(a.timestamp), resource: a.resource });
      e._res.add(a.resource);
      (adjacency[a.activity] ??= []).includes(b.activity) || adjacency[a.activity].push(b.activity);
      (reverse[b.activity] ??= []).includes(a.activity) || reverse[b.activity].push(a.activity);
    }
  }
  const nodes = Array.from(nodesSet).map((id) => ({ id, label: id }));
  const edges = Array.from(edgesMap.values()).map((e) => {
    const durs = e.traversals.map((t) => t.durationMs);
    durs.sort((a, b) => a - b);
    const mean = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : 0;
    const med = durs.length ? durs[Math.ceil(0.5 * durs.length) - 1] : 0;
    const p90 = durs.length ? durs[Math.ceil(0.9 * durs.length) - 1] : 0;
    const min = durs[0] || 0;
    const max = durs[durs.length - 1] || 0;
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      count: e.count,
      traversals: e.traversals, // keep for demo decouple on small sets
      meanMs: mean,
      medianMs: med,
      p90Ms: p90,
      minMs: min,
      maxMs: max,
      uniqueResources: e._res.size,
    };
  });
  return { nodes, edges, adjacency, reverse };
}

function groupBy(list, keyFn) {
  const m = {};
  for (const x of list) {
    const k = keyFn(x);
    (m[k] ??= []).push(x);
  }
  return m;
}

async function main() {
  const { inPath, outDir, name } = parseArgs();
  const jsonl = fs.readFileSync(inPath, 'utf8').split(/\n+/).filter(Boolean).map((line) => JSON.parse(line));
  const graph = buildGraph(jsonl);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${name}.graph.json`), JSON.stringify(graph));
  // Also emit a JSON array of normalized events for the app to load if needed
  const normEvents = jsonl.map((e) => ({
    caseId: e.case_id,
    activity: e.activity,
    timestamp: e.timestamp,
    resource: e.resource,
  }));
  fs.writeFileSync(path.join(outDir, `${name}.events.json`), JSON.stringify(normEvents));
  console.log('Wrote', path.join(outDir, `${name}.graph.json`));
}

main().catch((e) => { console.error(e); process.exit(1); });
