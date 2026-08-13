# Lexi annotation passes

**Canonical annotation-pass taxonomy for Lexi**  
Parent contract: `docs/LEXI_SSOT.md`

Lexi enrichment is built through independent passes. Pass completion is a **coverage signal**, never a trust promotion mechanism.

## Status axes

Do not mix these axes.

### Pass coverage

- `missing`
- `partial`
- `complete`
- `not_applicable`
- `blocked`

### Integrity review

Use the canonical lesson/lexicon vocabulary exactly:

- `candidate`
- `approved`
- `superseded`
- `rejected`

There is no Lexi-specific `reviewed` integrity state.

### Asset trust

Where rendered/localized assets use the product trust ladder:

- `machine_translated`
- `machine_verified`
- `public`
- `gef_certified`

### Lesson release

For linked lessons, readiness remains separate:

- `machine_created`
- `machine_verified`
- `general_public`
- `education`

A pass can be `complete` while all of its rows are still `candidate`. High confidence or machine verification never turns candidate material into approved Lexi truth.

## Shared metadata

Where supported, pass output should preserve:

- pass ID/version;
- stable target typed ref;
- coverage state;
- integrity `review_state`;
- producer (`human`, `machine`, `imported`, or a documented first-party pipeline);
- source/provenance refs;
- confidence when useful for candidate ranking;
- reviewer/timestamp where applicable;
- rights/license lane for deliberately approved external evidence;
- supersession relationship.

## P01 · normalization and writing-system identity

Normalize for reliable identity/search without erasing meaningful distinctions.

Typical work: NFC normalization, language/script/orthography tags, canonical lemma spelling, spelling variants, punctuation/apostrophe/hyphen behavior, transliteration/romanization/readings, search keys.

Do not collapse distinct scripts, orthographies, historical forms, or regional variants merely because search can normalize them together.

## P02 · lexical identity

Resolve reusable identity:

- lexeme;
- form;
- homograph separation;
- stable IDs;
- reusable name/name-form/entity identity where defensible.

Display text is never the primary key.

## P03 · lexical category

Assign universal POS plus language-specific category/subtype where useful. Do not force every language into English school-grammar categories.

This pass maps directly to lesson typed refs where rules/triggers target lexemes/forms/analyses.

## P04 · morphology and form analysis

Keep a form separate from its possible analyses. Represent syncretism rather than duplicating a spelling into fake unique forms.

Possible features include case, number, gender/noun class, definiteness, tense, aspect, mood, voice, person, polarity, degree, finiteness, subject/object/possessor agreement, clitics, politeness/honorifics, and language-specific features.

Lesson compatibility: a canonical lesson may target `form` or `analysis` refs directly. Lexi must preserve those IDs.

## P05 · pronunciation and reading support

Optional reviewed enrichment such as IPA, stress, tone, readings, pronunciation variants, romanization/transliteration, or rights-cleared audio references.

Missing pronunciation never blocks a dictionary answer unless a specific product contract explicitly requires it.

## P06 · sense segmentation and first-party definition

Separate materially different meanings and provide concise first-party definitions/glosses where supported.

Rules:

- spelling != sense;
- different support-language glosses do not automatically create different senses;
- preserve unresolved ambiguity;
- reusable sense truth stays separate from exact passage interpretation;
- definitions are not copied/paraphrased entry-by-entry from an unapproved third-party lexicon.

Lesson compatibility: `sense` is a canonical lesson typed-ref target.

## P07 · concepts, semantic functions, names and entities

Link senses/occurrences to reusable language-neutral or named identities only where defensible.

Use canonical objects rather than English glosses as interlingual truth. `SEM.*` semantic functions must remain language-neutral.

Do not infer a specific story character from capitalization or a generic name match alone.

## P08 · register, region, pragmatics and usage

Capture learner-relevant restrictions such as formal/informal, honorific/plain, slang/taboo/dated, regional/dialectal, technical/domain, connotation, social-role constraints, or other meaning-changing usage facts.

Optional means optional. Do not fill every entry with decorative labels.

## P09 · constructions, syntax and valency

Link lexical material to reusable `CTR.*` constructions or phrase patterns where structure changes meaning/use.

Examples include argument frames, required cases/adpositions, complement types, phrasal/separable behavior, classifier constructions, serial verbs, discourse/interrogative constructions, or reusable grammatical patterns.

Lesson compatibility: lesson rules may target `construction` and `phrase_pattern` directly. Lexi references them; it does not embed the lesson explanation.

## P10 · multiword expressions and collocations

Resolve the longest useful reviewed unit while preserving component taps.

Possible classes: idioms, fixed expressions, phrasal verbs, lexicalized compounds, conventional collocations, discourse markers, names/titles.

Corpus association alone is not proof that an expression is lexicalized.

## P11 · semantic relations and confusables

Typed, sense-aware relations may include synonym/near-synonym, antonym, broader/narrower, part/whole, derivation, homophone/homonym, false friend, confusable form/sense, or quiz contrast sets.

Do not assert synonymy merely because two forms share a broad concept.

## P12 · commonness and learner difficulty

Keep usage frequency/commonness separate from pedagogical difficulty/CEFR. Record evidence/source/version for each.

Lesson CEFR remains owned by the lesson SSOT. A lexical CEFR hint must never override lesson placement/readiness.

## P13 · canonical lesson linkage

Link reusable lexical/semantic objects to lessons without copying curriculum.

Allowed references:

- `LES.*` lesson ID;
- optional stable `RULE.*` ID;
- canonical typed subject ref;
- reviewed relationship type;
- provenance/review state.

The lesson SSOT remains authoritative for part ID, Core/Full availability, prerequisites, CEFR, path placement, release stage, quests/readings, UI elements, and directional readiness.

### Tier rules

- Tier 1: Core and Full offers only when SSOT readiness resolves them as available.
- Tier 2: Core and selective Full offers only when SSOT readiness resolves them as available.
- Tier 3: Core reading/comparison/game/quest/discovery links are allowed where canonical coverage exists. Full grammar offers are forbidden.

A Tier 3 entry may have zero lesson links and still be a valid Tier 3 Lexi entry.

## P14 · corpus occurrence and lesson-evidence verification

This pass bridges to `gef-content`; it does not move occurrence truth into the reusable lexicon.

Verify:

- work/edition/anchor;
- exact NFC Unicode code-point span;
- longest useful reviewed phrase/entity;
- sense/form/analysis/construction resolution chain;
- lesson/rule evidence where applicable;
- example quality and deterministic-practice safety where relevant;
- ambiguity;
- provenance and integrity review state.

A lesson occurrence may point to canonical `LES.*` / `RULE.*`; it never stores free-form `lesson_tag` truth or lesson prose.

No occurrence row means missing/not-analyzed evidence, not proof that a phenomenon is absent.

## P15 · provenance, rights and trust audit

Mandatory before a record can be presented as verified Lexi.

Confirm:

- visible Lexi claims are `approved`;
- candidate material remains Gef/provisional;
- rejected/superseded evidence cannot win resolution;
- provenance resolves;
- first-party vs intentionally external evidence remains distinguishable;
- any external data lane has explicit approved rights/provenance handling;
- required attribution survives packaging;
- lesson offers resolve through the canonical lesson SSOT and do not counterfeit lesson release/readiness;
- confidence has not been used as an approval shortcut.

## Tier application

### Tier 1

Aim for broad linguistically applicable coverage across P01-P15, especially lexical foundations, morphology, constructions, semantic relations, lesson links, occurrence evidence, and provenance.

### Tier 2

Baseline: P01, P02, P06, P15. Add P03-P14 selectively according to language structure, reading value, lesson needs, and review capacity.

### Tier 3

Normal dictionary-first baseline:

`P01 normalization -> P02 identity -> P06 defensible sense/definition -> P15 provenance/trust`

P03-P05 and P07-P14 are optional enrichment. Tier 3 should never become a hollow clone of Tier 1 filled with generated placeholders.

## Suggested authoring order

`P01 -> P02 -> P03 -> P04/P05 -> P06 -> P07 -> P08/P09/P10 -> P11/P12 -> P13 -> P14 -> P15`

This is a publishing workflow, not a runtime waterfall. Runtime consumes precompiled evidence.

## Promotion rule

- missing enrichment stays missing;
- complete candidate work stays Gef/provisional;
- approved evidence may become Lexi/verified;
- lesson availability remains separately resolved by the lesson SSOT;
- coverage pressure never promotes trust.
