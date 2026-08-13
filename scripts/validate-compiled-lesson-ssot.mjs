#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist', 'dictionaries', 'shared', 'lesson-ssot-v2.json');
const MANIFEST = join(ROOT, 'curriculum', 'lesson-system-manifest.json');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };

function walkLessonFiles(root) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    if (!existsSync(current)) continue;
    for (const name of readdirSync(current)) {
      const child = join(current, name);
      const stat = statSync(child);
      if (stat.isDirectory()) stack.push(child);
      else if (name === 'lesson.json') files.push(child);
    }
  }
  return files;
}

check(existsSync(OUT), 'compiled lesson SSOT v2 is missing; run scripts/compile-lesson-ssot-registry.mjs first');
if (!existsSync(OUT)) {
  for (const error of errors) console.error(`COMPILED LESSON SSOT ERROR: ${error}`);
  process.exit(1);
}

const manifest = readJson(MANIFEST);
const compiled = readJson(OUT);
check(compiled.schema_version === 2, 'compiled lesson SSOT schema_version must be 2');
check(compiled.canonical_source === 'curriculum/lesson-system-manifest.json', 'compiled lesson SSOT canonical source drifted');
check(compiled.counts_must_be_derived === true, 'compiled lesson SSOT must preserve derived-count policy');
check(JSON.stringify(compiled.completeness_tiers) === JSON.stringify(['core', 'full']), 'compiled lesson SSOT must preserve Core/Full vocabulary');
check(Array.isArray(compiled.readiness_precedence) && compiled.readiness_precedence.length > 0, 'compiled lesson SSOT must export readiness precedence');
check(compiled.public_beta_minimum === manifest.status_model?.public_beta_minimum, 'compiled public-beta minimum drifted from lesson SSOT');
check(JSON.stringify(compiled.release_order) === JSON.stringify(manifest.status_model?.release_order), 'compiled release order drifted from lesson SSOT');

const partByLesson = new Map();
for (const group of manifest.lesson_groups ?? []) {
  for (const part of group.parts ?? []) {
    for (const lessonId of part.implementation_lesson_ids ?? []) {
      if (partByLesson.has(lessonId)) errors.push(`lesson ${lessonId} is mapped from more than one canonical part`);
      partByLesson.set(lessonId, part);
    }
  }
}

const lessonById = new Map();
for (const path of walkLessonFiles(join(ROOT, 'lessons'))) {
  const lesson = readJson(path);
  if (lesson.lesson_id) lessonById.set(lesson.lesson_id, lesson);
}

check(compiled.lessons?.length === partByLesson.size, `compiled lesson count ${compiled.lessons?.length ?? 0} does not match manifest implementation count ${partByLesson.size}`);
for (const entry of compiled.lessons ?? []) {
  const part = partByLesson.get(entry.lesson_id);
  const lesson = lessonById.get(entry.lesson_id);
  check(Boolean(part), `compiled lesson ${entry.lesson_id} is not mapped by the canonical manifest`);
  check(Boolean(lesson), `compiled lesson ${entry.lesson_id} has no lesson.json`);
  if (!part || !lesson) continue;

  check(JSON.stringify(entry.readiness ?? null) === JSON.stringify(part.readiness ?? null), `${entry.lesson_id} compiled readiness does not exactly preserve the canonical part readiness graph`);
  const defaultReadiness = part.readiness?.default ?? null;
  check(JSON.stringify(entry.default_readiness ?? null) === JSON.stringify(defaultReadiness), `${entry.lesson_id} default readiness projection drifted`);
  check(entry.default_available_tier === (defaultReadiness?.available_tier ?? 'none'), `${entry.lesson_id} default available tier drifted`);
  check(entry.default_release_stage === (defaultReadiness?.release_stage ?? 'machine_created'), `${entry.lesson_id} default release stage drifted`);
  check(entry.default_review_state === (defaultReadiness?.review_state ?? 'candidate'), `${entry.lesson_id} default readiness review state drifted`);
  check(entry.lesson_review_state === (lesson.review_state ?? 'candidate'), `${entry.lesson_id} lesson integrity review state drifted`);

  const canonicalTap = (lesson.triggers ?? []).filter((trigger) => trigger.trigger_type === 'tap');
  const compiledTap = entry.tap_offer_contract?.triggers ?? [];
  check(entry.tap_offer_contract?.eligible === (canonicalTap.length > 0), `${entry.lesson_id} tap eligibility drifted`);
  check(JSON.stringify(compiledTap) === JSON.stringify(canonicalTap.map((trigger) => ({
    trigger_id: trigger.trigger_id,
    match_any: trigger.match_any ?? [],
    feature_bundle: trigger.feature_bundle ?? null,
    notes: trigger.notes ?? null,
  }))), `${entry.lesson_id} compiled tap typed refs drifted from lesson.json`);

  check(!('core_status' in entry), `${entry.lesson_id} must not reintroduce obsolete core_status projection`);
  check(!('full_status' in entry), `${entry.lesson_id} must not reintroduce obsolete full_status projection`);
  check(!('release_status' in entry), `${entry.lesson_id} must not reintroduce obsolete release_status projection`);
}

if (errors.length) {
  for (const error of errors) console.error(`COMPILED LESSON SSOT ERROR: ${error}`);
  process.exit(1);
}

console.log(`OK — compiled lesson SSOT v2 preserves ${compiled.lessons.length} canonical lesson readiness graphs, typed tap contracts, and the ${compiled.public_beta_minimum} public-beta gate.`);
