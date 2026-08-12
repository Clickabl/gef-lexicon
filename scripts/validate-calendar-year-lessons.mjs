#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY_ROOT = join(ROOT, 'lesson-families', 'calendar-year');
const CAPABILITY_PATH = join(FAMILY_ROOT, 'language-capabilities.json');
const BLURB_MANIFEST_PATH = join(FAMILY_ROOT, 'support-blurbs', 'manifest.json');
const DEFAULT_REGISTRY = resolve(ROOT, '..', 'gef-expo', 'registry', 'language-support.json');

const TOPICS = {
  days_of_week: {
    knowledge: join(ROOT, 'knowledge-sets', 'days-of-week.json'),
    lesson: join(ROOT, 'lessons', 'mul', 'days-of-the-week', 'lesson.json'),
    rendering: join(ROOT, 'lessons', 'mul', 'days-of-the-week', 'renderings', 'en.json'),
    family: join(ROOT, 'lesson-families', 'days-of-the-week', 'family.json'),
    lessonId: 'LES.mul.time.days_of_week',
    knowledgeSetId: 'KNOWSET.mul.calendar.days_of_week',
    canonicalCount: 7,
  },
  months_of_year: {
    knowledge: join(ROOT, 'knowledge-sets', 'months-of-year.json'),
    lesson: join(ROOT, 'lessons', 'mul', 'months-of-the-year', 'lesson.json'),
    rendering: join(ROOT, 'lessons', 'mul', 'months-of-the-year', 'renderings', 'en.json'),
    family: join(ROOT, 'lesson-families', 'months-of-the-year', 'family.json'),
    lessonId: 'LES.mul.time.months_of_year',
    knowledgeSetId: 'KNOWSET.mul.calendar.months_of_year',
    canonicalCount: 12,
  },
  seasons: {
    knowledge: join(ROOT, 'knowledge-sets', 'seasons.json'),
    lesson: join(ROOT, 'lessons', 'mul', 'seasons', 'lesson.json'),
    rendering: join(ROOT, 'lessons', 'mul', 'seasons', 'renderings', 'en.json'),
    family: join(ROOT, 'lesson-families', 'seasons-of-the-year', 'family.json'),
    lessonId: 'LES.mul.time.seasons',
    knowledgeSetId: 'KNOWSET.mul.calendar.seasons',
    canonicalCount: 4,
  },
};

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const fail = (message) => { throw new Error(message); };
const sameSet = (a, b) => a.size === b.size && [...a].every((value) => b.has(value));

function requireFile(path) {
  if (!existsSync(path)) fail(`Missing calendar-year asset: ${path}`);
}

function tagsOf(entries, label) {
  if (!Array.isArray(entries)) fail(`${label}: entries must be an array`);
  const tags = new Set();
  for (const [index, entry] of entries.entries()) {
    if (!entry || typeof entry !== 'object') fail(`${label}[${index}] must be an object`);
    if (typeof entry.language_tag !== 'string' || entry.language_tag.length === 0) fail(`${label}[${index}] missing language_tag`);
    if (tags.has(entry.language_tag)) fail(`${label}: duplicate language_tag ${entry.language_tag}`);
    tags.add(entry.language_tag);
  }
  return tags;
}

function loadBlurbs() {
  requireFile(BLURB_MANIFEST_PATH);
  const manifest = readJson(BLURB_MANIFEST_PATH);
  if (!Array.isArray(manifest.shards) || manifest.shards.length === 0) fail('support-blurbs manifest must list shards');

  const all = [];
  const byTier = new Map([['1', []], ['2', []], ['3', []]]);
  for (const shardRef of manifest.shards) {
    const tier = String(shardRef.tier);
    if (!byTier.has(tier)) fail(`support-blurbs manifest has unsupported tier ${tier}`);
    const shardPath = join(FAMILY_ROOT, 'support-blurbs', shardRef.path);
    requireFile(shardPath);
    const shard = readJson(shardPath);
    if (String(shard.tier) !== tier) fail(`${shardRef.path}: tier does not match manifest`);
    if (!Array.isArray(shard.entries)) fail(`${shardRef.path}: entries must be an array`);
    if (Number.isInteger(shardRef.expected_count) && shard.entries.length !== shardRef.expected_count) {
      fail(`${shardRef.path}: expected ${shardRef.expected_count} entries, found ${shard.entries.length}`);
    }
    byTier.get(tier).push(...shard.entries);
    all.push(...shard.entries);
  }

  const allTags = tagsOf(all, 'calendar-year support blurbs');
  if (allTags.size !== manifest.expected_total) fail(`support blurbs: expected ${manifest.expected_total} unique languages, found ${allTags.size}`);
  for (const tier of ['1', '2', '3']) {
    const tierTags = tagsOf(byTier.get(tier), `calendar-year source tier ${tier}`);
    const expected = manifest.expected_tier_counts?.[tier];
    if (Number.isInteger(expected) && tierTags.size !== expected) fail(`source tier ${tier}: expected ${expected}, found ${tierTags.size}`);
  }

  for (const entry of all) {
    for (const topic of Object.keys(TOPICS)) {
      if (typeof entry[topic] !== 'string' || entry[topic].trim().length < 12) {
        fail(`support blurb ${entry.language_tag}: ${topic} is missing or too short`);
      }
    }
    if (entry.review_state !== 'candidate') fail(`support blurb ${entry.language_tag}: generated copy must remain candidate`);
    if (entry.trust_state !== 'machine_translated') fail(`support blurb ${entry.language_tag}: generated copy must remain machine_translated`);
  }

  return { manifest, all, allTags, byTier };
}

function validateSystem(system, canonicalKeys, label) {
  if (!system || typeof system !== 'object') fail(`${label}: system must be an object`);
  if (typeof system.system_id !== 'string' || system.system_id.length === 0) fail(`${label}: missing system_id`);
  if (!Array.isArray(system.terms) || system.terms.length === 0) fail(`${label}: terms must not be empty`);
  if (system.terms.some((term) => typeof term !== 'string' || term.trim().length === 0)) fail(`${label}: every term must be a non-empty string`);

  const keys = Array.isArray(system.concept_keys) ? system.concept_keys : canonicalKeys;
  if (keys.length !== system.terms.length) fail(`${label}: concept key count ${keys.length} does not match term count ${system.terms.length}`);
  if (new Set(keys).size !== keys.length) fail(`${label}: concept keys must be unique`);

  for (const field of ['readings', 'transliterations']) {
    if (system[field] !== undefined) {
      if (!Array.isArray(system[field]) || system[field].length !== system.terms.length) {
        fail(`${label}: ${field} length must equal terms length`);
      }
    }
  }

  for (const [field, map] of [['variants', system.variants], ['format_forms', system.format_forms]]) {
    if (map === undefined) continue;
    if (!map || typeof map !== 'object' || Array.isArray(map)) fail(`${label}: ${field} must be an object`);
    for (const key of Object.keys(map)) {
      if (!keys.includes(key)) fail(`${label}: ${field} uses unknown concept key ${key}`);
      if (!Array.isArray(map[key]) || map[key].length === 0) fail(`${label}: ${field}.${key} must be a non-empty array`);
    }
  }
}

function validateKnowledgeSet(topic, spec, expectedTargetTags) {
  requireFile(spec.knowledge);
  const knowledge = readJson(spec.knowledge);
  if (knowledge.knowledge_set_id !== spec.knowledgeSetId) fail(`${topic}: unexpected knowledge_set_id`);
  if (knowledge.topic !== topic) fail(`${topic}: topic field mismatch`);
  if (!Array.isArray(knowledge.canonical_concept_keys) || knowledge.canonical_concept_keys.length !== spec.canonicalCount) {
    fail(`${topic}: expected ${spec.canonicalCount} canonical concept keys`);
  }
  const canonicalKeys = knowledge.canonical_concept_keys;
  if (new Set(canonicalKeys).size !== canonicalKeys.length) fail(`${topic}: canonical concept keys must be unique`);
  if (JSON.stringify(knowledge.target_language_policy?.allowed_lesson_tiers) !== JSON.stringify([1, 2])) {
    fail(`${topic}: target policy must be exactly Tier 1 + Tier 2`);
  }

  const recordTags = tagsOf(knowledge.language_records, `${topic} language records`);
  if (!sameSet(recordTags, expectedTargetTags)) fail(`${topic}: language records must exactly match Tier 1 + Tier 2 target coverage`);

  for (const record of knowledge.language_records) {
    if (!Array.isArray(record.systems) || record.systems.length === 0) fail(`${topic}/${record.language_tag}: systems must not be empty`);
    const systemIds = new Set(record.systems.map((system) => system.system_id));
    if (!systemIds.has(record.primary_system_id)) fail(`${topic}/${record.language_tag}: primary_system_id not found in systems`);
    for (const system of record.systems) validateSystem(system, canonicalKeys, `${topic}/${record.language_tag}/${system.system_id}`);
    if (record.review_state !== 'candidate') fail(`${topic}/${record.language_tag}: generated record must remain candidate`);
  }
  return knowledge;
}

function validateLessonGraph(topic, spec) {
  for (const path of [spec.lesson, spec.rendering, spec.family]) requireFile(path);
  const lesson = readJson(spec.lesson);
  const rendering = readJson(spec.rendering);
  const family = readJson(spec.family);

  if (lesson.lesson_id !== spec.lessonId) fail(`${topic}: lesson_id mismatch`);
  if (lesson.knowledge_set_id !== spec.knowledgeSetId) fail(`${topic}: lesson knowledge_set_id mismatch`);
  if (lesson.target_language !== 'mul') fail(`${topic}: reusable lesson target_language must be mul`);
  if (lesson.difficulty_band !== 'A1') fail(`${topic}: expected A1 difficulty`);
  if (!lesson.curriculum_concept_ids?.includes('CURR.DATES_TIME')) fail(`${topic}: lesson must link CURR.DATES_TIME`);

  if (family.lesson_family_id !== spec.lessonId) fail(`${topic}: family id mismatch`);
  if (family.knowledge_set_id !== spec.knowledgeSetId) fail(`${topic}: family knowledge_set_id mismatch`);
  const familyBlockTypes = new Set((family.block_plan ?? []).map((block) => block.block_type));
  if (!familyBlockTypes.has('ordered_term_set')) fail(`${topic}: family must use ordered_term_set`);
  if (!familyBlockTypes.has('cultural_context')) fail(`${topic}: family must include cultural_context`);

  if (rendering.lesson_id !== spec.lessonId) fail(`${topic}: English rendering lesson_id mismatch`);
  if (rendering.support_language_tag !== 'en') fail(`${topic}: worked rendering must use English support copy`);
  const termBlocks = (rendering.blocks ?? []).filter((block) => block.type === 'ordered_term_set');
  if (termBlocks.length !== 1 || termBlocks[0].knowledge_set_id !== spec.knowledgeSetId) {
    fail(`${topic}: English rendering must resolve exactly one matching ordered_term_set block`);
  }

  const modules = new Set((lesson.practice_modules ?? []).map((module) => module.module));
  if (!modules.has('ordered_sequence') && !modules.has('concept_term_match')) fail(`${topic}: expected ordered/concept practice primitive`);
}

function canonicalRegistrySets() {
  const registryPath = process.env.GEF_LANGUAGE_SUPPORT_REGISTRY
    ? resolve(process.env.GEF_LANGUAGE_SUPPORT_REGISTRY)
    : DEFAULT_REGISTRY;
  if (!existsSync(registryPath)) return null;

  const registry = readJson(registryPath);
  const tier1 = registry.lessonTiers?.tier1_full;
  const tier2 = registry.lessonTiers?.tier2_selective;
  const tier3 = registry.lessonTiers?.tier3_read_games;
  const learnFrom = registry.programs?.learnFromLanguages;
  if (![tier1, tier2, tier3, learnFrom].every(Array.isArray)) {
    fail('Registry must expose lessonTiers.tier1_full, tier2_selective, tier3_read_games, and programs.learnFromLanguages');
  }
  return { tier1, tier2, tier3, learnFrom };
}

function validateRegistry(blurbs, capability, expectedTargetTags) {
  const registry = canonicalRegistrySets();
  if (!registry) {
    console.log('Calendar-year registry cross-check skipped: sibling gef-expo registry not present.');
    return;
  }

  const learnFromSet = new Set(registry.learnFrom);
  if (!sameSet(blurbs.allTags, learnFromSet)) fail('Support blurbs must contain every canonical learn-from language exactly once');

  for (const [tier, expected] of [['1', registry.tier1], ['2', registry.tier2], ['3', registry.tier3]]) {
    const actual = new Set(blurbs.byTier.get(tier).map((entry) => entry.language_tag));
    if (!sameSet(actual, new Set(expected))) fail(`Support-blurb tier ${tier} does not exactly match the current canonical registry`);
  }

  const canonicalTarget = new Set([...registry.tier1, ...registry.tier2]);
  if (!sameSet(expectedTargetTags, canonicalTarget)) fail('Calendar-year full target list must exactly equal current Tier 1 + Tier 2');
  if (registry.tier3.some((tag) => expectedTargetTags.has(tag))) fail('Tier 3 language leaked into full calendar-year target coverage');

  if (capability.best_language_policy?.expected_total !== registry.learnFrom.length) fail('Capability expected_total does not match canonical learn-from count');
}

function main() {
  requireFile(CAPABILITY_PATH);
  const capability = readJson(CAPABILITY_PATH);
  const declaredTargets = capability.learning_language_policy?.expected_language_tags;
  if (!Array.isArray(declaredTargets)) fail('Calendar-year capability must declare expected target language tags');
  const expectedTargetTags = new Set(declaredTargets);
  if (expectedTargetTags.size !== 21) fail(`Calendar-year capability expected 21 full targets, found ${expectedTargetTags.size}`);
  if (JSON.stringify(capability.learning_language_policy?.allowed_tiers) !== JSON.stringify([1, 2])) fail('Calendar-year capability must allow exactly Tiers 1 and 2 as full targets');

  const blurbs = loadBlurbs();
  if (blurbs.allTags.size !== 104) fail(`Expected 104 source/explanation languages, found ${blurbs.allTags.size}`);

  for (const [topic, spec] of Object.entries(TOPICS)) {
    validateKnowledgeSet(topic, spec, expectedTargetTags);
    validateLessonGraph(topic, spec);
  }

  validateRegistry(blurbs, capability, expectedTargetTags);
  console.log(`OK — calendar-year lessons: 3 lessons, ${expectedTargetTags.size} full target languages each, ${blurbs.allTags.size} source-language blurbs, 0 asset errors.`);
}

try {
  main();
} catch (error) {
  console.error(`CALENDAR-YEAR VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
