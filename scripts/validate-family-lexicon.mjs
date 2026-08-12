#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { buildFamilyLexiconDocuments, loadFamilyLexiconSet, splitFamilyExpressions } from './lib/family-lexicon.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

function main() {
  console.log('👪 Validating Family Members Lexi projection...');
  let errors = 0;
  const fail = (message) => { console.error(`❌ ${message}`); errors += 1; };

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validateSet = ajv.compile(readJson(join(REPO_ROOT, 'schemas', 'lexicon-set.schema.json')));
  const validateLexicon = ajv.compile(readJson(join(REPO_ROOT, 'schemas', 'lexicon-entry.schema.json')));
  const { set, vocabularyManifest, shards } = loadFamilyLexiconSet(REPO_ROOT);
  if (!validateSet(set)) fail(`Lexicon-set schema: ${JSON.stringify(validateSet.errors)}`);

  const concepts = new Set((readJson(join(REPO_ROOT, 'concepts', 'graph.json')).concepts ?? []).map((item) => item.concept_id));
  for (const [key, conceptId] of Object.entries(set.concept_map ?? {})) if (!concepts.has(conceptId)) fail(`concept_map.${key} points to missing concept '${conceptId}'.`);
  for (const [key, conceptIds] of Object.entries(set.broader_concept_map ?? {})) for (const conceptId of conceptIds) if (!concepts.has(conceptId)) fail(`broader_concept_map.${key} points to missing concept '${conceptId}'.`);

  const lessonPath = join(REPO_ROOT, 'lessons', 'mul', 'family-members', 'lesson.json');
  if (!existsSync(lessonPath)) fail(`Missing lesson target ${set.lesson_offer?.lesson_id}: ${lessonPath}`);
  else if (readJson(lessonPath).lesson_id !== set.lesson_offer?.lesson_id) fail('Family lexicon lesson_offer does not match lesson.json.');

  const docs = buildFamilyLexiconDocuments(REPO_ROOT);
  if (docs.size !== vocabularyManifest.expected_total) fail(`Expected ${vocabularyManifest.expected_total} Family lexicon languages, got ${docs.size}.`);

  const sourceLanguages = new Set();
  for (const shard of shards) for (const entry of shard.entries ?? []) sourceLanguages.add(entry.language_tag);
  if (sourceLanguages.size !== docs.size) fail(`Source vocabulary has ${sourceLanguages.size} languages, generated Lexicon has ${docs.size}.`);

  const ids = new Set();
  let lexemeCount = 0;
  let senseCount = 0;
  let relationCount = 0;
  let lessonOfferCount = 0;

  for (const [languageTag, doc] of docs) {
    if (!validateLexicon(doc)) fail(`${languageTag}: generated lexicon schema: ${JSON.stringify(validateLexicon.errors)}`);
    const primaryConcepts = new Set();

    for (const lexeme of doc.lexemes ?? []) {
      lexemeCount += 1;
      const structuralIds = [lexeme.lexeme_id, ...(lexeme.forms ?? []).map((item) => item.form_id), ...(lexeme.forms ?? []).flatMap((item) => (item.analyses ?? []).map((analysis) => analysis.analysis_id))];
      for (const id of structuralIds) { if (ids.has(id)) fail(`Duplicate generated ID '${id}'.`); ids.add(id); }
      if (lexeme.lemma_nfc !== lexeme.lemma_nfc.normalize('NFC')) fail(`${languageTag}:${lexeme.lemma_nfc}: lemma is not NFC.`);

      for (const sense of lexeme.senses ?? []) {
        senseCount += 1;
        if (ids.has(sense.sense_id)) fail(`Duplicate generated sense ID '${sense.sense_id}'.`);
        ids.add(sense.sense_id);
        primaryConcepts.add(sense.primary_concept_id);
        const refs = sense.concept_refs ?? [];
        if (!refs.some((ref) => ref.relation === 'primary' && ref.concept_id === sense.primary_concept_id)) fail(`${sense.sense_id}: primary concept is not represented in concept_refs.`);
        for (const ref of refs) if (!concepts.has(ref.concept_id)) fail(`${sense.sense_id}: missing concept '${ref.concept_id}'.`);
        for (const relation of sense.relations ?? []) {
          relationCount += 1;
          if (relation.relation_type !== 'related_by_relationship') fail(`${sense.sense_id}: unsafe generated relation '${relation.relation_type}'.`);
        }
        for (const offer of sense.lesson_refs ?? []) {
          lessonOfferCount += 1;
          if (offer.lesson_id !== set.lesson_offer.lesson_id) fail(`${sense.sense_id}: lesson offer drifted from Family lesson.`);
        }
        if ((sense.lesson_refs ?? []).length !== 1) fail(`${sense.sense_id}: expected exactly one Family lesson offer.`);
      }
    }

    for (const conceptId of Object.values(set.concept_map)) if (!primaryConcepts.has(conceptId)) fail(`${languageTag}: missing primary family concept '${conceptId}'.`);
  }

  const internalSlashSamples = [];
  for (const shard of shards) for (const entry of shard.entries ?? []) for (const cell of entry.terms ?? []) if (cell.includes('/') && !cell.includes(set.expression_separator)) internalSlashSamples.push(cell);
  for (const sample of internalSlashSamples.slice(0, 20)) if (splitFamilyExpressions(sample, set.expression_separator).length !== 1) fail(`Internal slash was incorrectly split: '${sample}'.`);

  const english = docs.get('en');
  const mother = english?.lexemes?.find((item) => item.lemma_nfc === 'mother');
  const mom = english?.lexemes?.find((item) => item.lemma_nfc === 'mom');
  if (!mother || !mom) fail('English must contain separate mother and mom lexemes.');
  else {
    if (mother.lexeme_id === mom.lexeme_id) fail('mother and mom must not collapse to one lexeme.');
    if (mother.senses?.[0]?.primary_concept_id !== mom.senses?.[0]?.primary_concept_id) fail('mother and mom must share the parent-female relationship concept.');
    if (mother.senses?.[0]?.register_label !== 'neutral') fail('mother should carry neutral register metadata.');
    if (mom.senses?.[0]?.register_label !== 'familiar') fail('mom should carry familiar register metadata.');
    if (!(mother.senses?.[0]?.relations ?? []).some((relation) => relation.target_id === mom.senses?.[0]?.sense_id)) fail('mother must link to mom as related by relationship.');
  }

  console.log(`  Languages: ${docs.size}`);
  console.log(`  Lexemes: ${lexemeCount}`);
  console.log(`  Senses: ${senseCount}`);
  console.log(`  Related-by-relationship edges: ${relationCount}`);
  console.log(`  Lesson offers: ${lessonOfferCount}`);

  if (errors) {
    console.error(`\n❌ Family Lexi validation failed with ${errors} error(s).`);
    process.exit(1);
  }
  console.log('✅ Family Members Lexi projection is structurally complete for all 104 languages.');
}

main();
