# Agent Instructions for gef-lexicon

Read `docs/LEXICON_ARCHITECTURE.md`, `docs/NAME_ENTITY_ARCHITECTURE.md`, `docs/LESSON_GRAPH_ARCHITECTURE.md`, `docs/LESSONS_V2_ARCHITECTURE.md`, `curriculum-v2/README.md`, and the relevant schemas before modifying or generating lexicon, name, entity, source, annotation, construction, or curriculum content.

## Repository ownership and source of truth

Gef has exactly three active product repositories:

1. **`Clickabl/gef-expo`** — app/runtime/UI, interface localization/resources, reader/download/playback/orchestration, and the product-wide language-support registry.
2. **`Clickabl/gef-content`** — canonical books/stories, editions, semantic anchors, work-specific metadata/questions/audio/assets, corpus occurrence evidence, and content packaging.
3. **`Clickabl/gef-lexicon`** — reusable lexemes, senses, morphology, constructions, semantic functions, entities/names, dictionary truth, and the canonical topic-first curriculum.

**Notion is discontinued for active Gef documentation.** Historical Notion mirrors/references may be stale. Historical references to `gef-locales` are migration residue, not current architecture.

### Product-wide language support

Before changing language coverage, scripts/regions, or support-count claims, read:

- `Clickabl/gef-expo/registry/language-support.json`
- `Clickabl/gef-expo/docs/product/LANGUAGE_SUPPORT.md`

A `languages/{lang}` directory, lexicon record, construction, or curriculum realization in this repository does **not** promote that language into a product support tier. Never copy a strategic language list/count here as a second authority.

## Work-item terminology

- **TASK** = AI/human research, review, evidence gathering, linguistic analysis, or candidate-data work.
- **TODO** = coding/implementation work such as schemas, validators, compilers, migrations, package tooling, or runtime integration.
- A Task may discover a TODO, and a TODO may depend on a Task, but do not mix unrelated research and implementation into one ambiguous work item.
- Until the human inbox is implemented, GitHub issues prefixed `TASK —` are durable Task seeds.

## Agent Review Queue

Cross-product review/research work uses the canonical queue contract in `Clickabl/gef-expo`:

- `docs/product/AGENT_REVIEW_QUEUE.md`
- `docs/product/schemas/agent-review-task-v1.schema.json`
- `docs/product/schemas/agent-review-queue-v1.postgres.sql`
- `docs/product/examples/name-unknown-task-template.md`
- Expo issue #9 tracks queue/inbox implementation.

Do not invent a lexicon-only AI research queue. Respect Q0–Q4 quality/cost gates and dependencies. Queue output may propose **candidate** lexicon/name/curriculum artifacts or PRs but may never approve its own output.

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
15. **`curriculum-v2/` Is the Only Active Curriculum Source**: Universal teaching identities live in `curriculum-v2/topics/`. Per-language truth lives in `curriculum-v2/realizations/{language-tag}/`. Best-language learner copy lives in `curriculum-v2/locales/{best-language-tag}/topics/`. Optional genuinely pair-sensitive transfer notes live in `curriculum-v2/bridges/`. Do not add or restore old `lessons/`, `lesson-families/`, v1 curriculum catalogs, pairwise course files, or retired compiler inputs for new work.
16. **Topics Are Reusable and Pair-Neutral**: A topic links to semantic functions, constructions, morphology, syntax, knowledge sets, or other reviewed facts. Never clone a topic for every learner-language pair and never add free-form lesson tags to lexemes. If a German-speaking learner needs Spanish explanations, add the missing German topic localization or a narrowly justified bridge note. Do not create a German-to-Spanish course copy.
17. **Language Realizations Are Sparse by Design**: Do not wait for “full support.” Add only the reviewed/candidate facts and capabilities currently justified for a language/topic. Missing fields remain missing. An explicit reviewed linguistic absence such as `system_status: "absent"` is different from missing data. Never manufacture a Full/Partial/None curriculum matrix to make coverage look complete.
18. **Corpus Evidence Lives With Content**: Exact work/anchor/span occurrences, example quality, practice eligibility, and book/chapter topic coverage belong in `Clickabl/gef-content`. `gef-lexicon` owns reusable linguistic and curriculum truth; it must not become a warehouse of copied story sentences.
19. **Best-Language Vocabulary Is Canonical**: A learner has a **best language**, not a “native language.” Never introduce `nativeLanguage*` fields, variables, schema keys, lesson copy, or documentation for this profile concept. Use `bestLanguage*` / “best language.” The word `native` remains valid for unrelated technical concepts such as React Native and for reviewer qualifications such as an approved native speaker.
20. **Git History Is the Legacy Archive**: Do not keep a live `legacy/lessons-v1/` tree or compatibility curriculum solely for reference. If old por/para, family, calendar, or other pedagogy is useful, inspect Git history and migrate the useful fact into the current topic/realization/localization structure. Never resurrect an old compiler or runner because it is easier to find.
21. **One Compiler Contract**: Curriculum packages are compiled by the canonical compiler in `Clickabl/gef-expo/scripts/compile-topic-runtime.mjs`. Lexicon data should be shaped for that compiler. Do not add a second topic compiler, lesson-family adapter compiler, or topic-specific compiler.
22. **Surface-Neutral Experience Data**: Topic blueprints describe reusable scene semantics such as `term_reveal`, `language_tree`, `language_comparison`, `focus_explanation`, `practice`, and `story_transfer`. Do not encode React Native component names, worksheet layout, or video framing into linguistic truth. The same scene meaning should be renderable in multiple surfaces.

## Cross-agent coordination (added 2026-08-22, per Tim)

Default to committing directly to `main`. Use a branch only for a task that's
explicitly a multi-agent coordinated project or needs server-side sequencing.
Branches, when used, are named `<tool>/<short-task-slug>`; close them out
(merge+delete, or delete and say why) rather than letting them accumulate.
Push after every commit. Shared task items (owned by `gef-expo`'s
`tasks/coding-todos.json` / `research-tasks.json`) may carry `assignee` and
`branch` fields — respect both.

### CDN auto-deploy (added 2026-08-23)

A push to `main` auto-deploys within a few seconds to
`https://cdn.clickabl.co/gef/lexicon/v1/` — this is what `gef-expo`'s
`LEXICON_BASE_URL`-driven runtime sources actually read from. The synced
subset is `concepts/`, `contracts/`, `curriculum/`, `curriculum-v2/`,
`grammar/`, `knowledge-sets/`, `languages/`, `lesson-families/`, `lexi/`,
`name-families/`, `names/`, `proficiency/`, `relations/`, `sources/`,
`works/` (see `cdn-hooks` server config; internal-only material such as
`docs/`, `scripts/`, `research/`, `legacy/`, `registry/`, `schemas/` is not
published). If you add a new top-level directory that should be
CDN-facing, it needs to be added to the receiver's allowlist too — say so
in your PR/commit rather than assuming it will show up automatically.
