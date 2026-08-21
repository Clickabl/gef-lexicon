# Multilingual Sense Linking Architecture

## Decision

Gef does **not** store ordinary vocabulary as language-pair translations.

The canonical path is:

```text
surface/form
  -> language-specific lexeme
  -> language-specific sense
  -> language-neutral concept link(s)
  -> target-language sense(s)
  -> target-language lexeme/form(s)
```

This turns a potentially quadratic language-pair graph into a hub-and-spoke semantic graph. Adding a new language links its senses to concepts once instead of authoring translations against every other language.

## Canonical authoring vs compiled tables

Canonical authoring stays with each language-specific sense in `languages/{lang}/lexicon*.json`:

```json
{
  "sense_id": "...",
  "sense_key": "frog-amphibian",
  "concept_links": [
    {
      "concept_id": "cpt_...",
      "relation": "primary",
      "review_state": "candidate"
    }
  ]
}
```

`concept_links` is the source-of-truth many-to-many relationship. Compilers materialize it as a relational `sense_concepts` table for fast lookup.

`primary_concept_id` is retained temporarily as a backward-compatibility alias for older records. Compilers normalize it into a `primary` concept edge. When both fields exist, validation requires them to identify the same concept. New data should prefer `concept_links`.

The global reverse index under `concepts/compiled-concept-index.json` is a generated view, not hand-authored truth.

## Link relations

A sense may link to concepts with these relations:

- `primary`: the most specific reviewed semantic pivot used for ordinary translation candidate generation.
- `broader`: a concept that safely generalizes the sense.
- `narrower`: a concept that covers a reviewed subtype or narrower reading associated with the sense.
- `related`: a useful semantic association that is neither equivalence nor a taxonomic inclusion.

A sense has at most one active `primary` concept. This keeps default translation deterministic at the semantic-pivot layer while still allowing multiple secondary links.

If one language lexicalizes a distinction another language does not, create/use the appropriately specific concept rather than pretending the two senses are exact equivalents. A broader target sense can be offered as a fallback only when product logic explicitly permits broader matches.

## Translation candidate policy

Default translation candidate generation uses `primary` links only:

1. Resolve the source occurrence to a specific sense when corpus evidence exists.
2. Resolve that sense's active `primary` concept.
3. Find active target-language senses linked to that same concept as `primary`.
4. Rank compatible target senses/forms using review/trust state, register, region/dialect, morphology, and passage context.
5. If no exact primary match exists, broader/narrower traversal is an explicit fallback mode, never silent synonymy.

This matters for distinctions such as register, kinship, evidentiality, honorifics, motion, aspect, or lexicalized cultural concepts. Sharing a broader concept does not make two expressions interchangeable.

## Why there is no giant hand-authored match table

A separate manually maintained table of every sense in every language would duplicate ownership and become a merge hotspot. The join table is still real, but it is **compiled** from concept links authored beside each sense.

For `L` languages, pairwise translation authoring trends toward `O(L²)` relationships per semantic area. Concept-mediated authoring trends toward `O(L)` links for equivalent senses, with additional edges only where the semantics genuinely differ.

## Pairwise exceptions

Direct source-language -> target-language overrides are reserved for reviewed exceptional cases where concept mediation cannot express the required translation behavior. They must never become the ordinary vocabulary model.

Examples that may justify an override later include a fixed idiom, legally constrained terminology, or a context-specific conventional translation. An override should reference the source and target senses plus provenance/review state, not raw strings alone.

## Polysemy and homography

A surface spelling never identifies the translation by itself.

A polysemous lexeme has separate sense IDs. Each sense links independently to concepts. Passage-specific annotations in `Clickabl/gef-content` resolve the intended sense when known. Unanalyzed lookup may return multiple candidate senses until context disambiguates them.

This prevents a word such as English `bank` from becoming one giant translation node spanning financial institutions and river edges.

## Review and provenance

Concept membership is linguistic truth and therefore reviewable independently from spelling and definitions.

A `concept_links[].review_state` may be more conservative than the containing sense. Missing link review state inherits the sense/lexeme review state for compatibility. Production compilers must exclude rejected/superseded links and follow the repository's normal candidate-vs-approved build policy.

Generated links remain candidates until the normal review ladder promotes them.

## Content boundary

`Clickabl/gef-lexicon` owns reusable sense/concept identity.

`Clickabl/gef-content` owns exact occurrence evidence. A book annotation can say that a particular span resolves to a canonical sense. It should not copy the reusable concept graph into the book or invent book-local translation equivalences.

This lets one reviewed occurrence choose the correct sense while improvements to cross-language concept linking benefit every book that references that sense.

## Runtime/package shape

Compiled lexical packages should expose both:

- the compatibility `senses.primary_concept_id` fast column while migration is active;
- `sense_concepts(sense_id, concept_id, relation, review_state)` as the complete relationship table.

Recommended indexes:

- `(sense_id, relation)` for expanding one resolved sense;
- `(concept_id, relation)` for finding cross-language equivalents;
- in shared/multilingual stores, `(concept_id, language_tag, relation)` for direct target-language lookup.

The compatibility scalar may be removed only after all readers/compilers consume `sense_concepts`.

## Invariants

Validation must enforce:

1. every referenced concept exists in `concepts/graph.json`;
2. no duplicate `(sense_id, concept_id, relation)` link;
3. at most one active `primary` concept per sense;
4. legacy `primary_concept_id` and explicit primary link agree when both exist;
5. compilers never invent placeholder concepts for dangling references;
6. generated reverse indexes are deterministic;
7. ordinary translation candidates come from primary concept equivalence, not broad semantic relatedness;
8. exact passage sense resolution remains in `gef-content`.

## Migration sequence

1. Add `concept_links` to the canonical sense schema and validators.
2. Teach every compiler to normalize old `primary_concept_id` records into `sense_concepts` rows.
3. Materialize `sense_concepts` in core and book-slice SQLite packages.
4. Generate the reverse concept index from all `lexicon*.json` sources, not only `lexicon.json`.
5. Gradually migrate authored senses from the scalar alias to explicit links as they are touched/reviewed.
6. Integrate canonical core senses into the shared Lexi semantic resolver so lesson-derived and dictionary-derived vocabulary do not become separate semantic silos.
7. Remove the compatibility scalar only after downstream runtime consumers have migrated.
