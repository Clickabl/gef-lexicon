#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { computeSenseReadiness, mergeLexiconPackages, normalizeLexiconDocument } from './lib/lexicon-v2.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ajv = new Ajv({ allErrors: true, strict: false });
const validateV2 = ajv.compile(JSON.parse(readFileSync(join(ROOT, 'schemas', 'lexicon-v2.schema.json'), 'utf8')));
const concepts = new Set((JSON.parse(readFileSync(join(ROOT, 'concepts', 'graph.json'), 'utf8')).concepts ?? []).map((item) => item.concept_id));
const LOCAL_TYPES = new Set(['lexeme', 'sense', 'form', 'analysis', 'example']);

let failures = 0;
let warnings = 0;
const fail = (message) => { console.error(`❌ ${message}`); failures += 1; };
const warn = (message) => { console.warn(`⚠️  ${message}`); warnings += 1; };
const isNfc = (value) => typeof value === 'string' && value === value.normalize('NFC');

function lexiconFiles(dir) {
  return readdirSync(dir)
    .filter((name) => /^lexicon(?:-[a-z0-9-]+)?\.json$/iu.test(name))
    .sort((a, b) => a.localeCompare(b));
}

function register(map, id, type, file) {
  if (!id) return fail(`${file}: missing ${type} ID`);
  if (map.has(id)) return fail(`${file}: duplicate ID '${id}', already registered as ${map.get(id).type}`);
  map.set(id, { type, file });
}

function auditLegacyLeakage(raw, rel) {
  if (raw.schema_version !== 1) return;
  for (const lexeme of raw.lexemes ?? []) {
    for (const form of lexeme.forms ?? []) {
      if (Object.prototype.hasOwnProperty.call(form, 'attested_in_text')) {
        warn(`${rel}:${form.form_id}: legacy attested_in_text is corpus evidence and is discarded by v2 normalization`);
      }
    }
    for (const sense of lexeme.senses ?? []) {
      for (const [lang, hint] of Object.entries(sense.sense_hint ?? {})) {
        if (/\b(story|chapter|book|passage)\b/iu.test(hint) || /\bas in the\b/iu.test(hint)) {
          warn(`${rel}:${sense.sense_id}:${lang}: hint may contain corpus-specific wording; move passage evidence to gef-content`);
        }
      }
    }
  }
}

function validateLanguage(lang, langDir) {
  const packages = [];
  for (const filename of lexiconFiles(langDir)) {
    const rel = `languages/${lang}/${filename}`;
    const raw = JSON.parse(readFileSync(join(langDir, filename), 'utf8'));
    auditLegacyLeakage(raw, rel);
    let normalized;
    try {
      normalized = normalizeLexiconDocument(raw);
    } catch (error) {
      fail(`${rel}: ${error.message}`);
      continue;
    }
    if (normalized.language_code !== lang) fail(`${rel}: language_code '${normalized.language_code}' does not match directory '${lang}'`);
    if (!validateV2(normalized)) fail(`${rel}: normalized v2 schema failed: ${JSON.stringify(validateV2.errors)}`);
    packages.push(normalized);
  }
  if (packages.length === 0) return null;

  const pkg = mergeLexiconPackages(packages);
  const ids = new Map();
  const localizations = new Set();
  const analyses = new Set();

  for (const lexeme of pkg.lexemes) {
    register(ids, lexeme.lexeme_id, 'lexeme', lang);
    if (!isNfc(lexeme.lemma_nfc)) fail(`${lang}:${lexeme.lexeme_id}: lemma is not NFC`);
  }
  for (const sense of pkg.senses) {
    register(ids, sense.sense_id, 'sense', lang);
    if (!pkg.lexemes.some((item) => item.lexeme_id === sense.lexeme_id)) fail(`${lang}:${sense.sense_id}: missing lexeme '${sense.lexeme_id}'`);
    if (sense.primary_concept_id && !concepts.has(sense.primary_concept_id)) fail(`${lang}:${sense.sense_id}: missing primary concept '${sense.primary_concept_id}'`);
    for (const link of sense.concept_links ?? []) if (!concepts.has(link.concept_id)) fail(`${lang}:${sense.sense_id}: missing concept link '${link.concept_id}'`);
  }
  for (const localization of pkg.localizations) {
    const key = `${localization.sense_id}|${localization.interface_language}`;
    if (localizations.has(key)) fail(`${lang}: duplicate localization '${key}'`);
    localizations.add(key);
    if (!pkg.senses.some((item) => item.sense_id === localization.sense_id)) fail(`${lang}: localization points to missing sense '${localization.sense_id}'`);
  }
  for (const form of pkg.forms) {
    register(ids, form.form_id, 'form', lang);
    if (!pkg.lexemes.some((item) => item.lexeme_id === form.lexeme_id)) fail(`${lang}:${form.form_id}: missing lexeme '${form.lexeme_id}'`);
    if (!isNfc(form.surface_nfc)) fail(`${lang}:${form.form_id}: surface is not NFC`);
    for (const analysis of form.analyses ?? []) {
      if (analyses.has(analysis.analysis_id)) fail(`${lang}: duplicate analysis '${analysis.analysis_id}'`);
      analyses.add(analysis.analysis_id);
      register(ids, analysis.analysis_id, 'analysis', lang);
    }
  }
  for (const example of pkg.examples) {
    register(ids, example.example_id, 'example', lang);
    if (!isNfc(example.text_nfc)) fail(`${lang}:${example.example_id}: example text is not NFC`);
    for (const senseId of example.sense_ids ?? []) if (!pkg.senses.some((item) => item.sense_id === senseId)) fail(`${lang}:${example.example_id}: missing sense '${senseId}'`);
  }

  const endpointExists = (endpoint) => {
    if (endpoint.type === 'concept') return concepts.has(endpoint.id);
    if (!LOCAL_TYPES.has(endpoint.type)) return true;
    return ids.get(endpoint.id)?.type === endpoint.type;
  };

  for (const relation of pkg.relations) {
    register(ids, relation.relation_id, 'relation', lang);
    if (!endpointExists(relation.source)) fail(`${lang}:${relation.relation_id}: missing source ${relation.source.type} '${relation.source.id}'`);
    if (!endpointExists(relation.target)) fail(`${lang}:${relation.relation_id}: missing target ${relation.target.type} '${relation.target.id}'`);
  }
  for (const redirect of pkg.redirects) {
    for (const target of redirect.to ?? []) if (!endpointExists(target)) fail(`${lang}: redirect '${redirect.from_id}' points to missing ${target.type} '${target.id}'`);
  }
  for (const collection of pkg.collections) {
    register(ids, collection.collection_id, 'collection', lang);
    for (const member of collection.members ?? []) {
      const endpoint = { type: member.target_type, id: member.target_id };
      if (!endpointExists(endpoint)) fail(`${lang}:${collection.collection_id}: missing member ${member.target_type} '${member.target_id}'`);
    }
  }

  const readiness = { lookup: 0, quiz: 0, daily: 0 };
  for (const sense of pkg.senses) {
    const result = computeSenseReadiness(pkg, sense.sense_id);
    if (result.lookup_ready) readiness.lookup += 1;
    if (result.quiz_ready) readiness.quiz += 1;
    if (result.daily_ready) readiness.daily += 1;
  }
  console.log(`  ${lang}: ${pkg.lexemes.length} lexemes, ${pkg.senses.length} senses, ${readiness.lookup} lookup-ready, ${readiness.quiz} quiz-ready, ${readiness.daily} daily-ready`);
  return pkg;
}

console.log('🧠 Validating normalized GEF Lexicon v2...');
const languagesRoot = join(ROOT, 'languages');
for (const lang of readdirSync(languagesRoot).filter((name) => statSync(join(languagesRoot, name)).isDirectory()).sort()) {
  const langDir = join(languagesRoot, lang);
  if (existsSync(langDir)) validateLanguage(lang, langDir);
}

if (failures) {
  console.error(`\n❌ Lexicon v2 validation failed with ${failures} error(s), ${warnings} migration warning(s).`);
  process.exit(1);
}
console.log(`\n✅ Lexicon v2 validation passed with ${warnings} migration warning(s).`);
