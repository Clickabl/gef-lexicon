#!/usr/bin/env node
/**
 * Compile the canonical universal Lesson SSOT into a compact registry that Lexi,
 * admin tooling, and runtime packaging can consume without inventing a second
 * lesson catalog. Pedagogical depth and delivery completeness stay separate.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveLessonDelivery, implementationResolution } from './lib/lesson-delivery-readiness.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'dist', 'dictionaries', 'shared');
const MANIFEST = join(ROOT, 'curriculum', 'lesson-system-manifest.json');
const STATUS = join(ROOT, 'curriculum', 'review-and-release-status.json');
const DELIVERY_POLICY = join(ROOT, 'curriculum', 'lesson-delivery-capabilities.json');

function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }

function walkLessonFiles(root) {
  const result = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    if (!existsSync(current)) continue;
    for (const name of readdirSync(current)) {
      const child = join(current, name);
      const stat = statSync(child);
      if (stat.isDirectory()) stack.push(child);
      else if (name === 'lesson.json') result.push(child);
    }
  }
  return result.sort();
}

function renderingSummaries(lessonPath) {
  const dir = join(dirname(lessonPath), 'renderings');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const path = join(dir, name);
      const document = readJson(path);
      return {
        document,
        support_language_tag: document.support_language_tag ?? name.replace(/\.json$/u, ''),
        title: document.title ?? null,
        summary: document.summary ?? document.invitation ?? null,
        invitation: document.invitation ?? null,
        rendering_review_state: document.review_state ?? null,
        rendering_trust_state: document.trust_state ?? null,
        source_path: path.slice(ROOT.length + 1),
      };
    });
}

function publicRendering(rendering) {
  const { document: _document, ...summary } = rendering;
  return summary;
}

const manifest = readJson(MANIFEST);
const statusModel = readJson(STATUS);
const deliveryPolicy = readJson(DELIVERY_POLICY);
const lessonsById = new Map();
for (const path of walkLessonFiles(join(ROOT, 'lessons'))) {
  const lesson = readJson(path);
  if (!lesson.lesson_id) continue;
  if (lessonsById.has(lesson.lesson_id)) throw new Error(`Duplicate lesson_id ${lesson.lesson_id}`);
  lessonsById.set(lesson.lesson_id, { path, lesson });
}

const lessonRegistry = [];
const plannedParts = [];
for (const group of manifest.lesson_groups ?? []) {
  for (const part of group.parts ?? []) {
    const implementationIds = part.implementation_lesson_ids ?? [];
    const partResolution = implementationResolution(part);
    if (implementationIds.length === 0) {
      plannedParts.push({
        group_id: group.group_id,
        group_title: group.title,
        part_id: part.part_id,
        part_title: part.title,
        implementation_status: part.implementation_status,
        pedagogical_tier: part.readiness?.default?.available_tier ?? 'none',
        release_stage: part.readiness?.default?.release_stage ?? 'machine_created',
        review_state: part.readiness?.default?.review_state ?? 'candidate',
        implementation_resolution: partResolution,
        gaps: part.gaps ?? [],
      });
      continue;
    }

    for (const lessonId of implementationIds) {
      const found = lessonsById.get(lessonId);
      if (!found) throw new Error(`SSOT references missing lesson ${lessonId}`);
      const triggers = found.lesson.triggers ?? [];
      const tapTriggers = triggers.filter((trigger) => trigger.trigger_type === 'tap');
      const renderings = renderingSummaries(found.path);
      const delivery = deriveLessonDelivery({ part, lesson: found.lesson, renderings });
      const english = renderings.find((rendering) => rendering.support_language_tag === 'en') ?? renderings[0] ?? null;

      lessonRegistry.push({
        lesson_id: lessonId,
        lesson_version: found.lesson.version ?? 1,
        lesson_source_path: found.path.slice(ROOT.length + 1),
        target_language: found.lesson.target_language ?? 'mul',
        lesson_review_state: found.lesson.review_state ?? 'candidate',
        group_id: group.group_id,
        group_title: group.title,
        part_id: part.part_id,
        part_title: part.title,
        implementation_status: part.implementation_status,
        pedagogical_tier: delivery.pedagogical_tier,
        release_stage: delivery.release_stage,
        review_state: delivery.review_state,
        audiences: delivery.audiences,
        delivery_capabilities: delivery.capabilities,
        capability_evidence: delivery.evidence,
        component_status: delivery.component_status,
        implementation_resolution: delivery.implementation_resolution,
        required_components: part.required_components ?? [],
        gaps: part.gaps ?? [],
        quest: part.quest ?? null,
        default_reading: part.default_reading ?? null,
        session_policy: found.lesson.session_policy ?? null,
        language_capabilities_manifest: found.lesson.language_capabilities_manifest ?? null,
        renderings: renderings.map(publicRendering),
        rendering: english ? publicRendering(english) : null,
        tap_offer_contract: {
          eligible: tapTriggers.length > 0,
          trigger_ids: tapTriggers.map((trigger) => trigger.trigger_id),
          note: tapTriggers.length > 0
            ? 'A tap offer may be resolved only from canonical lexical/occurrence evidence; this registry never invents a surface match.'
            : 'No canonical tap trigger is declared for this lesson. Manual/path/catalog discovery may still be valid.',
        },
      });
    }
  }
}

lessonRegistry.sort((a, b) => a.lesson_id.localeCompare(b.lesson_id));
if (lessonRegistry.length !== lessonsById.size) {
  throw new Error(`Expected ${lessonsById.size} canonical lessons in SSOT registry, compiled ${lessonRegistry.length}`);
}
const registryIds = new Set(lessonRegistry.map((entry) => entry.lesson_id));
for (const lessonId of lessonsById.keys()) {
  if (!registryIds.has(lessonId)) throw new Error(`Canonical lesson ${lessonId} is absent from SSOT registry`);
}

const document = {
  schema_version: 2,
  canonical_source: 'curriculum/lesson-system-manifest.json',
  status_model_source: 'curriculum/review-and-release-status.json',
  delivery_policy_source: 'curriculum/lesson-delivery-capabilities.json',
  manifest_schema_version: manifest.schema_version,
  status_schema_version: statusModel.schema_version,
  delivery_policy_version: deliveryPolicy.version,
  implemented_lesson_count: lessonRegistry.length,
  planned_part_count: plannedParts.length,
  lessons: lessonRegistry,
  planned_parts: plannedParts,
};

mkdirSync(OUT_DIR, { recursive: true });
const output = join(OUT_DIR, 'lesson-ssot-v1.json');
writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
console.log(`🧭 SSOT lesson registry: ${lessonRegistry.length} implemented lessons, ${plannedParts.length} planned parts.`);
console.log(`📦 ${output.slice(ROOT.length + 1)}`);
