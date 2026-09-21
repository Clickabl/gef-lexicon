#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(join(tmpdir(), 'gef-work-wiktextract-'));
try {
  const rows = [
    { word: 'leer', lang_code: 'es', pos: 'verb', forms: [{ form: 'lee' }, { form: 'leyendo' }], senses: [{ glosses: ['read'] }] },
    { word: 'lámpara', lang_code: 'es', pos: 'noun', forms: [{ form: 'lámparas' }], senses: [{ glosses: ['lamp'] }] },
    { word: 'rana', lang_code: 'es', pos: 'noun', forms: [{ form: 'ranas' }], senses: [{ glosses: ['frog'] }] },
    { word: 'read', lang_code: 'en', pos: 'verb', forms: [{ form: 'reads' }], senses: [{ glosses: ['read'] }] },
  ];
  const input = join(dir, 'source.jsonl.gz');
  writeFileSync(input, gzipSync(rows.map((row) => JSON.stringify(row)).join('\n') + '\n'));
  const tokens = join(dir, 'tokens.tsv');
  writeFileSync(tokens, [
    'anchor_id\tstart_char\tend_char\tsurface\tambiguity_status\tsense_id\tlexeme_id\tform_id\tanalysis_id\tconcept_id',
    'p1\t0\t3\tlee\tunresolved\t\t\t\t\t',
    'p1\t4\t11\tLÁMPARA\tunresolved\t\t\t\t\t',
    'p1\t12\t19\tmissing\tunresolved\t\t\t\t\t',
  ].join('\n') + '\n');
  const output = join(dir, 'subset.jsonl.gz');
  const report = join(dir, 'report.json');
  execFileSync(process.execPath, [join(root, 'scripts/extract-work-wiktextract-subset.mjs'),
    '--input', input, '--tokens', tokens, '--language', 'es', '--output', output, '--report', report], { cwd: root });
  const subset = gunzipSync(readFileSync(output), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(subset.map((row) => row.word), ['leer', 'lámpara']);
  assert.equal(subset[0].senses[0].glosses[0], 'read', 'full source row must survive');
  const summary = JSON.parse(readFileSync(report, 'utf8'));
  assert.equal(summary.scanned_records, 4);
  assert.equal(summary.retained_records, 2);
  assert.equal(summary.requested_surface_count, 3);
  assert.equal(summary.matched_surface_count, 2);
  assert.deepEqual(summary.unmatched_surfaces, ['missing']);
  assert.match(summary.note, /does not select a sense/u);
  console.log('✅ Work-scoped Wiktextract subset extraction verified.');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
