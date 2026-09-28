# Recovered 2026-09-13 Gef Intro Wiktionary overlays (archive, not runtime data)

These are the English and Spanish `works/gef-intro/lexicon` overlays from the former
`codex/preserve-lexicon-import-20260913` branch (commit `25b5d22`), squashed onto `main`
on 2026-09-28 when every branch in the company was consolidated.

They are **not** publication-quality lexicon truth: many entries carry lossy placeholder
definitions such as `Story-local term in Gef Intro: ...`, and they predate the current
rich-import and review requirements. They live under `docs/` so the lexicon publisher never
serves them. Use them only as coverage evidence (see `docs/BRANCH_EXCEPTIONS.md` history and
`TASK-LEGEND-EN-ES-LEXICAL-COVERAGE`); never copy records from here into `works/` without the
normal import, provenance and review path.

`scripts/download-wiktionary-dump.sh` from the same branch is now on `main` as tooling
(`npm run download:wiktionary`).
