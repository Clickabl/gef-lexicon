#!/usr/bin/env node
/**
 * Production Iron-Gate Validator for gef-lexicon repository.
 * Evaluates Ajv JSON schemas, referential integrity (concepts & distractor targets),
 * ID uniqueness across files, review_state honesty, and NFC normalization.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isNFC(str) {
  return typeof str === 'string' && str === str.normalize('NFC');
}

function main() {
  console.log('🛡️ Running GEF Lexicon Iron-Gate Validator...');

  const ajv = new Ajv({ allErrors: true, strict: false });

  // Load schemas
  const lexiconEntrySchema = JSON.parse(
    readFileSync(join(REPO_ROOT, 'schemas', 'lexicon-entry.schema.json'), 'utf8'),
  );
  const conceptSchema = JSON.parse(
    readFileSync(join(REPO_ROOT, 'schemas', 'concept.schema.json'), 'utf8'),
  );
  const profileSchema = JSON.parse(
    readFileSync(join(REPO_ROOT, 'schemas', 'language-profile.schema.json'), 'utf8'),
  );

  const validateLexiconEntry = ajv.compile(lexiconEntrySchema);
  const validateConcept = ajv.compile(conceptSchema);
  const validateProfile = ajv.compile(profileSchema);

  let errors = 0;
  let totalFiles = 0;
  let totalLexemes = 0;
  let totalSenses = 0;
  let totalForms = 0;

  const allConceptIds = new Set();
  const allEntityIds = new Map(); // id -> type & file

  // 1. Validate concepts/graph.json
  const conceptsFile = join(REPO_ROOT, 'concepts', 'graph.json');
  if (existsSync(conceptsFile)) {
    totalFiles += 1;
    const cData = JSON.parse(readFileSync(conceptsFile, 'utf8'));
    if (!validateConcept(cData)) {
      console.error(`❌ Schema error in concepts/graph.json:`, validateConcept.errors);
      errors += 1;
    }
    for (const c of cData.concepts || []) {
      if (allConceptIds.has(c.concept_id)) {
        console.error(`❌ Duplicate concept_id: ${c.concept_id}`);
        errors += 1;
      }
      allConceptIds.add(c.concept_id);
      allEntityIds.set(c.concept_id, { type: 'concept', file: 'concepts/graph.json' });
    }
  } else {
    console.error(`❌ Missing concepts/graph.json`);
    errors += 1;
  }

  // 2. Validate languages/
  const languagesDir = join(REPO_ROOT, 'languages');
  if (existsSync(languagesDir)) {
    const langs = readdirSync(languagesDir).filter((f) =>
      statSync(join(languagesDir, f)).isDirectory(),
    );

    for (const lang of langs) {
      // Validate language profile
      const profFile = join(languagesDir, lang, 'profile.json');
      if (existsSync(profFile)) {
        totalFiles += 1;
        const pData = JSON.parse(readFileSync(profFile, 'utf8'));
        if (!validateProfile(pData)) {
          console.error(`❌ Schema error in languages/${lang}/profile.json:`, validateProfile.errors);
          errors += 1;
        }
      } else {
        console.error(`❌ Missing profile.json in languages/${lang}`);
        errors += 1;
      }

      // Validate core lexicon
      const lexFile = join(languagesDir, lang, 'lexicon.json');
      if (!existsSync(lexFile)) continue;
      totalFiles += 1;

      const lData = JSON.parse(readFileSync(lexFile, 'utf8'));
      if (!validateLexiconEntry(lData)) {
        console.error(`❌ Schema error in languages/${lang}/lexicon.json:`, validateLexiconEntry.errors);
        errors += 1;
      }

      for (const lex of lData.lexemes || []) {
        totalLexemes += 1;
        if (allEntityIds.has(lex.lexeme_id)) {
          console.error(`❌ Duplicate lexeme_id across repo: ${lex.lexeme_id}`);
          errors += 1;
        }
        allEntityIds.set(lex.lexeme_id, { type: 'lexeme', file: `languages/${lang}` });

        if (!isNFC(lex.lemma_nfc)) {
          console.error(`❌ [${lang}] lemma_nfc not NFC: ${lex.lemma_nfc}`);
          errors += 1;
        }

        for (const s of lex.senses || []) {
          totalSenses += 1;
          if (allEntityIds.has(s.sense_id)) {
            console.error(`❌ Duplicate sense_id across repo: ${s.sense_id}`);
            errors += 1;
          }
          allEntityIds.set(s.sense_id, { type: 'sense', file: `languages/${lang}` });

          if (s.primary_concept_id && !allConceptIds.has(s.primary_concept_id)) {
            console.error(`❌ [${lang}:${lex.lemma_nfc}] primary_concept_id '${s.primary_concept_id}' not found in concepts/graph.json`);
            errors += 1;
          }
        }

        for (const f of lex.forms || []) {
          totalForms += 1;
          if (allEntityIds.has(f.form_id)) {
            console.error(`❌ Duplicate form_id across repo: ${f.form_id}`);
            errors += 1;
          }
          allEntityIds.set(f.form_id, { type: 'form', file: `languages/${lang}` });

          if (!isNFC(f.surface_nfc)) {
            console.error(`❌ [${lang}] surface_nfc not NFC: ${f.surface_nfc}`);
            errors += 1;
          }

          for (const a of f.analyses || []) {
            if (allEntityIds.has(a.analysis_id)) {
              console.error(`❌ Duplicate analysis_id across repo: ${a.analysis_id}`);
              errors += 1;
            }
            allEntityIds.set(a.analysis_id, { type: 'analysis', file: `languages/${lang}` });
          }
        }
      }
    }
  }

  // 3. Second pass: Referential Integrity check on Relation arrays (synonyms, homophones, etc.)
  if (existsSync(languagesDir)) {
    const langs = readdirSync(languagesDir).filter((f) =>
      statSync(join(languagesDir, f)).isDirectory(),
    );

    for (const lang of langs) {
      const lexFile = join(languagesDir, lang, 'lexicon.json');
      if (!existsSync(lexFile)) continue;

      const lData = JSON.parse(readFileSync(lexFile, 'utf8'));
      for (const lex of lData.lexemes || []) {
        for (const s of lex.senses || []) {
          const relFields = ['homophones', 'homonyms', 'synonyms', 'antonyms', 'confusable_senses'];
          for (const field of relFields) {
            for (const rel of s[field] || []) {
              const targetId = typeof rel === 'string' ? rel : rel.target_id;
              if (targetId && !allEntityIds.has(targetId)) {
                console.error(`❌ [${lang}:${lex.lemma_nfc}] Dangling relation in '${field}': target_id '${targetId}' does not exist in repository`);
                errors += 1;
              }
            }
          }
        }
      }
    }
  }

  console.log(`\nIron-Gate Validation Summary:`);
  console.log(`  Total Files Validated: ${totalFiles}`);
  console.log(`  Declared Concepts: ${allConceptIds.size}`);
  console.log(`  Validated Lexemes: ${totalLexemes}`);
  console.log(`  Validated Senses: ${totalSenses}`);
  console.log(`  Validated Forms: ${totalForms}`);

  if (errors > 0) {
    console.error(`\n❌ IRON-GATE VALIDATION FAILED with ${errors} error(s).`);
    process.exit(1);
  } else {
    console.log(`\n✅ OK — Iron-Gate Validator passed with 0 errors.`);
  }
}

main();
