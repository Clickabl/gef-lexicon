#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY_DIR = join(ROOT, 'lesson-families', 'multiple-words-for-for');
const CAPABILITY_PATH = join(FAMILY_DIR, 'language-capabilities.json');
const GRAMMAR_PATH = join(ROOT, 'grammar', 'for-equivalents.json');
const BLURB_MANIFEST_PATH = join(FAMILY_DIR, 'support-blurbs', 'manifest.json');
const DEFAULT_REGISTRY = resolve(ROOT, '..', 'gef-expo', 'registry', 'language-support.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function fail(message) {
  throw new Error(message);
}

function unique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) fail(`${label}: duplicate language tag ${value}`);
    seen.add(value);
  }
  return seen;
}

function main() {
  for (const path of [CAPABILITY_PATH, GRAMMAR_PATH, BLURB_MANIFEST_PATH]) {
    if (!existsSync(path)) fail(`Missing required lesson capability input: ${path}`);
  }

  const capability = readJson(CAPABILITY_PATH);
  const grammar = readJson(GRAMMAR_PATH);
  const blurbManifest = readJson(BLURB_MANIFEST_PATH);

  if (capability.lesson_family_id !== grammar.lesson_family_id) {
    fail('Capability manifest and grammar set must belong to the same lesson family');
  }
  if (capability.grammar_set_id !== grammar.grammar_set_id) {
    fail('Capability manifest grammar_set_id does not match grammar set');
  }
  if (capability.lesson_family_id !== blurbManifest.lesson_family_id) {
    fail('Capability manifest and comparison-blurb manifest must belong to the same lesson family');
  }

  const full = capability.support_levels?.full?.language_tags;
  if (!Array.isArray(full)) fail('support_levels.full.language_tags must be an array');
  const fullSet = unique(full, 'full support');

  const unavailable = capability.support_levels?.unavailable?.language_tags ?? [];
  if (!Array.isArray(unavailable)) fail('support_levels.unavailable.language_tags must be an array');
  const unavailableSet = unique(unavailable, 'unavailable support');

  const expectedFull = capability.expected_full_support_language_tags ?? [];
  if (!Array.isArray(expectedFull)) fail('expected_full_support_language_tags must be an array');
  const expectedFullSet = unique(expectedFull, 'expected full support');

  const pendingGroups = capability.pending_full_support_research ?? [];
  const pending = pendingGroups.flatMap((group) => group.language_tags ?? []);
  const pendingSet = unique(pending, 'pending full-support research');

  for (const tag of fullSet) {
    if (unavailableSet.has(tag)) fail(`${tag}: cannot be both full and unavailable`);
    if (pendingSet.has(tag)) fail(`${tag}: full-support language must be removed from pending_full_support_research when promoted`);
  }

  for (const tag of expectedFullSet) {
    if (!fullSet.has(tag) && !pendingSet.has(tag)) {
      fail(`${tag}: expected full-support language is neither full nor explicitly pending research`);
    }
  }
  for (const tag of pendingSet) {
    if (!expectedFullSet.has(tag)) fail(`${tag}: pending full-support research is not in expected_full_support_language_tags`);
  }

  const grammarByTag = new Map((grammar.languages ?? []).map((language) => [language.language_tag, language]));
  for (const tag of fullSet) {
    const language = grammarByTag.get(tag);
    if (!language) fail(`${tag}: marked full but missing from grammar set`);
    if (language.lesson_ready !== true) fail(`${tag}: marked full but grammar record is not lesson_ready`);
    if (!Array.isArray(language.forms) || language.forms.length === 0) fail(`${tag}: marked full but has no forms`);
    const ruleCount = language.forms.reduce((count, form) => count + (Array.isArray(form.rules) ? form.rules.length : 0), 0);
    if (ruleCount === 0) fail(`${tag}: marked full but has no structured rules`);
  }

  const registryPath = process.env.GEF_LANGUAGE_SUPPORT_REGISTRY
    ? resolve(process.env.GEF_LANGUAGE_SUPPORT_REGISTRY)
    : DEFAULT_REGISTRY;

  if (existsSync(registryPath)) {
    const registry = readJson(registryPath);
    const registered = registry.programs?.learnFromLanguages;
    if (!Array.isArray(registered)) fail('Registry is missing programs.learnFromLanguages');
    const registeredSet = new Set(registered);

    if (blurbManifest.expected_total !== registered.length) {
      fail(`Comparison-blurb manifest expects ${blurbManifest.expected_total}, registry has ${registered.length}`);
    }

    for (const tag of [...fullSet, ...pendingSet, ...unavailableSet]) {
      if (!registeredSet.has(tag)) fail(`${tag}: lesson capability references a language outside programs.learnFromLanguages`);
    }

    // Global lesson tiers are planning expectations only. They must never be
    // treated as runtime full-support flags; this check merely keeps the desired
    // Tier 1+2 expectation list aligned with the current registry.
    const tier12 = [
      ...(registry.lessonTiers?.tier1_full ?? []),
      ...(registry.lessonTiers?.tier2_high ?? []),
    ];
    const tier12Set = new Set(tier12);
    if (tier12Set.size !== expectedFullSet.size || [...tier12Set].some((tag) => !expectedFullSet.has(tag))) {
      fail('expected_full_support_language_tags must match the current Tier 1 + Tier 2 planning set');
    }

    console.log(`OK — lesson capability flags: ${fullSet.size} full, ${pendingSet.size} planned-full pending, ${registered.length - fullSet.size} comparison/default among ${registered.length} learn-from languages.`);
    return;
  }

  console.log(`OK — lesson capability flags internally consistent: ${fullSet.size} full, ${pendingSet.size} planned-full pending. Expo registry not present; cross-repo checks skipped.`);
}

try {
  main();
} catch (error) {
  console.error(`LESSON LANGUAGE CAPABILITY VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
