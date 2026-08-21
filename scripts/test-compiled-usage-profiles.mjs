#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANGUAGES_DIR = join(ROOT, 'languages');
const DIST_DIR = join(ROOT, 'dist', 'core');
const LEXICON_RE = /^lexicon(?:-[a-z0-9-]+)?\.json$/iu;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sourceProfiles(languageTag) {
  const languageDir = join(LANGUAGES_DIR, languageTag);
  const profiles = new Map();
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

function main() {
  assert(existsSync(DIST_DIR), 'dist/core does not exist; run npm run compile:core first');

  const languages = readdirSync(DIST_DIR)
    .filter((entry) => statSync(join(DIST_DIR, entry)).isDirectory())
    .sort();
  assert(languages.length > 0, 'no compiled core language packages found');

  let checkedPackages = 0;
  let checkedSenses = 0;
  let authoredProfilesRoundTripped = 0;

  for (const languageTag of languages) {
    const sqlitePath = join(DIST_DIR, languageTag, 'core-v2.sqlite');
    const manifestPath = join(DIST_DIR, languageTag, 'manifest.json');
    if (!existsSync(sqlitePath) || !existsSync(manifestPath)) continue;

    const manifest = readJson(manifestPath);
    assert.equal(manifest.fieldPolicy?.version, 3, `${languageTag}: expected field policy version 3`);
    assert(
      manifest.fieldPolicy?.fast?.sense?.includes('usage_profile_json'),
      `${languageTag}: manifest fast sense fields omit usage_profile_json`,
    );

    const db = new Database(sqlitePath, { readonly: true });
    try {
      const columns = new Set(db.prepare('PRAGMA table_info(senses)').all().map((row) => row.name));
      assert(columns.has('usage_profile_json'), `${languageTag}: senses table omits usage_profile_json`);

      const source = sourceProfiles(languageTag);
      for (const row of db.prepare('SELECT sense_id, usage_profile_json FROM senses ORDER BY sense_id').all()) {
        checkedSenses += 1;
        assert(source.has(row.sense_id), `${languageTag}:${row.sense_id}: compiled sense missing from canonical sources`);
        let compiledProfile;
        assert.doesNotThrow(() => {
          compiledProfile = JSON.parse(row.usage_profile_json);
        }, `${languageTag}:${row.sense_id}: usage_profile_json is invalid JSON`);
        assert.deepEqual(
          compiledProfile,
          source.get(row.sense_id),
          `${languageTag}:${row.sense_id}: usage profile changed or disappeared during compilation`,
        );
        if (compiledProfile !== null) authoredProfilesRoundTripped += 1;
      }
    } finally {
      db.close();
    }
    checkedPackages += 1;
  }

  assert(checkedPackages > 0, 'no core-v2 SQLite packages were checked');
  console.log(
    `✅ Core usage-profile round-trip passed: ${checkedPackages} package(s), `
    + `${checkedSenses} sense row(s), ${authoredProfilesRoundTripped} authored profile(s).`,
  );
}

main();
