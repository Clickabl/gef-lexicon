#!/usr/bin/env node
/**
 * Compile the canonical universal Lesson SSOT into a compact registry that Lexi,
 * admin tooling, and runtime packaging can consume without inventing a second
 * lesson catalog. Readiness remains a projection of the canonical manifest,
 * including directional overrides; this compiler never promotes trust.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'dist', 'dictionaries', 'shared');
const MANIFEST = join(ROOT, 'curriculum', 'lesson-system-manifest.json');
const STATUS = join(ROOT, 'curriculum', 'review-and-release-status.json');

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

function renderingSummary(lessonPath) {
  const path = join(dirname(lessonPath), 'renderings', 'en.json');
  if (!existsSync(path)) return null;
  const doc = readJson(path);
  return {
    title_en: doc.title ?? null,
    summary_en: doc.summary ?? doc.invitation ?? null,
    rendering_review_state: doc.review_state ?? null,
    rendering_trust_state: doc.trust_state ?? null,
    source_path: path.slice(ROOT.length + 1),
  };
}

function readinessProjection(part) {
  const readiness = part.readiness ?? null;
  const defaultReadiness = readiness?.default ?? null;
  return {
    readiness,
    default_readiness: defaultReadiness,
    default_available_tier: defaultReadiness?.available_tier ?? 'none',
    default_release_stage: defaultReadiness?.release_stage ?? 'machine_created',
    default_review_state: defaultReadiness?.review_state ?? 'candidate',
  };
}

function tapOfferContract(lesson) {
  const tapTriggers = (lesson.triggers ?? []).filter((trigger) => trigger.trigger_type === 'tap');
  return {
    eligible: tapTriggers.length > 0,
    triggers: tapTriggers.map((trigger) => ({
      trigger_id: trigger.trigger_id,
      match_any: trigger.match_any ?? [],
      feature_bundle: trigger.feature_bundle ?? null,
      notes: trigger.notes ?? null,
    })),
    note: tapTriggers.length > 0
      ? 'A tap offer may be resolved only from canonical typed lexical/occurrence evidence and resolved lesson readiness; this registry never invents a surface match.'
      : 'No canonical tap trigger is declared for this lesson. Manual/path/catalog discovery may still be valid.',
  };
}

const manifest = readJson(MANIFEST);
const statusModel = readJson(STATUS);
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
    const readiness = readinessProjection(part);
    if (implementationIds.length === 0) {
      plannedParts.push({
        group_id: group.group_id,
        group_title: group.title,
        part_id: part.part_id,
        part_title: part.title,
        implementation_status: part.implementation_status,
        cefr: part.cefr ?? null,
        prerequisite_part_ids: part.prerequisite_part_ids ?? [],
        core_concept_refs: part.core_concept_refs ?? [],
        required_components: part.required_components ?? [],
        quest: part.quest ?? null,
        default_reading: part.default_reading ?? null,
        ui_component_refs: part.ui_component_refs ?? [],
        ...readiness,
        gaps: part.gaps ?? [],
      });
      continue;
    }

    for (const lessonId of implementationIds) {
      const found = lessonsById.get(lessonId);
      if (!found) throw new Error(`SSOT references missing lesson ${lessonId}`);
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
        cefr: part.cefr ?? null,
        prerequisite_part_ids: part.prerequisite_part_ids ?? [],
        core_concept_refs: part.core_concept_refs ?? [],
        required_components: part.required_components ?? [],
        quest: part.quest ?? null,
        default_reading: part.default_reading ?? null,
        ui_component_refs: part.ui_component_refs ?? [],
        ...readiness,
        gaps: part.gaps ?? [],
        rules: (found.lesson.rules ?? []).map((rule) => ({
          rule_id: rule.rule_id,
          order: rule.order,
          match_refs: rule.match_refs ?? [],
          semantic_function_ids: rule.semantic_function_ids ?? [],
          construction_ids: rule.construction_ids ?? [],
          practice_eligible_by_default: rule.practice_eligible_by_default ?? false,
        })),
        tap_offer_contract: tapOfferContract(found.lesson),
        rendering: renderingSummary(found.path),
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
  public_beta_minimum: manifest.status_model?.public_beta_minimum ?? 'machine_verified',
  release_order: manifest.status_model?.release_order ?? ['machine_created', 'machine_verified', 'general_public', 'education'],
  readiness_precedence: manifest.readiness_resolution?.precedence ?? [],
  readiness_summary_is_derived: manifest.readiness_resolution?.summary_is_derived ?? true,
  language_registry_ref: manifest.coverage_policy?.language_registry_ref ?? null,
  counts_must_be_derived: manifest.coverage_policy?.counts_must_be_derived ?? true,
  completeness_tiers: manifest.coverage_policy?.completeness_tiers ?? ['core', 'full'],
  tier3_core_policy: manifest.coverage_policy?.tier3_core_policy ?? null,
  full_grammar_policy: manifest.coverage_policy?.full_grammar_policy ?? null,
  manifest_schema_version: manifest.schema_version,
  status_schema_version: statusModel.schema_version,
  implemented_lesson_count: lessonRegistry.length,
  planned_part_count: plannedParts.length,
  lessons: lessonRegistry,
  planned_parts: plannedParts,
};

mkdirSync(OUT_DIR, { recursive: true });
const output = join(OUT_DIR, 'lesson-ssot-v2.json');
writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
console.log(`🧭 SSOT lesson registry v2: ${lessonRegistry.length} implemented lessons, ${plannedParts.length} planned parts.`);
console.log(`📦 ${output.slice(ROOT.length + 1)}`);
