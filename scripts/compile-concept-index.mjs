#!/usr/bin/env node
/**
 * Compiles reverse concept index (concept_id -> senses_by_language)
 * from canonical sense data in core and overlay lexicons.
 *
 * Run: node scripts/compile-concept-index.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

function main() {
  const conceptsFile = join(REPO_ROOT, 'concepts', 'graph.json');
  if (!existsSync(conceptsFile)) {
    console.error('❌ Missing concepts/graph.json manifest.');
    process.exit(1);
  }

  const conceptsManifest = JSON.parse(readFileSync(conceptsFile, 'utf8'));
  const conceptIndex = {};

  for (const c of conceptsManifest.concepts || []) {
    conceptIndex[c.concept_id] = {
      concept_id: c.concept_id,
      concept_key: c.concept_key,
      domain: c.domain,
      planning_difficulty_hint: c.planning_difficulty_hint || null,
      senses_by_language: {},
    };
  }

  // Scan languages/
  const languagesDir = join(REPO_ROOT, 'languages');
  if (existsSync(languagesDir)) {
    const langs = readdirSync(languagesDir).filter((f) =>
      statSync(join(languagesDir, f)).isDirectory(),
    );

    for (const lang of langs) {
      const lexFile = join(languagesDir, lang, 'lexicon.json');
      if (!existsSync(lexFile)) continue;

      const data = JSON.parse(readFileSync(lexFile, 'utf8'));
      for (const lex of data.lexemes || []) {
        for (const s of lex.senses || []) {
          const cid = s.primary_concept_id;
          if (cid) {
            if (!conceptIndex[cid]) {
              console.warn(`⚠️  Sense ${s.sense_id} references unmanifested concept_id: ${cid}`);
              conceptIndex[cid] = {
                concept_id: cid,
                concept_key: `unmanifested-${cid}`,
                domain: 'unspecified',
                planning_difficulty_hint: null,
                senses_by_language: {},
              };
            }
            const langSenses = conceptIndex[cid].senses_by_language[lang] || [];
            if (!langSenses.includes(s.sense_id)) {
              langSenses.push(s.sense_id);
            }
            conceptIndex[cid].senses_by_language[lang] = langSenses;
          }
        }
      }
    }
  }

  const outputFile = join(REPO_ROOT, 'concepts', 'compiled-concept-index.json');
  const payload = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    concepts: Object.values(conceptIndex),
  };

  writeFileSync(outputFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`✅ Compiled reverse concept index to concepts/compiled-concept-index.json (${Object.keys(conceptIndex).length} concepts mapped).`);
}

main();
