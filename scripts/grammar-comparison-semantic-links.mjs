import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const normalize = (value) => value.normalize('NFC').trim().toLocaleLowerCase();

const FAMILIES = [
  {
    lessonId: 'LES.mul.noun.grammatical_number',
    directory: join(ROOT, 'lesson-families', 'grammatical-number-systems', 'comparison-records'),
    relationship: 'teaches_number_system',
    splitDisplayAlternatives: true,
  },
  {
    lessonId: 'LES.mul.prep.multiple_for',
    directory: join(ROOT, 'lesson-families', 'multiple-words-for-for', 'comparison-records'),
    relationship: 'teaches_semantic_territory',
    splitDisplayAlternatives: false,
  },
];

function tierFiles(directory) {
  return readdirSync(directory)
    .filter((name) => /^tier.*\.json$/u.test(name))
    .sort()
    .map((name) => join(directory, name));
}

function displaySurfaces(display, splitAlternatives) {
  if (typeof display !== 'string' || !display.trim()) return [];
  const whole = display.normalize('NFC').trim();
  if (!splitAlternatives) return [whole];
  const pieces = whole.split(/\s+\/\s+/u).map((value) => value.trim()).filter(Boolean);
  return pieces.length > 1 ? pieces : [whole];
}

export function grammarComparisonSemanticLinks() {
  const links = [];
  for (const family of FAMILIES) {
    for (const path of tierFiles(family.directory)) {
      const doc = readJson(path);
      for (const entry of doc.entries ?? []) {
        for (const form of entry.forms ?? []) {
          for (const surface of displaySurfaces(form.display, family.splitDisplayAlternatives)) {
            links.push({
              language_tag: entry.language_tag,
              surface_nfc: surface,
              normalized_lookup: normalize(surface),
              subject_kind: 'comparison_form',
              subject_id: form.form_id,
              lesson_id: family.lessonId,
              rule_id: null,
              relationship: family.relationship,
              review_state: entry.review_state ?? doc.review_state ?? 'candidate',
              source_path: path.slice(ROOT.length + 1),
            });
          }
        }
      }
    }
  }
  const deduped = new Map();
  for (const link of links) {
    const key = `${link.language_tag}\u0000${link.normalized_lookup}\u0000${link.lesson_id}\u0000${link.subject_id}`;
    if (!deduped.has(key)) deduped.set(key, link);
  }
  return [...deduped.values()];
}
