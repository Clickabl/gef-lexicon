import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function walkJsonFiles(relativeDir) {
  const absoluteDir = path.join(root, relativeDir);
  const results = [];
  if (!fs.existsSync(absoluteDir)) return results;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const childRelative = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) results.push(...walkJsonFiles(childRelative));
    else if (entry.isFile() && entry.name.endsWith('.json')) results.push(childRelative);
  }
  return results;
}

const artifacts = [
  {
    dataPath: 'curriculum/lesson-system-manifest.json',
    schemaPath: 'schemas/lesson-system-manifest.schema.json'
  },
  {
    dataPath: 'curriculum/learning-path-template.json',
    schemaPath: 'schemas/learning-path.schema.json'
  },
  {
    dataPath: 'curriculum/related-lessons.json',
    schemaPath: 'schemas/related-lessons.schema.json'
  }
];

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const errors = [];

for (const { dataPath, schemaPath } of artifacts) {
  const schema = readJson(schemaPath);
  const data = readJson(dataPath);
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    for (const error of validate.errors ?? []) {
      errors.push(`${dataPath}${error.instancePath || '/'} ${error.message}`);
    }
  }
}

const manifest = readJson('curriculum/lesson-system-manifest.json');
const learningPath = readJson('curriculum/learning-path-template.json');
const related = readJson('curriculum/related-lessons.json');

const groupIds = new Set();
const partIds = new Set();
const referencedLessonIds = new Set();

for (const group of manifest.lesson_groups) {
  if (groupIds.has(group.group_id)) errors.push(`Duplicate group id: ${group.group_id}`);
  groupIds.add(group.group_id);

  for (const part of group.parts) {
    if (partIds.has(part.part_id)) errors.push(`Duplicate part id: ${part.part_id}`);
    partIds.add(part.part_id);
    for (const lessonId of part.implementation_lesson_ids ?? []) referencedLessonIds.add(lessonId);
  }
}

for (const group of manifest.lesson_groups) {
  for (const part of group.parts) {
    for (const prerequisite of part.prerequisite_part_ids ?? []) {
      if (!partIds.has(prerequisite)) {
        errors.push(`${part.part_id} references unknown prerequisite ${prerequisite}`);
      }
    }
  }
}

const pathItemIds = new Set();
for (const item of learningPath.default_items) {
  if (pathItemIds.has(item.item_id)) errors.push(`Duplicate default path item id: ${item.item_id}`);
  pathItemIds.add(item.item_id);
  if (item.kind === 'lesson_part' && !partIds.has(item.ref)) {
    errors.push(`${item.item_id} references unknown lesson part ${item.ref}`);
  }
  for (const prerequisite of item.prerequisite_refs ?? []) {
    if (!partIds.has(prerequisite)) errors.push(`${item.item_id} references unknown prerequisite ${prerequisite}`);
  }
}

for (const languageOverride of learningPath.language_overrides) {
  for (const operation of languageOverride.operations) {
    const inserted = operation.item ?? operation.replacement_item;
    if (inserted?.kind === 'lesson_part' && !partIds.has(inserted.ref)) {
      errors.push(`Learning-path override ${languageOverride.language}/${operation.item_id} references unknown lesson part ${inserted.ref}`);
    }
    if (operation.relative_to_item_id && !pathItemIds.has(operation.relative_to_item_id)) {
      errors.push(`Learning-path override ${languageOverride.language}/${operation.item_id} references unknown relative item ${operation.relative_to_item_id}`);
    }
  }
}

const graphRefs = new Set([...groupIds, ...partIds]);
for (const edge of related.edges) {
  if (!graphRefs.has(edge.from_ref)) errors.push(`${edge.edge_id} has unknown from_ref ${edge.from_ref}`);
  if (!graphRefs.has(edge.to_ref)) errors.push(`${edge.edge_id} has unknown to_ref ${edge.to_ref}`);
}

const actualLessonIds = new Map();
for (const relativePath of walkJsonFiles('lessons')) {
  let lesson;
  try {
    lesson = readJson(relativePath);
  } catch (error) {
    errors.push(`Could not parse ${relativePath}: ${error.message}`);
    continue;
  }
  if (!lesson.lesson_id) continue;
  if (actualLessonIds.has(lesson.lesson_id)) {
    errors.push(`Duplicate lesson_id ${lesson.lesson_id} in ${actualLessonIds.get(lesson.lesson_id)} and ${relativePath}`);
  } else {
    actualLessonIds.set(lesson.lesson_id, relativePath);
  }
}

for (const lessonId of referencedLessonIds) {
  if (!actualLessonIds.has(lessonId)) errors.push(`Manifest references missing lesson_id ${lessonId}`);
}

const requiredComponentIds = new Set(
  manifest.component_catalog.flatMap((component) => component.required_for.length ? [component.component_id] : [])
);
const declaredComponentIds = new Set(manifest.component_catalog.map((component) => component.component_id));
for (const componentId of requiredComponentIds) {
  if (!declaredComponentIds.has(componentId)) errors.push(`Required component is not declared: ${componentId}`);
}

if (manifest.coverage_policy.language_program_pointer !== '/programs/learnFromLanguages') {
  errors.push('Canonical language program pointer must remain /programs/learnFromLanguages');
}
if (manifest.coverage_policy.counts_must_be_derived !== true) {
  errors.push('Language counts must be derived, never hard-coded in the lesson system');
}
if (manifest.readiness_resolution.pair_matrix_is_materialized !== false) {
  errors.push('Directional pair readiness must resolve from overrides rather than a materialized source×target matrix');
}

if (errors.length) {
  console.error(`Universal lesson SSOT validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Universal lesson SSOT valid: ${groupIds.size} groups, ${partIds.size} parts, ${actualLessonIds.size} lesson definitions indexed.`);
