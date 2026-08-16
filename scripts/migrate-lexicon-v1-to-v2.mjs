#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { normalizeLexiconDocument } from './lib/lexicon-v2.mjs';

const args = process.argv.slice(2);
const input = args.find((arg) => !arg.startsWith('--'));
const outIndex = args.indexOf('--out');
const output = outIndex >= 0 ? args[outIndex + 1] : undefined;
if (!input) {
  console.error('Usage: node scripts/migrate-lexicon-v1-to-v2.mjs <lexicon.json> [--out <lexicon-v2.json>]');
  process.exit(2);
}

const inputPath = resolve(input);
const raw = JSON.parse(readFileSync(inputPath, 'utf8'));
const normalized = normalizeLexiconDocument(raw);
const serialized = `${JSON.stringify(normalized, null, 2)}\n`;
if (output) {
  const outputPath = resolve(output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, serialized, 'utf8');
  console.error(`Migrated ${inputPath} -> ${outputPath}`);
} else {
  process.stdout.write(serialized);
}
