#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANGUAGES_DIR = join(ROOT, 'languages');
const V2_DIR = join(ROOT, 'dist', 'core');
const V1_DIR = join(ROOT, 'dist', 'dictionaries');
const LEXICON_RE = /^lexicon(?:-[a-z0-9-]+)?\.json$/iu;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function listDirs(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((entry) => statSync(join(path, entry)).isDirectory())
    .sort();
}

function sourceProfiles(languageTag) {
  const languageDir = join(LANGUAGES_DIR, languageTag);
  const profiles = new Map();
  if (!existsSync(languageDir)) return profiles;
  for (const filename of readdirSync(languageDir).filter((entry) => LEXICON_RE.test(entry)).sort()) {
    const document = readJson(join(languageDir, filename));
    for (const lexeme of document.lexemes ?? []) {
      for (const sense of lexeme.senses ?? []) {
        profiles.set(sense.sense_id, sense.usage_profile ?? null);
      }
    }
  }
  return profiles;
}

function checkSenseRows(sqlitePath, languageTag, label) {
  const source = sourceProfiles(languageTag);
  assert(source.size > 0, `${label}: no canonical source senses for ${languageTag}`);

  const db = new Database(sqlitePath, { readonly: true });
  let checkedSenses = 0;
  let authoredProfiles = 0;
  try {
    const columns = new Set(db.prepare('PRAGMA table_info(senses)').all().map((row) => row.name));
    assert(columns.has('usage_profile_json'), `${label}: senses table omits usage_profile_json`);

    for (const row of db.prepare('SELECT sense_id, usage_profile_json FROM senses ORDER BY sense_id').all()) {
      checkedSenses += 1;
      assert(source.has(row.sense_id), `${label}:${row.sense_id}: compiled sense missing from canonical sources`);
      let compiledProfile;
      assert.doesNotThrow(() => {
        compiledProfile = JSON.parse(row.usage_profile_json);
      }, `${label}:${row.sense_id}: usage_profile_json is invalid JSON`);
      assert.deepEqual(
        compiledProfile,
        source.get(row.sense_id),
        `${label}:${row.sense_id}: usage profile changed or disappeared during compilation`,
      );
      if (compiledProfile !== null) authoredProfiles += 1;
    }
  } finally {
    db.close();
  }
  return { checkedSenses, authoredProfiles };
}

function main() {
  let checkedPackages = 0;
  let checkedSenses = 0;
  let authoredProfilesRoundTripped = 0;
  let v1Packages = 0;
  let v2Packages = 0;

  for (const languageTag of listDirs(V1_DIR)) {
    const sqlitePath = join(V1_DIR, languageTag, 'core-v1.sqlite');
    if (!existsSync(sqlitePath)) continue;
    const result = checkSenseRows(sqlitePath, languageTag, `core-v1/${languageTag}`);
    checkedPackages += 1;
    v1Packages += 1;
    checkedSenses += result.checkedSenses;
    authoredProfilesRoundTripped += result.authoredProfiles;
  }

  for (const languageTag of listDirs(V2_DIR)) {
    const sqlitePath = join(V2_DIR, languageTag, 'core-v2.sqlite');
    const manifestPath = join(V2_DIR, languageTag, 'manifest.json');
    if (!existsSync(sqlitePath) || !existsSync(manifestPath)) continue;

    const manifest = readJson(manifestPath);
    assert.equal(manifest.fieldPolicy?.version, 3, `core-v2/${languageTag}: expected field policy version 3`);
    assert(
      manifest.fieldPolicy?.fast?.sense?.includes('usage_profile_json'),
      `core-v2/${languageTag}: manifest fast sense fields omit usage_profile_json`,
    );

    const result = checkSenseRows(sqlitePath, languageTag, `core-v2/${languageTag}`);
    checkedPackages += 1;
    v2Packages += 1;
    checkedSenses += result.checkedSenses;
    authoredProfilesRoundTripped += result.authoredProfiles;
  }

  assert(v1Packages > 0, 'no core-v1 SQLite packages were checked; run npm run compile:sqlite first');
  assert(v2Packages > 0, 'no core-v2 SQLite packages were checked; run npm run compile:core first');
  console.log(
    `✅ Usage-profile SQLite round-trip passed: ${v1Packages} v1 + ${v2Packages} v2 package(s), `
    + `${checkedPackages} total, ${checkedSenses} sense row(s), `
    + `${authoredProfilesRoundTripped} authored profile row(s).`,
  );
}

main();
