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
      pragmatics,
      review_state: 'approved',
    },
  };
}

function analysis(politeness) {
  return politeness
    ? { features: { base: { politeness } } }
    : { features: { base: {} } };
}

const neutralMother = sense(['neutral'], { taboo_level: 'none', address_use: 'both' });
const familiarMom = sense(['familiar'], { taboo_level: 'none', address_use: 'both' });
const neutralMadre = sense(['neutral'], { taboo_level: 'none', address_use: 'both' });

let result = compareUsageCompatibility(neutralMother, neutralMadre, { requireApprovedProfiles: true });
assert(result.status === 'compatible', `neutral mother -> neutral madre should be compatible, got ${result.status}`);

result = compareUsageCompatibility(neutralMother, familiarMom, { requireApprovedProfiles: true });
assert(result.status === 'blocked', `neutral mother -> familiar mom should be blocked, got ${result.status}`);
assert(result.blockers.some((item) => item.code === 'register_mismatch'), 'expected register_mismatch');

const japaneseNeutral = sense(['neutral'], { taboo_level: 'none', address_use: 'both' });
result = compareUsageCompatibility(
  neutralMother,
  japaneseNeutral,
  {
    sourceAnalysis: analysis(null),
    targetAnalysis: analysis('polite'),
    requireApprovedProfiles: true,
  },
);
assert(result.status === 'needs_context', `unmarked English -> polite Japanese should need context, got ${result.status}`);
assert(
  result.needs_context.some((item) => item.code === 'politeness_asymmetry'),
  'expected politeness_asymmetry',
);

result = compareUsageCompatibility(
  japaneseNeutral,
  japaneseNeutral,
  {
    sourceAnalysis: analysis('plain'),
    targetAnalysis: analysis('honorific'),
    requireApprovedProfiles: true,
  },
);
assert(result.status === 'blocked', `plain -> honorific Japanese should be blocked, got ${result.status}`);
assert(result.blockers.some((item) => item.code === 'politeness_mismatch'), 'expected politeness_mismatch');

const regionalTarget = sense(
  ['neutral'],
  { taboo_level: 'none', address_use: 'both' },
  { kind: 'restricted', tags: ['es-MX'] },
  ['mexican-standard'],
);
result = compareUsageCompatibility(neutralMother, regionalTarget, { requireApprovedProfiles: true });
assert(result.status === 'needs_context', 'restricted target without region/variety should need context');

result = compareUsageCompatibility(neutralMother, regionalTarget, {
  targetRegion: 'es-ES',
  targetVariety: 'peninsular-standard',
  requireApprovedProfiles: true,
});
assert(result.status === 'blocked', 'wrong region/variety should block target candidate');
assert(result.blockers.some((item) => item.code === 'target_region_mismatch'), 'expected target_region_mismatch');
assert(result.blockers.some((item) => item.code === 'target_variety_mismatch'), 'expected target_variety_mismatch');

const taboo = sense(['taboo'], { taboo_level: 'vulgar', address_use: 'both' });
const euphemism = sense(['euphemistic'], { taboo_level: 'sensitive', address_use: 'both' });
result = compareUsageCompatibility(taboo, euphemism, { requireApprovedProfiles: true });
assert(result.status === 'blocked', 'taboo/vulgar -> euphemistic/sensitive should not be exact');
assert(result.blockers.some((item) => item.code === 'taboo_level_mismatch'), 'expected taboo_level_mismatch');

console.log('✅ Usage compatibility tests passed: register, politeness, region/variety, and taboo/social gates behave conservatively.');
