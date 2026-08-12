#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY_DIR = join(ROOT, 'lesson-families', 'multiple-words-for-for');
const CAPABILITY_PATH = join(FAMILY_DIR, 'language-capabilities.json');
const GRAMMAR_PATH = join(ROOT, 'grammar', 'for-equivalents.json');
const DEFAULT_REGISTRY = resolve(ROOT, '..', 'gef-expo', 'registry', 'language-support.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function fail(message) {
  throw new Error(message);
}

function unique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) fail(`${label}: duplicate language tag ${value}`);
    seen.add(value);
  }
  return seen;
}

function loadComparisonCatalog(capability) {
  const relative = capability.comparison_record_catalog ?? capability.comparison_blurb_catalog;
  if (typeof relative !== 'string' || relative.length === 0) {
    fail('Capability manifest must declare comparison_record_catalog');
  }
  const manifestPath = resolve(FAMILY_DIR, relative);
  if (!existsSync(manifestPath)) fail(`Missing comparison-record manifest: ${manifestPath}`);
  const manifest = readJson(manifestPath);
  if (manifest.lesson_family_id !== capability.lesson_family_id) {
    fail('Capability manifest and comparison-record manifest must belong to the same lesson family');
  }

  const entries = [];
  const tierEntries = new Map();
  for (const tier of ['1', '2', '3', '4']) {
    const shardName = manifest.tier_shards?.[tier];
    if (typeof shardName !== 'string' || shardName.length === 0) {
      fail(`Comparison-record manifest is missing tier ${tier} shard`);
    }
    const shardPath = join(dirname(manifestPath), shardName);
    if (!existsSync(shardPath)) fail(`Missing comparison-record tier ${tier} shard: ${shardPath}`);
    const shard = readJson(shardPath);
    if (String(shard.tier) !== tier) fail(`${shardPath}: tier does not match manifest slot ${tier}`);
    if (shard.lesson_family_id !== capability.lesson_family_id) {
      fail(`${shardPath}: lesson_family_id mismatch`);
    }
    if (!Array.isArray(shard.entries)) fail(`${shardPath}: entries must be an array`);
    const expectedCount = manifest.expected_tier_counts?.[tier];
    if (Number.isInteger(expectedCount) && shard.entries.length !== expectedCount) {
      fail(`${shardPath}: expected ${expectedCount} records, found ${shard.entries.length}`);
    }

    for (const [index, entry] of shard.entries.entries()) {
      const prefix = `${shardPath}: entries[${index}]`;
      if (typeof entry.language_tag !== 'string' || entry.language_tag.length === 0) {
        fail(`${prefix}: language_tag is required`);
      }
      if (!Array.isArray(entry.forms) || entry.forms.length === 0) {
        fail(`${prefix} (${entry.language_tag}): forms must contain at least one representative form/construction`);
      }
      for (const [formIndex, form] of entry.forms.entries()) {
        if (!form || typeof form !== 'object') fail(`${prefix}: forms[${formIndex}] must be an object`);
        if (typeof form.form_id !== 'string' || form.form_id.length === 0) {
          fail(`${prefix}: forms[${formIndex}].form_id is required`);
        }
        if (typeof form.display !== 'string' || form.display.length === 0) {
          fail(`${prefix}: forms[${formIndex}].display is required`);
        }
      }
      if (typeof entry.comparison_blurb !== 'string' || entry.comparison_blurb.trim().length === 0) {
        fail(`${prefix} (${entry.language_tag}): comparison_blurb is required`);
      }
      if (!['generated', 'research_required', 'audit_passed', 'community_verified', 'professional_verified'].includes(entry.review_state ?? shard.review_state)) {
        fail(`${prefix} (${entry.language_tag}): invalid review_state`);
      }
      entries.push(entry);
    }
    tierEntries.set(tier, shard.entries);
  }

  const tags = unique(entries.map((entry) => entry.language_tag), 'comparison records');
  if (Number.isInteger(manifest.expected_total) && tags.size !== manifest.expected_total) {
    fail(`Comparison-record manifest expects ${manifest.expected_total} unique languages, found ${tags.size}`);
  }
  return { manifest, entries, tags, tierEntries };
}

function main() {
  for (const path of [CAPABILITY_PATH, GRAMMAR_PATH]) {
    if (!existsSync(path)) fail(`Missing required lesson capability input: ${path}`);
  }

  const capability = readJson(CAPABILITY_PATH);
  const grammar = readJson(GRAMMAR_PATH);
  const comparisonCatalog = loadComparisonCatalog(capability);

  if (capability.lesson_family_id !== grammar.lesson_family_id) {
    fail('Capability manifest and grammar set must belong to the same lesson family');
  }
  if (capability.grammar_set_id !== grammar.grammar_set_id) {
    fail('Capability manifest grammar_set_id does not match grammar set');
  }

  const full = capability.support_levels?.full?.language_tags;
  if (!Array.isArray(full)) fail('support_levels.full.language_tags must be an array');
  const fullSet = unique(full, 'full support');

  const unavailable = capability.support_levels?.unavailable?.language_tags ?? [];
  if (!Array.isArray(unavailable)) fail('support_levels.unavailable.language_tags must be an array');
  const unavailableSet = unique(unavailable, 'unavailable support');

  const expectedFull = capability.expected_full_support_language_tags ?? [];
  if (!Array.isArray(expectedFull)) fail('expected_full_support_language_tags must be an array');
  const expectedFullSet = unique(expectedFull, 'expected full support');

  const pendingGroups = capability.pending_full_support_research ?? [];
  const pending = pendingGroups.flatMap((group) => group.language_tags ?? []);
  const pendingSet = unique(pending, 'pending full-support research');

  for (const tag of fullSet) {
    if (unavailableSet.has(tag)) fail(`${tag}: cannot be both full and unavailable`);
    if (pendingSet.has(tag)) fail(`${tag}: full-support language must be removed from pending_full_support_research when promoted`);
  }

  for (const tag of expectedFullSet) {
    if (!fullSet.has(tag) && !pendingSet.has(tag)) {
      fail(`${tag}: expected full-support language is neither full nor explicitly pending research`);
    }
  }
  for (const tag of pendingSet) {
    if (!expectedFullSet.has(tag)) fail(`${tag}: pending full-support research is not in expected_full_support_language_tags`);
  }

  const grammarByTag = new Map((grammar.languages ?? []).map((language) => [language.language_tag, language]));
  for (const tag of fullSet) {
    const language = grammarByTag.get(tag);
    if (!language) fail(`${tag}: marked full but missing from grammar set`);
    if (language.lesson_ready !== true) fail(`${tag}: marked full but grammar record is not lesson_ready`);
    if (!Array.isArray(language.forms) || language.forms.length === 0) fail(`${tag}: marked full but has no forms`);
    const ruleCount = language.forms.reduce((count, form) => count + (Array.isArray(form.rules) ? form.rules.length : 0), 0);
    if (ruleCount === 0) fail(`${tag}: marked full but has no structured rules`);
  }

  const registryPath = process.env.GEF_LANGUAGE_SUPPORT_REGISTRY
    ? resolve(process.env.GEF_LANGUAGE_SUPPORT_REGISTRY)
    : DEFAULT_REGISTRY;

  if (existsSync(registryPath)) {
    const registry = readJson(registryPath);
    const registered = registry.programs?.learnFromLanguages;
    if (!Array.isArray(registered)) fail('Registry is missing programs.learnFromLanguages');
    const registeredSet = new Set(registered);

    if (comparisonCatalog.manifest.expected_total !== registered.length) {
      fail(`Comparison-record manifest expects ${comparisonCatalog.manifest.expected_total}, registry has ${registered.length}`);
    }
    if (comparisonCatalog.tags.size !== registered.length || registered.some((tag) => !comparisonCatalog.tags.has(tag))) {
      fail('Comparison-record catalog must contain every canonical learn-from language exactly once');
    }

    const tierMap = {
      '1': registry.lessonTiers?.tier1_full ?? [],
      '2': registry.lessonTiers?.tier2_high ?? [],
      '3': registry.lessonTiers?.tier3_opportunistic ?? [],
      '4': registry.lessonTiers?.tier4_learn_from ?? [],
    };
    for (const tier of ['1', '2', '3', '4']) {
      const expected = tierMap[tier];
      const actual = comparisonCatalog.tierEntries.get(tier) ?? [];
      const actualSet = new Set(actual.map((entry) => entry.language_tag));
      if (actualSet.size !== expected.length || expected.some((tag) => !actualSet.has(tag))) {
        fail(`Comparison-record tier ${tier} does not exactly match the canonical registry tier`);
      }
    }

    for (const tag of [...fullSet, ...pendingSet, ...unavailableSet]) {
      if (!registeredSet.has(tag)) fail(`${tag}: lesson capability references a language outside programs.learnFromLanguages`);
    }

    // Global lesson tiers are planning expectations only. They must never be
    // treated as runtime full-support flags; this check merely keeps the desired
    // Tier 1+2 expectation list aligned with the current registry.
    const tier12 = [...tierMap['1'], ...tierMap['2']];
    const tier12Set = new Set(tier12);
    if (tier12Set.size !== expectedFullSet.size || [...tier12Set].some((tag) => !expectedFullSet.has(tag))) {
      fail('expected_full_support_language_tags must match the current Tier 1 + Tier 2 planning set');
    }

    const researchRequiredCount = comparisonCatalog.entries.filter((entry) => entry.review_state === 'research_required').length;
    console.log(`OK — ${registered.length} comparison records; ${fullSet.size} full grammar languages; ${pendingSet.size} planned-full pending; ${researchRequiredCount} comparison records explicitly require more research.`);
    return;
  }

  console.log(`OK — ${comparisonCatalog.tags.size} comparison records; ${fullSet.size} full grammar languages; ${pendingSet.size} planned-full pending. Expo registry not present; cross-repo checks skipped.`);
}

try {
  main();
} catch (error) {
  console.error(`LESSON LANGUAGE CAPABILITY VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
