# Gef Lexicon Wiki

This directory is the human-readable wiki for the canonical lesson system in `Clickabl/gef-lexicon`.

**Machine-readable truth still wins.** If prose here ever disagrees with validated JSON, fix the prose and the underlying data rather than creating a second source of truth.

## Lesson system

- [Lesson System](LESSON_SYSTEM.md) — the complete human-readable architecture and product decisions.
- [Lesson Audit](LESSON_AUDIT.md) — every current lesson/part, CEFR target, strengths, gaps, and readiness blockers.
- [`SO YOU WANT TO BUILD A LESSON?`](../SO_YOU_WANT_TO_BUILD_A_LESSON.md) — mandatory build workflow and copyable template.

## Canonical machine-readable files

- `curriculum/lesson-system-manifest.json` — lesson/part/readiness SSOT.
- `curriculum/learning-path-template.json` — ordered curriculum path plus language overrides.
- `curriculum/related-lessons.json` — related/prerequisite/reinforcement graph.
- `curriculum/review-and-release-status.json` — integrity, trust, and audience-release semantics.
- `schemas/lesson.schema.json` — every concrete `lesson.json` contract.
- `schemas/lesson-system-manifest.schema.json` — lesson-system manifest contract.
- `schemas/learning-path.schema.json` — learning-path contract.
- `schemas/related-lessons.schema.json` — related-lesson graph contract.
- `schemas/lesson-ai-task-input.schema.json` / `lesson-ai-task-output.schema.json` — atomic lesson work for the existing Agent Review Queue.

## Repository boundaries

- **gef-lexicon** owns reusable lesson, lexical, construction, semantic, curriculum, and readiness truth.
- **gef-content** owns exact books, spans, occurrence annotations, lesson-safe corpus evidence, and default-reading evidence.
- **gef-expo** owns runtime/UI, the product language registry, lesson rendering/orchestration, and the Agent Review Queue.

Do not fork any of those responsibilities into another lesson database.
