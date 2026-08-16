#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { buildSenseCard, mergeLexiconPackages, normalizeLexiconDocument } from './lib/lexicon-v2.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const language = value('--language');
const senseId = value('--sense');
const interfaceLanguage = value('--interface') ?? 'en';
if (!language || !senseId) {
  console.error('Usage: node scripts/build-sense-card.mjs --language <tag> --sense <sense_id> [--interface <tag>]');
  process.exit(2);
}

const dir = join(ROOT, 'languages', language);
const files = readdirSync(dir).filter((name) => /^lexicon(?:-[a-z0-9-]+)?\.json$/iu.test(name)).sort();
if (!files.length) throw new Error(`No lexicon source files found for '${language}'.`);
const pkg = mergeLexiconPackages(files.map((name) => normalizeLexiconDocument(JSON.parse(readFileSync(join(dir, name), 'utf8')))));
const card = buildSenseCard(pkg, senseId, interfaceLanguage);
const schema = JSON.parse(readFileSync(join(ROOT, 'schemas', 'sense-card-v1.schema.json'), 'utf8'));
const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
if (!validate(card)) throw new Error(`Sense Card schema validation failed: ${JSON.stringify(validate.errors)}`);
process.stdout.write(`${JSON.stringify(card, null, 2)}\n`);
