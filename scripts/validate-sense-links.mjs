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
import { normalizeSenseConceptLinks } from './lib/concept-links.mjs';

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
    const lexiconDir = join(worksRoot, workId, 'lexicon');
    if (!existsSync(lexiconDir)) continue;
    for (const filename of readdirSync(lexiconDir).filter((entry) => entry.endsWith('.json')).sort()) {
      sources.push({ languageTag: filename.slice(0, -5), path: join(lexiconDir, filename) });
    }
  }
  return sources;
}

function main() {
  const conceptManifestPath = join(ROOT, 'concepts', 'graph.json');
  if (!existsSync(conceptManifestPath)) throw new Error('Missing concepts/graph.json.');
  const conceptManifest = readJson(conceptManifestPath);
  const concepts = new Set((conceptManifest.concepts ?? []).map((concept) => concept.concept_id));

  const sourcesPath = join(ROOT, 'sources', 'bibliography.json');
  const sourceIds = existsSync(sourcesPath)
    ? new Set((readJson(sourcesPath).sources ?? []).map((source) => source.source_id))
    : new Set();

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validateLexicon = ajv.compile(readJson(join(ROOT, 'schemas', 'lexicon-entry.schema.json')));

  let errors = 0;
  let documents = 0;
  let senses = 0;
  let links = 0;
  let primaryLinks = 0;
  let legacyOnly = 0;
  let explicitLinkedSenses = 0;

  const fail = (message) => {
    console.error(`❌ ${message}`);
    errors += 1;
  };

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
        if (Array.isArray(sense.concept_links) && sense.concept_links.length > 0) explicitLinkedSenses += 1;
        if (sense.primary_concept_id && (!Array.isArray(sense.concept_links) || sense.concept_links.length === 0)) {
          legacyOnly += 1;
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
          if (link.relation === 'primary') primaryLinks += 1;
          if (!concepts.has(link.concept_id)) {
            fail(`${rel}:${sense.sense_id}: concept '${link.concept_id}' does not exist in concepts/graph.json`);
          }
          for (const sourceId of link.source_refs ?? []) {
            if (!sourceIds.has(sourceId)) {
              fail(`${rel}:${sense.sense_id}: concept link source '${sourceId}' does not exist in sources/bibliography.json`);
            }
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
  console.log(`  Explicitly linked senses: ${explicitLinkedSenses}`);
  console.log(`  Legacy scalar-only senses: ${legacyOnly}`);

  if (errors > 0) {
    console.error(`\n❌ SENSE-LINK VALIDATION FAILED with ${errors} error(s).`);
    process.exit(1);
  }
  console.log('\n✅ OK — sense/concept graph invariants passed.');
}

main();
