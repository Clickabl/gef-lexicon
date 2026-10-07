#!/usr/bin/env node
/** Build immutable public name graph artifacts without changing source review state. Node >=22.13. */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileNameGraph } from '../packages/name-graph-v2/compileNameGraph.mjs';
import { migrateLegacyNameFamilies } from '../packages/name-graph-v2/legacyNameGraph.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const options = new Map(); const allowed = new Set(['--input', '--output', '--primary-map']);
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index], value = process.argv[index + 1];
  if (!allowed.has(key) || !value || value.startsWith('--') || options.has(key)) throw new Error('Use --input optional-graph.json --output release/lexi/name-graph-v2 [--primary-map decisions.json]');
  options.set(key, value);
}
if (!options.has('--output')) throw new Error('An explicit --output directory is required; production is never selected implicitly.');
const readJson = async filename => JSON.parse(await readFile(filename, 'utf8'));
try {
  const families = options.has('--input') ? null : await Promise.all((await readdir(path.join(root, 'name-families'))).filter(file => file.endsWith('.json')).sort().map(file => readJson(path.join(root, 'name-families', file))));
  const graph = options.has('--input') ? await readJson(options.get('--input'))
    : migrateLegacyNameFamilies(families, options.has('--primary-map') ? await readJson(options.get('--primary-map')) : {});
  const manifest = await compileNameGraph({ input: graph, outputDirectory: options.get('--output'), bibliography: await readJson(path.join(root, 'sources/bibliography.json')) });
  console.log(JSON.stringify({ status: 'built-not-deployed', manifest }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : 'name_graph_build_failed'); process.exitCode = 1;
}
