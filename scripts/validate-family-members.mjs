#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY_DIR = join(ROOT, 'lesson-families', 'family-members');
const CAPABILITY_PATH = join(FAMILY_DIR, 'language-capabilities.json');
const SOURCE_MANIFEST_PATH = join(FAMILY_DIR, 'source-bridges', 'manifest.json');
const TARGET_MANIFEST_PATH = join(FAMILY_DIR, 'target-profiles', 'manifest.json');
const GAME_MANIFEST_PATH = join(FAMILY_DIR, 'game-core', 'manifest.json');
const LESSON_PATH = join(ROOT, 'lessons', 'mul', 'family-members', 'lesson.json');
const EN_RENDERING_PATH = join(ROOT, 'lessons', 'mul', 'family-members', 'renderings', 'en.json');
const DEFAULT_REGISTRY = resolve(ROOT, '..', 'gef-expo', 'registry', 'language-support.json');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const fail = (message) => { throw new Error(message); };

function requireFile(path) {
  if (!existsSync(path)) fail(`Missing required family-members asset: ${path}`);
}

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

function loadLegacyTierCatalog(manifestPath, baseDir, label, requiredTiers) {
  const manifest = readJson(manifestPath);
  const all = [];
  for (const tier of requiredTiers) {
    const shardName = manifest.tier_shards?.[tier];
    if (typeof shardName !== 'string' || shardName.length === 0) fail(`${label}: missing shard ${tier}`);
    const shardPath = join(baseDir, shardName);
    requireFile(shardPath);
    const shard = readJson(shardPath);
    if (!Array.isArray(shard.entries)) fail(`${shardPath}: entries must be an array`);
    const expectedCount = manifest.expected_tier_counts?.[tier];
    if (Number.isInteger(expectedCount) && shard.entries.length !== expectedCount) {
      fail(`${shardPath}: expected ${expectedCount} entries, found ${shard.entries.length}`);
    }
    all.push(...shard.entries);
  }
  const tags = uniqueTags(all, label);
  if (Number.isInteger(manifest.expected_total) && tags.size !== manifest.expected_total) {
    fail(`${label}: expected ${manifest.expected_total} unique languages, found ${tags.size}`);
  }
  return { manifest, all, tags };
}

function loadGameCore() {
  const manifest = readJson(GAME_MANIFEST_PATH);
  if (!Array.isArray(manifest.concept_keys) || manifest.concept_keys.length === 0) fail('game-core manifest concept_keys must not be empty');
  if (!Array.isArray(manifest.shards) || manifest.shards.length === 0) fail('game-core manifest shards must not be empty');
  const concepts = new Set(manifest.concept_keys);
  if (concepts.size !== manifest.concept_keys.length) fail('game-core manifest has duplicate concept_keys');

  const all = [];
  for (const shardName of manifest.shards) {
    const path = join(FAMILY_DIR, 'game-core', shardName);
    requireFile(path);
    const shard = readJson(path);
    if (!Array.isArray(shard.entries)) fail(`${path}: entries must be an array`);
    all.push(...shard.entries);
  }
  const tags = uniqueTags(all, 'family-members game core');
  if (tags.size !== manifest.expected_game_core_total) {
    fail(`game core expects ${manifest.expected_game_core_total} languages, found ${tags.size}`);
  }

  for (const entry of all) {
    if (!Array.isArray(entry.terms)) fail(`game core ${entry.language_tag}: terms must be an array`);
    const seen = new Set();
    for (const term of entry.terms) {
      if (!concepts.has(term.concept)) fail(`game core ${entry.language_tag}: unknown concept ${term.concept}`);
      if (seen.has(term.concept)) fail(`game core ${entry.language_tag}: duplicate concept ${term.concept}`);
      seen.add(term.concept);
      if (!Array.isArray(term.forms) || term.forms.length === 0) fail(`game core ${entry.language_tag}/${term.concept}: forms must not be empty`);
      for (const form of term.forms) {
        if (typeof form !== 'string' || form.trim().length === 0) fail(`game core ${entry.language_tag}/${term.concept}: blank form`);
        if (form !== form.normalize('NFC')) fail(`game core ${entry.language_tag}/${term.concept}: form is not NFC: ${form}`);
      }
    }
    if (seen.size !== concepts.size || [...concepts].some((concept) => !seen.has(concept))) {
      fail(`game core ${entry.language_tag}: must cover all ${concepts.size} canonical concepts`);
    }
    if (entry.game_ready_at_trust !== 'machine_translated') fail(`game core ${entry.language_tag}: game_ready_at_trust must preserve machine-draft trust`);
  }
  return { manifest, all, tags, concepts };
}

function validateSourceBridges(catalog) {
  for (const entry of catalog.all) {
    if (typeof entry.summary !== 'string' || entry.summary.trim().length < 20) fail(`source bridge ${entry.language_tag}: summary is missing or too short`);
    if (typeof entry.tooltip !== 'string' || entry.tooltip.trim().length < 5) fail(`source bridge ${entry.language_tag}: tooltip is missing or too short`);
  }
}

function validateTargetProfiles(catalog) {
  for (const entry of catalog.all) {
    if (typeof entry.target_explainer_en !== 'string' || entry.target_explainer_en.trim().length < 80) fail(`target profile ${entry.language_tag}: target_explainer_en is missing or too short`);
    if (!Array.isArray(entry.distinctions) || entry.distinctions.length === 0) fail(`target profile ${entry.language_tag}: distinctions must not be empty`);
    if (!Array.isArray(entry.core_terms) || entry.core_terms.length < 8) fail(`target profile ${entry.language_tag}: expected at least 8 core_terms`);
    if (typeof entry.cultural_note_en !== 'string' || entry.cultural_note_en.trim().length < 50) fail(`target profile ${entry.language_tag}: cultural_note_en is missing or too short`);
    if (!Array.isArray(entry.examples) || entry.examples.length < 2) fail(`target profile ${entry.language_tag}: expected at least 2 examples`);
    if (!Array.isArray(entry.source_refs) || entry.source_refs.length === 0) fail(`target profile ${entry.language_tag}: source_refs must not be empty`);
  }
}

function validateCapability(targetCatalog, gameCatalog) {
  const capability = readJson(CAPABILITY_PATH);
  const full = capability.role_requirements?.learning_language_full?.language_tags;
  if (!Array.isArray(full)) fail('capability must declare learning_language_full.language_tags');
  const fullSet = new Set(full);
  if (fullSet.size !== targetCatalog.tags.size || [...targetCatalog.tags].some((tag) => !fullSet.has(tag))) {
    fail('full-target capability list must exactly match target-profile coverage');
  }
  if (capability.role_requirements?.learning_language_game_core?.expected_total !== gameCatalog.tags.size) {
    fail('game-core capability expected_total must match actual game-core coverage');
  }
  if (capability.game_core_manifest !== 'game-core/manifest.json') fail('capability must point to game-core/manifest.json');
}

function validateRegistry(sourceCatalog, targetCatalog, gameCatalog) {
  const registryPath = process.env.GEF_LANGUAGE_SUPPORT_REGISTRY ? resolve(process.env.GEF_LANGUAGE_SUPPORT_REGISTRY) : DEFAULT_REGISTRY;
  if (!existsSync(registryPath)) {
    console.log('Family-members registry cross-check skipped: sibling gef-expo registry not present.');
    return;
  }
  const registry = readJson(registryPath);
  const learnFrom = registry.programs?.learnFromLanguages;
  if (!Array.isArray(learnFrom)) fail('Registry is missing programs.learnFromLanguages');
  const exact = (actual, expected, label) => {
    const expectedSet = new Set(expected);
    if (actual.size !== expectedSet.size || [...expectedSet].some((tag) => !actual.has(tag))) fail(`${label} does not exactly match the canonical registry set`);
  };
  exact(sourceCatalog.tags, learnFrom, 'source bridges');
  exact(gameCatalog.tags, learnFrom, 'game core');

  const tier1 = registry.lessonTiers?.tier1_full ?? [];
  const tier2 = registry.lessonTiers?.tier2_selective ?? [];
  const tier3 = registry.lessonTiers?.tier3_read_games ?? [];
  exact(targetCatalog.tags, [...tier1, ...tier2], 'full target profiles');
  if (tier1.length + tier2.length + tier3.length !== learnFrom.length) fail('Current lesson tiers must partition programs.learnFromLanguages for Family Members validation');
  for (const tag of tier3) {
    if (!gameCatalog.tags.has(tag)) fail(`Tier 3 game language ${tag} is missing from Family Members game core`);
    if (targetCatalog.tags.has(tag)) fail(`Tier 3 language ${tag} must not be promoted to full Family Members target profile by game coverage alone`);
  }
}

function main() {
  for (const path of [CAPABILITY_PATH, SOURCE_MANIFEST_PATH, TARGET_MANIFEST_PATH, GAME_MANIFEST_PATH, LESSON_PATH, EN_RENDERING_PATH]) requireFile(path);
  const sourceCatalog = loadLegacyTierCatalog(SOURCE_MANIFEST_PATH, join(FAMILY_DIR, 'source-bridges'), 'family-members source bridges', ['1','2','3','4']);
  const targetCatalog = loadLegacyTierCatalog(TARGET_MANIFEST_PATH, join(FAMILY_DIR, 'target-profiles'), 'family-members target profiles', ['1','2']);
  const gameCatalog = loadGameCore();

  validateSourceBridges(sourceCatalog);
  validateTargetProfiles(targetCatalog);
  validateCapability(targetCatalog, gameCatalog);
  validateRegistry(sourceCatalog, targetCatalog, gameCatalog);

  const lesson = readJson(LESSON_PATH);
  const rendering = readJson(EN_RENDERING_PATH);
  if (lesson.lesson_id !== 'LES.mul.vocab.family_members') fail('Unexpected family-members lesson_id');
  if (rendering.lesson_id !== lesson.lesson_id) fail('English family-members rendering lesson_id mismatch');

  console.log(`OK — family-members: ${sourceCatalog.tags.size} source bridges, ${targetCatalog.tags.size} full target profiles, ${gameCatalog.tags.size} game-core targets x ${gameCatalog.concepts.size} concepts, 0 asset errors.`);
}

try { main(); } catch (error) {
  console.error(`FAMILY MEMBERS VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
