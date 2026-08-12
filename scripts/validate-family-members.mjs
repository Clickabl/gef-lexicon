#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY_DIR = join(ROOT, 'lesson-families', 'family-members');
const CAPABILITY_PATH = join(FAMILY_DIR, 'language-capabilities.json');
const SOURCE_MANIFEST_PATH = join(FAMILY_DIR, 'source-bridges', 'manifest.json');
const TARGET_MANIFEST_PATH = join(FAMILY_DIR, 'target-profiles', 'manifest.json');
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

function loadShardedCatalog(manifestPath, baseDir, label, requiredTiers) {
  const manifest = readJson(manifestPath);
  const byTier = new Map();
  const all = [];

  for (const tier of requiredTiers) {
    const shardName = manifest.tier_shards?.[tier];
    if (typeof shardName !== 'string' || shardName.length === 0) fail(`${label}: missing tier ${tier} shard`);
    const shardPath = join(baseDir, shardName);
    requireFile(shardPath);
    const shard = readJson(shardPath);
    if (String(shard.tier) !== tier) fail(`${shardPath}: tier does not match manifest slot ${tier}`);
    if (!Array.isArray(shard.entries)) fail(`${shardPath}: entries must be an array`);
    const expectedCount = manifest.expected_tier_counts?.[tier];
    if (Number.isInteger(expectedCount) && shard.entries.length !== expectedCount) {
      fail(`${shardPath}: expected ${expectedCount} entries, found ${shard.entries.length}`);
    }
    uniqueTags(shard.entries, `${label} tier ${tier}`);
    byTier.set(tier, shard.entries);
    all.push(...shard.entries);
  }

  const tags = uniqueTags(all, label);
  if (Number.isInteger(manifest.expected_total) && tags.size !== manifest.expected_total) {
    fail(`${label}: expected ${manifest.expected_total} unique languages, found ${tags.size}`);
  }
  return { manifest, byTier, all, tags };
}

function validateSourceBridges(catalog) {
  for (const entry of catalog.all) {
    if (typeof entry.summary !== 'string' || entry.summary.trim().length < 20) {
      fail(`source bridge ${entry.language_tag}: summary is missing or too short`);
    }
    if (typeof entry.tooltip !== 'string' || entry.tooltip.trim().length < 5) {
      fail(`source bridge ${entry.language_tag}: tooltip is missing or too short`);
    }
  }
}

function validateTargetProfiles(catalog) {
  for (const entry of catalog.all) {
    if (typeof entry.target_explainer_en !== 'string' || entry.target_explainer_en.trim().length < 80) {
      fail(`target profile ${entry.language_tag}: target_explainer_en is missing or too short`);
    }
    if (!Array.isArray(entry.distinctions) || entry.distinctions.length === 0) {
      fail(`target profile ${entry.language_tag}: distinctions must not be empty`);
    }
    if (!Array.isArray(entry.core_terms) || entry.core_terms.length < 8) {
      fail(`target profile ${entry.language_tag}: expected at least 8 core_terms`);
    }
    const concepts = new Set();
    for (const [index, term] of entry.core_terms.entries()) {
      if (typeof term.concept !== 'string' || term.concept.length === 0) fail(`target profile ${entry.language_tag}: core_terms[${index}] missing concept`);
      if (concepts.has(term.concept)) fail(`target profile ${entry.language_tag}: duplicate core term concept ${term.concept}`);
      concepts.add(term.concept);
      if (typeof term.display !== 'string' || term.display.trim().length === 0) fail(`target profile ${entry.language_tag}: core_terms[${index}] missing display`);
    }
    if (typeof entry.cultural_note_en !== 'string' || entry.cultural_note_en.trim().length < 50) {
      fail(`target profile ${entry.language_tag}: cultural_note_en is missing or too short`);
    }
    if (!Array.isArray(entry.examples) || entry.examples.length < 2) {
      fail(`target profile ${entry.language_tag}: expected at least 2 examples`);
    }
    if (!Array.isArray(entry.source_refs) || entry.source_refs.length === 0) {
      fail(`target profile ${entry.language_tag}: source_refs must not be empty`);
    }
  }
}

function validateRegistry(sourceCatalog, targetCatalog) {
  const registryPath = process.env.GEF_LANGUAGE_SUPPORT_REGISTRY
    ? resolve(process.env.GEF_LANGUAGE_SUPPORT_REGISTRY)
    : DEFAULT_REGISTRY;
  if (!existsSync(registryPath)) {
    console.log('Family-members registry cross-check skipped: sibling gef-expo registry not present.');
    return;
  }

  const registry = readJson(registryPath);
  const learnFrom = registry.programs?.learnFromLanguages;
  if (!Array.isArray(learnFrom)) fail('Registry is missing programs.learnFromLanguages');
  if (sourceCatalog.tags.size !== learnFrom.length || learnFrom.some((tag) => !sourceCatalog.tags.has(tag))) {
    fail('Family-members source bridges must contain every canonical learn-from language exactly once');
  }

  const tierMap = {
    '1': registry.lessonTiers?.tier1_full ?? [],
    '2': registry.lessonTiers?.tier2_high ?? [],
    '3': registry.lessonTiers?.tier3_opportunistic ?? [],
    '4': registry.lessonTiers?.tier4_learn_from ?? [],
  };
  for (const tier of ['1', '2', '3', '4']) {
    const expected = tierMap[tier];
    const actual = new Set((sourceCatalog.byTier.get(tier) ?? []).map((entry) => entry.language_tag));
    if (actual.size !== expected.length || expected.some((tag) => !actual.has(tag))) {
      fail(`Family-members source tier ${tier} does not exactly match the canonical registry tier`);
    }
  }

  const fullTarget = [...tierMap['1'], ...tierMap['2']];
  if (targetCatalog.tags.size !== fullTarget.length || fullTarget.some((tag) => !targetCatalog.tags.has(tag))) {
    fail('Family-members target profiles must exactly cover the canonical Tier 1 + Tier 2 language set');
  }
}

function validateCapability(targetCatalog) {
  const capability = readJson(CAPABILITY_PATH);
  const declared = capability.role_requirements?.learning_language_full?.language_tags;
  if (!Array.isArray(declared)) fail('Family-members capability must declare learning_language_full.language_tags');
  const declaredSet = new Set(declared);
  if (declaredSet.size !== targetCatalog.tags.size || [...targetCatalog.tags].some((tag) => !declaredSet.has(tag))) {
    fail('Family-members full-target capability list must exactly match target-profile coverage');
  }
}

function main() {
  for (const path of [CAPABILITY_PATH, SOURCE_MANIFEST_PATH, TARGET_MANIFEST_PATH, LESSON_PATH, EN_RENDERING_PATH]) requireFile(path);

  const sourceCatalog = loadShardedCatalog(
    SOURCE_MANIFEST_PATH,
    join(FAMILY_DIR, 'source-bridges'),
    'family-members source bridges',
    ['1', '2', '3', '4'],
  );
  const targetCatalog = loadShardedCatalog(
    TARGET_MANIFEST_PATH,
    join(FAMILY_DIR, 'target-profiles'),
    'family-members target profiles',
    ['1', '2'],
  );

  validateSourceBridges(sourceCatalog);
  validateTargetProfiles(targetCatalog);
  validateCapability(targetCatalog);
  validateRegistry(sourceCatalog, targetCatalog);

  const lesson = readJson(LESSON_PATH);
  const rendering = readJson(EN_RENDERING_PATH);
  if (lesson.lesson_id !== 'LES.mul.vocab.family_members') fail('Unexpected family-members lesson_id');
  if (rendering.lesson_id !== lesson.lesson_id) fail('English family-members rendering lesson_id mismatch');

  console.log(`OK — family-members: ${sourceCatalog.tags.size} source bridges, ${targetCatalog.tags.size} full target profiles, 0 asset errors.`);
}

try {
  main();
} catch (error) {
  console.error(`FAMILY MEMBERS VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
