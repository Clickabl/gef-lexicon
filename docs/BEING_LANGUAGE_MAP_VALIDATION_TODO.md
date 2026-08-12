# TODO — validate multilingual Being lesson data

**Work type:** coding/tooling TODO.

The initial Being lesson implementation now includes:

- `lessons/mul/to-be-or-not-to-be/lesson.json`
- 21 files under `language-maps/`
- `concept-labels.json` with 13 semantic labels across 21 Tier 1/2 support languages.

The current generic lexicon validation workflow passes, but it does not yet explicitly validate these new files as a closed contract.

Before treating this data shape as stable production infrastructure, extend the grammar/lesson validator/compiler so it checks at minimum:

1. the language-map set equals the current Tier 1 + Tier 2 language union from Expo's canonical `registry/language-support.json`;
2. every map contains exactly the lesson's required universal Being semantic functions, with no unknown semantic IDs;
3. every `semantic_map` value is non-empty structured/candidate authoring data;
4. every map declares the correct current tier and an allowed review state;
5. `concept-labels.json` covers every required semantic function and every Tier 1/2 support language exactly once;
6. the title policy keeps canonical `To be or not to be` untranslated unless a deliberate editorial policy changes;
7. candidate labels/maps cannot enter a verified Lexi surface without the required review gate;
8. stale Tier 3/Tier 4 grammar-map assumptions fail validation;
9. future compiler output consumes structured maps/labels instead of multiplying hand-authored prose across every target/support-language pair.

This TODO is also tracked conceptually by Expo issue #38, which owns three-tier lesson-runtime/compiler enforcement. Reconcile rather than duplicate when the protected `feature/multiword-for-lesson` workstream is updated.
