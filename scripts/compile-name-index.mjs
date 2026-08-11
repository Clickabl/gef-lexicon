#!/usr/bin/env node
/**
 * Compile the existing Gef name database into one immutable shared SQLite index.
 *
 * Canonical authoring remains:
 *   names/{language}/*.json
 *   name-families/*.json
 *   sources/bibliography.json
 *
 * Runtime output:
 *   dist/names/name-index-v1.sqlite
 *
 * Default development builds include candidate + approved rows so fixtures can
 * be exercised. `--production` emits approved rows only. Neither mode mutates
 * authoring JSON or promotes review state.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = join(ROOT, 'dist', 'names');
const OUTPUT = join(OUTPUT_DIR, 'name-index-v1.sqlite');
const PRODUCTION = process.argv.includes('--production');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function listDirs(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path).filter((entry) => statSync(join(path, entry)).isDirectory());
}

function listJson(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path).filter((entry) => entry.endsWith('.json')).sort();
}

function included(reviewState) {
  return reviewState === 'approved' || (!PRODUCTION && reviewState === 'candidate');
}

export function normalizeNameSearch(value) {
  return value
    .normalize('NFC')
    .trim()
    .replace(/\s+/gu, ' ')
    .toLocaleLowerCase('und');
}

function stableId(prefix, ...parts) {
  const digest = createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 24);
  return `${prefix}.${digest}`;
}

function createSchema(db) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE package_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID;

    CREATE TABLE names (
      name_id TEXT PRIMARY KEY,
      language_tag TEXT NOT NULL,
      canonical_form TEXT NOT NULL,
      name_type TEXT NOT NULL,
      etymology_note TEXT,
      historical_note TEXT,
      review_state TEXT NOT NULL
    );
    CREATE INDEX names_language_idx ON names(language_tag, canonical_form);

    CREATE TABLE name_spellings (
      spelling_id TEXT PRIMARY KEY,
      name_id TEXT NOT NULL REFERENCES names(name_id),
      text TEXT NOT NULL,
      normalized_lookup TEXT NOT NULL,
      status TEXT NOT NULL,
      script TEXT,
      locale_tag TEXT,
      note TEXT
    );
    CREATE INDEX name_spellings_name_idx ON name_spellings(name_id);
    CREATE INDEX name_spellings_lookup_idx ON name_spellings(normalized_lookup);

    CREATE TABLE name_families (
      family_id TEXT PRIMARY KEY,
      family_key TEXT NOT NULL UNIQUE,
      origin_languages_json TEXT NOT NULL DEFAULT '[]',
      origin_note TEXT,
      etymology_note TEXT,
      meaning_note TEXT,
      review_state TEXT NOT NULL
    );

    CREATE TABLE name_equivalence_sets (
      equivalence_set_id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL REFERENCES name_families(family_id),
      role TEXT NOT NULL,
      note TEXT
    );
    CREATE INDEX name_equivalence_sets_family_idx ON name_equivalence_sets(family_id);

    CREATE TABLE name_family_forms (
      form_id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL REFERENCES name_families(family_id),
      equivalence_set_id TEXT NOT NULL REFERENCES name_equivalence_sets(equivalence_set_id),
      name_id TEXT REFERENCES names(name_id),
      text TEXT NOT NULL,
      normalized_lookup TEXT NOT NULL,
      language_tag TEXT NOT NULL,
      locale_tags_json TEXT NOT NULL DEFAULT '[]',
      script TEXT,
      relation_type TEXT NOT NULL,
      usage TEXT NOT NULL DEFAULT 'unknown',
      note TEXT,
      review_state TEXT NOT NULL
    );
    CREATE INDEX name_family_forms_family_idx ON name_family_forms(family_id, equivalence_set_id);
    CREATE INDEX name_family_forms_language_idx ON name_family_forms(language_tag, normalized_lookup);
    CREATE INDEX name_family_forms_lookup_idx ON name_family_forms(normalized_lookup);

    CREATE TABLE name_family_memberships (
      name_id TEXT NOT NULL REFERENCES names(name_id),
      family_id TEXT NOT NULL REFERENCES name_families(family_id),
      equivalence_set_id TEXT NOT NULL REFERENCES name_equivalence_sets(equivalence_set_id),
      form_id TEXT REFERENCES name_family_forms(form_id),
      note TEXT,
      PRIMARY KEY (name_id, family_id, equivalence_set_id)
    ) WITHOUT ROWID;

    CREATE TABLE name_gender_usage (
      usage_id TEXT PRIMARY KEY,
      name_id TEXT NOT NULL REFERENCES names(name_id),
      region TEXT,
      period_start INTEGER,
      period_end INTEGER,
      male_share REAL,
      female_share REAL,
      nonbinary_or_other_share REAL,
      unknown_share REAL,
      sample_size INTEGER,
      source_id TEXT NOT NULL,
      note TEXT
    );
    CREATE INDEX name_gender_usage_name_idx ON name_gender_usage(name_id, period_start, region);

    CREATE TABLE name_search_terms (
      search_term_id TEXT PRIMARY KEY,
      normalized_term TEXT NOT NULL,
      display_text TEXT NOT NULL,
      language_tag TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      family_id TEXT,
      equivalence_set_id TEXT,
      match_kind TEXT NOT NULL,
      review_state TEXT NOT NULL,
      rank_weight REAL NOT NULL DEFAULT 1.0
    );
    CREATE INDEX name_search_terms_prefix_idx
      ON name_search_terms(normalized_term, review_state, rank_weight DESC);
    CREATE INDEX name_search_terms_target_idx ON name_search_terms(target_type, target_id);
    CREATE INDEX name_search_terms_family_idx ON name_search_terms(family_id, language_tag);

    CREATE TABLE name_source_refs (
      owner_type TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      PRIMARY KEY (owner_type, owner_id, source_id)
    ) WITHOUT ROWID;

    CREATE VIEW approved_name_localization_forms AS
    SELECT f.form_id, f.family_id, f.equivalence_set_id, f.name_id, f.text,
           f.normalized_lookup, f.language_tag, f.locale_tags_json, f.script,
           f.relation_type, f.usage, f.note
    FROM name_family_forms AS f
    JOIN name_families AS fam ON fam.family_id = f.family_id
    WHERE f.review_state = 'approved' AND fam.review_state = 'approved';

    CREATE VIEW approved_name_search_terms AS
    SELECT * FROM name_search_terms WHERE review_state = 'approved';
  `);
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  rmSync(OUTPUT, { force: true });
  const db = new Database(OUTPUT);
  createSchema(db);

  const insertMetadata = db.prepare('INSERT INTO package_metadata (key, value) VALUES (?, ?)');
  insertMetadata.run('schema_version', '1');
  insertMetadata.run('build_mode', PRODUCTION ? 'production' : 'development');
  insertMetadata.run('source_repository', 'Clickabl/gef-lexicon');

  const insertName = db.prepare(`
    INSERT INTO names
      (name_id, language_tag, canonical_form, name_type, etymology_note, historical_note, review_state)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSpelling = db.prepare(`
    INSERT INTO name_spellings
      (spelling_id, name_id, text, normalized_lookup, status, script, locale_tag, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertFamily = db.prepare(`
    INSERT INTO name_families
      (family_id, family_key, origin_languages_json, origin_note, etymology_note, meaning_note, review_state)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSet = db.prepare(`
    INSERT INTO name_equivalence_sets (equivalence_set_id, family_id, role, note)
    VALUES (?, ?, ?, ?)
  `);
  const insertFamilyForm = db.prepare(`
    INSERT INTO name_family_forms
      (form_id, family_id, equivalence_set_id, name_id, text, normalized_lookup,
       language_tag, locale_tags_json, script, relation_type, usage, note, review_state)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMembership = db.prepare(`
    INSERT INTO name_family_memberships
      (name_id, family_id, equivalence_set_id, form_id, note)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertUsage = db.prepare(`
    INSERT INTO name_gender_usage
      (usage_id, name_id, region, period_start, period_end, male_share, female_share,
       nonbinary_or_other_share, unknown_share, sample_size, source_id, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSearch = db.prepare(`
    INSERT OR IGNORE INTO name_search_terms
      (search_term_id, normalized_term, display_text, language_tag, target_type,
       target_id, family_id, equivalence_set_id, match_kind, review_state, rank_weight)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSource = db.prepare(`
    INSERT OR IGNORE INTO name_source_refs (owner_type, owner_id, source_id)
    VALUES (?, ?, ?)
  `);

  const familyFormsById = new Map();
  const families = [];
  const familyDir = join(ROOT, 'name-families');
  for (const filename of listJson(familyDir)) {
    const family = readJson(join(familyDir, filename));
    if (!included(family.review_state)) continue;
    families.push(family);
    insertFamily.run(
      family.family_id,
      family.family_key,
      JSON.stringify(family.origin_languages ?? []),
      family.origin_note ?? null,
      family.etymology_note ?? null,
      family.meaning_note ?? null,
      family.review_state,
    );
    for (const sourceId of family.source_refs ?? []) insertSource.run('name_family', family.family_id, sourceId);
    for (const set of family.equivalence_sets ?? []) {
      insertSet.run(set.equivalence_set_id, family.family_id, set.role, set.note ?? null);
      for (const form of set.forms ?? []) {
        if (!included(form.review_state)) continue;
        familyFormsById.set(form.form_id, { family, set, form });
      }
    }
  }

  const names = [];
  const namesRoot = join(ROOT, 'names');
  for (const language of listDirs(namesRoot).sort()) {
    for (const filename of listJson(join(namesRoot, language))) {
      const doc = readJson(join(namesRoot, language, filename));
      for (const name of doc.names ?? []) {
        if (!included(name.review_state)) continue;
        names.push({ language, name });
        insertName.run(
          name.name_id,
          language,
          name.canonical_form,
          name.name_type,
          name.etymology_note ?? null,
          name.historical_note ?? null,
          name.review_state,
        );
        for (const sourceId of name.source_refs ?? []) insertSource.run('name', name.name_id, sourceId);

        for (const [index, spelling] of (name.spellings ?? []).entries()) {
          const spellingId = stableId('NSP', name.name_id, String(index), spelling.text, spelling.status);
          const normalized = normalizeNameSearch(spelling.text);
          insertSpelling.run(
            spellingId,
            name.name_id,
            spelling.text,
            normalized,
            spelling.status,
            spelling.script ?? null,
            spelling.locale ?? null,
            spelling.note ?? null,
          );
          const matchKind = spelling.status === 'canonical'
            ? 'canonical'
            : spelling.status === 'transliteration'
              ? 'transliteration'
              : spelling.status === 'historical'
                ? 'historical_form'
                : 'spelling_variant';
          insertSearch.run(
            stableId('NST', 'name', name.name_id, spellingId),
            normalized,
            spelling.text,
            language,
            'name',
            name.name_id,
            name.family_refs?.[0]?.family_id ?? null,
            name.family_refs?.[0]?.equivalence_set_id ?? null,
            matchKind,
            name.review_state,
            spelling.status === 'canonical' ? 2.0 : 1.2,
          );
        }

        for (const ref of name.family_refs ?? []) {
          insertMembership.run(
            name.name_id,
            ref.family_id,
            ref.equivalence_set_id,
            ref.form_id ?? null,
            ref.note ?? null,
          );
        }

        for (const [index, usage] of (name.gender_usage ?? []).entries()) {
          const usageId = stableId(
            'NGU', name.name_id, String(index), usage.source_id,
            usage.region ?? '', String(usage.period_start ?? ''), String(usage.period_end ?? ''),
          );
          insertUsage.run(
            usageId,
            name.name_id,
            usage.region ?? null,
            usage.period_start ?? null,
            usage.period_end ?? null,
            usage.male_share ?? null,
            usage.female_share ?? null,
            usage.nonbinary_or_other_share ?? null,
            usage.unknown_share ?? null,
            usage.sample_size ?? null,
            usage.source_id,
            usage.note ?? null,
          );
          insertSource.run('gender_usage', usageId, usage.source_id);
        }
      }
    }
  }

  // Insert family forms after names so optional `name_id` foreign keys resolve.
  for (const { family, set, form } of [...familyFormsById.values()].sort((a, b) => a.form.form_id.localeCompare(b.form.form_id))) {
    const linkedNameId = form.name_id && db.prepare('SELECT 1 FROM names WHERE name_id = ?').get(form.name_id)
      ? form.name_id
      : null;
    const normalized = normalizeNameSearch(form.text);
    insertFamilyForm.run(
      form.form_id,
      family.family_id,
      set.equivalence_set_id,
      linkedNameId,
      form.text,
      normalized,
      form.language_tag,
      JSON.stringify(form.locale_tags ?? []),
      form.script ?? null,
      form.relation_type,
      form.usage ?? 'unknown',
      form.note ?? null,
      form.review_state,
    );
    for (const sourceId of form.source_refs ?? []) insertSource.run('name_form', form.form_id, sourceId);
    insertSearch.run(
      stableId('NST', 'name_form', form.form_id),
      normalized,
      form.text,
      form.language_tag,
      'name_form',
      form.form_id,
      family.family_id,
      set.equivalence_set_id,
      relationToMatchKind(form.relation_type),
      form.review_state,
      form.usage === 'preferred' ? 1.9 : form.usage === 'common' ? 1.6 : 1.0,
    );
  }

  // A source family form may reference a language-local name whose membership
  // has not yet been explicitly authored. Do not synthesize that membership;
  // the family form is still independently searchable.

  const foreignKeyErrors = db.prepare('PRAGMA foreign_key_check').all();
  if (foreignKeyErrors.length > 0) {
    throw new Error(`name-index foreign-key errors: ${JSON.stringify(foreignKeyErrors)}`);
  }
  db.exec('ANALYZE; VACUUM;');

  const counts = {
    names: db.prepare('SELECT COUNT(*) AS n FROM names').get().n,
    families: db.prepare('SELECT COUNT(*) AS n FROM name_families').get().n,
    forms: db.prepare('SELECT COUNT(*) AS n FROM name_family_forms').get().n,
    searchTerms: db.prepare('SELECT COUNT(*) AS n FROM name_search_terms').get().n,
  };
  db.close();

  console.log(
    `📛 Compiled ${PRODUCTION ? 'production' : 'development'} name index: `
    + `${counts.names} names, ${counts.families} families, ${counts.forms} family forms, `
    + `${counts.searchTerms} search terms → dist/names/name-index-v1.sqlite`,
  );
}

function relationToMatchKind(relationType) {
  if (relationType === 'local_equivalent') return 'local_equivalent';
  if (relationType === 'traditional_adaptation' || relationType === 'borrowed_adaptation') return 'traditional_adaptation';
  if (relationType === 'transliteration') return 'transliteration';
  if (relationType === 'short_form') return 'short_form';
  if (relationType === 'diminutive') return 'diminutive';
  if (relationType === 'historical_form') return 'historical_form';
  if (relationType === 'spelling_variant') return 'spelling_variant';
  return 'canonical';
}

main();
