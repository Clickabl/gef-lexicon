#!/usr/bin/env node
/**
 * Coverage of the frequency lists by the built families. Offline. Writes research/name-pipeline/coverage.json and prints a summary.
 * A listed name "has a family" when some pipeline family holds a form with that language and spelling.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PIPELINE_DIR, REPO_ROOT, compareText, readJson, writeJson } from './common.mjs';
import { nfc } from './family.mjs';

const seeds = readJson(join(PIPELINE_DIR, 'seeds.json')).seeds;
const roots = new Set(readJson(join(PIPELINE_DIR, 'roots.json')).roots.map(root => root.title));
const handFamilies = new Map();
const formIndex = new Map();                 // "lang|text" -> family ids
const families = [];
for (const name of readdirSync(join(REPO_ROOT, 'name-families')).filter(file => file.endsWith('.json')).sort(compareText)) {
  const family = readJson(join(REPO_ROOT, 'name-families', name));
  const forms = family.equivalence_sets.flatMap(set => set.forms);
  families.push({ id: family.family_id, forms: forms.length, languages: new Set(forms.map(form => form.language_tag)) });
  for (const form of forms) {
    const key = `${form.language_tag}|${nfc(form.text)}`;
    formIndex.set(key, [...(formIndex.get(key) ?? []), family.family_id]);
  }
}
const report = { by_source: {}, totals: {}, forms_per_family: {}, language_thinness: [] };
let listed = 0, covered = 0;
for (const seed of seeds) {
  const entry = report.by_source[seed.source] ??= { listed: 0, with_family: 0, resolved_root: 0, unresolved: {} };
  entry.listed += 1; listed += 1;
  if (seed.status === 'resolved') entry.resolved_root += 1;
  const code = seed.language;
  const hit = seed.title && formIndex.has(`${code}|${nfc(seed.title)}`);
  if (hit) { entry.with_family += 1; covered += 1; }
  else {
    const why = seed.status === 'resolved' ? 'root_resolved_but_form_not_in_a_family' : (seed.reason ?? 'unknown').split(':')[0].split(';')[0];
    entry.unresolved[why] = (entry.unresolved[why] ?? 0) + 1;
  }
}
const pipelineFamilies = families.filter(family => family.forms > 0);
const counts = pipelineFamilies.map(family => family.forms).sort((a, b) => a - b);
report.totals = { listed, with_family: covered, share: Number((covered / listed).toFixed(3)), families: families.length };
report.forms_per_family = {
  mean: Number((counts.reduce((sum, value) => sum + value, 0) / counts.length).toFixed(1)), median: counts[Math.floor(counts.length / 2)],
  min: counts[0], max: counts.at(-1), families_with_5_or_fewer_forms: counts.filter(value => value <= 5).length,
};
const formsByLanguage = new Map();
for (const family of families) for (const language of family.languages) formsByLanguage.set(language, (formsByLanguage.get(language) ?? 0) + 1);
report.language_thinness = [...formsByLanguage].sort((a, b) => b[1] - a[1] || compareText(a[0], b[0])).map(([language, familiesWithForm]) => ({ language, families_with_a_form: familiesWithForm }));
writeJson(join(PIPELINE_DIR, 'coverage.json'), report);
console.log(JSON.stringify({ totals: report.totals, forms_per_family: report.forms_per_family }, null, 1));
for (const [source, entry] of Object.entries(report.by_source)) console.log(source, `${entry.with_family}/${entry.listed}`, JSON.stringify(entry.unresolved));
