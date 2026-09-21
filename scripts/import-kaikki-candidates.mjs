#!/usr/bin/env node
/**
 * Streams a bounded Kaikki/Wiktextract JSONL(.gz) extract into candidate-only
 * Gef lexical data. The canonical source record is retained alongside the
 * smaller runtime-oriented projection so later review cannot silently lose
 * useful Wiktionary evidence.
 *
 * Safety rules:
 * - imported senses NEVER receive a concept link automatically;
 * - English Wiktionary glosses remain English, independent of headword language;
 * - translations and unresolved relation targets remain source assertions only;
 * - generated IDs and output ordering are deterministic;
 * - imported data and every derived projection remain candidate review state;
 * - raw dumps are staging inputs, not application/runtime assets.
 */
import { createHash } from 'node:crypto';
import { createReadStream, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createGunzip } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMPORTER_VERSION = 2;
const RELATION_FIELDS = Object.freeze([
  'synonyms', 'antonyms', 'hypernyms', 'hyponyms', 'coordinate_terms',
  'related', 'derived', 'holonyms', 'meronyms', 'troponyms', 'homophones',
  'anagrams', 'compounds', 'proverbs',
]);

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const input = args.get('--input');
const language = args.get('--language');
const outputArg = args.get('--output');
const relationsArg = args.get('--relations');
const sourceEdition = args.get('--source-edition') ?? 'enwiktionary';
const definitionLanguage = args.get('--definition-language') ?? 'en';
if (!input || !language || !outputArg || !relationsArg) {
  console.error('Required: --input FILE --language TAG --output FILE --relations FILE');
  process.exit(2);
}

function stableUuid(namespace) {
  const hex = createHash('sha256').update(namespace.normalize('NFC')).digest('hex').slice(0, 32).split('');
  hex[12] = '7';
  const variant = Number.parseInt(hex[16], 16);
  hex[16] = ((variant & 0x3) | 0x8).toString(16);
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return typeof value === 'string' ? value.normalize('NFC') : value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function normalizeWord(value) {
  return typeof value === 'string' ? value.normalize('NFC').trim() : '';
}

function normalizedStrings(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.normalize('NFC').trim());
}

function sourceIdentity(row) {
  return String(row.page_id ?? row.source ?? row.word ?? '').normalize('NFC');
}

function sourceRevision(row) {
  const candidate = row.revision_id ?? row.revision;
  return candidate === undefined || candidate === null ? undefined : String(candidate);
}

function sourceRecordKey(row) {
  return [
    sourceIdentity(row), row.lang_code ?? row.lang ?? '', normalizeWord(row.word),
    row.pos ?? 'unknown', row.etymology_number ?? '',
  ].map(String).join('\u0000').normalize('NFC');
}

function posToUpos(pos) {
  const normalized = String(pos ?? '').toLowerCase();
  return ({
    noun: 'NOUN', verb: 'VERB', adj: 'ADJ', adjective: 'ADJ', adv: 'ADV', adverb: 'ADV',
    pron: 'PRON', pronoun: 'PRON', proper_noun: 'PROPN', name: 'PROPN', det: 'DET',
    article: 'DET', prep: 'ADP', preposition: 'ADP', conj: 'CCONJ', conjunction: 'CCONJ',
    interj: 'INTJ', interjection: 'INTJ', numeral: 'NUM', num: 'NUM', particle: 'PART',
  })[normalized] ?? 'X';
}

function relationType(key) {
  return ({
    synonyms: 'near_synonym', antonyms: 'antonym', hypernyms: 'hypernym',
    hyponyms: 'hyponym', coordinate_terms: 'coordinate_term', meronyms: 'meronym',
    holonyms: 'holonym', troponyms: 'troponym', anagrams: 'anagram', compounds: 'compound',
    proverbs: 'proverb', related: 'related', derived: 'derived_from',
  })[key] ?? null;
}

function relationTargets(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === 'string') {
      const word = normalizeWord(item);
      return word ? [{ word, source_data: item.normalize('NFC') }] : [];
    }
    if (!item || typeof item !== 'object') return [];
    const word = normalizeWord(item.word);
    return word ? [{ word, source_data: stableValue(item) }] : [];
  });
}

function usableSenses(row) {
  return (Array.isArray(row.senses) ? row.senses : [])
    .map((sense, sourceIndex) => ({
      sense: stableValue(sense), sourceIndex, glosses: normalizedStrings(sense?.glosses),
    }))
    .filter((entry) => entry.glosses.length > 0);
}

function sourceReference(row) {
  return `wiktionary:${sourceEdition}:${sourceIdentity(row)}${sourceRevision(row) ? `@${sourceRevision(row)}` : ''}`;
}

function provenance(row, importId) {
  return {
    source: 'kaikki', source_edition: sourceEdition, source_record_id: sourceIdentity(row),
    ...(sourceRevision(row) ? { source_revision: sourceRevision(row) } : {}),
    import_id: importId, review_state: 'candidate',
  };
}

function importedExamples(sense, senseId, row, importId) {
  return (Array.isArray(sense.examples) ? sense.examples : []).map((example, index) => ({
    example_id: `ex_${stableUuid(`kaikki:example:${senseId}:${index}:${stableJson(example)}`).replaceAll('-', '')}`,
    language_code: language,
    review_state: 'candidate',
    provenance: [provenance(row, importId)],
    source_data: stableValue(example),
  }));
}

function soundEvidence(row, importId) {
  return (Array.isArray(row.sounds) ? row.sounds : []).map((sound, index) => ({
    pronunciation_evidence_id: `prn_${stableUuid(`kaikki:sound:${sourceRecordKey(row)}:${index}:${stableJson(sound)}`).replaceAll('-', '')}`,
    review_state: 'candidate',
    provenance: [provenance(row, importId)],
    source_data: stableValue(sound),
  }));
}

function canonicalPronunciations(row, importId) {
  return soundEvidence(row, importId).flatMap((evidence) => {
    const sound = evidence.source_data;
    if (!sound || typeof sound.ipa !== 'string' || !sound.ipa.trim()) return [];
    const audioRefs = ['audio', 'ogg_url', 'mp3_url', 'wav_url', 'flac_url']
      .flatMap((field) => typeof sound[field] === 'string' && sound[field].trim()
        ? [{ kind: field, value: sound[field].normalize('NFC').trim() }]
        : []);
    return [{
      pronunciation_id: evidence.pronunciation_evidence_id,
      ipa: sound.ipa.normalize('NFC').trim(),
      ...(audioRefs.length ? { audio_refs: audioRefs } : {}),
      tags: normalizedStrings(sound.tags),
      raw_tags: normalizedStrings(sound.raw_tags),
      review_state: 'candidate',
      provenance: evidence.provenance,
      source_data: sound,
    }];
  });
}

function importedForms(row, lexemeId, importId) {
  const word = normalizeWord(row.word);
  const sourceForms = [
    { form: word, tags: ['canonical'], source: 'headword' },
    ...(Array.isArray(row.forms) ? row.forms : []),
  ];
  const grouped = new Map();
  for (const sourceForm of sourceForms) {
    const surface = normalizeWord(typeof sourceForm === 'string' ? sourceForm : sourceForm?.form);
    if (!surface) continue;
    const evidence = stableValue(sourceForm);
    const key = stableJson(evidence);
    const existing = grouped.get(surface) ?? new Map();
    existing.set(key, evidence);
    grouped.set(surface, existing);
  }

  const pronunciations = canonicalPronunciations(row, importId);
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([surface, evidenceByKey]) => {
      const formId = stableUuid(`kaikki:form:${lexemeId}:${surface}`);
      const analyses = [...evidenceByKey.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([evidenceKey, evidence], index) => ({
          analysis_id: stableUuid(`kaikki:analysis:${formId}:${evidenceKey}`),
          features: { base: {} },
          tags: normalizedStrings(evidence?.tags),
          raw_tags: normalizedStrings(evidence?.raw_tags),
          review_state: 'candidate',
          provenance: [provenance(row, importId)],
          source_data: evidence,
          ...(surface === word && index === 0 && pronunciations.length ? { pronunciations } : {}),
        }));
      return {
        form_id: formId,
        surface_nfc: surface,
        normalized_lookup: surface.toLocaleLowerCase(language).normalize('NFC'),
        attested_in_text: false,
        review_state: 'candidate',
        provenance: [provenance(row, importId)],
        analyses,
      };
    });
}

const inputPath = resolve(input);
const inputHash = createHash('sha256');
const inputStream = createReadStream(inputPath);
inputStream.on('data', (chunk) => inputHash.update(chunk));
const decodedInput = inputPath.endsWith('.gz') ? inputStream.pipe(createGunzip()) : inputStream;
const source = createInterface({ input: decodedInput, crlfDelay: Infinity });
const rows = [];
let lineNumber = 0;
for await (const line of source) {
  lineNumber += 1;
  if (!line.trim()) continue;
  let row;
  try {
    row = JSON.parse(line);
  } catch (error) {
    throw new Error(`Invalid JSON at ${basename(inputPath)}:${lineNumber}: ${error.message}`);
  }
  if (String(row.lang_code ?? '') !== language) continue;
  if (!normalizeWord(row.word) || usableSenses(row).length === 0) continue;
  rows.push(stableValue(row));
}

const inputChecksum = inputHash.digest('hex');
const importId = `wiktionary-${sourceEdition}-${inputChecksum.slice(0, 16)}`;
rows.sort((left, right) => sourceRecordKey(left).localeCompare(sourceRecordKey(right)));

const lexemeIdsByWord = new Map();
for (const row of rows) {
  const word = normalizeWord(row.word);
  const pos = String(row.pos ?? 'unknown');
  const id = stableUuid(`kaikki:lexeme:${sourceRecordKey(row)}`);
  const existing = lexemeIdsByWord.get(word) ?? [];
  if (!existing.some((target) => target.id === id)) existing.push({ pos, id });
  existing.sort((left, right) => left.id.localeCompare(right.id));
  lexemeIdsByWord.set(word, existing);
}

const lexemes = [];
const relations = [];
const relationKeys = new Set();
for (const row of rows) {
  const word = normalizeWord(row.word);
  const pos = String(row.pos ?? 'unknown');
  const lexemeId = stableUuid(`kaikki:lexeme:${sourceRecordKey(row)}`);
  const importedSenses = [];

  for (const { sense, sourceIndex, glosses } of usableSenses(row)) {
    const senseId = stableUuid(`kaikki:sense:${sourceRecordKey(row)}:${sourceIndex}:${stableJson(glosses)}`);
    const unresolvedRelations = [];
    const resolvedRelationRefs = new Map();

    for (const key of RELATION_FIELDS) {
      const type = relationType(key);
      for (const target of relationTargets(sense[key])) {
        const targetLanguage = typeof target.source_data === 'object'
          ? target.source_data.lang_code ?? target.source_data.lang
          : undefined;
        const candidates = targetLanguage && targetLanguage !== language
          ? []
          : (lexemeIdsByWord.get(target.word) ?? []).filter((candidate) => (
            !target.source_data?.pos || candidate.pos === target.source_data.pos
          ));

        if (!type || candidates.length !== 1) {
          unresolvedRelations.push({
            source_relation_type: key,
            normalized_relation_type: type,
            target: target.source_data,
            reason: !type
              ? 'relation_type_not_projected'
              : targetLanguage && targetLanguage !== language
                ? 'target_language_outside_import'
                : candidates.length > 1
                  ? 'ambiguous_target_lexeme'
                  : 'target_lexeme_not_present',
            review_state: 'candidate',
          });
          continue;
        }

        const [resolvedTarget] = candidates;
        const refs = resolvedRelationRefs.get(key) ?? new Map();
        refs.set(resolvedTarget.id, {
          target_id: resolvedTarget.id,
          target_type: 'lexeme',
          note: `Candidate one-hop ${key} relation imported from ${sourceEdition}; target lexical details remain separately addressable.`,
        });
        resolvedRelationRefs.set(key, refs);
        const directed = ['hypernym', 'hyponym', 'meronym', 'holonym', 'troponym', 'compound', 'proverb', 'derived_from'].includes(type);
        const endpoints = directed
          ? [`sense:${senseId}`, `lexeme:${resolvedTarget.id}`]
          : [`sense:${senseId}`, `lexeme:${resolvedTarget.id}`].sort();
        const edgeKey = `${type}|${endpoints.join('|')}`;
        if (relationKeys.has(edgeKey)) continue;
        relationKeys.add(edgeKey);
        relations.push({
          relation_id: `rel_${stableUuid(`kaikki:relation:${edgeKey}`).replaceAll('-', '')}`,
          relation_type: type,
          from: { kind: 'sense', id: senseId },
          to: { kind: 'lexeme', id: resolvedTarget.id },
          directionality: directed ? 'directed' : 'symmetric',
          translation_authority: 'none',
          review_state: 'candidate',
          provenance: {
            source: 'kaikki',
            source_record_id: sourceIdentity(row),
            ...(sourceRevision(row) ? { source_revision: sourceRevision(row) } : {}),
            notes: `Imported from ${sourceEdition}; source relation type ${key}.`,
          },
        });
      }
    }

    importedSenses.push({
      sense_id: senseId,
      sense_key: `wiktionary-${word}-${pos}-${sourceIndex + 1}`.replace(/\s+/gu, '-').toLowerCase(),
      concept_links: [],
      definitions: { [definitionLanguage]: glosses[0] },
      glosses: { [definitionLanguage]: glosses },
      ...(glosses[1] ? { sense_hint: { [definitionLanguage]: glosses[1] } } : {}),
      register_label: 'imported-unreviewed',
      labels: {
        tags: normalizedStrings(sense.tags),
        raw_tags: normalizedStrings(sense.raw_tags),
        categories: normalizedStrings(sense.categories),
        topics: normalizedStrings(sense.topics),
      },
      translation_assertions: stableValue(Array.isArray(sense.translations) ? sense.translations : []),
      relation_assertions: Object.fromEntries(
        RELATION_FIELDS.filter((key) => Array.isArray(sense[key]) && sense[key].length)
          .map((key) => [key, stableValue(sense[key])]),
      ),
      ...Object.fromEntries(
        [...resolvedRelationRefs.entries()]
          .map(([key, refs]) => [key, [...refs.values()].sort((left, right) => left.target_id.localeCompare(right.target_id))]),
      ),
      unresolved_relations: unresolvedRelations,
      examples: importedExamples(sense, senseId, row, importId),
      review_state: 'candidate',
      source_refs: [sourceReference(row)],
      provenance: [provenance(row, importId)],
      source_assertions: [{
        assertion_type: 'wiktionary_sense_record',
        definition_language: definitionLanguage,
        review_state: 'candidate',
        provenance: provenance(row, importId),
        source_data: sense,
      }],
    });
  }

  const rowRelationAssertions = Object.fromEntries(
    RELATION_FIELDS.filter((key) => Array.isArray(row[key]) && row[key].length)
      .map((key) => [key, stableValue(row[key])]),
  );
  const rowTranslations = stableValue(Array.isArray(row.translations) ? row.translations : []);
  const etymology = {
    ...(typeof row.etymology_text === 'string' && row.etymology_text.trim()
      ? { text: row.etymology_text.normalize('NFC').trim() }
      : {}),
    ...(Array.isArray(row.etymology_templates) && row.etymology_templates.length
      ? { templates: stableValue(row.etymology_templates) }
      : {}),
    ...(row.etymology_number !== undefined ? { number: row.etymology_number } : {}),
    review_state: 'candidate',
    provenance: [provenance(row, importId)],
  };

  lexemes.push({
    lexeme_id: lexemeId,
    lemma_nfc: word,
    upos: posToUpos(pos),
    language_pos: pos,
    proper_noun: posToUpos(pos) === 'PROPN',
    review_state: 'candidate',
    senses: importedSenses,
    forms: importedForms(row, lexemeId, importId),
    pronunciation_evidence: soundEvidence(row, importId),
    etymology,
    translation_assertions: rowTranslations,
    relation_assertions: rowRelationAssertions,
    source_refs: [sourceReference(row)],
    provenance: [provenance(row, importId)],
    source_assertions: [{
      assertion_type: 'wiktionary_lexeme_record',
      definition_language: definitionLanguage,
      review_state: 'candidate',
      provenance: provenance(row, importId),
      source_record: row,
    }],
  });
}

lexemes.sort((left, right) => left.lexeme_id.localeCompare(right.lexeme_id));
relations.sort((left, right) => left.relation_id.localeCompare(right.relation_id));

const importMetadata = {
  source: 'Kaikki/Wiktionary',
  source_edition: sourceEdition,
  definition_language: definitionLanguage,
  source_file: basename(inputPath),
  source_byte_size: statSync(inputPath).size,
  source_checksum: { algorithm: 'sha256', value: inputChecksum },
  attribution: 'Wiktionary contributors; structured extraction distributed by Kaikki.org/Wiktextract.',
  applicable_licenses: ['CC BY-SA', 'GFDL'],
  importer: { path: 'scripts/import-kaikki-candidates.mjs', version: IMPORTER_VERSION },
  transformations: [
    'Unicode strings normalized to NFC.',
    'Source records retained verbatim except NFC normalization and deterministic object-key ordering.',
    'Glosses projected into definitions using the declared definition language.',
    'Forms and IPA-bearing sounds projected into canonical candidate form/analysis/pronunciation records.',
    'Only unambiguous same-import lexical relation targets projected to the relation graph.',
    'Translations and unresolved or unsupported relations retained as candidate source assertions with no translation authority.',
  ],
  candidate_only: true,
  exact_translation_authority: false,
  imported_entry_count: lexemes.length,
  imported_sense_count: lexemes.reduce((total, lexeme) => total + lexeme.senses.length, 0),
  review_state: 'candidate',
};

writeFileSync(resolve(ROOT, outputArg), `${JSON.stringify({
  schema_version: 1,
  language_code: language,
  import_metadata: importMetadata,
  lexemes,
}, null, 2)}\n`, 'utf8');
writeFileSync(resolve(ROOT, relationsArg), `${JSON.stringify({
  schema_version: 1,
  contract: 'gef-semantic-relation-graph-v1',
  relations,
}, null, 2)}\n`, 'utf8');
console.log(`✅ Imported ${lexemes.length} candidate lexemes and ${relations.length} non-translation relations for ${language}.`);
