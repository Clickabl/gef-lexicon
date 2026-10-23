#!/usr/bin/env node
/**
 * Extract CANDIDATE translations of "thank you / thanks" for Gef's word-burst
 * feature from PINNED English Wiktionary revisions.
 *
 *   node scripts/word-bursts/extract-thanks.mjs [--out <path>]
 *
 * Rules (see research/word-bursts/thanks.candidates.json for the output):
 *   - Every form comes verbatim from the pinned wikitext. Nothing is invented,
 *     guessed or machine-translated; only wiki-link markup is stripped and the
 *     text is Unicode-normalised to NFC.
 *   - Pinned revisions are verified (revision resolves, belongs to the expected
 *     page, expected gloss is present). Nothing newer is ever substituted.
 *   - Output is deterministic: same pinned revisions in, same bytes out.
 *   - Every row is `review_state: "candidate"`. Nothing is approved here.
 *
 * Sources
 *   1. "thank you" rev 93739309  table glossed "an expression of gratitude"
 *   2. "thanks"    rev 92776910  English interjection table (fills only the
 *                                languages table 1 has no candidate for)
 *   3. "謝謝"      rev 92162850  {{zh-forms|s=...}} gives the Simplified form
 *                                (zh-Hans) of the Mandarin form in table 1.
 *
 * No dependencies; Node 22+ (global fetch, Unicode property escapes).
 * Lives under scripts/ and writes under research/ — neither is published to
 * the CDN (see AGENTS.md "CDN auto-deploy" allowlist).
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const USER_AGENT = 'GefLexicon/1.0 (word-burst extraction)';
const WIKI = 'https://en.wiktionary.org/w';
const DEFAULT_OUT = fileURLToPath(new URL('../../research/word-bursts/thanks.candidates.json', import.meta.url));

const SOURCES = {
  thankYou: { title: 'thank you', oldid: 93739309, gloss: 'an expression of gratitude' },
  thanks: { title: 'thanks', oldid: 92776910 },
  xiexie: { title: '謝謝', oldid: 92162850 },
};

const sourceRef = (oldid) => `${WIKI}/index.php?oldid=${oldid}`;

// ---------------------------------------------------------------------------
// Fetching and revision verification
// ---------------------------------------------------------------------------

async function httpGet(url) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (res.ok) return await res.text();
      if (res.status === 404) throw new Error(`HTTP 404 for ${url}`);
      lastError = new Error(`HTTP ${res.status} for ${url}`);
    } catch (error) {
      lastError = error;
      if (String(error.message).startsWith('HTTP 404')) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  throw lastError;
}

async function fetchPinnedRevision({ title, oldid }) {
  const apiUrl = `${WIKI}/api.php?action=query&prop=revisions&revids=${oldid}&rvprop=ids%7Ctimestamp&format=json&formatversion=2`;
  const meta = JSON.parse(await httpGet(apiUrl));
  const page = meta?.query?.pages?.[0];
  if (meta?.query?.badrevids || !page || page.missing) {
    throw new Error(`Revision ${oldid} does not resolve on en.wiktionary.org (expected "${title}"). Not substituting a newer revision.`);
  }
  if (page.title !== title || page.revisions?.[0]?.revid !== oldid) {
    throw new Error(`Revision ${oldid} is page "${page.title}", expected "${title}".`);
  }
  const wikitext = await httpGet(`${WIKI}/index.php?oldid=${oldid}&action=raw`);
  return stripComments(wikitext);
}

const stripComments = (text) => text.replace(/<!--[\s\S]*?-->/g, '');

// ---------------------------------------------------------------------------
// Minimal wikitext template parsing
// ---------------------------------------------------------------------------

/** Parse the template starting at text[start] === '{' '{'. Returns {name,args,end} or null. */
function parseTemplateAt(text, start) {
  if (text.slice(start, start + 2) !== '{{') return null;
  let depth = 0;
  let i = start;
  while (i < text.length) {
    if (text.startsWith('{{', i)) {
      depth += 1;
      i += 2;
    } else if (text.startsWith('}}', i)) {
      depth -= 1;
      i += 2;
      if (depth === 0) {
        const inner = text.slice(start + 2, i - 2);
        const [name, ...args] = splitTopLevel(inner, '|');
        return { name: name.trim(), args, end: i, raw: text.slice(start, i) };
      }
    } else {
      i += 1;
    }
  }
  return null;
}

/** Split on `sep` ignoring separators nested inside [[ ]] or {{ }}. */
function splitTopLevel(text, sep) {
  const parts = [];
  let current = '';
  let braces = 0;
  let brackets = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text.startsWith('{{', i)) {
      braces += 1;
      current += '{{';
      i += 1;
    } else if (text.startsWith('}}', i)) {
      braces -= 1;
      current += '}}';
      i += 1;
    } else if (text.startsWith('[[', i)) {
      brackets += 1;
      current += '[[';
      i += 1;
    } else if (text.startsWith(']]', i)) {
      brackets -= 1;
      current += ']]';
      i += 1;
    } else if (text[i] === sep && braces === 0 && brackets === 0) {
      parts.push(current);
      current = '';
    } else {
      current += text[i];
    }
  }
  parts.push(current);
  return parts;
}

/** Split a line fragment into text and top-level template tokens. */
function tokenize(fragment) {
  const tokens = [];
  let i = 0;
  let buffer = '';
  while (i < fragment.length) {
    if (fragment.startsWith('{{', i)) {
      const tpl = parseTemplateAt(fragment, i);
      if (!tpl) throw new Error(`Unbalanced template in: ${fragment}`);
      if (buffer) tokens.push({ kind: 'text', text: buffer });
      buffer = '';
      tokens.push({ kind: 'tpl', ...tpl });
      i = tpl.end;
    } else {
      buffer += fragment[i];
      i += 1;
    }
  }
  if (buffer) tokens.push({ kind: 'text', text: buffer });
  return tokens;
}

/** [[a|b]] -> b, [[a]] -> a. */
function stripWikiLinks(text) {
  return text
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    .replace(/\[\[([^\]]*)\]\]/g, '$1');
}

function cleanValue(raw, what) {
  const value = stripWikiLinks(raw).normalize('NFC').trim();
  if (/[{}<>[\]]|&[a-z#0-9]+;|''/i.test(value)) {
    throw new Error(`Unexpected markup left in ${what}: ${JSON.stringify(raw)}`);
  }
  return value;
}

/** Split args into positional and named (name=value). */
function readArgs(args) {
  const positional = [];
  const named = {};
  for (const arg of args) {
    const m = arg.match(/^\s*([a-z][a-z0-9-]*)\s*=([\s\S]*)$/i);
    if (m && !arg.includes('[[')) named[m[1].toLowerCase()] = m[2];
    else positional.push(arg);
  }
  return { positional, named };
}

// ---------------------------------------------------------------------------
// Translation-table location
// ---------------------------------------------------------------------------

/** Return the `==English==` section of a page. */
function englishSection(wikitext) {
  const start = wikitext.search(/^==English==\s*$/m);
  if (start < 0) throw new Error('No ==English== section found.');
  const rest = wikitext.slice(start + 1);
  const next = rest.search(/^==[^=].*[^=]==\s*$/m);
  return next < 0 ? wikitext.slice(start) : wikitext.slice(start, start + 1 + next);
}

const POS_HEADINGS = new Set([
  'Interjection', 'Noun', 'Verb', 'Adjective', 'Adverb', 'Phrase', 'Pronoun', 'Preposition', 'Conjunction',
  'Particle', 'Proverb', 'Determiner', 'Numeral', 'Symbol', 'Letter', 'Prefix', 'Suffix', 'Affix',
]);

/** Every {{trans-top}} table: gloss, id, heading context, body and trailing {{checktrans-top}} block. */
function listTables(section) {
  const tables = [];
  const headingRe = /^(={3,5})\s*([^=\n]+?)\s*\1\s*$/gm;
  const headings = [...section.matchAll(headingRe)].map((m) => ({ index: m.index, level: m[1].length, name: m[2] }));
  const topRe = /\{\{trans-top(?=[|}])/g;
  let m;
  while ((m = topRe.exec(section))) {
    const tpl = parseTemplateAt(section, m.index);
    const { positional, named } = readArgs(tpl.args);
    const gloss = stripWikiLinks(positional[0] ?? '').trim();
    const bottom = section.indexOf('{{trans-bottom}}', tpl.end);
    if (bottom < 0) throw new Error(`{{trans-top|${gloss}}} has no {{trans-bottom}}.`);
    const body = section.slice(tpl.end, bottom);
    let after = bottom + '{{trans-bottom}}'.length;
    let checkBody = '';
    const trailing = section.slice(after);
    const lead = trailing.match(/^\s*\{\{checktrans-top\}\}/);
    if (lead) {
      const checkStart = after + lead[0].length;
      const checkEnd = section.indexOf('{{trans-bottom}}', checkStart);
      if (checkEnd < 0) throw new Error('{{checktrans-top}} has no {{trans-bottom}}.');
      checkBody = section.slice(checkStart, checkEnd);
      after = checkEnd + '{{trans-bottom}}'.length;
    }
    const pos = [...headings].reverse().find((h) => h.index < m.index && POS_HEADINGS.has(h.name));
    tables.push({ gloss, id: named.id?.trim() ?? null, pos: pos?.name ?? null, body, checkBody });
  }
  return tables;
}

// ---------------------------------------------------------------------------
// Scripts
// ---------------------------------------------------------------------------

// Unicode Script property -> ISO 15924. Unmapped scripts throw so nothing is silently mislabelled.
const SCRIPT_CODES = {
  Latin: 'Latn', Cyrillic: 'Cyrl', Arabic: 'Arab', Hebrew: 'Hebr', Devanagari: 'Deva', Greek: 'Grek',
  Han: 'Hani', Hiragana: 'Hira', Katakana: 'Kana', Hangul: 'Hang', Thai: 'Thai', Georgian: 'Geor',
  Armenian: 'Armn', Ethiopic: 'Ethi', Bengali: 'Beng', Tamil: 'Taml', Telugu: 'Telu', Kannada: 'Knda',
  Malayalam: 'Mlym', Gujarati: 'Gujr', Gurmukhi: 'Guru', Oriya: 'Orya', Sinhala: 'Sinh', Khmer: 'Khmr',
  Lao: 'Laoo', Myanmar: 'Mymr', Tibetan: 'Tibt', Mongolian: 'Mong', Syriac: 'Syrc', Thaana: 'Thaa',
  Cherokee: 'Cher', Canadian_Aboriginal: 'Cans', Coptic: 'Copt', Gothic: 'Goth', Batak: 'Batk',
  Yi: 'Yiii', Tifinagh: 'Tfng', Nko: 'Nkoo', Runic: 'Runr', Glagolitic: 'Glag', Old_Italic: 'Ital',
  Javanese: 'Java', Balinese: 'Bali', Sundanese: 'Sund', Buginese: 'Bugi', Tagalog: 'Tglg', Hanunoo: 'Hano',
  Buhid: 'Buhd', Tagbanwa: 'Tagb', Ol_Chiki: 'Olck', Lepcha: 'Lepc', Limbu: 'Limb', Tai_Le: 'Tale',
  New_Tai_Lue: 'Talu', Tai_Tham: 'Lana', Tai_Viet: 'Tavt', Cham: 'Cham', Rejang: 'Rjng', Saurashtra: 'Saur',
  Phags_Pa: 'Phag', Vai: 'Vaii', Bamum: 'Bamu', Adlam: 'Adlm', Osage: 'Osge', Deseret: 'Dsrt', Ogham: 'Ogam',
  Mandaic: 'Mand', Samaritan: 'Samr', Meetei_Mayek: 'Mtei', Syloti_Nagri: 'Sylo', Lisu: 'Lisu', Chakma: 'Cakm',
  Bopomofo: 'Bopo', Braille: 'Brai',
};
const SCRIPT_REGEXES = Object.entries(SCRIPT_CODES).map(([name, code]) => [code, new RegExp(`\\p{Script=${name}}`, 'u')]);
const IGNORABLE = /[\p{Script=Common}\p{Script=Inherited}]/u;

function scriptCounts(text) {
  const counts = new Map();
  for (const ch of text) {
    if (IGNORABLE.test(ch)) continue;
    const hit = SCRIPT_REGEXES.find(([, re]) => re.test(ch));
    if (!hit) throw new Error(`No ISO 15924 mapping for character ${JSON.stringify(ch)} (U+${ch.codePointAt(0).toString(16)}) in ${JSON.stringify(text)}`);
    counts.set(hit[0], (counts.get(hit[0]) ?? 0) + 1);
  }
  return counts;
}

/**
 * ISO 15924 script of a form. `hanEvidence` maps individual Han characters to
 * 'Hant' / 'Hans' where the pinned 謝謝 wikitext itself shows the pair
 * (謝 / 谢); Han text with no such evidence stays 'Hani'.
 */
function detectScript(text, languageCode, hanEvidence, scParam) {
  if (scParam) {
    if (!/^[A-Z][a-z]{3}$/.test(scParam)) throw new Error(`Unsupported sc= value ${scParam} for ${text}`);
    return { script: scParam, mixed: null };
  }
  const counts = scriptCounts(text);
  if (counts.size === 0) throw new Error(`No script found in ${JSON.stringify(text)}`);
  const has = (code) => counts.has(code);
  const others = [...counts.keys()].filter((c) => !['Hani', 'Hira', 'Kana', 'Hang'].includes(c));
  const mixedNote = counts.size > 1 ? [...counts.keys()].sort().join('+') : null;

  if (has('Hira') || has('Kana')) {
    if (has('Hani') || languageCode === 'ja') return { script: 'Jpan', mixed: mixedNote };
    if (has('Hira') && has('Kana')) return { script: 'Jpan', mixed: mixedNote };
    return { script: has('Kana') ? 'Kana' : 'Hira', mixed: mixedNote };
  }
  if (has('Hang')) return { script: 'Kore', mixed: mixedNote };
  if (has('Hani')) {
    const evidence = new Set([...text].map((ch) => hanEvidence.get(ch)).filter(Boolean));
    if (evidence.size > 1) throw new Error(`Both Traditional and Simplified characters in ${text}`);
    const script = evidence.size === 1 ? [...evidence][0] : 'Hani';
    return { script, mixed: others.length ? mixedNote : null };
  }
  if (counts.size === 1) return { script: [...counts.keys()][0], mixed: null };
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] === ranked[1][1]) throw new Error(`Cannot pick a dominant script for ${JSON.stringify(text)}: ${mixedNote}`);
  return { script: ranked[0][0], mixed: mixedNote };
}

// ---------------------------------------------------------------------------
// Parsing translation tables
// ---------------------------------------------------------------------------

const CANDIDATE_TEMPLATES = new Set(['t', 't+', 'tt', 'tt+']);
const CHECK_TEMPLATES = new Set(['t-check', 't+check', 'tt-check', 'tt+check']);
const NEEDED_TEMPLATES = new Set(['t-needed']);
const QUALIFIER_TEMPLATES = new Set(['qualifier', 'q', 'qual']);
const IGNORED_TEMPLATES = new Set(['l']);
const SCRIPT_LABELS = new Set(['Cyrillic', 'Latin', 'Mongolian script']);
const KNOWN_NAMED = new Set(['tr', 'alt', 'lit', 'id', 'sc']);

const qualifierNote = (name, args) => `${name === 'q' || name === 'qual' ? 'qualifier' : name}: ${args.map((a) => cleanValue(a, 'qualifier')).filter(Boolean).join(', ')}`;

/**
 * Parse a table body into records. `forceUnverified` is used for
 * {{checktrans-top}} blocks, where Wiktionary itself marks every row as
 * needing verification.
 */
function parseTableBody(body, { forceUnverified = false } = {}) {
  const records = [];
  let parent = null;
  for (const line of body.split('\n')) {
    const lineMatch = line.match(/^(\*+)(:*)\s*([^:{]+?):\s*(.*)$/);
    if (!lineMatch) {
      if (/^\*/.test(line)) {
        // A list line with a label but no colon content (e.g. "* Altai:") is handled above; anything else is unexpected.
        if (!/^\*+:*\s*[^:{]+:\s*$/.test(line)) throw new Error(`Unparsed table line: ${line}`);
      }
      continue;
    }
    const nested = lineMatch[2].length > 0 || lineMatch[1].length > 1;
    const label = lineMatch[3].trim();
    const rest = lineMatch[4];
    if (!nested) parent = label;
    if (nested && !parent) throw new Error(`Nested line with no parent: ${line}`);
    const languageName = nested && !SCRIPT_LABELS.has(label) ? label : parent;
    const tableLabel = nested ? `${parent} > ${label}` : label;

    const tokens = tokenize(rest);
    let last = null;
    let pendingNotes = [];
    let excluding = false;
    for (const token of tokens) {
      if (token.kind === 'text') {
        if (excluding && token.text.includes(')')) excluding = false;
        if (/plus one of/i.test(token.text)) excluding = true;
        const annotation = token.text.match(/^\s*,?\s*''\(([^)]*)\)''/);
        if (annotation && last) last.notes.push(`annotation: (${cleanValue(annotation[1], 'annotation')})`);
        continue;
      }
      const name = token.name.toLowerCase();
      if (QUALIFIER_TEMPLATES.has(name)) {
        const note = qualifierNote(name, token.args);
        if (last) last.notes.push(note);
        else pendingNotes.push(note);
        continue;
      }
      if (name === 'gloss') {
        const note = `gloss: ${cleanValue(token.args.join('|'), 'gloss')}`;
        if (last) last.notes.push(note);
        else pendingNotes.push(note);
        continue;
      }
      if (name === 'attention') {
        const { positional } = readArgs(token.args);
        if (last) last.notes.push(`attention: ${cleanValue(positional.slice(1).join('|'), 'attention')}`);
        continue;
      }
      if (IGNORED_TEMPLATES.has(name)) continue;
      const isCandidate = CANDIDATE_TEMPLATES.has(name);
      const isCheck = CHECK_TEMPLATES.has(name);
      const isNeeded = NEEDED_TEMPLATES.has(name);
      if (!isCandidate && !isCheck && !isNeeded) throw new Error(`Unhandled template {{${token.name}}} in: ${line}`);

      const { positional, named } = readArgs(token.args);
      for (const key of Object.keys(named)) {
        if (!KNOWN_NAMED.has(key)) throw new Error(`Unhandled named parameter ${key}= in: ${token.raw}`);
      }
      const record = {
        template: token.name,
        wiktionaryCode: (positional[0] ?? '').trim(),
        languageName,
        tableLabel,
        nested,
        notes: [],
        kind: isNeeded ? 'needed' : isCheck || forceUnverified ? 'unverified' : 'candidate',
        reason: null,
      };
      if (!record.wiktionaryCode) throw new Error(`Template without language code: ${token.raw}`);
      if (isNeeded) {
        records.push(record);
        last = record;
        continue;
      }
      record.text = cleanValue(positional[1] ?? '', `text of ${token.raw}`);
      if (!record.text) throw new Error(`Empty text in ${token.raw}`);
      record.transliteration = named.tr ? cleanValue(named.tr, 'tr=') : null;
      record.sc = named.sc ? named.sc.trim() : null;
      if (named.alt) record.notes.push(`alt: ${cleanValue(named.alt, 'alt=')}`);
      if (named.lit) record.notes.push(`lit: ${cleanValue(named.lit, 'lit=')}`);
      const grammar = positional.slice(2).map((a) => a.trim()).filter(Boolean);
      if (grammar.length) record.notes.push(`gender/number: ${grammar.join(', ')}`);
      if (excluding) {
        record.kind = 'unverified';
        record.reason = 'follows "plus one of:" in the table: an address term appended to the phrase, not a translation of thank you';
      } else if (isCheck) {
        record.reason = `marked {{${token.name}}} in the source (translation not verified)`;
      } else if (forceUnverified) {
        record.reason = 'listed in the {{checktrans-top}} block (Wiktionary flags these for verification)';
      }
      record.notes.push(...pendingNotes);
      pendingNotes = [];
      records.push(record);
      last = record;
    }
  }
  return records;
}

// ---------------------------------------------------------------------------
// Language tags
// ---------------------------------------------------------------------------

/**
 * Wiktionary code -> language key (BCP 47 language subtag).
 * Wiktionary already uses the two-letter ISO 639-1 code wherever one exists.
 * The only changes made: Wiktionary-internal lect suffixes (nan-hbl, mns-nor,
 * kca-nor, yrk-tun, sit-sit) are dropped to the base language. Mandarin (cmn)
 * is handled per script as zh-Hant / zh-Hans.
 */
function languageKey(wiktionaryCode) {
  const m = wiktionaryCode.match(/^([a-z]{2,3})(?:-[a-z]{3})?$/);
  if (!m) throw new Error(`Unexpected Wiktionary language code: ${wiktionaryCode}`);
  return m[1];
}

function languageTagFor(key, script) {
  if (key === 'cmn') {
    if (script === 'Hant') return 'zh-Hant';
    if (script === 'Hans') return 'zh-Hans';
    return 'zh';
  }
  return key;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function buildHanEvidence(title, simplified) {
  const evidence = new Map();
  const a = [...title];
  const b = [...simplified];
  if (a.length !== b.length) throw new Error(`Cannot align ${title} with ${simplified}`);
  a.forEach((ch, i) => {
    if (ch !== b[i]) {
      evidence.set(ch, 'Hant');
      evidence.set(b[i], 'Hans');
    }
  });
  return evidence;
}

function readZhForms(wikitext) {
  const start = wikitext.indexOf('{{zh-forms');
  if (start < 0) throw new Error('No {{zh-forms}} on 謝謝.');
  const tpl = parseTemplateAt(wikitext, start);
  const { named } = readArgs(tpl.args);
  if (!named.s) throw new Error('{{zh-forms}} on 謝謝 has no s= parameter.');
  return cleanValue(named.s, 's=');
}

async function main() {
  const outIndex = process.argv.indexOf('--out');
  const outPath = outIndex > 0 ? path.resolve(process.argv[outIndex + 1]) : DEFAULT_OUT;

  const [thankYouText, thanksText, xiexieText] = await Promise.all([
    fetchPinnedRevision(SOURCES.thankYou),
    fetchPinnedRevision(SOURCES.thanks),
    fetchPinnedRevision(SOURCES.xiexie),
  ]);

  // --- Table 1: "thank you" --------------------------------------------------
  const tables1 = listTables(englishSection(thankYouText));
  const table1 = tables1.filter((t) => t.gloss === SOURCES.thankYou.gloss);
  if (table1.length !== 1) {
    console.error(`Expected exactly one table glossed "${SOURCES.thankYou.gloss}" in "thank you" rev ${SOURCES.thankYou.oldid}; found ${table1.length}.`);
    console.error(`Glosses found: ${JSON.stringify(tables1.map((t) => ({ gloss: t.gloss, id: t.id, pos: t.pos })))}`);
    process.exit(2);
  }

  // --- Table 2: "thanks" English interjection --------------------------------
  const tables2 = listTables(englishSection(thanksText));
  const table2List = tables2.filter((t) => t.pos === 'Interjection');
  if (table2List.length !== 1) {
    console.error(`Expected exactly one English Interjection translation table in "thanks" rev ${SOURCES.thanks.oldid}; found ${table2List.length}.`);
    console.error(`Tables found: ${JSON.stringify(tables2.map((t) => ({ gloss: t.gloss, id: t.id, pos: t.pos })))}`);
    process.exit(2);
  }
  const table2 = table2List[0];

  // --- 謝謝 -----------------------------------------------------------------
  const simplified = readZhForms(xiexieText);
  const hanEvidence = buildHanEvidence(SOURCES.xiexie.title, simplified);

  const refs1 = [sourceRef(SOURCES.thankYou.oldid)];
  const refs2 = [sourceRef(SOURCES.thanks.oldid)];
  const refs3 = [sourceRef(SOURCES.xiexie.oldid)];

  const needed = [];
  const unverified = [];
  const candidates = []; // {record, refs, table}

  const records1 = parseTableBody(table1[0].body);
  const records2 = parseTableBody(table2.body);
  const records2Check = parseTableBody(table2.checkBody, { forceUnverified: true });

  // Languages table 1 already has a candidate for: by language code, and by top-level
  // language heading (so e.g. table 2's "Norwegian: no" is not added next to table 1's
  // Norwegian > Bokmål / Nynorsk). Table 2 only fills what remains.
  const covered = new Set();
  const coveredHeadings = new Set();
  for (const record of records1) {
    if (record.kind !== 'candidate') continue;
    covered.add(languageKey(record.wiktionaryCode));
    coveredHeadings.add(record.tableLabel.split(' > ')[0]);
  }

  const skippedFromTable2 = [];
  const handle = (records, refs, label, filterCovered) => {
    for (const record of records) {
      const key = languageKey(record.wiktionaryCode);
      if (record.kind === 'needed') {
        needed.push({ language: record.languageName, code: record.wiktionaryCode, table: label });
        continue;
      }
      if (record.kind === 'unverified') {
        unverified.push({ record, refs, table: label });
        continue;
      }
      if (filterCovered && (covered.has(key) || (!record.nested && coveredHeadings.has(record.tableLabel)))) {
        skippedFromTable2.push(record);
        continue;
      }
      candidates.push({ record, refs, table: label });
      // Step 3: Simplified counterpart of the Mandarin form that is the 謝謝 entry itself.
      if (!filterCovered && key === 'cmn' && record.text === SOURCES.xiexie.title) {
        candidates.push({
          record: {
            template: 'zh-forms',
            wiktionaryCode: 'cmn',
            languageName: record.languageName,
            tableLabel: '謝謝 {{zh-forms|s=}}',
            nested: true,
            notes: [`Simplified form from {{zh-forms|s=${simplified}}} on the 謝謝 entry; the thank-you table lists Mandarin 謝謝 directly (it does not say "see 謝謝")`],
            kind: 'candidate',
            text: simplified,
            transliteration: null,
            sc: null,
          },
          refs: refs3,
          table: 'xiexie',
        });
      }
    }
  };
  handle(records1, refs1, 'thank you', false);
  handle(records2, refs2, 'thanks', true);
  handle(records2Check, refs2, 'thanks (checktrans)', false);

  // --- Build output rows -----------------------------------------------------
  const rankByTag = new Map();
  const forms = [];
  const buildCommon = ({ record, refs }) => {
    const key = languageKey(record.wiktionaryCode);
    const { script, mixed } = detectScript(record.text, key, hanEvidence, record.sc);
    const tag = languageTagFor(key, script);
    const notes = [...record.notes];
    if (mixed) notes.push(`mixed scripts in the form: ${mixed}`);
    if (/^File:/.test(record.text)) notes.push('image file reference, not text');
    else if (/sign language/i.test(record.languageName)) notes.push('sign language notation, not written text');
    return { key, script, tag, notes };
  };

  for (const entry of candidates) {
    const { record, refs } = entry;
    const { script, tag, notes } = buildCommon(entry);
    const rank = (rankByTag.get(tag) ?? 0) + 1;
    rankByTag.set(tag, rank);
    const form = {
      id: `thanks:${tag}:${rank}`,
      text: record.text,
      language_tag: tag,
      language_name: record.languageName.normalize('NFC'),
      script,
    };
    if (record.transliteration) form.transliteration = record.transliteration;
    form.rank = rank;
    form.review_state = 'candidate';
    form.source_refs = refs;
    form.wiktionary_code = record.wiktionaryCode;
    form.table_label = record.tableLabel.normalize('NFC');
    if (notes.length) form.notes = notes;
    forms.push(form);
  }
  forms.sort((a, b) => (a.language_tag < b.language_tag ? -1 : a.language_tag > b.language_tag ? 1 : a.rank - b.rank));

  const unverifiedOut = unverified.map((entry) => {
    const { record, refs } = entry;
    const { script, tag, notes } = buildCommon(entry);
    const item = {
      text: record.text,
      language_tag: tag,
      language_name: record.languageName.normalize('NFC'),
      script,
    };
    if (record.transliteration) item.transliteration = record.transliteration;
    item.template = `{{${record.template}}}`;
    item.reason = record.reason;
    item.source_refs = refs;
    item.wiktionary_code = record.wiktionaryCode;
    item.table_label = record.tableLabel.normalize('NFC');
    if (notes.length) item.notes = notes;
    return item;
  });
  unverifiedOut.sort((a, b) => (a.language_tag < b.language_tag ? -1 : a.language_tag > b.language_tag ? 1 : a.text < b.text ? -1 : a.text > b.text ? 1 : 0));

  // --- Sanity checks ---------------------------------------------------------
  const ids = new Set();
  for (const form of forms) {
    if (ids.has(form.id)) throw new Error(`Duplicate id ${form.id}`);
    ids.add(form.id);
    if (form.text !== form.text.normalize('NFC')) throw new Error(`Not NFC: ${form.id}`);
    Intl.getCanonicalLocales(form.language_tag); // throws on invalid BCP 47 syntax
  }

  const output = {
    contract: 'gef-word-burst-candidates-v1',
    key: 'thanks',
    generated_from: [
      { title: SOURCES.thankYou.title, oldid: SOURCES.thankYou.oldid, gloss: table1[0].gloss, role: 'primary translation table' },
      { title: SOURCES.thanks.title, oldid: SOURCES.thanks.oldid, gloss: table2.gloss, role: `English ${table2.pos} translation table; fills only languages the primary table has no candidate for` },
      { title: SOURCES.xiexie.title, oldid: SOURCES.xiexie.oldid, gloss: null, role: `{{zh-forms|s=${simplified}}}: Simplified counterpart of the Mandarin ${SOURCES.xiexie.title} form (no translation table on this page)` },
    ],
    forms,
    unverified: unverifiedOut,
  };

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  // --- Summary ----------------------------------------------------------------
  const perScript = {};
  for (const form of forms) perScript[form.script] = (perScript[form.script] ?? 0) + 1;
  const fromTable = (ref) => forms.filter((f) => f.source_refs[0] === ref).length;
  console.log(`wrote ${outPath}`);
  console.log(`table 1 gloss: ${table1[0].gloss}`);
  console.log(`table 2 gloss: ${table2.gloss} (section: ${table2.pos}${table2.id ? `, id=${table2.id}` : ''})`);
  console.log(`forms: ${forms.length} (thank you ${fromTable(refs1[0])}, thanks ${fromTable(refs2[0])}, 謝謝 ${fromTable(refs3[0])})`);
  console.log(`languages (tags): ${new Set(forms.map((f) => f.language_tag)).size}`);
  console.log(`per script: ${JSON.stringify(Object.fromEntries(Object.entries(perScript).sort()))}`);
  console.log(`distinct scripts (${Object.keys(perScript).length}): ${Object.keys(perScript).sort().join(' ')}`);
  console.log(`unverified: ${unverifiedOut.length}`);
  console.log(`t-needed skipped: ${needed.length} ${JSON.stringify(needed)}`);
  console.log(`table 2 forms skipped because table 1 already covers the language: ${skippedFromTable2.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
