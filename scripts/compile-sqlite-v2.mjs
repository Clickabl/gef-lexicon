#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { computeSenseReadiness, mergeLexiconPackages, normalizeLexiconDocument } from './lib/lexicon-v2.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PRODUCTION = process.argv.includes('--production');
const included = (state) => state === 'approved' || (!PRODUCTION && state === 'candidate');

function sourceFiles(dir) {
  return readdirSync(dir).filter((name) => /^lexicon(?:-[a-z0-9-]+)?\.json$/iu.test(name)).sort();
}

function initDatabase(path) {
  rmSync(path, { force: true });
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE package_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE lexemes (
      lexeme_id TEXT PRIMARY KEY,
      language_code TEXT NOT NULL,
      lemma_nfc TEXT NOT NULL,
      upos TEXT NOT NULL,
      language_pos TEXT,
      lexical_features_json TEXT NOT NULL DEFAULT '{}',
      proper_noun INTEGER NOT NULL DEFAULT 0,
      name_id TEXT,
      review_state TEXT NOT NULL
    );
    CREATE TABLE senses (
      sense_id TEXT PRIMARY KEY,
      lexeme_id TEXT NOT NULL,
      sense_key TEXT NOT NULL,
      primary_concept_id TEXT,
      cefr_level TEXT,
      gef_level REAL,
      register_label TEXT,
      domains_json TEXT NOT NULL DEFAULT '[]',
      regions_json TEXT NOT NULL DEFAULT '[]',
      learner_json TEXT NOT NULL DEFAULT '{}',
      review_state TEXT NOT NULL,
      FOREIGN KEY(lexeme_id) REFERENCES lexemes(lexeme_id)
    );
    CREATE TABLE sense_concepts (
      sense_id TEXT NOT NULL,
      concept_id TEXT NOT NULL,
      relationship TEXT NOT NULL,
      confidence REAL,
      note TEXT,
      PRIMARY KEY(sense_id, concept_id, relationship),
      FOREIGN KEY(sense_id) REFERENCES senses(sense_id)
    );
    CREATE TABLE sense_localizations (
      sense_id TEXT NOT NULL,
      interface_language TEXT NOT NULL,
      gloss TEXT,
      definition TEXT NOT NULL,
      hint TEXT,
      review_state TEXT NOT NULL,
      PRIMARY KEY(sense_id, interface_language),
      FOREIGN KEY(sense_id) REFERENCES senses(sense_id)
    );
    CREATE TABLE forms (
      form_id TEXT PRIMARY KEY,
      lexeme_id TEXT NOT NULL,
      surface_nfc TEXT NOT NULL,
      normalized_lookup TEXT NOT NULL,
      review_state TEXT,
      FOREIGN KEY(lexeme_id) REFERENCES lexemes(lexeme_id)
    );
    CREATE TABLE form_analyses (
      analysis_id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      features_json TEXT NOT NULL,
      display_label_key TEXT,
      FOREIGN KEY(form_id) REFERENCES forms(form_id)
    );
    CREATE TABLE pronunciations (
      analysis_id TEXT NOT NULL,
      ordinal INTEGER NOT NULL,
      ipa TEXT NOT NULL,
      locale TEXT,
      notation TEXT,
      audio_asset_id TEXT,
      PRIMARY KEY(analysis_id, ordinal),
      FOREIGN KEY(analysis_id) REFERENCES form_analyses(analysis_id)
    );
    CREATE TABLE examples (
      example_id TEXT PRIMARY KEY,
      language_code TEXT NOT NULL,
      text_nfc TEXT NOT NULL,
      cefr_level TEXT,
      gef_level REAL,
      provenance_note TEXT,
      review_state TEXT NOT NULL
    );
    CREATE TABLE example_senses (
      example_id TEXT NOT NULL,
      sense_id TEXT NOT NULL,
      PRIMARY KEY(example_id, sense_id),
      FOREIGN KEY(example_id) REFERENCES examples(example_id),
      FOREIGN KEY(sense_id) REFERENCES senses(sense_id)
    );
    CREATE TABLE example_translations (
      example_id TEXT NOT NULL,
      interface_language TEXT NOT NULL,
      text TEXT NOT NULL,
      review_state TEXT,
      PRIMARY KEY(example_id, interface_language),
      FOREIGN KEY(example_id) REFERENCES examples(example_id)
    );
    CREATE TABLE relations (
      relation_id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      confidence REAL,
      difficulty_weight REAL,
      note TEXT,
      review_state TEXT NOT NULL
    );
    CREATE TABLE redirects (
      from_type TEXT NOT NULL,
      from_id TEXT NOT NULL,
      ordinal INTEGER NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      note TEXT,
      PRIMARY KEY(from_type, from_id, ordinal)
    );
    CREATE TABLE collections (
      collection_id TEXT PRIMARY KEY,
      collection_key TEXT NOT NULL,
      purpose TEXT NOT NULL,
      review_state TEXT NOT NULL
    );
    CREATE TABLE collection_members (
      collection_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      weight REAL,
      note TEXT,
      PRIMARY KEY(collection_id, target_type, target_id),
      FOREIGN KEY(collection_id) REFERENCES collections(collection_id)
    );
    CREATE TABLE sense_readiness (
      sense_id TEXT PRIMARY KEY,
      lookup_ready INTEGER NOT NULL,
      quiz_ready INTEGER NOT NULL,
      daily_ready INTEGER NOT NULL,
      reasons_json TEXT NOT NULL,
      FOREIGN KEY(sense_id) REFERENCES senses(sense_id)
    );
    CREATE INDEX idx_lexemes_lemma ON lexemes(lemma_nfc);
    CREATE INDEX idx_forms_lookup ON forms(normalized_lookup);
    CREATE INDEX idx_senses_lexeme ON senses(lexeme_id);
    CREATE INDEX idx_localizations_language ON sense_localizations(interface_language);
    CREATE INDEX idx_relations_source ON relations(source_type, source_id);
    CREATE INDEX idx_relations_target ON relations(target_type, target_id);
    CREATE INDEX idx_readiness_daily ON sense_readiness(daily_ready);
  `);
  return db;
}

function compilePackage(pkg, outputPath) {
  const db = initDatabase(outputPath);
  const insert = {
    meta: db.prepare('INSERT INTO package_meta (key, value) VALUES (?, ?)'),
    lexeme: db.prepare('INSERT INTO lexemes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    sense: db.prepare('INSERT INTO senses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    concept: db.prepare('INSERT INTO sense_concepts VALUES (?, ?, ?, ?, ?)'),
    localization: db.prepare('INSERT INTO sense_localizations VALUES (?, ?, ?, ?, ?, ?)'),
    form: db.prepare('INSERT INTO forms VALUES (?, ?, ?, ?, ?)'),
    analysis: db.prepare('INSERT INTO form_analyses VALUES (?, ?, ?, ?)'),
    pronunciation: db.prepare('INSERT INTO pronunciations VALUES (?, ?, ?, ?, ?, ?)'),
    example: db.prepare('INSERT INTO examples VALUES (?, ?, ?, ?, ?, ?, ?)'),
    exampleSense: db.prepare('INSERT INTO example_senses VALUES (?, ?)'),
    exampleTranslation: db.prepare('INSERT INTO example_translations VALUES (?, ?, ?, ?)'),
    relation: db.prepare('INSERT INTO relations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    redirect: db.prepare('INSERT INTO redirects VALUES (?, ?, ?, ?, ?, ?, ?)'),
    collection: db.prepare('INSERT INTO collections VALUES (?, ?, ?, ?)'),
    collectionMember: db.prepare('INSERT INTO collection_members VALUES (?, ?, ?, ?, ?)'),
    readiness: db.prepare('INSERT INTO sense_readiness VALUES (?, ?, ?, ?, ?)'),
  };

  const lexemeIds = new Set(pkg.lexemes.filter((item) => included(item.review_state)).map((item) => item.lexeme_id));
  const senseIds = new Set(pkg.senses.filter((item) => included(item.review_state) && lexemeIds.has(item.lexeme_id)).map((item) => item.sense_id));

  db.transaction(() => {
    insert.meta.run('schema_version', '2');
    insert.meta.run('language_code', pkg.language_code);
    insert.meta.run('build_mode', PRODUCTION ? 'production' : 'development');

    for (const item of pkg.lexemes) if (lexemeIds.has(item.lexeme_id)) insert.lexeme.run(
      item.lexeme_id, pkg.language_code, item.lemma_nfc, item.upos, item.language_pos ?? null,
      JSON.stringify(item.lexical_features ?? {}), item.proper_noun ? 1 : 0, item.name_id ?? null, item.review_state,
    );
    for (const item of pkg.senses) if (senseIds.has(item.sense_id)) {
      insert.sense.run(
        item.sense_id, item.lexeme_id, item.sense_key, item.primary_concept_id ?? null, item.cefr_level ?? null,
        item.gef_level ?? null, item.register_label ?? null, JSON.stringify(item.domains ?? []), JSON.stringify(item.regions ?? []),
        JSON.stringify(item.learner ?? {}), item.review_state,
      );
      for (const link of item.concept_links ?? []) insert.concept.run(item.sense_id, link.concept_id, link.relationship, link.confidence ?? null, link.note ?? null);
    }
    for (const item of pkg.localizations) if (senseIds.has(item.sense_id) && included(item.review_state)) insert.localization.run(
      item.sense_id, item.interface_language, item.gloss ?? null, item.definition, item.hint ?? null, item.review_state,
    );
    for (const item of pkg.forms) if (lexemeIds.has(item.lexeme_id) && (item.review_state === undefined || included(item.review_state))) {
      insert.form.run(item.form_id, item.lexeme_id, item.surface_nfc, item.normalized_lookup, item.review_state ?? null);
      for (const analysis of item.analyses ?? []) {
        insert.analysis.run(analysis.analysis_id, item.form_id, JSON.stringify(analysis.features ?? { base: {} }), analysis.display_label_key ?? null);
        (analysis.pronunciations ?? []).forEach((pronunciation, ordinal) => insert.pronunciation.run(
          analysis.analysis_id, ordinal, pronunciation.ipa, pronunciation.locale ?? null, pronunciation.notation ?? null, pronunciation.audio_asset_id ?? null,
        ));
      }
    }
    for (const item of pkg.examples) if (included(item.review_state) && (item.sense_ids ?? []).every((id) => senseIds.has(id))) {
      insert.example.run(item.example_id, item.language_code, item.text_nfc, item.cefr_level ?? null, item.gef_level ?? null, item.provenance_note ?? null, item.review_state);
      for (const senseId of item.sense_ids ?? []) insert.exampleSense.run(item.example_id, senseId);
      for (const translation of item.translations ?? []) if (translation.review_state === undefined || included(translation.review_state)) insert.exampleTranslation.run(
        item.example_id, translation.interface_language, translation.text, translation.review_state ?? null,
      );
    }
    for (const item of pkg.relations) if (included(item.review_state)) insert.relation.run(
      item.relation_id, item.source.type, item.source.id, item.relation_type, item.target.type, item.target.id,
      item.confidence ?? null, item.difficulty_weight ?? null, item.note ?? null, item.review_state,
    );
    for (const item of pkg.redirects) (item.to ?? []).forEach((target, ordinal) => insert.redirect.run(
      item.from_type, item.from_id, ordinal, target.type, target.id, item.reason, item.note ?? null,
    ));
    for (const item of pkg.collections) if (included(item.review_state)) {
      insert.collection.run(item.collection_id, item.collection_key, item.purpose, item.review_state);
      for (const member of item.members ?? []) insert.collectionMember.run(item.collection_id, member.target_type, member.target_id, member.weight ?? null, member.note ?? null);
    }
    for (const senseId of senseIds) {
      const readiness = computeSenseReadiness(pkg, senseId);
      insert.readiness.run(senseId, readiness.lookup_ready ? 1 : 0, readiness.quiz_ready ? 1 : 0, readiness.daily_ready ? 1 : 0, JSON.stringify(readiness.reasons));
    }
  })();

  const foreignKeyErrors = db.prepare('PRAGMA foreign_key_check').all();
  if (foreignKeyErrors.length) throw new Error(`Foreign-key errors in ${outputPath}: ${JSON.stringify(foreignKeyErrors)}`);
  db.exec('ANALYZE; VACUUM;');
  db.close();
}

console.log(`⚡ Compiling Lexicon v2 SQLite packages (${PRODUCTION ? 'production' : 'development'})...`);
const languagesRoot = join(ROOT, 'languages');
for (const lang of readdirSync(languagesRoot).filter((name) => statSync(join(languagesRoot, name)).isDirectory()).sort()) {
  const langDir = join(languagesRoot, lang);
  const files = sourceFiles(langDir);
  if (!files.length) continue;
  const packages = files.map((filename) => normalizeLexiconDocument(JSON.parse(readFileSync(join(langDir, filename), 'utf8'))));
  const pkg = mergeLexiconPackages(packages);
  const outDir = join(DIST, 'dictionaries', lang);
  mkdirSync(outDir, { recursive: true });
  const output = join(outDir, 'core-v2.sqlite');
  compilePackage(pkg, output);
  console.log(`📦 dist/dictionaries/${lang}/core-v2.sqlite (${files.length} source file${files.length === 1 ? '' : 's'})`);
}
console.log('✅ Lexicon v2 SQLite compilation complete.');
