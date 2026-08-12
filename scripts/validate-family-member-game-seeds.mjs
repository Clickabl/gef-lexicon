#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY = join(ROOT, 'lesson-families', 'family-members');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const fail = (message) => { throw new Error(message); };
const requireFile = (path) => { if (!existsSync(path)) fail(`Missing Family Members game asset: ${path}`); };
const exact = (a, b, label) => {
  if (a.size !== b.size || [...a].some((x) => !b.has(x))) {
    const missing = [...b].filter((x) => !a.has(x));
    const extra = [...a].filter((x) => !b.has(x));
    fail(`${label}: missing [${missing.join(', ')}], extra [${extra.join(', ')}]`);
  }
};

function resolveTargetProfiles() {
  const manifest = readJson(join(FAMILY, 'target-profiles', 'manifest.json'));
  const profiles = new Map();
  for (const file of manifest.base_shards ?? []) {
    const shard = readJson(join(FAMILY, 'target-profiles', file));
    for (const entry of shard.entries ?? []) profiles.set(entry.language_tag, entry);
  }
  const override = readJson(join(FAMILY, 'target-profiles', manifest.current_registry_overrides));
  for (const tag of override.disabled_full_target_language_tags ?? []) profiles.delete(tag);
  for (const entry of override.entries ?? []) profiles.set(entry.language_tag, entry);
  return profiles;
}

function main() {
  const contract = readJson(join(FAMILY, 'language-contract.json'));
  const manifestPath = join(FAMILY, 'game-seeds', 'manifest.json');
  requireFile(manifestPath);
  const manifest = readJson(manifestPath);
  const required = manifest.required_concepts ?? [];
  if (required.length < 4) fail('Game seed must require at least four family relationship concepts');

  const tier3Expected = new Set(contract.tier3);
  const tier3 = new Map();
  for (const file of manifest.tier3_shards ?? []) {
    const path = join(FAMILY, 'game-seeds', file);
    requireFile(path);
    const shard = readJson(path);
    for (const entry of shard.entries ?? []) {
      if (!entry?.language_tag) fail(`${path}: entry missing language_tag`);
      if (tier3.has(entry.language_tag)) fail(`Duplicate Tier 3 game seed: ${entry.language_tag}`);
      for (const concept of required) {
        const forms = entry.terms?.[concept];
        if (!Array.isArray(forms) || forms.length < 1 || forms.some((form) => typeof form !== 'string' || !form.trim())) {
          fail(`Tier 3 game seed ${entry.language_tag}: missing usable ${concept} form`);
        }
      }
      tier3.set(entry.language_tag, entry);
    }
  }
  exact(new Set(tier3.keys()), tier3Expected, 'Tier 3 Family Members game seeds');

  const profiles = resolveTargetProfiles();
  const fullExpected = new Set(contract.full_target_languages);
  exact(new Set(profiles.keys()), fullExpected, 'Full-target profiles used for Family Members games');
  for (const [tag, profile] of profiles) {
    const concepts = new Set((profile.core_terms ?? []).map((term) => term.concept));
    for (const concept of required) {
      if (!concepts.has(concept)) fail(`Full-target profile ${tag} cannot seed game: missing ${concept}`);
    }
  }

  const resolved = new Set([...tier3.keys(), ...profiles.keys()]);
  exact(resolved, new Set(contract.learn_from_languages), 'Resolved Family Members game-capable languages');
  if (resolved.size !== manifest.expected_resolved_total || tier3.size !== manifest.expected_tier3) {
    fail(`Game-seed declared totals do not match resolved ${resolved.size}/${tier3.size}`);
  }
  console.log(`OK — Family Members game seeds: ${profiles.size} profile-derived + ${tier3.size} Tier 3 = ${resolved.size} languages.`);
}

try { main(); } catch (error) {
  console.error(`FAMILY MEMBERS GAME-SEED VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
