#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { def: 'docs/process.definition.json', out: 'data/permit.gen.events', cases: null, temperature: null, seed: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--def') opts.def = args[++i];
    else if (a === '--out') opts.out = args[++i];
    else if (a === '--cases') opts.cases = Number(args[++i]);
    else if (a === '--temperature') opts.temperature = Number(args[++i]);
    else if (a === '--seed') opts.seed = Number(args[++i]);
  }
  return opts;
}

function mulRand(n, sigma, rng) {
  // multiplicative noise: lognormal-ish around 1
  const z = rng();
  const k = Math.exp(sigma * z - (sigma * sigma) / 2);
  return n * k;
}

function normalRng(seed) {
  // simple LCG + Box-Muller
  let s = seed >>> 0;
  const lcg = () => ((s = (1664525 * s + 1013904223) >>> 0) / 0xffffffff);
  let spare = null;
  return () => {
    if (spare != null) { const v = spare; spare = null; return v; }
    let u = 0, v = 0, w = 0;
    do { u = 2 * lcg() - 1; v = 2 * lcg() - 1; w = u * u + v * v; } while (w === 0 || w >= 1);
    const c = Math.sqrt((-2 * Math.log(w)) / w);
    spare = v * c; return u * c;
  };
}

function pickWeighted(list, rng01) {
  const total = list.reduce((s, it) => s + (it.w ?? it.percent ?? it.share ?? 0), 0);
  let r = rng01() * total;
  for (const it of list) { r -= (it.w ?? it.percent ?? it.share ?? 0); if (r <= 0) return it; }
  return list[list.length - 1];
}

function minutesToMs(mins) { return Math.max(0, Math.round(mins * 60_000)); }

function main() {
  const opts = parseArgs();
  const def = JSON.parse(fs.readFileSync(opts.def, 'utf8'));
  const cases = opts.cases ?? def.data_generation.cases ?? 500;
  const temperature = opts.temperature ?? def.data_generation.temperature ?? 0.5;
  const seed = (opts.seed ?? def.data_generation.seed ?? 1234) | 0;
  const rngN = normalRng(seed);
  const rng01 = () => (rngN() + 3) / 6; // clip-ish to 0..1

  // Build maps
  const stateById = new Map(def.states.map((s) => [s.id, s]));
  const variants = def.variants.map((v) => ({ ...v, w: v.percent }));

  // Pre-check worker shares
  for (const s of def.states) {
    const sum = s.workers.reduce((a, w) => a + w.share, 0);
    if (Math.round(sum) !== 100) throw new Error(`Worker shares for ${s.id} sum to ${sum}`);
  }

  // Exceptional injection rates (scaled by temperature)
  const rateInfoExtra = (def.data_generation.exceptional_rates?.info_request_extra ?? 0) * (0.5 + temperature);
  const rateMgrExtra = (def.data_generation.exceptional_rates?.manager_approval_extra ?? 0) * (0.5 + temperature);

  const outDir = path.dirname(opts.out);
  fs.mkdirSync(outDir, { recursive: true });
  const jsonlPath = `${opts.out}.jsonl`;
  const ws = fs.createWriteStream(jsonlPath, { encoding: 'utf8' });

  // Start time base
  const t0 = Date.now();
  let caseCounter = 0;
  const pickVariant = () => pickWeighted(variants, () => Math.max(0, Math.min(1, rng01())));
  const pickWorker = (state) => pickWeighted(state.workers.map((w) => ({ ...w, w: w.share })), () => Math.max(0, Math.min(1, rng01())));

  while (caseCounter < cases) {
    const v = pickVariant();
    const caseId = `RP-${caseCounter + 1}`;
    let ts = t0 + caseCounter * 3_600_000; // stagger per case
    const pathStates = [...v.path];

    // optional extra info loop injection before HEALTH_INSPECTION
    if (pathStates.includes('HEALTH_INSPECTION') && Math.random() < rateInfoExtra) {
      const idx = pathStates.indexOf('HEALTH_INSPECTION');
      pathStates.splice(idx, 0, 'INFO_REQUEST', 'APPLICANT_RESPONSE', 'REQ_CHECK');
    }
    // optional manager approval insertion if not present
    if (pathStates.includes('HEALTH_INSPECTION') && !pathStates.includes('MANAGER_APPROVAL') && Math.random() < rateMgrExtra) {
      const idx = pathStates.indexOf('HEALTH_INSPECTION');
      const idxAfter = idx + 1;
      if (pathStates[idxAfter] === 'APPROVED') pathStates.splice(idxAfter, 0, 'MANAGER_APPROVAL');
    }

    // Emit events
    for (let i = 0; i < pathStates.length; i++) {
      const sid = pathStates[i];
      const s = stateById.get(sid);
      if (!s) throw new Error(`Unknown state ${sid}`);
      // pick worker and sample duration
      const wk = pickWorker(s);
      const baseMean = s.expected.mean_mins * (wk.speed_factor ?? 1);
      const baseStd = s.expected.std_mins * (1 + 0.5 * temperature);
      const dMins = Math.max(0, baseMean + rngN() * baseStd);
      const noisy = mulRand(dMins, (def.data_generation.noise?.time_sigma ?? 0.2) * (0.5 + temperature), rngN);
      // Emit current state event
      ws.write(JSON.stringify({ case_id: caseId, activity: sid, timestamp: new Date(ts).toISOString(), resource: wk.name }) + "\n");
      ts += minutesToMs(noisy);
    }
    caseCounter++;
  }

  ws.end();
  ws.on('finish', () => console.log('Wrote', jsonlPath));
}

main();

