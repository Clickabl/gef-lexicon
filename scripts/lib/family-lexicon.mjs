#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function splitFamilyExpressions(cell, separator = ' / ') {
  if (typeof cell !== 'string') return [];
  return [...new Set(cell.split(separator).map((value) => value.trim().normalize('NFC')).filter(Boolean))];
}

function idToken(value) {
  return encodeURIComponent(value.normalize('NFC'));
}

function addRelation(sense, relation) {
  const key = `${relation.relation_type}:${relation.target_type}:${relation.target_id}`;
  const existing = new Set((sense.relations ?? []).map((item) => `${item.relation_type}:${item.target_type}:${item.target_id}`));
  if (!existing.has(key)) {
    sense.relations ??= [];
    sense.relations.push(relation);
  }
}

export function loadFamilyLexiconSet(repoRoot) {
  const setPath = join(repoRoot, 'lexicon-sets', 'family-members', 'manifest.json');
  const set = readJson(setPath);
  const vocabularyManifestPath = join(repoRoot, set.vocabulary_manifest);
  const vocabularyManifest = readJson(vocabularyManifestPath);
  const vocabularyRoot = vocabularyManifestPath.slice(0, vocabularyManifestPath.lastIndexOf('/'));
  const shardPaths = Object.values(vocabularyManifest.sources ?? {}).map((path) => join(vocabularyRoot, path));
  const shards = shardPaths.map(readJson);
  return { set, vocabularyManifest, shards };
}

export function buildFamilyLexiconDocuments(repoRoot) {
  const { set, vocabularyManifest, shards } = loadFamilyLexiconSet(repoRoot);
  const docs = new Map();

  for (const shard of shards) {
    for (const entry of shard.entries ?? []) {
      if (!Array.isArray(entry.terms) || entry.terms.length !== shard.concept_order.length) {
        throw new Error(`Family lexicon ${entry.language_tag}: term count does not match concept_order.`);
      }

      const lexemesBySurface = new Map();
      const sensesByConcept = new Map();

      for (let index = 0; index < shard.concept_order.length; index += 1) {
        const conceptKey = shard.concept_order[index];
        const primaryConceptId = set.concept_map[conceptKey];
        if (!primaryConceptId) throw new Error(`Family lexicon: missing concept_map entry for '${conceptKey}'.`);

        const expressions = splitFamilyExpressions(entry.terms[index], set.expression_separator);
        if (expressions.length === 0) throw new Error(`Family lexicon ${entry.language_tag}:${conceptKey}: no expressions.`);

        for (const expression of expressions) {
          const encoded = idToken(expression);
          let lexeme = lexemesBySurface.get(expression);
          if (!lexeme) {
            const lexemeId = `lex.family.${entry.language_tag}.${encoded}`;
            lexeme = {
              lexeme_id: lexemeId,
              lemma_nfc: expression,
              upos: 'NOUN',
              lexical_features: { domain: 'kinship', source_set: set.lexicon_set_id },
              proper_noun: false,
              review_state: set.entry_policy.default_review_state,
              senses: [],
              forms: [{
                form_id: `form.family.${entry.language_tag}.${encoded}`,
                surface_nfc: expression,
                normalized_lookup: expression.toLocaleLowerCase('und'),
                attested_in_text: false,
                analyses: [{
                  analysis_id: `analysis.family.${entry.language_tag}.${encoded}`,
                  features: { base: {} }
                }]
              }]
            };
            lexemesBySurface.set(expression, lexeme);
          }

          const senseId = `sense.family.${entry.language_tag}.${encoded}.${conceptKey}`;
          const metadata = set.expression_metadata?.[entry.language_tag]?.[expression] ?? {};
          const sense = {
            sense_id: senseId,
            sense_key: `family-${conceptKey}`,
            primary_concept_id: primaryConceptId,
            concept_refs: [
              { concept_id: primaryConceptId, relation: 'primary' },
              ...(set.broader_concept_map?.[conceptKey] ?? []).map((conceptId) => ({ concept_id: conceptId, relation: 'broader' }))
            ],
            cefr_level: set.entry_policy.default_cefr_level,
            ...(metadata.register_label ? { register_label: metadata.register_label } : {}),
            lesson_refs: [{
              lesson_id: set.lesson_offer.lesson_id,
              role: set.lesson_offer.role,
              queueable: set.lesson_offer.queueable
            }],
            relations: [],
            review_state: set.entry_policy.default_review_state
          };
          lexeme.senses.push(sense);
          const conceptSenses = sensesByConcept.get(conceptKey) ?? [];
          conceptSenses.push(sense);
          sensesByConcept.set(conceptKey, conceptSenses);
        }
      }

      for (const [conceptKey, senses] of sensesByConcept) {
        for (const source of senses) {
          for (const target of senses) {
            if (source.sense_id === target.sense_id) continue;
            addRelation(source, {
              relation_type: 'related_by_relationship',
              target_id: target.sense_id,
              target_type: 'sense',
              note: `Shares the broad ${conceptKey} relationship pivot; this does not assert exact synonymy.`,
              review_state: set.entry_policy.default_review_state
            });
          }
        }
      }

      docs.set(entry.language_tag, {
        schema_version: 1,
        language_code: entry.language_tag,
        generated_from: `${set.lexicon_set_id}:${vocabularyManifest.lesson_id}`,
        lexemes: [...lexemesBySurface.values()].sort((a, b) => a.lexeme_id.localeCompare(b.lexeme_id))
      });
    }
  }

  return docs;
}
