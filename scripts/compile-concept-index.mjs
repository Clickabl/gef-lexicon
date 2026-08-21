#!/usr/bin/env node
/**
 * Compile the deterministic reverse concept index from canonical language
 * senses. Canonical authoring lives beside each sense; this generated view is
 * the cross-language lookup projection.
 *
 * `senses_by_language` remains as a compatibility/default-translation view and
 * contains only active `primary` concept links. `sense_links_by_language`
 * exposes the complete active many-to-many relationship graph.
 *
 * Run: node scripts/compile-concept-index.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { activeSenseConceptLinks } from './lib/concept-links.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const LEXICON_RE = /^lexicon(?:-[a-z0-9-]+)?\.json$/iu;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function lexiconSources(languageDir) {
  return readdirSync(languageDir)
    .filter((entry) => LEXICON_RE.test(entry))
    .sort((left, right) => {
      if (left === 'lexicon.json') return -1;
      if (right === 'lexicon.json') return 1;
      return left.localeCompare(right);
    })
    .map((entry) => join(languageDir, entry));
}

function pushUnique(array, value, keyFn) {
  const key = keyFn(value);
  if (!array.some((item) => keyFn(item) === key)) array.push(value);
}

function main() {
  const conceptsFile = join(REPO_ROOT, 'concepts', 'graph.json');
  if (!existsSync(conceptsFile)) {
    console.error('❌ Missing concepts/graph.json manifest.');
    process.exit(1);
  }

  const conceptsManifest = readJson(conceptsFile);
  const conceptIndex = {};

  for (const concept of conceptsManifest.concepts ?? []) {
    conceptIndex[concept.concept_id] = {
      concept_id: concept.concept_id,
      concept_key: concept.concept_key,
      domain: concept.domain,
      planning_difficulty_hint: concept.planning_difficulty_hint ?? null,
      senses_by_language: {},
      sense_links_by_language: {},
    };
  }

  const languagesDir = join(REPO_ROOT, 'languages');
  if (existsSync(languagesDir)) {
    const languages = readdirSync(languagesDir)
      .filter((entry) => statSync(join(languagesDir, entry)).isDirectory())
      .sort();

    for (const languageTag of languages) {
      const languageDir = join(languagesDir, languageTag);
      for (const lexFile of lexiconSources(languageDir)) {
        const data = readJson(lexFile);
        if (data.language_code && data.language_code !== languageTag) {
          throw new Error(`${relative(REPO_ROOT, lexFile)} declares ${data.language_code}, expected ${languageTag}.`);
        }

        for (const lexeme of data.lexemes ?? []) {
          for (const sense of lexeme.senses ?? []) {
            const links = activeSenseConceptLinks(sense, lexeme.review_state ?? 'candidate');
            for (const link of links) {
              const concept = conceptIndex[link.concept_id];
              if (!concept) {
                throw new Error(
                  `${relative(REPO_ROOT, lexFile)}:${sense.sense_id} references unmanifested concept_id ${link.concept_id}.`,
                );
              }

              const richLinks = concept.sense_links_by_language[languageTag] ?? [];
              pushUnique(
                richLinks,
                {
                  sense_id: sense.sense_id,
                  lexeme_id: lexeme.lexeme_id,
                  relation: link.relation,
                  review_state: link.review_state,
                  source_path: relative(REPO_ROOT, lexFile).replaceAll('\\', '/'),
                },
                (row) => `${row.sense_id}\u0000${row.relation}`,
              );
              concept.sense_links_by_language[languageTag] = richLinks;

              if (link.relation === 'primary') {
                const primarySenses = concept.senses_by_language[languageTag] ?? [];
                if (!primarySenses.includes(sense.sense_id)) primarySenses.push(sense.sense_id);
                concept.senses_by_language[languageTag] = primarySenses;
              }
            }
          }
        }
      }
    }
  }

  for (const concept of Object.values(conceptIndex)) {
    for (const languageTag of Object.keys(concept.senses_by_language)) {
      concept.senses_by_language[languageTag].sort();
    }
    for (const languageTag of Object.keys(concept.sense_links_by_language)) {
      concept.sense_links_by_language[languageTag].sort((left, right) => (
        left.sense_id.localeCompare(right.sense_id)
        || left.relation.localeCompare(right.relation)
        || left.lexeme_id.localeCompare(right.lexeme_id)
      ));
    }
  }

  const outputFile = join(REPO_ROOT, 'concepts', 'compiled-concept-index.json');
  const payload = {
    schema_version: 2,
    generated_from: 'concepts/graph.json + languages/*/lexicon*.json',
    concepts: Object.values(conceptIndex).sort((a, b) => a.concept_id.localeCompare(b.concept_id)),
  };

  writeFileSync(outputFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(
    `✅ Compiled deterministic reverse concept index to concepts/compiled-concept-index.json `
    + `(${Object.keys(conceptIndex).length} concepts mapped).`,
  );
}

main();
