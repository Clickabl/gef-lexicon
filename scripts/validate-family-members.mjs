#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY_DIR = join(ROOT, 'lesson-families', 'family-members');
const CAPABILITY_PATH = join(FAMILY_DIR, 'language-capabilities.json');
const SOURCE_MANIFEST_PATH = join(FAMILY_DIR, 'source-bridges', 'manifest.json');
const TARGET_MANIFEST_PATH = join(FAMILY_DIR, 'target-profiles', 'manifest.json');
const GAME_DIR = join(FAMILY_DIR, 'game-vocabulary');
const GAME_MANIFEST_PATH = join(GAME_DIR, 'manifest.json');
const LESSON_PATH = join(ROOT, 'lessons', 'mul', 'family-members', 'lesson.json');
const EN_RENDERING_PATH = join(ROOT, 'lessons', 'mul', 'family-members', 'renderings', 'en.json');
const DEFAULT_REGISTRY = resolve(ROOT, '..', 'gef-expo', 'registry', 'language-support.json');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const fail = (message) => { throw new Error(message); };
const requireFile = (path) => { if (!existsSync(path)) fail(`Missing required family-members asset: ${path}`); };

function uniqueTags(entries, label) {
  const tags = new Set();
  for (const [index, entry] of entries.entries()) {
    if (!entry || typeof entry !== 'object') fail(`${label}[${index}] must be an object`);
    if (typeof entry.language_tag !== 'string' || entry.language_tag.length === 0) fail(`${label}[${index}] is missing language_tag`);
    if (tags.has(entry.language_tag)) fail(`${label}: duplicate language_tag ${entry.language_tag}`);
    tags.add(entry.language_tag);
  }
  return tags;
}

function shardNames(value, label) {
  const names = Array.isArray(value) ? value : [value];
  if (names.length === 0 || names.some((name) => typeof name !== 'string' || name.length === 0)) fail(`${label}: invalid shard declaration`);
  return names;
}

function loadShardedCatalog(manifestPath, baseDir, label, requiredTiers) {
  const manifest = readJson(manifestPath);
  const byTier = new Map();
  const all = [];
  for (const tier of requiredTiers) {
    const entries = [];
    for (const shardName of shardNames(manifest.tier_shards?.[tier], `${label} tier ${tier}`)) {
      const shardPath = join(baseDir, shardName);
      requireFile(shardPath);
      const shard = readJson(shardPath);
      if (!Array.isArray(shard.entries)) fail(`${shardPath}: entries must be an array`);
      entries.push(...shard.entries);
    }
    uniqueTags(entries, `${label} logical tier ${tier}`);
    const expected = manifest.expected_tier_counts?.[tier];
    if (Number.isInteger(expected) && entries.length !== expected) fail(`${label} tier ${tier}: expected ${expected}, found ${entries.length}`);
    byTier.set(tier, entries);
    all.push(...entries);
  }
  const tags = uniqueTags(all, label);
  if (Number.isInteger(manifest.expected_total) && tags.size !== manifest.expected_total) fail(`${label}: expected ${manifest.expected_total}, found ${tags.size}`);
  return { manifest, byTier, all, tags };
}

function validateSourceBridges(catalog) {
  for (const entry of catalog.all) {
    if (typeof entry.summary !== 'string' || entry.summary.trim().length < 20) fail(`source bridge ${entry.language_tag}: summary missing/short`);
    if (typeof entry.tooltip !== 'string' || entry.tooltip.trim().length < 5) fail(`source bridge ${entry.language_tag}: tooltip missing/short`);
  }
}

function validateTargetProfiles(catalog) {
  for (const entry of catalog.all) {
    if (typeof entry.target_explainer_en !== 'string' || entry.target_explainer_en.trim().length < 80) fail(`target profile ${entry.language_tag}: explainer missing/short`);
    if (!Array.isArray(entry.distinctions) || entry.distinctions.length === 0) fail(`target profile ${entry.language_tag}: distinctions empty`);
    if (!Array.isArray(entry.core_terms) || entry.core_terms.length < 8) fail(`target profile ${entry.language_tag}: expected >=8 core_terms`);
    const concepts = new Set();
    for (const [index, term] of entry.core_terms.entries()) {
      if (typeof term.concept !== 'string' || term.concept.length === 0) fail(`target profile ${entry.language_tag}: core_terms[${index}] missing concept`);
      if (concepts.has(term.concept)) fail(`target profile ${entry.language_tag}: duplicate concept ${term.concept}`);
      concepts.add(term.concept);
      if (typeof term.display !== 'string' || term.display.trim().length === 0) fail(`target profile ${entry.language_tag}: core_terms[${index}] missing display`);
    }
    if (typeof entry.cultural_note_en !== 'string' || entry.cultural_note_en.trim().length < 50) fail(`target profile ${entry.language_tag}: cultural note missing/short`);
    if (!Array.isArray(entry.examples) || entry.examples.length < 2) fail(`target profile ${entry.language_tag}: expected >=2 examples`);
    if (!Array.isArray(entry.source_refs) || entry.source_refs.length === 0) fail(`target profile ${entry.language_tag}: source refs empty`);
  }
}

function loadGameVocabulary() {
  const manifest = readJson(GAME_MANIFEST_PATH);
  if (!Array.isArray(manifest.required_concepts) || manifest.required_concepts.length < 8) fail('game vocabulary manifest needs required_concepts');
  const all = [];
  const byTier = new Map();
  for (const tier of ['1', '2', '3']) {
    const file = manifest.sources?.[`tier${tier}`];
    if (typeof file !== 'string') fail(`game vocabulary missing tier ${tier} source`);
    const path = join(GAME_DIR, file);
    requireFile(path);
    const shard = readJson(path);
    if (!Array.isArray(shard.entries)) fail(`${path}: entries must be an array`);
    if (JSON.stringify(shard.concept_order) !== JSON.stringify(manifest.required_concepts)) fail(`${path}: concept_order must exactly match manifest required_concepts`);
    const expectedCount = manifest.expected_tier_counts?.[tier];
    if (shard.entries.length !== expectedCount) fail(`${path}: expected ${expectedCount} entries, found ${shard.entries.length}`);
    uniqueTags(shard.entries, `game vocabulary tier ${tier}`);
    for (const entry of shard.entries) {
      if (!Array.isArray(entry.terms) || entry.terms.length !== manifest.required_concepts.length) fail(`game vocabulary ${entry.language_tag}: expected ${manifest.required_concepts.length} ordered terms`);
      entry.terms.forEach((term, index) => {
        if (typeof term !== 'string' || term.trim().length === 0) fail(`game vocabulary ${entry.language_tag}: term ${index} empty`);
      });
    }
    byTier.set(tier, shard.entries);
    all.push(...shard.entries);
  }
  const tags = uniqueTags(all, 'family-members game vocabulary');
  if (tags.size !== manifest.expected_total) fail(`game vocabulary: expected ${manifest.expected_total} unique languages, found ${tags.size}`);
  return { manifest, byTier, all, tags };
}

function registryPath() {
  return process.env.GEF_LANGUAGE_SUPPORT_REGISTRY ? resolve(process.env.GEF_LANGUAGE_SUPPORT_REGISTRY) : DEFAULT_REGISTRY;
}

function validateRegistry(sourceCatalog, targetCatalog, gameCatalog) {
  const path = registryPath();
  if (!existsSync(path)) {
    console.log('Family-members registry cross-check skipped: sibling gef-expo registry not present.');
    return;
  }
  const registry = readJson(path);
  const learnFrom = registry.programs?.learnFromLanguages;
  if (!Array.isArray(learnFrom)) fail('Registry missing programs.learnFromLanguages');
  for (const [label, catalog] of [['source bridges', sourceCatalog], ['game vocabulary', gameCatalog]]) {
    if (catalog.tags.size !== learnFrom.length || learnFrom.some((tag) => !catalog.tags.has(tag))) fail(`Family-members ${label} must cover every canonical learn-from language exactly once`);
  }
  const tierMap = {
    '1': registry.lessonTiers?.tier1_full ?? [],
    '2': registry.lessonTiers?.tier2_selective ?? [],
    '3': registry.lessonTiers?.tier3_read_games ?? [],
  };
  for (const tier of ['1', '2', '3']) {
    for (const [label, catalog] of [['source', sourceCatalog], ['game', gameCatalog]]) {
      const expected = tierMap[tier];
      const actual = new Set((catalog.byTier.get(tier) ?? []).map((entry) => entry.language_tag));
      if (actual.size !== expected.length || expected.some((tag) => !actual.has(tag))) fail(`Family-members ${label} tier ${tier} does not match canonical registry tier`);
    }
  }
  const richExpected = [...tierMap['1'], ...tierMap['2']];
  if (targetCatalog.tags.size !== richExpected.length || richExpected.some((tag) => !targetCatalog.tags.has(tag))) fail('Family-members rich target profiles must cover canonical Tier 1 + Tier 2 exactly');
}

function validateCapability() {
  const capability = readJson(CAPABILITY_PATH);
  if (capability.game_vocabulary_manifest !== 'game-vocabulary/manifest.json') fail('Capability must point to game-vocabulary/manifest.json');
  if (capability.role_requirements?.learning_language_game?.coverage !== 'all registry.programs.learnFromLanguages') fail('Game capability must be registry-derived');
}

function main() {
  for (const path of [CAPABILITY_PATH, SOURCE_MANIFEST_PATH, TARGET_MANIFEST_PATH, GAME_MANIFEST_PATH, LESSON_PATH, EN_RENDERING_PATH]) requireFile(path);
  const sourceCatalog = loadShardedCatalog(SOURCE_MANIFEST_PATH, join(FAMILY_DIR, 'source-bridges'), 'family-members source bridges', ['1', '2', '3']);
  const targetCatalog = loadShardedCatalog(TARGET_MANIFEST_PATH, join(FAMILY_DIR, 'target-profiles'), 'family-members target profiles', ['1', '2']);
  const gameCatalog = loadGameVocabulary();
  validateSourceBridges(sourceCatalog);
  validateTargetProfiles(targetCatalog);
  validateCapability();
  validateRegistry(sourceCatalog, targetCatalog, gameCatalog);
  const lesson = readJson(LESSON_PATH);
  const rendering = readJson(EN_RENDERING_PATH);
  if (lesson.lesson_id !== 'LES.mul.vocab.family_members') fail('Unexpected family-members lesson_id');
  if (rendering.lesson_id !== lesson.lesson_id) fail('English family-members rendering lesson_id mismatch');
  console.log(`OK — family-members: ${sourceCatalog.tags.size} source bridges, ${targetCatalog.tags.size} rich target profiles, ${gameCatalog.tags.size} universal game vocabularies × ${gameCatalog.manifest.required_concepts.length} concepts.`);
}

try { main(); }
catch (error) {
  console.error(`FAMILY MEMBERS VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
