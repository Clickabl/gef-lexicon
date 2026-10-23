#!/usr/bin/env node
/**
 * Writes the approved "thanks" word burst (contract gef-word-burst-v1) from the pinned-Wiktionary candidates
 * (research/word-bursts/thanks.candidates.json, made by extract-thanks.mjs). Only the forms the owner approved on
 * 2026-10-22 are written, in the order the app's burst goes round the scripts (the languages he named first). The shown
 * text is the Wiktionary entry title the table links to: for Russian and Ukrainian without stress marks, for Arabic and
 * Hebrew without vowel points, as Wiktionary's own page titles are; the table's text is kept beside it. Re-runnable.
 *
 *   node scripts/word-bursts/approve-thanks.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const candidates = JSON.parse(readFileSync(join(root, 'research/word-bursts/thanks.candidates.json'), 'utf8'));

const APPROVED_BY = 'Tim (owner), 2026-10-22';
/** Candidate ids, in burst order: French, Chinese, Arabic, Japanese, Korean, Hebrew, Hindi, Russian, Greek, then the rest. */
const APPROVED = [
  'thanks:fr:1', 'thanks:zh-Hans:1', 'thanks:zh-Hant:1', 'thanks:ar:1', 'thanks:ja:2', 'thanks:ko:2', 'thanks:he:1',
  'thanks:hi:1', 'thanks:ru:1', 'thanks:el:1', 'thanks:th:1', 'thanks:ka:1', 'thanks:hy:1', 'thanks:ta:1', 'thanks:bn:1',
  'thanks:am:2', 'thanks:km:1', 'thanks:bo:1', 'thanks:chr:2', 'thanks:iu:2', 'thanks:es:1', 'thanks:de:1', 'thanks:it:1',
  'thanks:pt:1', 'thanks:sw:1', 'thanks:uk:1',
];
/** Wiktionary's entry-title rule for the languages whose table text carries teaching marks. */
const ENTRY_TITLE = {
  ru: text => text.normalize('NFD').replace(/[̀́]/gu, '').normalize('NFC'),
  uk: text => text.normalize('NFD').replace(/[̀́]/gu, '').normalize('NFC'),
  ar: text => text.replace(/[ً-ٰٟ]/gu, ''),
  he: text => text.replace(/[֑-ׇֽֿׁׂׅׄ]/gu, ''),
};

const byId = new Map(candidates.forms.map(form => [form.id, form]));
const forms = APPROVED.map(id => {
  const form = byId.get(id);
  if (!form) throw new Error(`No candidate ${id}`);
  const base = form.language_tag.split('-')[0];
  const text = (ENTRY_TITLE[base] ?? (value => value))(form.text).normalize('NFC');
  return {
    id: `thanks:${form.language_tag}`,
    text,
    ...(text !== form.text ? { table_text: form.text } : {}),
    language_tag: form.language_tag,
    script: form.script,
    review_state: 'approved',
    approved_by: APPROVED_BY,
    source_refs: [...form.source_refs, `https://en.wiktionary.org/wiki/${encodeURIComponent(text)}`],
  };
});
const ids = new Set(forms.map(form => form.id));
if (ids.size !== forms.length) throw new Error('Two approved forms share a language');

const word = { contract: 'gef-word-burst-v1', key: 'thanks', forms };
const index = { contract: 'gef-word-burst-index-v1', words: [{ key: 'thanks', path: 'thanks.json' }] };
writeFileSync(join(root, 'lexi/word-bursts/thanks.json'), `${JSON.stringify(word, null, 2)}\n`);
writeFileSync(join(root, 'lexi/word-bursts/index.json'), `${JSON.stringify(index, null, 2)}\n`);
console.log(`thanks: ${forms.length} approved forms in ${new Set(forms.map(form => form.script)).size} scripts`);
for (const form of forms) console.log(`${form.language_tag.padEnd(8)} ${form.script} ${form.text}${form.table_text ? `  (table: ${form.table_text})` : ''}`);
