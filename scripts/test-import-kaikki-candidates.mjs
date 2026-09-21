#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import Ajv from 'ajv';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'gef-kaikki-import-'));

const sourceRows = [
  {
    word: 'casa',
    lang: 'Spanish',
    lang_code: 'es',
    pos: 'noun',
    page_id: 101,
    revision_id: 202,
    etymology_number: 1,
    etymology_text: 'Inherited from Latin casa.',
    etymology_templates: [{ name: 'inh', args: { 1: 'es', 2: 'la', 3: 'casa' } }],
    forms: [
      { form: 'casas', tags: ['plural'], raw_tags: ['plural'] },
      { form: 'casa', tags: ['singular'] },
    ],
    sounds: [
      { ipa: '/ˈkasa/', tags: ['Spain'], audio: 'Es-casa.ogg', ogg_url: 'https://example.test/Es-casa.ogg' },
      { audio: 'Es-casa-2.ogg', mp3_url: 'https://example.test/Es-casa-2.mp3' },
    ],
    translations: [{ lang_code: 'fr', lang: 'French', word: 'maison', sense: 'dwelling' }],
    related: [{ word: 'vivienda', sense: 'row-level evidence must not be assigned to a sense' }],
    senses: [
      {
        glosses: ['a building used as a home', 'a home', 'a household'],
        tags: ['countable'],
        raw_tags: ['Spain'],
        categories: ['Spanish nouns'],
        topics: ['Buildings'],
        examples: [{ text: 'Esta es mi casa.', translation: 'This is my house.', ref: 'source example' }],
        translations: [{ lang_code: 'en', word: 'house', sense: 'building used as a home' }],
        synonyms: [{ word: 'hogar', sense: 'home' }, { word: 'domicilio', sense: 'residence' }],
        meronyms: [{ word: 'habitación', sense: 'room' }],
      },
      { glosses: ['a business establishment'], antonyms: [{ word: 'calle' }] },
    ],
  },
  {
    word: 'hogar', lang: 'Spanish', lang_code: 'es', pos: 'noun', page_id: 303,
    senses: [{ glosses: ['a home or household'] }],
  },
];

try {
  const inputBytes = gzipSync(`${sourceRows.map((row) => JSON.stringify(row)).join('\n')}\n`);
  const inputPath = join(temporaryRoot, 'bounded-es.jsonl.gz');
  writeFileSync(inputPath, inputBytes);

  function run(suffix) {
    const lexiconPath = join(temporaryRoot, `lexicon-${suffix}.json`);
    const relationsPath = join(temporaryRoot, `relations-${suffix}.json`);
    execFileSync(process.execPath, [
      join(root, 'scripts/import-kaikki-candidates.mjs'),
      '--input', inputPath,
      '--language', 'es',
      '--output', lexiconPath,
      '--relations', relationsPath,
    ], { cwd: root, stdio: 'pipe' });
    return {
      lexiconText: readFileSync(lexiconPath, 'utf8'),
      relationsText: readFileSync(relationsPath, 'utf8'),
    };
  }

  const first = run('first');
  const second = run('second');
  assert.equal(first.lexiconText, second.lexiconText, 'duplicate imports must be byte deterministic');
  assert.equal(first.relationsText, second.relationsText, 'relation imports must be byte deterministic');

  const lexicon = JSON.parse(first.lexiconText);
  const relationGraph = JSON.parse(first.relationsText);
  const ajv = new Ajv({ allErrors: true, strict: false });
  for (const [filename, value] of [
    ['lexicon-entry.schema.json', lexicon],
    ['semantic-relation.schema.json', relationGraph],
  ]) {
    const validate = ajv.compile(JSON.parse(readFileSync(join(root, 'schemas', filename), 'utf8')));
    assert.ok(validate(value), `${filename}: ${JSON.stringify(validate.errors)}`);
  }
  assert.equal(lexicon.import_metadata.source_edition, 'enwiktionary');
  assert.equal(lexicon.import_metadata.definition_language, 'en');
  assert.deepEqual(lexicon.import_metadata.source_checksum, {
    algorithm: 'sha256',
    value: createHash('sha256').update(inputBytes).digest('hex'),
  });
  assert.ok(lexicon.import_metadata.attribution.includes('Wiktionary contributors'));
  assert.deepEqual(lexicon.import_metadata.applicable_licenses, ['CC BY-SA', 'GFDL']);
  assert.equal(lexicon.import_metadata.review_state, 'candidate');

  const casa = lexicon.lexemes.find((lexeme) => lexeme.lemma_nfc === 'casa');
  assert.ok(casa);
  assert.equal(casa.review_state, 'candidate');
  assert.equal(casa.senses.length, 2);
  assert.equal(casa.source_assertions[0].source_record.sounds.length, 2, 'full source record must survive');
  assert.equal(casa.etymology.text, 'Inherited from Latin casa.');
  assert.equal(casa.etymology.templates.length, 1);
  assert.equal(casa.translation_assertions[0].word, 'maison');

  const homeSense = casa.senses.find((sense) => sense.glosses.en.length === 3);
  assert.ok(homeSense);
  assert.deepEqual(Object.keys(homeSense.definitions), ['en'], 'English Wiktionary gloss must not be mislabeled es');
  assert.deepEqual(homeSense.glosses.en, ['a building used as a home', 'a home', 'a household']);
  assert.deepEqual(homeSense.concept_links, []);
  assert.equal(homeSense.review_state, 'candidate');
  assert.equal(homeSense.examples[0].source_data.text, 'Esta es mi casa.');
  assert.equal(homeSense.translation_assertions[0].word, 'house');
  assert.equal(homeSense.labels.raw_tags[0], 'Spain');
  assert.ok(homeSense.unresolved_relations.some((relation) => (
    relation.target.word === 'domicilio' && relation.reason === 'target_lexeme_not_present'
  )));
  assert.ok(homeSense.unresolved_relations.some((relation) => (
    relation.target.word === 'habitación' && relation.reason === 'target_lexeme_not_present'
  )));

  assert.equal(homeSense.synonyms.length, 1, 'resolved relation should also be a one-hop sense ref');
  assert.equal(homeSense.synonyms[0].target_type, 'lexeme');
  assert.equal(homeSense.synonyms[0].target_id, lexicon.lexemes.find((lexeme) => lexeme.lemma_nfc === 'hogar').lexeme_id);
  assert.ok(!('definitions' in homeSense.synonyms[0]), 'one-hop relation refs must not embed target payloads');

  const plural = casa.forms.find((form) => form.surface_nfc === 'casas');
  assert.ok(plural);
  assert.equal(plural.analyses[0].tags[0], 'plural');
  const lemma = casa.forms.find((form) => form.surface_nfc === 'casa');
  assert.ok(lemma);
  const pronunciations = lemma.analyses.flatMap((analysis) => analysis.pronunciations ?? []);
  assert.equal(pronunciations[0].ipa, '/ˈkasa/');
  assert.equal(pronunciations[0].audio_refs[0].value, 'Es-casa.ogg');
  assert.equal(casa.pronunciation_evidence.length, 2, 'audio-only evidence must not be discarded');
  assert.equal(casa.pronunciation_evidence[1].source_data.mp3_url, 'https://example.test/Es-casa-2.mp3');

  assert.equal(relationGraph.relations.length, 1, 'only one unambiguous target is projectable');
  assert.equal(relationGraph.relations[0].relation_type, 'near_synonym');
  assert.equal(relationGraph.relations[0].translation_authority, 'none');
  assert.equal(relationGraph.relations[0].review_state, 'candidate');
  assert.equal(relationGraph.relations[0].provenance.source_record_id, '101');
  assert.ok(!first.lexiconText.includes('"approved"'));
  assert.ok(!first.relationsText.includes('"approved"'));

  console.log('✅ Rich Kaikki candidate import retention and determinism verified.');
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
