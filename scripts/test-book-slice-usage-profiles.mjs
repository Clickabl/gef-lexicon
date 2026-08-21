#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANGUAGES_DIR = join(ROOT, 'languages');
const DIST_BOOKS_DIR = join(ROOT, 'dist', 'books');
const CONTENT_ARG = process.argv.find((value) => value.startsWith('--content-root='));
const WORK_ARG = process.argv.find((value) => value.startsWith('--work='));
const LANGUAGE_ARG = process.argv.find((value) => value.startsWith('--language='));
const CONTENT_ROOT = CONTENT_ARG ? resolve(CONTENT_ARG.slice('--content-root='.length)) : null;
const WORK = WORK_ARG?.slice('--work='.length).trim() || null;
const LANGUAGE = LANGUAGE_ARG?.slice('--language='.length).trim() || null;
const LEXICON_RE = /^lexicon(?:-[a-z0-9-]+)?\.json$/iu;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function canonicalSenses(languageTag) {
  const languageDir = join(LANGUAGES_DIR, languageTag);
  assert(existsSync(languageDir), `missing canonical language directory ${languageTag}`);
  const senses = new Map();
  for (const filename of readdirSync(languageDir).filter((entry) => LEXICON_RE.test(entry)).sort()) {
    const document = readJson(join(languageDir, filename));
    for (const lexeme of document.lexemes ?? []) {
      for (const sense of lexeme.senses ?? []) {
        senses.set(sense.sense_id, {
          usage_profile: sense.usage_profile ?? null,
          lexeme_id: lexeme.lexeme_id,
        });
      }
    }
  }
  return senses;
}

function referencedSenseIds(linguistic) {
  const ids = new Set();
  for (const annotation of linguistic.annotations ?? []) {
    if (!['candidate', 'approved'].includes(annotation.review_state ?? 'candidate')) continue;
    for (const target of annotation.resolution_chain ?? []) {
      if (target?.target_type === 'sense' && typeof target.target_id === 'string') ids.add(target.target_id);
    }
  }
  return ids;
}

function main() {
  assert(CONTENT_ROOT, 'pass --content-root=/path/to/gef-content');
  assert(WORK, 'pass --work=<work-id>');
  assert(LANGUAGE, 'pass --language=<language-tag>');

  const linguisticPath = join(CONTENT_ROOT, 'works', WORK, 'linguistic', `${LANGUAGE}.json`);
  assert(existsSync(linguisticPath), `missing linguistic annotation file ${linguisticPath}`);
  const linguistic = readJson(linguisticPath);
  assert.equal(linguistic.work_id, WORK, 'linguistic work_id mismatch');
  assert.equal(linguistic.language, LANGUAGE, 'linguistic language mismatch');

  const manifestPath = join(DIST_BOOKS_DIR, WORK, LANGUAGE, 'manifest.json');
  const sqlitePath = join(DIST_BOOKS_DIR, WORK, LANGUAGE, 'lexicon-v2.sqlite');
  assert(existsSync(manifestPath), `missing ${manifestPath}; run compile-book-slices first`);
  assert(existsSync(sqlitePath), `missing ${sqlitePath}; run compile-book-slices first`);

  const manifest = readJson(manifestPath);
  assert.equal(manifest.formatVersion, 2, 'book slice must use format version 2');
  assert.equal(manifest.senseLinkExtensionVersion, 2, 'book slice must use sense-link extension version 2');
  assert.equal(manifest.workId, WORK, 'manifest workId mismatch');
  assert.equal(manifest.languageTag, LANGUAGE, 'manifest languageTag mismatch');

  const canonical = canonicalSenses(LANGUAGE);
  const referenced = referencedSenseIds(linguistic);
  const db = new Database(sqlitePath, { readonly: true });
  let checked = 0;
  try {
    const columns = new Set(db.prepare('PRAGMA table_info(senses)').all().map((row) => row.name));
    assert(columns.has('usage_profile_json'), 'book slice senses table omits usage_profile_json');

    const metadataVersion = db.prepare(
      `SELECT value FROM package_metadata WHERE key = 'sense_link_extension_version'`,
    ).get();
    assert.equal(metadataVersion?.value, '2', 'SQLite metadata does not advertise sense-link extension v2');

    const rows = db.prepare(
      'SELECT sense_id, lexeme_id, usage_profile_json, annotation_count FROM senses ORDER BY sense_id',
    ).all();
    for (const row of rows) {
      checked += 1;
      assert(referenced.has(row.sense_id), `${row.sense_id}: slice contains a sense not referenced by corpus evidence`);
      assert(canonical.has(row.sense_id), `${row.sense_id}: slice sense is missing from canonical lexicon`);
      assert.equal(row.lexeme_id, canonical.get(row.sense_id).lexeme_id, `${row.sense_id}: lexeme identity changed`);
      assert(row.annotation_count > 0, `${row.sense_id}: slice sense has zero annotation_count`);

      let profile;
      assert.doesNotThrow(() => {
        profile = JSON.parse(row.usage_profile_json);
      }, `${row.sense_id}: usage_profile_json is invalid JSON`);
      assert.deepEqual(
        profile,
        canonical.get(row.sense_id).usage_profile,
        `${row.sense_id}: usage profile changed or disappeared in book slice`,
      );
    }
  } finally {
    db.close();
  }

  assert(checked > 0, `${WORK}/${LANGUAGE}: compiled slice contains no referenced senses`);
  console.log(
    `✅ Book-slice usage-profile round-trip passed for ${WORK}/${LANGUAGE}: `
    + `${checked} referenced canonical sense row(s), extension v2.`,
  );
}

main();
