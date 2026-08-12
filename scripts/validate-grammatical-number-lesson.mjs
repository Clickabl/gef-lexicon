#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY_DIR = join(ROOT, 'lesson-families', 'grammatical-number-systems');
const CAPABILITY_PATH = join(FAMILY_DIR, 'language-capabilities.json');
const MANIFEST_PATH = join(FAMILY_DIR, 'comparison-records', 'manifest.json');
const GRAMMAR_PATH = join(ROOT, 'grammar', 'grammatical-number.json');
const LESSON_PATH = join(ROOT, 'lessons', 'mul', 'grammatical-number', 'lesson.json');
const RENDERING_PATH = join(ROOT, 'lessons', 'mul', 'grammatical-number', 'renderings', 'en.json');
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

function sameMembers(expected, actual) {
  const a = [...expected].sort((x, y) => x.localeCompare(y));
  const b = [...actual].sort((x, y) => x.localeCompare(y));
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function main() {
  for (const path of [CAPABILITY_PATH, MANIFEST_PATH, GRAMMAR_PATH, LESSON_PATH, RENDERING_PATH]) {
    if (!existsSync(path)) fail(`Missing grammatical-number lesson input: ${path}`);
  }

  const capability = readJson(CAPABILITY_PATH);
  const manifest = readJson(MANIFEST_PATH);
  const grammar = readJson(GRAMMAR_PATH);
  const lesson = readJson(LESSON_PATH);
  const rendering = readJson(RENDERING_PATH);

  const familyId = 'LES.mul.noun.grammatical_number';
  const grammarId = 'GRAMSET.mul.grammatical_number';
  if (capability.lesson_family_id !== familyId || manifest.lesson_family_id !== familyId || grammar.lesson_family_id !== familyId || lesson.lesson_id !== familyId || rendering.lesson_id !== familyId) {
    fail('Grammatical-number artifacts do not share the canonical lesson family ID');
  }
  if (capability.grammar_set_id !== grammarId || grammar.grammar_set_id !== grammarId || lesson.grammar_set_id !== grammarId) {
    fail('Grammatical-number artifacts do not share the canonical grammar-set ID');
  }

  const tierEntries = new Map();
  const allComparisonEntries = [];
  for (const tier of [1, 2, 3]) {
    const shardName = manifest.tier_shards?.[String(tier)];
    if (!shardName) fail(`Comparison manifest is missing Tier ${tier}`);
    const shard = readJson(join(FAMILY_DIR, 'comparison-records', shardName));
    if (shard.tier !== tier) fail(`${shardName}: expected tier ${tier}, found ${shard.tier}`);
    if (!Array.isArray(shard.entries)) fail(`${shardName}: entries must be an array`);
    const expectedCount = manifest.expected_tier_counts?.[String(tier)];
    if (shard.entries.length !== expectedCount) fail(`${shardName}: expected ${expectedCount} entries, found ${shard.entries.length}`);

    for (const entry of shard.entries) {
      if (typeof entry.language_tag !== 'string' || !entry.language_tag) fail(`${shardName}: language_tag is required`);
      if (!Array.isArray(entry.forms) || entry.forms.length === 0) fail(`${entry.language_tag}: comparison forms[] must not be empty`);
      if (typeof entry.own_grammar_blurb !== 'string' || !entry.own_grammar_blurb.trim()) fail(`${entry.language_tag}: own_grammar_blurb must not be empty`);
      for (const form of entry.forms) {
        if (typeof form.form_id !== 'string' || !form.form_id) fail(`${entry.language_tag}: comparison form_id is required`);
        if (typeof form.display !== 'string' || !form.display.trim()) fail(`${entry.language_tag}: comparison display is required`);
      }
    }
    unique(shard.entries.map((entry) => entry.language_tag), `Tier ${tier} comparisons`);
    tierEntries.set(tier, shard.entries);
    allComparisonEntries.push(...shard.entries);
  }

  const comparisonTags = unique(allComparisonEntries.map((entry) => entry.language_tag), 'all comparison records');
  if (comparisonTags.size !== manifest.expected_total) fail(`Expected ${manifest.expected_total} comparison languages, found ${comparisonTags.size}`);
  if (manifest.expected_total !== 104) fail(`Pinned grammatical-number comparison total must be 104, found ${manifest.expected_total}`);

  const full = capability.support_levels?.full?.language_tags;
  const comparisonOnly = capability.support_levels?.comparison_only?.language_tags;
  if (!Array.isArray(full) || !Array.isArray(comparisonOnly)) fail('Capability manifest must explicitly list full and comparison_only language tags');
  const fullSet = unique(full, 'full target support');
  const comparisonOnlySet = unique(comparisonOnly, 'comparison-only source support');
  if (fullSet.size !== 21) fail(`Expected 21 Tier 1+2 target languages, found ${fullSet.size}`);
  if (comparisonOnlySet.size !== 83) fail(`Expected 83 Tier 3 comparison-only languages, found ${comparisonOnlySet.size}`);
  for (const tag of fullSet) if (comparisonOnlySet.has(tag)) fail(`${tag}: cannot be both full and comparison_only`);
  if (fullSet.size + comparisonOnlySet.size !== 104) fail('Full and comparison-only sets must cover all 104 learn-from languages');
  for (const tag of [...fullSet, ...comparisonOnlySet]) if (!comparisonTags.has(tag)) fail(`${tag}: capability language is missing its native comparison record`);

  const grammarLanguages = grammar.languages ?? [];
  const grammarTags = unique(grammarLanguages.map((language) => language.language_tag), 'grammar languages');
  if (grammarTags.size !== 21 || !sameMembers(full, grammarTags)) fail('Grammar set must contain exactly the 21 full target languages');
  for (const language of grammarLanguages) {
    if (language.lesson_ready !== true) fail(`${language.language_tag}: full target grammar must be lesson_ready`);
    if (!Array.isArray(language.forms) || language.forms.length === 0) fail(`${language.language_tag}: full target grammar needs at least one form`);
    const rules = language.forms.flatMap((form) => form.rules ?? []);
    if (rules.length === 0) fail(`${language.language_tag}: full target grammar needs at least one structured rule`);
    const ruleIds = rules.map((rule) => rule.rule_id);
    if (new Set(ruleIds).size !== ruleIds.length) fail(`${language.language_tag}: duplicate rule IDs inside language grammar`);
    for (const rule of rules) {
      if (typeof rule.summary_en !== 'string' || !rule.summary_en.trim()) fail(`${rule.rule_id}: summary_en is required`);
      if (!Array.isArray(rule.tips_en) || rule.tips_en.length === 0) fail(`${rule.rule_id}: at least one tip is required`);
    }
  }

  const spanish = grammarLanguages.find((language) => language.language_tag === 'es');
  const spanishRules = new Set(spanish?.forms?.flatMap((form) => form.rules?.map((rule) => rule.rule_id) ?? []) ?? []);
  for (const required of ['RULE.es.number.plural_s', 'RULE.es.number.plural_es', 'RULE.es.number.invariant_nouns', 'RULE.es.number.agreement']) {
    if (!spanishRules.has(required)) fail(`English→Spanish reference lesson is missing ${required}`);
  }

  const registryPath = process.env.GEF_LANGUAGE_SUPPORT_REGISTRY
    ? resolve(process.env.GEF_LANGUAGE_SUPPORT_REGISTRY)
    : DEFAULT_REGISTRY;
  if (existsSync(registryPath)) {
    const registry = readJson(registryPath);
    if (registry.schemaVersion !== 4) fail(`Expected Expo language registry schemaVersion 4, found ${registry.schemaVersion}`);
    const tier1 = registry.lessonTiers?.tier1_full;
    const tier2 = registry.lessonTiers?.tier2_selective;
    const tier3 = registry.lessonTiers?.tier3_read_games;
    const learnFrom = registry.programs?.learnFromLanguages;
    for (const [label, values] of [['tier1_full', tier1], ['tier2_selective', tier2], ['tier3_read_games', tier3], ['learnFromLanguages', learnFrom]]) {
      if (!Array.isArray(values)) fail(`Expo registry is missing ${label}`);
    }
    if (!sameMembers(tier1, tierEntries.get(1).map((entry) => entry.language_tag))) fail('Tier 1 comparison records do not match the canonical Expo registry');
    if (!sameMembers(tier2, tierEntries.get(2).map((entry) => entry.language_tag))) fail('Tier 2 comparison records do not match the canonical Expo registry');
    if (!sameMembers(tier3, tierEntries.get(3).map((entry) => entry.language_tag))) fail('Tier 3 comparison records do not match the canonical Expo registry');
    if (!sameMembers([...tier1, ...tier2], full)) fail('Full target support must exactly equal current Tier 1 + Tier 2');
    if (!sameMembers(tier3, comparisonOnly)) fail('Comparison-only support must exactly equal current Tier 3');
    if (!sameMembers(learnFrom, [...full, ...comparisonOnly])) fail('Lesson support must exactly cover programs.learnFromLanguages');
    console.log(`OK — grammatical number: ${learnFrom.length} source comparisons, ${full.length} full grammar targets, ${comparisonOnly.length} Tier 3 source-only languages.`);
    return;
  }

  console.log(`OK — grammatical number: ${comparisonTags.size} source comparisons, ${full.length} full grammar targets, ${comparisonOnly.length} Tier 3 source-only languages. Expo registry not present; pinned 6/15/83 checks used.`);
}

try {
  main();
} catch (error) {
  console.error(`GRAMMATICAL NUMBER VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
