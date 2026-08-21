#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REL_ROOT = join(ROOT, 'relations');
const LEXICON_RE = /^lexicon(?:-[a-z0-9-]+)?\.json$/iu;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function listJsonRecursive(root) {
  if (!existsSync(root)) return [];
  const out = [];
  for (const entry of readdirSync(root).sort()) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...listJsonRecursive(path));
    else if (entry.endsWith('.json')) out.push(path);
  }
  return out;
}

function collectKnownIds() {
  const ids = {
    concept: new Set(),
    lexeme: new Set(),
    sense: new Set(),
    entity: new Set(),
    pronunciation: new Set(),
  };

  const graph = readJson(join(ROOT, 'concepts', 'graph.json'));
  for (const concept of graph.concepts ?? []) ids.concept.add(concept.concept_id);

  const languagesRoot = join(ROOT, 'languages');
  if (existsSync(languagesRoot)) {
    for (const language of readdirSync(languagesRoot).sort()) {
      const dir = join(languagesRoot, language);
      if (!statSync(dir).isDirectory()) continue;
      for (const filename of readdirSync(dir).filter((name) => LEXICON_RE.test(name)).sort()) {
        const data = readJson(join(dir, filename));
        for (const lexeme of data.lexemes ?? []) {
          ids.lexeme.add(lexeme.lexeme_id);
          for (const sense of lexeme.senses ?? []) ids.sense.add(sense.sense_id);
          for (const form of lexeme.forms ?? []) {
            for (const analysis of form.analyses ?? []) {
              for (const pronunciation of analysis.pronunciations ?? []) {
                if (pronunciation.pronunciation_id) ids.pronunciation.add(pronunciation.pronunciation_id);
              }
            }
          }
        }
      }
    }
  }

  for (const path of listJsonRecursive(join(ROOT, 'entities'))) {
    const data = readJson(path);
    const stack = [data];
    while (stack.length) {
      const value = stack.pop();
      if (Array.isArray(value)) stack.push(...value);
      else if (value && typeof value === 'object') {
        if (typeof value.entity_id === 'string') ids.entity.add(value.entity_id);
        stack.push(...Object.values(value));
      }
    }
  }

  return ids;
}

const symmetricTypes = new Set([
  'near_synonym',
  'antonym',
  'coordinate_term',
  'related',
  'confusable',
  'homonym',
  'homophone',
  'homograph',
  'etymologically_related',
  'register_variant',
  'regional_variant',
  'orthographic_variant',
]);
const directedTypes = new Set(['hypernym', 'hyponym', 'derived_from']);

const schema = readJson(join(ROOT, 'schemas', 'semantic-relation.schema.json'));
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const knownIds = collectKnownIds();
const seenRelationIds = new Set();
const seenCanonicalEdges = new Set();
let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`❌ ${message}`);
}

for (const path of listJsonRecursive(REL_ROOT)) {
  const relPath = relative(ROOT, path);
  const data = readJson(path);
  if (!validate(data)) {
    for (const error of validate.errors ?? []) fail(`${relPath}${error.instancePath}: ${error.message}`);
    continue;
  }

  for (const relation of data.relations ?? []) {
    const label = `${relPath}:${relation.relation_id}`;
    if (seenRelationIds.has(relation.relation_id)) fail(`${label}: duplicate relation_id`);
    seenRelationIds.add(relation.relation_id);

    if (relation.from.kind === relation.to.kind && relation.from.id === relation.to.id) {
      fail(`${label}: self-relations are forbidden; model an explicit distinct sense/concept if two meanings differ`);
    }

    if (relation.translation_authority !== 'none') {
      fail(`${label}: relation edges must never carry translation authority`);
    }

    if (symmetricTypes.has(relation.relation_type) && relation.directionality !== 'symmetric') {
      fail(`${label}: ${relation.relation_type} must be symmetric`);
    }
    if (directedTypes.has(relation.relation_type) && relation.directionality !== 'directed') {
      fail(`${label}: ${relation.relation_type} must be directed`);
    }

    for (const endpointName of ['from', 'to']) {
      const endpoint = relation[endpointName];
      const known = knownIds[endpoint.kind];
      const exists = known?.has(endpoint.id) ?? false;
      if (!exists && relation.review_state === 'approved') {
        fail(`${label}: approved ${endpointName} endpoint ${endpoint.kind}:${endpoint.id} does not resolve to a known stable ID`);
      }
      if (!exists && endpoint.kind === 'pronunciation' && relation.review_state !== 'candidate') {
        fail(`${label}: pronunciation endpoints without stable pronunciation_id support must remain candidate`);
      }
    }

    const left = `${relation.from.kind}:${relation.from.id}`;
    const right = `${relation.to.kind}:${relation.to.id}`;
    const endpoints = relation.directionality === 'symmetric' ? [left, right].sort() : [left, right];
    const edgeKey = `${relation.relation_type}|${endpoints.join('|')}`;
    if (seenCanonicalEdges.has(edgeKey)) {
      fail(`${label}: duplicate semantic edge ${edgeKey}; symmetric reverse duplicates are not separate facts`);
    }
    seenCanonicalEdges.add(edgeKey);

    if (relation.provenance.source !== 'gef_editorial' && !relation.provenance.source_record_id) {
      fail(`${label}: imported/community relation must preserve source_record_id`);
    }
    if (relation.review_state === 'approved' && relation.provenance.source !== 'gef_editorial' && !relation.provenance.source_revision) {
      fail(`${label}: approved imported relation must preserve a source_revision`);
    }
  }
}

if (failures) {
  console.error(`\n${failures} semantic relation validation failure(s).`);
  process.exit(1);
}

console.log(`✅ Semantic relation graph valid (${seenRelationIds.size} relation${seenRelationIds.size === 1 ? '' : 's'}).`);
