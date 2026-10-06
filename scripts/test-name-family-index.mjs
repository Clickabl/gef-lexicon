import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateNameFamilyIndex } from './validate-lexicon.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const owner = (path = 'fixture.json', family_id = 'NF.fixture', review_state = 'candidate') =>
  ({ path, document: { family_id, review_state } });
const catalogue = (sources = [owner()]) => ({ schema_version: 1, purpose: 'Synthetic discovery contract',
  review_state: 'candidate', families: sources.map(({ path, document }) => ({ path, ...document })) });
const issues = (document, familyDocuments = [owner()]) => validateNameFamilyIndex(document, { familyDocuments }).errors;
const copy = value => JSON.parse(JSON.stringify(value));

test('sole public catalogue matches every actual owning family in deterministic filename order', () => {
  const directory = join(root, 'name-families');
  const sources = readdirSync(directory).filter(path => path.endsWith('.json')).sort()
    .map(path => ({ path, document: read(join(directory, path)) }));
  const index = read(join(root, 'lexi', 'name-family-index.json'));
  assert.equal(existsSync(join(root, 'registry', 'name-family-index.json')), false);
  assert.deepEqual(issues(index, sources), []);
  assert.deepEqual(index.families, sources.map(({ path, document }) => ({
    family_id: document.family_id, path, review_state: document.review_state,
  })));
  const before = sources.map(({ path }) => createHash('sha256').update(readFileSync(join(directory, path))).digest('hex'));
  validateNameFamilyIndex(index, { familyDocuments: sources });
  assert.deepEqual(sources.map(({ path }) => createHash('sha256').update(readFileSync(join(directory, path))).digest('hex')), before);
});

test('validator imports without running the whole repository CLI', () => {
  assert.equal(execFileSync(process.execPath, ['--input-type=module', '-e',
    `await import(${JSON.stringify(new URL('./validate-lexicon.mjs', import.meta.url).href)})`], { encoding: 'utf8' }), '');
});

test('closed schema rejects absent, stale, malformed and caller-defined metadata', () => {
  for (const document of [undefined, null, [], {}, { ...catalogue(), schema_version: 2 },
    { ...catalogue(), copy: 'Caller content' }, { ...catalogue(), review_state: 'machine-approved' },
    { ...catalogue(), families: [{ ...catalogue().families[0], url: 'https://example.test' }] }]) {
    assert.ok(issues(document).length > 0);
  }
  for (const key of ['schema_version', 'purpose', 'families', 'review_state']) {
    const document = catalogue(); delete document[key]; assert.ok(issues(document).length > 0, key);
  }
});

test('family refs admit only bounded IDs and safe JSON basenames', () => {
  for (const path of ['../fixture.json', '/fixture.json', 'name-families/fixture.json',
    'https://example.test/fixture.json', 'fixture.json?name=private', 'fixture\\other.json',
    '.json', 'fixture.JSON', `f${'a'.repeat(200)}.json`]) {
    assert.ok(issues({ ...catalogue(), families: [{ ...catalogue().families[0], path }] }).length > 0, path);
  }
  for (const family_id of ['', 'fixture', 'NF../fixture', `NF.${'a'.repeat(200)}`]) {
    assert.ok(issues({ ...catalogue(), families: [{ ...catalogue().families[0], family_id }] }).length > 0, family_id);
  }
  assert.ok(issues({ ...catalogue(), families: Array.from({ length: 10001 }, () => catalogue().families[0]) }).length > 0);
});

test('duplicate catalogue IDs and paths fail even when their owning joins match', () => {
  assert.match(issues({ ...catalogue(), families: [...catalogue().families, ...catalogue().families] }).join('\n'), /duplicate catalogue family ID.*duplicate catalogue family path/su);
  const document = catalogue([owner(), owner('other.json', 'NF.other')]);
  document.families[1].family_id = 'NF.fixture'; assert.match(issues(document, [owner(), owner('other.json', 'NF.other')]).join('\n'), /duplicate catalogue family ID/u);
});

test('missing, extra and mismatched family references reject discovery drift', () => {
  assert.match(issues({ ...catalogue(), families: [] }).join('\n'), /missing catalogue family/u);
  assert.match(issues(catalogue([owner(), owner('unknown.json', 'NF.unknown')])).join('\n'), /unknown owning family file/u);
  assert.match(issues(catalogue([owner('fixture.json', 'NF.wrong')])).join('\n'), /family ID mismatch/u);
  assert.match(issues(catalogue([owner('fixture.json', 'NF.fixture', 'approved')])).join('\n'), /family review state mismatch/u);
  const sources = [owner(), owner('other.json', 'NF.other')];
  assert.match(issues(catalogue(), sources).join('\n'), /missing catalogue family other.json/u);
});

test('owning duplicate paths and IDs remain invalid independently from catalogue refs', () => {
  assert.match(issues(catalogue(), [owner(), owner()]).join('\n'), /duplicate owning family path.*duplicate owning family ID/su);
  assert.match(issues(catalogue(), [owner(), owner('other.json')]).join('\n'), /duplicate owning family ID/u);
});

test('descriptive catalogue review never upgrades candidate owners and validation does not mutate inputs', () => {
  const sources = [owner()]; const document = { ...catalogue(sources), review_state: 'approved' };
  const before = copy({ sources, document });
  assert.deepEqual(issues(document, sources), []);
  assert.equal(document.families[0].review_state, 'candidate');
  assert.deepEqual({ sources, document }, before);
  for (const review_state of ['candidate', 'approved', 'superseded', 'rejected']) {
    const owners = [owner('fixture.json', 'NF.fixture', review_state)];
    assert.deepEqual(issues(catalogue(owners), owners), []);
  }
});
