#!/usr/bin/env node
// Validates curriculum-v2: schemas, identities, references, and the Meet-a-language facts contract
// (curriculum-v2/INTRO_FACTS.md) for every Tier 1 language in the gef-expo language registry.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CURRICULUM = join(ROOT, 'curriculum-v2');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
let errors = 0;
const fail = (message) => { console.error(`FAIL: ${message}`); errors += 1; };

const ajv = new Ajv({ allErrors: true, strict: false });
const validators = {
  topic: ajv.compile(readJson(join(ROOT, 'schemas', 'curriculum-topic.schema.json'))),
  realization: ajv.compile(readJson(join(ROOT, 'schemas', 'language-realization.schema.json'))),
  localization: ajv.compile(readJson(join(ROOT, 'schemas', 'topic-localization.schema.json'))),
  bridge: ajv.compile(readJson(join(ROOT, 'schemas', 'topic-bridge-note.schema.json'))),
};
function check(kind, value, where) {
  if (!validators[kind](value)) fail(`${where}: ${JSON.stringify(validators[kind].errors)}`);
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.json')) out.push(full);
  }
  return out;
}
const rel = (path) => relative(ROOT, path);

// ---- Controlled vocabularies (INTRO_FACTS.md) -------------------------------------------------
const FACETS = new Set([
  'first_word', 'family_tree', 'where_spoken', 'relation_to_best', 'family_check',
  'script_intro', 'new_letters', 'marks_and_punctuation', 'letter_check',
  'sound_overview', 'tricky_sounds', 'listen_pick', 'sound_check',
  'trait_differences', 'trait_similarities', 'trait_check',
  'shared_words', 'false_friends', 'shared_words_check',
]);
const REGIONS = new Set(['europe', 'americas', 'africa', 'asia', 'oceania']);
const MARK_ROLES = new Set(['stress', 'sound_change', 'pronounce_vowel', 'vowel_quality']);
const MARK_IDS = new Set(['acute', 'grave', 'circumflex', 'diaeresis', 'tilde', 'cedilla', 'tonos', 'dialytika']);
const STRESS = new Set(['rule_with_written_accents', 'mostly_penultimate', 'phrase_final', 'marked_on_every_word', 'unpredictable']);
const PREDICTABILITY = new Set(['high', 'medium', 'low']);
const TRAITS = {
  noun_gender: ['none', 'two', 'three'],
  articles: ['none', 'definite_indefinite', 'definite_only'],
  formal_you: ['none', 'distinct'],
  verb_endings: ['few', 'many'],
  subject_pronouns: ['required', 'often_dropped'],
  adjective_position: ['before_noun', 'after_noun', 'either'],
  cases: ['none', 'pronouns_only', 'some'],
  word_order: ['svo', 'flexible'],
  questions: ['auxiliary_do', 'intonation_or_inversion'],
};
const BRANCH_TOPIC_KEYS = ['language_overview', 'writing_system', 'sound_system', 'grammar_glance'];

// ---- Topics -----------------------------------------------------------------------------------
const index = readJson(join(CURRICULUM, 'topics', 'index.json'));
const topicsById = new Map();
for (const entry of index.topics ?? []) {
  const path = join(ROOT, entry.path);
  if (!existsSync(path)) { fail(`index entry ${entry.topic_id}: missing ${entry.path}`); continue; }
  const topic = readJson(path);
  check('topic', topic, rel(path));
  if (topic.topic_id !== entry.topic_id) fail(`${rel(path)}: topic_id ${topic.topic_id} does not match the index (${entry.topic_id})`);
  if (basename(path, '.json') !== String(topic.topic_key).replaceAll('_', '-')) fail(`${rel(path)}: file name must be the topic_key with dashes (${topic.topic_key})`);
  if (topicsById.has(topic.topic_id)) fail(`duplicate topic ${topic.topic_id}`);
  topicsById.set(topic.topic_id, topic);
  const ids = new Set();
  for (const scene of topic.experience_blueprint?.scene_sequence ?? []) {
    if (ids.has(scene.scene_id)) fail(`${rel(path)}: duplicate scene_id ${scene.scene_id}`);
    ids.add(scene.scene_id);
    if (scene.facet && !FACETS.has(scene.facet)) fail(`${rel(path)}: unknown facet ${scene.facet}`);
  }
}
for (const topic of topicsById.values()) {
  for (const id of topic.prerequisite_topic_ids ?? []) if (!topicsById.has(id)) fail(`${topic.topic_id}: unknown prerequisite ${id}`);
  for (const relation of topic.relations ?? []) if (!topicsById.has(relation.topic_id)) fail(`${topic.topic_id}: relation to unknown topic ${relation.topic_id}`);
}
const topicByKey = new Map([...topicsById.values()].map((topic) => [topic.topic_key, topic]));

// ---- Realizations -----------------------------------------------------------------------------
const realizations = new Map(); // `${lang}:${topicKey}` -> realization
for (const path of walk(join(CURRICULUM, 'realizations'))) {
  const realization = readJson(path);
  check('realization', realization, rel(path));
  const parts = relative(join(CURRICULUM, 'realizations'), path).split(/[\\/]/);
  if (realization.language_tag !== parts[0]) fail(`${rel(path)}: language_tag ${realization.language_tag} must match its directory`);
  const topic = topicsById.get(realization.topic_id);
  if (!topic) { fail(`${rel(path)}: unknown topic ${realization.topic_id}`); continue; }
  if (realization.realization_id !== `REAL.${realization.language_tag}.${topic.topic_key}`) fail(`${rel(path)}: realization_id must be REAL.${realization.language_tag}.${topic.topic_key}`);
  if (basename(path, '.json') !== topic.topic_key.replaceAll('_', '-')) fail(`${rel(path)}: file name must be the topic key with dashes`);
  const seen = new Set();
  for (const fact of realization.facts ?? []) {
    if (seen.has(fact.fact_id)) fail(`${rel(path)}: duplicate fact_id ${fact.fact_id}`);
    seen.add(fact.fact_id);
  }
  realizations.set(`${realization.language_tag}:${topic.topic_key}`, { realization, path });
}

// ---- Bridges ----------------------------------------------------------------------------------
const bridges = new Map(); // `${from}:${to}:${topicKey}` -> bridge
for (const path of walk(join(CURRICULUM, 'bridges'))) {
  const bridge = readJson(path);
  check('bridge', bridge, rel(path));
  const parts = relative(join(CURRICULUM, 'bridges'), path).split(/[\\/]/);
  if (bridge.from_language_tag !== parts[0] || bridge.to_language_tag !== parts[1]) fail(`${rel(path)}: from/to must match bridges/{from}/{to}/`);
  if (bridge.interface_language_tag !== bridge.from_language_tag) fail(`${rel(path)}: interface_language_tag must equal from_language_tag`);
  const topic = topicsById.get(bridge.topic_id);
  if (!topic) { fail(`${rel(path)}: unknown topic ${bridge.topic_id}`); continue; }
  const noteIds = new Set();
  for (const note of bridge.notes) {
    if (noteIds.has(note.note_id)) fail(`${rel(path)}: duplicate note_id ${note.note_id}`);
    noteIds.add(note.note_id);
    if (note.kind === 'false_friend') for (const pair of note.pairs ?? []) if (!pair.to_meaning) fail(`${rel(path)}: false friend ${pair.to} needs to_meaning`);
  }
  bridges.set(`${bridge.from_language_tag}:${bridge.to_language_tag}:${topic.topic_key}`, bridge);
}

// ---- Locales ----------------------------------------------------------------------------------
const locales = new Map(); // `${best}:${topicKey}` -> localization
for (const path of walk(join(CURRICULUM, 'locales'))) {
  const localization = readJson(path);
  check('localization', localization, rel(path));
  const parts = relative(join(CURRICULUM, 'locales'), path).split(/[\\/]/);
  if (localization.language_tag !== parts[0]) fail(`${rel(path)}: language_tag must match its directory`);
  const topic = topicsById.get(localization.topic_id);
  if (!topic) { fail(`${rel(path)}: unknown topic ${localization.topic_id}`); continue; }
  const sceneIds = new Set((topic.experience_blueprint?.scene_sequence ?? []).map((scene) => scene.scene_id));
  for (const key of Object.keys(localization.scene_copy ?? {})) if (!sceneIds.has(key)) fail(`${rel(path)}: scene_copy key ${key} is not a scene of ${topic.topic_id}`);
  locales.set(`${localization.language_tag}:${topic.topic_key}`, localization);
}

// ---- Tier 1 languages -------------------------------------------------------------------------
function tier1Languages() {
  const roots = [process.env.GEF_EXPO_ROOT, resolve(ROOT, '..', 'gef-expo')].filter(Boolean);
  for (const root of roots) {
    const path = join(root, 'registry', 'language-support.json');
    if (existsSync(path)) return readJson(path).lessonTiers?.tier1_full ?? [];
  }
  console.warn('WARN: gef-expo registry/language-support.json not found; Tier 1 coverage is not checked.');
  return [];
}

const fact = (entry, id) => entry?.realization.facts?.find((candidate) => candidate.fact_id === id);
const factsWith = (entry, prefix) => (entry?.realization.facts ?? []).filter((candidate) => candidate.fact_id.startsWith(prefix));
const isArrayOfStrings = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);
const isText = (value) => typeof value === 'string' && value.length > 0;

function requireCapabilities(entry, where, names) {
  for (const name of names) if (entry.realization.capabilities?.[name] !== true) fail(`${where}: capability ${name} must be true`);
}

function checkOverview(lang, entry) {
  const where = rel(entry.path);
  const genealogy = entry.realization.genealogy ?? {};
  if (!genealogy.family_id) fail(`${where}: genealogy.family_id is required`);
  for (const key of ['branch_ids', 'origin_region_ids']) if (!(genealogy[key]?.length > 0)) fail(`${where}: genealogy.${key} needs at least one entry`);
  const regions = fact(entry, 'reach.regions');
  if (!regions || !isArrayOfStrings(regions.value) || regions.value.length === 0 || !regions.value.every((region) => REGIONS.has(region))) fail(`${where}: reach.regions must list region ids from ${[...REGIONS].join(', ')}`);
  const words = ['hook.target', 'hook.decoy.1', 'hook.decoy.2'].map((id) => fact(entry, id)?.value);
  if (!words.every(isText)) fail(`${where}: hook.target, hook.decoy.1 and hook.decoy.2 are required`);
  else if (new Set(words).size !== 3) fail(`${where}: the three hook words must differ`);
  requireCapabilities(entry, where, ['explanation', 'comparison', 'recognition_practice']);
}

function checkWriting(lang, entry) {
  const where = rel(entry.path);
  const script = fact(entry, 'script.id')?.value;
  if (!isText(script)) fail(`${where}: script.id is required`);
  if (!['ltr', 'rtl'].includes(fact(entry, 'script.direction')?.value)) fail(`${where}: script.direction must be ltr or rtl`);
  if (typeof fact(entry, 'script.has_case')?.value !== 'boolean') fail(`${where}: script.has_case must be boolean`);
  const letters = fact(entry, 'alphabet.letters')?.value;
  if (!isArrayOfStrings(letters) || letters.length < 20) fail(`${where}: alphabet.letters must list the alphabet (at least 20 letters)`);
  if (isArrayOfStrings(letters) && new Set(letters).size !== letters.length) fail(`${where}: alphabet.letters has duplicates`);
  for (const id of ['alphabet.marked', 'punctuation.special']) if (!Array.isArray(fact(entry, id)?.value)) fail(`${where}: ${id} is required (it may be empty)`);
  const examples = factsWith(entry, 'alphabet.example.');
  for (const example of examples) {
    if (!isText(example.value) || !isText(example.qualifiers?.ipa) || !isText(example.qualifiers?.highlight)) fail(`${where}: ${example.fact_id} needs a word, qualifiers.ipa and qualifiers.highlight`);
  }
  const highlighted = new Set(examples.map((example) => example.qualifiers?.highlight));
  if (isArrayOfStrings(letters)) {
    for (const letter of letters) {
      const needsExample = script !== 'Latn' || !/^[a-z]$/u.test(letter);
      if (needsExample && !highlighted.has(letter)) fail(`${where}: letter ${letter} needs an alphabet.example.* with that highlight`);
    }
  }
  for (const mark of fact(entry, 'punctuation.special')?.value ?? []) if (!highlighted.has(mark)) fail(`${where}: punctuation ${mark} needs an alphabet.example.* with that highlight`);
  for (const mark of factsWith(entry, 'mark.')) {
    const q = mark.qualifiers ?? {};
    if (!MARK_IDS.has(q.mark_id) || !MARK_ROLES.has(q.role) || !isText(q.example) || !isText(q.example_ipa) || !isText(mark.value)) fail(`${where}: ${mark.fact_id} needs a letter value, mark_id (${[...MARK_IDS].join(', ')}), role (${[...MARK_ROLES].join(', ')}), example and example_ipa`);
  }
  requireCapabilities(entry, where, ['explanation', 'reviewed_examples', 'recognition_practice']);
}

function checkSounds(lang, entry) {
  const where = rel(entry.path);
  for (const id of ['sounds.consonants', 'sounds.vowels']) {
    const f = fact(entry, id);
    if (!f || !isArrayOfStrings(f.value) || f.value.length === 0 || !isText(f.qualifiers?.variety)) fail(`${where}: ${id} needs IPA symbols and qualifiers.variety`);
  }
  const tricky = factsWith(entry, 'sounds.tricky.');
  if (tricky.length < 3) fail(`${where}: at least three sounds.tricky.* facts are required`);
  for (const t of tricky) {
    const q = t.qualifiers ?? {};
    const silent = q.silent === true;
    if (!isText(t.value) || !isText(q.spelling) || !isText(q.word_ipa) || !isText(q.note_id) || (!silent && !isText(q.ipa))) fail(`${where}: ${t.fact_id} needs a word, spelling, word_ipa, note_id and ipa (unless silent)`);
  }
  const pairs = new Set(factsWith(entry, 'sounds.contrast.').map((f) => f.qualifiers?.pair));
  if (pairs.size < 1) fail(`${where}: at least one sounds.contrast pair is required`);
  for (const pair of pairs) {
    for (const side of ['a', 'b']) {
      const f = fact(entry, `sounds.contrast.${pair}.${side}`);
      if (!f || !isText(f.value) || !isText(f.qualifiers?.ipa)) fail(`${where}: sounds.contrast.${pair}.${side} needs a word and qualifiers.ipa`);
    }
  }
  if (!STRESS.has(fact(entry, 'stress.pattern')?.value)) fail(`${where}: stress.pattern must be one of ${[...STRESS].join(', ')}`);
  if (!PREDICTABILITY.has(fact(entry, 'spelling.predictability')?.value)) fail(`${where}: spelling.predictability must be high, medium or low`);
  requireCapabilities(entry, where, ['explanation', 'reviewed_examples', 'recognition_practice', 'listening']);
}

function checkGrammar(lang, entry) {
  const where = rel(entry.path);
  for (const [trait, values] of Object.entries(TRAITS)) {
    const f = fact(entry, `trait.${trait}`);
    if (!f || !values.includes(f.value)) { fail(`${where}: trait.${trait} must be one of ${values.join(', ')}`); continue; }
    const examples = factsWith(entry, `trait.${trait}.example.`);
    if (examples.length === 0 || !examples.every((example) => isText(example.value))) fail(`${where}: trait.${trait} needs at least one example`);
    const q = f.qualifiers ?? {};
    if (trait === 'formal_you' && f.value === 'distinct' && (!isText(q.informal) || !isText(q.formal))) fail(`${where}: trait.formal_you needs qualifiers.informal and .formal`);
    if (trait === 'noun_gender' && f.value !== 'none' && (!isArrayOfStrings(q.values) || q.values.length !== (f.value === 'two' ? 2 : 3))) fail(`${where}: trait.noun_gender needs qualifiers.values with ${f.value === 'two' ? 2 : 3} genders`);
    if (trait === 'verb_endings' && !isText(q.example_verb)) fail(`${where}: trait.verb_endings needs qualifiers.example_verb`);
  }
  const gender = fact(entry, 'trait.noun_gender');
  if (gender && gender.value !== 'none') {
    const nouns = factsWith(entry, 'noun.');
    if (nouns.length < 4) fail(`${where}: at least four noun.* facts are required for gender`);
    for (const noun of nouns) {
      const q = noun.qualifiers ?? {};
      if (!isText(noun.value) || !isText(q.article) || !(gender.qualifiers?.values ?? []).includes(q.gender)) fail(`${where}: ${noun.fact_id} needs a word, qualifiers.article and a qualifiers.gender from the trait's values`);
    }
  }
  requireCapabilities(entry, where, ['explanation', 'comparison', 'reviewed_examples', 'recognition_practice']);
}

function checkBridge(from, to, bridge) {
  const where = `bridge ${from} to ${to}`;
  const pairCount = bridge.notes.filter((note) => note.kind === 'helpful_transfer').reduce((sum, note) => sum + (note.pairs?.length ?? 0), 0);
  if (pairCount < 6) fail(`${where}: needs at least six look-alike pairs in helpful_transfer notes (has ${pairCount})`);
  if (!bridge.notes.some((note) => note.kind === 'false_friend' && (note.pairs?.length ?? 0) > 0)) fail(`${where}: needs a false_friend note with pairs`);
}

const CHECKS = { language_overview: checkOverview, writing_system: checkWriting, sound_system: checkSounds, grammar_glance: checkGrammar };
const tier1 = tier1Languages();
const interfaceLocales = [...new Set([...locales.keys()].map((key) => key.split(':')[0]))];

for (const lang of tier1) {
  for (const key of BRANCH_TOPIC_KEYS) {
    const entry = realizations.get(`${lang}:${key}`);
    if (!entry) { fail(`Tier 1 language ${lang} has no ${key} realization`); continue; }
    CHECKS[key](lang, entry);
  }
  for (const best of interfaceLocales) {
    if (best === lang) continue;
    const bridge = bridges.get(`${best}:${lang}:shared_words`);
    if (!bridge) fail(`Tier 1 language ${lang} has no shared_words bridge from interface language ${best}`);
    else checkBridge(best, lang, bridge);
  }
}
// Non-Tier-1 realizations that carry branch facts still have to meet the same contract.
for (const [key, entry] of realizations) {
  const [lang, topicKey] = key.split(':');
  if (tier1.includes(lang) || !CHECKS[topicKey]) continue;
  if (topicKey === 'language_overview') continue; // existing genealogy-only files predate the contract
  CHECKS[topicKey](lang, entry);
}

// ---- Locale coverage: every id a Tier 1 fact can show has a label, every spoken example a gloss ---
const LABEL_FOR = {
  language_overview: (e) => {
    const g = e.realization.genealogy ?? {};
    return [`family.${g.family_id}`, ...(g.branch_ids ?? []).map((b) => `branch.${b}`), ...(fact(e, 'reach.regions')?.value ?? []).map((r) => `region.${r}`)];
  },
  writing_system: (e) => [`script.${fact(e, 'script.id')?.value}`, `direction.${fact(e, 'script.direction')?.value}`,
    ...factsWith(e, 'mark.').flatMap((m) => [`mark.${m.qualifiers?.mark_id}`, `markrole.${m.qualifiers?.role}`])],
  sound_system: (e) => [`stress.${fact(e, 'stress.pattern')?.value}`, `predictability.${fact(e, 'spelling.predictability')?.value}`,
    ...factsWith(e, 'sounds.tricky.').map((t) => `sound.${t.qualifiers?.note_id}`)],
  grammar_glance: (e) => Object.keys(TRAITS).flatMap((trait) => [`trait.${trait}.title`, `trait.${trait}.${fact(e, `trait.${trait}`)?.value}`]),
};
const GLOSSED_PREFIXES = {
  language_overview: ['hook.'],
  writing_system: ['alphabet.example.', 'mark.'],
  sound_system: ['sounds.tricky.', 'sounds.contrast.'],
  grammar_glance: ['trait.', 'noun.'],
};
for (const best of interfaceLocales) {
  const allLabels = new Set();
  for (const key of BRANCH_TOPIC_KEYS) for (const label of Object.keys(locales.get(`${best}:${key}`)?.labels ?? {})) allLabels.add(label);
  for (const label of ['relation.same_branch', 'relation.same_family', 'relation.different_family']) if (!allLabels.has(label)) fail(`locale ${best}: label ${label} is missing`);
  for (const lang of tier1) {
    for (const key of BRANCH_TOPIC_KEYS) {
      const entry = realizations.get(`${lang}:${key}`);
      const locale = locales.get(`${best}:${key}`);
      if (!entry || !locale) { if (entry && !locale) fail(`locale ${best} has no ${key} localization`); continue; }
      for (const label of LABEL_FOR[key](entry)) if (!(label in (locale.labels ?? {}))) fail(`locale ${best}/${key}: label ${label} is missing (needed by ${lang})`);
      for (const f of entry.realization.facts ?? []) {
        if (!GLOSSED_PREFIXES[key].some((prefix) => f.fact_id.startsWith(prefix))) continue;
        if (f.fact_kind !== 'term' || !isText(f.value) || Array.isArray(f.value)) continue;
        if (lang === best) continue; // an example in the learner's own language needs no gloss
        if (!((`${lang}:${f.fact_id}`) in (locale.glosses ?? {}))) fail(`locale ${best}/${key}: gloss ${lang}:${f.fact_id} is missing`);
      }
    }
  }
  for (const key of BRANCH_TOPIC_KEYS.concat('shared_words')) {
    const topic = topicByKey.get(key);
    const locale = locales.get(`${best}:${key}`);
    if (!locale) { if (key === 'shared_words') fail(`locale ${best} has no shared_words localization`); continue; }
    for (const scene of topic.experience_blueprint.scene_sequence) {
      if (!locale.scene_copy?.[scene.scene_id]?.title) fail(`locale ${best}/${key}: scene ${scene.scene_id} needs a title`);
    }
  }
}

if (errors) {
  console.error(`\n${errors} curriculum-v2 validation error(s).`);
  process.exit(1);
}
console.log(`OK — ${topicsById.size} topics, ${realizations.size} realizations, ${bridges.size} bridges, ${locales.size} localizations; Tier 1: ${tier1.join(', ') || 'not checked'}.`);
