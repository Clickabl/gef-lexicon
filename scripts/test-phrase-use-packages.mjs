#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { validatePhraseUseCatalogue } from './validate-phrase-uses.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'gef-phrase-use-'));
const registryLanguages = new Set(['en', 'es', 'fr', 'de']);
const bibliographyIds = new Set(['src_test']);
const sourceDocs = [];

function mkdir(path) { mkdirSync(path, { recursive: true }); }
function writeJson(path, value) {
  mkdir(dirname(path));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
function lexeme(languageTag, suffix, reviewState, senseState = reviewState, extra = {}) {
  return {
    lexeme_id: `${languageTag}_lex_${suffix}`,
    lemma_nfc: suffix,
    upos: extra.upos ?? 'INTJ',
    review_state: reviewState,
    ...(extra.proper_noun ? { proper_noun: true, name_id: `${languageTag}_name_${suffix}` } : {}),
    senses: [{ sense_id: `${languageTag}_sense_${suffix}`, sense_key: 'test', definitions: { [languageTag]: 'Fixture meaning' }, review_state: senseState, ...(extra.entity ? { entity_id: 'fixture_entity' } : {}) }],
  };
}
function catalogue(languageTag, phraseUses) { return { schema_version: 1, language_tag: languageTag, phrase_uses: phraseUses }; }
function use(id, lexemeId, senseId, state = 'candidate', extra = {}) {
  return {
    phrase_use_id: `PUSE.${id}`,
    lexeme_id: lexemeId,
    sense_id: senseId,
    context: extra.context ?? { kind: 'greeting', time_bands: ['morning', 'up_late'] },
    register: ['informal'],
    region_scope: { kind: 'general', tags: [] },
    source_refs: ['src_test'],
    review_state: state,
    ...(extra.literal_sense_refs ? { literal_sense_refs: extra.literal_sense_refs } : {}),
  };
}

function initializeSources() {
  const lexemeRows = {
    en: [lexeme('en', 'word', 'approved')],
    es: [
      lexeme('es', 'greeting', 'approved'),
      lexeme('es', 'candidate_fact', 'approved', 'candidate'),
      lexeme('es', 'literal', 'approved'),
      lexeme('es', 'literal_candidate', 'approved', 'candidate'),
      lexeme('es', 'person', 'approved', 'approved', { upos: 'PROPN', proper_noun: true }),
    ],
    fr: [lexeme('fr', 'bonjour', 'approved')],
  };
  for (const languageTag of ['en', 'es', 'fr']) {
    const document = { schema_version: 1, language_code: languageTag, lexemes: lexemeRows[languageTag] };
    sourceDocs.push({ languageTag, document });
    writeJson(join(temporaryRoot, 'languages', languageTag, 'lexicon.json'), document);
  }
  writeJson(join(temporaryRoot, 'sources', 'bibliography.json'), { schema_version: 1, sources: [{ source_id: 'src_test', source_type: 'other', title: 'Fixture evidence' }] });
  writeJson(join(temporaryRoot, 'registry', 'language-support.json'), { programs: { learnFromLanguages: [...registryLanguages] } });
  const approved = use('es.approved', 'es_lex_greeting', 'es_sense_greeting', 'approved', {
    literal_sense_refs: [{ lexeme_id: 'es_lex_literal', sense_id: 'es_sense_literal' }],
  });
  const candidateUse = use('es.candidate-use', 'es_lex_greeting', 'es_sense_greeting', 'candidate');
  const candidateFact = use('es.candidate-fact', 'es_lex_candidate_fact', 'es_sense_candidate_fact', 'approved');
  const candidateLiteral = use('es.candidate-literal', 'es_lex_greeting', 'es_sense_greeting', 'approved', {
    literal_sense_refs: [{ lexeme_id: 'es_lex_literal_candidate', sense_id: 'es_sense_literal_candidate' }],
  });
  const rejected = use('es.rejected', 'es_lex_greeting', 'es_sense_greeting', 'rejected');
  const superseded = use('es.superseded', 'es_lex_greeting', 'es_sense_greeting', 'superseded');
  writeJson(join(temporaryRoot, 'lexi', 'phrase-uses', 'es.json'), catalogue('es', [approved, candidateUse, candidateFact, candidateLiteral, rejected, superseded]));
}

function runCompiler(outputName, production = false) {
  const outputRoot = join(temporaryRoot, outputName);
  execFileSync(process.execPath, [
    join(ROOT, 'scripts', 'compile-core-packages.mjs'),
    `--input-root=${temporaryRoot}`,
    `--output-root=${outputRoot}`,
    `--registry=${join(temporaryRoot, 'registry', 'language-support.json')}`,
    ...(production ? ['--production'] : []),
  ], { cwd: ROOT, stdio: 'pipe' });
  return outputRoot;
}

function dbRows(path, sql) {
  const db = new Database(path, { readonly: true });
  try { return db.prepare(sql).all(); } finally { db.close(); }
}

function main() {
  initializeSources();
  const esCatalog = JSON.parse(readFileSync(join(temporaryRoot, 'lexi', 'phrase-uses', 'es.json'), 'utf8'));
  const baseValidation = validatePhraseUseCatalogue(esCatalog, {
    expectedLanguageTag: 'es', registeredLanguages: registryLanguages, lexiconDocuments: sourceDocs, bibliographyIds,
  });
  assert.deepEqual(baseValidation.errors, []);

  const wrongOwner = structuredClone(esCatalog);
  wrongOwner.phrase_uses[0].lexeme_id = 'es_lex_candidate_fact';
  assert(baseValidationError(wrongOwner).some((error) => /not owned by lexeme/u.test(error)));
  const crossLanguage = structuredClone(esCatalog);
  crossLanguage.phrase_uses[0].lexeme_id = 'fr_lex_bonjour';
  assert(baseValidationError(crossLanguage).some((error) => /belongs to fr, not es/u.test(error)));
  const wrongRegistryLanguage = validatePhraseUseCatalogue({ ...esCatalog, language_tag: 'zz' }, {
    expectedLanguageTag: 'zz', registeredLanguages: registryLanguages, lexiconDocuments: sourceDocs, bibliographyIds,
  });
  assert(wrongRegistryLanguage.errors.some((error) => /not an exact current registry identity/u.test(error)));
  const danglingSource = structuredClone(esCatalog);
  danglingSource.phrase_uses[0].source_refs = ['src_missing'];
  assert(baseValidationError(danglingSource).some((error) => /unknown bibliography source/u.test(error)));
  const invalidReview = structuredClone(esCatalog);
  invalidReview.phrase_uses[0].review_state = 'machine-reviewed';
  assert(baseValidationError(invalidReview).some((error) => /schema/u.test(error)));
  const nameTarget = structuredClone(esCatalog);
  nameTarget.phrase_uses[0].lexeme_id = 'es_lex_person';
  nameTarget.phrase_uses[0].sense_id = 'es_sense_person';
  assert(baseValidationError(nameTarget).some((error) => /proper-name/u.test(error)));
  const copiedMeaning = structuredClone(esCatalog);
  copiedMeaning.phrase_uses[0].definition = 'Copied definition';
  assert(baseValidationError(copiedMeaning).some((error) => /schema/u.test(error)));

  const malformedContext = structuredClone(esCatalog);
  malformedContext.phrase_uses[0].context = { kind: 'general_expression', time_bands: ['morning'] };
  assert(baseValidationError(malformedContext).some((error) => /schema/u.test(error)));
  const duplicateBands = structuredClone(esCatalog);
  duplicateBands.phrase_uses[0].context.time_bands = ['night', 'night'];
  assert(baseValidationError(duplicateBands).some((error) => /schema/u.test(error)));
  for (const state of ['rejected', 'superseded']) {
    const dangling = structuredClone(esCatalog);
    const row = dangling.phrase_uses.find((item) => item.review_state === state);
    row.sense_id = 'es_sense_missing';
    assert(baseValidationError(dangling).some((error) => new RegExp(`${state}[^\\n]*sense es_sense_missing`).test(error)));
  }

  const duplicateSenseDocs = structuredClone(sourceDocs);
  duplicateSenseDocs[1].document.lexemes[0].senses.push(structuredClone(duplicateSenseDocs[1].document.lexemes[0].senses[0]));
  const duplicateSenseValidation = validatePhraseUseCatalogue(esCatalog, {
    expectedLanguageTag: 'es', registeredLanguages: registryLanguages, lexiconDocuments: duplicateSenseDocs, bibliographyIds,
  });
  assert(duplicateSenseValidation.errors.some((error) => /duplicate canonical sense_id/u.test(error)));
  const duplicateSenseAcrossLexemes = structuredClone(sourceDocs);
  duplicateSenseAcrossLexemes[2].document.lexemes.push({
    ...structuredClone(duplicateSenseAcrossLexemes[2].document.lexemes[0]),
    lexeme_id: 'fr_lex_reused_sense',
    senses: [
      { ...structuredClone(duplicateSenseAcrossLexemes[2].document.lexemes[0].senses[0]), sense_id: 'es_sense_greeting' },
    ],
  });
  const duplicateSenseAcrossLanguagesValidation = validatePhraseUseCatalogue(esCatalog, {
    expectedLanguageTag: 'es', registeredLanguages: registryLanguages, lexiconDocuments: duplicateSenseAcrossLexemes, bibliographyIds,
  });
  assert(duplicateSenseAcrossLanguagesValidation.errors.some((error) => /duplicate canonical sense_id .*owned by es:es_lex_greeting and fr:fr_lex_reused_sense/u.test(error)));
  const duplicateSameLanguageLexemeDocs = [...sourceDocs, { ...sourceDocs[1], path: 'es/duplicate.json', document: structuredClone(sourceDocs[1].document) }];
  const duplicateSameLanguageLexemeValidation = validatePhraseUseCatalogue(esCatalog, {
    expectedLanguageTag: 'es', registeredLanguages: registryLanguages, lexiconDocuments: duplicateSameLanguageLexemeDocs, bibliographyIds,
  });
  assert(duplicateSameLanguageLexemeValidation.errors.some((error) => /duplicate canonical lexeme_id es_lex_greeting/u.test(error)));
  const duplicateLexemeDocs = [...sourceDocs, { ...sourceDocs[1], path: 'different-language/duplicate.json', languageTag: 'fr' }];
  const duplicateLexemeValidation = validatePhraseUseCatalogue(esCatalog, {
    expectedLanguageTag: 'es', registeredLanguages: registryLanguages, lexiconDocuments: duplicateLexemeDocs, bibliographyIds,
  });
  assert(duplicateLexemeValidation.errors.some((error) => /duplicate canonical lexeme_id/u.test(error)));

  const devRootA = runCompiler('dev-a');
  const devRootB = runCompiler('dev-b');
  const prodRoot = runCompiler('prod', true);
  const devManifest = JSON.parse(readFileSync(join(devRootA, 'dist/core/es/manifest.json'), 'utf8'));
  const prodManifest = JSON.parse(readFileSync(join(prodRoot, 'dist/core/es/manifest.json'), 'utf8'));
  assert.equal(devManifest.fieldPolicy.version, 4);
  assert(devManifest.fieldPolicy.fast.phraseUse.includes('register_json'));
  assert(!devManifest.fieldPolicy.fast.phraseUse.includes('registers_json'));
  assert.equal(devManifest.sourceRevision.status, 'unknown', 'external non-Git input roots must not report compiler-repository provenance');
  assert.equal(devManifest.phraseUseCoverage.sourceStatus, 'populated');
  assert.equal(devManifest.phraseUseCoverage.authoredStateCounts.approved, 3);
  assert.equal(devManifest.phraseUseCoverage.authoredStateCounts.candidate, 1);
  assert.equal(devManifest.phraseUseCoverage.authoredStateCounts.rejected, 1);
  assert.equal(devManifest.phraseUseCoverage.authoredStateCounts.superseded, 1);
  assert.equal(devManifest.phraseUseCoverage.emittedCount, 4);
  assert.equal(prodManifest.phraseUseCoverage.emittedCount, 1);
  assert.equal(prodManifest.phraseUseCoverage.coverageState, 'available');
  const devDb = join(devRootA, 'dist/core/es/core-v2.sqlite');
  const prodDb = join(prodRoot, 'dist/core/es/core-v2.sqlite');
  assert.deepEqual(dbRows(devDb, 'SELECT phrase_use_id, effective_review_state FROM phrase_uses ORDER BY phrase_use_id'), [
    { phrase_use_id: 'PUSE.es.approved', effective_review_state: 'approved' },
    { phrase_use_id: 'PUSE.es.candidate-fact', effective_review_state: 'candidate' },
    { phrase_use_id: 'PUSE.es.candidate-literal', effective_review_state: 'candidate' },
    { phrase_use_id: 'PUSE.es.candidate-use', effective_review_state: 'candidate' },
  ]);
  assert.deepEqual(dbRows(prodDb, 'SELECT phrase_use_id, effective_review_state FROM phrase_uses'), [
    { phrase_use_id: 'PUSE.es.approved', effective_review_state: 'approved' },
  ]);
  assert.equal(dbRows(devDb, 'SELECT COUNT(*) AS count FROM phrase_use_time_bands')[0].count, 8);
  assert.equal(dbRows(devDb, 'SELECT COUNT(*) AS count FROM phrase_use_literal_senses')[0].count, 2);
  const invalidBandDbPath = join(temporaryRoot, 'bad-language-tag.sqlite');
  writeFileSync(invalidBandDbPath, readFileSync(devDb));
  const invalidBandDb = new Database(invalidBandDbPath);
  invalidBandDb.pragma('foreign_keys = ON');
  assert.throws(() => invalidBandDb.prepare('INSERT INTO phrase_use_time_bands (phrase_use_id, language_tag, time_band) VALUES (?, ?, ?)').run('PUSE.es.approved', 'fr', 'night'), /FOREIGN KEY constraint failed/u);
  invalidBandDb.close();
  assert.deepEqual(dbRows(prodDb, 'PRAGMA foreign_key_check'), []);
  assert.equal(dbRows(devDb, 'PRAGMA quick_check')[0].quick_check, 'ok');
  assert.equal(devManifest.packageVersion, JSON.parse(readFileSync(join(devRootB, 'dist/core/es/manifest.json'), 'utf8')).packageVersion);
  const devHashA = createHash('sha256').update(readFileSync(devDb)).digest('hex');
  const devHashB = createHash('sha256').update(readFileSync(join(devRootB, 'dist/core/es/core-v2.sqlite'))).digest('hex');
  assert.equal(devHashA, devHashB, 'identical pinned fixture inputs must produce byte-identical SQLite');

  const esSourcePath = join(temporaryRoot, 'lexi', 'phrase-uses', 'es.json');
  const originalSource = readFileSync(esSourcePath, 'utf8');
  writeFileSync(esSourcePath, `${originalSource}\n`);
  const changedRoot = runCompiler('changed-source');
  const changedManifest = JSON.parse(readFileSync(join(changedRoot, 'dist/core/es/manifest.json'), 'utf8'));
  assert.notEqual(changedManifest.packageVersion, devManifest.packageVersion, 'source-byte changes must affect package identity');

  const missingManifest = JSON.parse(readFileSync(join(devRootA, 'dist/core/en/manifest.json'), 'utf8'));
  assert.equal(missingManifest.phraseUseCoverage.sourceStatus, 'missing');
  assert.equal(missingManifest.phraseUseCoverage.coverageState, 'gap');
  writeJson(join(temporaryRoot, 'lexi', 'phrase-uses', 'en.json'), catalogue('en', []));
  const emptyRoot = runCompiler('empty-same-language');
  const emptyManifest = JSON.parse(readFileSync(join(emptyRoot, 'dist/core/en/manifest.json'), 'utf8'));
  assert.equal(emptyManifest.phraseUseCoverage.sourceStatus, 'empty');
  assert.equal(emptyManifest.phraseUseCoverage.coverageState, 'gap');
  assert.equal(emptyManifest.phraseUseCoverage.emittedCount, 0);
  assert.notEqual(missingManifest.packageVersion, emptyManifest.packageVersion, 'same-language missing and empty source states have distinct identities');

  writeJson(join(temporaryRoot, 'lexi', 'phrase-uses', 'fr.json'), catalogue('fr', [use('es.approved', 'fr_lex_bonjour', 'fr_sense_bonjour')]));
  assert.throws(() => runCompiler('duplicate-global-id'), /duplicate phrase_use_id/u, 'compiler must reject duplicate phrase-use identities across catalogues');
  rmSync(join(temporaryRoot, 'lexi', 'phrase-uses', 'fr.json'));
  writeJson(join(temporaryRoot, 'lexi', 'phrase-uses', 'de.json'), catalogue('fr', []));
  assert.throws(() => runCompiler('filename-language-mismatch'), /language_tag fr does not match expected de/u, 'compiler prevalidates catalogue filename identities even without a lexicon directory');
  rmSync(join(temporaryRoot, 'lexi', 'phrase-uses', 'de.json'));

  execFileSync('git', ['init', '-q', '--initial-branch=main'], { cwd: temporaryRoot });
  execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: temporaryRoot });
  execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: temporaryRoot });
  writeFileSync(join(temporaryRoot, '.gitignore'), 'out-*/\n');
  execFileSync('git', ['add', 'languages', 'sources', 'registry', 'lexi', '.gitignore'], { cwd: temporaryRoot });
  execFileSync('git', ['commit', '-qm', 'fixture input'], { cwd: temporaryRoot });
  const gitRootA = runCompiler('out-git-a');
  const gitManifestA = JSON.parse(readFileSync(join(gitRootA, 'dist/core/es/manifest.json'), 'utf8'));
  assert.equal(gitManifestA.sourceRevision.status, 'known');
  const firstRevision = gitManifestA.sourceRevision.revision;
  writeFileSync(join(temporaryRoot, 'unrelated.txt'), 'unrelated revision\n');
  execFileSync('git', ['add', 'unrelated.txt'], { cwd: temporaryRoot });
  execFileSync('git', ['commit', '-qm', 'unrelated fixture commit'], { cwd: temporaryRoot });
  const gitRootB = runCompiler('out-git-b');
  const gitManifestB = JSON.parse(readFileSync(join(gitRootB, 'dist/core/es/manifest.json'), 'utf8'));
  assert.notEqual(gitManifestB.sourceRevision.revision, firstRevision);
  assert.equal(gitManifestB.packageVersion, gitManifestA.packageVersion, 'unrelated Git commits do not change package identity');

  console.log('OK — phrase-use schema, joins, review filtering, empty/missing coverage, source hash identity, SQLite constraints and deterministic output passed.');
}

function baseValidationError(document) {
  return validatePhraseUseCatalogue(document, {
    expectedLanguageTag: 'es', registeredLanguages: registryLanguages, lexiconDocuments: sourceDocs, bibliographyIds,
  }).errors;
}

try { main(); } finally { rmSync(temporaryRoot, { recursive: true, force: true }); }
