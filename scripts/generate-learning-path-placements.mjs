#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_REGISTRY = resolve(ROOT, '..', 'gef-expo', 'registry', 'language-support.json');
const OUTPUT = join(ROOT, 'curriculum', 'learning-path-placements.json');
const LESSON_FAMILY_ID = 'LES.mul.prep.multiple_for';

function loadRegistry() {
  const registryPath = process.env.GEF_LANGUAGE_SUPPORT_REGISTRY
    ? resolve(process.env.GEF_LANGUAGE_SUPPORT_REGISTRY)
    : DEFAULT_REGISTRY;
  if (!existsSync(registryPath)) {
    throw new Error(
      `Canonical language registry not found at ${registryPath}. Set GEF_LANGUAGE_SUPPORT_REGISTRY or check out gef-expo beside gef-lexicon.`,
    );
  }
  return { registryPath, doc: JSON.parse(readFileSync(registryPath, 'utf8')) };
}

function learnerCapableTags(registry) {
  const program = registry.programs?.learnerCapable;
  const values = Array.isArray(program) ? program : program?.languages ?? program?.language_tags;
  if (!Array.isArray(values)) {
    throw new Error('registry/language-support.json does not expose programs.learnerCapable as an array/language list');
  }
  const tags = values.map((entry) => (typeof entry === 'string' ? entry : entry?.language_tag ?? entry?.id));
  if (tags.some((tag) => typeof tag !== 'string' || tag.length === 0)) {
    throw new Error('learnerCapable contains an entry without a stable language identity');
  }
  return [...new Set(tags)].sort((a, b) => a.localeCompare(b));
}

function genericPlacement(languageTag) {
  return {
    placement_id: `PATH.${languageTag}.multiple_for`,
    language_tag: languageTag,
    lesson_family_id: LESSON_FAMILY_ID,
    status: 'research_required',
    prerequisite_lesson_ids: [],
    prerequisite_concepts: [],
    notes:
      "Sparse lesson-family path node derived from the canonical learner-capable registry. Research this language's prerequisites and ordering before placement; participation does not promote its product support tier.",
    review_state: 'candidate',
  };
}

function placementFor(languageTag) {
  if (languageTag === 'es') {
    return {
      placement_id: 'PATH.es.multiple_for',
      language_tag: 'es',
      lesson_family_id: LESSON_FAMILY_ID,
      implementation_lesson_id: 'LES.es.prep.por_para.core',
      status: 'placed',
      difficulty_band: 'A2',
      order_hint: 20,
      prerequisite_lesson_ids: [],
      prerequisite_concepts: ['basic Spanish prepositions'],
      notes:
        'Spanish por/para is already modeled as an A2 reusable lesson. Exact path order remains candidate and may move as the Spanish curriculum matures.',
      review_state: 'candidate',
    };
  }
  if (languageTag === 'el') {
    return {
      ...genericPlacement(languageTag),
      prerequisite_concepts: ['basic use of για', 'basic purpose clauses'],
      notes:
        'Do not copy Spanish placement. Determine the real position from Greek-specific curriculum review after learners have enough basic για / purpose-clause context.',
    };
  }
  return genericPlacement(languageTag);
}

export function buildLearningPathPlacements(registry) {
  const tags = learnerCapableTags(registry);
  return {
    schema_version: 1,
    source_registry: 'Clickabl/gef-expo/registry/language-support.json',
    source_program: 'learnerCapable',
    placements: tags.map(placementFor),
  };
}

function main() {
  const { registryPath, doc } = loadRegistry();
  const output = buildLearningPathPlacements(doc);
  writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Generated ${output.placements.length} sparse learning-path placements from ${registryPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`LEARNING PATH GENERATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
