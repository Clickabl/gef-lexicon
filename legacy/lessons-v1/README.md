# Gef Lessons V1 Archive

Status: frozen reference as of 2026-08-22.

The v1 lesson system is being superseded by the topic-first curriculum architecture in `docs/LESSONS_V2_ARCHITECTURE.md`.

## Archive policy

- Existing v1 lesson IDs, lesson families, catalog entries, and learning-path definitions are reference material.
- Do not add new curriculum topics by extending the v1 catalog unless a shipping v1 bug or compatibility need requires it.
- Reuse reviewed linguistic facts, constructions, semantic functions, useful pedagogy, and generic practice ideas from v1.
- Do not preserve a v1 lesson boundary merely because it already exists.
- New curriculum authoring should use the v2 topic/realization model.
- Existing v1 source files remain at their current paths temporarily because the shipping compiler/runtime may still import them.
- Do not physically move or delete those files until v2 compiler/runtime parity is reached and import consumers are removed.
- Git history remains the final immutable archive even after the physical cleanup phase.

`catalog-snapshot.json` records the canonical v1 lesson IDs that were active when this archive was created.

## Why the files are not moved yet

A destructive directory move would turn an architecture migration into a runtime migration at the same time. That creates unnecessary breakage risk.

The migration is intentionally split:

1. freeze v1 authoring;
2. build v2 topics, language realizations, compiler contracts, and learner-state support in parallel;
3. prove v2 using a small reference set across typologically different languages;
4. switch the product path to v2;
5. remove or physically relocate unreachable v1 implementation files.

The old lessons are inspiration, not the schema template for v2.
