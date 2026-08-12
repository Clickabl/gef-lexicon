#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY_DIR = join(ROOT, 'lesson-families', 'family-members', 'game-vocabulary');
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

function validateFamilyVocabulary() {
  const manifest = readJson(join(FAMILY_DIR, 'manifest.json'));
  const all = [];
  let conceptOrder = null;
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
      all.push(entry);
    }
  }
  const tags = unique(all.map((entry) => entry.language_tag), 'family vocabulary');
  if (tags.size !== 104) fail(`Family vocabulary must cover 104 languages, found ${tags.size}`);
  if (manifest.expected_total !== 104) fail(`Family manifest expected_total must be 104, found ${manifest.expected_total}`);
  if (conceptOrder.length !== 14) fail(`Family semantic core must contain 14 concepts, found ${conceptOrder.length}`);
  return { tags, conceptOrder };
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
  console.log(`OK — Lexi semantic lesson inputs: ${family.tags.size} languages × ${family.conceptOrder.length} family concepts, 104-language grammatical-gender source copy, and lesson-linked Spanish gender forms.`);
} catch (error) {
  console.error(`LESSON SEMANTIC INDEX VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
