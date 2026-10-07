import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { fixtureGraph } from './fixtures.mjs';
import { compileNameGraph, sha256 } from './compileNameGraph.mjs';
import { migrateLegacyNameFamilies } from './legacyNameGraph.mjs';
import { createNameGraphSource, readNameResponse } from './nameGraphSource.mjs';
const bibliography = { sources: [{ source_id: 'fixture:synthetic' }] };
async function directory(t) { const value = await mkdtemp(path.join(tmpdir(), 'gef-name-graph-')); t.after(() => rm(value, { recursive: true, force: true })); return value; }
const build = outputDirectory => compileNameGraph({ input: fixtureGraph(), outputDirectory, bibliography, allowFixtureSources: true });
function transport(overrides = {}) {
  const text = JSON.stringify(fixtureGraph()), hash = sha256(text);
  const manifest = JSON.stringify({ contract: 'gef-name-graph-manifest-v2', graph: { path: `${hash}/graph.json`, sha256: hash, bytes: Buffer.byteLength(text) } });
  const urls = [];
  const fetcher = async (url, options) => { urls.push([url, options]); return new Response(url.endsWith('manifest.json') ? manifest : text); };
  return { urls, source: createNameGraphSource({ baseUrl: 'https://cdn.clickabl.co/gef/lexicon/v1/lexi/name-graph-v2/', digest: async input => sha256(input), fetcher, ...overrides }) };
}

test('compiler produces real SQLite with normalized rows and valid foreign keys', async t => {
  const out = await directory(t), manifest = await build(out); const db = new DatabaseSync(path.join(out, manifest.sqlite.path), { readOnly: true }); t.after(() => db.close());
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM name_senses').get().n, 4);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM name_spellings').get().n, 9);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM name_renderings').get().n, 1);
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok'); assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
  assert.equal(sha256(await readFile(path.join(out, manifest.graph.path))), manifest.graph.sha256);
  assert.equal(sha256(await readFile(path.join(out, manifest.sqlite.path))), manifest.sqlite.sha256);
});
test('repeat compile preserves immutable paths and bytes', async t => { const out = await directory(t); assert.deepEqual(await build(out), await build(out)); });
test('input row order does not change immutable artifact identity', async t => {
  const one = await directory(t), two = await directory(t); const a = await build(one), graph = fixtureGraph(); graph.names.reverse(); graph.spellings.reverse();
  const b = await compileNameGraph({ input: graph, outputDirectory: two, bibliography, allowFixtureSources: true }); assert.equal(a.graph.sha256, b.graph.sha256);
});
test('invalid data cannot replace a working publication manifest', async t => {
  const out = await directory(t); await build(out); const prior = await readFile(path.join(out, 'manifest.json'), 'utf8'); const bad = fixtureGraph(); bad.spellings[0].nameId = 'NS.missing';
  await assert.rejects(compileNameGraph({ input: bad, outputDirectory: out, bibliography, allowFixtureSources: true })); assert.equal(await readFile(path.join(out, 'manifest.json'), 'utf8'), prior);
});
test('compiler rejects unregistered sources before publishing', async t => { const out = await directory(t); await assert.rejects(compileNameGraph({ input: fixtureGraph(), outputDirectory: out, bibliography: { sources: [] } }), /name_source_not_in_bibliography/); });
test('test fixtures cannot accidentally be published through normal compilation', async t => { const out = await directory(t); await assert.rejects(compileNameGraph({ input: fixtureGraph(), outputDirectory: out, bibliography }), /name_test_fixture_not_publishable/); });
test('a corrupt immutable JSON artifact is not silently repaired or repointed', async t => {
  const out = await directory(t), manifest = await build(out); await writeFile(path.join(out, manifest.graph.path), '{}'); await assert.rejects(build(out), /name_immutable_artifact_mismatch/);
});
test('concurrent publishers are refused rather than racing the live pointer', async t => { const out = await directory(t); await mkdir(path.join(out, '.publish-lock')); await assert.rejects(build(out), /name_publisher_busy/); });
test('public download is hash-bound and query strings never contain private names', async () => {
  const { source, urls } = transport(); assert.equal((await source.resolveLiteral('Tim')).kind, 'resolved'); await source.search('Alex');
  assert.equal(urls.length, 2); assert.ok(urls.every(([url, options]) => !url.includes('Tim') && !url.includes('Alex') && options.credentials === 'omit' && !options.body));
});
test('a hash mismatch is not installed as a graph', async () => { const { source } = transport({ digest: async () => '0'.repeat(64) }); await assert.rejects(source.load(), /name_graph_digest_mismatch/); });
test('repeated callers share one public artifact fetch', async () => { const { source, urls } = transport(); await Promise.all([source.search('Tim'), source.search('Alex'), source.resolveLiteral('Timothy')]); assert.equal(urls.length, 2); });
test('a failed fetch can recover instead of poisoning a process-wide promise', async () => {
  let broken = true; const text = JSON.stringify(fixtureGraph()), hash = sha256(text); const manifest = JSON.stringify({ contract: 'gef-name-graph-manifest-v2', graph: { path: `${hash}/graph.json`, sha256: hash, bytes: Buffer.byteLength(text) } });
  const { source } = transport({ fetcher: async url => { if (broken) throw Error('offline'); return new Response(url.endsWith('manifest.json') ? manifest : text); } });
  await assert.rejects(source.load()); broken = false; assert.equal((await source.resolveLiteral('Tim')).kind, 'resolved');
});
test('unsafe manifest paths cannot select another endpoint', async () => {
  const { source } = transport({ fetcher: async () => new Response(JSON.stringify({ contract: 'gef-name-graph-manifest-v2', graph: { sha256: '0'.repeat(64), path: '../../private', bytes: 10 } })) });
  await assert.rejects(source.load(), /name_graph_manifest_invalid/);
});
test('uncooperative transport still times out', async () => {
  const { source } = transport({ fetcher: async () => new Promise(() => {}), timeoutMs: 10 }); await assert.rejects(source.load(), /name_graph_timeout/);
});
test('streamed body limits are enforced before the complete body is consumed', async () => {
  let cancelled = false;
  const stream = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(100)); }, cancel() { cancelled = true; } });
  await assert.rejects(readNameResponse(new Response(stream), 50), /name_graph_body_limit/); assert.equal(cancelled, true);
});
test('malformed UTF-8 cannot change the verified document', async () => { await assert.rejects(readNameResponse(new Response(new Uint8Array([0xff])), 10)); });
test('a cleared cache cannot be restored by a late network result', async () => {
  let finish; const gate = new Promise(resolve => { finish = resolve; }); const { source } = transport({ digest: async text => { await gate; return sha256(text); } });
  const load = source.load(); await new Promise(resolve => setImmediate(resolve)); source.clear(); finish(); await assert.rejects(load, /name_graph_load_retired/);
});
function legacy(forms, role = 'full_masculine') { return [{ family_id: 'NF.fixture', review_state: 'candidate', source_refs: ['fixture:synthetic'], equivalence_sets: [{ equivalence_set_id: 'fixture-set', role, forms }] }]; }
const legacyForm = (form_id, text, relation_type = 'source_form', usage = 'available') => ({ form_id, text, language_tag: 'en', script: 'Latn', relation_type, usage, review_state: 'candidate', source_refs: ['fixture:synthetic'] });
test('legacy conversion is deterministic and never promotes review state', () => {
  const input = legacy([legacyForm('timothy', 'Timothy')]); const one = migrateLegacyNameFamilies(input), two = migrateLegacyNameFamilies(input);
  assert.deepEqual(one, two); assert.equal(one.names[0].reviewState, 'candidate'); assert.equal(one.spellings[0].primary, true); assert.equal(one.renderings.length, 0);
});
test('legacy mixed full and short set is refused', () => { assert.throws(() => migrateLegacyNameFamilies(legacy([legacyForm('timothy', 'Timothy'), legacyForm('tim', 'Tim', 'short_form')])), /name_legacy_mixed_full_short_set/); });
test('ambiguous legacy primaries require an explicit mapping, not popularity guessing', () => {
  const input = legacy([legacyForm('a', 'Timothy', 'spelling_variant'), legacyForm('b', 'Timothi', 'spelling_variant')]); assert.throws(() => migrateLegacyNameFamilies(input), /name_primary_decision_required/);
  const graph = migrateLegacyNameFamilies(input, { '["fixture-set","en-Latn"]': 'a' }); assert.equal(graph.spellings.find(row => row.primary).text, 'Timothy'); assert.equal(graph.spellings.find(row => row.text === 'Timothi').fallbackToPrimary, false);
});
test('mutated SQLite rows are detected even when integrity checks still pass', async t => {
  const out = await directory(t), manifest = await build(out); const db = new DatabaseSync(path.join(out, manifest.sqlite.path));
  db.prepare("UPDATE name_spellings SET text_value='Different' WHERE spelling_id='SP.tim.en'").run(); db.close();
  await assert.rejects(build(out), /name_immutable_database_mismatch/);
});
