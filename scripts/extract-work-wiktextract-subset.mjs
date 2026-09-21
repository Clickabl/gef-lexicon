#!/usr/bin/env node
/**
 * Streams the private filtered Wiktextract archive once and extracts full source
 * records whose lemma or attested form occurs in an exhaustive Gef token table.
 * It does not assign senses, translate definitions, or infer equivalence.
 */
import { createReadStream, createWriteStream, readFileSync } from 'node:fs';
import { createGunzip, createGzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { pipeline } from 'node:stream/promises';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const input = args.get('--input');
const tokens = args.get('--tokens');
const language = args.get('--language');
const output = args.get('--output');
const report = args.get('--report');
if (!input || !tokens || !language || !output || !report) {
  console.error('Required: --input ARCHIVE.jsonl[.gz] --tokens TOKENS.tsv --language TAG --output SUBSET.jsonl.gz --report REPORT.json');
  process.exit(2);
}
const normalize = (value) => typeof value === 'string' ? value.normalize('NFC').trim().toLocaleLowerCase('und') : '';
const lines = readFileSync(tokens, 'utf8').replace(/\r\n?/gu, '\n').trimEnd().split('\n');
const header = lines.shift()?.split('\t') ?? [];
const surfaceIndex = header.indexOf('surface');
if (surfaceIndex < 0 || header.indexOf('ambiguity_status') < 0) throw new Error('Token table is missing canonical columns.');
const wanted = new Set(lines.map((line) => normalize(line.split('\t')[surfaceIndex] ?? '')).filter(Boolean));
const matched = new Set();
const source = createReadStream(input).pipe(input.endsWith('.gz') ? createGunzip() : new (await import('node:stream')).PassThrough());
const rl = createInterface({ input: source, crlfDelay: Infinity });
const gzip = createGzip({ level: 9 });
const destination = createWriteStream(output);
const writing = pipeline(gzip, destination);
let scanned = 0, retained = 0;
for await (const line of rl) {
  if (!line.trim()) continue;
  scanned += 1;
  let row;
  try { row = JSON.parse(line); } catch { throw new Error(`Invalid JSONL record at source row ${scanned}`); }
  const rowLanguage = normalize(row.lang_code ?? row.lang);
  if (rowLanguage !== normalize(language)) continue;
  const surfaces = new Set([normalize(row.word)]);
  for (const form of Array.isArray(row.forms) ? row.forms : []) {
    const value = normalize(form?.form ?? form?.word);
    if (value) surfaces.add(value);
  }
  const hits = [...surfaces].filter((value) => wanted.has(value));
  if (!hits.length) continue;
  hits.forEach((value) => matched.add(value));
  retained += 1;
  if (!gzip.write(`${JSON.stringify(row)}\n`)) await new Promise((resolve) => gzip.once('drain', resolve));
}
gzip.end();
await writing;
const unmatched = [...wanted].filter((value) => !matched.has(value)).sort();
const result = {
  schema_version: 1,
  contract: 'gef-work-wiktextract-subset-report-v1',
  language,
  source_archive: input,
  token_table: tokens,
  scanned_records: scanned,
  retained_records: retained,
  requested_surface_count: wanted.size,
  matched_surface_count: matched.size,
  unmatched_surface_count: unmatched.length,
  unmatched_surfaces: unmatched,
  note: 'A surface match selects candidate source records only. It does not select a sense or authorize a cross-language mapping.',
};
await (await import('node:fs/promises')).writeFile(report, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(`OK — retained ${retained} full ${language} source records; matched ${matched.size}/${wanted.size} token surfaces.`);
