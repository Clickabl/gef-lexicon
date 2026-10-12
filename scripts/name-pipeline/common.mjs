import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PIPELINE_DIR = join(REPO_ROOT, 'research', 'name-pipeline');
export const SNAPSHOT_DIR = join(PIPELINE_DIR, 'snapshots');

export const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
export const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
export const maybeJson = (path, fallback) => (existsSync(path) ? readJson(path) : fallback);
export const sha256 = text => createHash('sha256').update(text).digest('hex');
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** ASCII identifier fragment. Latin letters lose their marks; anything else falls back to the given romanization. */
export function asciiSlug(text) {
  return text.normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase()
    .replace(/ß/g, 'ss').replace(/[øð]/g, 'o').replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/ł/g, 'l').replace(/đ/g, 'd').replace(/þ/g, 'th')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const SCRIPT_BY_PROPERTY = [
  ['Latin', 'Latn'], ['Cyrillic', 'Cyrl'], ['Greek', 'Grek'], ['Arabic', 'Arab'], ['Armenian', 'Armn'], ['Hebrew', 'Hebr'],
  ['Devanagari', 'Deva'], ['Bengali', 'Beng'], ['Tamil', 'Taml'], ['Telugu', 'Telu'], ['Kannada', 'Knda'], ['Malayalam', 'Mlym'],
  ['Gujarati', 'Gujr'], ['Gurmukhi', 'Guru'], ['Georgian', 'Geor'], ['Thai', 'Thai'], ['Lao', 'Laoo'], ['Khmer', 'Khmr'],
  ['Myanmar', 'Mymr'], ['Sinhala', 'Sinh'], ['Ethiopic', 'Ethi'], ['Hangul', 'Hang'], ['Han', 'Hani'], ['Hiragana', 'Jpan'],
  ['Katakana', 'Jpan'], ['Mongolian', 'Mong'], ['Tibetan', 'Tibt'],
];
const SCRIPT_PATTERNS = SCRIPT_BY_PROPERTY.map(([property, code]) => [new RegExp(`\\p{Script=${property}}`, 'gu'), code]);

/** Match the graph's representable scripts without repairing source glyphs. */
export function spellingFitsScript(text, script) {
  const systems = { Hans: ['Hani'], Hant: ['Hani'], Jpan: ['Hani', 'Hira', 'Kana'], Kore: ['Hang', 'Hani'], Hrkt: ['Hira', 'Kana'] };
  if (!script) return false;
  const allowed = new RegExp(`^(?:${(systems[script] ?? [script]).map(value => `\\p{Script_Extensions=${value}}`).join('|')}|\\p{Script=Common}|\\p{Script=Inherited})$`, 'u');
  return [...text].every(character => !/[\p{L}\p{M}]/u.test(character) || allowed.test(character));
}

/** ISO 15924 code of the script that most of the letters belong to. Mixed Han and kana read as Jpan. */
export function scriptOf(text) {
  const counts = new Map();
  for (const [pattern, code] of SCRIPT_PATTERNS) {
    const hits = (text.match(pattern) ?? []).length;
    if (hits) counts.set(code, (counts.get(code) ?? 0) + hits);
  }
  if (counts.has('Jpan') && counts.has('Hani')) { counts.set('Jpan', counts.get('Jpan') + counts.get('Hani')); counts.delete('Hani'); }
  let best = null;
  for (const [code, hits] of [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) { best = code; break; }
  return best;
}

/** Strict ordering that never depends on locale data. */
export const compareText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
