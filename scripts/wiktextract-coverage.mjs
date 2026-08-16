#!/usr/bin/env node
/**
 * Stream a Wiktextract JSONL or JSONL.GZ dump and report exact coverage for
 * GEF learn-from languages plus well-supported languages outside the registry.
 *
 * Usage:
 * node scripts/wiktextract-coverage.mjs \
 *   --dump /path/to/raw-wiktextract-data.jsonl.gz \
 *   --registry ../gef-expo/registry/language-support.json \
 *   --out reports/wiktextract-coverage.json
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import zlib from 'node:zlib';

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const dumpPath = arg('--dump');
const registryPath = arg('--registry');
const outputPath = arg('--out') ?? 'reports/wiktextract-coverage.json';
const minimumMissingSenses = Number(arg('--missing-threshold') ?? 10000);

if (!dumpPath || !registryPath) {
  console.error('Required: --dump <jsonl[.gz]> --registry <language-support.json>');
  process.exit(2);
}

const registry = JSON.parse(await fsp.readFile(registryPath, 'utf8'));
const learnFrom = new Set(registry?.programs?.learnFromLanguages ?? []);
if (learnFrom.size === 0) throw new Error('Registry has no programs.learnFromLanguages list.');

function newRow(langCode, langName) {
  return {
    langCode,
    langName: langName ?? langCode,
    entries: 0,
    senses: 0,
    forms: 0,
    pronunciations: 0,
    audioRefs: 0,
    translations: 0,
    etymologyEntries: 0,
  };
}

const counts = new Map();
const input = fs.createReadStream(dumpPath);
const stream = dumpPath.endsWith('.gz') ? input.pipe(zlib.createGunzip()) : input;
const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
let parsedRows = 0;
let invalidRows = 0;

for await (const line of lines) {
  if (!line.trim()) continue;
  let record;
  try {
    record = JSON.parse(line);
  } catch {
    invalidRows += 1;
    continue;
  }
  const langCode = record.lang_code;
  if (typeof langCode !== 'string' || !langCode) continue;
  const row = counts.get(langCode) ?? newRow(langCode, record.lang);
  row.entries += 1;
  row.senses += Array.isArray(record.senses) ? record.senses.length : 0;
  row.forms += Array.isArray(record.forms) ? record.forms.length : 0;
  row.pronunciations += Array.isArray(record.sounds) ? record.sounds.length : 0;
  row.audioRefs += Array.isArray(record.sounds)
    ? record.sounds.filter((sound) => sound && (sound.audio || sound.ogg_url || sound.mp3_url)).length
    : 0;
  row.translations += Array.isArray(record.translations) ? record.translations.length : 0;
  if (
    (typeof record.etymology_text === 'string' && record.etymology_text.trim())
    || (Array.isArray(record.etymology_templates) && record.etymology_templates.length > 0)
  ) row.etymologyEntries += 1;
  counts.set(langCode, row);
  parsedRows += 1;
}

const current = [...learnFrom]
  .map((code) => counts.get(code) ?? newRow(code, code))
  .sort((a, b) => a.senses - b.senses || a.langCode.localeCompare(b.langCode));
const outside = [...counts.values()]
  .filter((row) => !learnFrom.has(row.langCode) && row.senses >= minimumMissingSenses)
  .sort((a, b) => b.senses - a.senses || a.langCode.localeCompare(b.langCode));

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  dump: path.basename(dumpPath),
  registry: path.basename(registryPath),
  learnFromLanguageCount: learnFrom.size,
  parsedRows,
  invalidRows,
  minimumMissingSenses,
  currentLanguagesAscendingBySenseCount: current,
  wellSupportedLanguagesOutsideRegistry: outside,
};

await fsp.mkdir(path.dirname(outputPath), { recursive: true });
await fsp.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Counted ${parsedRows.toLocaleString()} records across ${counts.size.toLocaleString()} languages.`);
console.log(`GEF learn-from languages: ${learnFrom.size}.`);
console.log(`Outside candidates with >= ${minimumMissingSenses.toLocaleString()} senses: ${outside.length}.`);
console.log(`Wrote ${outputPath}`);
