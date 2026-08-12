#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const TOPICS = [
  {
    key: 'days_of_week',
    lessonId: 'LES.mul.time.days_of_week',
    conceptPrefix: 'CALENDAR.weekday',
    knowledgePath: join(ROOT, 'knowledge-sets', 'days-of-week.json'),
  },
  {
    key: 'months_of_year',
    lessonId: 'LES.mul.time.months_of_year',
    conceptPrefix: 'CALENDAR.month',
    knowledgePath: join(ROOT, 'knowledge-sets', 'months-of-year.json'),
  },
  {
    key: 'seasons',
    lessonId: 'LES.mul.time.seasons',
    conceptPrefix: 'CALENDAR.season',
    knowledgePath: join(ROOT, 'knowledge-sets', 'seasons.json'),
  },
];

const CLDR_OVERRIDES = {
  ba: {
    days_of_week: ['дүшәмбе', 'шишәмбе', 'шаршамбы', 'кесаҙна', 'йома', 'шәмбе', 'йәкшәмбе'],
    months_of_year: ['ғинуар', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
  },
  shn: {
    days_of_week: ['ဝၼ်းၸၼ်', 'ဝၼ်းဢင်းၵၢၼ်း', 'ဝၼ်းပုတ်ႉ', 'ဝၼ်းၽတ်း', 'ဝၼ်းသုၵ်း', 'ဝၼ်းသဝ်', 'ဝၼ်းဢႃးတိတ်ႉ'],
    months_of_year: ['ၸၼ်ႇဝႃႇရီႇ', 'ၾႅပ်ႇဝႃႇရီႇ', 'မၢတ်ႉၶ်ျ', 'ဢေႇပရႄႇ', 'မေႇ', 'ၸုၼ်ႇ', 'ၸူႇလၢႆႇ', 'ဢေႃးၵၢတ်ႉ', 'သႅပ်ႇထႅမ်ႇပႃႇ', 'ဢွၵ်ႇထူဝ်ႇပႃႇ', 'ၼူဝ်ႇဝႅမ်ႇပႃႇ', 'တီႇသႅမ်ႇပႃႇ'],
  },
  ht: {
    days_of_week: ['lendi', 'madi', 'mèkredi', 'jedi', 'vandredi', 'samdi', 'dimanch'],
    months_of_year: ['janvye', 'fevriye', 'mas', 'avril', 'me', 'jen', 'jiyè', 'out', 'septanm', 'oktòb', 'novanm', 'desanm'],
  },
};

const normalizeLookup = (value) => value.normalize('NFC').trim().toLocaleLowerCase();
const surfaceToken = (value) => encodeURIComponent(normalizeLookup(value));
const conceptToken = (value) => encodeURIComponent(value);

function cldrWeekdays(languageTag) {
  if (CLDR_OVERRIDES[languageTag]?.days_of_week) return CLDR_OVERRIDES[languageTag].days_of_week;
  const formatter = new Intl.DateTimeFormat(languageTag, { weekday: 'long', timeZone: 'UTC' });
  return Array.from({ length: 7 }, (_, offset) => formatter.format(new Date(Date.UTC(2024, 0, 1 + offset))));
}

function cldrMonths(languageTag) {
  if (CLDR_OVERRIDES[languageTag]?.months_of_year) return CLDR_OVERRIDES[languageTag].months_of_year;
  const formatter = new Intl.DateTimeFormat(languageTag, { month: 'long', timeZone: 'UTC' });
  return Array.from({ length: 12 }, (_, month) => formatter.format(new Date(Date.UTC(2024, month, 1))));
}

function dedupe(items, keyFn) {
  const map = new Map();
  for (const item of items) map.set(keyFn(item), item);
  return [...map.values()];
}

function fullLanguageRows(topic) {
  const knowledge = readJson(topic.knowledgePath);
  const rows = [];
  for (const record of knowledge.language_records ?? []) {
    for (const system of record.systems ?? []) {
      const keys = system.concept_keys ?? knowledge.canonical_concept_keys;
      if (keys.length !== system.terms?.length) continue;
      for (let index = 0; index < keys.length; index += 1) {
        const conceptKey = keys[index];
        const baseSurface = system.terms[index]?.normalize('NFC');
        if (!baseSurface) continue;
        rows.push({
          languageTag: record.language_tag,
          conceptKey,
          surface: baseSurface,
          formRole: system.system_id === record.primary_system_id ? 'primary_or_first_common' : 'alternate_system',
          representationKind: null,
          reviewState: record.review_state ?? knowledge.review_state ?? 'candidate',
          trustState: record.trust_state ?? knowledge.trust_state ?? 'machine_translated',
          sourcePath: topic.knowledgePath.slice(ROOT.length + 1),
        });
        for (const variant of system.variants?.[conceptKey] ?? []) {
          rows.push({
            languageTag: record.language_tag,
            conceptKey,
            surface: variant.normalize('NFC'),
            formRole: 'accepted_variant',
            representationKind: null,
            reviewState: record.review_state ?? knowledge.review_state ?? 'candidate',
            trustState: record.trust_state ?? knowledge.trust_state ?? 'machine_translated',
            sourcePath: topic.knowledgePath.slice(ROOT.length + 1),
          });
        }
        for (const variant of system.format_forms?.[conceptKey] ?? []) {
          rows.push({
            languageTag: record.language_tag,
            conceptKey,
            surface: variant.normalize('NFC'),
            formRole: 'contextual_form',
            representationKind: null,
            reviewState: record.review_state ?? knowledge.review_state ?? 'candidate',
            trustState: record.trust_state ?? knowledge.trust_state ?? 'machine_translated',
            sourcePath: topic.knowledgePath.slice(ROOT.length + 1),
          });
        }
        for (const [field, representationKind] of [['readings', 'reading'], ['transliterations', 'transliteration']]) {
          const representation = system[field]?.[index];
          if (!representation) continue;
          rows.push({
            languageTag: record.language_tag,
            conceptKey,
            surface: representation.normalize('NFC'),
            formRole: representationKind,
            representationKind,
            baseSurface,
            reviewState: record.review_state ?? knowledge.review_state ?? 'candidate',
            trustState: record.trust_state ?? knowledge.trust_state ?? 'machine_translated',
            sourcePath: topic.knowledgePath.slice(ROOT.length + 1),
          });
        }
      }
    }
  }
  return { knowledge, rows };
}

function tier3Rows(topic, tier3Tags, seasonsByLanguage) {
  const canonical = readJson(topic.knowledgePath).canonical_concept_keys;
  const rows = [];
  for (const languageTag of tier3Tags) {
    let terms;
    let sourcePath;
    if (topic.key === 'days_of_week') {
      terms = cldrWeekdays(languageTag);
      sourcePath = 'Unicode CLDR / Intl.DateTimeFormat';
    } else if (topic.key === 'months_of_year') {
      terms = cldrMonths(languageTag);
      sourcePath = 'Unicode CLDR / Intl.DateTimeFormat';
    } else {
      terms = seasonsByLanguage.get(languageTag)?.terms;
      sourcePath = 'lesson-families/calendar-year/tier3-seasons-vocabulary.json';
    }
    if (!Array.isArray(terms) || terms.length !== canonical.length) {
      throw new Error(`${topic.key}/${languageTag}: expected ${canonical.length} Tier 3 terms`);
    }
    for (let index = 0; index < canonical.length; index += 1) {
      rows.push({
        languageTag,
        conceptKey: canonical[index],
        surface: terms[index].normalize('NFC'),
        formRole: 'vocab_core',
        representationKind: null,
        reviewState: 'candidate',
        trustState: 'machine_translated',
        sourcePath,
      });
    }
  }
  return rows;
}

export function calendarVocabularyCore() {
  const contract = readJson(join(ROOT, 'contracts', 'gef-language-support.json'));
  const capability = readJson(join(ROOT, 'lesson-families', 'calendar-year', 'language-capabilities.json'));
  const seasons = readJson(join(ROOT, 'lesson-families', 'calendar-year', 'tier3-seasons-vocabulary.json'));
  const allLanguageTags = contract.learnFromLanguages;
  const fullTags = new Set(capability.learning_language_policy.expected_language_tags);
  const tier3Tags = allLanguageTags.filter((tag) => !fullTags.has(tag));
  const seasonsByLanguage = new Map(seasons.entries.map((entry) => [entry.language_tag, entry]));

  const concepts = [];
  const senses = [];
  const senseConcepts = [];
  const forms = [];
  const lessonLinks = [];

  for (const topic of TOPICS) {
    const { knowledge, rows: richRows } = fullLanguageRows(topic);
    const rows = [...richRows, ...tier3Rows(topic, tier3Tags, seasonsByLanguage)];
    const knownConceptKeys = new Set();
    for (const systemRecord of knowledge.language_records ?? []) {
      for (const system of systemRecord.systems ?? []) {
        for (const key of system.concept_keys ?? knowledge.canonical_concept_keys) knownConceptKeys.add(key);
      }
    }
    for (const key of knowledge.canonical_concept_keys) knownConceptKeys.add(key);
    for (const conceptKey of knownConceptKeys) {
      concepts.push({
        concept_id: `${topic.conceptPrefix}.${conceptKey}`,
        concept_key: conceptKey,
        domain: topic.key,
        review_state: 'candidate',
        lesson_links: [{ lesson_id: topic.lessonId, relationship: 'teaches_concept', review_state: 'candidate' }],
      });
    }

    const baseSenseByTuple = new Map();
    for (const row of rows) {
      const conceptId = `${topic.conceptPrefix}.${row.conceptKey}`;
      const normalized = normalizeLookup(row.surface);
      const tuple = `${row.languageTag}\u0000${conceptId}\u0000${normalizeLookup(row.baseSurface ?? row.surface)}`;
      let senseId = baseSenseByTuple.get(tuple);
      if (!senseId || !row.representationKind) {
        const senseSurface = row.baseSurface ?? row.surface;
        const lexemeId = `LEXI.calendar.${row.languageTag}.${surfaceToken(senseSurface)}`;
        senseId = `LEXI.calendar.${row.languageTag}.${surfaceToken(senseSurface)}.${conceptToken(row.conceptKey)}`;
        baseSenseByTuple.set(tuple, senseId);
        senses.push({
          sense_id: senseId,
          lexeme_id: lexemeId,
          language_tag: row.languageTag,
          surface_nfc: senseSurface,
          normalized_lookup: normalizeLookup(senseSurface),
          primary_concept_id: conceptId,
          register_label: null,
          review_state: row.reviewState,
          trust_state: row.trustState,
          source_path: row.sourcePath,
        });
        senseConcepts.push({ sense_id: senseId, concept_id: conceptId, relation: 'primary' });
      }
      const lexemeId = senses.find((sense) => sense.sense_id === senseId)?.lexeme_id
        ?? `LEXI.calendar.${row.languageTag}.${surfaceToken(row.baseSurface ?? row.surface)}`;
      forms.push({
        lexeme_id: lexemeId,
        sense_id: senseId,
        concept_id: conceptId,
        language_tag: row.languageTag,
        surface_nfc: row.surface,
        normalized_lookup: normalized,
        form_role: row.formRole,
        register_label: null,
        representation_kind: row.representationKind,
        review_state: row.reviewState,
        trust_state: row.trustState,
        source_path: row.sourcePath,
      });
      lessonLinks.push({
        language_tag: row.languageTag,
        surface_nfc: row.surface,
        normalized_lookup: normalized,
        subject_kind: 'sense',
        subject_id: senseId,
        lesson_id: topic.lessonId,
        rule_id: null,
        relationship: 'teaches_concept',
        review_state: row.reviewState,
        source_path: row.sourcePath,
      });
    }
  }

  return {
    concepts: dedupe(concepts, (row) => row.concept_id),
    senses: dedupe(senses, (row) => row.sense_id),
    senseConcepts: dedupe(senseConcepts, (row) => `${row.sense_id}\u0000${row.concept_id}\u0000${row.relation}`),
    forms: dedupe(forms, (row) => `${row.concept_id}\u0000${row.language_tag}\u0000${row.normalized_lookup}`),
    lessonLinks: dedupe(lessonLinks, (row) => `${row.language_tag}\u0000${row.normalized_lookup}\u0000${row.lesson_id}\u0000${row.subject_id}`),
    allLanguageTags,
    fullLanguageTags: [...fullTags],
    tier3LanguageTags: tier3Tags,
  };
}
