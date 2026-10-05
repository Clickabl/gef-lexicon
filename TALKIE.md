# TALKIE — gef-lexicon

Repository-local coordination log. Append new entries at the bottom. Do not rewrite or delete older entries when a decision changes; add a newer entry that supersedes it.

## [2026-08-12 08:44 MDT] GPT-5.6 Sol — contract — multilingual family-members lesson pattern

Built `LES.mul.vocab.family_members` on branch `lesson/family-members` as the reusable lexical-semantic pattern for family vocabulary.

### Landed paths

- `lessons/mul/family-members/lesson.json`
- `lessons/mul/family-members/renderings/en.json`
- `lesson-families/family-members/language-capabilities.json`
- `lesson-families/family-members/source-bridges/{manifest,tier1,tier2,tier3,tier4}.json`
- `lesson-families/family-members/target-profiles/{manifest,tier1,tier2}.json`
- `docs/FAMILY_MEMBERS_LESSON_RESEARCH.md`
- `scripts/validate-family-members.mjs`
- `curriculum/lesson-catalog.json`
- `package.json`

### Reusable contract for the other lesson chats

1. **Do not build pair matrices.** Resolve `learning_from` and `learning` independently. A short source-language bridge plus structured target-language facts scales to English→Spanish, Greek→Portuguese, Chinese→English, Nepali→Portuguese, etc. without 104 × N bespoke lessons.
2. **104-source sharding is settled for this pattern:** Tier 1 = 6, Tier 2 = 15, Tier 3 = 30, Tier 4 = 53, exactly matching `gef-expo/registry/language-support.json` `programs.learnFromLanguages`.
3. **Tier 1 + Tier 2 are the current full target-teaching set (21 languages).** Tier 3/4 can still be source/explanation languages. Do not mistake learn-from coverage for a promise of a full target-language course.
4. **The source bridge is intentionally short.** It orients the learner in their own language. The target profile carries the longer explanation, representative forms, distinction dimensions, cultural caution, and examples.
5. **Separate facts from prose.** Target profiles store structured distinctions such as relative sibling age, maternal/paternal side, speaker gender, affinity, and address/register. Source-language rendering can localize those facts later without changing the relationship model.
6. **Reuse existing lesson elements before creating new ones.** Family Members uses the existing `language_comparison_loop`, `compare_realizations`, `features_to_form`, and `form_to_features` primitives. No family-only renderer block was introduced because none was needed.
7. **If another lesson genuinely needs a new reusable block or practice primitive, document its contract here when it lands.** Do not make a one-off UI shape inside a single lesson when the same semantic job can be represented by an existing block.
8. **Cultural notes are required where language facts touch social practice.** A lexical distinction is not evidence that every family/community using the language has the same social structure. Keep language, culture, region, household practice, and literal biological relationship separate.
9. **Generated coverage is not reviewed coverage.** The 104 bridge entries and 21 target profiles begin at `machine_translated` / `generated`; promotion happens per language through the normal Gef trust ladder.
10. **Validation is part of the contract.** `npm run validate:family-members` checks exact 104 source coverage, exact 21 full-target coverage, tier alignment when the Expo registry is available, duplicates, required profile fields, and lesson/rendering identity. The main `npm run validate` chain now includes it.

### Concrete worked example

The English rendering uses English→Spanish. It teaches that Spanish commonly marks gender in `hermano/hermana`, `tío/tía`, `primo/prima`, etc.; normally adds relative sibling age with `mayor/menor`; and normally adds maternal/paternal side descriptively when it matters rather than using separate basic aunt/uncle/grandparent nouns for each side.

### Editorial/research guardrail

See `docs/FAMILY_MEMBERS_LESSON_RESEARCH.md`. Kinship is a classic lexical-typology domain with real cross-linguistic diversity. Do not turn “this language lexicalizes X” into “people who speak this language value X more,” and do not invent detailed lower-resource profiles solely to reach a coverage number.

## [2026-08-12 09:10 MDT] GPT-5.6 Sol — contract — ordered concept sets and calendar/year lessons

Built three separate A1 multilingual lessons: `LES.mul.time.days_of_week`, `LES.mul.time.months_of_year`, and `LES.mul.time.seasons`. English→Spanish is the worked rendering, but the graph resolves best-language/source copy independently from learning-language facts so Greek→Portuguese, Chinese→English, Nepali→Portuguese, and other valid profile combinations do not need pair-specific lesson files.

### Current language-tier correction

This entry supersedes the tier-count statement in the 08:44 entry above. The current `gef-expo/registry/language-support.json` schema v4 has **Tier 1 = 6, Tier 2 = 15, Tier 3 = 83**, for exactly **104** canonical `programs.learnFromLanguages`. There is no current Tier 4 lesson bucket in that registry. For these lessons, Tier 1 + Tier 2 are the full learning/target set (21 languages); all 104 may supply best-language/source explanation copy. Always reread the live Expo registry before repeating these counts.

### Landed paths

- `schemas/ordered-concept-set.schema.json`
- `knowledge-sets/days-of-week.json`
- `knowledge-sets/months-of-year.json`
- `knowledge-sets/seasons.json`
- `lesson-families/calendar-year/language-capabilities.json`
- `lesson-families/calendar-year/support-blurbs/{manifest,tier1,tier2,tier3-a,tier3-b,tier3-c,tier3-d}.json`
- `lesson-families/days-of-the-week/family.json`
- `lesson-families/months-of-the-year/family.json`
- `lesson-families/seasons-of-the-year/family.json`
- `lessons/mul/days-of-the-week/{lesson.json,renderings/en.json}`
- `lessons/mul/months-of-the-year/{lesson.json,renderings/en.json}`
- `lessons/mul/seasons/{lesson.json,renderings/en.json}`
- `docs/CALENDAR_YEAR_LESSON_ARCHITECTURE.md`
- `scripts/validate-calendar-year-lessons.mjs`

### New reusable primitives

1. **`KNOWSET.*` / ordered concept sets** are for teachable sets or cycles whose truth is mostly structured vocabulary rather than grammar rules. Reuse this for future numbers, colors, compass directions, school subjects, or similar systems when it fits. A record may contain multiple contextual systems instead of flattening the language to one English-shaped list.
2. **`ordered_term_set`** renders a selected `KNOWSET.*` system. It supports `primary`, `session_context`, and `all_contextual` selection plus readings, variants, and context-specific forms.
3. **`cultural_context`** is the family-level semantic block for facts that are contextual rather than lexical identity. The renderer can surface those facts with existing `cultural_note` UI.
4. **`ordered_sequence`** practice reconstructs an ordered list or cycle.
5. **`concept_term_match`** practice matches language-neutral concepts to target-language terms.
6. **`cycle_neighbor`** practice asks for the item before/after another item when a cyclic interpretation is actually valid.
7. These primitives are semantic contracts, not calendar-only widgets. Reuse them before inventing another one-off block.

### Context separation is part of the data model

- **Language ≠ territory.** A language owns weekday words; first-day-of-week/calendar layout belongs to locale/territory context.
- **Language ≠ calendar system.** Arabic, Persian, Hindi, Chinese, and other records may expose multiple calendar/month systems without claiming every speaker uses each one.
- **Language ≠ hemisphere or climate.** Season vocabulary must not hardcode month ranges from a language tag. Four temperate seasons can coexist with wet/dry, six-season, 24-solar-term, or other contextual systems.
- **Dictionary form ≠ date form.** Month records may carry context-specific grammatical forms when a language changes the month name inside dates.
- **Different system sizes are allowed.** Do not force a two-season or six-season local system into four English slots merely to make comparison code easier.

### Coverage and trust contract

- Each of the three knowledge sets has structured target records for the current 21 Tier 1/Tier 2 languages.
- The source-blurb catalog has short native-language candidate copy for all 104 current learn-from languages and all three topics.
- Generated blurbs and generated multilingual target records remain `candidate` / `machine_translated` until language-specific review promotes them.
- Do not build 104 × 21 pair matrices. Join the short best-language/source bridge with the selected learning-language knowledge set at runtime.
- `npm run validate:calendar-year` checks exact source coverage, exact 21 full-target coverage, knowledge-set alignment, lesson/family/rendering identity, and current Expo tier alignment when that registry is available locally.

### Editorial/research guardrail

See `docs/CALENDAR_YEAR_LESSON_ARCHITECTURE.md` before copying this pattern. Calendar, climate, and cultural facts are especially easy to overgeneralize. Store the language vocabulary and the contextual convention separately, preserve alternate systems, and prefer an honest candidate record over fake universality.

## [2026-08-12 10:08 MDT] GPT-5.6 Sol — UI handoff — clock/date tools for calendar and time lessons

The Expo app now has reusable temporal-learning UI primitives ready for the lesson/compiler layer:

- `gef-expo/src/core/components/practice-elements/temporal/InteractiveClock.tsx`
- `gef-expo/src/core/components/practice-elements/temporal/InteractiveCalendar.tsx`
- `gef-expo/src/core/components/practice-elements/temporal/temporalModel.ts`
- `gef-expo/src/features/lessons/components/lesson-elements/LessonTemporalTools.tsx`

### Time-of-day lesson contract

1. **Please use the shared interactive clock rather than inventing a lesson-only clock.** The learner can choose the hour or minute hand, drag/tap the dial, and VoiceOver/TalkBack can increment/decrement it through the adjustable accessibility role.
2. **The clock UI owns geometry, not linguistic truth.** It consumes approved phrase data keyed by `HH:MM`. Do not make Expo infer a universal English-shaped rule such as “quarter past,” “half past,” or `hour + minute`; languages differ too much in time expressions for that to be safe.
3. **The phrase-data contract is `languageTag + label + phrases: { "HH:MM": "…" }`.** A lesson may use a practical step such as 5 minutes initially, then expand where research supports finer distinctions. The UI already supports a configurable `minuteStep`.
4. **104-language coverage should be on-demand, not one giant app-bundle table.** If a selected best/explanation language is promised by the lesson, its time phrases must exist for that lesson's supported clock positions. Store/review those records in Lexicon and compile only the selected session languages into the runtime package.
5. **Do not silently fall back to English wording.** Missing linguistic data should stay visibly missing/research-required until the normal trust/review pipeline fills it.
6. **Day periods are part of the linguistic model.** Morning/afternoon/evening/night boundaries and names can be locale/language specific. Keep them in the language/context data rather than deriving them from an English AM/PM assumption.

### Date/calendar lesson contract

1. The shared calendar UI accepts a **session/territory-resolved `firstDayOfWeek` (0–6)**. Never derive the first calendar column from a bare language tag. This matches the existing calendar-year architecture.
2. Selected-date readouts can use BCP-47 locale/calendar/numbering-system metadata, with exact reviewed `dateOverrides` when a lesson needs a form that generic locale formatting cannot safely express.
3. Keep alternate calendar systems explicit. Do not flatten Gregorian, Persian, Islamic, Hebrew, traditional, or other systems into one fake universal month list.
4. Keep dictionary/standalone month forms separate from grammatical forms used inside dates. The existing `formatForms` concept should feed this UI when relevant.

### Ordered-set renderer contract

Expo now also has a reusable ordered-term visual composition that can show primary or contextual term systems, readings, transliterations, variants, and date-format forms. The existing `ordered_term_set` semantic block is the correct input. Days/months/seasons/numbers/colors/etc. should reuse it.

### Integration status / next TODO

The UI primitives and typed next-block contracts are landed. **Do not yet assume the old grammar-only `compile-lesson-runtime.mjs` can package `knowledge_set_id` lessons.** Its current pipeline still requires `grammar_set_id` and its shipping runner only accepts the older block union. The next Expo integration TODO is to add one knowledge-set compiler path plus runner dispatch for `ordered_term_set`, `cultural_note`, `interactive_clock`, and `interactive_calendar` atomically. The new block types are intentionally staged outside the shipping `LessonRuntimeBlock` union until that compiler+runner work lands together, preventing a half-wired tool from falling through as a completion screen.

## [2026-08-12 15:19 MDT] GPT-5.6 Sol — contract — Lexi semantic senses, relations, and lesson offers

Family Members now extends the shared lesson semantic index instead of introducing a second translator database.

### Reusable Lexi contract

1. **Lexical expression ≠ relationship concept.** `mother`, `mom`, and `mum` are distinct lexical expressions/senses. They can share the same `FAMILY.mother` primary relationship pivot while carrying different register or usage metadata.
2. **Many-to-many is first-class.** `lexical_senses` identify language-specific meanings; `sense_concepts` lets one sense link to primary, broader, or later more-specific semantic concepts; `concept_forms` provides the cross-language realization layer. Do not author direct 104 × 104 translation links.
3. **Concept-mediated translation is the default.** Lexi finds the tapped sense, resolves its semantic concept(s), then finds compatible forms/senses in requested languages. Pairwise translation rows are reserved for genuinely exceptional reviewed cases, not ordinary vocabulary.
4. **Related is not synonymous.** Family expressions sharing a broad relationship pivot use `related_by_relationship`. That relation must never silently become exact synonymy because differences can encode register, relative age, maternal/paternal side, speaker gender, address/reference use, or a narrower kin path.
5. **Prose definitions are optional.** A Lexi sense can already be useful as translator/dictionary knowledge through surface form, concepts, localized equivalents, register, typed relations, provenance, and lesson links. Do not manufacture low-quality dictionary paragraphs merely to make a record feel complete.
6. **Reusable lesson recommendations live on semantic knowledge.** `surface_lesson_links` can connect a resolved sense/form to `LES.*`, optionally with a `rule_id`. Family expressions recommend `LES.mul.vocab.family_members`. Spanish grammatical-gender forms retain their grammatical-gender lesson/rule links.
7. **Exact occurrence evidence remains separate.** A generic Lexicon sense says what a form can mean. `gef-content` occurrence annotations say what a specific passage occurrence means and can add the exact grammar `reason`/`rule_id`. Reviewed occurrence evidence outranks generic surface lookup.
8. **Trust remains visible.** The 104-language Family semantic projection is structurally complete but generated/candidate. It surfaces as Gef/unverified until the normal language-specific review ladder promotes it. Do not call structural coverage Lexi-verified coverage.

### Shared semantic-index fields

The reusable output at `dist/dictionaries/shared/lesson-semantic-v1.{json,sqlite}` now supports:

- `concepts`
- `lexical_senses`
- `sense_concepts`
- `concept_forms`
- `surface_lesson_links`
- `lexical_relations`
- localized lesson-source copy where a lesson provides it

Future lesson chats should extend these shared semantic structures when they need tap-to-Lexi vocabulary or grammar concepts. Do not create a lesson-local translator table or a second Lexi knowledge store.

### Family-specific source

`lesson-families/family-members/lexi-metadata.json` owns Family broader-concept grouping, carefully curated expression/register metadata, the non-synonym relation policy, and the Family lesson offer. `scripts/validate-lesson-semantic-index.mjs` verifies the 104-language Family projection and protects `mother`/`mom`/`mum` separation plus existing gender lesson links.

## 2026-09-07 — Owner rule: branch reconciliation before every build

AGENTS.md now requires every build to reconcile local/remote branches and PRs
across Expo, Content, Lexicon, Gef Server, and Identity. Merge and close completed
work; document each justified outstanding branch with its commit, reason, owner,
and closure condition in the owning docs/BRANCH_EXCEPTIONS.md. This replaces
silent branch omissions. Existing branches have not been merged by this policy
change; the next build must complete the reconciliation first.

## 2026-09-12 — Owner decision: Wiktionary-first Lexi source

Tim explicitly withdrew the first-party-only/no-copy restriction. Wiktionary is
the main lexical source and definitions/lexical data may be copied directly.
AGENTS, README and the lexical architecture now point to
`docs/WIKTIONARY_SOURCE_POLICY.md`. Attribution, applicable licenses, source
identity and review-state honesty remain separate requirements; no imported
record is automatically approved and English-edition glosses remain English.

Before any lexical import, the downloaded source is being filtered against the
exact canonical Expo learn-from registry using the streaming
`scripts/filter-wiktextract-languages.mjs`. It validates gzip/JSON records,
retains whole matching source records and reports missing/excluded codes.
No multi-gigabyte dump enters Git and no second Lexi research queue is created.
Source-code groupings require explicit reconciliation, not silent runtime aliases.

## 2026-09-13 — Rich Wiktionary candidate import projection

`scripts/import-kaikki-candidates.mjs` now retains each bounded Wiktextract
source record as canonical candidate evidence while also projecting safe lookup
fields. English-edition glosses are labeled `en` independently of headword
language; all glosses, forms/analyses, sound and audio evidence, examples,
etymology, labels, translations, and relation assertions remain recoverable.
Only one unambiguous same-import lexical target becomes a candidate relation
edge. Ambiguous, missing, cross-language, or unsupported targets remain explicit
unresolved candidate assertions; no import creates concept/translation authority
or approved Lexi truth. Import metadata pins the input SHA-256, edition,
attribution/licenses, importer version, and transformations. The focused
`test:wiktionary-import` command verifies retention and byte determinism without
generating or importing a bulk dictionary.

## 2026-09-24 — Web source lookup and adult flags

Owner requested web lookup for chats without SSH. The Server GET endpoint
`/v1/lexi/sources/wiktionary` reads a private index built by
`scripts/wiktionary-index.py`; JSON/HTML preserve source records, attribution,
archive identity and sense-level classification. The index verifies the retained
archive checksum and exact per-language counts before publication. Source rows
with no headword remain counted, not invented or silently dropped.
The importer now retains candidate adult flags and age18 runtime safety using
the same rules as lookup. Null is unclassified, not child-safe. No approval,
concept mapping, app release, or editable parallel lexical authority is created.
See `docs/AGENT_DICTIONARY_LOOKUP.md` for agent usage and draft-store direction.


## 2026-10-04 — ChatGPT / Lexi instructional-note canonical storage contract

Fresh `main` and Expo's Lexi Talkie were read before this pass. This repository now owns the canonical reusable storage contract for Lexi instructional notes under the already CDN-published `lexi/` tree.

Landed:
- `schemas/instructional-note-catalog.schema.json`
- `schemas/instructional-note-bindings.schema.json`
- `schemas/instructional-note-renderings.schema.json`
- `lexi/instructional-notes/catalog.json`
- `lexi/instructional-notes/bindings.json`
- `scripts/validate-instructional-notes.mjs`
- package validation wiring via `validate:instructional-notes`

SETTLED:
- A reusable instructional note has one stable language-neutral note ID, version, curriculum-v2 topic ID, kind and review state. Learner-facing prose is stored separately in per-language rendering bundles.
- Reusable bindings can attach the note to canonical rule/sense/lexeme/concept/construction/semantic-function/name/entity IDs. Exact work/edition/span bindings do NOT live here; those belong in `gef-content`.
- Canonical discovery metadata may say only that a note is eligible for once-only discovery. It does not prescribe a visual sparkle, glow, underline or other app effect. Expo owns that presentation and learner acknowledgement state.
- Missing localization stays missing. Runtime must not manufacture or silently English-fallback teaching copy.
- Note/topic/binding/rendering review states remain independent proof obligations. Candidate data stays candidate.
- The validator rejects unknown topic IDs, unknown reusable binding targets, duplicate IDs and mismatched rendering-language filenames. It does not require every supported language to have a rendering before candidate work can land.
- No quotation-mark note or invented punctuation topic was seeded in this pass because the current curriculum-v2 graph has no punctuation/quotation topic yet. The storage contract is real; fake topic IDs are not.

Relevant commits: `60036cb1`, `e0558689`, `35c0797b`, `2ec0ab91`, `509f6343`, `da7d075d`, `29c79d13`.

Normal local validation commands are documented by the repo, but this connector session has no dependency-complete checkout, so no local validator-pass claim is made. Do not self-approve future generated note renderings.


## 2026-10-05 — Codex: independent names and work characters

Owner asks whether names should be reusable lookup data or a database for one book. Settled: both are independent linked sources. General language-local names/forms/facts belong here; exact edition labels, work character profiles and mentions belong with Content. A tap can find Alex/Ale without an occurrence annotation or a family-index request. One character identity may have several sourced edition labels; unrelated characters with the same name never merge by spelling.

`docs/NAME_ENTITY_ARCHITECTURE.md` records normalized language rows, separate name/explanation languages, durable child IDs, typed sourced relationships, pronunciation ownership, spoiler context and an additive migration preserving current IDs and book text. Existing normalized compilation is extended; operational serving uses the current server/database environment, with versioned lookup/offline indexes. MCP is an authorized interface, not storage or backup. Missing legacy prose language and missing published family discovery remain explicit. This is approved design direction, not completed v2 schema/migration or universal language coverage. Implementation/source-audit rows live in the canonical Expo queues.

Local `node scripts/validate-lexicon.mjs` and diff check pass. README and agent ownership now name all four current Gef repositories and the Actions budget lock. No content records, approvals or book text changed.

## 2026-10-05 — Codex / rebuild complete concept reverse index

The checked-in `concepts/compiled-concept-index.json` had only 9 entries even
though the canonical concept graph had 33. The compiler seeds every graph row
and projects active links from canonical language lexicons, so omission was
stale generated output rather than a review-policy exclusion. Rebuilt with
`npm run compile:concepts` from the existing source IDs. The index now has 33
concepts. The existing Greek τοίχος and English wall edges appear in
`candidate_senses_by_language` and `sense_links_by_language`, with no approval
promotion and no entries in the approved pivot view. Added regression coverage
for complete graph/index membership and these exact candidate links; documented
the generated-index completeness contract in `docs/SENSE_LINKING_ARCHITECTURE.md`.

Push to `main` is the documented CDN publication mechanism for the existing
allowlisted `concepts/` path; no alternate deployment or authorization bypass
was used. Root's standard Node fetch saw a 200 response for the live index but
still lacked the concept before publication. GitHub Actions were not run.

## 2026-10-05 — Codex / validate support blurbs against current lesson tiers

The Expo language registry has three lesson tiers (`tier1_full`,
`tier2_selective`, `tier3_read_games`). The older four-shard organization was
still being interpreted as four product tiers, including a removed
`tier2_high` key. The support-blurb manifest now maps the two existing Tier 3
storage shards together to current `tier3_read_games`; localized summary and
tooltip strings are preserved. The validator compares each current cohort to
the exact registry set, checks shard and total manifest counts against actual
entries, and rejects missing, extra, duplicate, or repeated shard identities.
Focused mutation tests cover missing/extra/duplicate registry members. The
lesson architecture now explains that storage shards do not create product
tiers.

The repo-wide validation gate then exposed the same stale tier boundary in the
comparison-record validator and a grammatical-number validator pinned to Expo
registry schema version 4 plus frozen 21/83/104 counts. Both now derive tier
membership from the current registry arrays; manifest counts are checked only
against actual shard contents. The comparison-record Tier 3 partition is
explicitly storage-only. Local full `npm run validate` now passes through the
complete lesson and Lexi semantic pipeline. Focused synthetic registry tests
cover missing, extra and duplicate cohort members; grammatical-number checks
also prove the validator consumes the current registry fields without requiring
one historical schema version number.
