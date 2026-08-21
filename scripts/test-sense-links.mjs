#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { activeSenseConceptLinks } from './lib/concept-links.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function findSense(document, senseId) {
  for (const lexeme of document.lexemes ?? []) {
    const sense = (lexeme.senses ?? []).find((candidate) => candidate.sense_id === senseId);
    if (sense) return { lexeme, sense };
  }
  return null;
}

function main() {
  const compiled = readJson(join(ROOT, 'concepts', 'compiled-concept-index.json'));
  assert(compiled.schema_version === 2, 'compiled concept index must use schema_version 2');

  for (const concept of compiled.concepts ?? []) {
    for (const [languageTag, primarySenseIds] of Object.entries(concept.senses_by_language ?? {})) {
      const links = concept.sense_links_by_language?.[languageTag] ?? [];
      for (const senseId of primarySenseIds) {
        assert(
          links.some((link) => link.sense_id === senseId && link.relation === 'primary'),
          `${concept.concept_id}/${languageTag}/${senseId} missing rich primary link`,
        );
      }
    }
  }

  const frogConceptId = 'cpt_018f2c3a-7b1e-7a4d-9c2e-000000000003';
  const frog = (compiled.concepts ?? []).find((concept) => concept.concept_id === frogConceptId);
  assert(frog, 'frog concept missing from compiled index');

  const expected = {
    el: '018f2c3a-7b1e-7a4d-9c2e-000000000406',
    en: '018f2c3a-7b1e-7a4d-9c2e-000000000113',
    es: '018f2c3a-7b1e-7a4d-9c2e-000000000208',
    ja: '018f2c3a-7b1e-7a4d-9c2e-000000000308',
  };

  for (const [languageTag, senseId] of Object.entries(expected)) {
    assert(
      frog.senses_by_language?.[languageTag]?.includes(senseId),
      `frog concept does not resolve to expected ${languageTag} sense ${senseId}`,
    );
    const lexicon = readJson(join(ROOT, 'languages', languageTag, 'lexicon.json'));
    const hit = findSense(lexicon, senseId);
    assert(hit, `canonical ${languageTag} sense ${senseId} is missing`);
    const primary = activeSenseConceptLinks(hit.sense, hit.lexeme.review_state)
      .find((link) => link.relation === 'primary');
    assert(primary?.concept_id === frogConceptId, `${languageTag} frog sense does not round-trip to frog concept`);
  }

  const spanishSource = expected.es;
  const targetLanguages = ['el', 'en', 'ja'];
  const candidates = targetLanguages.flatMap((languageTag) => (
    (frog.senses_by_language?.[languageTag] ?? []).map((senseId) => ({ languageTag, senseId }))
  ));
  assert(candidates.length === 3, `expected three exact cross-language frog candidates from ${spanishSource}`);

  console.log('✅ Sense-link graph test passed: es rana -> frog concept -> el/en/ja primary senses.');
}

main();
