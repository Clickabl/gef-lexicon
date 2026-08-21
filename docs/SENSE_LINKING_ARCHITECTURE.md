# Multilingual Sense Linking Architecture

## Decision

Gef does **not** store ordinary vocabulary as language-pair translations.

The canonical path is:

```text
surface/form
  -> language-specific lexeme
  -> language-specific sense
  -> language-neutral exact concept pivot(s)
  -> target-language sense(s)
  -> target-language lexeme/form(s)
```

This turns a potentially quadratic language-pair graph into a hub-and-spoke semantic graph. Adding a new language links its senses to concepts once instead of authoring translations against every other language.

The design target is not merely multilingual lookup. Gef is intended to teach any supported language from any supported best language, including script-heavy paths such as Japanese from Arabic, Japanese from Chinese, Arabic from Japanese, and so on. Semantic identity therefore has to survive both directions. A convenient near-synonym is not good enough.

## Non-negotiable semantic-equivalence rule

Ordinary translation may claim two senses are exact equivalents only when all of these are true:

1. the source occurrence resolves to a specific source-language sense;
2. that sense has an **approved** `primary` concept link;
3. the concept is declared `translation_role: "exact_pivot"`;
4. the target sense has an **approved** `primary` link to the same exact pivot;
5. target form selection is compatible with passage morphology, register, dialect/region, politeness, and syntactic role;
6. no broader, narrower, or merely related edge is silently substituted for the missing exact match.

Candidate links remain useful for development and review, but they are not translation-ready truth.

## Concepts are semantic contracts, not English labels

A `concept_key` is only an editorial identifier. It does not define the concept.

Every concept declares:

- `translation_role`: `exact_pivot` or `taxonomy_only`;
- `semantic_contract.definition_en`: internal editorial metalanguage describing the exact meaning;
- `semantic_contract.must_preserve`: meaning components every exact member must entail;
- `semantic_contract.must_not_imply`: nearby meanings that are specifically excluded.

The English editorial definition is not learner-facing text and does not make English the runtime pivot language. Runtime equivalence is concept ID to concept ID. The contract exists so reviewers can detect accidental concept broadening.

A taxonomy-only concept may organize related senses, but it can never produce an ordinary translation candidate.

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

Its safety contract is explicit:

- `senses_by_language`: **approved primary links only** and therefore translation-ready;
- `candidate_senses_by_language`: candidate primary links for review/development only;
- `sense_links_by_language`: complete active candidate + approved semantic graph, with review state preserved.

Do not use `candidate_senses_by_language` as a learner-facing exact translator.

## Link relations

A sense may link to concepts with these relations:

- `primary`: the most specific exact semantic pivot eligible for ordinary translation after approval.
- `broader`: a concept that safely generalizes the sense.
- `narrower`: a concept that covers a reviewed subtype or narrower reading associated with the sense.
- `related`: a useful semantic association that is neither equivalence nor taxonomic inclusion.

A sense has at most one active `primary` concept. This keeps default translation deterministic at the semantic-pivot layer while still allowing multiple secondary links.

If one language lexicalizes a distinction another language does not, create/use the appropriately specific exact concept rather than pretending the two senses are equivalent. A broader target sense can be offered as a visibly labeled fallback only when product logic explicitly permits broader matches.

## Translation candidate policy

Default translation candidate generation uses approved primary links only:

1. Resolve the source occurrence to a specific sense when corpus evidence exists.
2. Resolve that sense's approved `primary` exact pivot.
3. Find approved target-language senses linked to that same concept as `primary`.
4. Rank compatible target senses/forms using register, region/dialect, morphology, syntax, and passage context.
5. If no exact approved primary match exists, return **no exact translation**. Broader/narrower traversal is an explicit fallback mode, never silent synonymy.

This matters for distinctions such as register, kinship, evidentiality, honorifics, motion, aspect, animacy, social relation, or lexicalized cultural concepts. Sharing a broad semantic neighborhood does not make two expressions interchangeable.

## Why there is no giant hand-authored match table

A separate manually maintained table of every sense in every language would duplicate ownership and become a merge hotspot. The join table is still real, but it is **compiled** from concept links authored beside each sense.

For `L` languages, pairwise translation authoring trends toward `O(L²)` relationships per semantic area. Concept-mediated authoring trends toward `O(L)` links for equivalent senses, with additional edges only where the semantics genuinely differ.

## Pairwise exceptions

Direct source-language -> target-language overrides are reserved for reviewed exceptional cases where concept mediation cannot express the required translation behavior. They must never become the ordinary vocabulary model.

Examples that may justify an override later include a fixed idiom, legally constrained terminology, or a context-specific conventional translation. An override should reference the source and target senses plus provenance/review state, not raw strings alone.

Pairwise overrides must not be used to paper over a concept model that is too broad. Fix the concept first when the distinction is reusable.

## Polysemy, homography, and lexicalization mismatch

A surface spelling never identifies the translation by itself.

A polysemous lexeme has separate sense IDs. Each sense links independently to concepts. Passage-specific annotations in `Clickabl/gef-content` resolve the intended sense when known. Unanalyzed lookup may return multiple candidate senses until context disambiguates them.

This prevents a word such as English `bank` from becoming one giant translation node spanning financial institutions and river edges.

Likewise, one language may lexicalize in one word what another expresses as a phrase. Exact semantic identity belongs at the concept level, not at the assumption that one source token must equal one target token.

## Script and representation rule

Script variants, transliterations, readings, furigana, romanizations, and other representations do not get independent semantic identities merely because their strings differ.

They must resolve back to the same underlying language-specific lexical sense unless there is a genuine lexical distinction. A representation pipeline may transform orthography/readings, but it must never retranslate or paraphrase meaning.

For book editions, `gef-content` owns the exact derivation/alignment of script variants. For dictionary forms, Lexicon owns the form/analysis identity. Neither layer should create a new concept merely for a different script.

## Sentence-level fidelity is a separate proof obligation

Sense equivalence is necessary but **not sufficient** to prove that two sentences mean the same thing.

A sentence can use all the correct word senses and still add, omit, intensify, soften, reinterpret, split, or merge propositions. For example, adding “under the hot sun,” changing “is deep” to “looks very deep,” or silently inserting an emotional judgment is semantic drift even when every individual vocabulary item is valid.

Therefore:

- Lexicon proves reusable sense/concept identity.
- `gef-content` proves that each exact passage occurrence resolves to those senses.
- `gef-content` also owns sentence/anchor semantic-fidelity auditing against the work's canonical adaptation/source edition.
- Matching `anchor_id` values alone never prove semantic equivalence.
- Script/transliteration editions must derive mechanically from the approved base-language edition whenever possible and must not become independent translations.

The target invariant is reversible meaning: after language-specific grammar is accounted for, no edition should assert materially more or less propositional meaning than its canonical aligned segment unless a reviewed exception is explicitly recorded.

## Review and provenance

Concept membership is linguistic truth and therefore reviewable independently from spelling and definitions.

A `concept_links[].review_state` may be more conservative than the containing sense. Missing link review state inherits the sense/lexeme review state for compatibility. Generated links remain candidates until the normal review ladder promotes them.

Production translation lookup must require approved exact-pivot links. Development builds may retain candidates for QA, but their review state must remain visible all the way through compiled packages and runtime diagnostics.

## Content boundary

`Clickabl/gef-lexicon` owns reusable sense/concept identity.

`Clickabl/gef-content` owns exact occurrence evidence and sentence/anchor fidelity. A book annotation can say that a particular span resolves to a canonical sense. It should not copy the reusable concept graph into the book or invent book-local translation equivalences.

This lets one reviewed occurrence choose the correct sense while improvements to cross-language concept linking benefit every book that references that sense.

## Runtime/package shape

Compiled lexical packages expose both:

- the compatibility `senses.primary_concept_id` fast column while migration is active;
- `sense_concepts(sense_id, concept_id, relation, review_state)` as the complete relationship table.

Recommended indexes:

- `(sense_id, relation)` for expanding one resolved sense;
- `(concept_id, relation)` for finding cross-language equivalents;
- in shared/multilingual stores, `(concept_id, language_tag, relation)` for direct target-language lookup.

Runtime exact-translation queries must filter to approved primary links and exact-pivot concepts. A raw `sense_concepts` join without those filters is review tooling, not a safe translator.

The compatibility scalar may be removed only after all readers/compilers consume `sense_concepts`.

## Ten-pass review checklist

Every architecture review of this system should separately inspect these ten failure classes:

1. **Concept granularity** — is the pivot exact, or merely nearby/broader?
2. **Polysemy** — can one surface form leak into the wrong sense?
3. **Lexicalization mismatch** — can a one-word source require a phrase without losing meaning?
4. **Register/social meaning** — are politeness, honorific, taboo, kinship, and formality differences preserved?
5. **Morphosyntax** — are tense/aspect/mood/evidentiality/number/gender/case distinctions carried by the selected form or construction?
6. **Dialect/region** — does a valid target sense belong to the learner's selected variety?
7. **Script/representation** — are transliterations/readings derived from the same lexical identity rather than independently translated?
8. **Review-state leakage** — can candidate/generated evidence masquerade as approved equivalence?
9. **Sentence fidelity** — can any aligned sentence add, omit, intensify, soften, reinterpret, split, or merge meaning without an explicit review record?
10. **Round-trip/runtime integrity** — do compiled indexes, SQLite packages, book slices, and runtime queries preserve the same identities and safety filters deterministically?

A green result on one pass does not substitute for the other nine.

## Invariants

Validation must enforce:

1. every referenced concept exists in `concepts/graph.json`;
2. every exact-pivot concept has an explicit semantic contract;
3. no duplicate `(sense_id, concept_id, relation)` link exists;
4. at most one active `primary` concept exists per sense;
5. a `primary` link may point only to an `exact_pivot` concept;
6. legacy `primary_concept_id` and explicit primary link agree when both exist;
7. compilers never invent placeholder concepts for dangling references;
8. generated reverse indexes are deterministic;
9. learner-facing exact translation candidates require approved primary links on both sides;
10. broader/narrower/related links never silently become exact synonymy;
11. exact passage sense resolution remains in `gef-content`;
12. sentence-level anchor identity is never treated as sufficient proof of semantic fidelity;
13. script/reading variants cannot independently change meaning.

## Migration sequence

1. Add `concept_links` to the canonical sense schema and validators.
2. Add exact-pivot semantic contracts to the concept manifest.
3. Teach every compiler to normalize old `primary_concept_id` records into `sense_concepts` rows.
4. Materialize `sense_concepts` in core and book-slice SQLite packages.
5. Split approved translation-ready reverse indexes from candidate review indexes.
6. Generate the reverse concept index from all `lexicon*.json` sources, not only `lexicon.json`.
7. Gradually migrate authored senses from the scalar alias to explicit links as they are touched/reviewed.
8. Integrate canonical core senses into the shared Lexi semantic resolver so lesson-derived and dictionary-derived vocabulary do not become separate semantic silos.
9. Add content-side semantic-fidelity auditing for aligned sentences and script variants.
10. Remove the compatibility scalar only after downstream runtime consumers have migrated and the approval filters are covered by tests.
