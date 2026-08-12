#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY = join(ROOT, 'lesson-families', 'family-members');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const fail = (message) => { throw new Error(message); };
const requireFile = (path) => { if (!existsSync(path)) fail(`Missing Family path asset: ${path}`); };

const PATH_FILE = join(FAMILY, 'family-path.json');
const CAPABILITIES_FILE = join(FAMILY, 'language-capabilities.json');
const CONTRACT_FILE = join(FAMILY, 'language-contract.json');
const ANALYSIS_FILE = join(FAMILY, 'english-cultural-analysis.json');
const CATALOG_FILE = join(ROOT, 'curriculum', 'lesson-catalog.json');
const UNIVERSAL_GAME_MANIFEST = join(FAMILY, 'game-vocabulary', 'manifest.json');

const expectedLessons = [
  ['LES.mul.vocab.family_members', 'family-members'],
  ['LES.mul.vocab.describe_family', 'describe-family'],
  ['LES.mul.vocab.extended_family', 'extended-family'],
  ['LES.mul.vocab.relationships_family_life', 'relationships-family-life'],
];

function validatePath() {
  for (const path of [PATH_FILE, CAPABILITIES_FILE, CONTRACT_FILE, ANALYSIS_FILE, CATALOG_FILE, UNIVERSAL_GAME_MANIFEST]) requireFile(path);
  const pathDoc = readJson(PATH_FILE);
  const capabilities = readJson(CAPABILITIES_FILE);
  const contract = readJson(CONTRACT_FILE);
  const analysis = readJson(ANALYSIS_FILE);
  const catalog = readJson(CATALOG_FILE);
  const gameManifest = readJson(UNIVERSAL_GAME_MANIFEST);

  if (pathDoc.path_id !== 'PATH.mul.family') fail('Unexpected Family path_id');
  if (pathDoc.progression_model !== 'sequential_with_future_spiral') fail('Family progression must permit later spiral placement');
  if (pathDoc.canonical_terms?.session_depth == null || pathDoc.canonical_terms?.family_path_stage == null) fail('Canonical Family path terminology is missing');
  const depth = pathDoc.session_depth;
  if (JSON.stringify(depth?.values) !== JSON.stringify(['core', 'cultural'])) fail('session_depth values must be exactly core/cultural');
  if (depth?.cultural_requires_both_roles_full !== true || depth?.core_if_either_role_comparison_only !== true) fail('Family depth must be pair-level: either comparison-only role forces Core');

  if (!Array.isArray(pathDoc.stages) || pathDoc.stages.length !== 4) fail('Family path must contain exactly four stages');
  const ids = new Set();
  for (let i = 0; i < pathDoc.stages.length; i += 1) {
    const stage = pathDoc.stages[i];
    if (stage.family_path_stage !== i + 1) fail(`Family stage ${i + 1} has wrong family_path_stage`);
    if (stage.lesson_id !== expectedLessons[i][0]) fail(`Family stage ${i + 1} has unexpected lesson_id ${stage.lesson_id}`);
    if (ids.has(stage.lesson_id)) fail(`Duplicate Family lesson ${stage.lesson_id}`);
    ids.add(stage.lesson_id);
    if (!stage.reading?.current_gef_work_id) fail(`Family stage ${i + 1} lacks current Gef reading candidate`);
    const preferred = stage.reading?.preferred_ingestion_target;
    if (!preferred?.title || !preferred?.author || !Number.isInteger(preferred?.project_gutenberg_ebook) || preferred?.public_domain_us !== true) fail(`Family stage ${i + 1} lacks a complete preferred public-domain ingestion target`);
  }

  if (contract.total_learn_from !== 104 || contract.total_full_targets !== 21) fail('Family path must keep the 104 source / 21 full-target contract');
  if (contract.tier3?.length !== 83) fail('Family Tier 3 contract must contain 83 languages');
  const full = new Set(contract.full_target_languages ?? []);
  if (full.size !== 21) fail('Family full target list must contain 21 unique languages');
  if ((contract.tier3 ?? []).some((tag) => full.has(tag))) fail('Tier 3 language leaked into Family full/cultural set');

  const capDepth = capabilities.session_depth;
  if (capDepth?.canonical_field !== 'session_depth') fail('Capabilities must expose canonical session_depth');
  if (capDepth?.resolver?.cultural_requires_both_roles_full !== true || capDepth?.resolver?.core_if_either_role_comparison_only !== true) fail('Capabilities do not enforce pair-level Core/Cultural resolution');
  if (capabilities.stage_coverage?.['4']?.core_104 !== 'partial_partner_spouse_only_until relationship vocabulary expansion') fail('Stage 4 must honestly declare its incomplete 104-language Core vocabulary breadth');

  const gameConcepts = new Set(gameManifest.required_concepts ?? []);
  for (const required of ['mother','father','brother','sister','grandfather','grandmother','uncle','aunt','cousin','partner','spouse']) {
    if (!gameConcepts.has(required)) fail(`Universal Family game vocabulary missing ${required}`);
  }

  if (analysis.language_tag !== 'en') fail('English cultural analysis must use language_tag en');
  for (const stage of ['1','2','3','4']) if (!analysis.stages?.[stage]?.analysis?.length) fail(`English cultural analysis missing stage ${stage}`);
  const inventory = new Map((analysis.term_inventory ?? []).map((entry) => [entry.concept, entry]));
  for (const concept of [
    'mother','father','parent','child','sibling','partner','spouse','stepparent','adoptive_parent','guardian',
    'household','older','younger','only_child','twin','half_sibling','chosen_family',
    'grandparent','grandchild','aunt','uncle','niece','nephew','cousin','mother_in_law','father_in_law','brother_in_law','sister_in_law',
    'boyfriend','girlfriend','romantic_partner','dating','engaged','marriage','married','wedding','separated','divorce','divorced','ex_partner','widowed','single','co_parent'
  ]) {
    if (!inventory.has(concept)) fail(`English Family inventory missing ${concept}`);
  }
  if ((analysis.term_inventory ?? []).length < 80) fail('English Family inventory should remain comprehensive (>=80 entries)');

  const catalogIds = new Set((catalog.universal ?? []).map((entry) => entry.lesson_id));
  for (const [lessonId, lessonDir] of expectedLessons) {
    if (!catalogIds.has(lessonId)) fail(`Family catalog missing ${lessonId}`);
    const lessonPath = join(ROOT, 'lessons', 'mul', lessonDir, 'lesson.json');
    const renderingPath = join(ROOT, 'lessons', 'mul', lessonDir, 'renderings', 'en.json');
    requireFile(lessonPath);
    requireFile(renderingPath);
    const lesson = readJson(lessonPath);
    const rendering = readJson(renderingPath);
    if (lesson.lesson_id !== lessonId || rendering.lesson_id !== lessonId) fail(`Family lesson/rendering ID mismatch for ${lessonId}`);
    if (lesson.language_capabilities_manifest !== '../../../lesson-families/family-members/language-capabilities.json') fail(`${lessonId} must share the Family capability resolver`);
  }

  const priorities = (catalog.universal ?? []).filter((entry) => ids.has(entry.lesson_id)).map((entry) => entry.priority);
  if (JSON.stringify(priorities) !== JSON.stringify([30,31,32,33])) fail(`Family catalog priorities must be 30,31,32,33; found ${priorities.join(',')}`);

  console.log(`OK — Family path: 4 stages, pair-level Core/Cultural depth, 104 source languages, 21 full languages, ${analysis.term_inventory.length} English terms/functions.`);
}

try { validatePath(); } catch (error) {
  console.error(`FAMILY PATH VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
