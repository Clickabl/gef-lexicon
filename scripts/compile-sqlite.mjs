#!/usr/bin/env node
/**
 * SQLite compiler for GEF lexical packages.
 *
 * Output:
 *   dist/dictionaries/{lang}/core-v1.sqlite
 *   dist/books/{work_id}/v1/languages/{lang}/content.sqlite
 *
 * Default builds include candidate + approved rows for development fixtures.
 * `--production` includes approved rows only. Reusable multilingual lexical
 * sets may contribute entries without requiring a complete languages/{lang}
 * authoring tree.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { buildFamilyLexiconDocuments } from './lib/family-lexicon.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = join(REPO_ROOT, 'dist');
const PRODUCTION = process.argv.includes('--production');
const CONCEPTS = JSON.parse(readFileSync(join(REPO_ROOT, 'concepts', 'graph.json'), 'utf8')).concepts ?? [];

function included(reviewState) {
  return reviewState === 'approved' || (!PRODUCTION && reviewState === 'candidate');
}

function initCoreDb(dbPath) {
  rmSync(dbPath, { force: true });
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE concepts (
      concept_id TEXT PRIMARY KEY,
      concept_key TEXT NOT NULL UNIQUE,
      domain TEXT NOT NULL,
      planning_difficulty_hint TEXT
    );

    CREATE TABLE lexemes (
      lexeme_id TEXT PRIMARY KEY,
      lemma_nfc TEXT NOT NULL,
      normalized_lookup TEXT NOT NULL,
      upos TEXT NOT NULL,
      language_pos TEXT,
      proper_noun INTEGER NOT NULL DEFAULT 0,
      review_state TEXT NOT NULL
    );
    CREATE INDEX idx_lexemes_lookup ON lexemes(normalized_lookup);

    CREATE TABLE senses (
      sense_id TEXT PRIMARY KEY,
      lexeme_id TEXT NOT NULL,
      sense_key TEXT NOT NULL,
      primary_concept_id TEXT,
      cefr_level TEXT,
      register_label TEXT,
      review_state TEXT NOT NULL,
      FOREIGN KEY(lexeme_id) REFERENCES lexemes(lexeme_id),
      FOREIGN KEY(primary_concept_id) REFERENCES concepts(concept_id)
    );
    CREATE INDEX idx_senses_concept ON senses(primary_concept_id);

    CREATE TABLE sense_concepts (
      sense_id TEXT NOT NULL,
      concept_id TEXT NOT NULL,
      relation TEXT NOT NULL DEFAULT 'maps_to',
      PRIMARY KEY(sense_id, concept_id, relation),
      FOREIGN KEY(sense_id) REFERENCES senses(sense_id),
      FOREIGN KEY(concept_id) REFERENCES concepts(concept_id)
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
    CREATE INDEX idx_forms_lookup ON forms(normalized_lookup);

    CREATE TABLE form_analyses (
      analysis_id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      features_json TEXT NOT NULL,
      display_label_key TEXT,
      pronunciation_ipa TEXT,
      pronunciation_note TEXT,
      FOREIGN KEY(form_id) REFERENCES forms(form_id)
    );

    CREATE TABLE relations (
      relation_id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      note TEXT,
      review_state TEXT NOT NULL
    );
    CREATE INDEX idx_relations_source ON relations(source_type, source_id, relation_type);

    CREATE TABLE sense_lesson_offers (
      sense_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      role TEXT NOT NULL,
      rule_id TEXT NOT NULL DEFAULT '',
      queueable INTEGER NOT NULL DEFAULT 1,
      note TEXT,
      PRIMARY KEY(sense_id, lesson_id, role, rule_id),
      FOREIGN KEY(sense_id) REFERENCES senses(sense_id)
    );
    CREATE INDEX idx_sense_lesson_offers ON sense_lesson_offers(sense_id);
  `);

  const insertConcept = db.prepare(`INSERT INTO concepts (concept_id, concept_key, domain, planning_difficulty_hint) VALUES (?, ?, ?, ?)`);
  for (const concept of CONCEPTS) insertConcept.run(concept.concept_id, concept.concept_key, concept.domain, concept.planning_difficulty_hint ?? null);
  return db;
}

function statements(db) {
  return {
    lexeme: db.prepare(`INSERT INTO lexemes (lexeme_id, lemma_nfc, normalized_lookup, upos, language_pos, proper_noun, review_state) VALUES (?, ?, ?, ?, ?, ?, ?)`),
    sense: db.prepare(`INSERT INTO senses (sense_id, lexeme_id, sense_key, primary_concept_id, cefr_level, register_label, review_state) VALUES (?, ?, ?, ?, ?, ?, ?)`),
    senseConcept: db.prepare(`INSERT OR IGNORE INTO sense_concepts (sense_id, concept_id, relation) VALUES (?, ?, ?)`),
    definition: db.prepare(`INSERT INTO definitions (sense_id, interface_lang, definition_text) VALUES (?, ?, ?)`),
    form: db.prepare(`INSERT INTO forms (form_id, lexeme_id, surface_nfc, normalized_lookup, attested_in_text) VALUES (?, ?, ?, ?, ?)`),
    analysis: db.prepare(`INSERT INTO form_analyses (analysis_id, form_id, features_json, display_label_key, pronunciation_ipa, pronunciation_note) VALUES (?, ?, ?, ?, ?, ?)`),
    relation: db.prepare(`INSERT INTO relations (relation_id, source_type, source_id, relation_type, target_type, target_id, note, review_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
    lessonOffer: db.prepare(`INSERT INTO sense_lesson_offers (sense_id, lesson_id, role, rule_id, queueable, note) VALUES (?, ?, ?, ?, ?, ?)`)
  };
}

function relationId(sourceId, relation, index) {
  return `rel.${encodeURIComponent(sourceId)}.${relation.relation_type}.${index}`;
}

function insertLexiconDocument(db, data) {
  const insert = statements(db);
  db.transaction(() => {
    for (const lex of data.lexemes ?? []) {
      if (!included(lex.review_state)) continue;
      insert.lexeme.run(
        lex.lexeme_id,
        lex.lemma_nfc,
        lex.forms?.[0]?.normalized_lookup ?? lex.lemma_nfc.toLocaleLowerCase('und'),
        lex.upos,
        lex.language_pos ?? null,
        lex.proper_noun ? 1 : 0,
        lex.review_state
      );

      for (const sense of lex.senses ?? []) {
        const senseReviewState = sense.review_state ?? lex.review_state;
        if (!included(senseReviewState)) continue;
        insert.sense.run(
          sense.sense_id,
          lex.lexeme_id,
          sense.sense_key,
          sense.primary_concept_id ?? null,
          sense.cefr_level ?? null,
          sense.register_label ?? null,
          senseReviewState
        );

        const conceptRefs = sense.concept_refs?.length
          ? sense.concept_refs
          : (sense.primary_concept_id ? [{ concept_id: sense.primary_concept_id, relation: 'primary' }] : []);
        for (const ref of conceptRefs) insert.senseConcept.run(sense.sense_id, ref.concept_id, ref.relation ?? 'maps_to');
        for (const [interfaceLang, definition] of Object.entries(sense.definitions ?? {})) insert.definition.run(sense.sense_id, interfaceLang, definition);

        for (const [index, relation] of (sense.relations ?? []).entries()) {
          if (!included(relation.review_state ?? senseReviewState)) continue;
          insert.relation.run(
            relationId(sense.sense_id, relation, index),
            'sense',
            sense.sense_id,
            relation.relation_type,
            relation.target_type,
            relation.target_id,
            relation.note ?? null,
            relation.review_state ?? senseReviewState
          );
        }
        for (const offer of sense.lesson_refs ?? []) insert.lessonOffer.run(
          sense.sense_id,
          offer.lesson_id,
          offer.role,
          offer.rule_id ?? '',
          offer.queueable === false ? 0 : 1,
          offer.note ?? null
        );
      }

      for (const form of lex.forms ?? []) {
        insert.form.run(form.form_id, lex.lexeme_id, form.surface_nfc, form.normalized_lookup, form.attested_in_text ? 1 : 0);
        for (const analysis of form.analyses ?? []) {
          const pronunciation = analysis.pronunciations?.[0] ?? analysis.pronunciation;
          insert.analysis.run(
            analysis.analysis_id,
            form.form_id,
            JSON.stringify(analysis.features ?? {}),
            analysis.display_label_key ?? null,
            pronunciation?.ipa ?? analysis.ipa ?? null,
            pronunciation?.note ?? null
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
  const authoredLanguages = existsSync(languagesDir)
    ? readdirSync(languagesDir).filter((entry) => statSync(join(languagesDir, entry)).isDirectory())
    : [];
  const familyDocs = buildFamilyLexiconDocuments(REPO_ROOT);
  const allLanguages = [...new Set([...authoredLanguages, ...familyDocs.keys()])].sort();

  for (const lang of allLanguages) {
    const source = join(languagesDir, lang, 'lexicon.json');
    const familyDoc = familyDocs.get(lang);
    if (!existsSync(source) && !familyDoc) continue;

    const outDir = join(DIST_DIR, 'dictionaries', lang);
    mkdirSync(outDir, { recursive: true });
    const dbPath = join(outDir, 'core-v1.sqlite');
    const db = initCoreDb(dbPath);
    if (existsSync(source)) insertLexiconDocument(db, JSON.parse(readFileSync(source, 'utf8')));
    if (familyDoc) insertLexiconDocument(db, familyDoc);
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
