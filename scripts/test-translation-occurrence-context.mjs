#!/usr/bin/env node
import { resolveTranslationCandidates } from './lib/translation-candidates.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

function profile({ region = { kind: 'general', tags: [] }, varieties = [], address = 'both' } = {}) {
  return {
    register: ['neutral'],
    region_scope: region,
    varieties,
    pragmatics: {
      politeness: ['unmarked'],
      stance: ['unmarked'],
      taboo_level: 'none',
      address_use: address,
      social_relation_tags: [],
    },
    review_state: 'approved',
  };
}

function link(id, usageProfile) {
  return {
    sense_id: id,
    lexeme_id: `${id}-lexeme`,
    relation: 'primary',
    review_state: 'approved',
    semantic_pivot_ready: true,
    usage_profile_ready: true,
    usage_profile: usageProfile,
    legacy_register_label: null,
  };
}

function compiled(sourceProfile, targetProfile) {
  return {
    schema_version: 5,
    concepts: [{
      concept_id: 'cpt_00000000-0000-0000-0000-000000000099',
      translation_role: 'exact_pivot',
      senses_by_language: { en: ['sense-en'], es: ['sense-es'] },
      sense_links_by_language: {
        en: [link('sense-en', sourceProfile)],
        es: [link('sense-es', targetProfile)],
      },
    }],
  };
}

function resolve(index, extra = {}) {
  return resolveTranslationCandidates(index, {
    sourceLanguage: 'en',
    sourceSenseId: 'sense-en',
    targetLanguage: 'es',
    ...extra,
  });
}

let index = compiled(profile(), profile({ address: 'reference' }));
let result = resolve(index);
assert(result.status === 'context_required', 'both-use source -> reference-only target needs occurrence use');
assert(
  result.candidates[0]?.needs_context?.some((item) => item.code === 'address_reference_context_required'),
  'missing address/reference context marker',
);

result = resolve(index, { occurrenceAddressUse: 'reference' });
assert(result.status === 'candidates_ready', 'reference occurrence should admit reference-only target');

result = resolve(index, { occurrenceAddressUse: 'address' });
assert(result.status === 'no_safe_target_candidate', 'address occurrence must reject reference-only target');

index = compiled(
  profile({ region: { kind: 'restricted', tags: ['en-US'] }, varieties: ['us-standard'] }),
  profile({ region: { kind: 'restricted', tags: ['es-MX'] }, varieties: ['mexican-standard'] }),
);
result = resolve(index);
assert(result.status === 'context_required', 'restricted source/target senses need edition context');
assert(result.candidates[0]?.needs_context?.some((item) => item.code === 'source_region_required'), 'missing source_region_required');
assert(result.candidates[0]?.needs_context?.some((item) => item.code === 'target_region_required'), 'missing target_region_required');

result = resolve(index, {
  sourceRegion: 'en-US',
  sourceVariety: 'us-standard',
  targetRegion: 'es-MX',
  targetVariety: 'mexican-standard',
});
assert(result.status === 'candidates_ready', 'matching source and target varieties should pass');

result = resolve(index, {
  sourceRegion: 'en-GB',
  sourceVariety: 'british-standard',
  targetRegion: 'es-MX',
  targetVariety: 'mexican-standard',
});
assert(result.status === 'no_safe_target_candidate', 'wrong source variety must stop candidate generation');

console.log('✅ Translation occurrence-context tests passed: address/reference and source/target region/variety gates fail closed.');
