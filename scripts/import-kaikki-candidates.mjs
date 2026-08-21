#!/usr/bin/env node
/**
 * Streams a Kaikki/Wiktionary JSONL export into candidate-only Gef lexical data.
 *
 * Safety rules:
 * - imported senses NEVER receive a primary exact concept automatically;
 * - synonym/antonym/etc. imports become non-translation semantic relations;
 * - every generated ID is deterministic from source identity so re-imports are stable;
 * - provenance retains source page/revision identifiers;
 * - raw dumps are staging inputs, not application/runtime assets.
 *
 * Usage:
 *   node scripts/import-kaikki-candidates.mjs --input /path/es-extract.jsonl \
 *     --language es --output languages/es/lexicon-wiktionary.json \
 *     --relations relations/wiktionary-es.json
 */
import { createHash } from 'node:crypto';
import { createReadStream, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const input = args.get('--input');
const language = args.get('--language');
const outputArg = args.get('--output');
const relationsArg = args.get('--relations');
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
function normalizeWord(value) { return typeof value === 'string' ? value.normalize('NFC').trim() : ''; }
function sourceIdentity(row) { return String(row.page_id ?? row.source ?? row.word ?? '').normalize('NFC'); }
function sourceRevision(row) {
  const candidate = row.revision_id ?? row.revision;
  return candidate === undefined || candidate === null ? undefined : String(candidate);
}
function posToUpos(pos) {
  const normalized = String(pos ?? '').toLowerCase();
  return ({ noun:'NOUN', verb:'VERB', adj:'ADJ', adjective:'ADJ', adv:'ADV', adverb:'ADV', pron:'PRON', pronoun:'PRON', proper_noun:'PROPN', name:'PROPN', det:'DET', article:'DET', prep:'ADP', preposition:'ADP', conj:'CCONJ', conjunction:'CCONJ', interj:'INTJ', interjection:'INTJ', numeral:'NUM', num:'NUM', particle:'PART' })[normalized] ?? 'X';
}
function relationType(key) {
  return ({ synonyms:'near_synonym', antonyms:'antonym', hypernyms:'hypernym', hyponyms:'hyponym', coordinate_terms:'coordinate_term', related:'related', derived:'derived_from' })[key] ?? null;
}
function relationWords(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => typeof item === 'string' ? item : item?.word).filter((word) => typeof word === 'string' && word.trim()).map(normalizeWord);
}
function usableSenses(row) {
  return (Array.isArray(row.senses) ? row.senses : []).map((sense, sourceIndex) => {
    const glosses = Array.isArray(sense.glosses)
      ? sense.glosses.filter((g) => typeof g === 'string' && g.trim()).map((g) => g.normalize('NFC').trim())
      : [];
    return { sense, sourceIndex, glosses };
  }).filter((entry) => entry.glosses.length > 0);
}

const rows = [];
const source = createInterface({ input: createReadStream(resolve(input), { encoding: 'utf8' }), crlfDelay: Infinity });
for await (const line of source) {
  if (!line.trim()) continue;
  let row;
  try { row = JSON.parse(line); } catch { continue; }
  const langCode = String(row.lang_code ?? row.lang ?? '');
  if (langCode !== language) continue;
  if (!normalizeWord(row.word) || usableSenses(row).length === 0) continue;
  rows.push(row);
}

const lexemeIdsByWord = new Map();
for (const row of rows) {
  const word = normalizeWord(row.word);
  const pos = String(row.pos ?? 'unknown');
  const id = stableUuid(`kaikki:lexeme:${language}:${word}:${pos}`);
  const existing = lexemeIdsByWord.get(word) ?? [];
  if (!existing.some((target) => target.id === id)) existing.push({ pos, id });
  lexemeIdsByWord.set(word, existing);
}

const lexemes = [];
const relations = [];
const relationKeys = new Set();
for (const row of rows) {
  const word = normalizeWord(row.word);
  const pos = String(row.pos ?? 'unknown');
  const lexemeId = stableUuid(`kaikki:lexeme:${language}:${word}:${pos}`);
  const importedSenses = [];

  for (const { sense, sourceIndex, glosses } of usableSenses(row)) {
    const senseId = stableUuid(`kaikki:sense:${language}:${word}:${pos}:${sourceIndex}:${glosses[0]}`);
    importedSenses.push({
      sense_id: senseId,
      sense_key: `wiktionary-${word}-${pos}-${sourceIndex + 1}`.replace(/\s+/gu, '-').toLowerCase(),
      concept_links: [],
      definitions: { [language]: glosses[0] },
      ...(glosses[1] ? { sense_hint: { [language]: glosses[1] } } : {}),
      register_label: 'imported-unreviewed',
      source_refs: [`wiktionary:${sourceIdentity(row)}${sourceRevision(row) ? `@${sourceRevision(row)}` : ''}`],
    });

    for (const key of ['synonyms', 'antonyms', 'hypernyms', 'hyponyms', 'coordinate_terms', 'related', 'derived']) {
      const type = relationType(key);
      for (const targetWord of relationWords(sense[key] ?? row[key])) {
        for (const target of lexemeIdsByWord.get(targetWord) ?? []) {
          const directed = ['hypernym', 'hyponym', 'derived_from'].includes(type);
          const canonicalEndpoints = directed
            ? [`sense:${senseId}`, `lexeme:${target.id}`]
            : [`sense:${senseId}`, `lexeme:${target.id}`].sort();
          const edgeKey = `${type}|${canonicalEndpoints.join('|')}`;
          if (relationKeys.has(edgeKey)) continue;
          relationKeys.add(edgeKey);
          relations.push({
            relation_id: `rel_${stableUuid(`kaikki:relation:${edgeKey}`).replaceAll('-', '')}`,
            relation_type: type,
            from: { kind: 'sense', id: senseId },
            to: { kind: 'lexeme', id: target.id },
            directionality: directed ? 'directed' : 'symmetric',
            translation_authority: 'none',
            review_state: 'candidate',
            provenance: {
              source: 'kaikki',
              source_record_id: sourceIdentity(row),
              ...(sourceRevision(row) ? { source_revision: sourceRevision(row) } : {}),
            },
          });
        }
      }
    }
  }

  lexemes.push({
    lexeme_id: lexemeId,
    lemma_nfc: word,
    upos: posToUpos(pos),
    language_pos: pos,
    proper_noun: posToUpos(pos) === 'PROPN',
    review_state: 'candidate',
    senses: importedSenses,
  });
}

writeFileSync(resolve(ROOT, outputArg), `${JSON.stringify({
  schema_version: 1,
  language_code: language,
  import_metadata: {
    source: 'Kaikki/Wiktionary',
    candidate_only: true,
    exact_translation_authority: false,
    imported_entry_count: lexemes.length,
  },
  lexemes,
}, null, 2)}\n`, 'utf8');
writeFileSync(resolve(ROOT, relationsArg), `${JSON.stringify({
  schema_version: 1,
  contract: 'gef-semantic-relation-graph-v1',
  relations,
}, null, 2)}\n`, 'utf8');
console.log(`✅ Imported ${lexemes.length} candidate lexemes and ${relations.length} non-translation relations for ${language}.`);
