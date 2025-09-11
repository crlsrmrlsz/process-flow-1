#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseArgs() {
  const args = process.argv.slice(2);
  let inPath = 'data/permit.small.events.jsonl';
  let outDir = 'public/data';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--in') inPath = args[++i];
    else if (a === '--outdir') outDir = args[++i];
  }
  return { inPath, outDir };
}

function buildGraph(events) {
  const START = 'START';
  const nodesSet = new Set([START]);
  const edgesMap = new Map(); // key: source__target
  const adjacency = {};
  const reverse = {};
  for (const ev of events) nodesSet.add(ev.activity);
  // helper: simple department by activity mapping for demo
  const deptOf = (act) => {
    if (!act) return undefined;
    if (act.startsWith('APP_SUBMIT') || act.startsWith('INITIAL_REVIEW')) return 'Intake';
    if (act.startsWith('REQ_CHECK')) return 'Requirements';
    if (act.startsWith('HEALTH_INSPECTION')) return 'Health';
    if (act.startsWith('MANAGER_APPROVAL')) return 'Management';
    if (act.startsWith('CARD_REQUEST') || act.startsWith('QUALITY_CHECK') || act.startsWith('NOTIFY_APPLICANT')) return 'System';
    if (act.startsWith('CARD_PRODUCTION')) return 'Production';
    if (act.startsWith('PERMIT_DELIVERY')) return 'Logistics';
    if (act.startsWith('INFO_REQUEST')) return 'System';
    if (act.startsWith('APPLICANT_RESPONSE')) return 'Applicant';
    if (act.startsWith('REJECTED')) return 'Decision';
    return undefined;
  };

  for (const [caseId, list] of Object.entries(groupBy(events, (e) => e.case_id))) {
    list.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    if (list.length > 0) {
      const first = list[0];
      const k0 = `${START}__${first.activity}`;
      let e0 = edgesMap.get(k0);
      if (!e0) {
        e0 = { id: k0, source: START, target: first.activity, count: 0, traversals: [], uniqueResources: 0 };
        e0._res = new Set();
        e0._dep = new Set();
        edgesMap.set(k0, e0);
      }
      e0.count++;
      e0.traversals.push({ caseId, startTs: first.timestamp, endTs: first.timestamp, durationMs: 0, resource: first.resource, department: deptOf(first.activity) });
      e0._res.add(first.resource);
      e0._dep.add(deptOf(first.activity));
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
        e._dep = new Set();
        edgesMap.set(key, e);
      }
      e.count++;
      e.traversals.push({ caseId, startTs: a.timestamp, endTs: b.timestamp, durationMs: new Date(b.timestamp) - new Date(a.timestamp), resource: a.resource, department: deptOf(a.activity) });
      e._res.add(a.resource);
      e._dep.add(deptOf(a.activity));
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
      uniqueDepartments: e._dep ? e._dep.size : 0,
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
  const { inPath, outDir } = parseArgs();
  const jsonl = fs.readFileSync(inPath, 'utf8').split(/\n+/).filter(Boolean).map((line) => JSON.parse(line));
  const graph = buildGraph(jsonl);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'permit.small.graph.json'), JSON.stringify(graph));
  // Also emit a JSON array of normalized events for the app to load if needed
  const normEvents = jsonl.map((e) => ({
    caseId: e.case_id,
    activity: e.activity,
    timestamp: e.timestamp,
    resource: e.resource,
    department: undefined,
    attributes: e.application_type ? { channel: e.application_type === 'in_person' ? 'in-person' : e.application_type } : undefined,
  }));
  fs.writeFileSync(path.join(outDir, 'permit.small.events.json'), JSON.stringify(normEvents));
  console.log('Wrote', path.join(outDir, 'permit.small.graph.json'));
}

main().catch((e) => { console.error(e); process.exit(1); });
