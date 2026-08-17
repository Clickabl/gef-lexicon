#!/usr/bin/env node
/**
 * Compile book-language Lexi slices from canonical gef-content occurrence
 * references plus canonical gef-lexicon language records.
 *
 * Required:
 *   --content-root=/path/to/gef-content
 *
 * Optional:
 *   --work=frog-king
 *   --language=es
 *   --production
 *
 * Outputs:
 *   dist/books/{work}/{language}/lexicon-v2.sqlite
 *   dist/books/{work}/{language}/manifest.json
 *
 * Exact story sentences are not copied into the slice. For unannotated lookup
 * fallback, the compiler emits only a unique normalized surface inventory.
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
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANGUAGES_DIR = join(ROOT, 'languages');
const DIST_DIR = join(ROOT, 'dist', 'books');
const PRODUCTION = process.argv.includes('--production');
const CONTENT_ARG = process.argv.find((value) => value.startsWith('--content-root='));
const WORK_ARG = process.argv.find((value) => value.startsWith('--work='));
const LANGUAGE_ARG = process.argv.find((value) => value.startsWith('--language='));
const CONTENT_ROOT = CONTENT_ARG ? resolve(CONTENT_ARG.slice('--content-root='.length)) : null;
const ONLY_WORK = WORK_ARG?.slice('--work='.length).trim() || null;
const ONLY_LANGUAGE = LANGUAGE_ARG?.slice('--language='.length).trim() || null;
const FORMAT_VERSION = 2;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256File(path) {
  return sha256(readFileSync(path));
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

function normalizeLookup(value) {
  return value.normalize('NFC').toLocaleLowerCase('und');
}

function includedReviewState(reviewState) {
  if (reviewState === 'approved') return true;
  return !PRODUCTION && reviewState === 'candidate';
}

function sourceFilesForLanguage(languageTag) {
  const languageDir = join(LANGUAGES_DIR, languageTag);
  if (!existsSync(languageDir)) return [];
  return readdirSync(languageDir)
    .filter((entry) => /^lexicon(?:-[a-z0-9-]+)?\.json$/iu.test(entry))
    .sort((left, right) => {
      if (left === 'lexicon.json') return -1;
      if (right === 'lexicon.json') return 1;
      return left.localeCompare(right);
    })
    .map((entry) => join(languageDir, entry));
}

function loadCanonicalLanguage(languageTag) {
  const sourceFiles = sourceFilesForLanguage(languageTag);
  if (sourceFiles.length === 0) {
    throw new Error(`No canonical lexicon sources exist for language ${languageTag}.`);
  }

  const lexemes = [];
  const lexemeById = new Map();
  const senseById = new Map();
  const formById = new Map();
  const analysisById = new Map();

  for (const sourcePath of sourceFiles) {
    const document = JSON.parse(readFileSync(sourcePath, 'utf8'));
    if (document.language_code && document.language_code !== languageTag) {
      throw new Error(`${relative(ROOT, sourcePath)} declares ${document.language_code}, expected ${languageTag}.`);
    }
    for (const lexeme of document.lexemes ?? []) {
      if (!lexeme.lexeme_id || !lexeme.lemma_nfc || !lexeme.upos) {
        throw new Error(`${relative(ROOT, sourcePath)} contains a lexeme without canonical identity fields.`);
      }
      if (lexemeById.has(lexeme.lexeme_id)) {
        throw new Error(`Duplicate lexeme_id ${lexeme.lexeme_id} in ${languageTag}.`);
      }
      lexemes.push(lexeme);
      lexemeById.set(lexeme.lexeme_id, lexeme);
      for (const sense of lexeme.senses ?? []) {
        if (sense?.sense_id) senseById.set(sense.sense_id, { sense, lexeme });
      }
      for (const form of lexeme.forms ?? []) {
        if (!form?.form_id) continue;
        formById.set(form.form_id, { form, lexeme });
        for (const analysis of form.analyses ?? []) {
          if (analysis?.analysis_id) analysisById.set(analysis.analysis_id, { analysis, form, lexeme });
        }
      }
    }
  }

  return {
    sourceFiles,
    lexemes,
    lexemeById,
    senseById,
    formById,
    analysisById,
  };
}

function contentWorkDirs() {
  const worksDir = join(CONTENT_ROOT, 'works');
  if (!existsSync(worksDir)) throw new Error(`${worksDir} does not exist.`);
  return readdirSync(worksDir)
    .filter((entry) => statSync(join(worksDir, entry)).isDirectory())
    .filter((entry) => !ONLY_WORK || entry === ONLY_WORK)
    .sort((left, right) => left.localeCompare(right));
}

function annotatedLanguageFiles(workId) {
  const linguisticDir = join(CONTENT_ROOT, 'works', workId, 'linguistic');
  if (!existsSync(linguisticDir)) return [];
  return readdirSync(linguisticDir)
    .filter((entry) => entry.endsWith('.json'))
    .map((entry) => ({
      languageTag: entry.slice(0, -'.json'.length),
      path: join(linguisticDir, entry),
    }))
    .filter(({ languageTag }) => !ONLY_LANGUAGE || languageTag === ONLY_LANGUAGE)
    .sort((left, right) => left.languageTag.localeCompare(right.languageTag));
}

function editionPath(workId, languageTag) {
  const path = join(CONTENT_ROOT, 'works', workId, 'editions', `${languageTag}.json`);
  return existsSync(path) ? path : null;
}

function extractSenseReferences(annotationDocument) {
  const counts = new Map();
  for (const annotation of annotationDocument.annotations ?? []) {
    if (!includedReviewState(annotation.review_state ?? 'candidate')) continue;
    for (const target of annotation.resolution_chain ?? []) {
      if (target?.target_type !== 'sense' || typeof target.target_id !== 'string') continue;
      counts.set(target.target_id, (counts.get(target.target_id) ?? 0) + 1);
    }
  }
  return counts;
}

function tokenizeEditionSurfaceInventory(edition) {
  const counts = new Map();
  const examples = new Map();
  const wordPattern = /[\p{L}\p{M}\p{N}]+(?:['’\-][\p{L}\p{M}\p{N}]+)*/gu;
  for (const segment of edition.segments ?? []) {
    if (typeof segment?.text !== 'string') continue;
    for (const match of segment.text.matchAll(wordPattern)) {
      const surface = match[0];
      const normalized = normalizeLookup(surface);
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      if (!examples.has(normalized)) examples.set(normalized, surface);
    }
  }
  return [...counts]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([normalizedLookup, occurrenceCount]) => ({
      normalizedLookup,
      surfaceExample: examples.get(normalizedLookup),
      occurrenceCount,
    }));
}

function relationCandidates(sense) {
  const rows = [];
  const push = (relationType, raw) => {
    for (const value of Array.isArray(raw) ? raw : []) rows.push({ relationType, value });
  };

  if (Array.isArray(sense.relations)) {
    for (const relation of sense.relations) {
      rows.push({ relationType: relation.relation_type ?? relation.type ?? 'related', value: relation });
    }
  } else if (sense.relations && typeof sense.relations === 'object') {
    for (const [relationType, values] of Object.entries(sense.relations)) push(relationType, values);
  }

  push('synonym', sense.synonyms);
  push('antonym', sense.antonyms);
  push('homophone', sense.homophones);
  push('homonym', sense.homonyms);
  push('confusable', sense.confusable_senses);
  push('broader', sense.broader_senses);
  push('narrower', sense.narrower_senses);
  return rows;
}

function relationTargetId(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return null;
  return value.target_id ?? value.sense_id ?? value.lexeme_id ?? value.form_id ?? null;
}

function readableTarget(targetId, canonical) {
  const senseHit = canonical.senseById.get(targetId);
  if (senseHit) return { targetType: 'sense', display: senseHit.lexeme.lemma_nfc };
  const lexeme = canonical.lexemeById.get(targetId);
  if (lexeme) return { targetType: 'lexeme', display: lexeme.lemma_nfc };
  const formHit = canonical.formById.get(targetId);
  if (formHit) return { targetType: 'form', display: formHit.form.surface_nfc };
  const analysisHit = canonical.analysisById.get(targetId);
  if (analysisHit) return { targetType: 'analysis', display: analysisHit.form.surface_nfc };
  return { targetType: 'unresolved', display: null };
}

function selectedLexemesForSenseReferences(canonical, senseReferences) {
  const selectedByLexeme = new Map();
  for (const senseId of senseReferences.keys()) {
    const hit = canonical.senseById.get(senseId);
    if (!hit) throw new Error(`Referenced canonical sense ${senseId} is missing from gef-lexicon.`);
    const reviewState = hit.sense.review_state ?? hit.lexeme.review_state ?? 'candidate';
    if (!includedReviewState(reviewState)) continue;
    const existing = selectedByLexeme.get(hit.lexeme.lexeme_id) ?? { lexeme: hit.lexeme, senses: [] };
    existing.senses.push(hit.sense);
    selectedByLexeme.set(hit.lexeme.lexeme_id, existing);
  }
  return [...selectedByLexeme.values()]
    .map(({ lexeme, senses }) => ({
      lexeme,
      senses: senses.sort((left, right) => left.sense_id.localeCompare(right.sense_id)),
    }))
    .sort((left, right) => left.lexeme.lexeme_id.localeCompare(right.lexeme.lexeme_id));
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
      lemma_nfc TEXT NOT NULL,
      normalized_lemma TEXT NOT NULL,
      upos TEXT NOT NULL,
      language_pos TEXT,
      proper_noun INTEGER NOT NULL DEFAULT 0,
      review_state TEXT NOT NULL
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
      annotation_count INTEGER NOT NULL,
      FOREIGN KEY(lexeme_id) REFERENCES lexemes(lexeme_id) ON DELETE CASCADE
    );

    CREATE TABLE forms (
      form_id TEXT PRIMARY KEY,
      lexeme_id TEXT NOT NULL,
      surface_nfc TEXT NOT NULL,
      normalized_lookup TEXT NOT NULL,
      attested_in_text INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(lexeme_id) REFERENCES lexemes(lexeme_id) ON DELETE CASCADE
    );

    CREATE TABLE analyses (
      analysis_id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      features_json TEXT NOT NULL,
      display_label_key TEXT,
      pronunciations_json TEXT NOT NULL,
      FOREIGN KEY(form_id) REFERENCES forms(form_id) ON DELETE CASCADE
    );

    CREATE TABLE relation_stubs (
      source_sense_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_display TEXT,
      metadata_json TEXT NOT NULL,
      PRIMARY KEY(source_sense_id, relation_type, target_id),
      FOREIGN KEY(source_sense_id) REFERENCES senses(sense_id) ON DELETE CASCADE
    );

    CREATE TABLE fallback_surfaces (
      normalized_lookup TEXT PRIMARY KEY,
      surface_example TEXT NOT NULL,
      occurrence_count INTEGER NOT NULL
    );

    CREATE INDEX forms_lookup_idx ON forms(normalized_lookup);
    CREATE INDEX senses_lexeme_idx ON senses(lexeme_id);
    CREATE INDEX relation_source_idx ON relation_stubs(source_sense_id);
  `);
  return db;
}

function insertSlice(db, args) {
  const { workId, languageTag, packageVersion, selectedLexemes, senseReferences, canonical, fallbackSurfaces } = args;
  const metadata = db.prepare('INSERT INTO package_metadata (key, value) VALUES (?, ?)');
  const insertLexeme = db.prepare(`
    INSERT INTO lexemes (lexeme_id, lemma_nfc, normalized_lemma, upos, language_pos, proper_noun, review_state)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSense = db.prepare(`
    INSERT INTO senses (
      sense_id, lexeme_id, sense_key, primary_concept_id, cefr_level, register_label,
      review_state, learner_gloss_json, definitions_json, deep_json, annotation_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertForm = db.prepare(`
    INSERT INTO forms (form_id, lexeme_id, surface_nfc, normalized_lookup, attested_in_text)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertAnalysis = db.prepare(`
    INSERT INTO analyses (analysis_id, form_id, features_json, display_label_key, pronunciations_json)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertRelation = db.prepare(`
    INSERT OR IGNORE INTO relation_stubs (
      source_sense_id, relation_type, target_id, target_type, target_display, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertFallback = db.prepare(`
    INSERT INTO fallback_surfaces (normalized_lookup, surface_example, occurrence_count)
    VALUES (?, ?, ?)
  `);

  db.transaction(() => {
    metadata.run('format_version', String(FORMAT_VERSION));
    metadata.run('package_type', 'gef-book-lexicon-slice');
    metadata.run('package_version', packageVersion);
    metadata.run('work_id', workId);
    metadata.run('language_tag', languageTag);
    metadata.run('build_mode', PRODUCTION ? 'production' : 'development');
    metadata.run('fallback_semantics', 'surface-inventory-only-no-sense-certainty');

    for (const { lexeme, senses } of selectedLexemes) {
      insertLexeme.run(
        lexeme.lexeme_id,
        lexeme.lemma_nfc,
        lexeme.normalized_lookup ?? normalizeLookup(lexeme.lemma_nfc),
        lexeme.upos,
        lexeme.language_pos ?? null,
        lexeme.proper_noun ? 1 : 0,
        lexeme.review_state ?? 'candidate',
      );

      for (const sense of senses) {
        const reviewState = sense.review_state ?? lexeme.review_state ?? 'candidate';
        insertSense.run(
          sense.sense_id,
          lexeme.lexeme_id,
          sense.sense_key ?? null,
          sense.primary_concept_id ?? null,
          sense.cefr_level ?? null,
          sense.register_label ?? null,
          reviewState,
          stableJson(sense.learner_gloss ?? sense.sense_hint ?? {}),
          stableJson(sense.definitions ?? {}),
          stableJson({
            concept_links: sense.concept_links ?? [],
            safety: sense.safety ?? null,
            provenance: sense.provenance ?? [],
            status: sense.status ?? 'active',
            replaced_by: sense.replaced_by ?? [],
          }),
          senseReferences.get(sense.sense_id) ?? 0,
        );

        for (const candidate of relationCandidates(sense)) {
          const targetId = relationTargetId(candidate.value);
          if (!targetId) continue;
          const readable = readableTarget(targetId, canonical);
          insertRelation.run(
            sense.sense_id,
            candidate.relationType,
            targetId,
            readable.targetType,
            readable.display,
            stableJson(typeof candidate.value === 'object' ? candidate.value : {}),
          );
        }
      }

      for (const form of lexeme.forms ?? []) {
        if (!form?.form_id || !form?.surface_nfc) continue;
        insertForm.run(
          form.form_id,
          lexeme.lexeme_id,
          form.surface_nfc,
          form.normalized_lookup ?? normalizeLookup(form.surface_nfc),
          form.attested_in_text ? 1 : 0,
        );
        for (const analysis of form.analyses ?? []) {
          if (!analysis?.analysis_id) continue;
          insertAnalysis.run(
            analysis.analysis_id,
            form.form_id,
            stableJson(analysis.features ?? {}),
            analysis.display_label_key ?? null,
            stableJson(analysis.pronunciations ?? (analysis.pronunciation ? [analysis.pronunciation] : [])),
          );
        }
      }
    }

    for (const fallback of fallbackSurfaces) {
      insertFallback.run(fallback.normalizedLookup, fallback.surfaceExample, fallback.occurrenceCount);
    }
  })();
}

function validateDatabase(db, label) {
  const foreignKeys = db.prepare('PRAGMA foreign_key_check').all();
  if (foreignKeys.length > 0) throw new Error(`${label} has foreign-key failures: ${JSON.stringify(foreignKeys)}`);
  const quick = db.prepare('PRAGMA quick_check').get();
  if (!quick || quick.quick_check !== 'ok') throw new Error(`${label} failed quick_check: ${JSON.stringify(quick)}`);
}

function tableCount(db, table) {
  return db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
}

function compileSlice(workId, languageTag, linguisticPath) {
  const linguisticRaw = readFileSync(linguisticPath, 'utf8');
  const linguistic = JSON.parse(linguisticRaw);
  if (linguistic.work_id !== workId) throw new Error(`${linguisticPath}: work_id mismatch.`);
  if (linguistic.language !== languageTag) throw new Error(`${linguisticPath}: language mismatch.`);

  const canonical = loadCanonicalLanguage(languageTag);
  const senseReferences = extractSenseReferences(linguistic);
  const selectedLexemes = selectedLexemesForSenseReferences(canonical, senseReferences);

  const edition = editionPath(workId, languageTag);
  let fallbackSurfaces = [];
  let editionSha256 = null;
  if (edition) {
    const editionRaw = readFileSync(edition, 'utf8');
    const editionDocument = JSON.parse(editionRaw);
    if (editionDocument.work_id !== workId || editionDocument.language !== languageTag) {
      throw new Error(`${edition}: work/language identity mismatch.`);
    }
    fallbackSurfaces = tokenizeEditionSurfaceInventory(editionDocument);
    editionSha256 = sha256(Buffer.from(editionRaw, 'utf8'));
  }

  const lexiconSources = canonical.sourceFiles.map((path) => ({
    path: relative(ROOT, path).replaceAll('\\', '/'),
    sha256: sha256File(path),
  }));
  const contentSources = [
    {
      path: relative(CONTENT_ROOT, linguisticPath).replaceAll('\\', '/'),
      sha256: sha256(Buffer.from(linguisticRaw, 'utf8')),
      role: 'occurrence-sense-references',
    },
    ...(edition ? [{
      path: relative(CONTENT_ROOT, edition).replaceAll('\\', '/'),
      sha256: editionSha256,
      role: 'surface-fallback-inventory',
    }] : []),
  ];
  const identityPayload = stableJson({
    formatVersion: FORMAT_VERSION,
    buildMode: PRODUCTION ? 'production' : 'development',
    workId,
    languageTag,
    lexiconSources,
    contentSources,
  });
  const packageVersion = `v2-${sha256(identityPayload).slice(0, 16)}`;

  const outputDir = join(DIST_DIR, workId, languageTag);
  mkdirSync(outputDir, { recursive: true });
  const sqlitePath = join(outputDir, 'lexicon-v2.sqlite');
  const db = initDatabase(sqlitePath);
  insertSlice(db, {
    workId,
    languageTag,
    packageVersion,
    selectedLexemes,
    senseReferences,
    canonical,
    fallbackSurfaces,
  });
  validateDatabase(db, `${workId}/${languageTag} slice`);
  const counts = {
    referencedSenses: tableCount(db, 'senses'),
    lexemes: tableCount(db, 'lexemes'),
    forms: tableCount(db, 'forms'),
    analyses: tableCount(db, 'analyses'),
    relationStubs: tableCount(db, 'relation_stubs'),
    fallbackSurfaces: tableCount(db, 'fallback_surfaces'),
  };
  db.exec('ANALYZE; VACUUM;');
  db.close();

  const manifest = {
    formatVersion: FORMAT_VERSION,
    packageType: 'gef-book-lexicon-slice',
    packageId: `gef.book.${workId}.${languageTag}.lexicon`,
    packageVersion,
    workId,
    languageTag,
    buildMode: PRODUCTION ? 'production' : 'development',
    lexiconContractVersion: linguistic.lexicon_contract_version ?? null,
    artifact: {
      path: 'lexicon-v2.sqlite',
      mediaType: 'application/vnd.sqlite3',
      byteSize: statSync(sqlitePath).size,
      checksum: { algorithm: 'sha256', value: sha256File(sqlitePath) },
    },
    sources: { lexicon: lexiconSources, content: contentSources },
    counts,
    fallback: {
      mode: edition ? 'surface-inventory' : 'core-only',
      exactSenseCertainty: false,
      storyTextCopiedIntoSlice: false,
    },
  };
  writeFileSync(join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`📚 ${workId}/${languageTag}: ${packageVersion} (${counts.referencedSenses} exact senses, ${counts.fallbackSurfaces} fallback surfaces)`);
}

function main() {
  if (!CONTENT_ROOT) throw new Error('Pass --content-root=/path/to/gef-content.');
  if (!existsSync(join(CONTENT_ROOT, 'works'))) throw new Error(`${CONTENT_ROOT} is not a gef-content checkout.`);

  let compiled = 0;
  for (const workId of contentWorkDirs()) {
    for (const { languageTag, path } of annotatedLanguageFiles(workId)) {
      compileSlice(workId, languageTag, path);
      compiled += 1;
    }
  }

  if (compiled === 0) {
    const filters = [ONLY_WORK ? `work=${ONLY_WORK}` : null, ONLY_LANGUAGE ? `language=${ONLY_LANGUAGE}` : null].filter(Boolean).join(', ');
    throw new Error(`No annotated book-language slices matched${filters ? ` (${filters})` : ''}.`);
  }
  console.log(`✅ Compiled ${compiled} canonical book slice${compiled === 1 ? '' : 's'}.`);
}

main();
