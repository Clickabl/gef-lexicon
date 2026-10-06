#!/usr/bin/env node
/** Validate canonical phrase-use joins without assigning IDs or review state. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ROOT = join(ROOT, 'lexi', 'phrase-uses');
const REGISTRY_PATH = join(ROOT, '..', 'gef-expo', 'registry', 'language-support.json');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(readJson(join(ROOT, 'schemas', 'lexicon-entry.schema.json')));
const validateSchema = ajv.compile(readJson(join(ROOT, 'schemas', 'phrase-use-catalog.schema.json')));

const validReviewState = (value) => ['candidate', 'approved', 'rejected', 'superseded'].includes(value);
const senseReviewState = (lexeme, sense) => sense.review_state ?? lexeme.review_state ?? 'candidate';

function indexLexemes(documents) {
  const byId = new Map();
  const senseOwners = new Map();
  const errors = [];
  for (const { languageTag, document } of documents) {
    for (const lexeme of document.lexemes ?? []) {
      if (typeof lexeme.lexeme_id !== 'string') continue;
      if (byId.has(lexeme.lexeme_id)) {
        errors.push(`duplicate canonical lexeme_id ${lexeme.lexeme_id}`);
        continue;
      }
      const senses = new Map();
      for (const sense of lexeme.senses ?? []) {
        if (typeof sense.sense_id !== 'string') continue;
        const previousOwner = senseOwners.get(sense.sense_id);
        if (previousOwner && previousOwner.lexemeId !== lexeme.lexeme_id) {
          errors.push(`duplicate canonical sense_id ${sense.sense_id} owned by ${previousOwner.languageTag}:${previousOwner.lexemeId} and ${languageTag}:${lexeme.lexeme_id}`);
        } else if (!previousOwner) {
          senseOwners.set(sense.sense_id, { languageTag, lexemeId: lexeme.lexeme_id });
        }
        if (senses.has(sense.sense_id)) errors.push(`duplicate canonical sense_id ${sense.sense_id} in lexeme ${lexeme.lexeme_id}`);
        else senses.set(sense.sense_id, sense);
      }
      byId.set(lexeme.lexeme_id, {
        lexeme,
        languageTag,
        senses,
      });
    }
  }
  return { byId, errors };
}

/**
 * Pure structural and referential validation shared by the CLI and compiler.
 * The input documents are canonical sources; the function never mutates them.
 */
export function validatePhraseUseCatalogue(document, {
  expectedLanguageTag,
  registeredLanguages,
  lexiconDocuments,
  bibliographyIds,
  knownPhraseUseIds = new Set(),
} = {}) {
  const errors = [];
  const rows = [];
  const fail = (message) => errors.push(message);
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    return { errors: ['catalogue must be an object'], rows };
  }
  if (!validateSchema(document)) {
    for (const issue of validateSchema.errors ?? []) {
      fail(`schema ${issue.instancePath || '/'} ${issue.message ?? 'is invalid'}`);
    }
    return { errors, rows };
  }
  const languageTag = document.language_tag;
  if (expectedLanguageTag && languageTag !== expectedLanguageTag) {
    fail(`language_tag ${languageTag} does not match expected ${expectedLanguageTag}`);
  }
  if (!(registeredLanguages instanceof Set) || !registeredLanguages.has(languageTag)) {
    fail(`language_tag ${languageTag} is not an exact current registry identity`);
  }

  const { byId: lexemes, errors: identityErrors } = indexLexemes(lexiconDocuments ?? []);
  errors.push(...identityErrors);
  const localSources = (lexiconDocuments ?? []).filter((source) => source.languageTag === languageTag);
  for (const source of localSources) {
    if (source.document.language_code && source.document.language_code !== languageTag) {
      fail(`${source.path ?? 'lexicon source'} declares ${source.document.language_code}, expected ${languageTag}`);
    }
  }

  const localIds = new Set();
  for (const row of document.phrase_uses) {
    const rowLabel = row.phrase_use_id;
    if (localIds.has(rowLabel) || knownPhraseUseIds.has(rowLabel)) fail(`${rowLabel}: duplicate phrase_use_id`);
    localIds.add(rowLabel);

    const linkedFacts = [];
    const primary = lexemes.get(row.lexeme_id);
    if (!primary) {
      fail(`${rowLabel}: unknown lexeme ${row.lexeme_id}`);
    } else {
      if (primary.languageTag !== languageTag) fail(`${rowLabel}: lexeme ${row.lexeme_id} belongs to ${primary.languageTag}, not ${languageTag}`);
      if (primary.lexeme.proper_noun === true || primary.lexeme.name_id || primary.lexeme.upos === 'PROPN') {
        fail(`${rowLabel}: proper-name lexemes are outside phrase-use joins`);
      }
      const sense = primary.senses.get(row.sense_id);
      if (!sense) {
        fail(`${rowLabel}: sense ${row.sense_id} is not owned by lexeme ${row.lexeme_id}`);
      } else {
        if (sense.entity_id) fail(`${rowLabel}: entity-linked senses are outside phrase-use joins`);
        linkedFacts.push({ lexeme: primary.lexeme, sense });
      }
    }

    for (const literal of row.literal_sense_refs ?? []) {
      if (literal.lexeme_id === row.lexeme_id && literal.sense_id === row.sense_id) {
        fail(`${rowLabel}: literal reference cannot repeat the primary sense`);
      }
      const target = lexemes.get(literal.lexeme_id);
      if (!target) {
        fail(`${rowLabel}: unknown literal lexeme ${literal.lexeme_id}`);
        continue;
      }
      if (target.languageTag !== languageTag) fail(`${rowLabel}: literal lexeme ${literal.lexeme_id} belongs to ${target.languageTag}, not ${languageTag}`);
      if (target.lexeme.proper_noun === true || target.lexeme.name_id || target.lexeme.upos === 'PROPN') {
        fail(`${rowLabel}: literal name lexemes are outside phrase-use joins`);
      }
      const sense = target.senses.get(literal.sense_id);
      if (!sense) {
        fail(`${rowLabel}: literal sense ${literal.sense_id} is not owned by lexeme ${literal.lexeme_id}`);
      } else {
        if (sense.entity_id) fail(`${rowLabel}: literal entity-linked senses are outside phrase-use joins`);
        linkedFacts.push({ lexeme: target.lexeme, sense });
      }
    }

    for (const sourceId of row.source_refs) {
      if (!(bibliographyIds instanceof Set) || !bibliographyIds.has(sourceId)) {
        fail(`${rowLabel}: unknown bibliography source ${sourceId}`);
      }
    }
    if (!validReviewState(row.review_state)) fail(`${rowLabel}: invalid review state`);
    for (const fact of linkedFacts) {
      if (!validReviewState(fact.lexeme.review_state)) fail(`${rowLabel}: linked lexeme has invalid review state`);
      if (!validReviewState(senseReviewState(fact.lexeme, fact.sense))) fail(`${rowLabel}: linked sense has invalid review state`);
    }

    const everyFactCandidateOrApproved = linkedFacts.every(({ lexeme, sense }) => (
      ['candidate', 'approved'].includes(lexeme.review_state)
      && ['candidate', 'approved'].includes(senseReviewState(lexeme, sense))
    ));
    const effectiveReviewState = row.review_state === 'approved'
      && linkedFacts.length > 0
      && linkedFacts.every(({ lexeme, sense }) => lexeme.review_state === 'approved' && senseReviewState(lexeme, sense) === 'approved')
      ? 'approved'
      : 'candidate';
    rows.push({ row, effectiveReviewState, everyFactCandidateOrApproved });
  }
  return { errors, rows, phraseUseIds: localIds };
}

function main() {
  if (!existsSync(REGISTRY_PATH)) throw new Error(`Current Expo language registry is missing: ${REGISTRY_PATH}`);
  const registry = readJson(REGISTRY_PATH);
  const registeredLanguages = new Set(registry.programs?.learnFromLanguages ?? []);
  const lexiconDocuments = [];
  for (const languageTag of readdirSync(join(ROOT, 'languages')).sort()) {
    const languageRoot = join(ROOT, 'languages', languageTag);
    for (const filename of readdirSync(languageRoot).filter((name) => /^lexicon(?:-[a-z0-9-]+)?\.json$/iu.test(name)).sort()) {
      const path = join(languageRoot, filename);
      const document = readJson(path);
      lexiconDocuments.push({ languageTag, document, path: relative(ROOT, path).replaceAll('\\', '/') });
    }
  }
  const bibliography = readJson(join(ROOT, 'sources', 'bibliography.json'));
  const bibliographyIds = new Set((bibliography.sources ?? []).map((source) => source.source_id));
  const seen = new Set();
  let rowCount = 0;
  let errors = 0;
  const catalogues = readdirSync(SOURCE_ROOT).filter((name) => name.endsWith('.json')).sort();
  for (const filename of catalogues) {
    const path = join(SOURCE_ROOT, filename);
    const document = readJson(path);
    const filenameTag = filename.slice(0, -'.json'.length);
    const { errors: issues, rows, phraseUseIds } = validatePhraseUseCatalogue(document, {
      expectedLanguageTag: filenameTag,
      registeredLanguages,
      lexiconDocuments,
      bibliographyIds,
      knownPhraseUseIds: seen,
    });
    for (const issue of issues) {
      console.error(`FAIL ${relative(ROOT, path)}: ${issue}`);
      errors += 1;
    }
    for (const id of phraseUseIds ?? []) seen.add(id);
    rowCount += rows.length;
  }
  if (errors) {
    console.error(`\n${errors} phrase-use validation error(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(`OK — ${rowCount} phrase-use row(s) in ${catalogues.length} catalogue file(s); no review state was changed.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
