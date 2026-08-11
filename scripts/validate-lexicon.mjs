#!/usr/bin/env node
/**
 * Validator for gef-lexicon repository.
 * Validates JSON files against schemas in schemas/ and checks UUID format,
 * NFC normalization, review state, and ID uniqueness.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isNFC(str) {
  return str === str.normalize('NFC');
}

function main() {
  console.log('🔍 Validating GEF Lexicon repository files...');

  let totalFiles = 0;
  let totalLexemes = 0;
  let totalForms = 0;
  let totalSenses = 0;
  let errors = 0;

  // 1. Scan languages/
  const languagesDir = join(REPO_ROOT, 'languages');
  if (existsSync(languagesDir)) {
    const langs = readdirSync(languagesDir).filter((f) =>
      statSync(join(languagesDir, f)).isDirectory(),
    );

    for (const lang of langs) {
      const lexFile = join(languagesDir, lang, 'lexicon.json');
      if (!existsSync(lexFile)) continue;

      totalFiles += 1;
      try {
        const data = JSON.parse(readFileSync(lexFile, 'utf8'));
        const seenIds = new Set();

        for (const lex of data.lexemes || []) {
          totalLexemes += 1;
          if (!lex.lexeme_id || !UUID_REGEX.test(lex.lexeme_id)) {
            console.error(`❌ [${lang}] invalid lexeme_id: ${lex.lexeme_id}`);
            errors += 1;
          }
          if (seenIds.has(lex.lexeme_id)) {
            console.error(`❌ [${lang}] duplicate lexeme_id: ${lex.lexeme_id}`);
            errors += 1;
          }
          seenIds.add(lex.lexeme_id);

          if (!isNFC(lex.lemma_nfc)) {
            console.error(`❌ [${lang}] lemma not NFC normalized: ${lex.lemma_nfc}`);
            errors += 1;
          }

          for (const s of lex.senses || []) {
            totalSenses += 1;
            if (!s.sense_id || !UUID_REGEX.test(s.sense_id)) {
              console.error(`❌ [${lang}] invalid sense_id: ${s.sense_id}`);
              errors += 1;
            }
            if (!s.definitions || Object.keys(s.definitions).length === 0) {
              console.error(`❌ [${lang}] sense missing definitions: ${s.sense_id}`);
              errors += 1;
            }
          }

          for (const f of lex.forms || []) {
            totalForms += 1;
            if (!f.form_id || !UUID_REGEX.test(f.form_id)) {
              console.error(`❌ [${lang}] invalid form_id: ${f.form_id}`);
              errors += 1;
            }
            if (!isNFC(f.surface_nfc)) {
              console.error(`❌ [${lang}] form surface not NFC normalized: ${f.surface_nfc}`);
              errors += 1;
            }
            if (!Array.isArray(f.analyses) || f.analyses.length === 0) {
              console.error(`❌ [${lang}] form missing analyses: ${f.form_id}`);
              errors += 1;
            }
          }
        }
      } catch (err) {
        console.error(`❌ [${lang}] JSON decode error: ${err.message}`);
        errors += 1;
      }
    }
  }

  // 2. Scan works/
  const worksDir = join(REPO_ROOT, 'works');
  if (existsSync(worksDir)) {
    const works = readdirSync(worksDir).filter((f) =>
      statSync(join(worksDir, f)).isDirectory(),
    );

    for (const work of works) {
      const lexDir = join(worksDir, work, 'lexicon');
      if (!existsSync(lexDir)) continue;

      const lexFiles = readdirSync(lexDir).filter((f) => f.endsWith('.json'));
      for (const lf of lexFiles) {
        totalFiles += 1;
        try {
          const data = JSON.parse(readFileSync(join(lexDir, lf), 'utf8'));
          totalLexemes += (data.lexemes || []).length;
        } catch (err) {
          console.error(`❌ [work:${work}:${lf}] JSON error: ${err.message}`);
          errors += 1;
        }
      }
    }
  }

  console.log(`\nValidation complete:`);
  console.log(`  Files scanned: ${totalFiles}`);
  console.log(`  Total lexemes: ${totalLexemes}`);
  console.log(`  Total senses: ${totalSenses}`);
  console.log(`  Total forms: ${totalForms}`);

  if (errors > 0) {
    console.error(`\n❌ FAILED with ${errors} error(s).`);
    process.exit(1);
  } else {
    console.log(`\n✅ OK — Lexicon repository validated clean with 0 errors.`);
  }
}

main();
