import { compareUsageCompatibility } from './usage-compatibility.mjs';

function conceptById(compiledIndex, conceptId) {
  return (compiledIndex?.concepts ?? []).find((concept) => concept.concept_id === conceptId) ?? null;
}

function senseLink(concept, languageTag, senseId) {
  return (concept?.sense_links_by_language?.[languageTag] ?? [])
    .find((link) => link.sense_id === senseId && link.relation === 'primary') ?? null;
}

function senseFromLink(link) {
  return {
    sense_id: link?.sense_id,
    register_label: link?.legacy_register_label ?? undefined,
    usage_profile: link?.usage_profile ?? undefined,
  };
}

/**
 * Resolve reviewed cross-language lexical candidates through one exact semantic
 * pivot and then apply language-specific usage compatibility.
 *
 * This function deliberately does not choose a final surface form. Morphology,
 * construction selection, passage discourse context and form-level constraints
 * remain later gates. Returning `compatible` here means only that semantic
 * identity + sense-level usage are safe enough to continue.
 */
export function resolveTranslationCandidates(
  compiledIndex,
  {
    sourceLanguage,
    sourceSenseId,
    targetLanguage,
    targetRegion = null,
    targetVariety = null,
    sourceAnalysis = null,
    targetAnalysesBySense = {},
    includeNeedsContext = true,
  },
) {
  const sourceMemberships = [];
  for (const concept of compiledIndex?.concepts ?? []) {
    if (concept.translation_role !== 'exact_pivot') continue;
    const source = senseLink(concept, sourceLanguage, sourceSenseId);
    if (!source?.semantic_pivot_ready) continue;
    sourceMemberships.push({ concept, source });
  }

  if (sourceMemberships.length === 0) {
    return {
      status: 'source_not_translation_ready',
      candidates: [],
    };
  }
  if (sourceMemberships.length > 1) {
    return {
      status: 'ambiguous_source_pivot',
      candidates: [],
      concept_ids: sourceMemberships.map(({ concept }) => concept.concept_id).sort(),
    };
  }

  const { concept, source } = sourceMemberships[0];
  if (!source.usage_profile_ready) {
    return {
      status: 'source_usage_not_ready',
      concept_id: concept.concept_id,
      candidates: [],
    };
  }

  const targetLinks = (concept.sense_links_by_language?.[targetLanguage] ?? [])
    .filter((link) => link.relation === 'primary' && link.semantic_pivot_ready === true);

  const candidates = [];
  for (const target of targetLinks) {
    if (!target.usage_profile_ready) {
      candidates.push({
        concept_id: concept.concept_id,
        target_language: targetLanguage,
        target_sense_id: target.sense_id,
        status: 'target_usage_not_ready',
        blockers: [],
        needs_context: [{ code: 'target_usage_profile_unapproved' }],
      });
      continue;
    }

    const compatibility = compareUsageCompatibility(
      senseFromLink(source),
      senseFromLink(target),
      {
        sourceAnalysis,
        targetAnalysis: targetAnalysesBySense[target.sense_id] ?? null,
        targetRegion,
        targetVariety,
        requireApprovedProfiles: true,
      },
    );

    if (compatibility.status === 'blocked') continue;
    if (compatibility.status === 'needs_context' && !includeNeedsContext) continue;

    candidates.push({
      concept_id: concept.concept_id,
      target_language: targetLanguage,
      target_sense_id: target.sense_id,
      status: compatibility.status,
      blockers: compatibility.blockers,
      needs_context: compatibility.needs_context,
      warnings: compatibility.warnings,
    });
  }

  const exact = candidates.filter((candidate) => candidate.status === 'compatible');
  const contextual = candidates.filter((candidate) => candidate.status === 'needs_context');
  return {
    status: exact.length > 0
      ? 'candidates_ready'
      : contextual.length > 0
        ? 'context_required'
        : candidates.length > 0
          ? 'target_usage_not_ready'
          : 'no_safe_target_candidate',
    concept_id: concept.concept_id,
    candidates,
  };
}

export function resolveConceptForApprovedSource(compiledIndex, sourceLanguage, sourceSenseId) {
  for (const concept of compiledIndex?.concepts ?? []) {
    if (concept.translation_role !== 'exact_pivot') continue;
    const source = senseLink(concept, sourceLanguage, sourceSenseId);
    if (source?.semantic_pivot_ready) return conceptById(compiledIndex, concept.concept_id);
  }
  return null;
}
