#!/usr/bin/env node
/**
 * Compile canonical language lexicons into deterministic v2 core packages.
 *
 * Outputs:
 *   dist/core/{language}/core-v2.sqlite
 *   dist/core/{language}/manifest.json
 *
 * Development builds include candidate + approved senses. --production keeps
 * approved senses only. Package versions are content-derived, not clock-derived,
 * so identical canonical inputs produce the same package identity.
 */
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { activeSenseConceptLinks } from './lib/concept-links.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANGUAGES_DIR = join(ROOT, 'languages');
const DIST_DIR = join(ROOT, 'dist', 'core');
const PRODUCTION = process.argv.includes('--production');
const LANGUAGE_ARG = process.argv.find((value) => value.startsWith('--language='));
const ONLY_LANGUAGE = LANGUAGE_ARG?.slice('--language='.length).trim() || null;
const FORMAT_VERSION = 2;
const FIELD_POLICY_VERSION = 2;

const FAST_FIELDS = Object.freeze({
  lexeme: [
    'lexeme_id',
    'language_tag',
    'lemma_nfc',
    'normalized_lemma',
    'upos',
    'language_pos',
    'proper_noun',
    'review_state',
  ],
  sense: [
    'sense_id',
    'lexeme_id',
    'sense_key',
    'primary_concept_id',
    'cefr_level',
    'register_label',
    'review_state',
    'learner_gloss_json',
    'definitions_json',
  ],
  senseConcept: ['sense_id', 'concept_id', 'relation', 'review_state'],
  form: [
    'form_id',
    'lexeme_id',
    'surface_nfc',
    'normalized_lookup',
    'attested_in_text',
  ],
  analysis: ['analysis_id', 'form_id', 'features_json', 'display_label_key'],
  pronunciation: ['analysis_id', 'ordinal', 'ipa', 'locale', 'notation'],
});

const DEEP_FIELDS = Object.freeze([
  'lexical features',
  'typed and legacy relation evidence',
  'concept-link notes, sources, and non-fast metadata',
  'examples',
  'etymology and source assertions',
  'safety and review provenance',
  'lifecycle redirects/split/merge metadata',
  'pronunciation media metadata beyond fast IPA/locale/notation',
  'future v2 extension fields not required for first-paint lookup',
]);

function sha256Bytes(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256File(path) {
  return sha256Bytes(readFileSync(path));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function includedReviewState(reviewState) {
  if (reviewState === 'approved') return true;
  return !PRODUCTION && reviewState === 'candidate';
}

function sourceFilesForLanguage(languageDir) {
  return readdirSync(languageDir)
    .filter((entry) => /^lexicon(?:-[a-z0-9-]+)?\.json$/iu.test(entry))
    .sort((left, right) => {
      if (left === 'lexicon.json') return -1;
      if (right === 'lexicon.json') return 1;
      return left.localeCompare(right);
    })
    .map((entry) => join(languageDir, entry));
}

function readLanguageDocuments(languageTag, files) {
  return files.map((path) => {
    const raw = readFileSync(path, 'utf8');
    const document = JSON.parse(raw);
    if (document.language_code && document.language_code !== languageTag) {
      throw new Error(`${relative(ROOT, path)} declares ${document.language_code}, expected ${languageTag}.`);
    }
    if (!Array.isArray(document.lexemes)) {
      throw new Error(`${relative(ROOT, path)} must contain a lexemes array.`);
    }
    return { path, raw, document };
  });
}

function reviewStateForSense(lexeme, sense) {
  return sense.review_state ?? lexeme.review_state ?? 'candidate';
}

function selectedLexemes(documents) {
  const selected = [];
  const seen = new Set();

  for (const { document, path } of documents) {
    for (const lexeme of document.lexemes) {
      if (!lexeme?.lexeme_id || !lexeme?.lemma_nfc || !lexeme?.upos) {
        throw new Error(`${relative(ROOT, path)} has a lexeme missing lexeme_id, lemma_nfc, or upos.`);
      }
      if (seen.has(lexeme.lexeme_id)) {
        throw new Error(`Duplicate lexeme_id ${lexeme.lexeme_id} across language sources.`);
      }
      seen.add(lexeme.lexeme_id);

      const senses = (lexeme.senses ?? []).filter((sense) => (
        sense?.sense_id && includedReviewState(reviewStateForSense(lexeme, sense))
      ));
      if (senses.length === 0) continue;
      selected.push({ ...lexeme, senses });
    }
  }

  return selected.sort((left, right) => left.lexeme_id.localeCompare(right.lexeme_id));
}

function initDatabase(path) {
  rmSync(path, { force: true });
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE package_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE lexemes (
      lexeme_id TEXT PRIMARY KEY,
      language_tag TEXT NOT NULL,
      lemma_nfc TEXT NOT NULL,
      normalized_lemma TEXT NOT NULL,
      upos TEXT NOT NULL,
      language_pos TEXT,
      proper_noun INTEGER NOT NULL DEFAULT 0,
      review_state TEXT NOT NULL,
      deep_json TEXT NOT NULL
    );

    CREATE TABLE senses (
      sense_id TEXT PRIMARY KEY,
      lexeme_id TEXT NOT NULL,
      sense_key TEXT,
      primary_concept_id TEXT,
      cefr_level TEXT,
      register_label TEXT,
      review_state TEXT NOT NULL,
      learner_gloss_json TEXT NOT NULL,
      definitions_json TEXT NOT NULL,
      deep_json TEXT NOT NULL,
      FOREIGN KEY(lexeme_id) REFERENCES lexemes(lexeme_id) ON DELETE CASCADE
    );

    CREATE TABLE sense_concepts (
      sense_id TEXT NOT NULL,
      concept_id TEXT NOT NULL,
      relation TEXT NOT NULL,
      review_state TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      PRIMARY KEY(sense_id, concept_id, relation),
      FOREIGN KEY(sense_id) REFERENCES senses(sense_id) ON DELETE CASCADE
    );

    CREATE TABLE forms (
      form_id TEXT PRIMARY KEY,
      lexeme_id TEXT NOT NULL,
      surface_nfc TEXT NOT NULL,
      normalized_lookup TEXT NOT NULL,
      attested_in_text INTEGER NOT NULL DEFAULT 0,
      deep_json TEXT NOT NULL,
      FOREIGN KEY(lexeme_id) REFERENCES lexemes(lexeme_id) ON DELETE CASCADE
    );

    CREATE TABLE analyses (
      analysis_id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      features_json TEXT NOT NULL,
      display_label_key TEXT,
      deep_json TEXT NOT NULL,
      FOREIGN KEY(form_id) REFERENCES forms(form_id) ON DELETE CASCADE
    );

    CREATE TABLE pronunciations (
      analysis_id TEXT NOT NULL,
      ordinal INTEGER NOT NULL,
      ipa TEXT,
      locale TEXT,
      notation TEXT,
      deep_json TEXT NOT NULL,
      PRIMARY KEY(analysis_id, ordinal),
      FOREIGN KEY(analysis_id) REFERENCES analyses(analysis_id) ON DELETE CASCADE
    );

    CREATE INDEX lexemes_lemma_idx ON lexemes(language_tag, normalized_lemma);
    CREATE INDEX senses_lexeme_idx ON senses(lexeme_id);
    CREATE INDEX senses_concept_idx ON senses(primary_concept_id);
    CREATE INDEX sense_concepts_sense_idx ON sense_concepts(sense_id, relation);
    CREATE INDEX sense_concepts_concept_idx ON sense_concepts(concept_id, relation);
    CREATE INDEX forms_lookup_idx ON forms(normalized_lookup);
    CREATE INDEX forms_lexeme_idx ON forms(lexeme_id);
    CREATE INDEX analyses_form_idx ON analyses(form_id);
  `);
  return db;
}

function insertPackage(db, languageTag, lexemes, packageVersion) {
  const insertMetadata = db.prepare('INSERT INTO package_metadata (key, value) VALUES (?, ?)');
  const insertLexeme = db.prepare(`
    INSERT INTO lexemes (
      lexeme_id, language_tag, lemma_nfc, normalized_lemma, upos,
      language_pos, proper_noun, review_state, deep_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSense = db.prepare(`
    INSERT INTO senses (
      sense_id, lexeme_id, sense_key, primary_concept_id, cefr_level,
      register_label, review_state, learner_gloss_json, definitions_json, deep_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSenseConcept = db.prepare(`
    INSERT INTO sense_concepts (sense_id, concept_id, relation, review_state, metadata_json)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertForm = db.prepare(`
    INSERT INTO forms (
      form_id, lexeme_id, surface_nfc, normalized_lookup, attested_in_text, deep_json
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertAnalysis = db.prepare(`
    INSERT INTO analyses (analysis_id, form_id, features_json, display_label_key, deep_json)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertPronunciation = db.prepare(`
    INSERT INTO pronunciations (analysis_id, ordinal, ipa, locale, notation, deep_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    insertMetadata.run('format_version', String(FORMAT_VERSION));
    insertMetadata.run('field_policy_version', String(FIELD_POLICY_VERSION));
    insertMetadata.run('language_tag', languageTag);
    insertMetadata.run('package_version', packageVersion);
    insertMetadata.run('build_mode', PRODUCTION ? 'production' : 'development');

    for (const lexeme of lexemes) {
      const lexemeDeep = {
        lexical_features: lexeme.lexical_features ?? {},
        relations: lexeme.relations ?? [],
        source_assertions: lexeme.source_assertions ?? [],
        provenance: lexeme.provenance ?? [],
        status: lexeme.status ?? 'active',
        replaced_by: lexeme.replaced_by ?? [],
        split_from: lexeme.split_from ?? null,
        merged_from: lexeme.merged_from ?? [],
      };
      insertLexeme.run(
        lexeme.lexeme_id,
        languageTag,
        lexeme.lemma_nfc,
        lexeme.normalized_lookup ?? lexeme.lemma_nfc.normalize('NFC').toLocaleLowerCase(languageTag),
        lexeme.upos,
        lexeme.language_pos ?? null,
        lexeme.proper_noun ? 1 : 0,
        lexeme.review_state ?? 'candidate',
        stableJson(lexemeDeep),
      );

      for (const sense of [...lexeme.senses].sort((left, right) => left.sense_id.localeCompare(right.sense_id))) {
        const reviewState = reviewStateForSense(lexeme, sense);
        const conceptLinks = activeSenseConceptLinks(sense, reviewState)
          .filter((link) => includedReviewState(link.review_state));
        const primaryConceptId = conceptLinks.find((link) => link.relation === 'primary')?.concept_id ?? null;
        const gloss = sense.learner_gloss ?? sense.sense_hint ?? {};
        const definitions = sense.definitions ?? {};
        const senseDeep = {
          concept_links: conceptLinks,
          relations: sense.relations ?? {
            homophones: sense.homophones ?? [],
            homonyms: sense.homonyms ?? [],
            synonyms: sense.synonyms ?? [],
            antonyms: sense.antonyms ?? [],
            confusable_senses: sense.confusable_senses ?? [],
          },
          examples: sense.examples ?? [],
          safety: sense.safety ?? null,
          provenance: sense.provenance ?? [],
          source_assertions: sense.source_assertions ?? [],
          difficulty: sense.difficulty ?? null,
          status: sense.status ?? 'active',
          replaced_by: sense.replaced_by ?? [],
          split_from: sense.split_from ?? null,
          merged_from: sense.merged_from ?? [],
        };
        insertSense.run(
          sense.sense_id,
          lexeme.lexeme_id,
          sense.sense_key ?? null,
          primaryConceptId,
          sense.cefr_level ?? null,
          sense.register_label ?? null,
          reviewState,
          stableJson(gloss),
          stableJson(definitions),
          stableJson(senseDeep),
        );
        for (const link of conceptLinks) {
          const metadata = {
            note: link.note ?? null,
            source_refs: link.source_refs ?? [],
            compatibility_source: link.compatibility_source ?? null,
          };
          insertSenseConcept.run(
            sense.sense_id,
            link.concept_id,
            link.relation,
            link.review_state,
            stableJson(metadata),
          );
        }
      }

      for (const form of [...(lexeme.forms ?? [])].sort((left, right) => left.form_id.localeCompare(right.form_id))) {
        if (!form?.form_id || !form?.surface_nfc) {
          throw new Error(`Lexeme ${lexeme.lexeme_id} has a form missing form_id or surface_nfc.`);
        }
        const formDeep = {
          script: form.script ?? null,
          region: form.region ?? null,
          tags: form.tags ?? [],
          status: form.status ?? 'active',
        };
        insertForm.run(
          form.form_id,
          lexeme.lexeme_id,
          form.surface_nfc,
          form.normalized_lookup ?? form.surface_nfc.normalize('NFC').toLocaleLowerCase(languageTag),
          form.attested_in_text ? 1 : 0,
          stableJson(formDeep),
        );

        for (const analysis of [...(form.analyses ?? [])].sort((left, right) => left.analysis_id.localeCompare(right.analysis_id))) {
          if (!analysis?.analysis_id) {
            throw new Error(`Form ${form.form_id} has an analysis without analysis_id.`);
          }
          const pronunciations = analysis.pronunciations
            ?? (analysis.pronunciation ? [analysis.pronunciation] : []);
          const analysisDeep = {
            tags: analysis.tags ?? [],
            note: analysis.note ?? null,
          };
          insertAnalysis.run(
            analysis.analysis_id,
            form.form_id,
            stableJson(analysis.features ?? {}),
            analysis.display_label_key ?? null,
            stableJson(analysisDeep),
          );

          pronunciations.forEach((pronunciation, ordinal) => {
            const pronunciationDeep = {
              audio: pronunciation.audio ?? pronunciation.audio_refs ?? [],
              syllabification: pronunciation.syllabification ?? null,
              transliteration: pronunciation.transliteration ?? null,
              rhyme: pronunciation.rhyme ?? null,
              note: pronunciation.note ?? null,
            };
            insertPronunciation.run(
              analysis.analysis_id,
              ordinal,
              pronunciation.ipa ?? null,
              pronunciation.locale ?? null,
              pronunciation.notation ?? null,
              stableJson(pronunciationDeep),
            );
          });
        }
      }
    }
  })();
}

function tableCount(db, table) {
  return db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
}

function validateDatabase(db, label) {
  const foreignKeys = db.prepare('PRAGMA foreign_key_check').all();
  if (foreignKeys.length > 0) {
    throw new Error(`${label} has foreign-key failures: ${JSON.stringify(foreignKeys)}`);
  }
  const quickCheck = db.prepare('PRAGMA quick_check').get();
  if (!quickCheck || quickCheck.quick_check !== 'ok') {
    throw new Error(`${label} failed SQLite quick_check: ${JSON.stringify(quickCheck)}`);
  }
}

function compileLanguage(languageTag) {
  const languageDir = join(LANGUAGES_DIR, languageTag);
  const sourceFiles = sourceFilesForLanguage(languageDir);
  if (sourceFiles.length === 0) return false;

  const documents = readLanguageDocuments(languageTag, sourceFiles);
  const lexemes = selectedLexemes(documents);
  const sourceManifest = documents.map(({ path, raw }) => ({
    path: relative(ROOT, path).replaceAll('\\', '/'),
    sha256: sha256Bytes(Buffer.from(raw, 'utf8')),
  }));
  const identityPayload = stableJson({
    formatVersion: FORMAT_VERSION,
    fieldPolicyVersion: FIELD_POLICY_VERSION,
    buildMode: PRODUCTION ? 'production' : 'development',
    languageTag,
    sources: sourceManifest,
  });
  const packageVersion = `v2-${sha256Bytes(identityPayload).slice(0, 16)}`;

  const outputDir = join(DIST_DIR, languageTag);
  mkdirSync(outputDir, { recursive: true });
  const sqlitePath = join(outputDir, 'core-v2.sqlite');
  const manifestPath = join(outputDir, 'manifest.json');
  const db = initDatabase(sqlitePath);

  insertPackage(db, languageTag, lexemes, packageVersion);
  validateDatabase(db, `core package ${languageTag}`);
  const counts = {
    lexemes: tableCount(db, 'lexemes'),
    senses: tableCount(db, 'senses'),
    sense_concepts: tableCount(db, 'sense_concepts'),
    forms: tableCount(db, 'forms'),
    analyses: tableCount(db, 'analyses'),
    pronunciations: tableCount(db, 'pronunciations'),
  };
  db.exec('ANALYZE; VACUUM;');
  db.close();

  const manifest = {
    formatVersion: FORMAT_VERSION,
    packageType: 'gef-core-lexicon',
    packageId: `gef.core.${languageTag}`,
    packageVersion,
    languageTag,
    buildMode: PRODUCTION ? 'production' : 'development',
    artifact: {
      path: 'core-v2.sqlite',
      mediaType: 'application/vnd.sqlite3',
      byteSize: statSync(sqlitePath).size,
      checksum: { algorithm: 'sha256', value: sha256File(sqlitePath) },
    },
    sources: sourceManifest,
    counts,
    fieldPolicy: {
      version: FIELD_POLICY_VERSION,
      fast: FAST_FIELDS,
      deep: DEEP_FIELDS,
    },
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`📦 ${languageTag}: ${packageVersion} (${counts.senses} senses, ${counts.sense_concepts} concept links)`);
  return true;
}

function main() {
  if (!existsSync(LANGUAGES_DIR)) throw new Error('languages/ directory not found.');
  const languages = readdirSync(LANGUAGES_DIR)
    .filter((entry) => statSync(join(LANGUAGES_DIR, entry)).isDirectory())
    .filter((entry) => !ONLY_LANGUAGE || entry === ONLY_LANGUAGE)
    .sort((left, right) => left.localeCompare(right));

  if (ONLY_LANGUAGE && languages.length === 0) {
    throw new Error(`Unknown language directory: ${ONLY_LANGUAGE}`);
  }

  let compiled = 0;
  for (const languageTag of languages) {
    if (compileLanguage(languageTag)) compiled += 1;
  }
  if (compiled === 0) throw new Error('No language lexicon sources were found to compile.');
  console.log(`✅ Compiled ${compiled} deterministic v2 core package${compiled === 1 ? '' : 's'}.`);
}

main();
