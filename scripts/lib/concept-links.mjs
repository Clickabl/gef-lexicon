export const SENSE_CONCEPT_RELATIONS = Object.freeze([
  'primary',
  'broader',
  'narrower',
  'related',
]);

export const ACTIVE_REVIEW_STATES = new Set(['candidate', 'approved']);
export const APPROVED_PRIMARY_REVIEW_STATES = new Set(['approved']);

function inheritedReviewState(sense, fallbackReviewState) {
  return sense?.review_state ?? fallbackReviewState ?? 'candidate';
}

/**
 * Normalize the canonical many-to-many sense -> concept authoring model.
 *
 * `concept_links` is authoritative for new data. `primary_concept_id` remains
 * a temporary compatibility alias for older records. A legacy scalar is
 * projected into one `primary` edge only when an explicit primary edge is not
 * already present. If both forms exist they must agree.
 */
export function normalizeSenseConceptLinks(sense, fallbackReviewState = 'candidate') {
  const fallback = inheritedReviewState(sense, fallbackReviewState);
  const explicit = Array.isArray(sense?.concept_links) ? sense.concept_links : [];
  const links = explicit.map((link) => ({
    ...link,
    relation: link.relation ?? 'primary',
    review_state: link.review_state ?? fallback,
  }));

  const primaryLinks = links.filter((link) => link.relation === 'primary');
  if (primaryLinks.length > 1) {
    throw new Error(`Sense ${sense?.sense_id ?? '(unknown)'} has more than one primary concept link.`);
  }

  const legacyPrimary = sense?.primary_concept_id ?? null;
  if (legacyPrimary) {
    if (primaryLinks.length === 0) {
      links.push({
        concept_id: legacyPrimary,
        relation: 'primary',
        review_state: fallback,
        compatibility_source: 'primary_concept_id',
      });
    } else if (primaryLinks[0].concept_id !== legacyPrimary) {
      throw new Error(
        `Sense ${sense?.sense_id ?? '(unknown)'} has conflicting primary concept identities: `
        + `${legacyPrimary} vs ${primaryLinks[0].concept_id}.`,
      );
    }
  }

  const seen = new Set();
  for (const link of links) {
    if (!link?.concept_id) {
      throw new Error(`Sense ${sense?.sense_id ?? '(unknown)'} has a concept link without concept_id.`);
    }
    if (!SENSE_CONCEPT_RELATIONS.includes(link.relation)) {
      throw new Error(
        `Sense ${sense?.sense_id ?? '(unknown)'} has unsupported concept relation '${link.relation}'.`,
      );
    }
    const key = `${link.concept_id}\u0000${link.relation}`;
    if (seen.has(key)) {
      throw new Error(
        `Sense ${sense?.sense_id ?? '(unknown)'} repeats concept link ${link.concept_id}/${link.relation}.`,
      );
    }
    seen.add(key);
  }

  return links;
}

/** Candidate + approved links used for authoring, development, and review UI. */
export function activeSenseConceptLinks(sense, fallbackReviewState = 'candidate') {
  return normalizeSenseConceptLinks(sense, fallbackReviewState)
    .filter((link) => ACTIVE_REVIEW_STATES.has(link.review_state));
}

/**
 * Approved primary semantic pivots for a sense.
 *
 * `parentReviewState` is normally the containing lexeme's review state. The
 * lexeme, sense, and concept edge must all be approved. This prevents an
 * approved child edge from laundering a candidate parent into production.
 *
 * Passing this gate means the denotational sense -> concept identity has been
 * reviewed. It does NOT by itself certify a final surface translation. Exact
 * learner-facing translation must additionally preserve relevant register,
 * social meaning, dialect/variety, morphology, constructional meaning, and the
 * resolved passage context.
 */
export function approvedPrimarySenseConceptLinks(sense, parentReviewState = 'candidate') {
  const senseState = inheritedReviewState(sense, parentReviewState);
  if (parentReviewState !== 'approved' || senseState !== 'approved') return [];

  return normalizeSenseConceptLinks(sense, parentReviewState)
    .filter((link) => (
      link.relation === 'primary'
      && APPROVED_PRIMARY_REVIEW_STATES.has(link.review_state)
    ));
}

/**
 * Backward-compatible alias. Prefer approvedPrimarySenseConceptLinks in new
 * code because "translation ready" can be misread as a complete surface-level
 * equivalence guarantee.
 */
export function translationReadySenseConceptLinks(sense, parentReviewState = 'candidate') {
  return approvedPrimarySenseConceptLinks(sense, parentReviewState);
}

export function primaryConceptIdForSense(sense, fallbackReviewState = 'candidate') {
  const primary = activeSenseConceptLinks(sense, fallbackReviewState)
    .find((link) => link.relation === 'primary');
  return primary?.concept_id ?? null;
}

export function approvedPrimaryConceptIdForSense(sense, parentReviewState = 'candidate') {
  const primary = approvedPrimarySenseConceptLinks(sense, parentReviewState)[0];
  return primary?.concept_id ?? null;
}

/** Backward-compatible alias; see translationReadySenseConceptLinks. */
export function translationReadyPrimaryConceptIdForSense(sense, parentReviewState = 'candidate') {
  return approvedPrimaryConceptIdForSense(sense, parentReviewState);
}

export function conceptLinkKey(link) {
  return `${link.concept_id}\u0000${link.relation}`;
}
