#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream';
import { createGzip } from 'node:zlib';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { size: 'small', out: 'data/permit', format: 'jsonl.gz' };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--size') opts.size = args[++i];
    else if (a === '--out') opts.out = args[++i];
    else if (a === '--format') opts.format = args[++i];
  }
  return opts;
}

function* genCase(caseId, baseTs, pattern) {
  let ts = baseTs;
  const step = (mins) => (ts += mins * 60_000);
  const push = (activity, resource) => ({ caseId, activity, timestamp: new Date(ts).toISOString(), resource });
  // Patterns assemble realistic flows
  if (pattern === 'straight') {
    yield push('Submit Application', 'u-intake-1');
    step(10); yield push('Intake Review', 'u-intake-2');
    step(10); yield push('Payment Due', 'u-fin-1');
    step(20); yield push('Payment Received', 'u-fin-1');
    step(10); yield push('Assign To Staff', 'u-proc-1');
    step(10); yield push('Initial Review', 'u-proc-1');
    step(60 * 4); yield push('Approved', 'u-proc-1');
  } else if (pattern === 'docs-twice-underpaid-rework-reject') {
    yield push('Submit Application', 'u-desk-1');
    step(10); yield push('Intake Review', 'u-intake-3');
    step(8); yield push('Docs Check', 'u-intake-3');
    step(7); yield push('Request More Docs', 'u-intake-3');
    step(25); yield push('Re-Upload Docs', 'applicant');
    step(20); yield push('Resubmission Review', 'u-intake-3');
    step(15); yield push('Request More Docs', 'u-intake-3');
    step(45); yield push('Re-Upload Docs', 'applicant');
    step(20); yield push('Payment Due', 'u-fin-2');
    step(10); yield push('Payment Underpaid', 'u-fin-2');
    step(30); yield push('Payment Corrected', 'u-fin-2');
    step(10); yield push('Assign To Staff', 'u-proc-2');
    step(10); yield push('Initial Review', 'u-proc-2');
    step(60); yield push('Rework', 'u-proc-2');
    step(60); yield push('Second Review', 'u-proc-2');
    step(20); yield push('Rejected', 'u-proc-2');
  } else if (pattern === 'late-legal-approve') {
    yield push('Submit Application', 'u-intake-1');
    step(10); yield push('Intake Review', 'u-intake-2');
    step(10); yield push('Payment Due', 'u-fin-1');
    step(165); yield push('Payment Late', 'u-fin-1');
    step(10); yield push('Payment Received', 'u-fin-1');
    step(10); yield push('Assign To Staff', 'u-proc-3');
    step(10); yield push('Initial Review', 'u-proc-3');
    step(60); yield push('Escalate to Legal', 'u-proc-3');
    step(40); yield push('Appeal Review', 'u-legal-1');
    step(30); yield push('Approved', 'u-legal-1');
  }
}

function genDataset(size) {
  const cases = [];
  let n;
  if (size === 'small') n = 3;
  else if (size === 'medium') n = 300;
  else if (size === 'large') n = 3000;
  else n = Number(size) || 3;
  const base = Date.now();
  for (let i = 0; i < n; i++) {
    const pattern = i % 3 === 0 ? 'straight' : i % 3 === 1 ? 'docs-twice-underpaid-rework-reject' : 'late-legal-approve';
    cases.push({ caseId: `PX-${i + 1}`, base: base + i * 1000 * 60, pattern });
  }
  return cases;
}

async function main() {
  const { size, out, format } = parseArgs();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const outfileBase = out;

  // JSONL stream
  const jsonlPath = `${outfileBase}.jsonl`;
  const ws = fs.createWriteStream(jsonlPath, { encoding: 'utf8' });
  const cases = genDataset(size);
  for (const c of cases) {
    for (const ev of genCase(c.caseId, c.base, c.pattern)) {
      ws.write(JSON.stringify(ev) + '\n');
    }
  }
  ws.end();
  await new Promise((res) => ws.on('finish', res));

  if (format.includes('gz')) {
    const gzPath = `${outfileBase}.jsonl.gz`;
    await new Promise((res, rej) => {
      pipeline(fs.createReadStream(jsonlPath), createGzip(), fs.createWriteStream(gzPath), (err) => (err ? rej(err) : res()));
    });
    console.log('Wrote', gzPath);
  } else {
    console.log('Wrote', jsonlPath);
  }

  if (format.includes('parquet')) {
    try {
      const parquet = await import('parquetjs-lite');
      const schema = new parquet.ParquetSchema({
        caseId: { type: 'UTF8' },
        activity: { type: 'UTF8' },
        timestamp: { type: 'UTF8' },
        resource: { type: 'UTF8', optional: true },
      });
      const pqPath = `${outfileBase}.parquet`;
      const writer = await parquet.ParquetWriter.openFile(schema, pqPath);
      const rl = fs.createReadStream(jsonlPath, 'utf8');
      let buffer = '';
      for await (const chunk of rl) {
        buffer += chunk;
        let idx;
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (!line.trim()) continue;
          await writer.appendRow(JSON.parse(line));
        }
      }
      await writer.close();
      console.log('Wrote', pqPath);
    } catch (err) {
      console.warn('Parquet output requested, but parquetjs-lite is not installed. Skipping parquet.');
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
