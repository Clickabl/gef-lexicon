#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let errors = 0;
const fail = (message) => { console.error(`FAIL: ${message}`); errors += 1; };
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const lexical = {
  lexeme: new Set(), sense: new Set(), form: new Set(), analysis: new Set(), concept: new Set(),
};
const semanticFunctions = new Set();
const constructions = new Set();
const lessons = new Map();

function loadLexicalIds() {
  const conceptsPath = join(ROOT, 'concepts', 'graph.json');
  if (existsSync(conceptsPath)) {
    for (const c of readJson(conceptsPath).concepts ?? []) lexical.concept.add(c.concept_id);
  }
  const languagesDir = join(ROOT, 'languages');
  for (const lang of readdirSync(languagesDir)) {
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
  if (set && !set.has(id)) fail(`${where}: unknown ${type} ${id}`);
}

function loadSemanticFunctions() {
  const path = join(ROOT, 'curriculum', 'semantic-functions.json');
  const doc = readJson(path);
  for (const f of doc.semantic_functions ?? []) registerUnique(semanticFunctions, f.semantic_function_id, 'semantic function');
}

function loadConstructions() {
  const languagesDir = join(ROOT, 'languages');
  for (const lang of readdirSync(languagesDir)) {
    const path = join(languagesDir, lang, 'constructions.json');
    if (!existsSync(path)) continue;
    const doc = readJson(path);
    if (doc.language_code !== lang) fail(`${path}: language_code ${doc.language_code} does not match directory ${lang}`);
    for (const c of doc.constructions ?? []) registerUnique(constructions, c.construction_id, 'construction');
  }
  // Second pass so constructions may safely reference constructions declared later.
  for (const lang of readdirSync(languagesDir)) {
    const path = join(languagesDir, lang, 'constructions.json');
    if (!existsSync(path)) continue;
    const doc = readJson(path);
    for (const c of doc.constructions ?? []) {
      for (const id of c.semantic_function_ids ?? []) if (!semanticFunctions.has(id)) fail(`${c.construction_id}: unknown semantic function ${id}`);
      for (const ref of c.members ?? []) checkTypedRef(ref, c.construction_id);
    }
  }
}

function walkLessons() {
  const root = join(ROOT, 'lessons');
  if (!existsSync(root)) return;
  for (const lang of readdirSync(root)) {
    const langDir = join(root, lang);
    if (!statSync(langDir).isDirectory()) continue;
    for (const slug of readdirSync(langDir)) {
      const lessonDir = join(langDir, slug);
      if (!statSync(lessonDir).isDirectory()) continue;
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
      for (const trigger of lesson.triggers ?? []) {
        if (triggerIds.has(trigger.trigger_id)) fail(`${lesson.lesson_id}: duplicate trigger ${trigger.trigger_id}`);
        triggerIds.add(trigger.trigger_id);
        for (const ref of trigger.match_any ?? []) checkTypedRef(ref, trigger.trigger_id);
      }
      for (const module of lesson.practice_modules ?? []) {
        for (const ruleId of module.eligible_rule_ids ?? []) if (!ruleIds.has(ruleId)) fail(`${lesson.lesson_id}/${module.module}: unknown rule ${ruleId}`);
        for (const ref of module.choice_refs ?? []) checkTypedRef(ref, `${lesson.lesson_id}/${module.module}`);
      }
      lessons.set(lesson.lesson_id, { lessonDir, ruleIds });
    }
  }
}

function validateRenderings() {
  for (const [lessonId, { lessonDir, ruleIds }] of lessons) {
    const dir = join(lessonDir, 'renderings');
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const rendering = readJson(join(dir, file));
      if (rendering.lesson_id !== lessonId) fail(`${file}: rendering lesson_id ${rendering.lesson_id} does not match ${lessonId}`);
      for (const block of rendering.blocks ?? []) {
        if (block.rule_id && !ruleIds.has(block.rule_id)) fail(`${lessonId}/${file}: block ${block.block_id} references unknown rule ${block.rule_id}`);
      }
      for (const ruleId of Object.keys(rendering.rule_explanations ?? {})) if (!ruleIds.has(ruleId)) fail(`${lessonId}/${file}: unknown rule_explanations key ${ruleId}`);
    }
  }
}

loadLexicalIds();
loadSemanticFunctions();
loadConstructions();
walkLessons();
validateRenderings();

if (errors) {
  console.error(`\n${errors} lesson-graph validation error(s).`);
  process.exit(1);
}
console.log(`OK — ${semanticFunctions.size} semantic functions, ${constructions.size} constructions, ${lessons.size} lesson(s), 0 lesson-graph errors.`);
