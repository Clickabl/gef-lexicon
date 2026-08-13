#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const sameArray = (left, right) => Array.isArray(left) && Array.isArray(right)
  && left.length === right.length && left.every((value, index) => value === right[index]);
const sameSet = (left, right) => Array.isArray(left) && Array.isArray(right)
  && left.length === right.length && left.every((value) => right.includes(value));

const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };

const systemSchema = readJson('lexi/system/manifest.schema.json');
const integrationSchema = readJson('lexi/system/integration.schema.json');
const lexi = readJson('lexi/system/manifest.json');
const lessonManifest = readJson('curriculum/lesson-system-manifest.json');
const lessonStatus = readJson('curriculum/review-and-release-status.json');
const lessonSchema = readJson('schemas/lesson.schema.json');
const annotationSchema = readJson('schemas/semantic-annotation.schema.json');

const ajv = new Ajv({ allErrors: true, strict: false });
const validateSystem = ajv.compile(systemSchema);
const validateIntegration = ajv.compile(integrationSchema);

if (!validateSystem(lexi)) {
  for (const error of validateSystem.errors ?? []) {
    errors.push(`lexi/system/manifest.json${error.instancePath || '/'} ${error.message}`);
  }
}

for (const relativePath of [
  lexi.front_door,
  lexi.annotation_pass_catalog,
  lexi.research_catalog,
  lexi.integration_schema,
]) {
  check(fs.existsSync(path.join(root, relativePath)), `Lexi manifest references missing local path ${relativePath}`);
}

const integrationEntries = lexi.integration_catalog ?? [];
const integrationIds = integrationEntries.map((entry) => entry.integration_id);
check(new Set(integrationIds).size === integrationIds.length, 'Lexi integration_catalog contains duplicate integration IDs');

const requiredIntegrationIds = [
  'lexical-graph',
  'semantic-grammar-graph',
  'lesson-graph',
  'occurrence-graph',
  'names-entities',
  'provenance-sources',
  'language-support',
  'runtime-presentation',
];
for (const integrationId of requiredIntegrationIds) {
  check(integrationIds.includes(integrationId), `Lexi integration catalog is missing ${integrationId}`);
}

const integrations = new Map();
for (const entry of integrationEntries) {
  check(
    entry.manifest === `lexi/integrations/${entry.integration_id}/integration.json`,
    `${entry.integration_id} must live at lexi/integrations/${entry.integration_id}/integration.json`,
  );
  if (!fs.existsSync(path.join(root, entry.manifest))) {
    errors.push(`Lexi integration manifest is missing: ${entry.manifest}`);
    continue;
  }

  const integration = readJson(entry.manifest);
  if (!validateIntegration(integration)) {
    for (const error of validateIntegration.errors ?? []) {
      errors.push(`${entry.manifest}${error.instancePath || '/'} ${error.message}`);
    }
  }
  check(integration.integration_id === entry.integration_id, `${entry.manifest} integration_id does not match catalog`);
  check(
    integration.required_for_core_lookup === entry.required_for_core_lookup,
    `${entry.integration_id} required_for_core_lookup disagrees with system catalog`,
  );
  integrations.set(entry.integration_id, integration);
}

for (const [integrationId, integration] of integrations) {
  for (const dependency of integration.depends_on ?? []) {
    check(dependency !== integrationId, `${integrationId} cannot depend on itself`);
    check(integrations.has(dependency), `${integrationId} depends on unknown integration ${dependency}`);
  }
}

// Keep the adapter graph acyclic. If a future integration genuinely needs a
// bidirectional relationship, model shared identity in a canonical graph rather
// than making two adapters recursively own each other.
const visiting = new Set();
const visited = new Set();
function visit(integrationId, stack = []) {
  if (visited.has(integrationId)) return;
  if (visiting.has(integrationId)) {
    errors.push(`Lexi integration dependency cycle: ${[...stack, integrationId].join(' -> ')}`);
    return;
  }
  visiting.add(integrationId);
  const integration = integrations.get(integrationId);
  for (const dependency of integration?.depends_on ?? []) visit(dependency, [...stack, integrationId]);
  visiting.delete(integrationId);
  visited.add(integrationId);
}
for (const integrationId of integrations.keys()) visit(integrationId);

const global = lexi.global_contracts;
check(
  sameArray(global.integrity_review_states, lessonStatus.integrity_review.states),
  'Lexi integrity review states drifted from curriculum/review-and-release-status.json',
);
check(
  sameArray(global.asset_trust_ladder, lessonStatus.asset_trust.ladder),
  'Lexi asset trust ladder drifted from curriculum/review-and-release-status.json',
);
check(
  sameArray(global.lesson_release_ladder, lessonStatus.lesson_release.ladder),
  'Lexi lesson release ladder drifted from curriculum/review-and-release-status.json',
);
check(
  sameArray(global.integrity_review_states, lessonManifest.status_model.integrity_review_states),
  'Lexi integrity review states drifted from lesson-system manifest',
);
check(
  sameArray(global.lesson_release_ladder, lessonManifest.status_model.release_order),
  'Lexi lesson release ladder drifted from lesson-system manifest',
);

const lessonTypedTargets = lessonSchema.definitions?.typedRef?.properties?.target_type?.enum ?? [];
check(
  sameArray(global.typed_reference_targets, lessonTypedTargets),
  `Lexi typed-reference targets drifted from schemas/lesson.schema.json: expected ${lessonTypedTargets.join(', ')}`,
);

check(
  lessonManifest.coverage_policy?.counts_must_be_derived === true && global.counts_are_derived === true,
  'Lexi and lesson system must both derive language counts',
);
check(
  lessonManifest.coverage_policy?.completeness_tiers?.includes('core')
    && lessonManifest.coverage_policy?.completeness_tiers?.includes('full'),
  'Lesson SSOT must continue to define Core and Full completeness tiers',
);
check(
  typeof lessonManifest.coverage_policy?.tier3_core_policy === 'string'
    && lessonManifest.coverage_policy.tier3_core_policy.length > 0,
  'Lesson SSOT must retain an explicit Tier 3 Core policy',
);
check(
  typeof lessonManifest.coverage_policy?.full_grammar_policy === 'string'
    && lessonManifest.coverage_policy.full_grammar_policy.length > 0,
  'Lesson SSOT must retain an explicit Full grammar policy',
);
check(global.tier3_lesson_scope === 'core_read_game_discovery_only', 'Lexi Tier 3 scope drifted');
check(global.tier3_full_grammar_forbidden === true, 'Lexi must forbid Tier 3 Full grammar offers');
check(global.lesson_readiness_is_external === true, 'Lexi must not own lesson readiness');
check(global.language_membership_is_external === true, 'Lexi must not own language tier membership');

const reusableTypedTargetOwners = [
  integrations.get('lexical-graph'),
  integrations.get('semantic-grammar-graph'),
  integrations.get('names-entities'),
].flatMap((integration) => integration?.typed_reference_targets ?? []);
check(
  sameSet([...new Set(reusableTypedTargetOwners)], global.typed_reference_targets),
  'Lexi reusable graph integrations must collectively own every canonical typed-reference target exactly through lexical, semantic/grammar, or names/entities boundaries',
);

const lessonIntegration = integrations.get('lesson-graph');
check(lessonIntegration?.owner === 'Clickabl/gef-lexicon', 'Lesson graph owner drifted');
check(lessonIntegration?.truth_role === 'authoritative', 'Lesson graph must remain authoritative lesson truth');
check(
  lessonIntegration?.canonical_sources?.includes('curriculum/lesson-system-manifest.json'),
  'Lesson graph must point to the canonical lesson-system manifest',
);
check(
  lessonIntegration?.canonical_sources?.includes('dist/dictionaries/shared/lesson-ssot-v2.json'),
  'Lesson graph must expose the canonical lesson SSOT v2 runtime projection',
);
for (const capability of ['tap_triggers', 'directional_readiness', 'core_full_readiness', 'lesson_release']) {
  check(lessonIntegration?.provides?.includes(capability), `Lesson graph must provide ${capability}`);
}
check(
  sameSet(lessonIntegration?.typed_reference_targets ?? [], global.typed_reference_targets),
  'Lesson graph typed targets must stay in exact parity with the canonical lesson typed-ref vocabulary',
);

const occurrenceIntegration = integrations.get('occurrence-graph');
check(occurrenceIntegration?.owner === 'Clickabl/gef-content', 'Occurrence graph owner must remain Clickabl/gef-content');
check(occurrenceIntegration?.truth_role === 'evidence', 'Occurrence graph must remain evidence, not reusable lexical truth');
check(
  sameSet(occurrenceIntegration?.typed_reference_targets ?? [], global.typed_reference_targets),
  'Occurrence graph must be able to point at every canonical reusable target kind',
);

const languageIntegration = integrations.get('language-support');
check(languageIntegration?.owner === 'Clickabl/gef-expo', 'Language support registry owner must remain Clickabl/gef-expo');
check(languageIntegration?.truth_role === 'registry', 'Language support integration must remain a registry boundary');
check(languageIntegration?.typed_reference_targets?.length === 0, 'Language support must not pretend to own linguistic typed refs');

const runtimeIntegration = integrations.get('runtime-presentation');
check(runtimeIntegration?.owner === 'Clickabl/gef-expo', 'Runtime/presentation owner must remain Clickabl/gef-expo');
check(runtimeIntegration?.truth_role === 'presentation', 'Runtime integration must not become a linguistic truth owner');
check(
  sameSet(runtimeIntegration?.typed_reference_targets ?? [], global.typed_reference_targets),
  'Runtime must understand every canonical typed target kind',
);

const provenanceIntegration = integrations.get('provenance-sources');
check(provenanceIntegration?.required_for_core_lookup === true, 'Verified Lexi core lookup must retain provenance integration');

const components = new Set((lessonManifest.component_catalog ?? []).map((component) => component.component_id));
for (const required of ['lexicon_concepts', 'annotations', 'quest', 'default_reading', 'learning_path', 'cefr_target']) {
  check(components.has(required), `Lesson SSOT component catalog no longer contains required Lexi-compatible component ${required}`);
}

check(
  annotationSchema.properties?.offset_unit?.const === global.occurrence_offset_unit,
  'Lexi occurrence offset unit drifted from semantic-annotation.schema.json',
);

if (errors.length) {
  for (const error of errors) console.error(`LEXI SYSTEM VALIDATION ERROR: ${error}`);
  process.exit(1);
}

console.log(`OK — Lexi system v${lexi.version} validates ${integrations.size} modular integrations, ${global.typed_reference_targets.length} canonical typed targets, lesson/status parity, Core/Full semantics, and an acyclic adapter graph.`);
