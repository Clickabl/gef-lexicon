import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const listDirs = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => fs.statSync(path.join(dir, name)).isDirectory()) : [];
const listJson = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.endsWith('.json')) : [];

const grammarSets = new Map();
for (const filename of listJson(path.join(root, 'grammar'))) {
  const file = path.join(root, 'grammar', filename);
  const doc = readJson(file);
  if (!doc.grammar_set_id) continue;
  const rules = new Set();
  for (const language of doc.languages ?? []) {
    for (const form of language.forms ?? []) {
      for (const rule of form.rules ?? []) if (rule.rule_id) rules.add(rule.rule_id);
    }
  }
  grammarSets.set(doc.grammar_set_id, { file, rules });
}

const lessonIds = new Set();
const lessonsRoot = path.join(root, 'lessons');
for (const lang of listDirs(lessonsRoot)) {
  for (const lessonKey of listDirs(path.join(lessonsRoot, lang))) {
    const file = path.join(lessonsRoot, lang, lessonKey, 'lesson.json');
    if (!fs.existsSync(file)) continue;
    const doc = readJson(file);
    if (doc.lesson_id) lessonIds.add(doc.lesson_id);
  }
}

const knownIds = new Map();
const pendingRelations = [];
const pendingEquivalents = [];
const pendingGrammar = [];
const pendingLessons = [];

function registerLexicon(doc, rel) {
  for (const lexeme of doc.lexemes ?? []) {
    knownIds.set(lexeme.lexeme_id, 'lexeme');
    for (const sense of lexeme.senses ?? []) {
      knownIds.set(sense.sense_id, 'sense');
      for (const relation of sense.semantic_relations ?? []) {
        pendingRelations.push({ rel, owner: sense.sense_id, relation });
      }
      for (const equivalent of sense.equivalents ?? []) {
        pendingEquivalents.push({ rel, owner: sense.sense_id, equivalent });
      }
      for (const grammarLink of sense.grammar_links ?? []) {
        pendingGrammar.push({ rel, owner: sense.sense_id, grammarLink });
      }
      for (const recommendation of sense.lesson_recommendations ?? []) {
        pendingLessons.push({ rel, owner: sense.sense_id, recommendation });
      }
    }
    for (const form of lexeme.forms ?? []) knownIds.set(form.form_id, 'form');
  }
}

const languagesRoot = path.join(root, 'languages');
for (const language of listDirs(languagesRoot)) {
  const file = path.join(languagesRoot, language, 'lexicon.json');
  if (fs.existsSync(file)) registerLexicon(readJson(file), path.relative(root, file));
}

const worksRoot = path.join(root, 'works');
for (const work of listDirs(worksRoot)) {
  const lexDir = path.join(worksRoot, work, 'lexicon');
  for (const filename of listJson(lexDir)) {
    const file = path.join(lexDir, filename);
    registerLexicon(readJson(file), path.relative(root, file));
  }
}

let errors = 0;
const fail = (message) => { errors += 1; console.error(`❌ ${message}`); };

for (const { rel, owner, relation } of pendingRelations) {
  const type = knownIds.get(relation.target_id);
  if (!type) fail(`${rel}:${owner}: semantic relation target ${relation.target_id} does not exist`);
  else if (type !== relation.target_type && relation.target_type !== 'concept' && relation.target_type !== 'expression') {
    fail(`${rel}:${owner}: semantic relation target ${relation.target_id} declared ${relation.target_type}, found ${type}`);
  }
}

for (const { rel, owner, equivalent } of pendingEquivalents) {
  const type = knownIds.get(equivalent.target_sense_id);
  if (type !== 'sense') fail(`${rel}:${owner}: equivalent target sense ${equivalent.target_sense_id} does not exist`);
  if (equivalent.target_lexeme_id && knownIds.get(equivalent.target_lexeme_id) !== 'lexeme') {
    fail(`${rel}:${owner}: equivalent target lexeme ${equivalent.target_lexeme_id} does not exist`);
  }
  if (equivalent.target_form_id && knownIds.get(equivalent.target_form_id) !== 'form') {
    fail(`${rel}:${owner}: equivalent target form ${equivalent.target_form_id} does not exist`);
  }
}

for (const { rel, owner, grammarLink } of pendingGrammar) {
  const grammar = grammarSets.get(grammarLink.grammar_id);
  if (!grammar) {
    fail(`${rel}:${owner}: grammar set ${grammarLink.grammar_id} does not exist`);
    continue;
  }
  if (grammarLink.rule_id && !grammar.rules.has(grammarLink.rule_id)) {
    fail(`${rel}:${owner}: rule ${grammarLink.rule_id} is not in ${grammarLink.grammar_id}`);
  }
}

for (const { rel, owner, recommendation } of pendingLessons) {
  if (!lessonIds.has(recommendation.lesson_id)) {
    fail(`${rel}:${owner}: recommended lesson ${recommendation.lesson_id} does not exist`);
  }
}

if (errors) {
  console.error(`\n❌ Lexi link validation failed with ${errors} error(s).`);
  process.exit(1);
}
console.log(`✓ Lexi links: ${pendingRelations.length} semantic relations, ${pendingGrammar.length} grammar links, ${pendingLessons.length} lesson recommendations`);
