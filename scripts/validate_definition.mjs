#!/usr/bin/env node
import fs from 'node:fs';

function fail(msg) {
  console.error(`[definition:invalid] ${msg}`);
  process.exit(1);
}

function main() {
  const path = process.argv[2] || 'docs/process.definition.json';
  if (!fs.existsSync(path)) fail(`File not found: ${path}`);
  const def = JSON.parse(fs.readFileSync(path, 'utf8'));

  // Presence checks
  if (!def.process || !def.states || !def.transitions || !def.variants) {
    fail('Missing one of: process, states, transitions, variants');
  }

  // Unique state ids
  const ids = new Set();
  for (const s of def.states) {
    if (!s.id) fail('State missing id');
    if (ids.has(s.id)) fail(`Duplicate state id: ${s.id}`);
    ids.add(s.id);
    if (!Array.isArray(s.workers) || s.workers.length === 0) fail(`State ${s.id} must have workers`);
    const share = s.workers.reduce((a, w) => a + (w.share ?? 0), 0);
    if (Math.round(share) !== 100) fail(`State ${s.id} workers share sum != 100 (got ${share})`);
  }

  // Transitions refer to existing states
  for (const t of def.transitions) {
    if (!ids.has(t.from) || !ids.has(t.to)) fail(`Transition refers to unknown state: ${t.from} -> ${t.to}`);
  }

  // Variants sum to 100 and paths exist
  const vSum = def.variants.reduce((a, v) => a + (v.percent ?? 0), 0);
  if (Math.round(vSum) !== 100) fail(`Variants percent sum != 100 (got ${vSum})`);
  for (const v of def.variants) {
    for (const sid of v.path) {
      if (!ids.has(sid)) fail(`Variant ${v.id} path contains unknown state: ${sid}`);
    }
  }

  // Happy path exists
  for (const sid of def.happy_path || []) {
    if (!ids.has(sid)) fail(`Happy path contains unknown state: ${sid}`);
  }

  console.log('[definition:ok] valid');
}

main();

