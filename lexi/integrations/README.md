# Lexi integrations

Every child folder here is one adapter boundary between Lexi and a canonical Gef graph, registry, or runtime layer.

Current integrations:

- `lexical-graph/` — lexemes, senses, forms, analyses, concepts
- `semantic-grammar-graph/` — phrase patterns, semantic functions, constructions
- `lesson-graph/` — lessons, rules, triggers, directional Core/Full readiness and release
- `occurrence-graph/` — exact passage/edition/span evidence from `gef-content`
- `names-entities/` — reusable name families, name forms, names and entities
- `provenance-sources/` — source identity, rights lanes, citations and review provenance
- `language-support/` — product language identity/tier registry from Expo
- `runtime-presentation/` — Expo resolution, gating, learner context and Lexi/Gef presentation

## Adding another integration

Create:

`lexi/integrations/<integration-id>/integration.json`

Then add exactly one catalog entry to `lexi/system/manifest.json`.

The integration manifest must validate against `lexi/system/integration.schema.json`, declare its dependencies and canonical owners, and pass `node scripts/validate-lexi-system.mjs`.

Do not add an integration merely because an external dataset is interesting. External resources stay under research until a deliberate rights/provenance decision establishes a real supported boundary.
