#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LESSON_DIR = join(ROOT, 'lessons', 'mul', 'where-languages-come-from');
const RENDERINGS_DIR = join(LESSON_DIR, 'renderings');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
let errors = 0;
const fail = (message) => { console.error(`FAIL: ${message}`); errors += 1; };

const contract = readJson(join(ROOT, 'contracts', 'gef-language-support.json'));
const manifest = readJson(join(LESSON_DIR, 'translation-manifest.json'));
const atlas = readJson(join(LESSON_DIR, 'language-families.json'));
const english = readJson(join(RENDERINGS_DIR, 'en.json'));
const expected = [...contract.learnFromLanguages];
const expectedSet = new Set(expected);
const rtlSet = new Set(manifest.rtl_language_tags);
const expectedBlocks = manifest.required_block_ids;
const expectedFamilies = manifest.atlas_family_ids;
const expectedGroups = manifest.atlas_group_ids;

function equalSets(a, b) {
  return a.size === b.size && [...a].every((value) => b.has(value));
}

function unique(values, label) {
  const set = new Set(values);
  if (set.size !== values.length) fail(`${label}: expected ${values.length} unique values, got ${set.size}`);
  return set;
}

function normalizedPayload(doc) {
  return JSON.stringify({
    title: doc.title,
    invitation: doc.invitation,
    summary: doc.summary,
    runtime_copy: doc.runtime_copy,
    atlas_labels: doc.atlas_labels,
    blocks: doc.blocks,
  });
}

function digest(doc) {
  return createHash('sha256').update(normalizedPayload(doc).normalize('NFC')).digest('hex');
}

function words(text) {
  return new Set(String(text).toLocaleLowerCase('en-US').match(/[\p{L}\p{N}]+/gu) ?? []);
}

function jaccard(aText, bText) {
  const a = words(aText);
  const b = words(bText);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((word) => b.has(word)).length;
  return intersection / (a.size + b.size - intersection);
}

function combinedLearnerCopy(doc) {
  return [
    doc.title,
    doc.invitation,
    doc.summary,
    ...Object.values(doc.localization_keys ?? {}),
    ...Object.values(doc.runtime_copy ?? {}),
    doc.atlas_labels?.eyebrow,
    doc.atlas_labels?.title,
    doc.atlas_labels?.description,
    doc.atlas_labels?.accessibility_label,
    doc.atlas_labels?.count_template,
    ...Object.values(doc.atlas_labels?.families ?? {}),
    ...Object.values(doc.atlas_labels?.groups ?? {}),
    ...Object.values(doc.atlas_labels?.notes ?? {}),
    doc.atlas_labels?.contact_label,
    doc.atlas_labels?.contact_note,
    ...(doc.blocks ?? []).flatMap((block) => [block.title, block.text, block.description, block.action_label]),
  ].filter((value) => typeof value === 'string').join('\n');
}

const scriptExpectations = {
  el: /\p{Script=Greek}/u,
  zh: /\p{Script=Han}/u,
  yue: /\p{Script=Han}/u,
  ja: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,
  ko: /\p{Script=Hangul}/u,
  hi: /\p{Script=Devanagari}/u,
  mr: /\p{Script=Devanagari}/u,
  ne: /\p{Script=Devanagari}/u,
  bn: /\p{Script=Bengali}/u,
  as: /\p{Script=Bengali}/u,
  pa: /\p{Script=Gurmukhi}/u,
  gu: /\p{Script=Gujarati}/u,
  or: /\p{Script=Oriya}/u,
  ta: /\p{Script=Tamil}/u,
  te: /\p{Script=Telugu}/u,
  ml: /\p{Script=Malayalam}/u,
  kn: /\p{Script=Kannada}/u,
  si: /\p{Script=Sinhala}/u,
  th: /\p{Script=Thai}/u,
  lo: /\p{Script=Lao}/u,
  km: /\p{Script=Khmer}/u,
  my: /\p{Script=Myanmar}/u,
  shn: /\p{Script=Myanmar}/u,
  ar: /\p{Script=Arabic}/u,
  fa: /\p{Script=Arabic}/u,
  ur: /\p{Script=Arabic}/u,
  ps: /\p{Script=Arabic}/u,
  sd: /\p{Script=Arabic}/u,
  ckb: /\p{Script=Arabic}/u,
  he: /\p{Script=Hebrew}/u,
  am: /\p{Script=Ethiopic}/u,
  ti: /\p{Script=Ethiopic}/u,
  hy: /\p{Script=Armenian}/u,
  ka: /\p{Script=Georgian}/u,
  ru: /\p{Script=Cyrillic}/u,
  uk: /\p{Script=Cyrillic}/u,
  be: /\p{Script=Cyrillic}/u,
  bg: /\p{Script=Cyrillic}/u,
  mk: /\p{Script=Cyrillic}/u,
  sr: /\p{Script=Cyrillic}/u,
  ba: /\p{Script=Cyrillic}/u,
  cv: /\p{Script=Cyrillic}/u,
  kk: /\p{Script=Cyrillic}/u,
  ky: /\p{Script=Cyrillic}/u,
  mn: /\p{Script=Cyrillic}/u,
};

const atlasTags = [];
const familyIds = [];
const groupIds = [];
for (const family of atlas.families ?? []) {
  familyIds.push(family.family_id);
  for (const group of family.groups ?? []) {
    groupIds.push(group.group_id);
    atlasTags.push(...(group.languages ?? []));
  }
}
atlasTags.push(...(atlas.contact_languages?.languages ?? []));

if (atlas.language_count !== 104) fail(`atlas language_count is ${atlas.language_count}, expected 104`);
if (!equalSets(unique(atlasTags, 'atlas language tags'), expectedSet)) fail('atlas tags do not exactly match canonical learn-from languages');
if (!equalSets(new Set(familyIds), new Set(expectedFamilies))) fail('atlas family IDs do not match translation manifest');
if (!equalSets(new Set(groupIds), new Set(expectedGroups))) fail('atlas group IDs do not match translation manifest');
if (!equalSets(new Set(manifest.expected_language_tags), expectedSet)) fail('translation manifest language set does not match canonical contract');

if (!existsSync(RENDERINGS_DIR)) fail('renderings directory is missing');
const renderingFiles = existsSync(RENDERINGS_DIR)
  ? readdirSync(RENDERINGS_DIR).filter((name) => name.endsWith('.json')).sort()
  : [];
const fileTags = renderingFiles.map((name) => name.slice(0, -5));
if (!equalSets(new Set(fileTags), expectedSet)) {
  const missing = expected.filter((tag) => !fileTags.includes(tag));
  const extra = fileTags.filter((tag) => !expectedSet.has(tag));
  fail(`rendering coverage mismatch; missing=[${missing.join(',')}], extra=[${extra.join(',')}]`);
}

const hashes = new Map();
const englishCopy = combinedLearnerCopy(english);
for (const tag of fileTags) {
  const path = join(RENDERINGS_DIR, `${tag}.json`);
  let doc;
  try { doc = readJson(path); } catch (error) { fail(`${tag}: invalid JSON (${error.message})`); continue; }

  if (doc.lesson_id !== manifest.lesson_id) fail(`${tag}: wrong lesson_id ${doc.lesson_id}`);
  if (doc.support_language_tag !== tag) fail(`${tag}: support_language_tag=${doc.support_language_tag}`);
  if (doc.review_state !== 'candidate') fail(`${tag}: review_state must remain candidate`);
  if (doc.version !== manifest.source_rendering_version) fail(`${tag}: version=${doc.version}, expected ${manifest.source_rendering_version}`);
  if (doc.text_direction !== (rtlSet.has(tag) ? 'rtl' : 'ltr')) fail(`${tag}: incorrect text_direction ${doc.text_direction}`);

  const blockIds = (doc.blocks ?? []).map((block) => block.block_id);
  if (JSON.stringify(blockIds) !== JSON.stringify(expectedBlocks)) fail(`${tag}: block IDs/order differ from canonical manifest`);
  const englishTypes = english.blocks.map((block) => `${block.block_id}:${block.type}:${block.group_id}`);
  const translatedTypes = (doc.blocks ?? []).map((block) => `${block.block_id}:${block.type}:${block.group_id}`);
  if (JSON.stringify(translatedTypes) !== JSON.stringify(englishTypes)) fail(`${tag}: block type/group parity differs from English`);

  const familyKeys = Object.keys(doc.atlas_labels?.families ?? {});
  const groupKeys = Object.keys(doc.atlas_labels?.groups ?? {});
  if (!equalSets(new Set(familyKeys), new Set(expectedFamilies))) fail(`${tag}: localized atlas family keys are incomplete or extra`);
  if (!equalSets(new Set(groupKeys), new Set(expectedGroups))) fail(`${tag}: localized atlas group keys are incomplete or extra`);
  if (!String(doc.atlas_labels?.count_template ?? '').includes('{count}')) fail(`${tag}: count_template must preserve {count}`);

  const copy = combinedLearnerCopy(doc);
  const hasPlaceholder = copy.includes('{{') || copy.includes('}}') || /\b(?:TODO|TBD|TRANSLATE_ME|PLACEHOLDER)\b/.test(copy);
  if (hasPlaceholder) fail(`${tag}: unresolved placeholder found`);
  if (copy.trim().length < 1200) fail(`${tag}: learner copy is suspiciously short (${copy.trim().length} chars)`);
  if (tag !== 'en' && normalizedPayload(doc) === normalizedPayload(english)) fail(`${tag}: full rendering is identical to English`);
  if (tag !== 'en' && jaccard(copy, englishCopy) > 0.68) fail(`${tag}: suspiciously high English lexical overlap`);
  const expectedScript = scriptExpectations[tag];
  if (expectedScript && !expectedScript.test(copy)) fail(`${tag}: expected native-script characters were not found`);

  const hash = digest(doc);
  const previous = hashes.get(hash);
  if (previous) fail(`${tag}: duplicate localized payload with ${previous}`);
  hashes.set(hash, tag);
}

if (errors) {
  console.error(`\n${errors} Lesson 0 multilingual QA error(s).`);
  process.exit(1);
}
console.log(`OK — Lesson 0 has ${fileTags.length} candidate renderings, exact 104-language atlas coverage, block/atlas parity, direction/script checks, and no duplicate payloads.`);
