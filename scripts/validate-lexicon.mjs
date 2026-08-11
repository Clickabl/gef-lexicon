#!/usr/bin/env node
/**
 * Production Iron-Gate Validator for gef-lexicon.
 *
 * Validates:
 * - JSON schemas for concepts, language profiles, core/book lexicons, names,
 *   entities, bibliography sources, and semantic annotations
 * - globally unique lexeme/sense/form/analysis IDs
 * - concept/name/entity/source references
 * - typed lexical relations
 * - compositional entity-label references
 * - annotation target/analysis references
 * - NFC normalization and placeholder definitions
 *
 * Candidate content is allowed. This validator proves structural integrity,
 * not linguistic or human-review approval.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

const PLACEHOLDER_PATTERNS = [
  /definition of '.*' in context as a/i,
  /\bin context as a\b/i,
  /\bplaceholder\b/i,
  /\btodo\b/i,
  /\btbd\b/i,
  /\bfoo\b/i,
  /\bbar\b/i,
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function isNFC(str) {
  return typeof str === 'string' && str === str.normalize('NFC');
}

function hasPlaceholderText(text) {
  return typeof text === 'string' && PLACEHOLDER_PATTERNS.some((p) => p.test(text));
}

function listDirs(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path).filter((f) => statSync(join(path, f)).isDirectory());
}

function listJson(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path).filter((f) => f.endsWith('.json'));
}

function main() {
  console.log('🛡️ Running GEF Lexicon Iron-Gate Validator...');

  const ajv = new Ajv({ allErrors: true, strict: false });
  const compile = (filename) => ajv.compile(readJson(join(REPO_ROOT, 'schemas', filename)));

  const validateLexicon = compile('lexicon-entry.schema.json');
  const validateConcepts = compile('concept.schema.json');
  const validateProfile = compile('language-profile.schema.json');
  const validateNames = compile('name.schema.json');
  const validateEntities = compile('entity.schema.json');
  const validateSources = compile('source.schema.json');
  const validateAnnotations = compile('semantic-annotation.schema.json');

  let errors = 0;
  let totalFiles = 0;
  let totalLexemes = 0;
  let totalSenses = 0;
  let totalForms = 0;
  let totalAnalyses = 0;
  let totalNames = 0;
  let totalNamedEntities = 0;
  let totalAnnotations = 0;

  const ids = new Map(); // id -> {type,file}
  const concepts = new Set();
  const names = new Set();
  const entities = new Set();
  const sources = new Set();
  const pendingConceptRefs = [];
  const pendingNameRefs = [];
  const pendingEntityRefs = [];
  const pendingSourceRefs = [];
  const pendingRelations = [];
  const pendingLabelComponents = [];
  const pendingAnnotations = [];

  const fail = (message) => {
    console.error(`❌ ${message}`);
    errors += 1;
  };

  const schemaCheck = (validator, data, file) => {
    totalFiles += 1;
    if (!validator(data)) {
      fail(`Schema error in ${file}: ${JSON.stringify(validator.errors)}`);
    }
  };

  const register = (id, type, file) => {
    if (!id) {
      fail(`Missing ${type} ID in ${file}`);
      return;
    }
    if (ids.has(id)) {
      const prev = ids.get(id);
      fail(`Duplicate ID '${id}' (${type} in ${file}; already ${prev.type} in ${prev.file})`);
      return;
    }
    ids.set(id, { type, file });
  };

  // 1. Concepts
  const conceptPath = join(REPO_ROOT, 'concepts', 'graph.json');
  if (!existsSync(conceptPath)) {
    fail('Missing concepts/graph.json');
  } else {
    const data = readJson(conceptPath);
    schemaCheck(validateConcepts, data, 'concepts/graph.json');
    for (const c of data.concepts || []) {
      register(c.concept_id, 'concept', 'concepts/graph.json');
      concepts.add(c.concept_id);
    }
  }

  // 2. Reusable bibliography sources
  const sourcePath = join(REPO_ROOT, 'sources', 'bibliography.json');
  if (existsSync(sourcePath)) {
    const data = readJson(sourcePath);
    schemaCheck(validateSources, data, 'sources/bibliography.json');
    for (const s of data.sources || []) {
      register(s.source_id, 'source', 'sources/bibliography.json');
      sources.add(s.source_id);
    }
  }

  // 3. Names
  const namesRoot = join(REPO_ROOT, 'names');
  for (const lang of listDirs(namesRoot)) {
    for (const filename of listJson(join(namesRoot, lang))) {
      const rel = `names/${lang}/${filename}`;
      const data = readJson(join(namesRoot, lang, filename));
      schemaCheck(validateNames, data, rel);
      for (const n of data.names || []) {
        totalNames += 1;
        register(n.name_id, 'name', rel);
        names.add(n.name_id);
        if (!isNFC(n.canonical_form)) fail(`${rel}: name '${n.canonical_form}' is not NFC`);
        for (const spelling of n.spellings || []) {
          if (!isNFC(spelling.text)) fail(`${rel}: spelling '${spelling.text}' is not NFC`);
        }
        for (const src of n.source_refs || []) pendingSourceRefs.push({ id: src, file: rel, owner: n.name_id });
        for (const usage of n.gender_usage || []) pendingSourceRefs.push({ id: usage.source_id, file: rel, owner: n.name_id });
        for (const relation of n.related_names || []) pendingNameRefs.push({ id: relation.target_name_id, file: rel, owner: n.name_id });
      }
    }
  }

  function scanLexicon(data, rel) {
    schemaCheck(validateLexicon, data, rel);
    for (const lex of data.lexemes || []) {
      totalLexemes += 1;
      register(lex.lexeme_id, 'lexeme', rel);
      if (!isNFC(lex.lemma_nfc)) fail(`${rel}: lemma '${lex.lemma_nfc}' is not NFC`);
      if (lex.name_id) pendingNameRefs.push({ id: lex.name_id, file: rel, owner: lex.lexeme_id });

      for (const sense of lex.senses || []) {
        totalSenses += 1;
        register(sense.sense_id, 'sense', rel);
        if (sense.primary_concept_id) pendingConceptRefs.push({ id: sense.primary_concept_id, file: rel, owner: sense.sense_id });
        if (sense.entity_id) pendingEntityRefs.push({ id: sense.entity_id, file: rel, owner: sense.sense_id });
        for (const [ilang, text] of Object.entries(sense.definitions || {})) {
          if (hasPlaceholderText(text)) fail(`${rel}:${lex.lemma_nfc}: placeholder definition [${ilang}] '${text}'`);
        }
        for (const field of ['homophones', 'homonyms', 'synonyms', 'antonyms', 'confusable_senses']) {
          for (const relation of sense[field] || []) {
            pendingRelations.push({ relation, file: rel, owner: sense.sense_id, field });
          }
        }
      }

      for (const form of lex.forms || []) {
        totalForms += 1;
        register(form.form_id, 'form', rel);
        if (!isNFC(form.surface_nfc)) fail(`${rel}: surface '${form.surface_nfc}' is not NFC`);
        for (const analysis of form.analyses || []) {
          totalAnalyses += 1;
          register(analysis.analysis_id, 'analysis', rel);
        }
      }
    }
  }

  // 4. Core lexicons and language profiles
  const languagesRoot = join(REPO_ROOT, 'languages');
  for (const lang of listDirs(languagesRoot)) {
    const profilePath = join(languagesRoot, lang, 'profile.json');
    if (existsSync(profilePath)) {
      schemaCheck(validateProfile, readJson(profilePath), `languages/${lang}/profile.json`);
    } else {
      fail(`Missing profile.json in languages/${lang}`);
    }
    const lexPath = join(languagesRoot, lang, 'lexicon.json');
    if (existsSync(lexPath)) scanLexicon(readJson(lexPath), `languages/${lang}/lexicon.json`);
  }

  // 5. Work overlays, entities, annotations
  const worksRoot = join(REPO_ROOT, 'works');
  for (const work of listDirs(worksRoot)) {
    const workRoot = join(worksRoot, work);

    const lexDir = join(workRoot, 'lexicon');
    for (const filename of listJson(lexDir)) {
      scanLexicon(readJson(join(lexDir, filename)), `works/${work}/lexicon/${filename}`);
    }

    const entityDir = join(workRoot, 'entities');
    for (const filename of listJson(entityDir)) {
      const rel = `works/${work}/entities/${filename}`;
      const data = readJson(join(entityDir, filename));
      schemaCheck(validateEntities, data, rel);
      for (const e of data.entities || []) {
        totalNamedEntities += 1;
        register(e.entity_id, 'entity', rel);
        entities.add(e.entity_id);
        for (const nr of e.name_refs || []) pendingNameRefs.push({ id: nr.name_id, file: rel, owner: e.entity_id });
        for (const src of e.source_refs || []) pendingSourceRefs.push({ id: src, file: rel, owner: e.entity_id });
        for (const label of e.labels || []) {
          for (const component of label.components || []) {
            pendingLabelComponents.push({ component, file: rel, owner: e.entity_id });
          }
        }
      }
    }

    const annDir = join(workRoot, 'annotations');
    for (const filename of listJson(annDir)) {
      const rel = `works/${work}/annotations/${filename}`;
      const data = readJson(join(annDir, filename));
      schemaCheck(validateAnnotations, data, rel);
      for (const a of data.annotations || []) {
        totalAnnotations += 1;
        register(a.annotation_id, 'annotation', rel);
        if (a.end_char <= a.start_char) fail(`${rel}:${a.annotation_id}: end_char must be greater than start_char`);
        if (!isNFC(a.surface)) fail(`${rel}:${a.annotation_id}: annotation surface is not NFC`);
        pendingAnnotations.push({ annotation: a, file: rel });
      }
    }
  }

  // 6. Resolve references after every namespace has been registered.
  for (const ref of pendingConceptRefs) {
    if (!concepts.has(ref.id)) fail(`${ref.file}:${ref.owner}: concept '${ref.id}' does not exist`);
  }
  for (const ref of pendingNameRefs) {
    if (!names.has(ref.id)) fail(`${ref.file}:${ref.owner}: name '${ref.id}' does not exist`);
  }
  for (const ref of pendingEntityRefs) {
    if (!entities.has(ref.id)) fail(`${ref.file}:${ref.owner}: entity '${ref.id}' does not exist`);
  }
  for (const ref of pendingSourceRefs) {
    if (!sources.has(ref.id)) fail(`${ref.file}:${ref.owner}: source '${ref.id}' does not exist`);
  }

  for (const { relation, file, owner, field } of pendingRelations) {
    const target = ids.get(relation.target_id);
    if (!target) {
      fail(`${file}:${owner}:${field}: target '${relation.target_id}' does not exist`);
    } else if (target.type !== relation.target_type) {
      fail(`${file}:${owner}:${field}: target '${relation.target_id}' declared ${relation.target_type} but is ${target.type}`);
    }
  }

  for (const { component, file, owner } of pendingLabelComponents) {
    if (component.target_type === 'literal') continue;
    const target = ids.get(component.target_id);
    if (!target) {
      fail(`${file}:${owner}: label component target '${component.target_id}' does not exist`);
    } else if (target.type !== component.target_type) {
      fail(`${file}:${owner}: label component '${component.surface}' expects ${component.target_type} but '${component.target_id}' is ${target.type}`);
    }
  }

  for (const { annotation, file } of pendingAnnotations) {
    const target = ids.get(annotation.target.target_id);
    if (!target) {
      fail(`${file}:${annotation.annotation_id}: target '${annotation.target.target_id}' does not exist`);
    } else if (target.type !== annotation.target.target_type) {
      fail(`${file}:${annotation.annotation_id}: target declared ${annotation.target.target_type} but is ${target.type}`);
    }
    if (annotation.analysis_id) {
      const analysis = ids.get(annotation.analysis_id);
      if (!analysis || analysis.type !== 'analysis') {
        fail(`${file}:${annotation.annotation_id}: analysis '${annotation.analysis_id}' does not exist`);
      }
    }
  }

  console.log('\nIron-Gate Validation Summary:');
  console.log(`  Files validated: ${totalFiles}`);
  console.log(`  Concepts: ${concepts.size}`);
  console.log(`  Names: ${totalNames}`);
  console.log(`  Named entities: ${totalNamedEntities}`);
  console.log(`  Lexemes: ${totalLexemes}`);
  console.log(`  Senses: ${totalSenses}`);
  console.log(`  Forms: ${totalForms}`);
  console.log(`  Analyses: ${totalAnalyses}`);
  console.log(`  Semantic annotations: ${totalAnnotations}`);

  if (errors > 0) {
    console.error(`\n❌ IRON-GATE VALIDATION FAILED with ${errors} error(s).`);
    process.exit(1);
  }
  console.log('\n✅ OK — structural/referential validation passed.');
}

main();
