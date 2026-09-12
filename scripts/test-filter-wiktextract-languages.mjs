import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { filterFile } from './filter-wiktextract-languages.mjs';

function fixture(t, text) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gef-language-filter-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const files = {
    input: path.join(root, 'input.gz'), registry: path.join(root, 'registry.json'),
    output: path.join(root, 'output.gz'), reportPath: path.join(root, 'report.json'), progress: false,
  };
  fs.writeFileSync(files.input, gzipSync(text));
  fs.writeFileSync(files.registry, JSON.stringify({ programs: { learnFromLanguages: ['en', 'es', 'fil'] } }));
  return files;
}

test('retains whole supported records, excludes nonmatching tags, derives counts and reports missing languages', async t => {
  const rows = [
    { lang_code: 'en', word: 'one', senses: [{ glosses: ['a definition'], quotes: ['source'] }] },
    { lang_code: 'la', word: 'unus' }, { lang_code: 'es', word: 'español' },
    { lang_code: 'tl', word: 'wika' },
  ];
  const text = rows.map(row => JSON.stringify(row)).join('\n');
  const files = fixture(t, text);
  const original = fs.readFileSync(files.input);
  const result = await filterFile(files);
  assert.equal(result.inputRecords, 4);
  assert.equal(result.keptRecords, 2);
  assert.equal(result.removedRecords, 2);
  assert.deepEqual(result.missingLanguages, ['fil']);
  assert.deepEqual(result.excludedLanguages, ['la', 'tl']);
  assert.equal(gunzipSync(fs.readFileSync(files.output)).toString(), `${JSON.stringify(rows[0])}\n${JSON.stringify(rows[2])}\n`);
  assert.deepEqual(fs.readFileSync(files.input), original);
  assert.match(result.output.sha256, /^[a-f0-9]{64}$/);
});

test('malformed JSON never produces a successful subset or destroys source', async t => {
  const files = fixture(t, '{"lang_code":"en"}\nnot json\n');
  await assert.rejects(filterFile(files));
  assert.equal(fs.existsSync(files.output), false);
  assert.equal(fs.existsSync(`${files.output}.part`), false);
  assert.equal(fs.existsSync(files.input), true);
});

test('explicit source groups retain data without rewriting language identity or expanding product support', async t => {
  const files = fixture(t, '{"lang_code":"tl","word":"wika"}\n');
  const result = await filterFile({ ...files, sourceMappings: [{ sourceCode: 'tl', targetLanguages: ['fil'] }] });
  assert.deepEqual(result.matchedLanguages, ['fil']);
  assert.deepEqual(result.matchedSourceCodes, ['tl']);
  assert.equal(JSON.parse(gunzipSync(fs.readFileSync(files.output)).toString()).lang_code, 'tl');
  const another = fixture(t, '{"lang_code":"la"}\n');
  await assert.rejects(filterFile({ ...another, sourceMappings: [{ sourceCode: 'la', targetLanguages: ['la'] }] }), /Invalid source-language mapping/);
});

test('language-neutral Wiktextract redirects survive in a separate source sidecar', async t => {
  const redirect = { title: 'alias', redirect: 'word', pos: 'unknown' };
  const files = fixture(t, `${JSON.stringify(redirect)}\n{"lang_code":"en","word":"word"}\n`);
  const result = await filterFile(files);
  assert.equal(result.inputRecords, 2);
  assert.equal(result.keptRecords, 1);
  assert.equal(result.redirectRecords, 1);
  assert.equal(result.removedRecords, 0);
  assert.equal(fs.readFileSync(`${files.output}.redirects.jsonl`, 'utf8'), `${JSON.stringify(redirect)}\n`);
});

test('truncated gzip is rejected even after matching records', async t => {
  const files = fixture(t, '{"lang_code":"en","word":"test"}\n');
  const bytes = fs.readFileSync(files.input);
  fs.writeFileSync(files.input, bytes.subarray(0, bytes.length - 5));
  await assert.rejects(filterFile(files));
  assert.equal(fs.existsSync(files.output), false);
});

test('existing artifacts and inputs cannot be overwritten', async t => {
  const files = fixture(t, '{"lang_code":"en"}\n');
  fs.writeFileSync(files.output, 'keep');
  await assert.rejects(filterFile(files), /already exists/);
  assert.equal(fs.readFileSync(files.output, 'utf8'), 'keep');
  await assert.rejects(filterFile({ ...files, output: files.input }), /overwrite an input/);
});
