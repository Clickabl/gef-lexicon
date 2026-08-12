import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const root = process.cwd();
const familyRoot = path.join(root, 'lesson-families', 'family-members');
const manifest = JSON.parse(fs.readFileSync(path.join(familyRoot, 'game-core', 'manifest.json'), 'utf8'));
const contract = JSON.parse(fs.readFileSync(path.join(familyRoot, 'language-contract.json'), 'utf8'));

const semanticEntries = [];
for (const shard of manifest.shards) {
  const doc = JSON.parse(fs.readFileSync(path.join(familyRoot, 'game-core', shard), 'utf8'));
  semanticEntries.push(...doc.entries);
}

const curated = new Map();
for (const shard of ['tier1.json', 'tier2.json']) {
  const file = path.join(familyRoot, 'target-profiles', shard);
  if (!fs.existsSync(file)) continue;
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const entry of doc.entries ?? []) {
    for (const term of entry.core_terms ?? []) {
      const key = `${entry.language_tag}\u0000${term.concept}`;
      const labels = new Map();
      if (term.display) labels.set(term.display.normalize('NFC'), 'default');
      if (term.casual) labels.set(term.casual.normalize('NFC'), 'casual');
      for (const alt of term.alternatives ?? []) labels.set(String(alt).normalize('NFC'), 'alternative');
      curated.set(key, labels);
    }
  }
}

const outputDir = path.join(root, 'dist', 'lexi');
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, 'semantic-v1.sqlite');
if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

const db = new Database(outputPath);
db.pragma('journal_mode = DELETE');
db.exec(`
  CREATE TABLE metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE semantic_concepts (
    concept_key TEXT PRIMARY KEY,
    concept_label_en TEXT NOT NULL,
    source_lesson_id TEXT NOT NULL,
    lesson_recommendation_id TEXT NOT NULL
  );
  CREATE TABLE semantic_terms (
    term_id TEXT PRIMARY KEY,
    language_code TEXT NOT NULL,
    concept_key TEXT NOT NULL,
    surface_nfc TEXT NOT NULL,
    normalized_lookup TEXT NOT NULL,
    variant_kind TEXT NOT NULL,
    review_state TEXT NOT NULL,
    trust_state TEXT NOT NULL,
    source_lesson_id TEXT NOT NULL,
    source_rank INTEGER NOT NULL,
    FOREIGN KEY (concept_key) REFERENCES semantic_concepts(concept_key)
  );
  CREATE INDEX idx_semantic_terms_lookup ON semantic_terms(language_code, normalized_lookup);
  CREATE INDEX idx_semantic_terms_concept_language ON semantic_terms(concept_key, language_code);
  CREATE TABLE semantic_relations (
    source_term_id TEXT NOT NULL,
    relation_kind TEXT NOT NULL,
    target_term_id TEXT NOT NULL,
    note TEXT,
    PRIMARY KEY (source_term_id, relation_kind, target_term_id),
    FOREIGN KEY (source_term_id) REFERENCES semantic_terms(term_id),
    FOREIGN KEY (target_term_id) REFERENCES semantic_terms(term_id)
  );
  CREATE TABLE lesson_recommendations (
    concept_key TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    priority INTEGER NOT NULL,
    PRIMARY KEY (concept_key, lesson_id),
    FOREIGN KEY (concept_key) REFERENCES semantic_concepts(concept_key)
  );
`);

db.prepare('INSERT INTO metadata(key, value) VALUES (?, ?)').run('schema_version', '1');
db.prepare('INSERT INTO metadata(key, value) VALUES (?, ?)').run('coverage_languages', String(contract.learn_from_language_tags.length));
db.prepare('INSERT INTO metadata(key, value) VALUES (?, ?)').run('source_lesson_id', manifest.lesson_id);

const insertConcept = db.prepare(`
  INSERT INTO semantic_concepts(concept_key, concept_label_en, source_lesson_id, lesson_recommendation_id)
  VALUES (@concept_key, @concept_label_en, @source_lesson_id, @lesson_recommendation_id)
`);
const insertRecommendation = db.prepare(`
  INSERT INTO lesson_recommendations(concept_key, lesson_id, reason, priority)
  VALUES (?, ?, 'learn_concept', 90)
`);
for (const concept of manifest.concept_keys) {
  insertConcept.run({
    concept_key: concept,
    concept_label_en: manifest.concept_contract?.[concept] ?? concept,
    source_lesson_id: manifest.lesson_id,
    lesson_recommendation_id: manifest.lesson_id,
  });
  insertRecommendation.run(concept, manifest.lesson_id);
}

const insertTerm = db.prepare(`
  INSERT INTO semantic_terms(
    term_id, language_code, concept_key, surface_nfc, normalized_lookup,
    variant_kind, review_state, trust_state, source_lesson_id, source_rank
  ) VALUES (
    @term_id, @language_code, @concept_key, @surface_nfc, @normalized_lookup,
    @variant_kind, @review_state, @trust_state, @source_lesson_id, @source_rank
  )
`);
const insertRelation = db.prepare(`
  INSERT OR IGNORE INTO semantic_relations(source_term_id, relation_kind, target_term_id, note)
  VALUES (?, ?, ?, ?)
`);

function stableId(language, concept, surface) {
  return `sem_${crypto.createHash('sha256').update(`${language}\u0000${concept}\u0000${surface}`).digest('hex').slice(0, 24)}`;
}
function normalizeLookup(surface) {
  // Accent/diacritic preserving on purpose: Spanish el and él must not become one identity.
  return surface.normalize('NFC').toLowerCase();
}

const termIdsBySlot = new Map();
const build = db.transaction(() => {
  for (const entry of semanticEntries) {
    for (const term of entry.terms) {
      const labels = curated.get(`${entry.language_tag}\u0000${term.concept}`) ?? new Map();
      const slotIds = [];
      term.forms.forEach((rawSurface, index) => {
        const surface = rawSurface.normalize('NFC');
        let variantKind = labels.get(surface);
        if (!variantKind) variantKind = term.forms.length === 1 ? 'default' : 'unresolved_variant';
        const termId = stableId(entry.language_tag, term.concept, surface);
        insertTerm.run({
          term_id: termId,
          language_code: entry.language_tag,
          concept_key: term.concept,
          surface_nfc: surface,
          normalized_lookup: normalizeLookup(surface),
          variant_kind: variantKind,
          review_state: entry.review_state ?? 'generated',
          trust_state: entry.trust_state ?? manifest.trust_state ?? 'machine_translated',
          source_lesson_id: manifest.lesson_id,
          source_rank: index,
        });
        slotIds.push(termId);
      });
      termIdsBySlot.set(`${entry.language_tag}\u0000${term.concept}`, slotIds);
    }
  }

  // Same-concept forms are related, but we deliberately do not call unknown variants synonyms.
  for (const [slot, ids] of termIdsBySlot) {
    const [language, concept] = slot.split('\u0000');
    const labels = curated.get(slot) ?? new Map();
    for (const source of ids) {
      const sourceRow = db.prepare('SELECT surface_nfc, variant_kind FROM semantic_terms WHERE term_id = ?').get(source);
      for (const target of ids) {
        if (source === target) continue;
        const targetRow = db.prepare('SELECT surface_nfc, variant_kind FROM semantic_terms WHERE term_id = ?').get(target);
        const knownRegisterPair = ['default', 'casual'].includes(sourceRow.variant_kind) && ['default', 'casual'].includes(targetRow.variant_kind);
        const relation = knownRegisterPair ? 'register_variant' : 'same_concept_variant';
        const note = knownRegisterPair
          ? `Curated register relationship within ${language}/${concept}.`
          : `Same semantic slot; exact distinction is not asserted until reviewed.`;
        insertRelation.run(source, relation, target, note);
      }
    }
  }
});
build();

const languageCount = db.prepare('SELECT COUNT(DISTINCT language_code) AS n FROM semantic_terms').get().n;
const slotCount = db.prepare('SELECT COUNT(DISTINCT language_code || char(0) || concept_key) AS n FROM semantic_terms').get().n;
const termCount = db.prepare('SELECT COUNT(*) AS n FROM semantic_terms').get().n;
const expectedSlots = contract.learn_from_language_tags.length * manifest.concept_keys.length;
if (languageCount !== manifest.expected_total) throw new Error(`compiled ${languageCount} languages, expected ${manifest.expected_total}`);
if (slotCount !== expectedSlots) throw new Error(`compiled ${slotCount} slots, expected ${expectedSlots}`);

const madre = db.prepare(`SELECT concept_key, variant_kind FROM semantic_terms WHERE language_code='es' AND normalized_lookup='madre'`).get();
const mama = db.prepare(`SELECT concept_key, variant_kind FROM semantic_terms WHERE language_code='es' AND normalized_lookup='mamá'`).get();
if (madre?.concept_key !== 'mother' || mama?.concept_key !== 'mother') throw new Error('Spanish madre/mamá semantic resolution smoke test failed');
if (madre.variant_kind !== 'default' || mama.variant_kind !== 'casual') throw new Error('Spanish madre/mamá register metadata smoke test failed');

db.close();
console.log(`✓ Compiled Lexi semantic translator: ${languageCount} languages, ${slotCount} slots, ${termCount} surface terms -> ${path.relative(root, outputPath)}`);
