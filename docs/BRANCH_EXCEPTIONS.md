# Branch exceptions before release

## Current: 2026-09-22 recovery-branch reconciliation

`codex/preserve-lexicon-import-20260913` remains intentionally unmerged. Fresh comparison against `main` shows **1 unique commit and 20 commits behind**. Its unique files are the old download helper/package hook, removal of a tracked `node_modules` symlink, and very large generated English/Spanish `gef-intro` lexicon overlays.

Do **not** merge the branch wholesale.

The generated overlays predate the current rich-import/review requirements and contain lossy placeholder definitions such as `Story-local term in Gef Intro: ...`. Presence in that recovery branch is therefore preservation evidence, not publication-quality lexical truth. Current `main` has subsequently evolved the Gef intro lexicon and the Wiktionary-first candidate architecture.

The branch still preserves two kinds of potentially useful material that must be reconciled separately:

1. **Raw candidate coverage evidence.** Compare its English/Spanish occurrence/headword coverage against the current Chapter 1 coverage Task, but never promote the old generated records merely because they exist.
2. **`scripts/download-wiktionary-dump.sh`.** The helper has sensible safety properties (explicit external output directory, refusal to write the multi-GB dump inside the Git checkout, resumable download, gzip check, SHA-256 and source manifest). It may be reimplemented/reviewed on current `main` if the canonical archive/import Task still needs it. The recovery branch itself is not the implementation authority.

Current linked work:

- `TODO-LEXI-ARCHIVE-INVENTORY-20260916` owns the bounded source-archive inventory and is already assigned elsewhere; do not duplicate that scan.
- `TASK-LEGEND-EN-ES-LEXICAL-COVERAGE` owns exact English/Spanish Chapter 1 coverage.
- Rich Wiktionary import/runtime TODOs own preservation of definitions, pronunciation, forms, relations, examples, etymology and source evidence.
- `docs/EXTERNAL_GRAMMAR_DATASETS.md` records the separate external grammar/morphology evidence strategy; it does not authorize these old generated overlays.

Closure condition for this exception: every uniquely useful artifact in the recovery branch is either (a) reimplemented/reconciled against current schemas and provenance rules, or (b) explicitly rejected with the reason recorded. Only then may the branch be removed. No dictionary record gains review status from branch reconciliation.

## Historical note: 2026-09-13 local import recovery

`codex/preserve-lexicon-import-20260913` at `25b5d22070b4d357f74d7be8b779527afc73f290` preserved the previously uncommitted English/Spanish Gef intro import, download script/package command, and removal of a tracked local `node_modules` symlink. It was pushed as recovery material, not approved dictionary content.

Reviewed 2026-09-07: Frog King reusable candidate lexicon data was on `main` at `bb22614`; all records remained candidate and required linguistic review before promotion.
