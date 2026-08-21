#!/usr/bin/env node
import { resolveTranslationCandidates } from './lib/translation-candidates.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function usage(register, pragmatics = {}) {
  return {
    register,
    region_scope: { kind: 'general', tags: [] },
    varieties: [],
    pragmatics: {
      taboo_level: 'none',
      address_use: 'both',
      ...pragmatics,
    },
    review_state: 'approved',
  };
}

function link(senseId, profile, overrides = {}) {
  return {
    sense_id: senseId,
    lexeme_id: `${senseId}-lexeme`,
    relation: 'primary',
    review_state: 'approved',
    semantic_pivot_ready: true,
    usage_profile: profile,
    usage_profile_ready: true,
    legacy_register_label: null,
    ...overrides,
  };
}

const neutral = usage(['neutral']);
const familiar = usage(['familiar']);
const japaneseNeutral = usage(['neutral']);

const compiled = {
  schema_version: 5,
  concepts: [
    {
      concept_id: 'cpt_00000000-0000-0000-0000-000000000001',
      translation_role: 'exact_pivot',
      senses_by_language: {
        en: ['sense-en-mother'],
        es: ['sense-es-madre', 'sense-es-mama'],
        ja: ['sense-ja-neutral'],
      },
      sense_links_by_language: {
        en: [link('sense-en-mother', neutral)],
        es: [
          link('sense-es-madre', neutral),
          link('sense-es-mama', familiar),
        ],
        ja: [link('sense-ja-neutral', japaneseNeutral)],
      },
    },
    {
      concept_id: 'cpt_00000000-0000-0000-0000-000000000002',
      translation_role: 'taxonomy_only',
      senses_by_language: { en: ['sense-en-mother'] },
      sense_links_by_language: { en: [link('sense-en-mother', neutral)] },
    },
  ],
};

let result = resolveTranslationCandidates(compiled, {
  sourceLanguage: 'en',
  sourceSenseId: 'sense-en-mother',
  targetLanguage: 'es',
});
assert(result.status === 'candidates_ready', `expected candidates_ready, got ${result.status}`);
assert(
  result.candidates.some((candidate) => candidate.target_sense_id === 'sense-es-madre' && candidate.status === 'compatible'),
  'neutral Spanish candidate must survive',
);
assert(
  !result.candidates.some((candidate) => candidate.target_sense_id === 'sense-es-mama'),
  'familiar Spanish candidate must be filtered as register mismatch',
);

result = resolveTranslationCandidates(compiled, {
  sourceLanguage: 'en',
  sourceSenseId: 'sense-en-mother',
  targetLanguage: 'ja',
  targetAnalysesBySense: {
    'sense-ja-neutral': { features: { base: { politeness: 'polite' } } },
  },
});
assert(result.status === 'context_required', `English -> polite Japanese should require context, got ${result.status}`);
assert(
  result.candidates[0]?.needs_context?.some((item) => item.code === 'politeness_asymmetry'),
  'English -> Japanese polite candidate must expose politeness asymmetry',
);

const sourceNotReady = structuredClone(compiled);
sourceNotReady.concepts[0].sense_links_by_language.en[0].usage_profile_ready = false;
result = resolveTranslationCandidates(sourceNotReady, {
  sourceLanguage: 'en',
  sourceSenseId: 'sense-en-mother',
  targetLanguage: 'es',
});
assert(result.status === 'source_usage_not_ready', 'unreviewed source usage profile must stop translation candidate generation');

const targetNotReady = structuredClone(compiled);
targetNotReady.concepts[0].sense_links_by_language.es[0].usage_profile_ready = false;
targetNotReady.concepts[0].sense_links_by_language.es[1].usage_profile_ready = false;
result = resolveTranslationCandidates(targetNotReady, {
  sourceLanguage: 'en',
  sourceSenseId: 'sense-en-mother',
  targetLanguage: 'es',
});
assert(result.status === 'target_usage_not_ready', 'unreviewed target usage must not become a ready translation');

const pivotNotReady = structuredClone(compiled);
pivotNotReady.concepts[0].sense_links_by_language.en[0].semantic_pivot_ready = false;
result = resolveTranslationCandidates(pivotNotReady, {
  sourceLanguage: 'en',
  sourceSenseId: 'sense-en-mother',
  targetLanguage: 'es',
});
assert(result.status === 'source_not_translation_ready', 'unapproved semantic pivot must stop translation');

console.log('✅ Translation-candidate resolver tests passed: exact pivot, usage review, register, and Japanese politeness gates compose conservatively.');
