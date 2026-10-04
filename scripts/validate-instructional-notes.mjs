#!/usr/bin/env node
/**
 * Structural/referential validator for the reusable Lexi instructional-note
 * graph. Candidate content is allowed; this validator never promotes review.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOTE_ROOT = join(ROOT, 'lexi', 'instructional-notes');
const RENDERING_ROOT = join(NOTE_ROOT, 'renderings');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

let errors = 0;
const fail = (message) => { console.error(`FAIL: ${message}`); errors += 1; };

const ajv = new Ajv({ allErrors: true, strict: false });
const catalogValidator = ajv.compile(readJson(join(ROOT, 'schemas', 'instructional-note-catalog.schema.json')));
const bindingValidator = ajv.compile(readJson(join(ROOT, 'schemas', 'instructional-note-bindings.schema.json')));
const renderingValidator = ajv.compile(readJson(join(ROOT, 'schemas', 'instructional-note-renderings.schema.json')));

function schemaCheck(validator, data, label) {
  if (!validator(data)) fail(`${label}: ${JSON.stringify(validator.errors)}`);
}

function visitJson(root, callback) {
  if (!existsSync(root)) return;
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stats = statSync(path);
    if (stats.isDirectory()) visitJson(path, callback);
    else if (name.endsWith('.json')) callback(path);
  }
}

/** Collect stable IDs only from canonical reusable-truth trees. */
function collectTargetIds() {
  const byType = new Map([
    ['sense', new Set()],
    ['lexeme', new Set()],
    ['concept', new Set()],
    ['construction', new Set()],
    ['semantic_function', new Set()],
    ['name', new Set()],
    ['entity', new Set()],
    ['rule', new Set()],
  ]);
  const keyToType = new Map([
    ['sense_id', 'sense'],
    ['lexeme_id', 'lexeme'],
    ['concept_id', 'concept'],
    ['construction_id', 'construction'],
    ['semantic_function_id', 'semantic_function'],
    ['name_id', 'name'],
    ['entity_id', 'entity'],
    ['rule_id', 'rule'],
  ]);
  const roots = [
    'languages',
    'concepts',
    'curriculum',
    'curriculum-v2',
    'names',
    'name-families',
    'works',
  ];
  const seen = new WeakSet();
  const scan = (value) => {
    if (!value || typeof value !== 'object') return;
    if (seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const child of value) scan(child);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      const type = keyToType.get(key);
      if (type && typeof child === 'string' && child.trim()) byType.get(type)?.add(child);
      scan(child);
    }
  };
  for (const root of roots) {
    visitJson(join(ROOT, root), (path) => {
      try { scan(readJson(path)); }
      catch (error) { fail(`${relative(ROOT, path)}: unreadable JSON while indexing note targets (${String(error)})`); }
    });
  }
  return byType;
}

const catalogPath = join(NOTE_ROOT, 'catalog.json');
const bindingsPath = join(NOTE_ROOT, 'bindings.json');
if (!existsSync(catalogPath)) fail('missing lexi/instructional-notes/catalog.json');
if (!existsSync(bindingsPath)) fail('missing lexi/instructional-notes/bindings.json');

const catalog = existsSync(catalogPath) ? readJson(catalogPath) : { notes: [] };
const bindings = existsSync(bindingsPath) ? readJson(bindingsPath) : { bindings: [] };
schemaCheck(catalogValidator, catalog, 'lexi/instructional-notes/catalog.json');
schemaCheck(bindingValidator, bindings, 'lexi/instructional-notes/bindings.json');

const topicIndexPath = join(ROOT, 'curriculum-v2', 'topics', 'index.json');
const topicIds = new Set(
  existsSync(topicIndexPath)
    ? (readJson(topicIndexPath).topics ?? []).map((topic) => topic.topic_id)
    : [],
);

const notes = new Map();
for (const note of catalog.notes ?? []) {
  if (notes.has(note.note_id)) fail(`duplicate instructional note ID ${note.note_id}`);
  notes.set(note.note_id, note);
  if (!topicIds.has(note.topic_id)) {
    fail(`${note.note_id}: unknown curriculum topic ${note.topic_id}`);
  }
}

const targetIds = collectTargetIds();
const bindingIds = new Set();
for (const binding of bindings.bindings ?? []) {
  if (bindingIds.has(binding.binding_id)) fail(`duplicate instructional note binding ID ${binding.binding_id}`);
  bindingIds.add(binding.binding_id);
  const note = notes.get(binding.note_id);
  if (!note) fail(`${binding.binding_id}: unknown note ${binding.note_id}`);
  const known = targetIds.get(binding.target_type);
  if (!known?.has(binding.target_id)) {
    fail(`${binding.binding_id}: unknown ${binding.target_type} target ${binding.target_id}`);
  }
  if (binding.review_state === 'approved' && note && note.review_state !== 'approved') {
    fail(`${binding.binding_id}: approved binding cannot point to ${note.review_state} note ${binding.note_id}`);
  }
}

let renderingFiles = 0;
let renderingRows = 0;
if (existsSync(RENDERING_ROOT)) {
  for (const filename of readdirSync(RENDERING_ROOT).filter((name) => name.endsWith('.json')).sort()) {
    const rel = `lexi/instructional-notes/renderings/${filename}`;
    const data = readJson(join(RENDERING_ROOT, filename));
    schemaCheck(renderingValidator, data, rel);
    renderingFiles += 1;
    const filenameTag = filename.slice(0, -'.json'.length);
    if (data.language_tag !== filenameTag) {
      fail(`${rel}: language_tag ${data.language_tag} does not match filename ${filenameTag}`);
    }
    const ids = new Set();
    for (const rendering of data.renderings ?? []) {
      renderingRows += 1;
      if (ids.has(rendering.note_id)) fail(`${rel}: duplicate rendering for ${rendering.note_id}`);
      ids.add(rendering.note_id);
      const note = notes.get(rendering.note_id);
      if (!note) fail(`${rel}: unknown note ${rendering.note_id}`);
      if (rendering.review_state === 'approved' && note && note.review_state !== 'approved') {
        fail(`${rel}: approved rendering cannot belong to ${note.review_state} note ${rendering.note_id}`);
      }
    }
  }
}

if (errors) {
  console.error(`\n${errors} instructional-note validation error(s).`);
  process.exit(1);
}
console.log(
  `OK — ${notes.size} instructional notes, ${bindingIds.size} reusable bindings, `
  + `${renderingRows} renderings in ${renderingFiles} languages.`,
);
