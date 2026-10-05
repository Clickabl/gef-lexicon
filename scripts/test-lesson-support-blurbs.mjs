#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(join(fileURLToPath(new URL('..', import.meta.url))));
const VALIDATOR = join(ROOT, 'scripts', 'validate-lesson-support-blurbs.mjs');
const REGISTRY = resolve(ROOT, '..', 'gef-expo', 'registry', 'language-support.json');
const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
const tempRoot = mkdtempSync(join(tmpdir(), 'gef-support-blurb-registry-'));

function run(candidate) {
  const path = join(tempRoot, 'language-support.json');
  writeFileSync(path, `${JSON.stringify(candidate, null, 2)}\n`);
  return spawnSync(process.execPath, [VALIDATOR], {
    encoding: 'utf8',
    env: { ...process.env, GEF_LANGUAGE_SUPPORT_REGISTRY: path },
  });
}

try {
  const current = run(registry);
  assert.equal(current.status, 0, current.stderr);
  assert.match(current.stdout, /exactly cover the current Tier 1–3 learn-from registry/);

  const missing = structuredClone(registry);
  missing.lessonTiers.tier1_full.pop();
  const missingResult = run(missing);
  assert.equal(missingResult.status, 1);
  assert.match(missingResult.stderr, /registry coverage mismatch/);
  assert.match(missingResult.stderr, /extra=\[/);

  const extra = structuredClone(registry);
  extra.lessonTiers.tier2_selective.push('zz');
  const extraResult = run(extra);
  assert.equal(extraResult.status, 1);
  assert.match(extraResult.stderr, /registry coverage mismatch/);
  assert.match(extraResult.stderr, /missing=\[zz\]/);

  const duplicate = structuredClone(registry);
  duplicate.lessonTiers.tier3_read_games.push(duplicate.lessonTiers.tier3_read_games[0]);
  const duplicateResult = run(duplicate);
  assert.equal(duplicateResult.status, 1);
  assert.match(duplicateResult.stderr, /contains duplicate language tags/);

  console.log('✅ Lesson support blurb registry contract and missing/extra/duplicate cohort regressions passed.');
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
