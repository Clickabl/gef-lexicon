# GEF Lexicon v2

Status: implementation contract before bulk population.

## Non-negotiable model

GEF does not use English as a semantic root. Every language owns its own lexemes and senses. Cross-language alignment is expressed through language-neutral concepts and explicit typed links.

```text
Concept
  ↕ concept_links
Sense
  ↕ sense relations
Lexeme
  ↕ lexical relations
Form
  ↕ form/pronunciation relations
Analysis
```

Book occurrences live in `gef-content` and point at canonical `sense_id` values when annotated. A book may also carry a book-local overlay for invented names, archaic forms, one-work meanings, and unresolved candidates.

## Stable identity

Once a `sense_id`, `lexeme_id`, `form_id`, or `concept_id` ships, its meaning must not silently change.

Lifecycle fields:

- `status`: `active | superseded | rejected`
- `replaced_by`: zero or more stable IDs
- `split_from`: optional old ID
- `merged_from`: optional old IDs

Saved vocabulary, annotations, review history, Sense of the Day, and analytics may all hold these IDs for years.

## Sense is the primary learning object

A learner does not learn an undifferentiated spelling. A learner encounters a particular meaning in context. Each sense therefore owns its own:

- review state
- provenance
- learner gloss
- full first-party definition
- register and region
- difficulty metadata
- safety classification
- concept links
- examples
- readiness state

Lexeme-level review is not sufficient.

## Definitions and external sources

GEF canonical learner definitions and examples remain first-party unless repository policy is deliberately changed after license review.

External dictionaries such as Wiktionary are evidence sources. Compatible imported fields may include:

- upstream identity
- language and spelling inventory
- part-of-speech evidence
- forms and morphology evidence
- pronunciation/IPA
- Wikimedia Commons audio references and media provenance
- register/usage tags
- translation assertions
- lexical relation assertions
- etymological evidence

Do not blindly copy third-party definitions/examples into first-party fields.

Every imported assertion records source snapshot, upstream ID where available, importer version, license/provenance, and review state.

## Typed relation graph

Do not store every relationship as an array on a sense. A relation is a first-class edge:

```json
{
  "relation_id": "rel_...",
  "source_type": "sense",
  "source_id": "sns_...",
  "relation_type": "synonym",
  "target_type": "sense",
  "target_id": "sns_...",
  "strength": "overlap",
  "review_state": "candidate",
  "provenance": []
}
```

Typical levels:

- synonym / antonym / semantic broader / narrower / confusable: sense-to-sense
- homophone: form or pronunciation-to-form/pronunciation
- spelling variant: form-to-form
- derivation: lexeme-to-lexeme
- false friend: usually sense-to-sense with language contrast metadata

New relation types do not require schema redesign.

## Cross-language concept links

`primary_concept_id` may remain a convenience shortcut, but canonical alignment is many-to-many:

```json
{
  "sense_id": "sns_...",
  "concept_id": "cpt_...",
  "relation": "exact",
  "confidence": 0.98,
  "review_state": "approved"
}
```

Allowed relations initially:

- `exact`
- `broader`
- `narrower`
- `overlap`
- `contextual`

A previous Spanish `rana` link must never force a later occurrence requiring `sapo` or another language-specific distinction.

## Localization

Semantic identity is independent from interface-language display strings. At scale, localized glosses/definitions should compile into deterministic keyed bundles by `sense_id` rather than forcing every translation edit through giant per-language monoliths.

The shipping compiler may still join these into SQLite for fast lookup.

## Examples

Reusable examples belong here only when they are generic and licensed/first-party. Exact book sentences stay in `gef-content`.

Each example records:

- `example_id`
- language
- text
- linked sense IDs
- difficulty
- translations if available
- provenance
- review state

## Safety

Difficulty and safety are separate axes.

Sense-level safety includes:

- content band: `general | sensitive_educational | mature | explicit`
- tags such as `profanity`, `slur`, `sexual_act`, `sexual_content`, `anatomy`, `identity`, `drugs`, `graphic_violence`, `self_harm`
- minimum age-policy band if applicable
- warning strength
- provenance and reviewer state

Relations are filtered through the same safety policy as direct lookup so safe senses cannot leak hidden explicit neighbors.

`gay`, `pregnancy`, anatomy, identity, or difficult vocabulary are not made adult merely because of topic or difficulty.

## Readiness

Readiness is derived by validator, not manually declared as `word_of_the_day: true`.

Initial capabilities:

- `lookup_ready`
- `quiz_ready`
- `daily_ready`
- `classroom_ready`

A daily-ready sense normally needs approved semantic identity, learner gloss, definition, part of speech, at least one approved example, safe/known classification, and sufficient pronunciation data where the language supports it.

## Sense of the Day

The lexicon may expose curated collections such as `a1_daily_candidates`, but calendar dates, personalization, viewed state, and install-date sequencing belong to the app/user layer.

The app features a sense, not merely a spelling. The same lemma may return later with a different sense when pedagogically useful.

## Storage and compilation

Human/agent authoring must shard before scale. Do not grow one 100,000-entry JSON file.

Recommended source layout:

```text
languages/en/lexemes/ab/...
languages/es/lexemes/ra/...
relations/...
concept-links/...
localizations/en/...
examples/...
collections/...
```

Compiler outputs:

1. core language SQLite pack
2. book slice SQLite pack generated from `gef-content` sense references
3. normalized server database/import representation

All three use the same canonical IDs and field semantics.

## Resolver order

For an annotated book occurrence, exact occurrence sense identity wins for ordering. Reusable fields are merged from mounted stores:

1. exact book occurrence / book-local override
2. mounted core lexicon
3. mounted book slice
4. persisted downloaded expansion
5. server resolution/expansion

A server expansion is persisted locally and becomes downloaded language content. It is not disposable HTTP-only cache.

## No compatibility bridges

This is a hard foundation migration while the product is pre-beta. Migrate the small existing dataset and update callers. Do not maintain parallel v1/v2 runtime dictionaries, dual IDs, or permanent adapters.
