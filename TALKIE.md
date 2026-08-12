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
