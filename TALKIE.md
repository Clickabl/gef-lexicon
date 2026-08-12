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

## [2026-08-12 09:40 MDT] GPT-5.6 Sol — contract — universal Family Members game core

Family Members now has a **separate universal vocabulary-game layer** in addition to its 21 rich full target profiles. This entry supersedes the old assumption that Tier 3 languages are source-only for this lesson.

### New capability split

- **104/104 source/best languages:** localized bridge copy remains available for lesson orientation.
- **21/104 full target languages:** current Tier 1 + Tier 2 retain richer target profiles, culture/usage distinctions, examples, and full lesson practice.
- **104/104 game-core target languages:** every canonical `programs.learnFromLanguages` language now has the same fourteen semantic relationship slots and can participate in Family Members vocabulary comparison/games at its content-trust level.
- **Tier 3 remains Tier 3.** Game readiness does not promote a language into a full authored curriculum or grammar tier.

### Landed paths

- `lesson-families/family-members/game-core/manifest.json`
- `lesson-families/family-members/game-core/{tier1,tier2,tier3-a,tier3-b,tier3-c,tier3-d}.json`
- `lesson-families/family-members/language-capabilities.json`
- `scripts/validate-family-members.mjs`
- `docs/FAMILY_MEMBERS_LESSON_RESEARCH.md`

### Reusable contract

1. The fourteen canonical prompts are semantic relationship slots, not English dictionary words: `family`, `mother`, `father`, `brother`, `sister`, `son`, `daughter`, `grandfather`, `grandmother`, `uncle`, `aunt`, `cousin`, `husband`, `wife`.
2. **A slot may have multiple forms on purpose.** Those forms can encode relative age, maternal/paternal side, speaker gender, gender of the relative, register, or another real distinction. Never flatten them into fake synonyms merely to make PairMatch easier.
3. A vocabulary game must supply enough relationship features to make the selected target form defensible. If the target distinguishes maternal and paternal uncle, a vague prompt equivalent to English `uncle` is insufficient.
4. A conventional descriptive phrase is acceptable when the target language has no single lexical item matching the broad cross-language slot.
5. The universal game core is currently **1,456 structurally complete semantic slots (104 × 14)** at `machine_translated` trust. This is complete machine-draft coverage, not native-speaker certification.
6. `npm run validate:family-members` now proves exact 104-source coverage, exact 104-game-target coverage, all fourteen concepts per language, non-empty NFC forms, exact live registry membership, exact 21 full-profile membership, and the rule that Tier 3 game coverage may not silently promote a language into the full target tier.
7. The public KinDiv/LREC lexical-gap research informs the semantic architecture only. Its data inherits Wiktionary/CC BY-SA provenance, so **do not copy its word rows into Gef**. Gef lexical forms remain first-party generated/researched candidates and move through the normal trust ladder.
8. Future vocabulary lesson families should reuse the same orthogonal capability idea when appropriate: `full lesson support` and `game-ready vocabulary support` are separate product promises.
