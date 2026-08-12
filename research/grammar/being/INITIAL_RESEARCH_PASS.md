# Being grammar research — initial structured pass

Date: 2026-08-11

**Status:** candidate initial research pass complete; native/specialist review still required.

This document records the first structured implementation pass for `LES.mul.grammar.being` after the product moved to a three-tier curriculum model.

## What is now implemented

The universal lesson uses 13 language-neutral semantic functions:

1. `SEM.IDENTITY_EQUIVALENCE`
2. `SEM.CLASSIFICATION_ROLE`
3. `SEM.CHARACTERISTIC_PROPERTY`
4. `SEM.CURRENT_STATE`
5. `SEM.RESULTANT_STATE`
6. `SEM.ENTITY_LOCATION`
7. `SEM.EVENT_LOCATION`
8. `SEM.EXISTENCE_PRESENCE`
9. `SEM.ABSENCE_NONEXISTENCE`
10. `SEM.TIME_DATE_PREDICATION`
11. `SEM.ORIGIN_AFFILIATION`
12. `SEM.MATERIAL_COMPOSITION`
13. `SEM.POSSESSION_AS_EXISTENCE`

Each Tier 1 and Tier 2 language now has a candidate structured map at:

`lessons/mul/to-be-or-not-to-be/language-maps/{lang}.json`

Tier 1: `en`, `es`, `fr`, `pt`, `it`, `el`.

Tier 2: `zh`, `ja`, `de`, `ko`, `ar`, `hi`, `uk`, `ru`, `tr`, `pl`, `fa`, `id`, `ca`, `gl`, `mk`.

The maps do **not** copy Spanish rules across languages. Each language assigns its own forms/constructions to the same semantic territory. Examples include zero copulas, bound copular morphology, separate existential predicates, animate/inanimate existence splits, and ser/estar-style systems with language-specific boundaries.

## Translation layer

`lessons/mul/to-be-or-not-to-be/concept-labels.json` contains candidate labels for all 13 semantic functions in all 21 Tier 1/2 support languages.

The lesson title is deliberately not translated. The canonical title is the English Shakespeare quote fragment:

**To be or not to be**

Localized material begins with the lesson explanation and semantic/concept labels, not the quote itself.

## Tier depth

- **Tier 1:** these maps are the start of a full grammar inventory and eventual complete lesson path. Major omissions discovered during review should become additional grammar rules rather than being ignored merely because this first lesson already works.
- **Tier 2:** completion is lesson-scoped. Review only needs to make the Being lesson accurate and useful; it does not create an obligation to document the entire grammar of the language.
- **Tier 3:** no Being grammar lesson research obligation. Tier 3 is Read + Games only, although the lexicon may still contain grammar needed for parsing, dictionary lookup, and corpus analysis.

## Research/review queue

Open research Tasks #15–#36 track the universal model and language-specific review. The current JSON maps are candidate implementation artifacts from the initial pass, not evidence that those Tasks have passed native/specialist review.

Review should check, per language:

- whether each semantic slot is actually pedagogically useful in the Being family;
- standard-language vs dialect/register boundaries;
- zero-copula and tense/aspect conditions;
- predicate case/agreement/definiteness where relevant;
- lexical alternatives that should not be misrepresented as one grammatical rule;
- negative existential behavior;
- entity-location vs event-location distinctions;
- possession-through-existence only where genuinely part of that language's system;
- source quality and exact examples.

## Important cross-language guardrail

`permanent = ser` and `temporary = estar` is **not** the universal architecture. Even within Spanish it is an unreliable simplification. The semantic graph describes what a clause is doing; language-specific mappings describe how that language realizes it.

## Spanish book anchor

*The Bremen Town Musicians* remains a strong Spanish corpus candidate because one story naturally supplies contrasting Being functions, including examples previously identified such as:

- `Ahora está débil`
- `Es viejo`
- `Bremen todavía está lejos`
- `la casa está llena de monstruos`
- `...por ser viejos`

Exact corpus spans and review state belong in `gef-content`, not this reusable research note.
