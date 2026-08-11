#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let errors = 0;
const fail = (message) => { console.error(`FAIL: ${message}`); errors += 1; };
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const lexical = {
  lexeme: new Set(),
  sense: new Set(),
  form: new Set(),
  analysis: new Set(),
  concept: new Set(),
  name: new Set(),
  name_family: new Set(),
  name_form: new Set(),
  entity: new Set(),
};
const semanticFunctions = new Set();
const constructions = new Set();
const lessons = new Map();
const grammarSetRuleIds = new Map();

function listDirs(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path).filter((entry) => statSync(join(path, entry)).isDirectory());
}

function loadLexicalIds() {
  const conceptsPath = join(ROOT, 'concepts', 'graph.json');
  if (existsSync(conceptsPath)) {
    for (const c of readJson(conceptsPath).concepts ?? []) lexical.concept.add(c.concept_id);
  }

  const languagesDir = join(ROOT, 'languages');
  for (const lang of listDirs(languagesDir)) {
    const path = join(languagesDir, lang, 'lexicon.json');
    if (!existsSync(path)) continue;
    const doc = readJson(path);
    for (const lexeme of doc.lexemes ?? []) {
      lexical.lexeme.add(lexeme.lexeme_id);
      for (const sense of lexeme.senses ?? []) lexical.sense.add(sense.sense_id);
      for (const form of lexeme.forms ?? []) {
        lexical.form.add(form.form_id);
        for (const analysis of form.analyses ?? []) lexical.analysis.add(analysis.analysis_id);
      }
    }
  }

  const namesDir = join(ROOT, 'names');
  for (const lang of listDirs(namesDir)) {
    for (const file of readdirSync(join(namesDir, lang)).filter((entry) => entry.endsWith('.json'))) {
      for (const name of readJson(join(namesDir, lang, file)).names ?? []) lexical.name.add(name.name_id);
    }
  }

  const familiesDir = join(ROOT, 'name-families');
  if (existsSync(familiesDir)) {
    for (const file of readdirSync(familiesDir).filter((entry) => entry.endsWith('.json'))) {
      const family = readJson(join(familiesDir, file));
      lexical.name_family.add(family.family_id);
      for (const set of family.equivalence_sets ?? []) {
        for (const form of set.forms ?? []) lexical.name_form.add(form.form_id);
      }
    }
  }

  const worksDir = join(ROOT, 'works');
  for (const work of listDirs(worksDir)) {
    const entityDir = join(worksDir, work, 'entities');
    if (!existsSync(entityDir)) continue;
    for (const file of readdirSync(entityDir).filter((entry) => entry.endsWith('.json'))) {
      for (const entity of readJson(join(entityDir, file)).entities ?? []) lexical.entity.add(entity.entity_id);
    }
  }
}

function registerUnique(set, id, label) {
  if (set.has(id)) fail(`duplicate ${label} id ${id}`);
  set.add(id);
}

function checkTypedRef(ref, where) {
  if (!ref || typeof ref !== 'object') return fail(`${where}: invalid typed ref`);
  const { target_type: type, target_id: id } = ref;
  if (type === 'semantic_function') {
    if (!semanticFunctions.has(id)) fail(`${where}: unknown semantic function ${id}`);
    return;
  }
  if (type === 'construction') {
    if (!constructions.has(id)) fail(`${where}: unknown construction ${id}`);
    return;
  }
  if (type === 'phrase_pattern') return; // Phrase-pattern registry is not yet centralized in this repo.
  const set = lexical[type];
  if (!set) return fail(`${where}: unsupported typed-ref target_type ${type}`);
  if (!set.has(id)) fail(`${where}: unknown ${type} ${id}`);
}

function loadSemanticFunctions() {
  const path = join(ROOT, 'curriculum', 'semantic-functions.json');
  const doc = readJson(path);
  for (const f of doc.semantic_functions ?? []) registerUnique(semanticFunctions, f.semantic_function_id, 'semantic function');
}

function loadConstructions() {
  const languagesDir = join(ROOT, 'languages');
  for (const lang of listDirs(languagesDir)) {
    const path = join(languagesDir, lang, 'constructions.json');
    if (!existsSync(path)) continue;
    const doc = readJson(path);
    if (doc.language_code !== lang) fail(`${path}: language_code ${doc.language_code} does not match directory ${lang}`);
    for (const c of doc.constructions ?? []) registerUnique(constructions, c.construction_id, 'construction');
  }
  // Second pass so constructions may safely reference constructions declared later.
  for (const lang of listDirs(languagesDir)) {
    const path = join(languagesDir, lang, 'constructions.json');
    if (!existsSync(path)) continue;
    const doc = readJson(path);
    for (const c of doc.constructions ?? []) {
      for (const id of c.semantic_function_ids ?? []) if (!semanticFunctions.has(id)) fail(`${c.construction_id}: unknown semantic function ${id}`);
      for (const ref of c.members ?? []) checkTypedRef(ref, c.construction_id);
    }
  }
}

function loadGrammarSets() {
  const grammarDir = join(ROOT, 'grammar');
  if (!existsSync(grammarDir)) return;
  for (const file of readdirSync(grammarDir).filter((entry) => entry.endsWith('.json'))) {
    const path = join(grammarDir, file);
    const doc = readJson(path);
    if (typeof doc.grammar_set_id !== 'string') continue;
    if (grammarSetRuleIds.has(doc.grammar_set_id)) {
      fail(`${path}: duplicate grammar_set_id ${doc.grammar_set_id}`);
      continue;
    }
    const ruleIds = new Set();
    for (const language of doc.languages ?? []) {
      for (const form of language.forms ?? []) {
        for (const rule of form.rules ?? []) {
          if (ruleIds.has(rule.rule_id)) fail(`${doc.grammar_set_id}: duplicate rule ${rule.rule_id}`);
          ruleIds.add(rule.rule_id);
          for (const semanticId of rule.semantic_function_ids ?? []) {
            if (!semanticFunctions.has(semanticId)) fail(`${rule.rule_id}: unknown semantic function ${semanticId}`);
          }
        }
      }
    }
    grammarSetRuleIds.set(doc.grammar_set_id, ruleIds);
  }
}

function walkLessons() {
  const root = join(ROOT, 'lessons');
  if (!existsSync(root)) return;
  for (const lang of listDirs(root)) {
    const langDir = join(root, lang);
    for (const slug of listDirs(langDir)) {
      const lessonDir = join(langDir, slug);
      const path = join(lessonDir, 'lesson.json');
      if (!existsSync(path)) continue;
      const lesson = readJson(path);
      if (lesson.target_language !== lang) fail(`${path}: target_language ${lesson.target_language} does not match directory ${lang}`);
      if (lessons.has(lesson.lesson_id)) fail(`duplicate lesson id ${lesson.lesson_id}`);
      const ruleIds = new Set();
      const triggerIds = new Set();
      for (const id of lesson.construction_ids ?? []) if (!constructions.has(id)) fail(`${lesson.lesson_id}: unknown construction ${id}`);
      for (const rule of lesson.rules ?? []) {
        if (ruleIds.has(rule.rule_id)) fail(`${lesson.lesson_id}: duplicate rule ${rule.rule_id}`);
        ruleIds.add(rule.rule_id);
        for (const id of rule.semantic_function_ids ?? []) if (!semanticFunctions.has(id)) fail(`${rule.rule_id}: unknown semantic function ${id}`);
        for (const id of rule.construction_ids ?? []) if (!constructions.has(id)) fail(`${rule.rule_id}: unknown construction ${id}`);
        for (const ref of rule.match_refs ?? []) checkTypedRef(ref, rule.rule_id);
      }
      const grammarRuleIds = lesson.grammar_set_id ? grammarSetRuleIds.get(lesson.grammar_set_id) : undefined;
      if (lesson.grammar_set_id && !grammarRuleIds) fail(`${lesson.lesson_id}: unknown grammar_set_id ${lesson.grammar_set_id}`);
      for (const trigger of lesson.triggers ?? []) {
        if (triggerIds.has(trigger.trigger_id)) fail(`${lesson.lesson_id}: duplicate trigger ${trigger.trigger_id}`);
        triggerIds.add(trigger.trigger_id);
        for (const ref of trigger.match_any ?? []) checkTypedRef(ref, trigger.trigger_id);
      }
      for (const module of lesson.practice_modules ?? []) {
        for (const ruleId of module.eligible_rule_ids ?? []) {
          if (!ruleIds.has(ruleId) && !grammarRuleIds?.has(ruleId)) {
            fail(`${lesson.lesson_id}/${module.module}: unknown rule ${ruleId}`);
          }
        }
        for (const ref of module.choice_refs ?? []) checkTypedRef(ref, `${lesson.lesson_id}/${module.module}`);
      }
      lessons.set(lesson.lesson_id, { lessonDir, ruleIds, grammarRuleIds: grammarRuleIds ?? new Set() });
    }
  }
}

function validateRenderings() {
  for (const [lessonId, { lessonDir, ruleIds, grammarRuleIds }] of lessons) {
    const allowedRuleIds = new Set([...ruleIds, ...grammarRuleIds]);
    const dir = join(lessonDir, 'renderings');
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const rendering = readJson(join(dir, file));
      if (rendering.lesson_id !== lessonId) fail(`${file}: rendering lesson_id ${rendering.lesson_id} does not match ${lessonId}`);
      for (const block of rendering.blocks ?? []) {
        if (block.rule_id && !allowedRuleIds.has(block.rule_id)) fail(`${lessonId}/${file}: block ${block.block_id} references unknown rule ${block.rule_id}`);
      }
      for (const ruleId of Object.keys(rendering.rule_explanations ?? {})) {
        if (!allowedRuleIds.has(ruleId)) fail(`${lessonId}/${file}: unknown rule_explanations key ${ruleId}`);
      }
    }
  }
}

loadLexicalIds();
loadSemanticFunctions();
loadConstructions();
loadGrammarSets();
walkLessons();
validateRenderings();

if (errors) {
  console.error(`\n${errors} lesson-graph validation error(s).`);
  process.exit(1);
}
console.log(`OK — ${semanticFunctions.size} semantic functions, ${constructions.size} constructions, ${grammarSetRuleIds.size} grammar set(s), ${lessons.size} lesson(s), 0 lesson-graph errors.`);
