const HARD_EVIDENCE_KINDS = new Set([
  'local_context',
  'syntactic_role',
  'semantic_role',
  'named_entity_context',
  'domain_context',
  'discourse_context',
  'construction_match',
]);

const SOFT_ONLY_EVIDENCE_KINDS = new Set([
  'translation_memory',
  'prior_occurrence',
  'surface_frequency',
  'related_word',
  'dictionary_translation',
]);

export function primaryApprovedPivot(sense) {
  const links = sense?.concept_links ?? [];
  const primary = links.filter((link) => (
    link?.relation === 'primary' && link?.review_state === 'approved'
  ));
  return primary.length === 1 ? primary[0].concept_id : null;
}

export function resolveOccurrenceSense({
  candidates,
  evidence = [],
  minimumScore = 0.8,
  minimumMargin = 0.15,
}) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { status: 'unresolved', reason: 'no_candidates', sense_id: null };
  }

  const hardEvidence = evidence.filter((item) => HARD_EVIDENCE_KINDS.has(item?.kind));
  const unsupportedEvidence = evidence.filter((item) => (
    item?.kind && !HARD_EVIDENCE_KINDS.has(item.kind) && !SOFT_ONLY_EVIDENCE_KINDS.has(item.kind)
  ));
  if (unsupportedEvidence.length > 0) {
    return { status: 'unresolved', reason: 'unknown_evidence_kind', sense_id: null };
  }

  // Translation memory and previous occurrences may rank candidates, but they may
  // never be the only basis for choosing a sense. This is the anti-reverse-laundering rule.
  if (hardEvidence.length === 0) {
    return { status: 'unresolved', reason: 'soft_evidence_only', sense_id: null };
  }

  const ranked = candidates
    .map((candidate) => ({
      ...candidate,
      score: Number.isFinite(candidate.score) ? candidate.score : 0,
    }))
    .sort((a, b) => b.score - a.score || String(a.sense_id).localeCompare(String(b.sense_id)));

  const first = ranked[0];
  const second = ranked[1];
  if (!first?.sense_id || first.score < minimumScore) {
    return { status: 'unresolved', reason: 'insufficient_confidence', sense_id: null };
  }
  if (second && (first.score - second.score) < minimumMargin) {
    return { status: 'unresolved', reason: 'ambiguous_margin', sense_id: null };
  }

  return {
    status: 'resolved',
    reason: 'context_supported',
    sense_id: first.sense_id,
    score: first.score,
  };
}

export function validateBidirectionalOccurrencePair({ sourceSense, targetSense }) {
  const sourcePivot = primaryApprovedPivot(sourceSense);
  const targetPivot = primaryApprovedPivot(targetSense);
  if (!sourcePivot) return { status: 'blocked', reason: 'source_exact_pivot_unapproved_or_ambiguous' };
  if (!targetPivot) return { status: 'blocked', reason: 'target_exact_pivot_unapproved_or_ambiguous' };
  if (sourcePivot !== targetPivot) {
    return {
      status: 'blocked',
      reason: 'different_exact_pivots',
      source_concept_id: sourcePivot,
      target_concept_id: targetPivot,
    };
  }
  return { status: 'exact_pivot_match', concept_id: sourcePivot };
}

export const OCCURRENCE_EVIDENCE_POLICY = Object.freeze({
  hardEvidenceKinds: [...HARD_EVIDENCE_KINDS],
  softOnlyEvidenceKinds: [...SOFT_ONLY_EVIDENCE_KINDS],
  priorOccurrenceCanAuthorize: false,
  translationMemoryCanAuthorize: false,
  semanticRelationCanAuthorize: false,
});
