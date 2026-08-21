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
7. source and target usage profiles are compatible for register, region/variety, politeness, stance, taboo level, address/reference use, and encoded social relationship;
8. target form/construction selection preserves the passage's morphology and grammatical meaning rather than assuming feature names must match one-to-one;
9. the passage-level semantic audit finds no addition, omission, intensification, softening, tense/aspect/modality/participant change, or other unreviewed drift;
10. no broader, narrower, candidate, unknown, or merely related evidence is silently substituted for a missing exact match.

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
- **explicit unmarked**: the language/sense does not force a marked lexical choice at this layer;
- **unknown**: evidence is incomplete and must not become production exact equivalence.

An approved usage profile may not leave region scope, taboo level, or address/reference behavior unknown. Its containing lexeme and sense must also be approved. An approved exact semantic pivot is invalid unless the sense also has an approved usage profile.

Morphological politeness such as Japanese plain/polite/honorific/humble forms remains on form analyses. The usage resolver combines sense-level pragmatics with the selected form analysis instead of flattening every speech-level distinction into the concept graph.

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
4. Find approved target-language senses linked to that same concept as `primary`.
5. Require the target sense's approved usage profile.
6. Run `scripts/lib/usage-compatibility.mjs` to compare register, pragmatics, region/variety, and selected form politeness.
7. `scripts/lib/translation-candidates.mjs` may return a compatible sense candidate, a context-required result, or no safe target candidate.
8. Only after that may form/construction selection resolve morphology and syntax.
9. Passage-level content alignment must still prove the final sentence preserves the same proposition.
10. If no exact approved path exists, return **no exact translation**. Broader/narrower traversal is an explicit fallback mode, never silent synonymy.

A result from the strict candidate resolver is still not a final surface translation. It means semantic identity plus sense-level usage are safe enough to continue to form/construction and passage-level checks.

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

**Current migration caveat:** the existing v1/v2 per-language SQLite compilers predate structured `usage_profile` materialization. Until those package schemas are extended and tested, runtime translation code must not assume a SQLite `sense_concepts` join contains enough data to make a final exact-translation decision. The generated concept index is currently the complete tested projection for semantic + usage candidate gating. Extending the SQLite/core/book-slice packages is an explicit remaining migration step, not something to hand-wave away.

Recommended indexes once the package migration lands:

- `(sense_id, relation)` for expanding one resolved sense;
- `(concept_id, relation)` for finding cross-language equivalents;
- `(concept_id, language_tag, relation)` in shared/multilingual stores;
- a directly accessible usage-profile payload keyed by `sense_id` so runtime does not discard the contextual gate.

The compatibility scalar may be removed only after all readers/compilers consume `sense_concepts` and usage profiles.

## Ten-pass review checklist

Every architecture review of this system should separately inspect these ten failure classes:

1. **Concept granularity**: is the pivot exact, or merely nearby/broader?
2. **Polysemy**: can one surface form leak into the wrong sense?
3. **Lexicalization mismatch**: can a one-word source require a phrase without losing meaning?
4. **Register/social meaning**: are politeness, honorific, taboo, kinship, address/reference, and formality differences preserved?
5. **Morphosyntax**: are tense/aspect/mood/evidentiality/number/gender/case distinctions preserved by the selected target form/construction or proposition-level context?
6. **Dialect/region**: does a valid target sense belong to the learner's selected variety?
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
11. broader/narrower/related links never silently become exact synonymy;
12. exact passage sense resolution remains in `gef-content`;
13. sentence-level anchor identity is never treated as sufficient proof of semantic fidelity;
14. script/reading variants cannot independently change meaning or silently succeed on unsupported transforms;
15. unknown usage evidence remains candidate/review-required rather than production exact;
16. per-language package compilation must eventually preserve every safety field required by the strict resolver before SQLite-only translation is enabled.

## Migration sequence

1. Add `concept_links` to the canonical sense schema and validators. **Done on `senses`.**
2. Add exact-pivot semantic contracts to the concept manifest. **Done on `senses`.**
3. Split approved semantic-pivot indexes from candidate review indexes. **Done on `senses`.**
4. Add structured usage profiles and hierarchical review validation. **Done on `senses`.**
5. Add a strict semantic-pivot + usage candidate resolver and tests. **Done on `senses`.**
6. Add content-side semantic-fidelity auditing and semantic atoms. **Experimental pilot exists on `senses`.**
7. Add hash-bound approved-base derivation contracts for new script/read-aid variants. **Implemented on the content `senses` branch; legacy variants remain to migrate.**
8. Teach every compiler to normalize old `primary_concept_id` records into `sense_concepts` rows. **Semantic links are materialized; compatibility scalar remains.**
9. Extend v1/v2 core and book-slice package schemas to materialize structured usage profiles and add package-level round-trip tests. **Remaining.**
10. Gradually migrate authored senses from the scalar alias to explicit links and complete usage profiles as they are reviewed. **Remaining.**
11. Integrate canonical core senses into the shared Lexi/runtime resolver so lesson-derived and dictionary-derived vocabulary do not become separate semantic silos. **Remaining.**
12. Expand the one-book pilot beyond the current Frog King slice only after the contracts and package round-trip tests are green. **Remaining.**
13. Remove the compatibility scalar only after downstream runtime consumers have migrated and approval/usage filters are covered end-to-end. **Remaining.**
