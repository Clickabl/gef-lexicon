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

const lessonsRoot = join(ROOT, 'lessons');
if (existsSync(lessonsRoot)) {
  for (const lang of readdirSync(lessonsRoot)) {
    const langDir = join(lessonsRoot, lang);
    if (!statSync(langDir).isDirectory()) continue;
    for (const slug of readdirSync(langDir)) {
      const lessonPath = join(langDir, slug, 'lesson.json');
      if (!existsSync(lessonPath)) continue;
      const lesson = readJson(lessonPath);
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

if (errors) {
  console.error(`\n${errors} curriculum validation error(s).`);
  process.exit(1);
}
console.log(`OK — ${curriculumIds.size} curriculum concepts, ${semanticIds.size} semantic functions, 0 curriculum errors.`);
