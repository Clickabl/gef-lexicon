# Occurrence sense and lexical-relation policy

## Core rule

A spelling, lexeme, relation edge, prior translation, or translation-memory hit never authorizes a translation by itself.

Exact translation is occurrence-first:

1. Bind the source occurrence/span to a language-specific `sense_id` using its local sentence/paragraph/discourse context.
2. Resolve that sense only through an approved `exact_pivot` concept edge and approved usage/context profile.
3. Bind the target occurrence/span independently to its own language-specific `sense_id`.
4. Approve an exact lexical match only when both independently resolved senses share the same approved exact pivot and their contextual/usage constraints are compatible.
5. Passage-level semantic alignment/audit remains an additional check. Word-level pivot identity does not prove that the whole translated passage is faithful.

If any step is ambiguous, candidate, unsupported, contradictory, or missing, the occurrence remains unresolved/candidate. Never reuse the sense selected for another occurrence merely because the surface spelling is identical.

## `cita` example

Spanish `cita` is a lexeme with multiple senses. Those senses must not be collapsed.

- Romantic context: `Juan tuvo una cita con Ana.`
  - occurrence `cita` -> Spanish romantic-meeting sense -> romantic-date exact pivot.
- Appointment context: `Juan tenía una cita con su dentista.`
  - occurrence `cita` -> Spanish scheduled-appointment sense -> appointment exact pivot.

An English occurrence of `date` in a romantic context may share the romantic-date pivot with the first Spanish occurrence. That does **not** create a global `date <-> cita` translation edge. Future `cita` occurrences are disambiguated independently.

The same rule applies in reverse. Looking up the Spanish surface form must return its candidate senses/concepts, not whichever English word was most recently aligned to it.

## Terminology

- **Occurrence sense annotation** / **word-sense annotation**: attach a `sense_id` to one concrete token/span occurrence.
- **Word-sense disambiguation (WSD)**: choose among candidate senses for that occurrence from context.
- **Semantic alignment**: align meaning-bearing source and target atoms/spans across editions/languages. Alignment may be one-to-one, one-to-many, many-to-one, discontinuous, or overlapping.
- **Lexical relation graph**: typed relationships among stable lexeme/sense/concept/pronunciation/entity IDs.
- **Entity linking**: bind a mention such as a person's/place's localized name to one stable entity ID.
- **Reference resolution**: bind a human-authored citation/name to stable content-structure IDs.

"Reverse tagging" should be implemented as **bidirectional occurrence-sense validation**: source and target are tagged independently, then compared. Reverse lookup never mutates or infers lexical equivalence.

## Relation graph safety

Relations such as synonymy, antonymy, taxonomy, form similarity, or etymology are useful for learner discovery but have `translation_authority: none`.

Examples:

- `bullfrog` -> `frog`: normally `hyponym` (bullfrog is a narrower kind of frog).
- `frog` <-> `toad`: normally `coordinate_term` or `related`, depending on the reviewed taxonomy; never silently exact.
- true contextual synonyms: may be `near_synonym`; if two language-specific senses genuinely have identical semantic contracts, exact translation is still represented by their independent membership in the same approved `exact_pivot`, not by the synonym edge.
- `homonym`, `homophone`, and `homograph`: form/lexical relations only. They never supply semantic equivalence.
- `confusable`: learner-warning relation only.

## Sense-level, not spelling-level

Semantic relations should target senses whenever the relationship is meaning-specific. Lexeme-level relations are acceptable only for whole-form properties such as some homography/homophony relationships. Pronunciation-level relations should be used where pronunciation identity matters.

No operation may promote all senses of a lexeme because one sense was approved.

## Imported dictionary data

Wiktionary/Kaikki and similar sources are candidate evidence, not Gef approval.

Imported records must preserve:

- source and source record identity;
- source revision/date where available;
- relation type as supplied or normalized by a documented importer;
- provenance/license metadata required by the source;
- candidate review state by default.

Imported "synonym" labels must never automatically create exact-pivot membership. Imported translations must never automatically create approved cross-language exact equivalence.

## Translation-memory / corpus feedback

Observed aligned occurrences may improve ranking for future WSD candidates, but they are evidence only. Corpus frequency can say "this sense is likely here"; it cannot say "this spelling always means this sense."

A model may use surrounding words, syntactic role, semantic roles, named entities, domain, register, previous discourse, and previously resolved references as evidence. If competing senses remain plausible, the output remains candidate/unresolved rather than guessing and feeding the guess back into the ontology.

## Review lifecycle

Lexical relation review state is separate from content-release/trust state. A relation can be candidate while the underlying book is otherwise approved, and a book can be machine-stage while using already-approved dictionary senses.

Do not use pilot flags such as `experiment_only` as semantic confidence. Pilot isolation, catalog publication, lexical review, and content trust are separate dimensions.
