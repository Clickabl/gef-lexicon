#!/usr/bin/env node
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(readFileSync(join(root, 'contracts', 'gef-language-support.json'), 'utf8'));
const fail = (message) => {
  console.error(`language-contract: ${message}`);
  process.exitCode = 1;
};
const listDirs = (path) => existsSync(path)
  ? readdirSync(path).filter((name) => statSync(join(path, name)).isDirectory())
  : [];

if (contract.schemaVersion !== 2) fail(`expected contract schemaVersion 2, got ${contract.schemaVersion}`);
if (contract.canonicalSource !== 'Clickabl/gef-expo/registry/language-support.json') fail('canonicalSource must point to Gef Expo language support');
if (contract.canonicalSourceSchemaVersion !== 4) fail(`expected Expo language schema v4, got ${contract.canonicalSourceSchemaVersion}`);

const learnFrom = contract.learnFromLanguages ?? [];
const allowed = new Set(learnFrom);
if (learnFrom.length !== 104 || allowed.size !== 104) fail(`expected 104 unique learn-from identities, got ${allowed.size}`);
for (const id of allowed) {
  if (typeof id !== 'string' || !id || id.includes('-')) fail(`invalid language identity ${id}`);
}

const expectedTierCounts = {
  tier1_full: 6,
  tier2_selective: 15,
  tier3_read_games: 83,
};
const tierMembership = new Set();
for (const [tierId, expectedCount] of Object.entries(expectedTierCounts)) {
  const members = contract.lessonTiers?.[tierId];
  if (!Array.isArray(members)) {
    fail(`missing lesson tier ${tierId}`);
    continue;
  }
  const unique = new Set(members);
  if (members.length !== expectedCount || unique.size !== expectedCount) {
    fail(`${tierId} must contain ${expectedCount} unique identities, got rows=${members.length} unique=${unique.size}`);
  }
  for (const id of members) {
    if (!allowed.has(id)) fail(`${tierId} contains non-learn-from identity ${id}`);
    if (tierMembership.has(id)) fail(`language identity ${id} appears in more than one lesson tier`);
    tierMembership.add(id);
  }
}
const missingFromTiers = learnFrom.filter((id) => !tierMembership.has(id));
const extraTierMembers = [...tierMembership].filter((id) => !allowed.has(id));
if (tierMembership.size !== allowed.size || missingFromTiers.length || extraTierMembers.length) {
  fail(`lesson tiers must partition all learn-from identities exactly; missing=[${missingFromTiers.join(',')}] extra=[${extraTierMembers.join(',')}]`);
}

for (const policy of [
  'grammarLessonsLimitedToTier1AndTier2',
  'tier1GuaranteesFullGrammarPath',
  'tier2SelectiveGrammarOnly',
  'tier3ReadAndGamesOnly',
  'lessonSpecificReadinessRemainsDirectional',
]) {
  if (contract.lessonTierPolicy?.[policy] !== true) fail(`lessonTierPolicy.${policy} must be true`);
}
if (contract.rules?.refreshWhenCanonicalLanguageIdentitySetChanges !== true) {
  fail('rules.refreshWhenCanonicalLanguageIdentitySetChanges must be true');
}
if (contract.rules?.refreshWhenCanonicalLessonTierMembershipChanges !== true) {
  fail('rules.refreshWhenCanonicalLessonTierMembershipChanges must be true');
}

const uiOnly = new Set(contract.activeUiOnlyProductLanguages ?? []);
for (const id of uiOnly) {
  if (allowed.has(id)) fail(`active UI-only identity ${id} must not be in learn-from contract`);
}
if (!uiOnly.has('chr') || !uiOnly.has('pirate')) fail('current active UI-only identities must include Cherokee and Pirate');

for (const rootName of ['languages', 'names']) {
  for (const language of listDirs(join(root, rootName))) {
    if (!allowed.has(language)) {
      fail(`${rootName}/${language} is not a canonical learn-from language identity`);
    }
    if (uiOnly.has(language)) fail(`${rootName}/${language} must not be authored for a UI-only product language`);
  }
}

if (!process.exitCode) {
  console.log(
    `language-contract: OK (${allowed.size} identities; `
    + `${contract.lessonTiers.tier1_full.length}/${contract.lessonTiers.tier2_selective.length}/${contract.lessonTiers.tier3_read_games.length} lesson tiers; `
    + `${listDirs(join(root, 'languages')).length} authored lexicon language trees)`,
  );
}
