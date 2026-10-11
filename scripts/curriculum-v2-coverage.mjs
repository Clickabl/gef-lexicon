#!/usr/bin/env node
// Prints, for every language with Meet-a-language facts, how many slots each topic has filled and what is still empty.
// Usage: node scripts/curriculum-v2-coverage.mjs [--missing] [--json] [lang ...]
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRANCH_TOPIC_KEYS, fixedSlots, layerIdsOf, loadSlots } from './lib/curriculum-slots.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REALIZATIONS = join(ROOT, 'curriculum-v2', 'realizations');
const SLOTS = loadSlots(ROOT);
const args = process.argv.slice(2);
const showMissing = args.includes('--missing');
const asJson = args.includes('--json');
const wanted = args.filter((arg) => !arg.startsWith('--'));
const languages = (wanted.length > 0 ? wanted : readdirSync(REALIZATIONS)).filter((lang) => existsSync(join(REALIZATIONS, lang)));
const fileName = (key) => `${key.replaceAll('_', '-')}.json`;

const rows = [];
for (const lang of languages) {
  for (const key of BRANCH_TOPIC_KEYS) {
    const path = join(REALIZATIONS, lang, fileName(key));
    if (!existsSync(path)) { rows.push({ lang, key, status: 'absent', filled: 0, total: 0, missing: [] }); continue; }
    const realization = JSON.parse(readFileSync(path, 'utf8'));
    const facts = realization.facts ?? [];
    const slots = fixedSlots(key, SLOTS, layerIdsOf(realization));
    const filled = slots.filter((slot) => {
      const found = facts.find((candidate) => candidate.fact_id === slot.id);
      return found && found.value !== null && found.value !== undefined;
    });
    const missing = slots.filter((slot) => !filled.includes(slot)).map((slot) => slot.id);
    const repeating = [];
    const count = (prefix) => facts.filter((candidate) => candidate.fact_id.startsWith(prefix)).length;
    if (key === 'sound_system') {
      repeating.push(`tricky ${count('sounds.tricky.')}/3`, `contrast ${new Set(facts.filter((f) => f.fact_id.startsWith('sounds.contrast.')).map((f) => f.qualifiers?.pair)).size}/1`);
      if (facts.find((f) => f.fact_id === 'tones.system')?.value && facts.find((f) => f.fact_id === 'tones.system')?.value !== 'none') repeating.push(`tone examples ${count('tones.example.')}/4`);
    }
    if (key === 'writing_system') for (const layer of layerIdsOf(realization)) repeating.push(`${layer} examples ${count(`writing.${layer}.example.`)}`);
    rows.push({ lang, key, status: realization.completeness ?? 'draft', filled: filled.length, total: slots.length, missing, repeating });
  }
}

if (asJson) { console.log(JSON.stringify(rows, null, 2)); process.exit(0); }
const short = { language_overview: 'overview', writing_system: 'writing', sound_system: 'sound', grammar_glance: 'grammar' };
console.log(`${'lang'.padEnd(6)}${'status'.padEnd(10)}${BRANCH_TOPIC_KEYS.map((key) => short[key].padEnd(12)).join('')}`);
for (const lang of languages) {
  const own = rows.filter((row) => row.lang === lang);
  const status = own.find((row) => row.status !== 'absent')?.status ?? 'absent';
  console.log(`${lang.padEnd(6)}${status.padEnd(10)}${own.map((row) => (row.status === 'absent' ? '-' : `${row.filled}/${row.total}`).padEnd(12)).join('')}`);
  if (showMissing) for (const row of own) if (row.missing.length > 0) console.log(`      ${short[row.key]}: ${row.missing.join(', ')}`);
}
