export function effectiveSenseReviewState(lexeme, sense) {
  return sense?.review_state ?? lexeme?.review_state ?? 'candidate';
}

export function usageProfileInvariantErrors(profile) {
  if (!profile) return ['missing_usage_profile'];
  const errors = [];
  const register = new Set(Array.isArray(profile.register) ? profile.register : []);
  const politeness = new Set(Array.isArray(profile.pragmatics?.politeness) ? profile.pragmatics.politeness : []);
  const stance = new Set(Array.isArray(profile.pragmatics?.stance) ? profile.pragmatics.stance : []);

  if (register.size === 0) errors.push('register_missing');
  if (register.has('neutral') && register.size > 1) {
    errors.push('register_neutral_cannot_coexist_with_marked_register');
  }

  if (!profile.region_scope?.kind) errors.push('region_scope_missing');
  if (!Array.isArray(profile.region_scope?.tags)) errors.push('region_tags_missing');
  if (profile.region_scope?.kind === 'restricted' && (profile.region_scope.tags?.length ?? 0) === 0) {
    errors.push('restricted_region_requires_tags');
  }
  if (['general', 'unknown'].includes(profile.region_scope?.kind) && (profile.region_scope.tags?.length ?? 0) > 0) {
    errors.push('nonrestricted_region_cannot_have_tags');
  }
  if (!Array.isArray(profile.varieties ?? [])) errors.push('varieties_must_be_array');

  if (politeness.size === 0) errors.push('politeness_missing');
  if (politeness.has('unmarked') && politeness.size > 1) {
    errors.push('politeness_unmarked_cannot_coexist_with_marked_politeness');
  }

  if (stance.size === 0) errors.push('stance_missing');
  if (stance.has('unmarked') && stance.size > 1) {
    errors.push('stance_unmarked_cannot_coexist_with_marked_stance');
  }
  if (stance.has('neutral') && stance.size > 1) {
    errors.push('stance_neutral_cannot_coexist_with_marked_stance');
  }

  if (!profile.pragmatics?.taboo_level) errors.push('taboo_level_missing');
  if (!profile.pragmatics?.address_use) errors.push('address_use_missing');
  if (!Array.isArray(profile.pragmatics?.social_relation_tags)) errors.push('social_relation_tags_must_be_array');

  if (profile.review_state === 'approved') {
    if (profile.region_scope?.kind === 'unknown') errors.push('approved_profile_region_scope_unknown');
    if (profile.pragmatics?.taboo_level === 'unknown') errors.push('approved_profile_taboo_level_unknown');
    if (profile.pragmatics?.address_use === 'unknown') errors.push('approved_profile_address_use_unknown');
  }

  return errors;
}

export function approvedUsageProfileReady(lexeme, sense) {
  const profile = sense?.usage_profile;
  if (!profile || profile.review_state !== 'approved') return false;
  if (lexeme?.review_state !== 'approved') return false;
  if (effectiveSenseReviewState(lexeme, sense) !== 'approved') return false;
  return usageProfileInvariantErrors(profile).length === 0;
}

export function assertApprovedUsageProfileIntegrity(lexeme, sense, label = sense?.sense_id ?? 'unknown-sense') {
  const profile = sense?.usage_profile;
  if (profile?.review_state !== 'approved') return;
  const errors = usageProfileInvariantErrors(profile);
  if (lexeme?.review_state !== 'approved') errors.push(`containing_lexeme_not_approved:${lexeme?.review_state ?? 'missing'}`);
  const senseState = effectiveSenseReviewState(lexeme, sense);
  if (senseState !== 'approved') errors.push(`containing_sense_not_approved:${senseState}`);
  if (errors.length > 0) {
    throw new Error(`${label}: invalid approved usage profile: ${[...new Set(errors)].join(', ')}`);
  }
}
