#!/usr/bin/env node
// Writes the four Meet-a-language realization files for a new language with every slot present and unfilled (null),
// so adding a language is filling in blanks: node scripts/curriculum-v2-skeleton.mjs sw --layers latin
// Existing files are never overwritten.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRANCH_TOPIC_KEYS, fixedSlots, loadSlots } from './lib/curriculum-slots.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SLOTS = loadSlots(ROOT);
const args = process.argv.slice(2);
const lang = args.find((arg) => !arg.startsWith('--'));
const layersIndex = args.indexOf('--layers');
const layers = layersIndex >= 0 ? String(args[layersIndex + 1] ?? '').split(',').filter(Boolean) : [];
if (!lang || !/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(lang) || layers.length === 0) {
  console.error('Usage: node scripts/curriculum-v2-skeleton.mjs <language-tag> --layers <layer,layer,...>   (layer ids such as latin, arabic, hanzi, pinyin)');
  process.exit(2);
}
const capabilities = {
  language_overview: ['explanation', 'comparison', 'recognition_practice'],
  writing_system: ['explanation', 'reviewed_examples', 'recognition_practice'],
  sound_system: ['explanation', 'reviewed_examples', 'recognition_practice', 'listening'],
  grammar_glance: ['explanation', 'comparison', 'reviewed_examples', 'recognition_practice'],
};
const dir = join(ROOT, 'curriculum-v2', 'realizations', lang);
mkdirSync(dir, { recursive: true });
for (const key of BRANCH_TOPIC_KEYS) {
  const path = join(dir, `${key.replaceAll('_', '-')}.json`);
  if (existsSync(path)) { console.log(`kept    ${path}`); continue; }
  const facts = fixedSlots(key, SLOTS, layers).map((slot) => ({ fact_id: slot.id, fact_kind: slot.kind, value: null }));
  const layersFact = facts.find((fact) => fact.fact_id === 'writing.layers');
  if (layersFact) layersFact.value = layers;
  const realization = {
    schema_version: 2,
    realization_id: `REAL.${lang}.${key}`,
    topic_id: `TOPIC.orientation.${key}`,
    language_tag: lang,
    completeness: 'draft',
    ...(key === 'language_overview' ? { genealogy: { family_id: null, branch_ids: [], related_language_tags: [], origin_region_ids: [], script_ids: [] } } : {}),
    facts,
    capabilities: Object.fromEntries(capabilities[key].map((name) => [name, true])),
    review_state: 'candidate',
    version: 1,
  };
  writeFileSync(path, `${JSON.stringify(realization, null, 2)}\n`);
  console.log(`wrote   ${path}`);
}
console.log('Next: fill the slots, then npm run validate and npm run curriculum:coverage. Repeating facts (examples, tricky sounds, contrast pairs) are added by hand; see curriculum-v2/INTRO_FACTS.md.');
