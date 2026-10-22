#!/usr/bin/env node
/**
 * Name pipeline, step 3: compile the V2 name graph into lexi/name-graph-v2/, the path the CDN serves at
 * https://cdn.clickabl.co/gef/lexicon/v1/lexi/name-graph-v2/manifest.json after the next push to main.
 *
 * Uses the existing compiler (compile-name-graph-v2.mjs), the pipeline's mechanical primary map and its list of attested
 * secondary spellings (the only secondary spellings that reveal their family), then removes every
 * immutable build directory the new manifest no longer points at, so the published tree holds exactly one graph.
 * Producing these files is not deployment: the push is.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PIPELINE_DIR, REPO_ROOT } from './common.mjs';

const output = join(REPO_ROOT, 'lexi', 'name-graph-v2');
const stdout = execFileSync(process.execPath, [join(REPO_ROOT, 'scripts', 'compile-name-graph-v2.mjs'), '--output', output, '--primary-map', join(PIPELINE_DIR, 'primary-map.json'), '--attested-secondary', join(PIPELINE_DIR, 'attested-secondary.json')], { encoding: 'utf8' });
const manifest = JSON.parse(readFileSync(join(output, 'manifest.json'), 'utf8'));
const live = manifest.graph.sha256;
for (const entry of readdirSync(output)) {
  if (entry === 'manifest.json' || entry === live) continue;
  if (statSync(join(output, entry)).isDirectory() && /^[a-f0-9]{64}$/.test(entry)) rmSync(join(output, entry), { recursive: true });
}
console.log(stdout.trim());
