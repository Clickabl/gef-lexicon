#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY = join(ROOT, 'lesson-families', 'family-members');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const fail = (message) => { throw new Error(message); };
const requireFile = (path) => { if (!existsSync(path)) fail(`Missing Family game asset: ${path}`); };
const exact = (a, b, label) => {
  if (a.size !== b.size || [...a].some((x) => !b.has(x))) {
    const missing = [...b].filter((x) => !a.has(x));
    const extra = [...a].filter((x) => !b.has(x));
    fail(`${label}: missing [${missing.join(', ')}], extra [${extra.join(', ')}]`);
  }
};

function validateMinimalTier3Seeds(contract) {
  const manifestPath = join(FAMILY, 'game-seeds', 'manifest.json');
  requireFile(manifestPath);
  const manifest = readJson(manifestPath);
  const required = manifest.required_concepts ?? [];
  if (required.length < 4) fail('Minimal Tier 3 seed must require at least four relationship concepts');

  const expected = new Set(contract.tier3);
  const resolved = new Map();
  for (const file of manifest.tier3_shards ?? []) {
    const path = join(FAMILY, 'game-seeds', file);
    requireFile(path);
    const shard = readJson(path);
    for (const entry of shard.entries ?? []) {
      const tag = entry?.language_tag;
      if (!tag) fail(`${path}: entry missing language_tag`);
      if (resolved.has(tag)) fail(`Duplicate Tier 3 game seed: ${tag}`);
      for (const concept of required) {
        const forms = entry.terms?.[concept];
        if (!Array.isArray(forms) || forms.length < 1 || forms.some((form) => typeof form !== 'string' || !form.trim())) {
          fail(`Tier 3 game seed ${tag}: missing usable ${concept} form`);
        }
      }
      resolved.set(tag, entry);
    }
  }
  exact(new Set(resolved.keys()), expected, 'Tier 3 minimal Family game seeds');
  if (resolved.size !== manifest.expected_tier3) fail(`Minimal Tier 3 seed total must be ${manifest.expected_tier3}; found ${resolved.size}`);
  return resolved.size;
}

function validateUniversalGameVocabulary(contract) {
  const manifestPath = join(FAMILY, 'game-vocabulary', 'manifest.json');
  requireFile(manifestPath);
  const manifest = readJson(manifestPath);
  const required = manifest.required_concepts ?? [];
  if (required.length < 14) fail('Universal Family game vocabulary must keep the 14-concept broad relationship core');

  const expectedOrder = required.join('\u0000');
  const resolved = new Map();
  const tierSets = {
    1: new Set(contract.tier1),
    2: new Set(contract.tier2),
    3: new Set(contract.tier3),
  };

  for (const tier of [1, 2, 3]) {
    const filename = manifest.sources?.[`tier${tier}`];
    if (!filename) fail(`Universal Family game manifest missing Tier ${tier} source`);
    const path = join(FAMILY, 'game-vocabulary', filename);
    requireFile(path);
    const shard = readJson(path);
    if ((shard.concept_order ?? []).join('\u0000') !== expectedOrder) fail(`${path}: concept_order must exactly match the universal manifest`);
    const seenTier = new Set();
    for (const entry of shard.entries ?? []) {
      const tag = entry?.language_tag;
      if (!tag) fail(`${path}: entry missing language_tag`);
      if (resolved.has(tag)) fail(`Universal Family game vocabulary duplicates ${tag}`);
      if (!Array.isArray(entry.terms) || entry.terms.length !== required.length) fail(`${path}: ${tag} must have exactly ${required.length} aligned term cells`);
      for (let i = 0; i < entry.terms.length; i += 1) {
        if (typeof entry.terms[i] !== 'string' || !entry.terms[i].trim()) fail(`${path}: ${tag} missing usable ${required[i]} term`);
      }
      resolved.set(tag, entry);
      seenTier.add(tag);
    }
    exact(seenTier, tierSets[tier], `Universal Family game vocabulary Tier ${tier}`);
    if (seenTier.size !== manifest.expected_tier_counts?.[String(tier)]) fail(`Universal Family game Tier ${tier} declared count mismatch`);
  }

  exact(new Set(resolved.keys()), new Set(contract.learn_from_languages), 'Universal Family game vocabulary coverage');
  if (resolved.size !== manifest.expected_total || resolved.size !== 104) fail(`Universal Family game vocabulary must resolve exactly 104 languages; found ${resolved.size}`);
  return { count: resolved.size, concepts: required.length };
}

function main() {
  const contractPath = join(FAMILY, 'language-contract.json');
  requireFile(contractPath);
  const contract = readJson(contractPath);
  const minimalTier3 = validateMinimalTier3Seeds(contract);
  const universal = validateUniversalGameVocabulary(contract);

  console.log(`OK — Family games: ${universal.count} languages × ${universal.concepts} broad concepts; ${minimalTier3} Tier 3 minimal fallback seeds.`);
}

try { main(); } catch (error) {
  console.error(`FAMILY GAME VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
