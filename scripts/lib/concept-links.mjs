export const SENSE_CONCEPT_RELATIONS = Object.freeze([
  'primary',
  'broader',
  'narrower',
  'related',
]);

export const ACTIVE_REVIEW_STATES = new Set(['candidate', 'approved']);

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

export function activeSenseConceptLinks(sense, fallbackReviewState = 'candidate') {
  return normalizeSenseConceptLinks(sense, fallbackReviewState)
    .filter((link) => ACTIVE_REVIEW_STATES.has(link.review_state));
}

export function primaryConceptIdForSense(sense, fallbackReviewState = 'candidate') {
  const primary = activeSenseConceptLinks(sense, fallbackReviewState)
    .find((link) => link.relation === 'primary');
  return primary?.concept_id ?? null;
}

export function conceptLinkKey(link) {
  return `${link.concept_id}\u0000${link.relation}`;
}
