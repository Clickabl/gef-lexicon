#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY_DIR = join(ROOT, 'lesson-families', 'family-members');
const CONTRACT_PATH = join(FAMILY_DIR, 'language-contract.json');
const CAPABILITY_PATH = join(FAMILY_DIR, 'language-capabilities.json');
const SOURCE_MANIFEST_PATH = join(FAMILY_DIR, 'source-bridges', 'manifest.json');
const TARGET_MANIFEST_PATH = join(FAMILY_DIR, 'target-profiles', 'manifest.json');
const CORE_MANIFEST_PATH = join(FAMILY_DIR, 'core-localizations', 'manifest.json');
const LESSON_PATH = join(ROOT, 'lessons', 'mul', 'family-members', 'lesson.json');
const EN_RENDERING_PATH = join(ROOT, 'lessons', 'mul', 'family-members', 'renderings', 'en.json');
const DEFAULT_REGISTRY = resolve(ROOT, '..', 'gef-expo', 'registry', 'language-support.json');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const fail = (message) => { throw new Error(message); };
const requireFile = (path) => { if (!existsSync(path)) fail(`Missing required Family Members asset: ${path}`); };
const normalizeShardNames = (value) => Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];

function setOf(list, label) {
  if (!Array.isArray(list)) fail(`${label} must be an array`);
  const out = new Set();
  for (const value of list) {
    if (typeof value !== 'string' || !value) fail(`${label} contains an invalid language tag`);
    if (out.has(value)) fail(`${label} contains duplicate language tag ${value}`);
    out.add(value);
  }
  return out;
}

function assertExactSet(actual, expected, label) {
  if (actual.size !== expected.size) {
    fail(`${label}: expected ${expected.size} languages, found ${actual.size}`);
  }
  const missing = [...expected].filter((tag) => !actual.has(tag));
  const extra = [...actual].filter((tag) => !expected.has(tag));
  if (missing.length || extra.length) {
    fail(`${label}: missing [${missing.join(', ')}], extra [${extra.join(', ')}]`);
  }
}

function validateContract() {
  requireFile(CONTRACT_PATH);
  const contract = readJson(CONTRACT_PATH);
  const tier1 = setOf(contract.tier1, 'language-contract tier1');
  const tier2 = setOf(contract.tier2, 'language-contract tier2');
  const tier3 = setOf(contract.tier3, 'language-contract tier3');
  const learnFrom = setOf(contract.learn_from_languages, 'language-contract learn_from_languages');
  const fullTargets = setOf(contract.full_target_languages, 'language-contract full_target_languages');

  for (const tag of tier1) if (tier2.has(tag) || tier3.has(tag)) fail(`language-contract tier overlap: ${tag}`);
  for (const tag of tier2) if (tier3.has(tag)) fail(`language-contract tier overlap: ${tag}`);

  const tierUnion = new Set([...tier1, ...tier2, ...tier3]);
  assertExactSet(tierUnion, learnFrom, 'language-contract tier union');
  assertExactSet(new Set([...tier1, ...tier2]), fullTargets, 'language-contract full targets');

  const expectedCounts = contract.tier_counts ?? {};
  if (tier1.size !== expectedCounts['1'] || tier2.size !== expectedCounts['2'] || tier3.size !== expectedCounts['3']) {
    fail(`language-contract tier counts must be ${expectedCounts['1']}/${expectedCounts['2']}/${expectedCounts['3']}; found ${tier1.size}/${tier2.size}/${tier3.size}`);
  }
  if (learnFrom.size !== contract.total_learn_from || fullTargets.size !== contract.total_full_targets) {
    fail('language-contract declared totals do not match its language sets');
  }
  if (learnFrom.size !== 104 || fullTargets.size !== 21 || tier1.size !== 6 || tier2.size !== 15 || tier3.size !== 83) {
    fail('Family Members product contract must currently resolve to 104 source languages and 6/15/83 lesson tiers');
  }
  if (!tier2.has('mk') || fullTargets.has('nl')) {
    fail('Current registry guard: Macedonian must be Tier 2 full target and Dutch must not be a full target');
  }
  return { contract, tier1, tier2, tier3, learnFrom, fullTargets };
}

function validateSourceBridges(contractState) {
  requireFile(SOURCE_MANIFEST_PATH);
  const manifest = readJson(SOURCE_MANIFEST_PATH);
  const allByTag = new Map();
  const semanticByTier = new Map();

  for (const tier of ['1', '2', '3']) {
    const files = normalizeShardNames(manifest.tier_shards?.[tier]);
    if (!files.length) fail(`source bridges: no shards for semantic Tier ${tier}`);
    const tierTags = new Set();
    for (const file of files) {
      const path = join(FAMILY_DIR, 'source-bridges', file);
      requireFile(path);
      const shard = readJson(path);
      if (!Array.isArray(shard.entries)) fail(`${path}: entries must be an array`);
      for (const entry of shard.entries) {
        const tag = entry?.language_tag;
        if (typeof tag !== 'string' || !tag) fail(`${path}: source bridge missing language_tag`);
        if (allByTag.has(tag)) fail(`source bridges: duplicate language ${tag}`);
        if (typeof entry.summary !== 'string' || entry.summary.trim().length < 20) fail(`source bridge ${tag}: summary missing/too short`);
        if (typeof entry.tooltip !== 'string' || entry.tooltip.trim().length < 5) fail(`source bridge ${tag}: tooltip missing/too short`);
        allByTag.set(tag, entry);
        tierTags.add(tag);
      }
    }
    semanticByTier.set(tier, tierTags);
  }

  assertExactSet(new Set(allByTag.keys()), contractState.learnFrom, 'source bridges total coverage');
  assertExactSet(semanticByTier.get('1'), contractState.tier1, 'source bridges Tier 1');
  assertExactSet(semanticByTier.get('2'), contractState.tier2, 'source bridges Tier 2');
  assertExactSet(semanticByTier.get('3'), contractState.tier3, 'source bridges Tier 3');
  if (manifest.expected_total !== 104 || manifest.expected_tier_counts?.['3'] !== 83) fail('source bridge manifest must declare current 104 / Tier 3=83 coverage');
  return allByTag;
}

function inferLocalizationFormat(entry) {
  if (entry?.copy?.invitation && entry?.copy?.idea_text) return 'extended_v1';
  return 'compact_core_v1';
}

function localizationScore(entry) {
  return inferLocalizationFormat(entry) === 'extended_v1' ? 2 : 1;
}

function validateCoreLocalizations(contractState) {
  requireFile(CORE_MANIFEST_PATH);
  const manifest = readJson(CORE_MANIFEST_PATH);
  const resolved = new Map();
  const allOccurrences = new Map();

  for (const file of manifest.storage_shards ?? []) {
    const path = join(FAMILY_DIR, 'core-localizations', file);
    requireFile(path);
    const shard = readJson(path);
    if (!Array.isArray(shard.entries)) fail(`${path}: entries must be an array`);
    for (const entry of shard.entries) {
      const tag = entry?.language_tag;
      if (typeof tag !== 'string' || !tag) fail(`${path}: localization missing language_tag`);
      allOccurrences.set(tag, (allOccurrences.get(tag) ?? 0) + 1);
      const current = resolved.get(tag);
      if (!current || localizationScore(entry) > localizationScore(current)) resolved.set(tag, entry);
    }
  }

  assertExactSet(new Set(resolved.keys()), contractState.learnFrom, 'core lesson localizations');

  const extended = manifest.formats?.extended_v1;
  const compact = manifest.formats?.compact_core_v1;
  for (const [tag, entry] of resolved) {
    const format = inferLocalizationFormat(entry);
    const contract = format === 'extended_v1' ? extended : compact;
    if (!contract) fail(`core localization ${tag}: missing manifest contract for ${format}`);
    for (const key of contract.required_copy_keys ?? []) {
      if (typeof entry.copy?.[key] !== 'string' || entry.copy[key].trim().length < 2) fail(`core localization ${tag}: missing copy.${key}`);
    }
    for (const key of contract.required_runtime_keys ?? []) {
      if (typeof entry.runtime_copy?.[key] !== 'string' || entry.runtime_copy[key].trim().length < 1) fail(`core localization ${tag}: missing runtime_copy.${key}`);
    }
  }

  const resolvedTier1 = new Set([...resolved.keys()].filter((tag) => contractState.tier1.has(tag)));
  const resolvedTier2 = new Set([...resolved.keys()].filter((tag) => contractState.tier2.has(tag)));
  const resolvedTier3 = new Set([...resolved.keys()].filter((tag) => contractState.tier3.has(tag)));
  assertExactSet(resolvedTier1, contractState.tier1, 'core localizations Tier 1');
  assertExactSet(resolvedTier2, contractState.tier2, 'core localizations Tier 2');
  assertExactSet(resolvedTier3, contractState.tier3, 'core localizations Tier 3');

  if (resolved.get('nl') && inferLocalizationFormat(resolved.get('nl')) !== 'extended_v1') {
    fail('Dutch should resolve to its existing extended localization even though it is now Tier 3');
  }
  if (!resolved.has('mk')) fail('Macedonian core localization is required');
  return resolved;
}

function validateTargetProfileEntry(entry) {
  const tag = entry.language_tag;
  if (typeof entry.target_explainer_en !== 'string' || entry.target_explainer_en.trim().length < 80) fail(`target profile ${tag}: target_explainer_en missing/too short`);
  if (!Array.isArray(entry.distinctions) || entry.distinctions.length < 2) fail(`target profile ${tag}: expected at least 2 distinctions`);
  if (!Array.isArray(entry.core_terms) || entry.core_terms.length < 8) fail(`target profile ${tag}: expected at least 8 core_terms`);
  const concepts = new Set();
  for (const term of entry.core_terms) {
    if (typeof term?.concept !== 'string' || !term.concept) fail(`target profile ${tag}: term missing concept`);
    if (concepts.has(term.concept)) fail(`target profile ${tag}: duplicate term concept ${term.concept}`);
    concepts.add(term.concept);
    if (typeof term.display !== 'string' || !term.display.trim()) fail(`target profile ${tag}: term ${term.concept} missing display`);
  }
  if (typeof entry.cultural_note_en !== 'string' || entry.cultural_note_en.trim().length < 50) fail(`target profile ${tag}: cultural_note_en missing/too short`);
  if (!Array.isArray(entry.examples) || entry.examples.length < 2) fail(`target profile ${tag}: expected at least 2 examples`);
  if (!Array.isArray(entry.source_refs) || entry.source_refs.length < 1 || entry.source_refs.some((ref) => typeof ref !== 'string' || !ref.trim())) fail(`target profile ${tag}: source_refs required`);
}

function validateTargetProfiles(contractState) {
  requireFile(TARGET_MANIFEST_PATH);
  const manifest = readJson(TARGET_MANIFEST_PATH);
  const profiles = new Map();
  for (const file of manifest.base_shards ?? []) {
    const path = join(FAMILY_DIR, 'target-profiles', file);
    requireFile(path);
    const shard = readJson(path);
    if (!Array.isArray(shard.entries)) fail(`${path}: entries must be an array`);
    for (const entry of shard.entries) {
      if (!entry?.language_tag) fail(`${path}: target profile missing language_tag`);
      profiles.set(entry.language_tag, entry);
    }
  }

  const overridePath = join(FAMILY_DIR, 'target-profiles', manifest.current_registry_overrides ?? '');
  requireFile(overridePath);
  const overrides = readJson(overridePath);
  for (const tag of overrides.disabled_full_target_language_tags ?? []) profiles.delete(tag);
  for (const entry of overrides.entries ?? []) profiles.set(entry.language_tag, entry);

  assertExactSet(new Set(profiles.keys()), contractState.fullTargets, 'resolved target profiles');
  if (profiles.has('nl') || !profiles.has('mk')) fail('target profile current-registry guard failed for nl/mk');
  for (const entry of profiles.values()) validateTargetProfileEntry(entry);
  return profiles;
}

function validateCapability(contractState) {
  requireFile(CAPABILITY_PATH);
  const capability = readJson(CAPABILITY_PATH);
  const declared = setOf(capability.role_requirements?.learning_language_full?.language_tags, 'Family Members full-target capability list');
  assertExactSet(declared, contractState.fullTargets, 'Family Members capability vs language contract');
  if (capability.role_requirements?.learning_from?.expected_total !== 104) fail('Family Members source capability must declare 104 source languages');
}

function validateSiblingRegistryWhenAvailable(contractState) {
  const registryPath = process.env.GEF_LANGUAGE_SUPPORT_REGISTRY ? resolve(process.env.GEF_LANGUAGE_SUPPORT_REGISTRY) : DEFAULT_REGISTRY;
  if (!existsSync(registryPath)) {
    console.log(`Family Members: sibling Expo registry unavailable; enforcing pinned local contract from ${contractState.contract.source_registry_commit}.`);
    return;
  }
  const registry = readJson(registryPath);
  const tier1 = setOf(registry.lessonTiers?.tier1_full, 'Expo registry tier1_full');
  const tier2 = setOf(registry.lessonTiers?.tier2_selective, 'Expo registry tier2_selective');
  const tier3 = setOf(registry.lessonTiers?.tier3_read_games, 'Expo registry tier3_read_games');
  const learnFrom = setOf(registry.programs?.learnFromLanguages, 'Expo registry learnFromLanguages');
  assertExactSet(tier1, contractState.tier1, 'Family Members vs Expo Tier 1');
  assertExactSet(tier2, contractState.tier2, 'Family Members vs Expo Tier 2');
  assertExactSet(tier3, contractState.tier3, 'Family Members vs Expo Tier 3');
  assertExactSet(learnFrom, contractState.learnFrom, 'Family Members vs Expo learnFromLanguages');
}

function main() {
  for (const path of [LESSON_PATH, EN_RENDERING_PATH]) requireFile(path);
  const contractState = validateContract();
  const sourceBridges = validateSourceBridges(contractState);
  const coreLocalizations = validateCoreLocalizations(contractState);
  const targetProfiles = validateTargetProfiles(contractState);
  validateCapability(contractState);
  validateSiblingRegistryWhenAvailable(contractState);

  const lesson = readJson(LESSON_PATH);
  const rendering = readJson(EN_RENDERING_PATH);
  if (lesson.lesson_id !== 'LES.mul.vocab.family_members') fail('Unexpected Family Members lesson_id');
  if (rendering.lesson_id !== lesson.lesson_id) fail('English Family Members rendering lesson_id mismatch');

  console.log(`OK — Family Members: ${sourceBridges.size} source bridges, ${coreLocalizations.size} resolved core localizations, ${targetProfiles.size} current full targets, exact 6/15/83 registry contract.`);
}

try { main(); } catch (error) {
  console.error(`FAMILY MEMBERS VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
