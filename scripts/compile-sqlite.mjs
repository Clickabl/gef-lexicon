#!/usr/bin/env node
/**
 * SQLite Compiler for GEF Lexicon.
 * Compiles declarative JSON core lexicons and book overlays into production
 * SQLite databases:
 *   dist/dictionaries/{lang}/core-v1.sqlite
 *   dist/books/{work_id}/v1/languages/{lang}/content.sqlite
 *
 * Usage: node scripts/compile-sqlite.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DIST_DIR = join(REPO_ROOT, 'dist');

function initCoreDb(dbPath) {
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS lexemes (
      lexeme_id TEXT PRIMARY KEY,
      lemma_nfc TEXT NOT NULL,
      upos TEXT NOT NULL,
      language_pos TEXT,
      proper_noun INTEGER NOT NULL DEFAULT 0,
      review_state TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS senses (
      sense_id TEXT PRIMARY KEY,
      lexeme_id TEXT NOT NULL,
      sense_key TEXT NOT NULL,
      primary_concept_id TEXT,
      cefr_level TEXT,
      register_label TEXT,
      FOREIGN KEY(lexeme_id) REFERENCES lexemes(lexeme_id)
    );

    CREATE TABLE IF NOT EXISTS definitions (
      sense_id TEXT NOT NULL,
      interface_lang TEXT NOT NULL,
      definition_text TEXT NOT NULL,
      PRIMARY KEY(sense_id, interface_lang),
      FOREIGN KEY(sense_id) REFERENCES senses(sense_id)
    );

    CREATE TABLE IF NOT EXISTS forms (
      form_id TEXT PRIMARY KEY,
      lexeme_id TEXT NOT NULL,
      surface_nfc TEXT NOT NULL,
      normalized_lookup TEXT NOT NULL,
      attested_in_text INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(lexeme_id) REFERENCES lexemes(lexeme_id)
    );

    CREATE TABLE IF NOT EXISTS form_analyses (
      analysis_id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      features_json TEXT NOT NULL,
      display_label_key TEXT,
      FOREIGN KEY(form_id) REFERENCES forms(form_id)
    );

    CREATE INDEX IF NOT EXISTS idx_forms_lookup ON forms(normalized_lookup);
    CREATE INDEX IF NOT EXISTS idx_lexemes_lemma ON lexemes(lemma_nfc);
  `);
  return db;
}

function compileCoreLexicons() {
  const languagesDir = join(REPO_ROOT, 'languages');
  if (!existsSync(languagesDir)) return;

  const langs = readdirSync(languagesDir).filter((f) =>
    statSync(join(languagesDir, f)).isDirectory(),
  );

  for (const lang of langs) {
    const lexFile = join(languagesDir, lang, 'lexicon.json');
    if (!existsSync(lexFile)) continue;

    const outDir = join(DIST_DIR, 'dictionaries', lang);
    mkdirSync(outDir, { recursive: true });
    const dbPath = join(outDir, 'core-v1.sqlite');
    if (existsSync(dbPath)) {
      // Recompile fresh
      try { process.stderr.write(`Recompiling ${dbPath}\n`); } catch {}
    }

    const db = initCoreDb(dbPath);
    const data = JSON.parse(readFileSync(lexFile, 'utf8'));

    const insertLexeme = db.prepare(`
      INSERT OR REPLACE INTO lexemes (lexeme_id, lemma_nfc, upos, language_pos, proper_noun, review_state)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertSense = db.prepare(`
      INSERT OR REPLACE INTO senses (sense_id, lexeme_id, sense_key, primary_concept_id, cefr_level, register_label)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertDef = db.prepare(`
      INSERT OR REPLACE INTO definitions (sense_id, interface_lang, definition_text)
      VALUES (?, ?, ?)
    `);
    const insertForm = db.prepare(`
      INSERT OR REPLACE INTO forms (form_id, lexeme_id, surface_nfc, normalized_lookup, attested_in_text)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertAnalysis = db.prepare(`
      INSERT OR REPLACE INTO form_analyses (analysis_id, form_id, features_json, display_label_key)
      VALUES (?, ?, ?, ?)
    `);

    db.transaction(() => {
      for (const lex of data.lexemes || []) {
        insertLexeme.run(
          lex.lexeme_id,
          lex.lemma_nfc,
          lex.upos,
          lex.language_pos || null,
          lex.proper_noun ? 1 : 0,
          lex.review_state,
        );

        for (const s of lex.senses || []) {
          insertSense.run(
            s.sense_id,
            lex.lexeme_id,
            s.sense_key,
            s.primary_concept_id || null,
            s.cefr_level || null,
            s.register_label || null,
          );

          for (const [ilang, dtext] of Object.entries(s.definitions || {})) {
            insertDef.run(s.sense_id, ilang, dtext);
          }
        }

        for (const f of lex.forms || []) {
          insertForm.run(
            f.form_id,
            lex.lexeme_id,
            f.surface_nfc,
            f.normalized_lookup,
            f.attested_in_text ? 1 : 0,
          );

          for (const a of f.analyses || []) {
            insertAnalysis.run(
              a.analysis_id,
              f.form_id,
              JSON.stringify(a.features),
              a.display_label_key || null,
            );
          }
        }
      }
    })();

    db.close();
    console.log(`📦 Compiled SQLite core dictionary: dist/dictionaries/${lang}/core-v1.sqlite`);
  }
}

function compileBookOverlays() {
  const worksDir = join(REPO_ROOT, 'works');
  if (!existsSync(worksDir)) return;

  const works = readdirSync(worksDir).filter((f) =>
    statSync(join(worksDir, f)).isDirectory(),
  );

  for (const work of works) {
    const lexDir = join(worksDir, work, 'lexicon');
    if (!existsSync(lexDir)) continue;

    const lexFiles = readdirSync(lexDir).filter((f) => f.endsWith('.json'));
    for (const lf of lexFiles) {
      const lang = lf.replace('.json', '');
      const outDir = join(DIST_DIR, 'books', work, 'v1', 'languages', lang);
      mkdirSync(outDir, { recursive: true });
      const dbPath = join(outDir, 'content.sqlite');

      const db = initCoreDb(dbPath);
      const data = JSON.parse(readFileSync(join(lexDir, lf), 'utf8'));

      const insertLexeme = db.prepare(`
        INSERT OR REPLACE INTO lexemes (lexeme_id, lemma_nfc, upos, language_pos, proper_noun, review_state)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const insertSense = db.prepare(`
        INSERT OR REPLACE INTO senses (sense_id, lexeme_id, sense_key, primary_concept_id, cefr_level, register_label)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const insertDef = db.prepare(`
        INSERT OR REPLACE INTO definitions (sense_id, interface_lang, definition_text)
        VALUES (?, ?, ?)
      `);
      const insertForm = db.prepare(`
        INSERT OR REPLACE INTO forms (form_id, lexeme_id, surface_nfc, normalized_lookup, attested_in_text)
        VALUES (?, ?, ?, ?, ?)
      `);

      db.transaction(() => {
        for (const lex of data.lexemes || []) {
          insertLexeme.run(
            lex.lexeme_id,
            lex.lemma_nfc,
            lex.upos,
            lex.language_pos || null,
            lex.proper_noun ? 1 : 0,
            lex.review_state,
          );

          for (const s of lex.senses || []) {
            insertSense.run(
              s.sense_id,
              lex.lexeme_id,
              s.sense_key,
              s.primary_concept_id || null,
              s.cefr_level || null,
              s.register_label || null,
            );

            for (const [ilang, dtext] of Object.entries(s.definitions || {})) {
              insertDef.run(s.sense_id, ilang, dtext);
            }
          }

          for (const f of lex.forms || []) {
            insertForm.run(
              f.form_id,
              lex.lexeme_id,
              f.surface_nfc,
              f.normalized_lookup,
              f.attested_in_text ? 1 : 0,
            );
          }
        }
      })();

      db.close();
      console.log(`📦 Compiled SQLite book overlay: dist/books/${work}/v1/languages/${lang}/content.sqlite`);
    }
  }
}

function main() {
  console.log('⚡ Compiling GEF Lexicon SQLite packages...');
  compileCoreLexicons();
  compileBookOverlays();
  console.log('✅ SQLite compilation complete.');
}

main();
