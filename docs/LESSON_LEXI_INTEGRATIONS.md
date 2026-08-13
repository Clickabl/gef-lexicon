# Lesson → Lexi integrations

Every canonical lesson is also a Lexi integration.

## Folder invariant

A lesson folder must contain both:

```text
lessons/<scope>/<lesson-key>/
  lesson.json
  lexi/
    integration.json
```

`lesson.json` owns pedagogy, ordering, practice, and presentation. `lexi/integration.json` declares which reusable lexical or semantic domains the lesson contributes to Lexi and points at the canonical artifacts that contain the facts. It must not copy lesson prose into a second truth store.

`scripts/compile-lesson-ssot-registry.mjs` enforces this invariant. A canonical lesson without a Lexi integration fails validation/compilation. The compiled lesson registry embeds the integration so Expo/admin tooling can discover the relationship without maintaining another catalog.

## Artifact rule

Integration artifacts are repository-root references. Required references must exist. A lesson can have a deliberately small integration when its reusable lexical knowledge is not ready yet. Missing data stays missing; never create generated filler merely to satisfy the integration contract.

## Numbers are not grammatical number

`lexi/domains/numbers-dates-time.json` is the canonical semantic-domain contract for numeric expressions, quantities, dates, clock times, years, decades, and centuries. Grammatical number (singular/plural/dual/etc.) is a different linguistic domain. The two may be related, but a tap on `8`, `2026`, `3:45`, or a date must never resolve to the grammatical-number lesson merely because both use the English word “number”.

The numbers/date/time domain can reuse calendar knowledge from weekdays, months, and seasons. Written-out number words still require reviewed language-specific lexical realizations; Unicode digits or parser rules do not magically provide those translations.

## Adding a lesson

1. Add `lesson.json` and the normal canonical lesson artifacts.
2. Add `lexi/integration.json` in the same lesson folder.
3. Give the integration semantic `domains`, runtime `surfaces`, and repository-root artifact references.
4. Add richer Lexi links only when canonical data exists.
5. Run `npm run validate`. Missing integrations, identity mismatches, duplicate integration IDs, and missing required artifact refs fail CI.
