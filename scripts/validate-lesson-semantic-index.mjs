#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY_DIR = join(ROOT, 'lesson-families', 'family-members', 'game-vocabulary');
const FAMILY_LEXI_METADATA = join(ROOT, 'lesson-families', 'family-members', 'lexi-metadata.json');
const GENDER_COPY_DIR = join(ROOT, 'lesson-families', 'grammatical-gender', 'source-copy');
const SPANISH_SUPPLEMENT = join(ROOT, 'languages', 'es', 'lexicon-lessons.json');

function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function fail(message) { throw new Error(message); }
function shardFiles(dir) {
  return readdirSync(dir).filter((name) => /^tier.*\.json$/u.test(name)).sort().map((name) => join(dir, name));
}
function unique(values, label) {
  const set = new Set();
  for (const value of values) {
    if (set.has(value)) fail(`${label}: duplicate ${value}`);
    set.add(value);
  }
  return set;
}
function splitFamilyCell(cell) {
  return cell.split(/\s+\/\s+/u).map((value) => value.trim()).filter(Boolean);
}

function validateFamilyVocabulary() {
  const manifest = readJson(join(FAMILY_DIR, 'manifest.json'));
  const metadata = readJson(FAMILY_LEXI_METADATA);
  const all = [];
  let conceptOrder = null;
  const expectedSenses = new Set();
  const surfacesByLanguage = new Map();

  for (const path of shardFiles(FAMILY_DIR)) {
    const doc = readJson(path);
    if (!conceptOrder) conceptOrder = doc.concept_order;
    if (JSON.stringify(doc.concept_order) !== JSON.stringify(conceptOrder)) fail(`${path}: concept_order drift`);
    for (const entry of doc.entries ?? []) {
      if (!entry.language_tag) fail(`${path}: missing language_tag`);
      if (!Array.isArray(entry.terms) || entry.terms.length !== conceptOrder.length) {
        fail(`${entry.language_tag}: expected ${conceptOrder.length} family term cells, found ${entry.terms?.length ?? 0}`);
      }
      if (entry.terms.some((term) => typeof term !== 'string' || !term.trim())) fail(`${entry.language_tag}: empty family term`);
      const languageSurfaces = surfacesByLanguage.get(entry.language_tag) ?? new Set();
      for (let index = 0; index < conceptOrder.length; index += 1) {
        const conceptKey = conceptOrder[index];
        const cell = entry.terms[index];
        const alternatives = splitFamilyCell(cell);
        if (alternatives.length === 0) fail(`${entry.language_tag}:${conceptKey}: no lexical expressions`);
        for (const surface of alternatives) {
          if (surface !== surface.normalize('NFC')) fail(`${entry.language_tag}:${conceptKey}: '${surface}' is not NFC`);
          expectedSenses.add(`${entry.language_tag}\u0000${conceptKey}\u0000${surface.toLocaleLowerCase()}`);
          languageSurfaces.add(surface);
        }
      }
      surfacesByLanguage.set(entry.language_tag, languageSurfaces);
      all.push(entry);
    }
  }

  const tags = unique(all.map((entry) => entry.language_tag), 'family vocabulary');
  if (tags.size !== 104) fail(`Family vocabulary must cover 104 languages, found ${tags.size}`);
  if (manifest.expected_total !== 104) fail(`Family manifest expected_total must be 104, found ${manifest.expected_total}`);
  if (conceptOrder.length !== 14) fail(`Family semantic core must contain 14 concepts, found ${conceptOrder.length}`);

  if (metadata.lesson_id !== 'LES.mul.vocab.family_members') fail(`Family Lexi metadata lesson_id drift: ${metadata.lesson_id}`);
  if (metadata.lesson_offer?.lesson_id !== metadata.lesson_id) fail('Family Lexi lesson offer must target the Family lesson.');
  if (metadata.relation_policy?.assert_synonymy !== false) fail('Family related-by-relationship policy must not assert synonymy.');

  const groupConcepts = unique(
    (metadata.relationship_group_concepts ?? []).map((concept) => concept.concept_id),
    'Family relationship group concept',
  );
  const primaryConcepts = new Set(conceptOrder.map((key) => `FAMILY.${key}`));
  for (const conceptKey of conceptOrder) {
    const broader = metadata.broader_concepts?.[conceptKey];
    if (!Array.isArray(broader) || broader.length === 0) fail(`Family Lexi broader_concepts missing ${conceptKey}`);
    for (const conceptId of broader) if (!groupConcepts.has(conceptId)) fail(`${conceptKey}: unknown broader concept ${conceptId}`);
  }
  for (const conceptId of groupConcepts) if (primaryConcepts.has(conceptId)) fail(`Group concept collides with primary concept ${conceptId}`);

  const englishSurfaces = surfacesByLanguage.get('en') ?? new Set();
  for (const required of ['mother', 'mom', 'mum']) if (!englishSurfaces.has(required)) fail(`English Family vocabulary missing separate '${required}' expression.`);
  if (metadata.expression_metadata?.en?.mother?.register_label !== 'neutral') fail('English mother must be neutral in Family Lexi metadata.');
  if (metadata.expression_metadata?.en?.mom?.register_label !== 'familiar') fail('English mom must be familiar in Family Lexi metadata.');
  if (metadata.expression_metadata?.en?.mum?.register_label !== 'familiar') fail('English mum must be familiar in Family Lexi metadata.');

  for (const [languageTag, expressions] of Object.entries(metadata.expression_metadata ?? {})) {
    const available = surfacesByLanguage.get(languageTag);
    if (!available) fail(`Family Lexi expression metadata references unknown language ${languageTag}`);
    for (const surface of Object.keys(expressions)) if (!available.has(surface)) fail(`${languageTag}: metadata references missing Family expression '${surface}'`);
  }

  return { tags, conceptOrder, expectedSenseCount: expectedSenses.size };
}

function validateGenderSourceCopy() {
  const required = ['title', 'body', 'culture_note', 'practice', 'quest', 'completion'];
  const all = [];
  for (const path of shardFiles(GENDER_COPY_DIR)) {
    const doc = readJson(path);
    for (const entry of doc.entries ?? []) {
      if (!entry.language_tag) fail(`${path}: source-copy entry missing language_tag`);
      for (const field of required) {
        if (typeof entry[field] !== 'string' || !entry[field].trim()) fail(`${entry.language_tag}: missing gender source-copy ${field}`);
      }
      all.push(entry);
    }
  }
  const tags = unique(all.map((entry) => entry.language_tag), 'gender source copy');
  if (tags.size !== 104) fail(`Grammatical-gender source copy must cover 104 languages, found ${tags.size}`);
  return tags;
}

function validateSpanishLessonLexicon() {
  if (!existsSync(SPANISH_SUPPLEMENT)) fail('Missing languages/es/lexicon-lessons.json');
  const doc = readJson(SPANISH_SUPPLEMENT);
  if (doc.language_code !== 'es') fail('Spanish lesson lexicon must declare language_code=es');
  const required = new Map([
    ['el', 'RULE.es.gender.masculine_agreement'],
    ['la', 'RULE.es.gender.feminine_agreement'],
    ['él', null],
    ['ella', null],
    ['lo', null],
    ['esto', null],
    ['eso', null],
    ['aquello', null],
  ]);
  const byLemma = new Map((doc.lexemes ?? []).map((lexeme) => [lexeme.lemma_nfc, lexeme]));
  for (const [lemma, requiredRule] of required) {
    const lexeme = byLemma.get(lemma);
    if (!lexeme) fail(`Spanish lesson lexicon missing ${lemma}`);
    if (!Array.isArray(lexeme.forms) || !lexeme.forms.some((form) => form.normalized_lookup === lemma)) fail(`${lemma}: missing normalized form`);
    const links = (lexeme.senses ?? []).flatMap((sense) => sense.lesson_links ?? []);
    if (!links.some((link) => link.lesson_id === 'LES.mul.grammar.grammatical_gender')) fail(`${lemma}: missing grammatical-gender lesson link`);
    if (requiredRule && !links.some((link) => link.rule_id === requiredRule)) fail(`${lemma}: missing ${requiredRule}`);
  }
  const el = byLemma.get('el');
  const accented = byLemma.get('él');
  if (!el.relations?.some((relation) => relation.relation_type === 'confusable_with' && relation.target_id === accented.lexeme_id)) {
    fail('el must explicitly link to accented él as a confusable lexeme');
  }
}

try {
  const family = validateFamilyVocabulary();
  const gender = validateGenderSourceCopy();
  for (const tag of family.tags) if (!gender.has(tag)) fail(`${tag}: family-vocabulary source language missing gender source copy`);
  validateSpanishLessonLexicon();
  console.log(`OK — Lexi semantic lesson inputs: ${family.tags.size} languages × ${family.conceptOrder.length} Family pivots -> ${family.expectedSenseCount} distinct Family senses, 104-language grammatical-gender source copy, and lesson-linked Spanish gender forms.`);
} catch (error) {
  console.error(`LESSON SEMANTIC INDEX VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
