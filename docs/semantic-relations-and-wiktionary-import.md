# Semantic relations and Wiktionary staging

Gef keeps exact translation authority separate from lexical discovery relations.

Wiktionary is the owner-selected primary lexical source. Direct copying is
allowed under `WIKTIONARY_SOURCE_POLICY.md`; the former first-party-only policy
no longer applies. Source licensing and review status remain separate concerns.

- `concept_links` may participate in translation only through the existing reviewed exact-pivot and usage-profile gates.
- Typed semantic-relation edges (`near_synonym`, `hypernym`, `related`, `confusable`, and similar) always carry `translation_authority: none`.
- Kaikki/Wiktionary imports are candidate-only staging inputs. Stable IDs and provenance are generated deterministically, but imported records never self-approve an exact concept pivot.
- Occurrence-sense annotations bind an exact edition span to one reviewed/candidate sense. Prior occurrences and translation memory are evidence only; they cannot silently determine the next occurrence.
- New lexical relation data should use typed relation objects. Bare legacy relation IDs are compatibility-only and must not be authored for new data.
