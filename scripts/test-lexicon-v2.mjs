#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import {
  buildSenseCard,
  computeSenseReadiness,
  flattenMorphologyFeatures,
  normalizeLexiconDocument,
} from './lib/lexicon-v2.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const v2Schema = JSON.parse(readFileSync(join(ROOT, 'schemas', 'lexicon-v2.schema.json'), 'utf8'));
const cardSchema = JSON.parse(readFileSync(join(ROOT, 'schemas', 'sense-card-v1.schema.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
const validateV2 = ajv.compile(v2Schema);
const validateCard = ajv.compile(cardSchema);

const REAL_CONCEPT = 'cpt_018f2c3a-7b1e-7a4d-9c2e-000000000003';
const legacy = {
  schema_version: 1,
  language_code: 'en',
  source_scope: 'test_fixture',
  lexemes: [
    {
      lexeme_id: 'lex_test_frog',
      lemma_nfc: 'frog',
      upos: 'NOUN',
      review_state: 'approved',
      senses: [
        {
          sense_id: 'sense_test_frog',
          sense_key: 'frog-amphibian',
          primary_concept_id: REAL_CONCEPT,
          definitions: { en: 'a tailless amphibian with long hind legs' },
          cefr_level: 'A1',
          review_state: 'approved',
          confusable_senses: ['sense_test_toad'],
        },
        {
          sense_id: 'sense_test_grammar',
          sense_key: 'legacy-grammar-link',
          primary_concept_id: 'GRAMMAR.en.test.example',
          definitions: { en: 'a fixture used to test legacy curriculum migration' },
          cefr_level: 'A2',
          review_state: 'approved',
        },
        {
          sense_id: 'sense_test_toad',
          sense_key: 'fixture-confusable',
          primary_concept_id: REAL_CONCEPT,
          definitions: { en: 'a fixture meaning used as a relation target' },
          cefr_level: 'A1',
          review_state: 'approved',
        }
      ],
      forms: [
        {
          form_id: 'form_test_frog',
          surface_nfc: 'frog',
          normalized_lookup: 'frog',
          attested_in_text: true,
          review_state: 'approved',
          analyses: [
            {
              analysis_id: 'analysis_test_frog',
              features: { base: { number: 'singular' }, subject: { person: '3' } },
              pronunciations: [{ ipa: 'fɹɑɡ', locale: 'en-US', notation: 'phonemic' }]
            }
          ]
        }
      ]
    }
  ]
};

const pkg = normalizeLexiconDocument(legacy);
assert.equal(pkg.schema_version, 2);
assert.ok(validateV2(pkg), JSON.stringify(validateV2.errors));

const frogSense = pkg.senses.find((item) => item.sense_id === 'sense_test_frog');
assert.equal(frogSense.primary_concept_id, REAL_CONCEPT);
assert.deepEqual(frogSense.concept_links, [{ concept_id: REAL_CONCEPT, relationship: 'exact' }]);

const grammarSense = pkg.senses.find((item) => item.sense_id === 'sense_test_grammar');
assert.equal(grammarSense.primary_concept_id, null);
assert.deepEqual(grammarSense.concept_links, []);
assert.deepEqual(grammarSense.knowledge_links, ['GRAMMAR.en.test.example']);

assert.equal(Object.prototype.hasOwnProperty.call(pkg.forms[0], 'attested_in_text'), false);
assert.deepEqual(flattenMorphologyFeatures(pkg.forms[0].analyses[0].features), {
  'base.number': 'singular',
  'subject.person': '3',
});

const confusable = pkg.relations.find((item) => item.source.id === 'sense_test_frog');
assert.equal(confusable.relation_type, 'semantic_confusable');
assert.deepEqual(confusable.target, { type: 'sense', id: 'sense_test_toad' });

let readiness = computeSenseReadiness(pkg, 'sense_test_frog', 'en');
assert.equal(readiness.lookup_ready, true);
assert.equal(readiness.quiz_ready, true);
assert.equal(readiness.daily_ready, false);
assert.ok(readiness.reasons.includes('missing_gloss'));
assert.ok(readiness.reasons.includes('missing_approved_reusable_example'));

pkg.localizations.find((item) => item.sense_id === 'sense_test_frog' && item.interface_language === 'en').gloss = 'a jumping amphibian';
pkg.examples.push({
  example_id: 'example_test_frog',
  language_code: 'en',
  text_nfc: 'A frog jumped beside the pond.',
  sense_ids: ['sense_test_frog'],
  cefr_level: 'A1',
  translations: [{ interface_language: 'es', text: 'Una rana saltó junto al estanque.', review_state: 'approved' }],
  review_state: 'approved',
  provenance_note: 'Original Gef test sentence.'
});
assert.ok(validateV2(pkg), JSON.stringify(validateV2.errors));
readiness = computeSenseReadiness(pkg, 'sense_test_frog', 'en');
assert.equal(readiness.daily_ready, true);

const card = buildSenseCard(pkg, 'sense_test_frog', 'en');
assert.ok(validateCard(card), JSON.stringify(validateCard.errors));
assert.equal(card.sense_id, 'sense_test_frog');
assert.equal(card.headword, 'frog');
assert.equal(card.localization.gloss, 'a jumping amphibian');
assert.equal(card.example.text, 'A frog jumped beside the pond.');
assert.equal(card.readiness.daily_ready, true);

console.log('✅ Lexicon v2 compatibility tests passed.');
