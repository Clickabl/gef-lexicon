// The slots of the Meet-a-language contract (curriculum-v2/INTRO_FACTS.md), as data and as code that lists them.
// One place enumerates what a language description can fill; the validator, the coverage report and the skeleton
// generator all read it, so adding a language never means editing three scripts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function loadSlots(root) {
  return JSON.parse(readFileSync(join(root, 'curriculum-v2', 'slots', 'slots.json'), 'utf8'));
}

export const BRANCH_TOPIC_KEYS = ['language_overview', 'writing_system', 'sound_system', 'grammar_glance'];

const text = { type: 'text' };
const flag = { type: 'boolean' };
const list = (min = 0) => ({ type: 'list', min });
const oneOf = (values) => ({ type: 'enum', values });

/** Slot descriptors: { id, kind (fact_kind), domain, tier1Only? }. Repeating example facts are checked by the validator. */
export function fixedSlots(topicKey, slots, layerIds = []) {
  switch (topicKey) {
    case 'language_overview':
      return [
        { id: 'reach.regions', kind: 'category', domain: { type: 'enum-list', values: slots.regions } },
        { id: 'hook.target', kind: 'term', domain: text },
        { id: 'hook.decoy.1', kind: 'term', domain: text },
        { id: 'hook.decoy.2', kind: 'term', domain: text },
      ];
    case 'writing_system': {
      const out = [{ id: 'writing.layers', kind: 'term', domain: list(1) }];
      for (const layer of layerIds) {
        out.push(
          { id: `writing.${layer}.kind`, kind: 'category', domain: oneOf(slots.writing.layer_kinds) },
          { id: `writing.${layer}.script`, kind: 'category', domain: text },
          { id: `writing.${layer}.role`, kind: 'category', domain: oneOf(slots.writing.layer_roles) },
          { id: `writing.${layer}.direction`, kind: 'category', domain: oneOf(slots.writing.directions) },
          { id: `writing.${layer}.has_case`, kind: 'boolean', domain: flag },
          { id: `writing.${layer}.joined`, kind: 'boolean', domain: flag },
          { id: `writing.${layer}.vowels`, kind: 'category', domain: oneOf(slots.writing.vowels) },
          { id: `writing.${layer}.symbols`, kind: 'term', domain: list(0) },
          { id: `writing.${layer}.marked`, kind: 'term', domain: list(0) },
          { id: `writing.${layer}.punctuation`, kind: 'term', domain: list(0) },
        );
      }
      return out;
    }
    case 'sound_system':
      return [
        { id: 'sounds.consonants', kind: 'term', domain: list(1), qualifiers: ['variety'] },
        { id: 'sounds.vowels', kind: 'term', domain: list(1), qualifiers: ['variety'] },
        { id: 'tones.system', kind: 'category', domain: oneOf(slots.sound.tone_systems) },
        { id: 'stress.pattern', kind: 'category', domain: oneOf(slots.sound.stress_patterns) },
        { id: 'spelling.predictability', kind: 'category', domain: oneOf(slots.sound.predictability) },
      ];
    case 'grammar_glance':
      return Object.entries(slots.grammar.traits).map(([trait, values]) => ({ id: `trait.${trait}`, kind: 'category', domain: oneOf(values) }));
    default:
      return [];
  }
}

export function layerIdsOf(realization) {
  const value = realization?.facts?.find((candidate) => candidate.fact_id === 'writing.layers')?.value;
  return Array.isArray(value) ? value.filter((id) => typeof id === 'string' && id.length > 0) : [];
}

/** Is a fact value of the right type for its slot? Null is "not filled" and handled by the caller. */
export function domainProblem(domain, value) {
  switch (domain.type) {
    case 'text': return typeof value === 'string' && value.length > 0 ? null : 'a non-empty string';
    case 'boolean': return typeof value === 'boolean' ? null : 'true or false';
    case 'list': return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0) && value.length >= domain.min ? null : `a list of strings (at least ${domain.min})`;
    case 'enum': return domain.values.includes(value) ? null : `one of ${domain.values.join(', ')}`;
    case 'enum-list': return Array.isArray(value) && value.length > 0 && value.every((item) => domain.values.includes(item)) ? null : `a non-empty list from ${domain.values.join(', ')}`;
    default: return null;
  }
}

/** The label ids a realization's facts need in a best-language locale (generic ones are checked once against the registry). */
export function labelIdsFor(topicKey, realization, slots) {
  const facts = realization.facts ?? [];
  const value = (id) => facts.find((candidate) => candidate.fact_id === id)?.value;
  const withPrefix = (prefix) => facts.filter((candidate) => candidate.fact_id.startsWith(prefix));
  const out = [];
  switch (topicKey) {
    case 'language_overview': {
      const genealogy = realization.genealogy ?? {};
      if (genealogy.family_id) out.push(`family.${genealogy.family_id}`);
      for (const branch of genealogy.branch_ids ?? []) out.push(`branch.${branch}`);
      for (const region of value('reach.regions') ?? []) out.push(`region.${region}`);
      break;
    }
    case 'writing_system':
      for (const layer of layerIdsOf(realization)) {
        out.push(`layer.${layer}`);
        const script = value(`writing.${layer}.script`);
        if (script) out.push(`script.${script}`);
        for (const mark of withPrefix(`writing.${layer}.mark.`)) out.push(`mark.${mark.qualifiers?.mark_id}`, `markrole.${mark.qualifiers?.role}`);
        if ((realization.slots_version ?? 1) >= 2) out.push(`layer.${layer}.lesson`);
      }
      break;
    case 'sound_system':
      for (const note of withPrefix('sounds.tricky.')) out.push(`sound.${note.qualifiers?.note_id}`);
      for (const tone of withPrefix('tones.example.')) out.push(`tone.${tone.qualifiers?.tone_id}`);
      break;
    case 'grammar_glance':
      for (const trait of Object.keys(slots.grammar.traits)) {
        const v = value(`trait.${trait}`);
        if (typeof v === 'string') out.push(`trait.${trait}.${v}`);
      }
      break;
    default:
  }
  return out.filter((id) => !id.endsWith('.undefined'));
}

/** Label ids the runtime needs for every vocabulary value, whatever the language (so adding a value forces its label). */
export function genericLabelIds(slots) {
  const out = {
    writing_system: [], sound_system: [], grammar_glance: [],
    language_overview: ['relation.same_branch', 'relation.same_family', 'relation.different_family'],
    script_lesson: ['glyph.group_title', 'glyph.sounds_like', 'glyph.shapes', 'glyph.say', 'glyph.q.in_word', 'glyph.q.which_name', 'glyph.q.which_sound', 'glyph.q.which_word', 'glyph.q.match', 'glyph.q.match_reading'],
  };
  for (const kind of slots.writing.layer_kinds) out.writing_system.push(`kind.${kind}`);
  for (const direction of slots.writing.directions) out.writing_system.push(`direction.${direction}`);
  for (const role of slots.writing.layer_roles) if (role !== 'primary') out.writing_system.push(`layer.also.${role}`);
  for (const vowels of slots.writing.vowels) if (vowels === 'marks_optional' || vowels === 'inherent') out.writing_system.push(`vowels.${vowels}`);
  for (const system of slots.sound.tone_systems) if (system !== 'none') out.sound_system.push(`tonesys.${system}`);
  for (const pattern of slots.sound.stress_patterns) out.sound_system.push(`stress.${pattern}`);
  for (const level of slots.sound.predictability) out.sound_system.push(`predictability.${level}`);
  for (const [trait, values] of Object.entries(slots.grammar.traits)) {
    out.grammar_glance.push(`trait.${trait}.title`);
    for (const value of values) out.grammar_glance.push(`trait.${trait}.${value}`);
  }
  return out;
}
