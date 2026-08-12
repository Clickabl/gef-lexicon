#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BLURB_DIR = join(ROOT, 'lesson-families', 'multiple-words-for-for', 'support-blurbs');
const DEFAULT_REGISTRY = resolve(ROOT, '..', 'gef-expo', 'registry', 'language-support.json');

const TIER_KEYS = {
  1: 'tier1_full',
  2: 'tier2_high',
  3: 'tier3_opportunistic',
  4: 'tier4_learn_from',
};

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function fail(message) {
  throw new Error(message);
}

function sameMembers(expected, actual) {
  const a = [...expected].sort((x, y) => x.localeCompare(y));
  const b = [...actual].sort((x, y) => x.localeCompare(y));
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function main() {
  const manifestPath = join(BLURB_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) fail(`Missing lesson blurb manifest: ${manifestPath}`);
  const manifest = readJson(manifestPath);

  if (manifest.coverage_program !== 'learnFromLanguages') fail('Blurb manifest must cover programs.learnFromLanguages');
  if (/\bEnglish\b/i.test(manifest.source_summary_en) || /[“"«]for[”"»]/i.test(manifest.source_summary_en)) {
    fail('Generic source summary must be language-neutral and may not introduce English/for');
  }
  if (/\bEnglish\b/i.test(manifest.source_tooltip_en) || /[“"«]for[”"»]/i.test(manifest.source_tooltip_en)) {
    fail('Generic source tooltip must be language-neutral and may not introduce English/for');
  }

  const globalSeen = new Set();
  const tierActual = new Map();
  let total = 0;

  for (const tier of [1, 2, 3, 4]) {
    const shardName = manifest.tier_shards?.[String(tier)];
    if (!shardName) fail(`Manifest is missing tier_shards.${tier}`);
    const shardPath = join(BLURB_DIR, shardName);
    if (!existsSync(shardPath)) fail(`Missing Tier ${tier} blurb shard: ${shardPath}`);
    const shard = readJson(shardPath);

    if (shard.tier !== tier) fail(`${shardName}: tier ${shard.tier} does not match Tier ${tier}`);
    if (shard.coverage_program !== 'learnFromLanguages') fail(`${shardName}: wrong coverage_program`);
    if (!Array.isArray(shard.entries)) fail(`${shardName}: entries must be an array`);

    const actual = shard.entries.map((entry) => entry.language_tag);
    const expectedCount = manifest.expected_tier_counts?.[String(tier)];
    if (actual.length !== expectedCount) fail(`${shardName}: expected ${expectedCount} entries, found ${actual.length}`);
    if (new Set(actual).size !== actual.length) fail(`${shardName}: duplicate language tags within shard`);

    for (const entry of shard.entries) {
      if (globalSeen.has(entry.language_tag)) fail(`Duplicate blurb language ${entry.language_tag}`);
      globalSeen.add(entry.language_tag);
      if (typeof entry.summary !== 'string' || !entry.summary.trim()) fail(`${entry.language_tag}: empty summary`);
      if (typeof entry.tooltip !== 'string' || !entry.tooltip.trim()) fail(`${entry.language_tag}: empty tooltip`);
    }
    tierActual.set(tier, actual);
    total += shard.entries.length;
  }

  if (total !== manifest.expected_total) fail(`Blurb total ${total} does not match manifest expected_total ${manifest.expected_total}`);

  const registryPath = process.env.GEF_LANGUAGE_SUPPORT_REGISTRY
    ? resolve(process.env.GEF_LANGUAGE_SUPPORT_REGISTRY)
    : DEFAULT_REGISTRY;

  if (existsSync(registryPath)) {
    const registry = readJson(registryPath);
    for (const tier of [1, 2, 3, 4]) {
      const key = TIER_KEYS[tier];
      const expected = registry.lessonTiers?.[key];
      if (!Array.isArray(expected)) fail(`Registry is missing lessonTiers.${key}`);
      if (!sameMembers(expected, tierActual.get(tier))) {
        const actual = tierActual.get(tier);
        const missing = expected.filter((tag) => !actual.includes(tag));
        const extra = actual.filter((tag) => !expected.includes(tag));
        fail(`tier${tier}.json: registry coverage mismatch; missing=[${missing.join(', ')}], extra=[${extra.join(', ')}]`);
      }
    }
    const program = registry.programs?.learnFromLanguages;
    if (!Array.isArray(program)) fail('Registry is missing programs.learnFromLanguages');
    if (!sameMembers(program, globalSeen)) fail('Combined blurb shards do not exactly match programs.learnFromLanguages');
    if (total !== program.length) fail(`Blurb total ${total} does not match learn-from total ${program.length}`);
    if (manifest.expected_total !== program.length) fail(`Manifest expected_total ${manifest.expected_total} is stale; registry has ${program.length}`);
    console.log(`OK — ${total} neutral lesson blurbs exactly cover the current Tier 1–4 learn-from registry.`);
    return;
  }

  console.log(`OK — ${total} neutral lesson blurbs match the pinned 6/15/30/53 manifest. Expo registry not present; exact cross-repo comparison skipped.`);
}

try {
  main();
} catch (error) {
  console.error(`LESSON BLURB VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
