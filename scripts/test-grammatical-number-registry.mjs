#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const VALIDATOR = join(ROOT, 'scripts', 'validate-grammatical-number-lesson.mjs');
const REGISTRY = resolve(ROOT, '..', 'gef-expo', 'registry', 'language-support.json');
const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
const tempRoot = mkdtempSync(join(tmpdir(), 'gef-grammatical-number-registry-'));

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
  assert.match(current.stdout, /104 source comparisons/);

  const changedSchemaVersion = structuredClone(registry);
  changedSchemaVersion.schemaVersion = 4;
  const schemaResult = run(changedSchemaVersion);
  assert.equal(schemaResult.status, 0, schemaResult.stderr);

  const missing = structuredClone(registry);
  missing.lessonTiers.tier1_full.pop();
  const missingResult = run(missing);
  assert.equal(missingResult.status, 1);
  assert.match(missingResult.stderr, /Tier 1 comparison records do not match/);

  const extra = structuredClone(registry);
  extra.lessonTiers.tier3_read_games.push('zz');
  const extraResult = run(extra);
  assert.equal(extraResult.status, 1);
  assert.match(extraResult.stderr, /Tier 3 comparison records do not match/);

  const duplicate = structuredClone(registry);
  duplicate.lessonTiers.tier2_selective.push(duplicate.lessonTiers.tier2_selective[0]);
  const duplicateResult = run(duplicate);
  assert.equal(duplicateResult.status, 1);
  assert.match(duplicateResult.stderr, /Tier 2 comparison records do not match/);

  console.log('✅ Grammatical-number registry tier mapping and missing/extra/duplicate cohort regressions passed.');
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
