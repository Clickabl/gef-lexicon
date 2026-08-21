#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEXICON_RE = /^lexicon(?:-[a-z0-9-]+)?\.json$/iu;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function directories(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path).filter((entry) => statSync(join(path, entry)).isDirectory()).sort();
}

function sourceFiles() {
  const files = [];
  const languages = join(ROOT, 'languages');
  for (const language of directories(languages)) {
    const dir = join(languages, language);
    for (const filename of readdirSync(dir).filter((entry) => LEXICON_RE.test(entry)).sort()) {
      files.push(join(dir, filename));
    }
  }

  const works = join(ROOT, 'works');
  for (const work of directories(works)) {
    const dir = join(works, work, 'lexicon');
    if (!existsSync(dir)) continue;
    for (const filename of readdirSync(dir).filter((entry) => entry.endsWith('.json')).sort()) {
      files.push(join(dir, filename));
    }
  }
  return files;
}

export function usageProfileInvariantErrors(profile) {
  if (!profile) return [];
  const errors = [];
  const register = new Set(profile.register ?? []);
  const politeness = new Set(profile.pragmatics?.politeness ?? []);
  const stance = new Set(profile.pragmatics?.stance ?? []);

  if (register.has('neutral') && register.size > 1) {
    errors.push('register_neutral_cannot_coexist_with_marked_register');
  }
  if (politeness.has('unmarked') && politeness.size > 1) {
    errors.push('politeness_unmarked_cannot_coexist_with_marked_politeness');
  }
  if (stance.has('unmarked') && stance.size > 1) {
    errors.push('stance_unmarked_cannot_coexist_with_marked_stance');
  }
  if (stance.has('neutral') && stance.size > 1) {
    errors.push('stance_neutral_cannot_coexist_with_marked_stance');
  }

  if (profile.review_state === 'approved') {
    if (profile.region_scope?.kind === 'unknown') errors.push('approved_profile_region_scope_unknown');
    if (profile.pragmatics?.taboo_level === 'unknown') errors.push('approved_profile_taboo_level_unknown');
    if (profile.pragmatics?.address_use === 'unknown') errors.push('approved_profile_address_use_unknown');
  }
  return errors;
}

function syntheticRegressionTests() {
  const base = {
    register: ['neutral'],
    region_scope: { kind: 'general', tags: [] },
    varieties: [],
    pragmatics: {
      politeness: ['unmarked'],
      stance: ['unmarked'],
      taboo_level: 'none',
      address_use: 'both',
      social_relation_tags: [],
    },
    review_state: 'candidate',
  };

  const validTechnical = structuredClone(base);
  validTechnical.register = ['formal', 'technical'];
  if (usageProfileInvariantErrors(validTechnical).length !== 0) {
    throw new Error('formal+technical should remain a valid simultaneously marked register profile');
  }

  const contradictions = [
    ['register_neutral_cannot_coexist_with_marked_register', { register: ['neutral', 'slang'] }],
    ['politeness_unmarked_cannot_coexist_with_marked_politeness', { pragmatics: { ...base.pragmatics, politeness: ['unmarked', 'honorific'] } }],
    ['stance_unmarked_cannot_coexist_with_marked_stance', { pragmatics: { ...base.pragmatics, stance: ['unmarked', 'derogatory'] } }],
    ['stance_neutral_cannot_coexist_with_marked_stance', { pragmatics: { ...base.pragmatics, stance: ['neutral', 'respectful'] } }],
  ];
  for (const [expected, patch] of contradictions) {
    const candidate = structuredClone(base);
    Object.assign(candidate, patch);
    const errors = usageProfileInvariantErrors(candidate);
    if (!errors.includes(expected)) throw new Error(`synthetic usage-profile regression missed ${expected}`);
  }
}

function main() {
  syntheticRegressionTests();
  let profiles = 0;
  let errors = 0;

  for (const path of sourceFiles()) {
    const rel = relative(ROOT, path).replaceAll('\\', '/');
    const document = readJson(path);
    for (const lexeme of document.lexemes ?? []) {
      for (const sense of lexeme.senses ?? []) {
        if (!sense.usage_profile) continue;
        profiles += 1;
        for (const error of usageProfileInvariantErrors(sense.usage_profile)) {
          console.error(`❌ ${rel}:${sense.sense_id}: ${error}`);
          errors += 1;
        }
      }
    }
  }

  if (errors > 0) {
    console.error(`\n❌ Usage-profile validation failed with ${errors} invariant error(s).`);
    process.exit(1);
  }
  console.log(`✅ Usage-profile invariants passed for ${profiles} authored profile(s), plus synthetic contradiction regressions.`);
}

main();
