import { createHash } from 'node:crypto';

const RELATION_FIELD_TYPES = Object.freeze({
  homophones: 'homophone',
  homonyms: 'homonym',
  synonyms: 'synonym',
  antonyms: 'antonym',
  confusable_senses: 'semantic_confusable',
});

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function stableRelationId(sourceType, sourceId, relationType, targetType, targetId) {
  const digest = createHash('sha256')
    .update([sourceType, sourceId, relationType, targetType, targetId].join('|'))
    .digest('hex')
    .slice(0, 20);
  return `rel_${digest}`;
}

function normalizeV2(data) {
  return {
    schema_version: 2,
    language_code: data.language_code,
    ...(data.work_id ? { work_id: data.work_id } : {}),
    lexemes: data.lexemes ?? [],
    senses: data.senses ?? [],
    localizations: data.localizations ?? [],
    forms: data.forms ?? [],
    examples: data.examples ?? [],
    relations: data.relations ?? [],
    redirects: data.redirects ?? [],
    collections: data.collections ?? [],
  };
}

function normalizeV1(data) {
  const lexemes = [];
  const senses = [];
  const localizations = [];
  const forms = [];
  const relations = [];

  for (const lexeme of data.lexemes ?? []) {
    const reviewState = lexeme.review_state ?? 'candidate';
    lexemes.push(compactObject({
      lexeme_id: lexeme.lexeme_id,
      lemma_nfc: lexeme.lemma_nfc,
      upos: lexeme.upos,
      language_pos: lexeme.language_pos,
      lexical_features: lexeme.lexical_features,
      proper_noun: lexeme.proper_noun ?? false,
      name_id: lexeme.name_id,
      review_state: reviewState,
      source_refs: lexeme.source_refs,
    }));

    for (const sense of lexeme.senses ?? []) {
      const senseReview = sense.review_state ?? reviewState;
      const conceptLinks = Array.isArray(sense.concept_links) ? [...sense.concept_links] : [];
      if (sense.primary_concept_id && !conceptLinks.some((link) => link.concept_id === sense.primary_concept_id)) {
        conceptLinks.unshift({ concept_id: sense.primary_concept_id, relationship: 'exact' });
      }

      senses.push(compactObject({
        sense_id: sense.sense_id,
        lexeme_id: lexeme.lexeme_id,
        sense_key: sense.sense_key,
        primary_concept_id: sense.primary_concept_id ?? null,
        concept_links: conceptLinks,
        entity_id: sense.entity_id,
        cefr_level: sense.cefr_level,
        gef_level: sense.gef_level,
        register_label: sense.register_label,
        domains: sense.domains,
        regions: sense.regions,
        learner: sense.learner,
        review_state: senseReview,
        source_refs: sense.source_refs,
      }));

      for (const [interfaceLanguage, definition] of Object.entries(sense.definitions ?? {})) {
        const hint = sense.sense_hint?.[interfaceLanguage];
        localizations.push(compactObject({
          sense_id: sense.sense_id,
          interface_language: interfaceLanguage,
          definition,
          hint,
          review_state: senseReview,
          source_refs: sense.source_refs,
        }));
      }

      for (const [field, relationType] of Object.entries(RELATION_FIELD_TYPES)) {
        for (const relation of sense[field] ?? []) {
          const targetType = relation.target_type ?? 'sense';
          relations.push(compactObject({
            relation_id: stableRelationId('sense', sense.sense_id, relationType, targetType, relation.target_id),
            source: { type: 'sense', id: sense.sense_id },
            relation_type: relationType,
            target: { type: targetType, id: relation.target_id },
            note: relation.note,
            review_state: relation.review_state ?? senseReview,
            source_refs: relation.source_refs,
          }));
        }
      }
    }

    for (const form of lexeme.forms ?? []) {
      forms.push(compactObject({
        form_id: form.form_id,
        lexeme_id: lexeme.lexeme_id,
        surface_nfc: form.surface_nfc,
        normalized_lookup: form.normalized_lookup ?? form.surface_nfc,
        analyses: (form.analyses ?? []).map((analysis) => compactObject({
          analysis_id: analysis.analysis_id,
          features: analysis.features ?? { base: {} },
          display_label_key: analysis.display_label_key,
          pronunciations: analysis.pronunciations ?? (analysis.pronunciation ? [analysis.pronunciation] : []),
        })),
        review_state: form.review_state ?? reviewState,
        source_refs: form.source_refs,
      }));
    }

    for (const relation of lexeme.relations ?? []) {
      const targetType = relation.target_type ?? relation.target_kind ?? 'lexeme';
      const relationType = relation.relation_type ?? relation.type;
      if (!relationType || !relation.target_id) continue;
      relations.push(compactObject({
        relation_id: relation.relation_id ?? stableRelationId('lexeme', lexeme.lexeme_id, relationType, targetType, relation.target_id),
        source: { type: 'lexeme', id: lexeme.lexeme_id },
        relation_type: relationType,
        target: { type: targetType, id: relation.target_id },
        note: relation.note,
        review_state: relation.review_state ?? reviewState,
        source_refs: relation.source_refs,
      }));
    }
  }

  return {
    schema_version: 2,
    language_code: data.language_code,
    ...(data.work_id ? { work_id: data.work_id } : {}),
    lexemes,
    senses,
    localizations,
    forms,
    examples: data.examples ?? [],
    relations,
    redirects: data.redirects ?? [],
    collections: data.collections ?? [],
  };
}

export function normalizeLexiconDocument(data) {
  if (!data || typeof data !== 'object') throw new TypeError('Lexicon document must be an object.');
  if (data.schema_version === 2) return normalizeV2(data);
  if (data.schema_version === 1) return normalizeV1(data);
  throw new Error(`Unsupported lexicon schema_version '${data.schema_version}'.`);
}

export function mergeLexiconPackages(packages) {
  if (!Array.isArray(packages) || packages.length === 0) throw new Error('At least one v2 package is required.');
  const languageCode = packages[0].language_code;
  const merged = {
    schema_version: 2,
    language_code: languageCode,
    lexemes: [], senses: [], localizations: [], forms: [], examples: [], relations: [], redirects: [], collections: [],
  };
  for (const pkg of packages) {
    if (pkg.language_code !== languageCode) throw new Error(`Cannot merge ${pkg.language_code} into ${languageCode}.`);
    for (const key of ['lexemes', 'senses', 'localizations', 'forms', 'examples', 'relations', 'redirects', 'collections']) {
      merged[key].push(...(pkg[key] ?? []));
    }
  }
  return merged;
}

export function flattenMorphologyFeatures(features = {}) {
  const flattened = {};
  for (const [layer, values] of Object.entries(features)) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) continue;
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === 'string') flattened[`${layer}.${key}`] = value;
    }
  }
  return flattened;
}

function approved(item) { return item?.review_state === 'approved'; }

export function computeSenseReadiness(pkg, senseId, interfaceLanguage) {
  const sense = pkg.senses.find((item) => item.sense_id === senseId);
  if (!sense) throw new Error(`Unknown sense '${senseId}'.`);
  const lexeme = pkg.lexemes.find((item) => item.lexeme_id === sense.lexeme_id);
  const localizations = pkg.localizations.filter((item) => item.sense_id === senseId);
  const requestedLocalization = interfaceLanguage
    ? localizations.find((item) => item.interface_language === interfaceLanguage)
    : undefined;
  const localization = requestedLocalization ?? localizations.find(approved) ?? localizations[0];
  const forms = pkg.forms.filter((item) => item.lexeme_id === sense.lexeme_id);
  const approvedForms = forms.filter((item) => item.review_state === undefined || approved(item));
  const pronunciations = approvedForms.flatMap((form) => form.analyses ?? []).flatMap((analysis) => analysis.pronunciations ?? []);
  const examples = pkg.examples.filter((item) => item.sense_ids?.includes(senseId) && approved(item));
  const reasons = [];

  const lookupReady = approved(lexeme) && approved(sense) && Boolean(localization && approved(localization) && localization.definition);
  if (!approved(lexeme)) reasons.push('lexeme_not_approved');
  if (!approved(sense)) reasons.push('sense_not_approved');
  if (!localization?.definition) reasons.push('missing_definition');
  else if (!approved(localization)) reasons.push('localization_not_approved');

  const quizReady = lookupReady && approvedForms.length > 0 && Boolean(localization?.gloss || localization?.definition);
  if (approvedForms.length === 0) reasons.push('missing_approved_form');

  const hasConcept = Boolean(sense.primary_concept_id || sense.concept_links?.length);
  const hasDifficulty = sense.gef_level !== undefined || Boolean(sense.cefr_level);
  const dailyReady = quizReady && Boolean(localization?.gloss) && pronunciations.length > 0 && examples.length > 0 && hasConcept && hasDifficulty;
  if (!localization?.gloss) reasons.push('missing_gloss');
  if (pronunciations.length === 0) reasons.push('missing_pronunciation');
  if (examples.length === 0) reasons.push('missing_approved_reusable_example');
  if (!hasConcept) reasons.push('missing_concept_mapping');
  if (!hasDifficulty) reasons.push('missing_difficulty');

  return { lookup_ready: lookupReady, quiz_ready: quizReady, daily_ready: dailyReady, reasons: [...new Set(reasons)] };
}

export function buildSenseCard(pkg, senseId, interfaceLanguage) {
  const sense = pkg.senses.find((item) => item.sense_id === senseId);
  if (!sense) throw new Error(`Unknown sense '${senseId}'.`);
  const lexeme = pkg.lexemes.find((item) => item.lexeme_id === sense.lexeme_id);
  if (!lexeme) throw new Error(`Sense '${senseId}' points to missing lexeme '${sense.lexeme_id}'.`);
  const localizations = pkg.localizations.filter((item) => item.sense_id === senseId);
  const localization = localizations.find((item) => item.interface_language === interfaceLanguage)
    ?? localizations.find((item) => item.interface_language === 'en')
    ?? localizations[0];
  if (!localization) throw new Error(`Sense '${senseId}' has no localization.`);

  const forms = pkg.forms.filter((item) => item.lexeme_id === lexeme.lexeme_id);
  const pronunciations = [];
  const seenPronunciations = new Set();
  for (const form of forms) for (const analysis of form.analyses ?? []) for (const pronunciation of analysis.pronunciations ?? []) {
    const key = `${pronunciation.ipa}|${pronunciation.locale ?? ''}|${pronunciation.notation ?? ''}`;
    if (seenPronunciations.has(key)) continue;
    seenPronunciations.add(key);
    pronunciations.push(compactObject({ ipa: pronunciation.ipa, locale: pronunciation.locale, notation: pronunciation.notation }));
  }

  const example = pkg.examples.find((item) => item.sense_ids?.includes(senseId) && item.review_state === 'approved');
  const translation = example?.translations?.find((item) => item.interface_language === localization.interface_language);
  const otherSenseIds = pkg.senses.filter((item) => item.lexeme_id === lexeme.lexeme_id && item.sense_id !== senseId).map((item) => item.sense_id);

  return compactObject({
    schema_version: 1,
    sense_id: sense.sense_id,
    lexeme_id: lexeme.lexeme_id,
    language_code: pkg.language_code,
    headword: lexeme.lemma_nfc,
    part_of_speech: lexeme.upos,
    difficulty: compactObject({ cefr_level: sense.cefr_level, gef_level: sense.gef_level }),
    pronunciations,
    localization: compactObject({
      interface_language: localization.interface_language,
      gloss: localization.gloss,
      definition: localization.definition,
      hint: localization.hint,
    }),
    example: example ? compactObject({ example_id: example.example_id, text: example.text_nfc, translation: translation?.text }) : undefined,
    concept_links: sense.concept_links ?? [],
    same_lexeme_other_sense_ids: otherSenseIds,
    readiness: computeSenseReadiness(pkg, senseId, localization.interface_language),
  });
}
