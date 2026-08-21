import { usageProfileInvariantErrors } from './usage-profile.mjs';

function array(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function set(value) {
  return new Set(array(value));
}

function setEquals(left, right) {
  if (left.size !== right.size) return false;
  for (const value of left) if (!right.has(value)) return false;
  return true;
}

function isSubset(subset, superset) {
  for (const value of subset) if (!superset.has(value)) return false;
  return true;
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
      lexicalPoliteness: set(authored.pragmatics?.politeness),
      stance: set(authored.pragmatics?.stance),
      tabooLevel: authored.pragmatics?.taboo_level ?? 'unknown',
      addressUse: authored.pragmatics?.address_use ?? 'unknown',
      socialRelationTags: set(authored.pragmatics?.social_relation_tags),
      reviewState: authored.review_state ?? 'candidate',
      source: 'usage_profile',
    };
  }

  const legacyRegister = sense?.register_label ? new Set([sense.register_label]) : new Set();
  return {
    register: legacyRegister,
    regionKind: 'unknown',
    regions: new Set(),
    varieties: new Set(),
    lexicalPoliteness: new Set(),
    stance: new Set(),
    tabooLevel: 'unknown',
    addressUse: 'unknown',
    socialRelationTags: new Set(),
    reviewState: 'candidate',
    source: sense?.register_label ? 'register_label' : 'missing',
  };
}

function compareSemanticSet({ dimension, sourceValues, targetValues, blockers, needsContext }) {
  if (sourceValues.size === 0 || targetValues.size === 0) {
    needsContext.push({ code: `${dimension}_unknown`, source: [...sourceValues], target: [...targetValues] });
    return;
  }

  const sourceExplicit = withoutUnmarked(sourceValues);
  const targetExplicit = withoutUnmarked(targetValues);
  const sourceUnmarked = sourceValues.has('unmarked');
  const targetUnmarked = targetValues.has('unmarked');

  if (sourceExplicit.size === 0 && targetExplicit.size === 0) {
    if (sourceUnmarked && targetUnmarked) return;
    needsContext.push({ code: `${dimension}_unknown`, source: [...sourceValues], target: [...targetValues] });
    return;
  }

  if (sourceExplicit.size === 0 || targetExplicit.size === 0) {
    needsContext.push({ code: `${dimension}_asymmetry`, source: [...sourceValues], target: [...targetValues] });
    return;
  }

  if (!setEquals(sourceExplicit, targetExplicit)) {
    blockers.push({
      code: `${dimension}_mismatch`,
      source: [...sourceExplicit].sort(),
      target: [...targetExplicit].sort(),
    });
  }
}

function compareFormPoliteness(sourceAnalysis, targetAnalysis, blockers, needsContext) {
  const source = analysisPoliteness(sourceAnalysis);
  const target = analysisPoliteness(targetAnalysis);
  if (source.size === 0 && target.size === 0) return;
  if (source.size === 0 || target.size === 0) {
    needsContext.push({ code: 'form_politeness_asymmetry', source: [...source], target: [...target] });
    return;
  }
  if (!setEquals(source, target)) {
    blockers.push({ code: 'form_politeness_mismatch', source: [...source], target: [...target] });
  }
}

function checkGeography(profile, side, region, variety, blockers, needsContext) {
  if (profile.regionKind === 'unknown') {
    needsContext.push({ code: `${side}_region_scope_unknown` });
  } else if (profile.regionKind === 'restricted') {
    if (!region) {
      needsContext.push({ code: `${side}_region_required`, allowed: [...profile.regions].sort() });
    } else if (!profile.regions.has(region)) {
      blockers.push({ code: `${side}_region_mismatch`, requested: region, allowed: [...profile.regions].sort() });
    }
  }

  if (profile.varieties.size > 0) {
    if (!variety) {
      needsContext.push({ code: `${side}_variety_required`, allowed: [...profile.varieties].sort() });
    } else if (!profile.varieties.has(variety)) {
      blockers.push({ code: `${side}_variety_mismatch`, requested: variety, allowed: [...profile.varieties].sort() });
    }
  }
}

function checkAddressUse(source, target, occurrenceAddressUse, blockers, needsContext) {
  if (source.addressUse === 'unknown' || target.addressUse === 'unknown') {
    needsContext.push({ code: 'address_reference_unknown', source: source.addressUse, target: target.addressUse });
    return;
  }

  if (occurrenceAddressUse) {
    for (const [side, value] of [['source', source.addressUse], ['target', target.addressUse]]) {
      if (value !== 'both' && value !== occurrenceAddressUse) {
        blockers.push({ code: `${side}_address_occurrence_mismatch`, occurrence: occurrenceAddressUse, allowed: value });
      }
    }
    return;
  }

  if (source.addressUse === target.addressUse) return;
  if (source.addressUse === 'both' || target.addressUse === 'both') {
    needsContext.push({ code: 'address_reference_context_required', source: source.addressUse, target: target.addressUse });
    return;
  }
  blockers.push({ code: 'address_reference_mismatch', source: source.addressUse, target: target.addressUse });
}

function checkSocialRelations(source, target, occurrenceTags, blockers, needsContext) {
  const occurrence = set(occurrenceTags);
  if (occurrence.size > 0) {
    for (const [side, required] of [['source', source.socialRelationTags], ['target', target.socialRelationTags]]) {
      if (!isSubset(required, occurrence)) {
        blockers.push({
          code: `${side}_social_relation_context_mismatch`,
          required: [...required].sort(),
          occurrence: [...occurrence].sort(),
        });
      }
    }
    return;
  }

  const sourceTags = source.socialRelationTags;
  const targetTags = target.socialRelationTags;
  if (sourceTags.size === 0 && targetTags.size === 0) return;
  if (sourceTags.size === 0 || targetTags.size === 0) {
    needsContext.push({ code: 'social_relation_asymmetry', source: [...sourceTags].sort(), target: [...targetTags].sort() });
    return;
  }
  if (!setEquals(sourceTags, targetTags)) {
    blockers.push({ code: 'social_relation_mismatch', source: [...sourceTags].sort(), target: [...targetTags].sort() });
  }
}

function rejectInvalidAuthoredProfile(side, sense, blockers) {
  if (!sense?.usage_profile) return;
  const errors = usageProfileInvariantErrors(sense.usage_profile);
  if (errors.length > 0) {
    blockers.push({ code: `${side}_usage_profile_invalid`, errors });
  }
}

export function compareUsageCompatibility(
  sourceSense,
  targetSense,
  {
    sourceAnalysis = null,
    targetAnalysis = null,
    sourceRegion = null,
    sourceVariety = null,
    targetRegion = null,
    targetVariety = null,
    occurrenceAddressUse = null,
    occurrenceSocialRelationTags = [],
    requireApprovedProfiles = false,
  } = {},
) {
  const source = normalizeUsageProfile(sourceSense);
  const target = normalizeUsageProfile(targetSense);
  const blockers = [];
  const needsContext = [];
  const warnings = [];

  rejectInvalidAuthoredProfile('source', sourceSense, blockers);
  rejectInvalidAuthoredProfile('target', targetSense, blockers);

  if (requireApprovedProfiles) {
    for (const [side, profile] of [['source', source], ['target', target]]) {
      if (profile.reviewState !== 'approved') {
        needsContext.push({ code: `${side}_usage_profile_unapproved`, source: profile.source });
      }
    }
  }

  compareSemanticSet({ dimension: 'register', sourceValues: source.register, targetValues: target.register, blockers, needsContext });
  compareSemanticSet({ dimension: 'lexical_politeness', sourceValues: source.lexicalPoliteness, targetValues: target.lexicalPoliteness, blockers, needsContext });
  compareFormPoliteness(sourceAnalysis, targetAnalysis, blockers, needsContext);
  compareSemanticSet({ dimension: 'stance', sourceValues: source.stance, targetValues: target.stance, blockers, needsContext });

  if (source.tabooLevel === 'unknown' || target.tabooLevel === 'unknown') {
    needsContext.push({ code: 'taboo_level_unknown', source: source.tabooLevel, target: target.tabooLevel });
  } else if (source.tabooLevel !== target.tabooLevel) {
    blockers.push({ code: 'taboo_level_mismatch', source: source.tabooLevel, target: target.tabooLevel });
  }

  checkAddressUse(source, target, occurrenceAddressUse, blockers, needsContext);
  checkSocialRelations(source, target, occurrenceSocialRelationTags, blockers, needsContext);
  checkGeography(source, 'source', sourceRegion, sourceVariety, blockers, needsContext);
  checkGeography(target, 'target', targetRegion, targetVariety, blockers, needsContext);

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
