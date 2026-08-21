#!/usr/bin/env node
import { compareUsageCompatibility } from './lib/usage-compatibility.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sense(register, pragmatics = {}, regionScope = { kind: 'general', tags: [] }, varieties = []) {
  return {
    usage_profile: {
      register,
      region_scope: regionScope,
      varieties,
      pragmatics: {
        politeness: ['unmarked'],
        stance: ['unmarked'],
        taboo_level: 'none',
        address_use: 'both',
        social_relation_tags: [],
        ...pragmatics,
      },
      review_state: 'approved',
    },
  };
}

function analysis(politeness) {
  return politeness ? { features: { base: { politeness } } } : { features: { base: {} } };
}

function has(result, bucket, code) {
  return (result[bucket] ?? []).some((item) => item.code === code);
}

const neutralMother = sense(['neutral']);
const neutralMadre = sense(['neutral']);
const familiarMom = sense(['familiar']);

let result = compareUsageCompatibility(neutralMother, neutralMadre, { requireApprovedProfiles: true });
assert(result.status === 'compatible', `neutral mother -> neutral madre should be compatible, got ${result.status}`);

result = compareUsageCompatibility(neutralMother, familiarMom, { requireApprovedProfiles: true });
assert(result.status === 'blocked', `neutral -> familiar should block, got ${result.status}`);
assert(has(result, 'blockers', 'register_mismatch'), 'expected register_mismatch');

// Exactness requires the full marked set, not merely one overlapping label.
const formalTechnical = sense(['formal', 'technical']);
const merelyFormal = sense(['formal']);
result = compareUsageCompatibility(formalTechnical, merelyFormal, { requireApprovedProfiles: true });
assert(result.status === 'blocked', 'formal+technical -> formal must not pass on partial overlap');
assert(has(result, 'blockers', 'register_mismatch'), 'partial register set must produce register_mismatch');

// Sense-level lexical politeness and form-level morphological politeness are
// separate dimensions. An unmarked lexeme may still appear in a polite form.
const japaneseNeutral = sense(['neutral']);
result = compareUsageCompatibility(neutralMother, japaneseNeutral, {
  sourceAnalysis: analysis(null),
  targetAnalysis: analysis('polite'),
  requireApprovedProfiles: true,
});
assert(result.status === 'needs_context', `unmarked English form -> polite Japanese form should need context, got ${result.status}`);
assert(has(result, 'needs_context', 'form_politeness_asymmetry'), 'expected form_politeness_asymmetry');

result = compareUsageCompatibility(japaneseNeutral, japaneseNeutral, {
  sourceAnalysis: analysis('plain'),
  targetAnalysis: analysis('honorific'),
  requireApprovedProfiles: true,
});
assert(result.status === 'blocked', `plain form -> honorific form should block, got ${result.status}`);
assert(has(result, 'blockers', 'form_politeness_mismatch'), 'expected form_politeness_mismatch');

const lexicalHonorific = sense(['neutral'], { politeness: ['honorific'] });
result = compareUsageCompatibility(lexicalHonorific, japaneseNeutral, { requireApprovedProfiles: true });
assert(result.status === 'needs_context', 'lexically honorific -> lexically unmarked should require contextual solution');
assert(has(result, 'needs_context', 'lexical_politeness_asymmetry'), 'expected lexical_politeness_asymmetry');

const lexicalPolite = sense(['neutral'], { politeness: ['polite'] });
result = compareUsageCompatibility(lexicalHonorific, lexicalPolite, { requireApprovedProfiles: true });
assert(result.status === 'blocked', 'honorific lexical meaning -> merely polite lexical meaning must block');
assert(has(result, 'blockers', 'lexical_politeness_mismatch'), 'expected lexical_politeness_mismatch');

// `both` is not a wildcard when the target expression is address-only or
// reference-only. The occurrence must tell us which use is intended.
const bothUse = sense(['neutral'], { address_use: 'both' });
const referenceOnly = sense(['neutral'], { address_use: 'reference' });
result = compareUsageCompatibility(bothUse, referenceOnly, { requireApprovedProfiles: true });
assert(result.status === 'needs_context', 'both -> reference-only without occurrence use must need context');
assert(has(result, 'needs_context', 'address_reference_context_required'), 'expected address_reference_context_required');

result = compareUsageCompatibility(bothUse, referenceOnly, {
  occurrenceAddressUse: 'reference',
  requireApprovedProfiles: true,
});
assert(result.status === 'compatible', 'reference occurrence should allow both -> reference-only');

result = compareUsageCompatibility(bothUse, referenceOnly, {
  occurrenceAddressUse: 'address',
  requireApprovedProfiles: true,
});
assert(result.status === 'blocked', 'address occurrence must reject reference-only target');
assert(has(result, 'blockers', 'target_address_occurrence_mismatch'), 'expected target_address_occurrence_mismatch');

// Geography/variety is checked on both source and target. Resolving a sense ID
// does not prove that a region-restricted source sense was valid in this edition.
const regionalSource = sense(['neutral'], {}, { kind: 'restricted', tags: ['en-US'] }, ['us-standard']);
const regionalTarget = sense(['neutral'], {}, { kind: 'restricted', tags: ['es-MX'] }, ['mexican-standard']);
result = compareUsageCompatibility(regionalSource, regionalTarget, { requireApprovedProfiles: true });
assert(result.status === 'needs_context', 'restricted source/target without locale context should need context');
assert(has(result, 'needs_context', 'source_region_required'), 'expected source_region_required');
assert(has(result, 'needs_context', 'target_region_required'), 'expected target_region_required');

result = compareUsageCompatibility(regionalSource, regionalTarget, {
  sourceRegion: 'en-GB',
  sourceVariety: 'british-standard',
  targetRegion: 'es-ES',
  targetVariety: 'peninsular-standard',
  requireApprovedProfiles: true,
});
assert(result.status === 'blocked', 'wrong source and target varieties must block');
assert(has(result, 'blockers', 'source_region_mismatch'), 'expected source_region_mismatch');
assert(has(result, 'blockers', 'source_variety_mismatch'), 'expected source_variety_mismatch');
assert(has(result, 'blockers', 'target_region_mismatch'), 'expected target_region_mismatch');
assert(has(result, 'blockers', 'target_variety_mismatch'), 'expected target_variety_mismatch');

result = compareUsageCompatibility(regionalSource, regionalTarget, {
  sourceRegion: 'en-US',
  sourceVariety: 'us-standard',
  targetRegion: 'es-MX',
  targetVariety: 'mexican-standard',
  requireApprovedProfiles: true,
});
assert(result.status === 'compatible', 'matching source/target regional contexts should pass');

// Social relation tags are simultaneous constraints, not an any-overlap bag.
const respectfulOlder = sense(['neutral'], { social_relation_tags: ['respectful', 'older_addressee'] });
const merelyRespectful = sense(['neutral'], { social_relation_tags: ['respectful'] });
result = compareUsageCompatibility(respectfulOlder, merelyRespectful, { requireApprovedProfiles: true });
assert(result.status === 'blocked', 'partial social-relation overlap must not count as exact');
assert(has(result, 'blockers', 'social_relation_mismatch'), 'expected social_relation_mismatch');

result = compareUsageCompatibility(respectfulOlder, merelyRespectful, {
  occurrenceSocialRelationTags: ['respectful', 'older_addressee'],
  requireApprovedProfiles: true,
});
assert(result.status === 'compatible', 'shared occurrence context can validate differently lexicalized relation constraints');

const taboo = sense(['taboo'], { taboo_level: 'vulgar' });
const euphemism = sense(['euphemistic'], { taboo_level: 'sensitive' });
result = compareUsageCompatibility(taboo, euphemism, { requireApprovedProfiles: true });
assert(result.status === 'blocked', 'taboo/vulgar -> euphemistic/sensitive should not be exact');
assert(has(result, 'blockers', 'taboo_level_mismatch'), 'expected taboo_level_mismatch');

console.log('✅ Usage compatibility tests passed: full marked sets, lexical vs form politeness, address use, source/target variety, social relation, and taboo gates are conservative.');
