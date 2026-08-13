import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { deriveLessonDelivery, validateDerivedLessonDelivery } from './lib/lesson-delivery-readiness.mjs';

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

function canonicalLessonDefinitionFiles() {
  return walkJsonFiles('lessons').filter((relativePath) => path.basename(relativePath) === 'lesson.json');
}

function renderingDocuments(relativeLessonPath) {
  const dir = path.join(path.dirname(relativeLessonPath), 'renderings');
  return walkJsonFiles(dir).map((relativePath) => ({ relativePath, document: readJson(relativePath) }));
}

function sameArray(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => value === right[index]);
}

function checkLocalRef(ref, label, errors) {
  if (typeof ref !== 'string' || !ref) return;
  if (ref.startsWith('Clickabl/')) return;
  if (!ref.includes('/')) return;
  const absolute = path.join(root, ref);
  if (!fs.existsSync(absolute)) errors.push(`${label} references missing local path ${ref}`);
}

const artifacts = [
  { dataPath: 'curriculum/lesson-system-manifest.json', schemaPath: 'schemas/lesson-system-manifest.schema.json' },
  { dataPath: 'curriculum/learning-path-template.json', schemaPath: 'schemas/learning-path.schema.json' },
  { dataPath: 'curriculum/related-lessons.json', schemaPath: 'schemas/related-lessons.schema.json' },
  { dataPath: 'curriculum/review-and-release-status.json', schemaPath: 'schemas/review-and-release-status.schema.json' }
];

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const errors = [];

for (const { dataPath, schemaPath } of artifacts) {
  const schema = readJson(schemaPath);
  const data = readJson(dataPath);
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    for (const error of validate.errors ?? []) errors.push(`${dataPath}${error.instancePath || '/'} ${error.message}`);
  }
}

const manifest = readJson('curriculum/lesson-system-manifest.json');
const learningPath = readJson('curriculum/learning-path-template.json');
const related = readJson('curriculum/related-lessons.json');
const statusModel = readJson('curriculum/review-and-release-status.json');
const deliveryPolicy = readJson('curriculum/lesson-delivery-capabilities.json');

if (!sameArray(manifest.status_model.integrity_review_states, statusModel.integrity_review.states)) errors.push('lesson-system manifest integrity review states drifted from curriculum/review-and-release-status.json');
if (!sameArray(manifest.status_model.release_order, statusModel.lesson_release.ladder)) errors.push('lesson-system manifest release order drifted from curriculum/review-and-release-status.json');
if (manifest.status_model.public_beta_minimum !== statusModel.lesson_release.public_beta_minimum) errors.push('lesson-system manifest public beta minimum drifted from curriculum/review-and-release-status.json');

const expectedCapabilityIds = ['presentation','self_study','practice','graded_assignment','reader_quest','annotated_reading','live_classroom'];
if (deliveryPolicy.policy_id !== 'GEF.LESSON_DELIVERY_CAPABILITIES') errors.push('curriculum/lesson-delivery-capabilities.json has an unexpected policy_id');
if (deliveryPolicy.review_state_is_independent !== true) errors.push('Delivery policy must keep integrity review independent from release/delivery readiness');
const policyCapabilityIds = (deliveryPolicy.capabilities ?? []).map((entry) => entry.capability_id);
if (!sameArray(policyCapabilityIds, expectedCapabilityIds)) errors.push(`Delivery capability contract drifted: expected ${expectedCapabilityIds.join(', ')}, got ${policyCapabilityIds.join(', ')}`);
for (const stage of manifest.status_model.release_order) {
  if (!Array.isArray(deliveryPolicy.release_audiences?.[stage])) errors.push(`Delivery policy is missing release audience mapping for ${stage}`);
}

const groupIds = new Set();
const partIds = new Set();
const referencedLessonIds = new Set();
const lessonReferenceOwners = new Map();
const partsByLessonId = new Map();

for (const group of manifest.lesson_groups) {
  if (groupIds.has(group.group_id)) errors.push(`Duplicate group id: ${group.group_id}`);
  groupIds.add(group.group_id);
  for (const familyRef of group.family_refs ?? []) checkLocalRef(familyRef, group.group_id, errors);
  for (const part of group.parts) {
    if (partIds.has(part.part_id)) errors.push(`Duplicate part id: ${part.part_id}`);
    partIds.add(part.part_id);
    const implementationIds = part.implementation_lesson_ids ?? [];
    for (const lessonId of implementationIds) {
      referencedLessonIds.add(lessonId);
      partsByLessonId.set(lessonId, part);
      const owners = lessonReferenceOwners.get(lessonId) ?? [];
      owners.push(part.part_id);
      lessonReferenceOwners.set(lessonId, owners);
    }
    for (const conceptRef of part.core_concept_refs ?? []) checkLocalRef(conceptRef, part.part_id, errors);
    if (part.quest?.ref) checkLocalRef(part.quest.ref, `${part.part_id} quest`, errors);
    if (part.default_reading?.ref) checkLocalRef(part.default_reading.ref, `${part.part_id} default reading`, errors);
    const declaredTier = part.readiness?.default?.available_tier ?? 'none';
    if (implementationIds.length === 0 && declaredTier !== 'none') errors.push(`${part.part_id}: no implementation exists but readiness declares ${declaredTier}`);
    if (part.implementation_status === 'planned' && implementationIds.length > 0) errors.push(`${part.part_id}: implementation_status=planned cannot bind implementation_lesson_ids; use partial or implemented`);
  }
}

for (const [lessonId, owners] of lessonReferenceOwners) {
  if (owners.length > 1) errors.push(`lesson_id ${lessonId} is bound to multiple lesson parts: ${owners.join(', ')}`);
}
for (const group of manifest.lesson_groups) {
  for (const part of group.parts) {
    for (const prerequisite of part.prerequisite_part_ids ?? []) if (!partIds.has(prerequisite)) errors.push(`${part.part_id} references unknown prerequisite ${prerequisite}`);
  }
}

const pathItemIds = new Set();
const pathPartRefs = new Set();
for (const item of learningPath.default_items) {
  if (pathItemIds.has(item.item_id)) errors.push(`Duplicate default path item id: ${item.item_id}`);
  pathItemIds.add(item.item_id);
  if (item.kind === 'lesson_part') {
    pathPartRefs.add(item.ref);
    if (!partIds.has(item.ref)) errors.push(`${item.item_id} references unknown lesson part ${item.ref}`);
  }
  for (const prerequisite of item.prerequisite_refs ?? []) if (!partIds.has(prerequisite)) errors.push(`${item.item_id} references unknown prerequisite ${prerequisite}`);
}
for (const languageOverride of learningPath.language_overrides) {
  for (const operation of languageOverride.operations) {
    const inserted = operation.item ?? operation.replacement_item;
    if (inserted?.kind === 'lesson_part') {
      pathPartRefs.add(inserted.ref);
      if (!partIds.has(inserted.ref)) errors.push(`Learning-path override ${languageOverride.language}/${operation.item_id} references unknown lesson part ${inserted.ref}`);
    }
    if (operation.relative_to_item_id && !pathItemIds.has(operation.relative_to_item_id)) errors.push(`Learning-path override ${languageOverride.language}/${operation.item_id} references unknown relative item ${operation.relative_to_item_id}`);
  }
}
for (const partId of partIds) if (!pathPartRefs.has(partId)) errors.push(`Lesson part ${partId} is missing from the default learning path and all language overrides`);

const graphRefs = new Set([...groupIds, ...partIds]);
for (const edge of related.edges) {
  if (!graphRefs.has(edge.from_ref)) errors.push(`${edge.edge_id} has unknown from_ref ${edge.from_ref}`);
  if (!graphRefs.has(edge.to_ref)) errors.push(`${edge.edge_id} has unknown to_ref ${edge.to_ref}`);
}

const actualLessonIds = new Map();
const lessonDocuments = new Map();
for (const relativePath of canonicalLessonDefinitionFiles()) {
  let lesson;
  try { lesson = readJson(relativePath); } catch (error) { errors.push(`Could not parse ${relativePath}: ${error.message}`); continue; }
  if (!lesson.lesson_id) { errors.push(`Canonical lesson definition ${relativePath} is missing lesson_id`); continue; }
  if (actualLessonIds.has(lesson.lesson_id)) errors.push(`Duplicate lesson_id ${lesson.lesson_id} in ${actualLessonIds.get(lesson.lesson_id)} and ${relativePath}`);
  else { actualLessonIds.set(lesson.lesson_id, relativePath); lessonDocuments.set(lesson.lesson_id, lesson); }
}
for (const lessonId of referencedLessonIds) if (!actualLessonIds.has(lessonId)) errors.push(`Manifest references missing lesson_id ${lessonId}`);
for (const [lessonId, relativePath] of actualLessonIds) if (!referencedLessonIds.has(lessonId)) errors.push(`Lesson definition ${lessonId} in ${relativePath} is not represented by any manifest lesson part`);

for (const [lessonId, relativePath] of actualLessonIds) {
  const part = partsByLessonId.get(lessonId);
  const lesson = lessonDocuments.get(lessonId);
  if (!part || !lesson) continue;
  let renderings = [];
  try { renderings = renderingDocuments(relativePath); } catch (error) { errors.push(`${lessonId}: could not parse support-language renderings: ${error.message}`); continue; }
  for (const rendering of renderings) if (rendering.document.lesson_id !== lessonId) errors.push(`${rendering.relativePath}: rendering lesson_id ${rendering.document.lesson_id ?? 'missing'} does not match ${lessonId}`);
  const delivery = deriveLessonDelivery({ part, lesson, renderings });
  errors.push(...validateDerivedLessonDelivery({ part, lesson, renderings, delivery }));
}

const declaredComponentIds = new Set(manifest.component_catalog.map((component) => component.component_id));
for (const group of manifest.lesson_groups) {
  for (const part of group.parts) {
    for (const componentId of Object.keys(part.readiness?.default?.components ?? {})) if (!declaredComponentIds.has(componentId)) errors.push(`${part.part_id}: readiness references undeclared component ${componentId}`);
  }
}

if (manifest.coverage_policy.language_program_pointer !== '/programs/learnFromLanguages') errors.push('Canonical language program pointer must remain /programs/learnFromLanguages');
if (manifest.coverage_policy.counts_must_be_derived !== true) errors.push('Language counts must be derived, never hard-coded in the universal lesson system');
if (manifest.readiness_resolution.pair_matrix_is_materialized !== false) errors.push('Directional pair readiness must resolve from overrides rather than a materialized source×target matrix');

if (errors.length) {
  console.error(`Universal lesson SSOT validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Universal lesson SSOT valid: ${groupIds.size} groups, ${partIds.size} parts, ${actualLessonIds.size} canonical lesson definitions indexed with bidirectional manifest/path parity, deterministic implementation resolution, and derived delivery capabilities.`);
