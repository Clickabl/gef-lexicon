#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
let errors = 0;
const fail = (message) => { console.error(`FAIL: ${message}`); errors += 1; };

const ajv = new Ajv({ allErrors: true, strict: false });
const taxonomyValidator = ajv.compile(readJson(join(ROOT, 'schemas', 'curriculum-taxonomy.schema.json')));
const semanticValidator = ajv.compile(readJson(join(ROOT, 'schemas', 'semantic-functions.schema.json')));

const taxonomy = readJson(join(ROOT, 'curriculum', 'taxonomy.json'));
if (!taxonomyValidator(taxonomy)) fail(`curriculum/taxonomy.json: ${JSON.stringify(taxonomyValidator.errors)}`);
const curriculumIds = new Set();
for (const concept of taxonomy.concepts ?? []) {
  if (curriculumIds.has(concept.curriculum_concept_id)) fail(`duplicate curriculum concept ${concept.curriculum_concept_id}`);
  curriculumIds.add(concept.curriculum_concept_id);
}

const semantic = readJson(join(ROOT, 'curriculum', 'semantic-functions.json'));
if (!semanticValidator(semantic)) fail(`curriculum/semantic-functions.json: ${JSON.stringify(semanticValidator.errors)}`);
const semanticIds = new Set();
for (const concept of semantic.semantic_functions ?? []) {
  if (semanticIds.has(concept.semantic_function_id)) fail(`duplicate semantic function ${concept.semantic_function_id}`);
  semanticIds.add(concept.semantic_function_id);
}

const lessonIds = new Set();
const lessonPaths = new Map();
const lessonsRoot = join(ROOT, 'lessons');
if (existsSync(lessonsRoot)) {
  for (const lang of readdirSync(lessonsRoot)) {
    const langDir = join(lessonsRoot, lang);
    if (!statSync(langDir).isDirectory()) continue;
    for (const slug of readdirSync(langDir)) {
      const lessonPath = join(langDir, slug, 'lesson.json');
      if (!existsSync(lessonPath)) continue;
      const lesson = readJson(lessonPath);
      if (!lesson.lesson_id) {
        fail(`${lessonPath}: missing lesson_id`);
        continue;
      }
      if (lessonIds.has(lesson.lesson_id)) {
        fail(`duplicate lesson_id ${lesson.lesson_id}: ${lessonPaths.get(lesson.lesson_id)} and ${lessonPath}`);
      }
      lessonIds.add(lesson.lesson_id);
      lessonPaths.set(lesson.lesson_id, lessonPath);
      for (const id of lesson.curriculum_concept_ids ?? []) {
        if (!curriculumIds.has(id)) fail(`${lesson.lesson_id}: unknown curriculum concept ${id}`);
      }
      for (const rule of lesson.rules ?? []) {
        for (const id of rule.semantic_function_ids ?? []) {
          if (!semanticIds.has(id)) fail(`${rule.rule_id}: unknown semantic function ${id}`);
        }
      }
    }
  }
}

const manifestPath = join(ROOT, 'curriculum', 'lesson-system-manifest.json');
const manifestLessonIds = new Set();
if (existsSync(manifestPath)) {
  const manifest = readJson(manifestPath);
  for (const group of manifest.lesson_groups ?? []) {
    for (const part of group.parts ?? []) {
      const implementationIds = part.implementation_lesson_ids ?? [];
      if (part.implementation_status === 'implemented' && implementationIds.length === 0) {
        fail(`${part.part_id}: implementation_status=implemented but implementation_lesson_ids is empty`);
      }
      for (const lessonId of implementationIds) {
        manifestLessonIds.add(lessonId);
        if (!lessonIds.has(lessonId)) {
          fail(`${part.part_id}: implementation lesson ${lessonId} does not resolve to lessons/**/lesson.json`);
        }
      }
    }
  }
  for (const lessonId of lessonIds) {
    if (!manifestLessonIds.has(lessonId)) {
      fail(`${lessonId}: lesson.json exists but curriculum/lesson-system-manifest.json does not account for it`);
    }
  }
}

const catalogPath = join(ROOT, 'curriculum', 'lesson-catalog.json');
if (existsSync(catalogPath)) {
  const catalog = readJson(catalogPath);
  const priorities = new Set();
  const catalogIds = new Set();
  for (const entry of catalog.lessons ?? []) {
    if (catalogIds.has(entry.lesson_id)) fail(`lesson catalog duplicates ${entry.lesson_id}`);
    catalogIds.add(entry.lesson_id);
    if (!lessonIds.has(entry.lesson_id)) fail(`lesson catalog references missing lesson ${entry.lesson_id}`);
    if (!manifestLessonIds.has(entry.lesson_id)) fail(`lesson catalog references lesson not represented in lesson-system manifest: ${entry.lesson_id}`);
    if (priorities.has(entry.priority)) fail(`lesson catalog duplicates priority ${entry.priority}`);
    priorities.add(entry.priority);
  }
}

if (errors) {
  console.error(`\n${errors} curriculum validation error(s).`);
  process.exit(1);
}
console.log(`OK — ${curriculumIds.size} curriculum concepts, ${semanticIds.size} semantic functions, ${lessonIds.size} lessons, ${manifestLessonIds.size} manifest implementations, 0 curriculum errors.`);
