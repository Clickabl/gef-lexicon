#!/usr/bin/env node
/**
 * SQLite compiler for GEF lexical packages.
 *
 * Output:
 *   dist/dictionaries/{lang}/core-v1.sqlite
 *   dist/books/{work_id}/v1/languages/{lang}/content.sqlite
 *
 * Default builds include candidate + approved rows for development fixtures.
 * `--production` includes approved rows only. Compilation is always from a
 * freshly recreated database so removed source rows can never survive.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = join(REPO_ROOT, 'dist');
const PRODUCTION = process.argv.includes('--production');

function included(reviewState) {
  return reviewState === 'approved' || (!PRODUCTION && reviewState === 'candidate');
}

function initCoreDb(dbPath) {
  rmSync(dbPath, { force: true });
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE lexemes (
      lexeme_id TEXT PRIMARY KEY,
      lemma_nfc TEXT NOT NULL,
      upos TEXT NOT NULL,
      language_pos TEXT,
      proper_noun INTEGER NOT NULL DEFAULT 0,
      review_state TEXT NOT NULL
    );

    CREATE TABLE senses (
      sense_id TEXT PRIMARY KEY,
      lexeme_id TEXT NOT NULL,
      sense_key TEXT NOT NULL,
      primary_concept_id TEXT,
      cefr_level TEXT,
      register_label TEXT,
      FOREIGN KEY(lexeme_id) REFERENCES lexemes(lexeme_id)
    );

    CREATE TABLE definitions (
      sense_id TEXT NOT NULL,
      interface_lang TEXT NOT NULL,
      definition_text TEXT NOT NULL,
      PRIMARY KEY(sense_id, interface_lang),
      FOREIGN KEY(sense_id) REFERENCES senses(sense_id)
    );

    CREATE TABLE forms (
      form_id TEXT PRIMARY KEY,
      lexeme_id TEXT NOT NULL,
      surface_nfc TEXT NOT NULL,
      normalized_lookup TEXT NOT NULL,
      attested_in_text INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(lexeme_id) REFERENCES lexemes(lexeme_id)
    );

    CREATE TABLE form_analyses (
      analysis_id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      features_json TEXT NOT NULL,
      display_label_key TEXT,
      pronunciation_ipa TEXT,
      pronunciation_note TEXT,
      FOREIGN KEY(form_id) REFERENCES forms(form_id)
    );

    CREATE INDEX idx_forms_lookup ON forms(normalized_lookup);
    CREATE INDEX idx_lexemes_lemma ON lexemes(lemma_nfc);
  `);
  return db;
}

function statements(db) {
  return {
    lexeme: db.prepare(`
      INSERT INTO lexemes (lexeme_id, lemma_nfc, upos, language_pos, proper_noun, review_state)
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    sense: db.prepare(`
      INSERT INTO senses (sense_id, lexeme_id, sense_key, primary_concept_id, cefr_level, register_label)
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    definition: db.prepare(`
      INSERT INTO definitions (sense_id, interface_lang, definition_text)
      VALUES (?, ?, ?)
    `),
    form: db.prepare(`
      INSERT INTO forms (form_id, lexeme_id, surface_nfc, normalized_lookup, attested_in_text)
      VALUES (?, ?, ?, ?, ?)
    `),
    analysis: db.prepare(`
      INSERT INTO form_analyses
        (analysis_id, form_id, features_json, display_label_key, pronunciation_ipa, pronunciation_note)
      VALUES (?, ?, ?, ?, ?, ?)
    `),
  };
}

function insertLexiconDocument(db, data) {
  const insert = statements(db);
  db.transaction(() => {
    for (const lex of data.lexemes ?? []) {
      if (!included(lex.review_state)) continue;
      insert.lexeme.run(
        lex.lexeme_id,
        lex.lemma_nfc,
        lex.upos,
        lex.language_pos ?? null,
        lex.proper_noun ? 1 : 0,
        lex.review_state,
      );

      for (const sense of lex.senses ?? []) {
        insert.sense.run(
          sense.sense_id,
          lex.lexeme_id,
          sense.sense_key,
          sense.primary_concept_id ?? null,
          sense.cefr_level ?? null,
          sense.register_label ?? null,
        );
        for (const [interfaceLang, definition] of Object.entries(sense.definitions ?? {})) {
          insert.definition.run(sense.sense_id, interfaceLang, definition);
        }
      }

      for (const form of lex.forms ?? []) {
        insert.form.run(
          form.form_id,
          lex.lexeme_id,
          form.surface_nfc,
          form.normalized_lookup,
          form.attested_in_text ? 1 : 0,
        );
        for (const analysis of form.analyses ?? []) {
          insert.analysis.run(
            analysis.analysis_id,
            form.form_id,
            JSON.stringify(analysis.features ?? {}),
            analysis.display_label_key ?? null,
            analysis.pronunciation?.ipa ?? analysis.ipa ?? null,
            analysis.pronunciation?.note ?? null,
          );
        }
      }
    }
  })();

  const fk = db.prepare('PRAGMA foreign_key_check').all();
  if (fk.length > 0) throw new Error(`compiled lexical package has foreign-key errors: ${JSON.stringify(fk)}`);
}

function compileCoreLexicons() {
  const languagesDir = join(REPO_ROOT, 'languages');
  if (!existsSync(languagesDir)) return;

  for (const lang of readdirSync(languagesDir).filter((entry) => statSync(join(languagesDir, entry)).isDirectory()).sort()) {
    const source = join(languagesDir, lang, 'lexicon.json');
    if (!existsSync(source)) continue;

    const outDir = join(DIST_DIR, 'dictionaries', lang);
    mkdirSync(outDir, { recursive: true });
    const dbPath = join(outDir, 'core-v1.sqlite');
    const db = initCoreDb(dbPath);
    insertLexiconDocument(db, JSON.parse(readFileSync(source, 'utf8')));
    db.exec('ANALYZE; VACUUM;');
    db.close();
    console.log(`📦 ${PRODUCTION ? 'Production' : 'Development'} core: dist/dictionaries/${lang}/core-v1.sqlite`);
  }
}

function compileBookOverlays() {
  const worksDir = join(REPO_ROOT, 'works');
  if (!existsSync(worksDir)) return;

  for (const work of readdirSync(worksDir).filter((entry) => statSync(join(worksDir, entry)).isDirectory()).sort()) {
    const lexDir = join(worksDir, work, 'lexicon');
    if (!existsSync(lexDir)) continue;

    for (const filename of readdirSync(lexDir).filter((entry) => entry.endsWith('.json')).sort()) {
      const lang = filename.slice(0, -'.json'.length);
      const outDir = join(DIST_DIR, 'books', work, 'v1', 'languages', lang);
      mkdirSync(outDir, { recursive: true });
      const dbPath = join(outDir, 'content.sqlite');
      const db = initCoreDb(dbPath);
      insertLexiconDocument(db, JSON.parse(readFileSync(join(lexDir, filename), 'utf8')));
      db.exec('ANALYZE; VACUUM;');
      db.close();
      console.log(`📦 ${PRODUCTION ? 'Production' : 'Development'} overlay: dist/books/${work}/v1/languages/${lang}/content.sqlite`);
    }
  }
}

function main() {
  console.log(`⚡ Compiling GEF lexical SQLite packages (${PRODUCTION ? 'production' : 'development'})...`);
  compileCoreLexicons();
  compileBookOverlays();
  console.log('✅ SQLite compilation complete.');
}

main();
