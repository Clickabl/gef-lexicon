#!/usr/bin/env node
/** Build immutable public name graph artifacts without changing source review state. Node >=22.13. */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileNameGraph } from '../packages/name-graph-v2/compileNameGraph.mjs';
import { migrateLegacyNameFamilies } from '../packages/name-graph-v2/legacyNameGraph.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const options = new Map(); const allowed = new Set(['--input', '--output', '--primary-map', '--attested-secondary']);
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index], value = process.argv[index + 1];
  if (!allowed.has(key) || !value || value.startsWith('--') || options.has(key)) throw new Error('Use --input optional-graph.json --output release/lexi/name-graph-v2 [--primary-map decisions.json] [--attested-secondary attested.json]');
  options.set(key, value);
}
if (!options.has('--output')) throw new Error('An explicit --output directory is required; production is never selected implicitly.');
const readJson = async filename => JSON.parse(await readFile(filename, 'utf8'));
// { "form_ids": [...] }: non-primary forms whose own sourced entry attests them (name pipeline output). Not used with --input.
async function readAttestedSecondary(filename) {
  const document = await readJson(filename);
  if (!Array.isArray(document?.form_ids) || document.form_ids.some(value => typeof value !== 'string')) throw new Error('name_attested_secondary_file_invalid');
  return document.form_ids;
}
try {
  if (options.has('--input') && options.has('--attested-secondary')) throw new Error('name_attested_secondary_requires_family_input');
  const families = options.has('--input') ? null : await Promise.all((await readdir(path.join(root, 'name-families'))).filter(file => file.endsWith('.json')).sort().map(file => readJson(path.join(root, 'name-families', file))));
  const graph = options.has('--input') ? await readJson(options.get('--input'))
    : migrateLegacyNameFamilies(families, options.has('--primary-map') ? await readJson(options.get('--primary-map')) : {},
      { attestedSecondaryFormIds: options.has('--attested-secondary') ? await readAttestedSecondary(options.get('--attested-secondary')) : [] });
  const manifest = await compileNameGraph({ input: graph, outputDirectory: options.get('--output'), bibliography: await readJson(path.join(root, 'sources/bibliography.json')) });
  console.log(JSON.stringify({ status: 'built-not-deployed', manifest }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : 'name_graph_build_failed'); process.exitCode = 1;
}
