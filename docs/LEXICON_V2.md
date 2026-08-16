# GEF Lexicon v2

Status: implementation contract for the additive v2 lexical package.

This document refines `LEXICON_ARCHITECTURE.md`; it does not replace the repository split or the identity chain `Concept -> Sense -> Lexeme -> Form -> Analysis -> Occurrence`.

## Why v2 exists

The v1 nested language files are useful seed data, but several fields collapse different kinds of truth into one object. Before Gef scales the dictionary, learner lists, games, and Sense of the Day, v2 makes those boundaries explicit.

The v2 package is **sense-first and compatibility-safe**:

- published IDs remain stable;
- a sense has its own review state and concept mappings;
- display-language definitions/glosses are separate localization records;
- forms and analyses remain distinct;
- reusable examples are first-class and never copied from book passages;
- semantic/phonological/orthographic relationships are typed graph edges whose endpoints declare their object type;
- splits, merges, and replacements use redirects instead of silently changing an existing ID's meaning;
- editorial collections identify useful pools, but product schedules such as a date-specific Sense of the Day remain in `gef-expo`;
- runtime readiness (`lookup`, `quiz`, `daily`) is derived from completeness and review quality, not stored as a hand-maintained eligibility flag.

## Canonical v2 document

`schemas/lexicon-v2.schema.json` defines a normalized language package with these top-level collections:

1. `lexemes`
2. `senses`
3. `localizations`
4. `forms`
5. `examples`
6. `relations`
7. `redirects`
8. `collections`

A source may still be authored in v1 during migration. `scripts/lib/lexicon-v2.mjs` normalizes v1 and v2 documents to this same model. New bulk population should target v2.

### Sense identity

A `sense_id` identifies one language-specific lexical meaning. Once shipped, it must not be silently reassigned to another meaning. If editorial work discovers that a sense needs to split, merge, or be replaced, mark the old record appropriately and add an explicit redirect.

`primary_concept_id` remains a convenient compatibility pointer. `concept_links` is the richer model and can express `exact`, `broader`, `narrower`, `overlapping`, or `contextual` mappings with optional confidence.

### Localization

Meaning identity and learner-facing wording are separate. A localization record is keyed by `sense_id + interface_language` and may contain:

- a short `gloss` for compact surfaces;
- a learner-friendly `definition`;
- an optional generic `hint`.

Hints must not contain book-specific evidence such as “as in the Frog King story.” Exact passages and occurrence evidence belong in `gef-content`.

### Relations

V1's `homophones`, `homonyms`, `synonyms`, `antonyms`, and `confusable_senses` arrays are normalized into one graph. Every edge declares typed source and target endpoints.

This is important because a homophone may be a relation between forms/pronunciations while synonymy is normally sense-to-sense. `schemas/distractor-graph.schema.json` remains a legacy/game projection and is not the canonical source of all lexical relationships in v2.

### Examples

Reusable examples are original Gef-authored sentences or explicitly compatible licensed data. They are not copied corpus sentences. Each example links one or more canonical senses and may carry reviewed translations. Exact story sentences remain in `gef-content`.

### Readiness

`scripts/lib/lexicon-v2.mjs` derives three capabilities per sense:

- `lookup_ready`: approved lexeme + approved sense + at least one approved definition;
- `quiz_ready`: lookup-ready plus an approved usable form and enough clue material;
- `daily_ready`: quiz-ready plus a short gloss, pronunciation, reusable approved example, concept mapping, and difficulty metadata.

Development builds may display candidate material as Gef/provisional content, but candidate data must never be promoted to verified Lexi merely because a capability can be computed.

## Sense of the Day

The reusable payload is `schemas/sense-card-v1.schema.json`. A card is generated from canonical lexical truth and can show:

- headword and part of speech;
- pronunciation;
- short gloss and definition in the learner's best/interface language;
- one reusable example;
- difficulty and concept links;
- other senses of the same lexeme;
- computed readiness.

The lexicon may own collections such as `daily_pool.animals.a1` or `daily_pool.interesting_polysemy`. It does **not** own `featured_date`. Date selection, personalization, repeat suppression, and user history belong in `gef-expo`.

## Games / Study adapter contract

The current Expo Games work is pointed in the right direction: games consume `StudyItem` / `StudySession` and must not consume raw lexicon JSON or SQLite rows.

The v2 adapter must apply these rules:

- Default sense-learning item identity is the canonical `sense_id`. Form/analysis-specific drills may derive a stable variant ID, while keeping `senseId`, `lexemeId`, and `formId` separately available.
- Project localized `gloss`, `definition`, translations, forms, and pronunciations into `StudyRepresentation` / `StudyClue` rather than exposing v2 rows.
- Flatten layered morphology deterministically for `StudyMorphology.features`, for example `base.tense=present` and `subject.person=3`; do not flatten the canonical lexicon itself.
- Map v2 difficulty to the app's `GefProficiencyCode` at the adapter boundary.
- Map `learner.frequency_rank` to `StudyItem.frequencyRank` when present.
- Treat topic IDs and grammar-knowledge IDs as curriculum/collection projections, not arbitrary strings copied from book text.
- Preserve Lexi/Gef trust: candidate lexical records can power provisional Gef study content, but verified Lexi surfaces require approved records.

No Games schema change is required merely because lexicon v2 exists. The missing implementation is a provider/adapter that reads the v2 runtime package and emits the already-defined normalized Study contract.

## Migration and compatibility

V2 is additive. Existing v1 authoring remains readable while the dataset is migrated. The v2 compiler emits `core-v2.sqlite`; the existing v1 compiler can continue emitting `core-v1.sqlite` until Expo no longer needs it.

The migration path is:

1. normalize current v1 sources in memory;
2. validate v2 referential integrity and readiness;
3. compile v2 SQLite beside v1;
4. move new bulk authoring to v2 source files;
5. migrate old source records without changing stable IDs;
6. remove v1 runtime output only after all consumers use the adapter boundary.

## Authoring scale

Do not grow one giant source file forever. V2-aware scripts accept deterministic `lexicon-v2*.json` shards. A practical bulk-population layout is alphabetic or hash-prefix shards with stable formatting. Runtime SQLite remains consolidated and generated.
