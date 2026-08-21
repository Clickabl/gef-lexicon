function array(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function set(value) {
  return new Set(array(value));
}

function intersects(left, right) {
  if (left.size === 0 || right.size === 0) return false;
  for (const value of left) if (right.has(value)) return true;
  return false;
}

function withoutUnmarked(values) {
  return new Set([...values].filter((value) => value !== 'unmarked'));
}

function analysisPoliteness(analysis) {
  const value = analysis?.features?.base?.politeness;
  return value ? new Set([value]) : new Set();
}

export function normalizeUsageProfile(sense) {
  const authored = sense?.usage_profile ?? null;
  if (authored) {
    return {
      register: set(authored.register),
      regionKind: authored.region_scope?.kind ?? 'unknown',
      regions: set(authored.region_scope?.tags),
      varieties: set(authored.varieties),
      politeness: set(authored.pragmatics?.politeness),
      stance: set(authored.pragmatics?.stance),
      tabooLevel: authored.pragmatics?.taboo_level ?? 'unknown',
      addressUse: authored.pragmatics?.address_use ?? 'unknown',
      socialRelationTags: set(authored.pragmatics?.social_relation_tags),
      reviewState: authored.review_state ?? 'candidate',
      source: 'usage_profile',
    };
  }

  // Legacy labels remain visible but are never promoted to approved structured
  // evidence. This lets old data participate in QA without pretending that a
  // display string is a reviewed cross-language compatibility profile.
  const legacyRegister = sense?.register_label ? new Set([sense.register_label]) : new Set();
  return {
    register: legacyRegister,
    regionKind: 'unknown',
    regions: new Set(),
    varieties: new Set(),
    politeness: new Set(),
    stance: new Set(),
    tabooLevel: 'unknown',
    addressUse: 'unknown',
    socialRelationTags: new Set(),
    reviewState: 'candidate',
    source: sense?.register_label ? 'register_label' : 'missing',
  };
}

/**
 * Compare one usage dimension while keeping three states distinct:
 *
 * - explicit values such as neutral/familiar/plain/honorific are evidence;
 * - `unmarked` means the language does not lexically/grammatically require a
 *   marked choice at this layer, so a marked value on the other side needs
 *   context rather than being silently copied;
 * - an empty set means the data is unknown/incomplete and also needs context
 *   when the other side makes a choice.
 */
function compareDimension({
  dimension,
  sourceValues,
  targetValues,
  blockers,
  needsContext,
}) {
  const sourceExplicit = withoutUnmarked(sourceValues);
  const targetExplicit = withoutUnmarked(targetValues);

  if (sourceExplicit.size > 0 && targetExplicit.size > 0) {
    if (!intersects(sourceExplicit, targetExplicit)) {
      blockers.push({
        code: `${dimension}_mismatch`,
        source: [...sourceExplicit],
        target: [...targetExplicit],
      });
    }
    return;
  }

  if (sourceExplicit.size === 0 && targetExplicit.size === 0) return;

  needsContext.push({
    code: `${dimension}_asymmetry`,
    source: [...sourceValues],
    target: [...targetValues],
  });
}

export function compareUsageCompatibility(
  sourceSense,
  targetSense,
  {
    sourceAnalysis = null,
    targetAnalysis = null,
    targetRegion = null,
    targetVariety = null,
    requireApprovedProfiles = false,
  } = {},
) {
  const source = normalizeUsageProfile(sourceSense);
  const target = normalizeUsageProfile(targetSense);
  const blockers = [];
  const needsContext = [];
  const warnings = [];

  if (requireApprovedProfiles) {
    for (const [side, profile] of [['source', source], ['target', target]]) {
      if (profile.reviewState !== 'approved') {
        needsContext.push({ code: `${side}_usage_profile_unapproved`, source: profile.source });
      }
    }
  }

  // `neutral` is explicit register evidence, not the same thing as unknown.
  // Therefore neutral -> familiar is a mismatch, not a mere context request.
  compareDimension({
    dimension: 'register',
    sourceValues: source.register,
    targetValues: target.register,
    blockers,
    needsContext,
  });

  const sourcePoliteness = new Set([...source.politeness, ...analysisPoliteness(sourceAnalysis)]);
  const targetPoliteness = new Set([...target.politeness, ...analysisPoliteness(targetAnalysis)]);
  compareDimension({
    dimension: 'politeness',
    sourceValues: sourcePoliteness,
    targetValues: targetPoliteness,
    blockers,
    needsContext,
  });

  compareDimension({
    dimension: 'stance',
    sourceValues: source.stance,
    targetValues: target.stance,
    blockers,
    needsContext,
  });

  if (
    source.tabooLevel !== 'unknown'
    && target.tabooLevel !== 'unknown'
    && source.tabooLevel !== target.tabooLevel
  ) {
    blockers.push({
      code: 'taboo_level_mismatch',
      source: source.tabooLevel,
      target: target.tabooLevel,
    });
  } else if (source.tabooLevel === 'unknown' || target.tabooLevel === 'unknown') {
    needsContext.push({
      code: 'taboo_level_unknown',
      source: source.tabooLevel,
      target: target.tabooLevel,
    });
  }

  if (
    source.addressUse !== 'unknown'
    && target.addressUse !== 'unknown'
    && source.addressUse !== 'both'
    && target.addressUse !== 'both'
    && source.addressUse !== target.addressUse
  ) {
    blockers.push({
      code: 'address_reference_mismatch',
      source: source.addressUse,
      target: target.addressUse,
    });
  } else if (source.addressUse === 'unknown' || target.addressUse === 'unknown') {
    needsContext.push({
      code: 'address_reference_unknown',
      source: source.addressUse,
      target: target.addressUse,
    });
  }

  if (
    source.socialRelationTags.size > 0
    && target.socialRelationTags.size > 0
    && !intersects(source.socialRelationTags, target.socialRelationTags)
  ) {
    blockers.push({
      code: 'social_relation_mismatch',
      source: [...source.socialRelationTags],
      target: [...target.socialRelationTags],
    });
  } else if ((source.socialRelationTags.size > 0) !== (target.socialRelationTags.size > 0)) {
    needsContext.push({
      code: 'social_relation_asymmetry',
      source: [...source.socialRelationTags],
      target: [...target.socialRelationTags],
    });
  }

  if (source.regionKind === 'unknown' || target.regionKind === 'unknown') {
    needsContext.push({
      code: 'region_scope_unknown',
      source: source.regionKind,
      target: target.regionKind,
    });
  }

  if (target.regionKind === 'restricted') {
    if (!targetRegion) {
      needsContext.push({ code: 'target_region_required', allowed: [...target.regions] });
    } else if (!target.regions.has(targetRegion)) {
      blockers.push({ code: 'target_region_mismatch', requested: targetRegion, allowed: [...target.regions] });
    }
  }

  if (target.varieties.size > 0) {
    if (!targetVariety) {
      needsContext.push({ code: 'target_variety_required', allowed: [...target.varieties] });
    } else if (!target.varieties.has(targetVariety)) {
      blockers.push({ code: 'target_variety_mismatch', requested: targetVariety, allowed: [...target.varieties] });
    }
  }

  if (source.source !== 'usage_profile' || target.source !== 'usage_profile') {
    warnings.push({
      code: 'legacy_or_missing_usage_profile',
      sourceProfileSource: source.source,
      targetProfileSource: target.source,
    });
  }

  const status = blockers.length > 0
    ? 'blocked'
    : needsContext.length > 0
      ? 'needs_context'
      : 'compatible';

  return { status, blockers, needs_context: needsContext, warnings };
}
