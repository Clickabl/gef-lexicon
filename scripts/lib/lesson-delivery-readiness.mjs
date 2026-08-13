const RELEASE_ORDER = ['machine_created', 'machine_verified', 'general_public', 'education'];

function bindingStatus(binding) {
  switch (binding?.status) {
    case 'bound': return 'ready';
    case 'candidate': return 'partial';
    case 'required_missing': return 'missing';
    case 'not_applicable': return 'not_applicable';
    default: return 'missing';
  }
}

function explicitComponentStatus(part, componentId) {
  const state = part.readiness?.default?.components?.[componentId];
  if (state?.status) return state.status;
  if (componentId === 'quest') return bindingStatus(part.quest);
  if (componentId === 'default_reading') return bindingStatus(part.default_reading);
  return 'missing';
}

function hasBlock(renderings, type) {
  return renderings.some((rendering) => (rendering.document?.blocks ?? []).some((block) => block?.type === type));
}

function hasPracticeMaterial(lesson, renderings) {
  const modules = lesson.practice_modules ?? [];
  return modules.some((entry) => entry?.module && entry.module !== 'reader_quest') || hasBlock(renderings, 'practice_slot');
}

function hasQuestMaterial(lesson, renderings) {
  const modules = lesson.practice_modules ?? [];
  return modules.some((entry) => entry?.module === 'reader_quest') || hasBlock(renderings, 'quest_offer');
}

function supportsPresentationMode(lesson) {
  return (lesson.session_policy?.display_modes ?? []).includes('presentation')
    || Boolean(lesson.presentation?.teacher_presentation_mode);
}

function releaseAtLeast(value, minimum) {
  return RELEASE_ORDER.indexOf(value) >= RELEASE_ORDER.indexOf(minimum);
}

function audienceForRelease(releaseStage) {
  switch (releaseStage) {
    case 'education': return ['internal', 'public_beta', 'general_public', 'education'];
    case 'general_public': return ['internal', 'public_beta', 'general_public'];
    case 'machine_verified': return ['internal', 'public_beta'];
    default: return ['internal'];
  }
}

export function implementationResolution(part, lessonId = null) {
  const ids = part.implementation_lesson_ids ?? [];
  if (ids.length === 0) {
    return { status: 'unavailable', reason: 'no_implementation_lesson' };
  }
  if (ids.length > 1) {
    return {
      status: 'ambiguous',
      candidate_lesson_ids: [...ids],
      reason: 'multiple_implementation_lesson_ids_require_explicit_binding',
    };
  }
  const resolved = ids[0];
  if (lessonId !== null && resolved !== lessonId) {
    return { status: 'unavailable', reason: 'lesson_not_bound_to_part' };
  }
  return { status: 'resolved', lesson_id: resolved };
}

export function deriveLessonDelivery({ part, lesson, renderings }) {
  const readiness = part.readiness?.default ?? {};
  const pedagogicalTier = readiness.available_tier ?? 'none';
  const releaseStage = readiness.release_stage ?? 'machine_created';
  const reviewState = readiness.review_state ?? 'candidate';
  const resolution = implementationResolution(part, lesson.lesson_id);

  const evidence = {
    implementation: resolution.status === 'resolved',
    rendering: renderings.length > 0,
    pedagogical_tier: pedagogicalTier !== 'none',
    practice_material: hasPracticeMaterial(lesson, renderings),
    machine_verified_release: releaseAtLeast(releaseStage, 'machine_verified'),
    bound_quest: part.quest?.status === 'bound',
    quest_material: hasQuestMaterial(lesson, renderings),
    bound_default_reading: part.default_reading?.status === 'bound',
    annotations_ready: explicitComponentStatus(part, 'annotations') === 'ready',
    presentation_mode: supportsPresentationMode(lesson),
  };

  const capabilities = {
    presentation: evidence.implementation && evidence.rendering,
    self_study: false,
    practice: false,
    graded_assignment: false,
    reader_quest: false,
    annotated_reading: false,
    live_classroom: false,
  };
  capabilities.self_study = capabilities.presentation && evidence.pedagogical_tier;
  capabilities.practice = capabilities.self_study && evidence.practice_material;
  capabilities.graded_assignment = capabilities.practice && evidence.machine_verified_release;
  capabilities.reader_quest = capabilities.self_study && evidence.bound_quest && evidence.quest_material;
  capabilities.annotated_reading = capabilities.self_study && evidence.bound_default_reading && evidence.annotations_ready;
  capabilities.live_classroom = capabilities.presentation && evidence.presentation_mode;

  return {
    pedagogical_tier: pedagogicalTier,
    release_stage: releaseStage,
    review_state: reviewState,
    audiences: audienceForRelease(releaseStage),
    capabilities,
    evidence,
    component_status: {
      quest: explicitComponentStatus(part, 'quest'),
      default_reading: explicitComponentStatus(part, 'default_reading'),
      annotations: explicitComponentStatus(part, 'annotations'),
      practice: explicitComponentStatus(part, 'practice'),
      game: explicitComponentStatus(part, 'game'),
    },
    implementation_resolution: resolution,
  };
}

export function validateDerivedLessonDelivery({ part, lesson, renderings, delivery }) {
  const errors = [];
  const ids = part.implementation_lesson_ids ?? [];
  const tier = part.readiness?.default?.available_tier ?? 'none';
  const releaseStage = part.readiness?.default?.release_stage ?? 'machine_created';

  if (part.implementation_status === 'implemented' && ids.length === 0) {
    errors.push(`${part.part_id}: implementation_status=implemented but no implementation_lesson_ids are bound`);
  }
  if (part.implementation_status !== 'planned' && ids.length > 1) {
    errors.push(`${part.part_id}: deterministic resolution is ambiguous across ${ids.join(', ')}; add an explicit binding before shipping`);
  }
  if (tier !== 'none' && delivery.implementation_resolution.status !== 'resolved') {
    errors.push(`${part.part_id}: declares pedagogical tier ${tier} without one deterministic implementation lesson`);
  }
  if (releaseAtLeast(releaseStage, 'machine_verified') && !delivery.capabilities.presentation) {
    errors.push(`${part.part_id}: release_stage=${releaseStage} requires a shippable presentation capability`);
  }
  if (part.quest?.status === 'bound' && !delivery.evidence.quest_material) {
    errors.push(`${part.part_id}: quest is bound but no canonical reader-quest material exists in ${lesson.lesson_id}`);
  }
  if (part.readiness?.default?.components?.quest?.status === 'ready' && part.quest?.status !== 'bound') {
    errors.push(`${part.part_id}: quest component is marked ready but the canonical quest binding is ${part.quest?.status ?? 'missing'}`);
  }
  if (part.readiness?.default?.components?.default_reading?.status === 'ready' && part.default_reading?.status !== 'bound') {
    errors.push(`${part.part_id}: default_reading component is marked ready but the canonical reading binding is ${part.default_reading?.status ?? 'missing'}`);
  }
  if (delivery.capabilities.reader_quest && !delivery.capabilities.self_study) {
    errors.push(`${part.part_id}: derived reader_quest capability cannot exist without self_study`);
  }
  if (delivery.capabilities.annotated_reading && !delivery.capabilities.self_study) {
    errors.push(`${part.part_id}: derived annotated_reading capability cannot exist without self_study`);
  }
  if (renderings.length === 0 && part.implementation_status === 'implemented') {
    errors.push(`${part.part_id}: implemented lesson ${lesson.lesson_id} has no support-language rendering and cannot present`);
  }

  return errors;
}
