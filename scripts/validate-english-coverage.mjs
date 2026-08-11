#!/usr/bin/env node
/**
 * Validates the English source-vocabulary pass for Gef Intro + Frog King.
 *
 * The source coverage manifest is a mechanical inventory. The enrichment shards
 * must account for every candidate lemma exactly once, preserve the attested
 * normalized surfaces, provide English guidance, and remain non-production
 * candidate/review staging data.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const COVERAGE_DIR = join(ROOT, 'languages', 'en', 'coverage');
const MANIFEST = join(COVERAGE_DIR, 'gef-intro-frog-king.json');
const SCHEMA = join(ROOT, 'schemas', 'coverage-enrichment.schema.json');

const sameStrings = (a = [], b = []) => {
  const aa = [...a].sort();
  const bb = [...b].sort();
  return aa.length === bb.length && aa.every((v, i) => v === bb[i]);
};

function main() {
  let errors = 0;
  const fail = (message) => {
    console.error(`❌ ${message}`);
    errors += 1;
  };

  if (!existsSync(MANIFEST)) {
    fail('Missing English coverage manifest.');
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const expected = new Map();
  for (const item of manifest.lemma_inventory || []) {
    if (expected.has(item.lemma)) fail(`Duplicate lemma '${item.lemma}' in coverage manifest.`);
    expected.set(item.lemma, item);
  }

  if (expected.size !== manifest.candidate_lemma_count) {
    fail(`Manifest says candidate_lemma_count=${manifest.candidate_lemma_count}, but contains ${expected.size} unique lemma records.`);
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(JSON.parse(readFileSync(SCHEMA, 'utf8')));

  const shardFiles = readdirSync(COVERAGE_DIR)
    .filter((f) => /^enrichment-.*\.json$/.test(f))
    .sort();

  if (shardFiles.length === 0) fail('No English enrichment shards found.');

  const enriched = new Map();
  let recordCount = 0;
  for (const filename of shardFiles) {
    const data = JSON.parse(readFileSync(join(COVERAGE_DIR, filename), 'utf8'));
    if (!validate(data)) {
      fail(`${filename}: schema error ${JSON.stringify(validate.errors)}`);
    }
    for (const record of data.records || []) {
      recordCount += 1;
      if (enriched.has(record.lemma)) {
        fail(`Lemma '${record.lemma}' appears in more than one enrichment record (${enriched.get(record.lemma).file}, ${filename}).`);
        continue;
      }
      enriched.set(record.lemma, { ...record, file: filename });
      if (!record.definition_en || !record.definition_en.trim()) {
        fail(`${filename}:${record.lemma}: missing definition_en.`);
      }
      if (!record.upos_candidates || record.upos_candidates.length === 0) {
        fail(`${filename}:${record.lemma}: missing upos_candidates.`);
      }
      if (record.review_state === 'reviewed') {
        // Allowed, but this flag must represent an actual editorial action.
      }
    }
  }

  for (const [lemma, expectedItem] of expected) {
    const record = enriched.get(lemma);
    if (!record) {
      fail(`Coverage lemma '${lemma}' is missing from enrichment shards.`);
      continue;
    }
    if (!sameStrings(expectedItem.attested_surfaces, record.attested_surfaces)) {
      fail(`${record.file}:${lemma}: attested_surfaces do not match coverage manifest. expected=${JSON.stringify(expectedItem.attested_surfaces)} actual=${JSON.stringify(record.attested_surfaces)}`);
    }
  }

  for (const [lemma, record] of enriched) {
    if (!expected.has(lemma)) fail(`${record.file}:${lemma}: enrichment record is not present in coverage manifest.`);
  }

  console.log('📚 English Source Coverage Validation Summary:');
  console.log(`  Source word tokens: ${manifest.token_count}`);
  console.log(`  Unique normalized surfaces: ${manifest.unique_normalized_surface_count}`);
  console.log(`  Candidate lemmas expected: ${expected.size}`);
  console.log(`  Enrichment records found: ${recordCount}`);
  console.log(`  Enrichment shards: ${shardFiles.join(', ')}`);

  if (errors > 0) {
    console.error(`\n❌ ENGLISH COVERAGE VALIDATION FAILED with ${errors} error(s).`);
    process.exit(1);
  }
  console.log('\n✅ OK — every English source lemma has exactly one enrichment record with matching surfaces.');
}

main();
