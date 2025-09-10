#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { spec: 'docs/permit_process_spec.v4.json', size: 'small', out: 'data/permit.small.events' };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--spec') opts.spec = args[++i];
    else if (a === '--size') opts.size = args[++i];
    else if (a === '--out') opts.out = args[++i];
  }
  return opts;
}

function choiceWeighted(items) {
  const total = items.reduce((s, it) => s + (it.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= (it.weight ?? 1);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

function sampleLogNormal(meanMins, sigmaMins) {
  // Simple positive sampler around a mean-ish value; not parameter-perfect LN.
  const mu = Math.log(Math.max(1, meanMins));
  const sigma = Math.log(1 + Math.max(1, sigmaMins) / Math.max(1, meanMins));
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  const x = Math.exp(mu + sigma * z);
  return Math.max(1, Math.round(x));
}

function sampleDuration(state) {
  const d = state.duration;
  if (!d) return 0;
  if (d.type === 'fixed') return d.mins | 0;
  if (d.type === 'lognormal') return sampleLogNormal(d.mu, d.sigma);
  if (d.type === 'choice') {
    // For delivery: 70% download (0), else postal between bounds
    const isDownload = Math.random() < 0.7;
    if (isDownload) return 0;
    const min = d.postal_min | 0;
    const max = d.postal_max | 0;
    return Math.floor(min + Math.random() * (max - min + 1));
  }
  return 0;
}

function resolveResource(state, ctx) {
  const pool = state.resource_pool || [];
  const filt = pool.filter((it) => {
    if (!it.when) return true;
    if (it.when.application_type && it.when.application_type !== ctx.application_type) return false;
    return true;
  });
  return (choiceWeighted(filt.length ? filt : pool).id) || 'system_auto';
}

function nowISO(ts) { return new Date(ts).toISOString(); }

function buildVariantPaths() {
  // From docs/permit_process_definition_v4.md variants
  return {
    happy_path: [
      'APP_SUBMIT','INITIAL_REVIEW','REQ_CHECK','HEALTH_INSPECTION','CARD_REQUEST','CARD_PRODUCTION','QUALITY_CHECK','NOTIFY_APPLICANT','PERMIT_DELIVERY'
    ],
    initial_incomplete_loop: [
      'APP_SUBMIT','INITIAL_REVIEW','INFO_REQUEST','APPLICANT_RESPONSE','REQ_CHECK','HEALTH_INSPECTION','CARD_REQUEST','CARD_PRODUCTION','QUALITY_CHECK','NOTIFY_APPLICANT','PERMIT_DELIVERY'
    ],
    req_issue_loop: [
      'APP_SUBMIT','INITIAL_REVIEW','REQ_CHECK','INFO_REQUEST','APPLICANT_RESPONSE','REQ_CHECK','HEALTH_INSPECTION','CARD_REQUEST','CARD_PRODUCTION','QUALITY_CHECK','NOTIFY_APPLICANT','PERMIT_DELIVERY'
    ],
    inspection_manager: [
      'APP_SUBMIT','INITIAL_REVIEW','REQ_CHECK','HEALTH_INSPECTION','MANAGER_APPROVAL','CARD_REQUEST','CARD_PRODUCTION','QUALITY_CHECK','NOTIFY_APPLICANT','PERMIT_DELIVERY'
    ],
    inspection_info_loop: [
      'APP_SUBMIT','INITIAL_REVIEW','REQ_CHECK','HEALTH_INSPECTION','INFO_REQUEST','APPLICANT_RESPONSE','HEALTH_INSPECTION','CARD_REQUEST','CARD_PRODUCTION','QUALITY_CHECK','NOTIFY_APPLICANT','PERMIT_DELIVERY'
    ],
    req_reject: [ 'APP_SUBMIT','INITIAL_REVIEW','REQ_CHECK','REJECTED' ],
    inspection_reject: [ 'APP_SUBMIT','INITIAL_REVIEW','REQ_CHECK','HEALTH_INSPECTION','REJECTED' ]
  };
}

async function main() {
  const opts = parseArgs();
  const spec = JSON.parse(fs.readFileSync(opts.spec, 'utf8'));
  const N = spec.arrivals.cases[opts.size] ?? 10;
  const outDir = path.dirname(opts.out);
  fs.mkdirSync(outDir, { recursive: true });

  // Build helpers
  const stateById = new Map(spec.states.map((s) => [s.id, s]));
  const variants = buildVariantPaths();
  const varWeights = Object.entries(spec.variants_target);
  const totalW = varWeights.reduce((s, [, w]) => s + w, 0);

  const pickVariant = () => {
    let r = Math.random() * totalW;
    for (const [k, w] of varWeights) {
      r -= w;
      if (r <= 0) return k;
    }
    return varWeights[varWeights.length - 1][0];
  };

  const onlineShareWeekday = spec.arrivals.channel_by_dow.online_share_weekday ?? 0.6;

  const jsonlPath = `${opts.out}.jsonl`;
  const ws = fs.createWriteStream(jsonlPath, { encoding: 'utf8' });

  let baseTs = Date.now();
  for (let i = 0; i < N; i++) {
    const caseId = `RP-${i + 1}`;
    // Alternate channels to ensure both appear
    const application_type = (i % 3 === 0) ? 'in_person' : 'online';
    let ts = baseTs + i * 3_600_000; // stagger starts by 1h
    const variant = pickVariant();
    const seq = variants[variant] || variants.happy_path;
    for (const act of seq) {
      const state = stateById.get(act);
      if (!state) continue;
      const resource = resolveResource(state, { application_type });
      // Emit event at current ts
      ws.write(JSON.stringify({ case_id: caseId, activity: act, timestamp: nowISO(ts), resource, application_type }) + '\n');
      // Advance time by sampled duration (minutes → ms)
      const mins = sampleDuration(state);
      ts += mins * 60_000;
      // Simple capacity effect for CARD_PRODUCTION: add 0–2 days jitter
      if (act === 'CARD_PRODUCTION') {
        ts += Math.floor(Math.random() * 2) * 24 * 60 * 60 * 1000;
      }
    }
  }
  ws.end();
  await new Promise((res) => ws.on('finish', res));

  // Gzip
  const gzPath = `${opts.out}.jsonl.gz`;
  await new Promise((res, rej) => pipeline(fs.createReadStream(jsonlPath), createGzip(), fs.createWriteStream(gzPath), (e) => e ? rej(e) : res()));
  console.log('Wrote', gzPath);
}

main().catch((e) => { console.error(e); process.exit(1); });
