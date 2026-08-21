#!/usr/bin/env node
/**
 * Validate the canonical many-to-many sense -> concept graph.
 *
 * This intentionally scans every language `lexicon*.json` source, including
 * supplements. The older general validator historically scanned only
 * `lexicon.json`, which is insufficient once concept links can be authored in
 * supplemental lexical sources.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import {
  normalizeSenseConceptLinks,
  approvedPrimarySenseConceptLinks,
} from './lib/concept-links.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEXICON_RE = /^lexicon(?:-[a-z0-9-]+)?\.json$/iu;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function listDirs(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((entry) => statSync(join(path, entry)).isDirectory())
    .sort();
}

function languageLexiconSources() {
  const languagesRoot = join(ROOT, 'languages');
  const sources = [];
  for (const languageTag of listDirs(languagesRoot)) {
    const languageDir = join(languagesRoot, languageTag);
    for (const filename of readdirSync(languageDir).filter((entry) => LEXICON_RE.test(entry)).sort()) {
      sources.push({ languageTag, path: join(languageDir, filename) });
    }
  }
  return sources;
}

function overlayLexiconSources() {
  const worksRoot = join(ROOT, 'works');
  const sources = [];
  for (const workId of listDirs(worksRoot)) {
    const lexiconDir = join(ROOT, 'works', workId, 'lexicon');
    if (!existsSync(lexiconDir)) continue;
    for (const filename of readdirSync(lexiconDir).filter((entry) => entry.endsWith('.json')).sort()) {
      sources.push({ languageTag: filename.slice(0, -5), path: join(lexiconDir, filename) });
    }
  }
  return sources;
}

function effectiveSenseReviewState(lexeme, sense) {
  return sense.review_state ?? lexeme.review_state ?? 'candidate';
}

function validateApprovedUsageProfile(rel, sense, lexeme, senseReviewState, fail) {
  const profile = sense.usage_profile;
  if (profile?.review_state !== 'approved') return false;

  if (lexeme.review_state !== 'approved' || senseReviewState !== 'approved') {
    fail(
      `${rel}:${sense.sense_id}: approved usage_profile cannot launder an unapproved `
      + `lexeme/sense (lexeme=${lexeme.review_state}, sense=${senseReviewState})`,
    );
  }

  if (profile.region_scope?.kind === 'unknown') {
    fail(`${rel}:${sense.sense_id}: approved usage_profile cannot have unknown region_scope`);
  }
  if (profile.pragmatics?.taboo_level === 'unknown') {
    fail(`${rel}:${sense.sense_id}: approved usage_profile cannot have unknown taboo_level`);
  }
  if (profile.pragmatics?.address_use === 'unknown') {
    fail(`${rel}:${sense.sense_id}: approved usage_profile cannot have unknown address_use`);
  }

  return true;
}

function main() {
  const conceptManifestPath = join(ROOT, 'concepts', 'graph.json');
  if (!existsSync(conceptManifestPath)) throw new Error('Missing concepts/graph.json.');
  const conceptManifest = readJson(conceptManifestPath);

  const sourcesPath = join(ROOT, 'sources', 'bibliography.json');
  const sourceIds = existsSync(sourcesPath)
    ? new Set((readJson(sourcesPath).sources ?? []).map((source) => source.source_id))
    : new Set();

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validateConcepts = ajv.compile(readJson(join(ROOT, 'schemas', 'concept.schema.json')));
  const validateLexicon = ajv.compile(readJson(join(ROOT, 'schemas', 'lexicon-entry.schema.json')));

  let errors = 0;
  let documents = 0;
  let senses = 0;
  let links = 0;
  let primaryLinks = 0;
  let approvedSemanticPivots = 0;
  let approvedUsageProfiles = 0;
  let legacyOnly = 0;
  let explicitLinkedSenses = 0;

  const fail = (message) => {
    console.error(`❌ ${message}`);
    errors += 1;
  };

  if (!validateConcepts(conceptManifest)) {
    fail(`concepts/graph.json: schema error ${JSON.stringify(validateConcepts.errors)}`);
  }

  const conceptsById = new Map();
  for (const concept of conceptManifest.concepts ?? []) {
    if (conceptsById.has(concept.concept_id)) {
      fail(`concepts/graph.json: duplicate concept_id ${concept.concept_id}`);
      continue;
    }
    conceptsById.set(concept.concept_id, concept);

    if (concept.translation_role === 'exact_pivot') {
      const contract = concept.semantic_contract;
      if (!contract?.definition_en?.trim()) {
        fail(`${concept.concept_id}: exact_pivot is missing semantic_contract.definition_en`);
      }
      if (!Array.isArray(contract?.must_preserve) || contract.must_preserve.length === 0) {
        fail(`${concept.concept_id}: exact_pivot must declare at least one must_preserve invariant`);
      }
      if (!Array.isArray(contract?.must_not_imply)) {
        fail(`${concept.concept_id}: exact_pivot must declare must_not_imply, even when empty`);
      }
    }
  }

  for (const { languageTag, path } of [...languageLexiconSources(), ...overlayLexiconSources()]) {
    const rel = relative(ROOT, path).replaceAll('\\', '/');
    const document = readJson(path);
    documents += 1;

    if (!validateLexicon(document)) {
      fail(`${rel}: schema error ${JSON.stringify(validateLexicon.errors)}`);
      continue;
    }
    if (document.language_code && document.language_code !== languageTag) {
      fail(`${rel}: language_code=${document.language_code}, expected ${languageTag}`);
    }

    for (const lexeme of document.lexemes ?? []) {
      for (const sense of lexeme.senses ?? []) {
        senses += 1;
        const senseReviewState = effectiveSenseReviewState(lexeme, sense);
        if (Array.isArray(sense.concept_links) && sense.concept_links.length > 0) explicitLinkedSenses += 1;
        if (sense.primary_concept_id && (!Array.isArray(sense.concept_links) || sense.concept_links.length === 0)) {
          legacyOnly += 1;
        }

        if (validateApprovedUsageProfile(rel, sense, lexeme, senseReviewState, fail)) {
          approvedUsageProfiles += 1;
        }

        let normalized;
        try {
          normalized = normalizeSenseConceptLinks(sense, lexeme.review_state ?? 'candidate');
        } catch (error) {
          fail(`${rel}:${sense.sense_id}: ${error.message}`);
          continue;
        }

        for (const link of normalized) {
          links += 1;
          const concept = conceptsById.get(link.concept_id);
          if (!concept) {
            fail(`${rel}:${sense.sense_id}: concept '${link.concept_id}' does not exist in concepts/graph.json`);
            continue;
          }

          if (link.relation === 'primary') {
            primaryLinks += 1;
            if (concept.translation_role !== 'exact_pivot') {
              fail(
                `${rel}:${sense.sense_id}: primary semantic link points to ${link.concept_id}, `
                + `but that concept is '${concept.translation_role ?? 'unclassified'}' rather than exact_pivot`,
              );
            }
          }

          for (const sourceId of link.source_refs ?? []) {
            if (!sourceIds.has(sourceId)) {
              fail(`${rel}:${sense.sense_id}: concept link source '${sourceId}' does not exist in sources/bibliography.json`);
            }
          }
        }

        let approved;
        try {
          approved = approvedPrimarySenseConceptLinks(sense, lexeme.review_state ?? 'candidate');
        } catch (error) {
          fail(`${rel}:${sense.sense_id}: ${error.message}`);
          continue;
        }
        for (const link of approved) {
          approvedSemanticPivots += 1;
          const concept = conceptsById.get(link.concept_id);
          if (concept?.translation_role !== 'exact_pivot') {
            fail(`${rel}:${sense.sense_id}: approved semantic pivot uses a non-exact concept ${link.concept_id}`);
          }

          // A reviewed semantic identity alone is not enough for 100+ language
          // translation. Production-equivalent membership must also have an
          // approved, fully specified usage profile so register, region/variety,
          // politeness and social meaning can be compared instead of guessed.
          if (!sense.usage_profile) {
            fail(
              `${rel}:${sense.sense_id}: approved exact semantic pivot is missing usage_profile; `
              + `translation compatibility would be unknowable`,
            );
          } else if (sense.usage_profile.review_state !== 'approved') {
            fail(
              `${rel}:${sense.sense_id}: approved exact semantic pivot has usage_profile `
              + `review_state=${sense.usage_profile.review_state}; expected approved`,
            );
          }
        }
      }
    }
  }

  console.log('\nSense-link validation summary:');
  console.log(`  Lexicon documents: ${documents}`);
  console.log(`  Senses: ${senses}`);
  console.log(`  Materialized concept links: ${links}`);
  console.log(`  Primary links: ${primaryLinks}`);
  console.log(`  Hierarchically approved semantic pivots: ${approvedSemanticPivots}`);
  console.log(`  Approved structured usage profiles: ${approvedUsageProfiles}`);
  console.log(`  Explicitly linked senses: ${explicitLinkedSenses}`);
  console.log(`  Legacy scalar-only senses: ${legacyOnly}`);

  if (errors > 0) {
    console.error(`\n❌ SENSE-LINK VALIDATION FAILED with ${errors} error(s).`);
    process.exit(1);
  }
  console.log('\n✅ OK — sense/concept graph and usage-profile invariants passed.');
}

main();
