#!/usr/bin/env node
/**
 * Compile reusable lesson vocabulary into one shared semantic/translator index.
 *
 * Lesson families contribute semantic concepts and language-specific senses to
 * this one shared Lexi store. Exact book occurrences remain gef-content-owned
 * evidence and may pin a narrower sense than surface lookup alone.
 *
 * Output:
 *   dist/dictionaries/shared/lesson-semantic-v1.json
 *   dist/dictionaries/shared/lesson-semantic-v1.sqlite
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { calendarVocabularyCore } from './calendar-vocabulary-core.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'dist', 'dictionaries', 'shared');
const FAMILY_DIR = join(ROOT, 'lesson-families', 'family-members', 'game-vocabulary');
const FAMILY_LEXI_METADATA = join(ROOT, 'lesson-families', 'family-members', 'lexi-metadata.json');
const GENDER_DIR = join(ROOT, 'lesson-families', 'grammatical-gender');
const GENDER_COPY_DIR = join(GENDER_DIR, 'source-copy');
const GENDER_COMPARISON_DIR = join(GENDER_DIR, 'comparison-records');
const SPANISH_SUPPLEMENT = join(ROOT, 'languages', 'es', 'lexicon-lessons.json');

const FAMILY_LESSON_ID = 'LES.mul.vocab.family_members';
const GENDER_LESSON_ID = 'LES.mul.grammar.grammatical_gender';
const CALENDAR_LESSON_IDS = new Set([
  'LES.mul.time.days_of_week',
  'LES.mul.time.months_of_year',
  'LES.mul.time.seasons',
]);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function normalizedLookup(value) {
  return value.normalize('NFC').trim().toLocaleLowerCase();
}

function lessonJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => /^tier.*\.json$/u.test(name))
    .sort()
    .map((name) => join(dir, name));
}

function dedupeBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, item);
  }
  return [...map.values()];
}

function stableSurfaceToken(surface) {
  return encodeURIComponent(normalizedLookup(surface));
}

function familyLexemeId(languageTag, surface) {
  return `LEXI.family.${languageTag}.${stableSurfaceToken(surface)}`;
}

function familySenseId(languageTag, surface, conceptKey) {
  return `LEXI.family.${languageTag}.${stableSurfaceToken(surface)}.${conceptKey}`;
}

function familyData() {
  const manifest = readJson(join(FAMILY_DIR, 'manifest.json'));
  const metadata = readJson(FAMILY_LEXI_METADATA);
  const shards = lessonJsonFiles(FAMILY_DIR).map((path) => ({ path, doc: readJson(path) }));
  const coreOrder = manifest.concept_order ?? shards[0]?.doc?.concept_order ?? [];

  const concepts = [
    ...coreOrder.map((conceptKey) => ({
      concept_id: `FAMILY.${conceptKey}`,
      concept_key: conceptKey,
      domain: 'family_relationship',
      review_state: 'candidate',
      lesson_links: [{
        lesson_id: FAMILY_LESSON_ID,
        relationship: 'teaches_concept',
        review_state: 'candidate',
      }],
    })),
    ...(metadata.relationship_group_concepts ?? []).map((concept) => ({
      ...concept,
      review_state: metadata.review_state ?? 'candidate',
      lesson_links: [],
    })),
  ];

  const forms = [];
  const senses = [];
  const senseConcepts = [];
  const lessonLinks = [];
  const relatedByConcept = new Map();

  for (const { path, doc } of shards) {
    const order = doc.concept_order ?? coreOrder;
    for (const entry of doc.entries ?? []) {
      const terms = entry.terms ?? [];
      for (let index = 0; index < order.length; index += 1) {
        const conceptKey = order[index];
        const termCell = terms[index];
        if (!conceptKey || typeof termCell !== 'string' || !termCell.trim()) continue;

        const alternatives = termCell.split(/\s+\/\s+/u).map((value) => value.trim()).filter(Boolean);
        for (let variantIndex = 0; variantIndex < alternatives.length; variantIndex += 1) {
          const surface = alternatives[variantIndex].normalize('NFC');
          const normalized = normalizedLookup(surface);
          const lexemeId = familyLexemeId(entry.language_tag, surface);
          const senseId = familySenseId(entry.language_tag, surface, conceptKey);
          const primaryConceptId = `FAMILY.${conceptKey}`;
          const expressionMetadata = metadata.expression_metadata?.[entry.language_tag]?.[surface] ?? {};
          const reviewState = entry.review_state ?? doc.review_state ?? 'candidate';
          const trustState = entry.trust_state ?? doc.trust_state ?? 'machine_translated';
          const sourcePath = path.slice(ROOT.length + 1);

          senses.push({
            sense_id: senseId,
            lexeme_id: lexemeId,
            language_tag: entry.language_tag,
            surface_nfc: surface,
            normalized_lookup: normalized,
            primary_concept_id: primaryConceptId,
            register_label: expressionMetadata.register_label ?? null,
            review_state: reviewState,
            trust_state: trustState,
            source_path: sourcePath,
          });
          senseConcepts.push({ sense_id: senseId, concept_id: primaryConceptId, relation: 'primary' });
          for (const broaderConceptId of metadata.broader_concepts?.[conceptKey] ?? []) {
            senseConcepts.push({ sense_id: senseId, concept_id: broaderConceptId, relation: 'broader' });
          }

          forms.push({
            lexeme_id: lexemeId,
            sense_id: senseId,
            concept_id: primaryConceptId,
            language_tag: entry.language_tag,
            surface_nfc: surface,
            normalized_lookup: normalized,
            form_role: variantIndex === 0 ? 'primary_or_first_common' : 'accepted_variant',
            register_label: expressionMetadata.register_label ?? null,
            source_path: sourcePath,
            review_state: reviewState,
            trust_state: trustState,
          });

          lessonLinks.push({
            language_tag: entry.language_tag,
            surface_nfc: surface,
            normalized_lookup: normalized,
            subject_kind: 'sense',
            subject_id: senseId,
            lesson_id: metadata.lesson_offer?.lesson_id ?? FAMILY_LESSON_ID,
            rule_id: null,
            relationship: metadata.lesson_offer?.relationship ?? 'teaches_concept',
            review_state: metadata.lesson_offer?.review_state ?? reviewState,
            source_path: FAMILY_LEXI_METADATA.slice(ROOT.length + 1),
          });

          const relationKey = `${entry.language_tag}\u0000${primaryConceptId}`;
          const group = relatedByConcept.get(relationKey) ?? [];
          group.push({ sense_id: senseId, surface_nfc: surface });
          relatedByConcept.set(relationKey, group);
        }
      }
    }
  }

  const relations = [];
  for (const group of relatedByConcept.values()) {
    for (const source of group) {
      for (const target of group) {
        if (source.sense_id === target.sense_id) continue;
        relations.push({
          source_kind: 'sense',
          source_id: source.sense_id,
          relation_type: metadata.relation_policy?.same_primary_relationship ?? 'related_by_relationship',
          target_kind: 'sense',
          target_id: target.sense_id,
          note: metadata.relation_policy?.note ?? 'Shares the same broad family relationship concept.',
          review_state: metadata.review_state ?? 'candidate',
        });
      }
    }
  }

  return {
    manifest,
    metadata,
    concepts: dedupeBy(concepts, (concept) => concept.concept_id),
    senses: dedupeBy(senses, (sense) => sense.sense_id),
    senseConcepts: dedupeBy(senseConcepts, (row) => `${row.sense_id}\u0000${row.concept_id}\u0000${row.relation}`),
    forms: dedupeBy(forms, (form) => `${form.concept_id}\u0000${form.language_tag}\u0000${form.normalized_lookup}`),
    lessonLinks: dedupeBy(lessonLinks, (link) => `${link.language_tag}\u0000${link.normalized_lookup}\u0000${link.lesson_id}\u0000${link.subject_id}`),
    relations: dedupeBy(relations, (relation) => `${relation.source_kind}\u0000${relation.source_id}\u0000${relation.relation_type}\u0000${relation.target_kind}\u0000${relation.target_id}`),
  };
}

function genderSourceCopy() {
  const entries = [];
  for (const path of lessonJsonFiles(GENDER_COPY_DIR)) {
    const doc = readJson(path);
    for (const entry of doc.entries ?? []) {
      entries.push({
        lesson_id: GENDER_LESSON_ID,
        language_tag: entry.language_tag,
        title: entry.title,
        body: entry.body,
        culture_note: entry.culture_note,
        practice: entry.practice,
        quest: entry.quest,
        completion: entry.completion,
        review_state: entry.review_state ?? doc.review_state ?? 'candidate',
        trust_state: entry.trust_state ?? doc.trust_state ?? 'machine_translated',
        source_path: path.slice(ROOT.length + 1),
      });
    }
  }
  return dedupeBy(entries, (entry) => entry.language_tag);
}

function genderSurfaceLessonLinks() {
  const links = [];
  for (const path of lessonJsonFiles(GENDER_COMPARISON_DIR)) {
    const doc = readJson(path);
    for (const entry of doc.entries ?? []) {
      for (const form of entry.forms ?? []) {
        const surface = form.display;
        if (typeof surface !== 'string' || !surface.trim()) continue;
        links.push({
          language_tag: entry.language_tag,
          surface_nfc: surface.normalize('NFC'),
          normalized_lookup: normalizedLookup(surface),
          subject_kind: 'comparison_form',
          subject_id: form.form_id,
          lesson_id: GENDER_LESSON_ID,
          rule_id: null,
          relationship: 'teaches_gender_system',
          review_state: entry.review_state ?? doc.review_state ?? 'candidate',
          source_path: path.slice(ROOT.length + 1),
        });
      }
    }
  }

  if (existsSync(SPANISH_SUPPLEMENT)) {
    const doc = readJson(SPANISH_SUPPLEMENT);
    for (const lexeme of doc.lexemes ?? []) {
      for (const sense of lexeme.senses ?? []) {
        for (const lesson of sense.lesson_links ?? []) {
          for (const form of lexeme.forms ?? []) {
            links.push({
              language_tag: doc.language_code,
              surface_nfc: form.surface_nfc,
              normalized_lookup: form.normalized_lookup ?? normalizedLookup(form.surface_nfc),
              subject_kind: 'sense',
              subject_id: sense.sense_id,
              lesson_id: lesson.lesson_id,
              rule_id: lesson.rule_id ?? null,
              relationship: lesson.relationship ?? 'related_lesson',
              review_state: lesson.review_state ?? lexeme.review_state ?? 'candidate',
              source_path: SPANISH_SUPPLEMENT.slice(ROOT.length + 1),
            });
          }
        }
      }
    }
  }

  return dedupeBy(links, (link) => `${link.language_tag}\u0000${link.normalized_lookup}\u0000${link.lesson_id}\u0000${link.rule_id ?? ''}\u0000${link.subject_id}`);
}

function spanishLexicalRelations() {
  if (!existsSync(SPANISH_SUPPLEMENT)) return [];
  const doc = readJson(SPANISH_SUPPLEMENT);
  const rows = [];
  for (const lexeme of doc.lexemes ?? []) {
    for (const relation of lexeme.relations ?? []) {
      rows.push({
        source_kind: 'lexeme',
        source_id: lexeme.lexeme_id,
        relation_type: relation.relation_type,
        target_kind: relation.target_kind,
        target_id: relation.target_id,
        note: relation.note ?? null,
        review_state: relation.review_state ?? lexeme.review_state ?? 'candidate',
      });
    }
  }
  return rows;
}

function compileJson() {
  const family = familyData();
  const calendar = calendarVocabularyCore();
  const genderCopy = genderSourceCopy();

  const concepts = dedupeBy([...family.concepts, ...calendar.concepts], (row) => row.concept_id);
  const lexicalSenses = dedupeBy([...family.senses, ...calendar.senses], (row) => row.sense_id);
  const senseConcepts = dedupeBy(
    [...family.senseConcepts, ...calendar.senseConcepts],
    (row) => `${row.sense_id}\u0000${row.concept_id}\u0000${row.relation}`,
  );
  const conceptForms = dedupeBy(
    [...family.forms, ...calendar.forms],
    (row) => `${row.concept_id}\u0000${row.language_tag}\u0000${row.normalized_lookup}`,
  );
  const surfaceLessonLinks = dedupeBy(
    [...family.lessonLinks, ...calendar.lessonLinks, ...genderSurfaceLessonLinks()],
    (link) => `${link.language_tag}\u0000${link.normalized_lookup}\u0000${link.lesson_id}\u0000${link.rule_id ?? ''}\u0000${link.subject_id}`,
  );
  const lexicalRelations = dedupeBy(
    [...family.relations, ...spanishLexicalRelations()],
    (relation) => `${relation.source_kind}\u0000${relation.source_id}\u0000${relation.relation_type}\u0000${relation.target_kind}\u0000${relation.target_id}`,
  );

  const document = {
    schema_version: 3,
    generated_from: {
      family_members_game_vocabulary: 'lesson-families/family-members/game-vocabulary',
      family_members_lexi_metadata: 'lesson-families/family-members/lexi-metadata.json',
      calendar_year_knowledge_sets: [
        'knowledge-sets/days-of-week.json',
        'knowledge-sets/months-of-year.json',
        'knowledge-sets/seasons.json',
      ],
      calendar_year_tier3_seasons: 'lesson-families/calendar-year/tier3-seasons-vocabulary.json',
      calendar_year_tier3_days_months: 'Unicode CLDR via Intl.DateTimeFormat plus checked locale overrides',
      grammatical_gender_source_copy: 'lesson-families/grammatical-gender/source-copy',
      grammatical_gender_comparison_records: 'lesson-families/grammatical-gender/comparison-records',
      spanish_lesson_lexicon: 'languages/es/lexicon-lessons.json',
    },
    concepts,
    lexical_senses: lexicalSenses,
    sense_concepts: senseConcepts,
    concept_forms: conceptForms,
    lesson_source_copy: genderCopy,
    surface_lesson_links: surfaceLessonLinks,
    lexical_relations: lexicalRelations,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, 'lesson-semantic-v1.json');
  writeFileSync(path, `${JSON.stringify(document, null, 2)}\n`);
  return { path, document };
}

function compileSqlite(document) {
  const dbPath = join(OUT_DIR, 'lesson-semantic-v1.sqlite');
  rmSync(dbPath, { force: true });
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE concepts (
      concept_id TEXT PRIMARY KEY,
      concept_key TEXT NOT NULL,
      domain TEXT NOT NULL,
      review_state TEXT NOT NULL
    );
    CREATE TABLE lexical_senses (
      sense_id TEXT PRIMARY KEY,
      lexeme_id TEXT NOT NULL,
      language_tag TEXT NOT NULL,
      surface_nfc TEXT NOT NULL,
      normalized_lookup TEXT NOT NULL,
      primary_concept_id TEXT NOT NULL,
      register_label TEXT,
      review_state TEXT NOT NULL,
      trust_state TEXT NOT NULL,
      source_path TEXT NOT NULL,
      FOREIGN KEY(primary_concept_id) REFERENCES concepts(concept_id)
    );
    CREATE TABLE sense_concepts (
      sense_id TEXT NOT NULL,
      concept_id TEXT NOT NULL,
      relation TEXT NOT NULL,
      PRIMARY KEY(sense_id, concept_id, relation),
      FOREIGN KEY(sense_id) REFERENCES lexical_senses(sense_id),
      FOREIGN KEY(concept_id) REFERENCES concepts(concept_id)
    );
    CREATE TABLE concept_forms (
      lexeme_id TEXT NOT NULL,
      sense_id TEXT NOT NULL,
      concept_id TEXT NOT NULL,
      language_tag TEXT NOT NULL,
      surface_nfc TEXT NOT NULL,
      normalized_lookup TEXT NOT NULL,
      form_role TEXT NOT NULL,
      register_label TEXT,
      review_state TEXT NOT NULL,
      trust_state TEXT NOT NULL,
      source_path TEXT NOT NULL,
      PRIMARY KEY(concept_id, language_tag, normalized_lookup),
      FOREIGN KEY(sense_id) REFERENCES lexical_senses(sense_id),
      FOREIGN KEY(concept_id) REFERENCES concepts(concept_id)
    );
    CREATE TABLE lesson_source_copy (
      lesson_id TEXT NOT NULL,
      language_tag TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      culture_note TEXT,
      practice TEXT,
      quest TEXT,
      completion TEXT,
      review_state TEXT NOT NULL,
      trust_state TEXT NOT NULL,
      source_path TEXT NOT NULL,
      PRIMARY KEY(lesson_id, language_tag)
    );
    CREATE TABLE surface_lesson_links (
      language_tag TEXT NOT NULL,
      surface_nfc TEXT NOT NULL,
      normalized_lookup TEXT NOT NULL,
      subject_kind TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      rule_id TEXT,
      relationship TEXT NOT NULL,
      review_state TEXT NOT NULL,
      source_path TEXT NOT NULL,
      PRIMARY KEY(language_tag, normalized_lookup, lesson_id, subject_kind, subject_id)
    );
    CREATE TABLE lexical_relations (
      source_kind TEXT NOT NULL,
      source_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      target_kind TEXT NOT NULL,
      target_id TEXT NOT NULL,
      note TEXT,
      review_state TEXT NOT NULL,
      PRIMARY KEY(source_kind, source_id, relation_type, target_kind, target_id)
    );
    CREATE INDEX idx_lexical_senses_lookup ON lexical_senses(language_tag, normalized_lookup);
    CREATE INDEX idx_lexical_senses_concept ON lexical_senses(primary_concept_id, language_tag);
    CREATE INDEX idx_sense_concepts_concept ON sense_concepts(concept_id, relation);
    CREATE INDEX idx_concept_forms_lookup ON concept_forms(language_tag, normalized_lookup);
    CREATE INDEX idx_concept_forms_concept ON concept_forms(concept_id, language_tag);
    CREATE INDEX idx_surface_lesson_lookup ON surface_lesson_links(language_tag, normalized_lookup);
    CREATE INDEX idx_lesson_copy_language ON lesson_source_copy(language_tag, lesson_id);
  `);

  const insertConcept = db.prepare('INSERT INTO concepts VALUES (?, ?, ?, ?)');
  const insertSense = db.prepare('INSERT INTO lexical_senses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertSenseConcept = db.prepare('INSERT INTO sense_concepts VALUES (?, ?, ?)');
  const insertForm = db.prepare('INSERT INTO concept_forms VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertCopy = db.prepare('INSERT INTO lesson_source_copy VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertLesson = db.prepare('INSERT INTO surface_lesson_links VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertRelation = db.prepare('INSERT INTO lexical_relations VALUES (?, ?, ?, ?, ?, ?, ?)');

  db.transaction(() => {
    for (const concept of document.concepts) {
      insertConcept.run(concept.concept_id, concept.concept_key, concept.domain, concept.review_state);
    }
    for (const sense of document.lexical_senses) {
      insertSense.run(
        sense.sense_id, sense.lexeme_id, sense.language_tag, sense.surface_nfc,
        sense.normalized_lookup, sense.primary_concept_id, sense.register_label,
        sense.review_state, sense.trust_state, sense.source_path,
      );
    }
    for (const link of document.sense_concepts) {
      insertSenseConcept.run(link.sense_id, link.concept_id, link.relation);
    }
    for (const form of document.concept_forms) {
      insertForm.run(
        form.lexeme_id, form.sense_id, form.concept_id, form.language_tag,
        form.surface_nfc, form.normalized_lookup, form.form_role, form.register_label,
        form.review_state, form.trust_state, form.source_path,
      );
    }
    for (const copy of document.lesson_source_copy) {
      insertCopy.run(
        copy.lesson_id, copy.language_tag, copy.title, copy.body, copy.culture_note ?? null,
        copy.practice ?? null, copy.quest ?? null, copy.completion ?? null,
        copy.review_state, copy.trust_state, copy.source_path,
      );
    }
    for (const link of document.surface_lesson_links) {
      insertLesson.run(
        link.language_tag, link.surface_nfc, link.normalized_lookup, link.subject_kind,
        link.subject_id, link.lesson_id, link.rule_id, link.relationship,
        link.review_state, link.source_path,
      );
    }
    for (const relation of document.lexical_relations) {
      insertRelation.run(
        relation.source_kind, relation.source_id, relation.relation_type,
        relation.target_kind, relation.target_id, relation.note, relation.review_state,
      );
    }
  })();

  const fk = db.prepare('PRAGMA foreign_key_check').all();
  if (fk.length > 0) throw new Error(`semantic index foreign-key errors: ${JSON.stringify(fk)}`);
  db.exec('ANALYZE; VACUUM;');
  db.close();
  return dbPath;
}

const { path, document } = compileJson();
const dbPath = compileSqlite(document);
const familyForms = document.concept_forms.filter((form) => form.concept_id.startsWith('FAMILY.'));
const calendarForms = document.concept_forms.filter((form) => form.concept_id.startsWith('CALENDAR.'));
const familyLanguages = new Set(familyForms.map((form) => form.language_tag));
const calendarLanguages = new Set(calendarForms.map((form) => form.language_tag));
const genderSourceLanguages = new Set(document.lesson_source_copy.map((copy) => copy.language_tag));
const familyLessonLinks = document.surface_lesson_links.filter((link) => link.lesson_id === FAMILY_LESSON_ID);
const calendarLessonLinks = document.surface_lesson_links.filter((link) => CALENDAR_LESSON_IDS.has(link.lesson_id));
console.log(`📚 Shared lesson semantic index: ${document.concepts.length} concepts, ${document.lexical_senses.length} senses, ${document.concept_forms.length} forms.`);
console.log(`👪 Family: ${familyLanguages.size} languages, ${familyForms.length} forms, ${familyLessonLinks.length} lesson links.`);
console.log(`📅 Calendar/year: ${calendarLanguages.size} languages, ${calendarForms.length} forms, ${calendarLessonLinks.length} lesson links.`);
console.log(`🧭 Gender source copy: ${genderSourceLanguages.size} languages; total surface lesson links: ${document.surface_lesson_links.length}.`);
console.log(`📦 ${path.slice(ROOT.length + 1)}`);
console.log(`📦 ${dbPath.slice(ROOT.length + 1)}`);
