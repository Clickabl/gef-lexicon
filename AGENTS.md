# Agent Instructions for gef-lexicon

Read `docs/LEXICON_ARCHITECTURE.md`, `docs/NAME_ENTITY_ARCHITECTURE.md`, `docs/LESSON_GRAPH_ARCHITECTURE.md`, and the relevant schemas before modifying or generating lexicon, name, entity, source, annotation, construction, or lesson content.

## Repository ownership and source of truth

Gef now has exactly three active product repositories:

1. **`Clickabl/gef-expo`** — app/runtime/UI, interface localization/resources, reader/download/playback/orchestration.
2. **`Clickabl/gef-content`** — canonical books/stories, editions, semantic anchors, work-specific metadata/questions/audio/assets, corpus occurrence evidence, and content packaging.
3. **`Clickabl/gef-lexicon`** — reusable lexemes, senses, morphology, constructions, semantic functions, entities/names, dictionary truth, curriculum graph, lessons, and reusable lesson renderings.

**Notion is discontinued for active Gef documentation.** Historical Notion mirrors/references may be stale. New linguistic, dictionary, and curriculum decisions belong in this repository. Historical references to `gef-locales` are migration residue, not current architecture.

For product-wide language support tiers and counts, `Clickabl/gef-expo/registry/language-support.json` is canonical. If it has not landed on the current checkout, inspect the active language-support SSOT work/PR rather than copying an older list into this repository. Scripts may consume that registry from a sibling checkout or explicit path; do not make Lexicon a second language-list authority.

## Agent Review Queue

Cross-product review/research work is coordinated by the canonical queue contract in `Clickabl/gef-expo`:

- `docs/product/AGENT_REVIEW_QUEUE.md`
- `docs/product/schemas/agent-review-task-v1.schema.json`
- `docs/product/schemas/agent-review-queue-v1.postgres.sql`
- `docs/product/examples/name-unknown-task-template.md`
- `gef-expo` issue #9 tracks the human inbox and future agent executor.

If lexicon/name/grammar/lesson work needs later review or research, emit/propose a structured queue task or signal compatible with that contract instead of inventing a local executable research queue. Respect Q0–Q4 quality/cost gates and dependencies. Queue results may create **candidate** lexicon/name/lesson artifacts or PRs, but they may never mark their own output approved. Large evidence/logs should be attached/referenced as artifacts rather than embedded in canonical lexicon rows.

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
13. **Semantic Functions Are Not English Words**: Curriculum concepts use language-neutral functions such as `SEM.PURPOSE`, `SEM.CAUSE_REASON`, and `SEM.PATH_ROUTE`. Never use a polysemous English spelling such as `for` as the universal semantic identity.
14. **Constructions Are First-Class**: Language-specific grammar, syntax, discourse patterns, and contrast systems belong in `languages/{lang}/constructions.json`. Do not force every grammar distinction into a lexical sense when the distinction belongs to a construction.
15. **Lessons Are Reusable**: A lesson links to lexemes, senses, constructions, morphology, syntax, and semantic functions. Never copy one lesson into every book and never add free-form `lesson_tag` strings to lexemes.
16. **Rule IDs Describe Meaning, Not Presentation Order**: Use stable rule IDs such as `RULE.es.por_para.para_purpose`. A UI may reorder the lesson without changing corpus annotations.
17. **Lesson Logic and Rendering Are Separate**: `lesson.json` owns reusable pedagogical logic. `renderings/{support-language}.json` owns explanation wording. Do not clone logical lessons for every learner language pair.
18. **Corpus Evidence Lives With Content**: Exact work/anchor/span occurrences, example quality, practice eligibility, and book/chapter lesson coverage belong in `Clickabl/gef-content`. `gef-lexicon` owns reusable linguistic and lesson truth; it must not become a warehouse of copied story sentences.
