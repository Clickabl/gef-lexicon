# Branch exceptions before release

## Current: 2026-09-24 recovery-branch reconciliation

Fresh fetch/prune finds one non-main ref and no open PR.
`codex/preserve-lexicon-import-20260913` at
`25b5d22070b4d357f74d7be8b779527afc73f290` remains intentionally unmerged.
Against current `main` `009f80275139d8875798d0e2ba9437a3369b5823`
it has **1 unique commit and is 27 commits behind**. Its owner is Lexicon
import/provenance review. Its unique files are the old download helper/package
hook, removal of a tracked `node_modules` symlink, and very large generated
English/Spanish `gef-intro` lexicon overlays.

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

Next action is a bounded provenance, current-schema and coverage comparison—not
a wholesale merge. Closure requires every uniquely useful artifact to be either
(a) reimplemented/reconciled against current schemas and provenance rules, or
(b) explicitly rejected with the reason recorded. Then current local validators
must pass before the branch is removed. No dictionary record gains review status
from branch reconciliation.

The primary checkout was clean at inspection. One stale, prunable worktree
administration record remains for `/private/tmp/gef-lexicon-release-audit` at
`78e3592ff53dd3c550c564f68648354ce3154784`; no live directory or dirty worktree
was found, and this inventory does not delete the record. The established
signed Lexicon webhook had already fast-forwarded its read-only checkout,
successfully synchronized every public runtime-truth directory, and recorded a
deployment from exact revision `009f80275139d8875798d0e2ba9437a3369b5823`.
The changes after previously observed `e2c8282` were internal docs, schemas and
import tooling rather than new public lexicon records. No manual production copy
or unreviewed data promotion was required.

## Historical note: 2026-09-13 local import recovery

`codex/preserve-lexicon-import-20260913` at `25b5d22070b4d357f74d7be8b779527afc73f290` preserved the previously uncommitted English/Spanish Gef intro import, download script/package command, and removal of a tracked local `node_modules` symlink. It was pushed as recovery material, not approved dictionary content.

Reviewed 2026-09-07: Frog King reusable candidate lexicon data was on `main` at `bb22614`; all records remained candidate and required linguistic review before promotion.
