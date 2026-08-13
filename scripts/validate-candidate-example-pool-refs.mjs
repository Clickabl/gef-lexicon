#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POOL_ID = /^LEPOOL\.[A-Za-z0-9._-]+$/;
const CONTENT_POOL_REF = /^Clickabl\/gef-content\/lesson-example-pools\/[A-Za-z0-9._-]+\.json$/;
const USES = new Set(['default_reading', 'quest', 'examples', 'practice']);
let errors = 0;
let lessonCount = 0;
let refCount = 0;

function fail(message) {
  console.error(`FAIL: ${message}`);
  errors += 1;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function dirs(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path).filter((name) => statSync(join(path, name)).isDirectory());
}

const lessonsRoot = join(ROOT, 'lessons');
for (const language of dirs(lessonsRoot)) {
  for (const slug of dirs(join(lessonsRoot, language))) {
    const path = join(lessonsRoot, language, slug, 'lesson.json');
    if (!existsSync(path)) continue;
    const lesson = readJson(path);
    lessonCount += 1;
    const refs = lesson.candidate_example_pool_refs;
    if (refs === undefined) continue;
    if (!Array.isArray(refs) || refs.length === 0) {
      fail(`${lesson.lesson_id}: candidate_example_pool_refs must be a non-empty array when present`);
      continue;
    }

    const seenPools = new Set();
    for (const [index, ref] of refs.entries()) {
      const label = `${lesson.lesson_id}/candidate_example_pool_refs[${index}]`;
      refCount += 1;
      if (!POOL_ID.test(ref?.pool_id ?? '')) fail(`${label}: invalid pool_id ${ref?.pool_id}`);
      if (seenPools.has(ref?.pool_id)) fail(`${label}: duplicate pool_id ${ref?.pool_id}`);
      seenPools.add(ref?.pool_id);
      if (!CONTENT_POOL_REF.test(ref?.repo_ref ?? '')) {
        fail(`${label}: repo_ref must point to Clickabl/gef-content/lesson-example-pools/*.json`);
      }
      if (ref?.review_state !== 'candidate') {
        fail(`${label}: candidate_example_pool_refs may only point at candidate evidence; got ${ref?.review_state}`);
      }
      if (!Array.isArray(ref?.intended_uses) || ref.intended_uses.length === 0) {
        fail(`${label}: intended_uses must be a non-empty array`);
      } else {
        const seenUses = new Set();
        for (const use of ref.intended_uses) {
          if (!USES.has(use)) fail(`${label}: unsupported intended use ${use}`);
          if (seenUses.has(use)) fail(`${label}: duplicate intended use ${use}`);
          seenUses.add(use);
        }
      }
      if (typeof ref?.notes !== 'string' || ref.notes.trim().length === 0) {
        fail(`${label}: notes must explain why the pool is only a candidate and what review remains`);
      }
    }
  }
}

if (errors) {
  console.error(`\n${errors} candidate example-pool reference error(s).`);
  process.exit(1);
}
console.log(`OK — ${refCount} candidate example-pool ref(s) across ${lessonCount} lesson definition(s) use the canonical cross-repo contract.`);
