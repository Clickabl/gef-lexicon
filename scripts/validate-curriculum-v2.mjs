#!/usr/bin/env node
// Validates curriculum-v2: schemas, identities, references, and the Meet-a-language slot contract
// (curriculum-v2/INTRO_FACTS.md, vocabularies in curriculum-v2/slots/slots.json).
//
// Which languages are held to the full contract: every Tier 1 language in the gef-expo registry, and every
// realization marked `completeness: "complete"`. Any other (draft) realization is checked for structure and
// vocabulary only; its unfilled slots are reported by `npm run curriculum:coverage`, never failed.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { BRANCH_TOPIC_KEYS, domainProblem, fixedSlots, genericLabelIds, labelIdsFor, layerIdsOf, loadSlots } from './lib/curriculum-slots.mjs';

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

// ---- Controlled vocabularies (slots.json) ------------------------------------------------------
const SLOTS = loadSlots(ROOT);
const FACETS = new Set([
  'first_word', 'family_tree', 'where_spoken', 'relation_to_best', 'family_check',
  'script_intro', 'glyph_tour',
  'glyph_board', 'glyph_group', 'glyph_review',
  'sound_overview', 'tone_overview', 'tricky_sounds', 'listen_pick', 'sound_check',
  'trait_differences', 'trait_similarities', 'trait_check',
  'shared_words', 'false_friends', 'shared_words_check',
]);
const MARK_IDS = new Set(SLOTS.writing.mark_ids);
const MARK_ROLES = new Set(SLOTS.writing.mark_roles);
const TRAITS = SLOTS.grammar.traits;
const SYMBOL_KINDS = new Set(SLOTS.writing.symbol_kinds);

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
  if (topic.fact_source_topic_id && !(index.topics ?? []).some((candidate) => candidate.topic_id === topic.fact_source_topic_id)) fail(`${rel(path)}: fact_source_topic_id ${topic.fact_source_topic_id} is not an indexed topic`);
  for (const scene of topic.experience_blueprint?.scene_sequence ?? []) {
    if (ids.has(scene.scene_id)) fail(`${rel(path)}: duplicate scene_id ${scene.scene_id}`);
    ids.add(scene.scene_id);
    if (scene.facet && !FACETS.has(scene.facet)) fail(`${rel(path)}: unknown facet ${scene.facet}`);
    const order = scene.facet_config?.trait_order;
    if (order !== undefined && JSON.stringify(order) !== JSON.stringify(SLOTS.grammar.trait_order)) fail(`${rel(path)}: scene ${scene.scene_id} facet_config.trait_order must equal slots.json grammar.trait_order`);
  }
}
for (const topic of topicsById.values()) {
  for (const id of topic.prerequisite_topic_ids ?? []) if (!topicsById.has(id)) fail(`${topic.topic_id}: unknown prerequisite ${id}`);
  for (const relation of topic.relations ?? []) if (!topicsById.has(relation.topic_id)) fail(`${topic.topic_id}: relation to unknown topic ${relation.topic_id}`);
}
const topicByKey = new Map([...topicsById.values()].map((topic) => [topic.topic_key, topic]));
if (JSON.stringify([...SLOTS.grammar.trait_order].sort()) !== JSON.stringify(Object.keys(TRAITS).sort())) fail('slots.json: grammar.trait_order must list exactly the grammar.traits');
for (const scene of topicByKey.get('grammar_glance')?.experience_blueprint.scene_sequence ?? []) {
  if ((scene.facet === 'trait_differences' || scene.facet === 'trait_similarities') && !scene.facet_config?.trait_order) fail(`grammar_glance scene ${scene.scene_id} needs facet_config.trait_order`);
}

// ---- Realizations -----------------------------------------------------------------------------
const realizations = new Map(); // `${lang}:${topicKey}` -> { realization, path }
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
const bridges = new Map(); // `${interface}:${from}:${to}:${topicKey}` -> bridge
for (const path of walk(join(CURRICULUM, 'bridges'))) {
  const bridge = readJson(path);
  check('bridge', bridge, rel(path));
  const parts = relative(join(CURRICULUM, 'bridges'), path).split(/[\\/]/);
  if (bridge.from_language_tag !== parts[0] || bridge.to_language_tag !== parts[1]) fail(`${rel(path)}: from/to must match bridges/{from}/{to}/`);
  const topic = topicsById.get(bridge.topic_id);
  if (!topic) { fail(`${rel(path)}: unknown topic ${bridge.topic_id}`); continue; }
  const noteIds = new Set();
  for (const note of bridge.notes) {
    if (noteIds.has(note.note_id)) fail(`${rel(path)}: duplicate note_id ${note.note_id}`);
    noteIds.add(note.note_id);
    for (const pair of note.pairs ?? []) if (!pair.from || !pair.to) fail(`${rel(path)}: note ${note.note_id} has a pair without from/to`);
    if (note.kind === 'false_friend') for (const pair of note.pairs ?? []) if (!pair.to_meaning) fail(`${rel(path)}: false friend ${pair.to} needs to_meaning`);
  }
  bridges.set(`${bridge.interface_language_tag}:${bridge.from_language_tag}:${bridge.to_language_tag}:${topic.topic_key}`, bridge);
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

// ---- Which languages are held to the full contract --------------------------------------------
function tier1Languages() {
  const explicit = process.env.GEF_LANGUAGE_SUPPORT_REGISTRY;
  const paths = explicit ? [resolve(explicit)] : [process.env.GEF_EXPO_ROOT, resolve(ROOT, '..', 'gef-expo')].filter(Boolean).map(root => join(root, 'registry', 'language-support.json'));
  for (const path of paths) {
    if (!existsSync(path)) {
      if (explicit) throw new Error('Configured canonical curriculum language registry is missing');
      continue;
    }
    const registry=readJson(path), languages=registry.programs?.learnFromLanguages, tier=registry.lessonTiers?.tier1_full;
    if(registry.canonicalSource!=='Clickabl/gef-expo/registry/language-support.json'||!Array.isArray(languages)||!languages.length||new Set(languages).size!==languages.length||languages.some(value=>typeof value!=='string'||!/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/u.test(value))||!Array.isArray(tier)||!tier.length||new Set(tier).size!==tier.length||tier.some(value=>!languages.includes(value)))throw new Error('Configured canonical curriculum language registry has invalid authority or tier membership');
    return tier;
  }
  console.warn('WARN: gef-expo registry/language-support.json not found; Tier 1 coverage is not checked.');
  return [];
}
const tier1 = tier1Languages();
const languagesWithBranchFacts = [...new Set([...realizations.keys()].map((key) => key.split(':')[0]))]
  .filter((lang) => BRANCH_TOPIC_KEYS.some((key) => key !== 'language_overview' && realizations.has(`${lang}:${key}`)));
const isComplete = (lang) => tier1.includes(lang)
  || BRANCH_TOPIC_KEYS.some((key) => realizations.get(`${lang}:${key}`)?.realization.completeness === 'complete');
const completeLanguages = languagesWithBranchFacts.filter(isComplete);

// ---- Fact helpers -----------------------------------------------------------------------------
const fact = (entry, id) => entry?.realization.facts?.find((candidate) => candidate.fact_id === id);
const factsWith = (entry, prefix) => (entry?.realization.facts ?? []).filter((candidate) => candidate.fact_id.startsWith(prefix));
const isArrayOfStrings = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);
const isText = (value) => typeof value === 'string' && value.length > 0;

function requireCapabilities(entry, where, names, complete) {
  if (!complete) return;
  for (const name of names) if (entry.realization.capabilities?.[name] !== true) fail(`${where}: capability ${name} must be true`);
}

/** Checks every fixed slot of a topic: present and typed when complete; typed when filled; null is "not filled". */
function checkFixedSlots(entry, topicKey, complete) {
  const where = rel(entry.path);
  for (const slot of fixedSlots(topicKey, SLOTS, layerIdsOf(entry.realization))) {
    const found = fact(entry, slot.id);
    if (!found) { if (complete) fail(`${where}: slot ${slot.id} is missing`); continue; }
    if (found.fact_kind !== slot.kind) fail(`${where}: ${slot.id} must have fact_kind ${slot.kind}`);
    if (found.value === null) { if (complete) fail(`${where}: slot ${slot.id} is not filled`); continue; }
    const problem = domainProblem(slot.domain, found.value);
    if (problem) fail(`${where}: ${slot.id} must be ${problem} (got ${JSON.stringify(found.value)})`);
    for (const qualifier of slot.qualifiers ?? []) if (!isText(found.qualifiers?.[qualifier])) fail(`${where}: ${slot.id} needs qualifiers.${qualifier}`);
  }
}

function checkOverview(lang, entry, complete) {
  const where = rel(entry.path);
  const genealogy = entry.realization.genealogy ?? {};
  if (complete) {
    if (!genealogy.family_id) fail(`${where}: genealogy.family_id is required`);
    for (const key of ['branch_ids', 'origin_region_ids']) if (!(genealogy[key]?.length > 0)) fail(`${where}: genealogy.${key} needs at least one entry`);
  }
  checkFixedSlots(entry, 'language_overview', complete);
  const words = ['hook.target', 'hook.decoy.1', 'hook.decoy.2'].map((id) => fact(entry, id)?.value).filter(isText);
  if (new Set(words).size !== words.length) fail(`${where}: the hook words must differ`);
  requireCapabilities(entry, where, ['explanation', 'comparison', 'recognition_practice'], complete);
}

function checkWriting(lang, entry, complete) {
  const where = rel(entry.path);
  // slots_version 2: the letter data the script lesson needs (a sound and a word for every symbol, teaching groups).
  const letters2 = complete && (entry.realization.slots_version ?? 1) >= 2;
  const layers = layerIdsOf(entry.realization);
  if (complete && layers.length === 0) fail(`${where}: writing.layers must list at least one layer`);
  if (layers.length > 4) fail(`${where}: at most four writing layers`);
  if (new Set(layers).size !== layers.length) fail(`${where}: writing.layers has duplicates`);
  checkFixedSlots(entry, 'writing_system', complete);
  const roles = layers.map((layer) => fact(entry, `writing.${layer}.role`)?.value);
  if (complete && roles.filter((role) => role === 'primary').length !== 1) fail(`${where}: exactly one writing layer must have role primary`);
  const declared = new Set(layers);
  for (const f of factsWith(entry, 'writing.')) {
    const layer = f.fact_id.split('.')[1];
    if (f.fact_id !== 'writing.layers' && !declared.has(layer)) fail(`${where}: ${f.fact_id} belongs to a layer that writing.layers does not list`);
  }
  for (const layer of layers) {
    const kind = fact(entry, `writing.${layer}.kind`)?.value;
    const script = fact(entry, `writing.${layer}.script`)?.value;
    const symbols = fact(entry, `writing.${layer}.symbols`)?.value;
    const examples = factsWith(entry, `writing.${layer}.example.`);
    for (const example of examples) {
      if (!isText(example.value) || !isText(example.qualifiers?.ipa) || !isText(example.qualifiers?.highlight)) fail(`${where}: ${example.fact_id} needs a value, qualifiers.ipa and qualifiers.highlight`);
      const forms = example.qualifiers?.forms;
      if (forms !== undefined && !(isArrayOfStrings(forms) && forms.length >= 2 && forms.length <= 4)) fail(`${where}: ${example.fact_id} qualifiers.forms must list two to four shapes`);
    }
    const highlighted = new Set(examples.map((example) => example.qualifiers?.highlight));
    if (kind === 'logographic') {
      if (Array.isArray(symbols) && symbols.length > 0) fail(`${where}: logographic layer ${layer} must have an empty symbols list`);
      if (complete && examples.length < 6) fail(`${where}: logographic layer ${layer} needs at least six example characters`);
    } else if (kind && !SYMBOL_KINDS.has(kind)) {
      fail(`${where}: layer ${layer} kind ${kind} cannot carry symbols`);
    } else if (Array.isArray(symbols)) {
      if (complete && symbols.length < 10) fail(`${where}: layer ${layer} symbols must list the inventory (at least 10)`);
      if (new Set(symbols).size !== symbols.length) fail(`${where}: layer ${layer} symbols has duplicates`);
      for (const symbol of symbols) {
        const plainLatin = script === 'Latn' && /^[a-z]$/u.test(symbol) && !letters2;
        if (complete && !plainLatin && !highlighted.has(symbol) && (kind !== 'romanization' || letters2)) fail(`${where}: symbol ${symbol} of layer ${layer} needs a writing.${layer}.example.* with that highlight`);
      }
    }
    if (letters2) {
      // Punctuation is shown and heard but has no sound of its own to state, and may need no transliteration.
      const punctuation = new Set(fact(entry, `writing.${layer}.punctuation`)?.value ?? []);
      for (const example of examples) {
        if (punctuation.has(example.qualifiers?.highlight)) continue;
        if (kind !== 'logographic' && !isText(example.qualifiers?.sound)) fail(`${where}: ${example.fact_id} needs qualifiers.sound (what the symbol itself sounds like)`);
        if ((script !== 'Latn' || kind === 'logographic') && !isText(example.qualifiers?.reading)) fail(`${where}: ${example.fact_id} needs qualifiers.reading (a Latin transliteration), the script of layer ${layer} is not Latin`);
      }
      const groups = factsWith(entry, `writing.${layer}.group.`);
      const members = groups.flatMap((group) => (isArrayOfStrings(group.value) ? group.value : []));
      for (const group of groups) if (!isArrayOfStrings(group.value) || group.value.length < 2 || group.value.length > 6) fail(`${where}: ${group.fact_id} must list two to six symbols`);
      if (new Set(members).size !== members.length) fail(`${where}: a symbol is in two groups of layer ${layer}`);
      const wanted = kind === 'logographic' ? [...highlighted] : (Array.isArray(symbols) ? symbols : []);
      for (const symbol of wanted) if (!members.includes(symbol)) fail(`${where}: symbol ${symbol} of layer ${layer} is in no writing.${layer}.group.*`);
      for (const member of members) if (!wanted.includes(member)) fail(`${where}: group member ${member} is not a symbol of layer ${layer}`);
    }
    for (const mark of fact(entry, `writing.${layer}.punctuation`)?.value ?? []) if (complete && !highlighted.has(mark)) fail(`${where}: punctuation ${mark} needs a writing.${layer}.example.* with that highlight`);
    for (const mark of factsWith(entry, `writing.${layer}.mark.`)) {
      const q = mark.qualifiers ?? {};
      if (!MARK_IDS.has(q.mark_id) || !MARK_ROLES.has(q.role) || !isText(q.example) || !isText(q.example_ipa) || !isText(mark.value)) fail(`${where}: ${mark.fact_id} needs a symbol value, mark_id (${[...MARK_IDS].join(', ')}), role (${[...MARK_ROLES].join(', ')}), example and example_ipa`);
    }
  }
  requireCapabilities(entry, where, ['explanation', 'reviewed_examples', 'recognition_practice'], complete);
}

function checkSounds(lang, entry, complete) {
  const where = rel(entry.path);
  checkFixedSlots(entry, 'sound_system', complete);
  const tricky = factsWith(entry, 'sounds.tricky.');
  if (complete && tricky.length < 3) fail(`${where}: at least three sounds.tricky.* facts are required`);
  for (const t of tricky) {
    const q = t.qualifiers ?? {};
    const silent = q.silent === true;
    if (!isText(t.value) || !isText(q.spelling) || !isText(q.word_ipa) || !isText(q.note_id) || (!silent && !isText(q.ipa))) fail(`${where}: ${t.fact_id} needs a word, spelling, word_ipa, note_id and ipa (unless silent)`);
  }
  const pairs = new Set(factsWith(entry, 'sounds.contrast.').map((f) => f.qualifiers?.pair));
  if (complete && pairs.size < 1) fail(`${where}: at least one sounds.contrast pair is required`);
  for (const pair of pairs) {
    for (const side of ['a', 'b']) {
      const f = fact(entry, `sounds.contrast.${pair}.${side}`);
      if (!f || !isText(f.value) || !isText(f.qualifiers?.ipa)) fail(`${where}: sounds.contrast.${pair}.${side} needs a word and qualifiers.ipa`);
    }
  }
  const tones = fact(entry, 'tones.system')?.value;
  const toneExamples = factsWith(entry, 'tones.example.');
  for (const tone of toneExamples) if (!isText(tone.value) || !isText(tone.qualifiers?.ipa) || !isText(tone.qualifiers?.tone_id)) fail(`${where}: ${tone.fact_id} needs a value, qualifiers.ipa and qualifiers.tone_id`);
  if (complete && typeof tones === 'string' && tones !== 'none' && toneExamples.length < 4) fail(`${where}: a tonal language needs at least four tones.example.* facts`);
  if (tones === 'none' && toneExamples.length > 0) fail(`${where}: tones.example.* facts need a tones.system other than none`);
  requireCapabilities(entry, where, ['explanation', 'reviewed_examples', 'recognition_practice', 'listening'], complete);
}

function checkGrammar(lang, entry, complete) {
  const where = rel(entry.path);
  checkFixedSlots(entry, 'grammar_glance', complete);
  for (const trait of Object.keys(TRAITS)) {
    const f = fact(entry, `trait.${trait}`);
    if (!f || typeof f.value !== 'string') continue;
    const examples = factsWith(entry, `trait.${trait}.example.`);
    if (complete && f.value !== 'none' && examples.length === 0) fail(`${where}: trait.${trait} needs at least one example`);
    if (!examples.every((example) => isText(example.value))) fail(`${where}: trait.${trait} examples need a value`);
    const q = f.qualifiers ?? {};
    if (trait === 'formal_you' && f.value === 'distinct' && (!isText(q.informal) || !isText(q.formal))) fail(`${where}: trait.formal_you needs qualifiers.informal and .formal`);
    if (trait === 'noun_gender' && (f.value === 'two' || f.value === 'three') && (!isArrayOfStrings(q.values) || q.values.length !== (f.value === 'two' ? 2 : 3))) fail(`${where}: trait.noun_gender needs qualifiers.values with ${f.value === 'two' ? 2 : 3} genders`);
    if (trait === 'noun_gender' && f.value === 'classes' && typeof q.count !== 'number') fail(`${where}: trait.noun_gender classes needs a numeric qualifiers.count`);
    if (trait === 'verb_endings' && f.value !== 'none' && !isText(q.example_verb)) fail(`${where}: trait.verb_endings needs qualifiers.example_verb`);
  }
  const gender = fact(entry, 'trait.noun_gender');
  if (gender && (gender.value === 'two' || gender.value === 'three')) {
    const nouns = factsWith(entry, 'noun.');
    if (complete && nouns.length < 4) fail(`${where}: at least four noun.* facts are required for gender`);
    for (const noun of nouns) {
      const q = noun.qualifiers ?? {};
      if (!isText(noun.value) || !isText(q.article) || !(gender.qualifiers?.values ?? []).includes(q.gender)) fail(`${where}: ${noun.fact_id} needs a word, qualifiers.article and a qualifiers.gender from the trait's values`);
    }
  }
  requireCapabilities(entry, where, ['explanation', 'comparison', 'reviewed_examples', 'recognition_practice'], complete);
}

function checkBridge(label, bridge) {
  const pairCount = bridge.notes.filter((note) => note.kind === 'helpful_transfer').reduce((sum, note) => sum + (note.pairs?.length ?? 0), 0);
  if (pairCount < 6) fail(`${label}: needs at least six pairs in helpful_transfer notes (has ${pairCount})`);
}

const CHECKS = { language_overview: checkOverview, writing_system: checkWriting, sound_system: checkSounds, grammar_glance: checkGrammar };

for (const lang of languagesWithBranchFacts) {
  const complete = isComplete(lang);
  for (const key of BRANCH_TOPIC_KEYS) {
    const entry = realizations.get(`${lang}:${key}`);
    if (!entry) { if (complete) fail(`language ${lang} must have a ${key} realization (it is ${tier1.includes(lang) ? 'Tier 1' : 'marked complete'})`); continue; }
    CHECKS[key](lang, entry, complete);
  }
}
for (const lang of tier1) if (!languagesWithBranchFacts.includes(lang)) fail(`Tier 1 language ${lang} has no branch realizations`);

const interfaceLocales = [...new Set([...locales.keys()].map((key) => key.split(':')[0]))];
for (const lang of completeLanguages) {
  for (const best of interfaceLocales) {
    if (best === lang) continue;
    const bridge = bridges.get(`${best}:${best}:${lang}:shared_words`);
    if (!bridge) fail(`language ${lang} has no shared_words bridge from interface language ${best}`);
    else checkBridge(`bridge ${best} to ${lang}`, bridge);
  }
}

// ---- Locale coverage ----------------------------------------------------------------------------
const GLOSSED_PREFIXES = {
  language_overview: ['hook.'],
  writing_system: ['writing.'],
  sound_system: ['sounds.tricky.', 'sounds.contrast.', 'tones.example.'],
  grammar_glance: ['trait.', 'noun.'],
};
const isGlossed = (key, factId) => GLOSSED_PREFIXES[key].some((prefix) => factId.startsWith(prefix))
  && (key !== 'writing_system' || /^writing\.[^.]+\.(example|mark)\./u.test(factId));
const generic = genericLabelIds(SLOTS);
for (const best of interfaceLocales) {
  for (const key of BRANCH_TOPIC_KEYS) {
    const locale = locales.get(`${best}:${key}`);
    if (!locale) { fail(`locale ${best} has no ${key} localization`); continue; }
    for (const label of generic[key] ?? []) if (!(label in (locale.labels ?? {}))) fail(`locale ${best}/${key}: label ${label} is missing`);
    for (const lang of completeLanguages) {
      const entry = realizations.get(`${lang}:${key}`);
      if (!entry) continue;
      for (const label of labelIdsFor(key, entry.realization, SLOTS)) if (!(label in (locale.labels ?? {}))) fail(`locale ${best}/${key}: label ${label} is missing (needed by ${lang})`);
      for (const f of entry.realization.facts ?? []) {
        if (!isGlossed(key, f.fact_id) || f.fact_kind !== 'term' || !isText(f.value) || Array.isArray(f.value)) continue;
        if (lang === best) continue; // an example in the learner's own language needs no gloss
        if (!(`${lang}:${f.fact_id}` in (locale.glosses ?? {}))) fail(`locale ${best}/${key}: gloss ${lang}:${f.fact_id} is missing`);
      }
    }
  }
  for (const label of generic.script_lesson ?? []) if (!(label in (locales.get(`${best}:script_lesson`)?.labels ?? {}))) fail(`locale ${best}/script_lesson: label ${label} is missing`);
  for (const key of BRANCH_TOPIC_KEYS.concat('shared_words', 'script_lesson')) {
    const topic = topicByKey.get(key);
    const locale = locales.get(`${best}:${key}`);
    if (!locale) { if (key === 'shared_words' || key === 'script_lesson') fail(`locale ${best} has no ${key} localization`); continue; }
    for (const scene of topic.experience_blueprint.scene_sequence) {
      if (!locale.scene_copy?.[scene.scene_id]?.title) fail(`locale ${best}/${key}: scene ${scene.scene_id} needs a title`);
    }
  }
}

// The app's house typography rule: no U+2014 in anything it shows, and this data is what it shows.
for (const file of walk(CURRICULUM)) if (readFileSync(file, 'utf8').includes('\u2014')) fail(`${rel(file)}: contains U+2014; use the punctuation the text needs (a symbol the lesson teaches is left out and noted in review/)`);

if (errors) {
  console.error(`\n${errors} curriculum-v2 validation error(s).`);
  process.exit(1);
}
const drafts = languagesWithBranchFacts.filter((lang) => !completeLanguages.includes(lang));
console.log(`OK — ${topicsById.size} topics, ${realizations.size} realizations, ${bridges.size} bridges, ${locales.size} localizations; complete: ${completeLanguages.join(', ') || 'none'}${drafts.length ? `; draft: ${drafts.join(', ')}` : ''}.`);
