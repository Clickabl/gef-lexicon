import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const familyRoot = path.join(root, 'lesson-families', 'family-members');
const contract = JSON.parse(fs.readFileSync(path.join(familyRoot, 'language-contract.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(familyRoot, 'game-core', 'manifest.json'), 'utf8'));

const expectedLanguages = new Set(contract.learn_from_language_tags ?? []);
const expectedConcepts = manifest.concept_keys ?? [];
const entries = [];
for (const shard of manifest.shards ?? []) {
  const doc = JSON.parse(fs.readFileSync(path.join(familyRoot, 'game-core', shard), 'utf8'));
  if (doc.lesson_id !== manifest.lesson_id) throw new Error(`${shard}: lesson_id does not match manifest`);
  for (const entry of doc.entries ?? []) entries.push({ ...entry, __shard: shard });
}

if (entries.length !== manifest.expected_total) {
  throw new Error(`Lexi family semantic core expected ${manifest.expected_total} languages; found ${entries.length}`);
}
if (entries.length !== expectedLanguages.size) {
  throw new Error(`Language contract has ${expectedLanguages.size} learn-from languages; semantic core has ${entries.length}`);
}

const seenLanguages = new Set();
let slots = 0;
let forms = 0;
for (const entry of entries) {
  const tag = entry.language_tag;
  if (!expectedLanguages.has(tag)) throw new Error(`${entry.__shard}: unexpected language ${tag}`);
  if (seenLanguages.has(tag)) throw new Error(`duplicate semantic-core language ${tag}`);
  seenLanguages.add(tag);

  const byConcept = new Map();
  for (const term of entry.terms ?? []) {
    if (byConcept.has(term.concept)) throw new Error(`${tag}: duplicate concept ${term.concept}`);
    byConcept.set(term.concept, term);
    slots += 1;
    if (!Array.isArray(term.forms) || term.forms.length === 0) throw new Error(`${tag}/${term.concept}: no forms`);
    const seenForms = new Set();
    for (const raw of term.forms) {
      if (typeof raw !== 'string' || raw.trim().length === 0) throw new Error(`${tag}/${term.concept}: blank form`);
      if (raw !== raw.normalize('NFC')) throw new Error(`${tag}/${term.concept}: non-NFC form ${JSON.stringify(raw)}`);
      if (seenForms.has(raw)) throw new Error(`${tag}/${term.concept}: duplicate form ${raw}`);
      seenForms.add(raw);
      forms += 1;
    }
  }

  for (const concept of expectedConcepts) {
    if (!byConcept.has(concept)) throw new Error(`${tag}: missing semantic concept ${concept}`);
  }
  for (const concept of byConcept.keys()) {
    if (!expectedConcepts.includes(concept)) throw new Error(`${tag}: unknown semantic concept ${concept}`);
  }
}

for (const tag of expectedLanguages) {
  if (!seenLanguages.has(tag)) throw new Error(`semantic core missing language ${tag}`);
}

const expectedSlots = expectedLanguages.size * expectedConcepts.length;
if (slots !== expectedSlots) throw new Error(`expected ${expectedSlots} language/concept slots; found ${slots}`);

// Guard the distinction that motivated the Lexi model: variants are candidates, not automatic synonyms.
const spanish = entries.find((entry) => entry.language_tag === 'es');
const spanishMother = spanish?.terms?.find((term) => term.concept === 'mother')?.forms ?? [];
if (!spanishMother.includes('madre') || !spanishMother.includes('mamá')) {
  throw new Error('Spanish mother slot must preserve both madre and mamá for register-aware Lexi resolution');
}

const english = entries.find((entry) => entry.language_tag === 'en');
const englishMother = english?.terms?.find((term) => term.concept === 'mother')?.forms ?? [];
if (!englishMother.includes('mother') || !englishMother.includes('mom')) {
  throw new Error('English mother slot must preserve both mother and mom for register-aware Lexi resolution');
}

console.log(`✓ Lexi semantic translator: ${entries.length} languages, ${expectedConcepts.length} concepts, ${slots} slots, ${forms} surface forms`);
