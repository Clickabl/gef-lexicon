#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  activeSenseConceptLinks,
  approvedPrimarySenseConceptLinks,
} from './lib/concept-links.mjs';

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
  assert(compiled.schema_version === 5, 'compiled concept index must use schema_version 5');
  assert(
    typeof compiled.semantic_pivot_policy === 'string'
      && compiled.semantic_pivot_policy.includes('final translation requires contextual compatibility'),
    'compiled index must state that semantic pivot membership is not a complete translation guarantee',
  );
  assert(
    typeof compiled.usage_policy === 'string'
      && compiled.usage_policy.includes('register')
      && compiled.usage_policy.includes('region/variety'),
    'compiled index must preserve the structured usage compatibility contract',
  );

  for (const concept of compiled.concepts ?? []) {
    assert(
      concept.translation_role === 'exact_pivot' || concept.translation_role === 'taxonomy_only',
      `${concept.concept_id} is missing translation_role`,
    );

    for (const [languageTag, primarySenseIds] of Object.entries(concept.senses_by_language ?? {})) {
      const links = concept.sense_links_by_language?.[languageTag] ?? [];
      for (const senseId of primarySenseIds) {
        assert(
          links.some((link) => (
            link.sense_id === senseId
            && link.relation === 'primary'
            && link.review_state === 'approved'
            && link.semantic_pivot_ready === true
          )),
          `${concept.concept_id}/${languageTag}/${senseId} is in approved pivot view without an approved exact primary link`,
        );
      }
    }

    for (const links of Object.values(concept.sense_links_by_language ?? {})) {
      for (const link of links) {
        assert(Object.hasOwn(link, 'usage_profile'), `${link.sense_id} compiled link is missing usage_profile`);
        assert(Object.hasOwn(link, 'usage_profile_ready'), `${link.sense_id} compiled link is missing usage_profile_ready`);
        assert(Object.hasOwn(link, 'legacy_register_label'), `${link.sense_id} compiled link is missing legacy_register_label`);
        if (link.usage_profile_ready) {
          assert(link.usage_profile?.review_state === 'approved', `${link.sense_id} usage_profile_ready without approved profile`);
        }
      }
    }

    for (const [languageTag, candidateSenseIds] of Object.entries(concept.candidate_senses_by_language ?? {})) {
      const approved = new Set(concept.senses_by_language?.[languageTag] ?? []);
      for (const senseId of candidateSenseIds) {
        assert(!approved.has(senseId), `${concept.concept_id}/${languageTag}/${senseId} appears in both candidate and approved views`);
      }
    }
  }

  const frogConceptId = 'cpt_018f2c3a-7b1e-7a4d-9c2e-000000000003';
  const frog = (compiled.concepts ?? []).find((concept) => concept.concept_id === frogConceptId);
  assert(frog, 'frog concept missing from compiled index');
  assert(frog.translation_role === 'exact_pivot', 'frog concept must be an exact semantic pivot');

  const expected = {
    el: '018f2c3a-7b1e-7a4d-9c2e-000000000406',
    en: '018f2c3a-7b1e-7a4d-9c2e-000000000113',
    es: '018f2c3a-7b1e-7a4d-9c2e-000000000208',
    ja: '018f2c3a-7b1e-7a4d-9c2e-000000000308',
  };

  for (const [languageTag, senseId] of Object.entries(expected)) {
    assert(
      frog.candidate_senses_by_language?.[languageTag]?.includes(senseId),
      `frog concept does not expose expected candidate ${languageTag} sense ${senseId}`,
    );
    assert(
      !(frog.senses_by_language?.[languageTag] ?? []).includes(senseId),
      `candidate ${languageTag} frog sense ${senseId} leaked into approved semantic-pivot view`,
    );

    const lexicon = readJson(join(ROOT, 'languages', languageTag, 'lexicon.json'));
    const hit = findSense(lexicon, senseId);
    assert(hit, `canonical ${languageTag} sense ${senseId} is missing`);

    const primary = activeSenseConceptLinks(hit.sense, hit.lexeme.review_state)
      .find((link) => link.relation === 'primary');
    assert(primary?.concept_id === frogConceptId, `${languageTag} frog sense does not round-trip to frog concept`);
    assert(
      approvedPrimarySenseConceptLinks(hit.sense, hit.lexeme.review_state).length === 0,
      `${languageTag} candidate frog sense unexpectedly became an approved semantic pivot`,
    );
  }

  const syntheticApproved = {
    sense_id: 'synthetic-approved-frog',
    review_state: 'approved',
    concept_links: [
      { concept_id: frogConceptId, relation: 'primary', review_state: 'approved' },
    ],
  };
  assert(
    approvedPrimarySenseConceptLinks(syntheticApproved, 'approved')[0]?.concept_id === frogConceptId,
    'approved lexeme + approved sense + approved primary link must become semantic-pivot-ready',
  );

  const candidateSenseWithApprovedLink = {
    ...syntheticApproved,
    sense_id: 'synthetic-candidate-sense-approved-link',
    review_state: 'candidate',
  };
  assert(
    approvedPrimarySenseConceptLinks(candidateSenseWithApprovedLink, 'approved').length === 0,
    'approved concept edge must not launder a candidate sense into the approved semantic-pivot view',
  );

  assert(
    approvedPrimarySenseConceptLinks(syntheticApproved, 'candidate').length === 0,
    'approved sense/link must not launder a candidate containing lexeme into the approved semantic-pivot view',
  );

  console.log(
    '✅ Sense-link graph test passed: semantic pivots require hierarchical approval, carry usage metadata, and still do not claim final surface-level equivalence.',
  );
}

main();
