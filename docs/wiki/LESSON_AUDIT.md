# Lesson Compliance Audit

Audit scope: every canonical `lessons/**/lesson.json` currently present in `gef-lexicon`, plus planned lesson parts in the universal manifest.

This is the human-readable audit. The machine-readable readiness/gap truth lives in `curriculum/lesson-system-manifest.json`.

## Audit rules

A lesson/part is considered **architecture-compliant** when it is represented in the SSOT, CEFR-tagged, schema-valid, path-aware, uses correct language-tier/best-language semantics, and has its missing components explicitly tracked.

That does **not** mean it is ready for public beta/general public/education. Audience readiness requires the relevant components to actually be complete and reviewed.

| Lesson / part | CEFR | Current strengths | Remaining blockers / gaps | Audit result |
|---|---:|---|---|---|
| `LES.mul.meta.international_language_levels` → `PART.meta.language_levels.orientation` | mixed | Implemented; integrity `approved`; universal orientation; no fake production practice | Explicit audience-release promotion still separate; path projection remains candidate | **Compliant; meta exception**. Quest/default reading correctly `not_applicable` |
| `LES.mul.vocab.family_members` → `PART.family.members` | A1 | Tier 1/2 rich profiles; Tier 3 14-concept recognition/game core; concept-first matching; ambiguity-safe forms | Bind canonical quest; bind default annotated reading; prove/verify all-language Core concept coverage at required trust | **Compliant, incomplete** |
| `LES.mul.vocab.describe_family` → `PART.family.describe` | A1 | Explicit prerequisite; Core vs cultural depth; privacy-safe practice; avoids forced personal disclosure | Bind quest; bind default annotated reading; prove all-language Core concepts/patterns | **Compliant, incomplete** |
| `LES.mul.vocab.extended_family` → `PART.family.extended` | A1 default | Relationship-path-first design; preserves kinship dimensions such as side/age/gender/affinity | Bind quest; bind default annotated reading; research language-specific CEFR/path overrides where kinship complexity warrants them | **Compliant, incomplete** |
| `LES.mul.vocab.relationships_family_life` → `PART.family.relationships` | A2 | Neutral relationship/life-state concepts; chosen-label respect; legal/social context not overclaimed | Bind quest; bind default annotated reading | **Compliant, incomplete** |
| planned → `PART.calendar_time.time_of_day` | A1 | Correctly represented as a planned part in the same calendar/time group | Concrete `LES.*` implementation missing; canonical concept set missing; quest missing; default annotated reading missing | **Tracked planned work** |
| `LES.mul.time.days_of_week` → `PART.calendar_time.days_of_week` | A1 | Ordered concept system; Tier 1/2 practice only; comparison-safe; does not confuse pedagogical cycle order with locale calendar-column convention | Bind quest; bind default annotated reading; verify all-language term realization coverage | **Compliant, incomplete** |
| `LES.mul.time.months_of_year` → `PART.calendar_time.months_and_years` | A1 | Calendar-context alternatives preserved; Tier 1/2 practice only | **Years are not implemented** by current lesson; bind quest; bind default annotated reading | **Compliant, partial** |
| `LES.mul.time.seasons` → `PART.calendar_time.seasons` | A1 | Climate/hemisphere/cultural system explicitly treated as context, not inferred from language tag | Bind quest; bind default annotated reading; verify all-language concept coverage | **Compliant, incomplete** |
| `LES.mul.grammar.grammatical_gender` → `PART.grammatical_gender.core` | A1 | Full vs comparison roles separated; Tier 3 comparison only; zero/two/three-gender anchors; existing reader-quest primitive; unique-answer safeguards | Bind a reviewed default annotated reading; reader quest still needs corpus binding; prove all-language Core comparison coverage at intended trust | **Compliant, incomplete** |
| `LES.mul.noun.grammatical_number` → `PART.grammatical_number.core` | A2 | Full vs comparison roles separated; optional marking can be omitted; reader-quest primitive; unique-answer safeguards | Bind reviewed default annotated reading; complete corpus quest binding/review | **Compliant, incomplete** |
| `LES.mul.prep.multiple_for` → `PART.multiple_words_for.semantic_map` | Core orientation A1; full implementation A2 | Generic semantic-function model; best-language-first; English/Spanish display-only contrast anchors; reader-quest primitive; Full rules only when structured language data exists | Bind reviewed default annotated reading; bind quest to real corpus evidence; complete pending lesson-specific Full grammar research; keep A1 Core vs A2 Full distinction explicit | **Compliant, incomplete** |
| `LES.es.prep.por_para.core` → `PART.multiple_words_for.spanish_por_para` | A2 | Gold-standard concrete rule implementation; 11 structured semantic/construction rules; cloze only where defensible; contextual discovery triggers | Add/bind canonical reader quest; bind reviewed default annotated reading/occurrence annotations; remains `candidate` until review | **Gold-standard structure, incomplete content readiness** |
| `LES.mul.names.around_world` → `PART.names.around_world` | mixed | Separates transliteration, adaptation, historical equivalent, and person identity; unknown names become research rather than invented mappings | Bind quest; bind default annotated reading; source cultural/community practice notes explicitly | **Compliant, incomplete** |
| `LES.mul.grammar.being` → `PART.being.core` | mixed | Strong semantic-function decomposition; avoids assuming universal copular verb or permanent/temporary rule; restrained contextual offers | Split broad mixed system into CEFR-appropriate parts before polished sequential curriculum; bind quest; bind default annotated reading | **Compliant architecture; pedagogically broad/partial** |

## Sweep conclusions

### 1. No orphan concrete lessons

Every current concrete `lesson.json` is represented by the universal manifest. The validator now treats an unrepresented future lesson as a CI failure.

### 2. CEFR exists on every current concrete lesson

`schemas/lesson.schema.json` now requires `difficulty_band`, and `validate-lessons.mjs` actually runs the schema against every concrete lesson.

The schema also now recognizes the current schema version 4 used by Family Members instead of pretending the repo stops at version 3.

### 3. Best-language terminology is enforced

The generic multiple-words-for lesson still contained legacy “native language” wording. It was changed to best/explanation language, and validation now rejects `native language` / `nativeLanguage*` profile terminology inside lesson definitions.

### 4. Tier policy is generally healthy

The current lessons consistently separate:

- best/explanation language
- learning/target language
- comparison-only support
- Full rule/practice support

Tier 3 is not being treated as automatic Full grammar support. Family Members correctly uses Tier 3 for a concept/game core. Gender/number/calendar families correctly limit production practice to supported targets.

### 5. Practice quality safeguards are already strong

Existing lessons frequently require a unique defensible answer or omit a practice primitive when a language permits multiple valid forms. This matches the universal lesson contract and should remain a hard product principle.

### 6. The largest cross-lesson gap is the reader bridge

Most ordinary lesson parts still need one or both of:

- canonical quest binding
- reviewed default annotated reading

This is now visible and queueable instead of silently implied by a `reading` UI group or a generic `reader_quest` primitive.

A lesson having a `reader_quest` practice module means the runtime interaction exists. It does **not** mean a real quest/default reading has been researched and bound.

### 7. Calendar/time has two explicit unfinished pieces

- `time_of_day` is planned but not implemented.
- `months_and_years` currently has only the months implementation; years remain a real missing sub-scope.

### 8. Being needs pedagogical decomposition

The “to be or not to be” semantic research is useful, but the concrete lesson currently spans identity, classification, properties, state, location, existence, absence, time/date, origin, material, and possession-as-existence. It should remain `mixed`/conditional until broken into appropriate learning parts for actual paths.

### 9. Por/para is the reference pattern, not a fake green badge

Por/para remains the best structural example for:

- semantic-function-first teaching
- contrast anchors
- structured rules
- defensible practice
- contextual reader discovery

It still needs a real reader quest/default annotated reading and human/research review before higher release stages.

## What can now be trusted about the repo

After this sweep, a green validator means:

- every concrete lesson is schema-valid
- every concrete lesson has CEFR
- every concrete lesson is represented in the SSOT
- every manifest implementation reference resolves
- every lesson part is represented in the ordered path or an explicit language override
- important cross-object IDs resolve
- lesson definitions do not use the forbidden native-language profile concept

It does **not** mean every lesson is public-ready. Release readiness remains component-level and must be earned.

## Next work should come from the SSOT

Do not create a second checklist from this audit. Use `curriculum/lesson-system-manifest.json` to generate/queue the missing component tasks. The most common near-term queue categories are:

1. default annotated reading selection + occurrence annotation
2. reader quest binding
3. all-language Core concept coverage verification
4. language-specific Full grammar research
5. language-specific CEFR/path research
6. missing time-of-day / years implementation
7. decomposition of overly broad mixed lessons such as Being
