#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LESSON_ROOT = join(ROOT, 'lessons', 'mul', 'international-language-levels');
const RENDERINGS_ROOT = join(LESSON_ROOT, 'renderings');
const ENGLISH_PATH = join(RENDERINGS_ROOT, 'en.json');
const DEFAULT_REGISTRY = resolve(ROOT, '..', 'gef-expo', 'registry', 'language-support.json');

// Snapshot copied from gef-expo/registry/language-support.json at implementation time.
// When the sibling registry is available it is authoritative and this snapshot must
// match it exactly. Keeping the snapshot here makes standalone lexicon CI capable of
// detecting accidental rendering loss without pretending this repository owns the list.
const REGISTRY_SNAPSHOT = [
  'en','es','fr','pt','it','el','zh','hi','ar','bn','ru','id','ur','de','ja','pcm','mr','vi','te','ha','tr','pa','sw','fil','ta','yue','fa','ko','th','jv','af','ak','am','as','az','ba','be','bg','bs','ca','cs','cv','cy','da','dsb','et','eu','fi','ga','gd','gl','gu','he','hr','hsb','hu','hy','ig','is','ka','kk','km','kn','kok','ky','lo','lt','lv','mk','ml','mn','ms','my','nb','ne','nl','nn','or','pl','ps','qu','rm','ro','sd','shn','si','sk','sl','so','sq','sr','sv','ti','tk','uk','uz','yo','zu','haw','bho','om','ht','ku','ckb'
];

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const fail = (message) => { throw new Error(message); };
const sameSet = (a, b) => a.size === b.size && [...a].every((value) => b.has(value));

function registryLanguages() {
  const registryPath = process.env.GEF_LANGUAGE_SUPPORT_REGISTRY
    ? resolve(process.env.GEF_LANGUAGE_SUPPORT_REGISTRY)
    : DEFAULT_REGISTRY;
  if (!existsSync(registryPath)) return REGISTRY_SNAPSHOT;
  const registry = readJson(registryPath);
  const learnFrom = registry.programs?.learnFromLanguages;
  if (!Array.isArray(learnFrom)) fail('Gef language registry is missing programs.learnFromLanguages');
  const current = new Set(learnFrom);
  const snapshot = new Set(REGISTRY_SNAPSHOT);
  if (!sameSet(current, snapshot)) {
    fail('International-language-level rendering validator snapshot is stale relative to gef-expo language-support.json');
  }
  return learnFrom;
}

function renderingFiles() {
  return readdirSync(RENDERINGS_ROOT)
    .filter((name) => extname(name) === '.json')
    .map((name) => ({ tag: basename(name, '.json'), path: join(RENDERINGS_ROOT, name) }));
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) fail(`${label} must be a non-empty string`);
}

function structuralSignature(block) {
  const signature = { block_id: block.block_id, group_id: block.group_id, type: block.type };
  for (const key of ['visual_kind','level_code','show_scorecard','celebration']) {
    if (block[key] !== undefined) signature[key] = block[key];
  }
  if (block.type === 'visual' && block.visual_kind === 'proficiency_radar') {
    signature.axis_keys = Object.keys(block.axis_values ?? {}).sort();
  }
  return signature;
}

function validateLocalizedBlock(block, tag) {
  requireString(block.block_id, `${tag}: block_id`);
  requireString(block.group_id, `${tag}/${block.block_id}: group_id`);
  requireString(block.type, `${tag}/${block.block_id}: type`);
  if (block.type === 'explanation') {
    if (block.title !== undefined) requireString(block.title, `${tag}/${block.block_id}: title`);
    requireString(block.text, `${tag}/${block.block_id}: text`);
  }
  if (block.type === 'completion') {
    requireString(block.title, `${tag}/${block.block_id}: title`);
    requireString(block.description, `${tag}/${block.block_id}: description`);
    requireString(block.action_label, `${tag}/${block.block_id}: action_label`);
  }
  if (block.type === 'visual' && block.visual_kind === 'mediation_bridge') {
    for (const key of ['source_label','bridge_label','target_label']) requireString(block[key], `${tag}/${block.block_id}: ${key}`);
  }
}

function validateRendering(rendering, tag, english) {
  if (rendering.lesson_id !== 'LES.mul.meta.international_language_levels') fail(`${tag}: lesson_id mismatch`);
  if (rendering.support_language_tag !== tag) fail(`${tag}: support_language_tag mismatch`);
  requireString(rendering.title, `${tag}: title`);
  requireString(rendering.invitation, `${tag}: invitation`);
  requireString(rendering.summary, `${tag}: summary`);
  for (const key of ['previous_label','next_label','finish_label','done_label']) requireString(rendering.runtime_copy?.[key], `${tag}: runtime_copy.${key}`);
  if (!Array.isArray(rendering.blocks)) fail(`${tag}: blocks must be an array`);
  if (rendering.blocks.length !== english.blocks.length) fail(`${tag}: expected ${english.blocks.length} blocks, found ${rendering.blocks.length}`);

  const expectedIds = english.blocks.map((block) => block.block_id);
  const actualIds = rendering.blocks.map((block) => block.block_id);
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) fail(`${tag}: block ids/order must exactly match English canonical rendering`);
  for (let index = 0; index < english.blocks.length; index += 1) {
    const expected = structuralSignature(english.blocks[index]);
    const actual = structuralSignature(rendering.blocks[index]);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      fail(`${tag}/${actualIds[index]}: structural signature differs from English canonical block`);
    }
    validateLocalizedBlock(rendering.blocks[index], tag);
  }

  if (tag === 'en') {
    if (rendering.review_state !== 'approved') fail('English canonical rendering must remain approved');
  } else {
    if (rendering.review_state !== 'candidate') fail(`${tag}: generated rendering must remain candidate`);
    if (rendering.trust_state !== 'machine_translated') fail(`${tag}: generated rendering must remain machine_translated`);
  }
}

function main() {
  if (!existsSync(ENGLISH_PATH)) fail(`Missing English canonical rendering: ${ENGLISH_PATH}`);
  const english = readJson(ENGLISH_PATH);
  const canonical = registryLanguages();
  const canonicalSet = new Set(canonical);
  if (canonicalSet.size !== canonical.length) fail('Canonical learn-from registry contains duplicate language tags');

  const files = renderingFiles();
  const fileTags = new Set(files.map((entry) => entry.tag));
  if (!sameSet(fileTags, canonicalSet)) {
    const missing = canonical.filter((tag) => !fileTags.has(tag));
    const extra = [...fileTags].filter((tag) => !canonicalSet.has(tag));
    fail(`Rendering coverage mismatch. Missing: ${missing.join(', ') || 'none'}. Extra: ${extra.join(', ') || 'none'}.`);
  }

  for (const { tag, path } of files) validateRendering(readJson(path), tag, english);
  console.log(`OK — international language levels: ${files.length}/${canonical.length} learn-from languages have complete block-aligned renderings.`);
}

try {
  main();
} catch (error) {
  console.error(`INTERNATIONAL-LANGUAGE-LEVELS VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
