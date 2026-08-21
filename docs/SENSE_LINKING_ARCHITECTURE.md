# Multilingual Sense Linking Architecture

## Decision

Gef does **not** store ordinary vocabulary as language-pair translations.

The canonical path is:

```text
surface/form
  -> language-specific lexeme
  -> language-specific sense
  -> language-neutral exact concept pivot
  -> target-language sense candidate
  -> usage compatibility gate
  -> target form/construction compatibility gate
  -> passage semantic-fidelity gate
```

This turns a potentially quadratic language-pair graph into a hub-and-spoke semantic graph. Adding a new language links its senses to concepts once instead of authoring translations against every other language.

The design target is not merely multilingual lookup. Gef is intended to teach any supported language from any supported best language, including script-heavy paths such as Japanese from Arabic, Japanese from Chinese, Arabic from Japanese, and so on. Semantic identity therefore has to survive both directions. A convenient near-synonym is not good enough.

## Non-negotiable semantic-equivalence rule

Ordinary translation may claim two senses are exact equivalents only when all of these are true:

1. the source occurrence resolves to a specific source-language sense;
2. that sense has an **approved** `primary` concept link;
3. the concept is declared `translation_role: "exact_pivot"`;
4. the source sense has an **approved and fully specified** `usage_profile`;
5. the target sense has an **approved** `primary` link to the same exact pivot;
6. the target sense has an **approved and fully specified** `usage_profile`;
7. source and target lexical usage profiles are compatible for register, lexical politeness, stance, taboo level, address/reference use, encoded social relationship, and the source/target edition's actual region or variety;
8. selected source and target form analyses are compatible for morphology-level speech distinctions where those distinctions are overtly encoded, without pretending lexical politeness and form politeness are the same field;
9. target form/construction selection preserves passage morphology and grammatical meaning rather than assuming feature names must match one-to-one;
10. the passage-level semantic audit finds no addition, omission, intensification, softening, tense/aspect/modality/participant change, or other unreviewed drift;
11. no broader, narrower, candidate, unknown, or merely related evidence is silently substituted for a missing exact match.

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

- `senses_by_language`: senses whose lexeme, sense, and primary exact-pivot edge are all approved. This means **semantic-pivot-ready**, not final translation-ready.
- `candidate_senses_by_language`: candidate primary links for review/development only.
- `sense_links_by_language`: complete active candidate + approved semantic graph, with semantic review state and structured usage metadata preserved.
- `usage_profile_ready`: true only for an approved structured usage profile. It is a separate gate from semantic-pivot approval.

Do not use `candidate_senses_by_language` as a learner-facing translator. Do not use `senses_by_language` alone as a final translator either.

## Structured usage profiles

A shared concept answers **what the sense means**. It must not be overloaded with language-specific facts about how, where, or toward whom that sense is appropriate.

Those facts live on the language-specific sense in `usage_profile`:

```json
{
  "register": ["neutral"],
  "region_scope": { "kind": "general", "tags": [] },
  "varieties": [],
  "pragmatics": {
    "politeness": ["unmarked"],
    "stance": ["unmarked"],
    "taboo_level": "none",
    "address_use": "both",
    "social_relation_tags": []
  },
  "review_state": "approved"
}
```

The model deliberately distinguishes:

- **explicit neutral**: reviewed evidence that the sense itself is neutral in that dimension;
- **explicit unmarked**: the sense does not force a marked lexical/pragmatic choice at this layer;
- **unknown**: evidence is incomplete and must not become production exact equivalence.

An approved usage profile may not leave region scope, taboo level, or address/reference behavior unknown. Its containing lexeme and sense must also be approved. An approved exact semantic pivot is invalid unless the sense also has an approved usage profile.

Usage arrays describe simultaneously applicable marked properties, not an “any of these is close enough” bag. Exact compatibility therefore compares the complete explicit marked set. For example, a source sense marked `formal + technical` is not exactly matched by a target that is merely `formal`.

Self-negating profiles are invalid authoring. `neutral` cannot coexist with another marked register, `unmarked` cannot coexist with marked lexical politeness or stance, and `neutral` stance cannot coexist with another marked stance. Combinations such as `formal + technical` remain legal because both properties can genuinely apply at once.

### Lexical politeness is not form politeness

`usage_profile.pragmatics.politeness` describes lexical/pragmatic meaning attached to the sense. A term can itself be honorific, humble, deferential, or otherwise socially marked.

`form.analyses[].features.base.politeness` describes speech-level morphology on the selected form or analysis. Japanese plain/polite/honorific/humble morphology belongs here.

These are separate compatibility gates. They must not be unioned into one set merely because both use words such as `polite` or `honorific`. A lexically unmarked sense may occur in a morphologically polite form; a lexically honorific term may also carry a separate morphological speech level.

When one side overtly marks form politeness and the other side does not, the strict resolver returns context-required rather than inventing a mismatch or silently copying the marked value. Explicit incompatible form-level values block.

### Address/reference and social relationship require occurrence context

`address_use: "both"` is not a wildcard. If one sense can be used for both address and reference while a candidate target is reference-only, the target is exact only when the actual occurrence is referential. Without occurrence use, the result is context-required.

Likewise, language-specific social-relation tags are constraints, not fuzzy similarity labels. If an occurrence supplies explicit social-relation context, each source and target sense must be licensed by that context. Without such context, differing marked relation sets do not silently pass because one tag happens to overlap.

### Region and variety apply to the source too

Resolving a source sense ID does not prove that the sense was valid for the source edition's variety. A region-restricted or dialect-restricted source sense must be checked against the actual source edition just as a target candidate is checked against the requested target variety.

This prevents a regionally valid dictionary sense from being smuggled into an occurrence authored in a different variety merely because its concept ID is correct.

## Link relations

A sense may link to concepts with these relations:

- `primary`: the most specific exact semantic pivot eligible for ordinary translation after approval.
- `broader`: a concept that safely generalizes the sense.
- `narrower`: a concept that covers a reviewed subtype or narrower reading associated with the sense.
- `related`: a useful semantic association that is neither equivalence nor taxonomic inclusion.

A sense has at most one active `primary` concept. This keeps default translation deterministic at the semantic-pivot layer while still allowing multiple secondary links.

If one language lexicalizes a distinction another language does not, create/use the appropriately specific exact concept rather than pretending the two senses are equivalent. A broader target sense can be offered as a visibly labeled fallback only when product logic explicitly permits broader matches.

## Translation candidate policy

Default translation candidate generation is intentionally multi-stage:

1. Resolve the source occurrence to a specific sense when corpus evidence exists.
2. Resolve that sense's approved `primary` exact pivot.
3. Require the source sense's approved usage profile.
4. Validate any source region/variety restrictions against the actual source edition.
5. Find approved target-language senses linked to that same concept as `primary`.
6. Require each target sense's approved usage profile.
7. Compare the full lexical usage contract: register, lexical politeness, stance, taboo level, address/reference behavior, social relationship, and source/target region/variety.
8. Compare selected form-level politeness separately from lexical politeness.
9. `scripts/lib/translation-candidates.mjs` may return a compatible sense candidate, a context-required result, or no safe target candidate.
10. Only after that may form/construction selection resolve the rest of morphology and syntax.
11. Passage-level content alignment must still prove the final sentence preserves the same proposition.
12. If no exact approved path exists, return **no exact translation**. Broader/narrower traversal is an explicit fallback mode, never silent synonymy.

A result from the strict candidate resolver is still not a final surface translation. It means semantic identity plus reviewed lexical usage and supplied occurrence context are safe enough to continue to form/construction and passage-level checks.

This matters for distinctions such as register, kinship, evidentiality, honorifics, motion, aspect, animacy, social relation, or lexicalized cultural concepts. Sharing a broad semantic neighborhood does not make two expressions interchangeable.

## Why there is no giant hand-authored match table

A separate manually maintained table of every sense in every language would duplicate ownership and become a merge hotspot. The join table is still real, but it is **compiled** from concept links authored beside each sense.

For `L` languages, pairwise translation authoring trends toward `O(L²)` relationships per semantic area. Concept-mediated authoring trends toward `O(L)` links for equivalent senses, with additional edges only where the semantics genuinely differ.

## Pairwise exceptions

Direct source-language -> target-language overrides are reserved for reviewed exceptional cases where concept mediation cannot express the required translation behavior. They must never become the ordinary vocabulary model.

Examples that may justify an override later include a fixed idiom, legally constrained terminology, or a context-specific conventional translation. An override should reference the source and target senses plus provenance/review state, not raw strings alone.

Pairwise overrides must not be used to paper over a concept model that is too broad. Fix the concept first when the distinction is reusable. If the behavior is constructional or idiomatic, prefer the construction layer over a lexical pair override.

## Polysemy, homography, and lexicalization mismatch

A surface spelling never identifies the translation by itself.

A polysemous lexeme has separate sense IDs. Each sense links independently to concepts. Passage-specific annotations in `Clickabl/gef-content` resolve the intended sense when known. Unanalyzed lookup may return multiple candidate senses until context disambiguates them.

This prevents a word such as English `bank` from becoming one giant translation node spanning financial institutions and river edges.

Likewise, one language may lexicalize in one word what another expresses as a phrase. Exact semantic identity belongs at the concept level, not at the assumption that one source token must equal one target token.

## Morphology is realization, not an English-shaped identity test

Form analyses record language-specific morphology such as tense, aspect, mood, case, number, gender, person, and politeness. Exact translation does **not** require source and target forms to expose identical feature keys.

For example, an English occurrence may semantically denote one frog while Japanese uses a noun form that does not overtly mark singular number. That is not automatically semantic loss. The sentence or construction may preserve the quantity elsewhere or leave it recoverable in exactly the same way the target language normally does.

The correct invariant is therefore:

- source passage meaning is represented by the resolved sense + occurrence context + construction;
- target form/construction must realize the same proposition;
- overt morphology may differ cross-linguistically;
- if tense, aspect, modality, participant role, number, social meaning, or another proposition-bearing distinction changes, the content semantic-fidelity audit must record drift.

Do not create a fake universal morphology equation merely to make target forms mechanically match English feature names.

## Script and representation rule

Script variants, transliterations, readings, furigana, romanizations, and other representations do not get independent semantic identities merely because their strings differ.

They must resolve back to the same underlying language-specific lexical sense unless there is a genuine lexical distinction. A representation pipeline may transform orthography/readings, but it must never retranslate or paraphrase meaning.

For book editions, `gef-content` owns the exact derivation/alignment of script variants. For dictionary forms, Lexicon owns the form/analysis identity. Neither layer should create a new concept merely for a different script.

New contract-v1 book representation derivatives are required to bind each target segment to:

- the same work and approved/frozen base-language edition;
- the exact base edition ID;
- the same semantic-anchor version;
- the same anchor ID and order;
- a SHA-256 hash of the exact base segment text;
- the derivation method and generator.

If the base wording changes later, the derivative proof becomes stale and validation fails. Unsupported transliteration targets must fail closed rather than returning the source script and pretending generation succeeded.

## Sentence-level fidelity is a separate proof obligation

Sense equivalence is necessary but **not sufficient** to prove that two sentences mean the same thing.

A sentence can use all the correct word senses and still add, omit, intensify, soften, reinterpret, split, or merge propositions. For example, adding “under the hot sun,” changing “is deep” to “looks very deep,” or silently inserting an emotional judgment is semantic drift even when every individual vocabulary item is valid.

Therefore:

- Lexicon proves reusable sense/concept identity.
- `gef-content` proves that each exact passage occurrence resolves to those senses.
- `gef-content` also owns sentence/anchor semantic-fidelity auditing against the work's canonical adaptation/source edition.
- Matching `anchor_id` values alone never prove semantic equivalence.
- Semantic atoms below an anchor allow one-to-many or many-to-one span realization without pretending sentence boundaries must match.
- Script/transliteration editions must derive mechanically from the approved base-language edition whenever possible and must not become independent translations.

The content semantic audit recognizes changes such as addition, omission, intensification, softening, modality, aspect, tense, politeness/register, participant/role, reference, scope, presupposition, and implicature. This is where proposition-bearing morphology is checked after language-specific realization.

The target invariant is reversible meaning: after language-specific grammar is accounted for, no edition should assert materially more or less propositional meaning than its canonical aligned segment unless a reviewed exception is explicitly recorded.

## Review and provenance

Concept membership is linguistic truth and therefore reviewable independently from spelling, definitions, and usage.

A `concept_links[].review_state` may be more conservative than the containing sense. Missing link review state inherits the sense/lexeme review state for compatibility. Generated links remain candidates until the normal review ladder promotes them.

Production semantic-pivot lookup requires approved lexeme + sense + exact primary concept edge. Production translation continuation additionally requires an approved, fully specified usage profile.

Development builds may retain candidates for QA, but their review state must remain visible all the way through compiled packages and runtime diagnostics.

## Content boundary

`Clickabl/gef-lexicon` owns reusable sense/concept identity and language-specific usage compatibility facts.

`Clickabl/gef-content` owns exact occurrence evidence and sentence/anchor fidelity. A book annotation can say that a particular span resolves to a canonical sense. It should not copy the reusable concept graph into the book or invent book-local translation equivalences.

This lets one reviewed occurrence choose the correct sense while improvements to cross-language concept linking benefit every book that references that sense.

## Runtime/package shape

Compiled lexical packages expose the many-to-many semantic relationship through `sense_concepts(sense_id, concept_id, relation, review_state)`. The compatibility `senses.primary_concept_id` fast column remains temporarily during migration.

The generated `concepts/compiled-concept-index.json` schema v5 additionally carries:

- approved and candidate sense buckets separately;
- `semantic_pivot_ready` on each rich sense link;
- `usage_profile` and `usage_profile_ready` on each rich sense link;
- legacy register labels for migration diagnostics only.

The strict translation candidate resolver consumes these independent readiness gates. A raw `sense_concepts` join is review tooling, not a safe translator.

Structured usage data now survives every current lexical package path:

- legacy core-v1 dictionaries include `usage_profile_json` on `senses`;
- deterministic core-v2 packages include `usage_profile_json` as a fast sense field and use field-policy version 3;
- book-specific lexicon-v2 slices include `usage_profile_json` under sense-link extension version 2.

Round-trip regressions reopen the generated SQLite and compare each packaged usage profile back to canonical source data by `sense_id`. Package compilation therefore may not silently discard or mutate the compatibility evidence.

This does **not** make a SQLite concept join a complete translator. Runtime still has to read the usage profile, apply occurrence context and form/construction gates, and preserve approval state. Package availability solves transport; it does not waive translation logic.

Recommended indexes and access paths:

- `(sense_id, relation)` for expanding one resolved sense;
- `(concept_id, relation)` for finding cross-language equivalents;
- `(concept_id, language_tag, relation)` in shared/multilingual stores;
- directly accessible `usage_profile_json` keyed by `sense_id` for the contextual gate.

The compatibility scalar may be removed only after all readers consume `sense_concepts` and structured usage profiles.

## Ten-pass review checklist

Every architecture review of this system should separately inspect these ten failure classes:

1. **Concept granularity**: is the pivot exact, or merely nearby/broader?
2. **Polysemy**: can one surface form leak into the wrong sense?
3. **Lexicalization mismatch**: can a one-word source require a phrase without losing meaning?
4. **Register/social meaning**: are lexical politeness, form speech level, taboo, kinship, address/reference, and social-relation constraints preserved independently?
5. **Morphosyntax**: are tense/aspect/mood/evidentiality/number/gender/case distinctions preserved by the selected target form/construction or proposition-level context?
6. **Dialect/region**: are both the resolved source sense and target candidate licensed in their actual edition/learner varieties?
7. **Script/representation**: are transliterations/readings derived from the same approved lexical/content identity rather than independently translated or silently copied?
8. **Review-state leakage**: can candidate/generated semantic or usage evidence masquerade as approved equivalence?
9. **Sentence fidelity**: can any aligned sentence add, omit, intensify, soften, reinterpret, split, or merge meaning without an explicit review record?
10. **Round-trip/runtime integrity**: do compiled indexes, SQLite packages, book slices, and runtime queries preserve the same identities and safety filters deterministically?

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
9. approved semantic pivots require approved lexeme + sense + exact primary edge;
10. approved semantic pivots also require an approved fully specified usage profile before translation continuation;
11. structured usage profiles cannot contain self-negating neutral/unmarked combinations;
12. lexical politeness and selected-form politeness remain separate compatibility dimensions;
13. source and target region/variety restrictions are both validated against occurrence/edition context;
14. broader/narrower/related links never silently become exact synonymy;
15. exact passage sense resolution remains in `gef-content`;
16. sentence-level anchor identity is never treated as sufficient proof of semantic fidelity;
17. script/reading variants cannot independently change meaning or silently succeed on unsupported transforms;
18. unknown usage evidence remains candidate/review-required rather than production exact;
19. v1/v2 core and book-slice compilation preserves structured usage profiles and their review state;
20. runtime exact translation still applies semantic, usage, occurrence, form/construction, and passage-fidelity gates after package lookup.

## Migration sequence

1. Add `concept_links` to the canonical sense schema and validators. **Done on `senses`.**
2. Add exact-pivot semantic contracts to the concept manifest. **Done on `senses`.**
3. Split approved semantic-pivot indexes from candidate review indexes. **Done on `senses`.**
4. Add structured usage profiles and hierarchical review validation. **Done on `senses`.**
5. Add a strict semantic-pivot + usage candidate resolver and tests. **Done on `senses`.**
6. Add content-side semantic-fidelity auditing and semantic atoms. **Experimental pilot exists on `senses`.**
7. Add hash-bound approved-base derivation contracts for new script/read-aid variants. **Implemented on the content `senses` branch; legacy variants remain to migrate.**
8. Teach every compiler to normalize old `primary_concept_id` records into `sense_concepts` rows. **Semantic links are materialized; compatibility scalar remains.**
9. Extend v1/v2 core and book-slice package schemas to materialize structured usage profiles and add package-level round-trip tests. **Done on `senses`; runtime consumer migration remains.**
10. Separate lexical/pragmatic politeness from selected-form speech-level morphology, and pass source/target edition plus occurrence social context into the strict resolver. **Done on `senses`.**
11. Gradually migrate authored senses from the scalar alias to explicit links and complete usage profiles as they are reviewed. **Remaining.**
12. Integrate canonical core senses into the shared Lexi/runtime resolver so lesson-derived and dictionary-derived vocabulary do not become separate semantic silos. **Remaining.**
13. Expand the one-book pilot beyond the current Frog King slice only after the contracts and package round-trip tests are green. **Remaining.**
14. Remove the compatibility scalar only after downstream runtime consumers have migrated and approval/usage filters are covered end-to-end. **Remaining.**
