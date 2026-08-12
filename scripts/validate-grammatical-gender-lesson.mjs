#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY_DIR = join(ROOT, 'lesson-families', 'grammatical-gender');
const CAPABILITY_PATH = join(FAMILY_DIR, 'language-capabilities.json');
const COMPARISON_MANIFEST_PATH = join(FAMILY_DIR, 'comparison-records', 'manifest.json');
const SOURCE_MANIFEST_PATH = join(FAMILY_DIR, 'source-copy', 'manifest.json');
const GRAMMAR_PATH = join(ROOT, 'grammar', 'grammatical-gender.json');
const LESSON_PATH = join(ROOT, 'lessons', 'mul', 'grammatical-gender', 'lesson.json');
const EN_RENDERING_PATH = join(ROOT, 'lessons', 'mul', 'grammatical-gender', 'renderings', 'en.json');
const DEFAULT_REGISTRY = resolve(ROOT, '..', 'gef-expo', 'registry', 'language-support.json');

function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function fail(message) { throw new Error(message); }
function unique(values, label) {
  const set = new Set();
  for (const value of values) {
    if (set.has(value)) fail(`${label}: duplicate language tag ${value}`);
    set.add(value);
  }
  return set;
}
function sameMembers(a, b) {
  const left = [...a].sort((x, y) => x.localeCompare(y));
  const right = [...b].sort((x, y) => x.localeCompare(y));
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
function shardNames(spec) {
  if (typeof spec === 'string' && spec) return [spec];
  if (Array.isArray(spec) && spec.every((value) => typeof value === 'string' && value)) return spec;
  return [];
}
function loadTieredCatalog(manifestPath, label) {
  const manifest = readJson(manifestPath);
  const dir = dirname(manifestPath);
  const byTier = new Map();
  const all = [];
  for (const tier of [1, 2, 3]) {
    const names = shardNames(manifest.tier_shards?.[String(tier)]);
    if (names.length === 0) fail(`${label}: missing Tier ${tier} shard(s)`);
    const tierEntries = [];
    for (const name of names) {
      const path = join(dir, name);
      if (!existsSync(path)) fail(`${label}: missing shard ${path}`);
      const shard = readJson(path);
      if (Number(shard.tier) !== tier) fail(`${label}: ${name} declares tier ${shard.tier}, expected ${tier}`);
      if (!Array.isArray(shard.entries)) fail(`${label}: ${name} entries must be an array`);
      tierEntries.push(...shard.entries);
    }
    const expected = manifest.expected_tier_counts?.[String(tier)];
    if (Number.isInteger(expected) && tierEntries.length !== expected) {
      fail(`${label}: Tier ${tier} expected ${expected} entries, found ${tierEntries.length}`);
    }
    unique(tierEntries.map((entry) => entry.language_tag), `${label} Tier ${tier}`);
    byTier.set(tier, tierEntries);
    all.push(...tierEntries);
  }
  const tags = unique(all.map((entry) => entry.language_tag), `${label} all tiers`);
  if (Number.isInteger(manifest.expected_total) && tags.size !== manifest.expected_total) {
    fail(`${label}: expected ${manifest.expected_total} unique languages, found ${tags.size}`);
  }
  return { manifest, byTier, all, tags };
}

function validateComparisonEntry(entry) {
  if (typeof entry.language_tag !== 'string' || !entry.language_tag) fail('comparison entry missing language_tag');
  if (!Array.isArray(entry.forms) || entry.forms.length === 0) fail(`${entry.language_tag}: comparison forms[] must not be empty`);
  for (const form of entry.forms) {
    if (typeof form.form_id !== 'string' || !form.form_id) fail(`${entry.language_tag}: comparison form_id is required`);
    if (typeof form.display !== 'string' || !form.display.trim()) fail(`${entry.language_tag}: comparison display is required`);
  }
  if (typeof entry.system_type !== 'string' || !entry.system_type) fail(`${entry.language_tag}: system_type is required`);
  if (!Array.isArray(entry.gender_categories)) fail(`${entry.language_tag}: gender_categories must be an array`);
  if (!Array.isArray(entry.agreement_targets)) fail(`${entry.language_tag}: agreement_targets must be an array`);
  if (!Array.isArray(entry.source_refs) || entry.source_refs.length === 0 || entry.source_refs.some((ref) => typeof ref !== 'string' || !ref)) {
    fail(`${entry.language_tag}: at least one research source_ref is required`);
  }
  if (typeof entry.note_en !== 'string' || !entry.note_en.trim()) fail(`${entry.language_tag}: note_en is required`);
  if (entry.review_state !== 'candidate' && entry.review_state !== 'approved') fail(`${entry.language_tag}: unexpected comparison review_state ${entry.review_state}`);
}

function validateSourceEntry(entry) {
  for (const field of ['language_tag', 'title', 'body', 'culture_note', 'practice', 'quest', 'completion']) {
    if (typeof entry[field] !== 'string' || !entry[field].trim()) fail(`${entry.language_tag ?? '<unknown>'}: source-copy ${field} is required`);
  }
}

function main() {
  for (const path of [CAPABILITY_PATH, COMPARISON_MANIFEST_PATH, SOURCE_MANIFEST_PATH, GRAMMAR_PATH, LESSON_PATH, EN_RENDERING_PATH]) {
    if (!existsSync(path)) fail(`Missing grammatical-gender input: ${path}`);
  }

  const capability = readJson(CAPABILITY_PATH);
  const comparison = loadTieredCatalog(COMPARISON_MANIFEST_PATH, 'comparison records');
  const source = loadTieredCatalog(SOURCE_MANIFEST_PATH, 'source copy');
  const grammar = readJson(GRAMMAR_PATH);
  const lesson = readJson(LESSON_PATH);
  const rendering = readJson(EN_RENDERING_PATH);

  const familyId = 'LES.mul.grammar.grammatical_gender';
  const grammarId = 'GRAMSET.mul.grammatical_gender';
  if (capability.lesson_family_id !== familyId || comparison.manifest.lesson_family_id !== familyId || source.manifest.lesson_family_id !== familyId || grammar.lesson_family_id !== familyId || lesson.lesson_id !== familyId || rendering.lesson_id !== familyId) {
    fail('Grammatical-gender artifacts do not share the canonical lesson family ID');
  }
  if (capability.grammar_set_id !== grammarId || grammar.grammar_set_id !== grammarId || lesson.grammar_set_id !== grammarId) {
    fail('Grammatical-gender artifacts do not share the canonical grammar-set ID');
  }

  if (comparison.manifest.expected_total !== 104 || source.manifest.expected_total !== 104) fail('Comparison and source-copy manifests must both pin 104 languages');
  for (const entry of comparison.all) validateComparisonEntry(entry);
  for (const entry of source.all) validateSourceEntry(entry);
  if (!sameMembers(comparison.tags, source.tags)) fail('Comparison and source-copy language sets must match exactly');

  const full = capability.support_levels?.full?.language_tags;
  const comparisonOnly = capability.support_levels?.comparison_only?.language_tags;
  const unavailable = capability.support_levels?.unavailable?.language_tags ?? [];
  if (!Array.isArray(full) || !Array.isArray(comparisonOnly) || !Array.isArray(unavailable)) fail('Capability support levels must explicitly list full/comparison_only/unavailable');
  const fullSet = unique(full, 'full target support');
  const comparisonOnlySet = unique(comparisonOnly, 'comparison-only support');
  if (fullSet.size !== 21) fail(`Expected 21 Tier 1+2 full targets, found ${fullSet.size}`);
  if (comparisonOnlySet.size !== 83) fail(`Expected 83 Tier 3 comparison-only languages, found ${comparisonOnlySet.size}`);
  if (unavailable.length !== 0) fail('No canonical learn-from language should be unavailable for the core source/comparison layer');
  for (const tag of fullSet) if (comparisonOnlySet.has(tag)) fail(`${tag}: cannot be both full and comparison_only`);
  if (!sameMembers([...fullSet, ...comparisonOnlySet], comparison.tags)) fail('Capability full + comparison_only sets must exactly cover all 104 comparison records');
  if (!sameMembers(fullSet, [...(comparison.byTier.get(1) ?? []), ...(comparison.byTier.get(2) ?? [])].map((entry) => entry.language_tag))) {
    fail('Full support must exactly equal comparison Tier 1 + Tier 2');
  }
  if (!sameMembers(comparisonOnlySet, (comparison.byTier.get(3) ?? []).map((entry) => entry.language_tag))) {
    fail('Comparison-only support must exactly equal comparison Tier 3');
  }

  const grammarLanguages = grammar.languages ?? [];
  const grammarTags = unique(grammarLanguages.map((language) => language.language_tag), 'grammar languages');
  if (!sameMembers(grammarTags, fullSet)) fail('Grammar set must contain exactly the 21 full target languages');
  for (const language of grammarLanguages) {
    if (language.lesson_ready !== true) fail(`${language.language_tag}: full target grammar must be lesson_ready`);
    if (!Array.isArray(language.forms) || language.forms.length === 0) fail(`${language.language_tag}: full target grammar needs a form`);
    const rules = language.forms.flatMap((form) => form.rules ?? []);
    if (rules.length === 0) fail(`${language.language_tag}: full target grammar needs structured rules`);
    const ids = rules.map((rule) => rule.rule_id);
    if (new Set(ids).size !== ids.length) fail(`${language.language_tag}: duplicate rule IDs`);
    for (const rule of rules) {
      if (typeof rule.summary_en !== 'string' || !rule.summary_en.trim()) fail(`${rule.rule_id}: summary_en is required`);
      if (!Array.isArray(rule.tips_en) || rule.tips_en.length === 0) fail(`${rule.rule_id}: tips_en must not be empty`);
    }
  }

  const spanish = grammarLanguages.find((language) => language.language_tag === 'es');
  const spanishForms = new Set(spanish?.forms?.map((form) => form.form_id) ?? []);
  const spanishRules = new Set(spanish?.forms?.flatMap((form) => form.rules?.map((rule) => rule.rule_id) ?? []) ?? []);
  for (const form of ['GRAMFORM.es.gender.el', 'GRAMFORM.es.gender.la']) if (!spanishForms.has(form)) fail(`Spanish target missing ${form}`);
  for (const rule of ['RULE.es.gender.masculine_agreement', 'RULE.es.gender.feminine_agreement']) if (!spanishRules.has(rule)) fail(`Spanish target missing ${rule}`);
  if (spanishForms.size !== 2) fail('Spanish generic cloze pool must remain the defensible el/la pair; neuter and ending clues belong in prose/rule data, not insertable choices');

  const registryPath = process.env.GEF_LANGUAGE_SUPPORT_REGISTRY ? resolve(process.env.GEF_LANGUAGE_SUPPORT_REGISTRY) : DEFAULT_REGISTRY;
  if (existsSync(registryPath)) {
    const registry = readJson(registryPath);
    const tier1 = registry.lessonTiers?.tier1_full;
    const tier2 = registry.lessonTiers?.tier2_selective;
    const tier3 = registry.lessonTiers?.tier3_read_games;
    const learnFrom = registry.programs?.learnFromLanguages;
    for (const [label, values] of [['tier1_full', tier1], ['tier2_selective', tier2], ['tier3_read_games', tier3], ['learnFromLanguages', learnFrom]]) {
      if (!Array.isArray(values)) fail(`Expo registry is missing ${label}`);
    }
    if (!sameMembers(tier1, (comparison.byTier.get(1) ?? []).map((entry) => entry.language_tag))) fail('Gender comparison Tier 1 does not match Expo registry');
    if (!sameMembers(tier2, (comparison.byTier.get(2) ?? []).map((entry) => entry.language_tag))) fail('Gender comparison Tier 2 does not match Expo registry');
    if (!sameMembers(tier3, (comparison.byTier.get(3) ?? []).map((entry) => entry.language_tag))) fail('Gender comparison Tier 3 does not match Expo registry');
    if (!sameMembers(learnFrom, comparison.tags)) fail('Gender comparison coverage does not exactly match programs.learnFromLanguages');
  }

  console.log(`OK — grammatical gender: ${comparison.tags.size} source/comparison languages, ${source.tags.size} localized source shells, ${fullSet.size} full grammar targets, ${comparisonOnlySet.size} Tier 3 source/game languages.`);
}

try { main(); } catch (error) {
  console.error(`GRAMMATICAL GENDER VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
