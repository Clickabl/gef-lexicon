# Agent Instructions for gef-lexicon

Read `docs/LEXICON_ARCHITECTURE.md`, `docs/NAME_ENTITY_ARCHITECTURE.md`, and the relevant schemas before modifying or generating lexicon, name, entity, source, or annotation content.

## Hard Rules

1. **First-Party Licensing**: Never copy definitions or example rows from Wiktionary, FreeDict, or copyrighted dictionaries. Write new definitions natively. External data may only be imported when its license and provenance are explicitly compatible with the project.
2. **Review Status Honesty**: Generated candidate entries must use `"review_state": "candidate"`. Never mark unreviewed LLM output as `"approved"`.
3. **Form-vs-Analysis Separation**: Always place morphological features inside an array of `analyses` under each word form. One surface spelling may have multiple grammatical analyses and pronunciations.
4. **Layered Feature Buckets**: Group morphology into controlled semantic layers such as `base`, `possessor`, `subject`, `object`, and `clitic`. Keep language-specific values open where the language profile requires them.
5. **No Concept Inventing**: Do not invent fake `primary_concept_id` values. Leave the field `null` or link to an existing concept in `concepts/graph.json`.
6. **Names Are Not Ordinary Meanings**: Reusable personal names belong in `names/`. A particular fictional or real person belongs in `entities/`. A proper-name lexeme may link to those records when morphology or lookup needs a lexeme representation.
7. **Spelling Does Not Decide Entityhood**: Never classify a token as a name only because it is capitalized. Strings such as `Grace`, `Hope`, or `Will` may also be ordinary lexemes. For analyzed works, standoff semantic annotations are authoritative. For unanalyzed text, preserve all plausible lookup candidates until context resolves them.
8. **Composite Character Labels Stay Composite**: Titles, epithets, and descriptors may combine ordinary lexical senses with name records. Example: `Iron Henry` = the ordinary `iron` sense + the reusable `Henry` name + the `Iron Henry` character entity. Do not merge those three objects.
9. **Gender Evidence Is Scoped**: `known_gender` on an entity may only be populated from source evidence about that particular person/character. Name gender association belongs in sourced `gender_usage` records by region/time; never infer or invent a permanent male/female score from spelling.
10. **Coverage Staging Is Not the Dictionary**: Files under `languages/{lang}/coverage/` are candidate inventory/enrichment data used to prove source coverage and route items. They are not runtime dictionaries and must not be treated as human-approved lexical truth.
11. **Stable Text Annotations**: Do not insert hidden brackets or IDs into canonical story text. Use standoff annotations with the offset convention defined by `semantic-annotation.schema.json`.
12. **Validation**: Run `node scripts/validate-lexicon.mjs` for repository integrity. When changing the English source-coverage pass, also run `node scripts/validate-english-coverage.mjs`.
