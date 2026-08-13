# Lexi

Lexi is the reviewed, structured inspection layer over Gef's language graphs. This folder is the front door for the Lexi system.

Lexi does **not** own copies of the graphs it reads. Each folder under `lexi/integrations/` is an adapter contract pointing to a canonical graph or registry elsewhere in Gef.

## Folder map

```text
lexi/
  README.md
  system/
    manifest.json
    manifest.schema.json
    integration.schema.json
  annotations/
    README.md
  research/
    README.md
  integrations/
    lexical-graph/
      integration.json
    semantic-grammar-graph/
      integration.json
    lesson-graph/
      integration.json
    occurrence-graph/
      integration.json
    names-entities/
      integration.json
    provenance-sources/
      integration.json
    language-support/
      integration.json
    runtime-presentation/
      integration.json
```

## The rule

**One integration folder = one boundary between Lexi and a canonical graph/source.**

An integration folder may describe:

- what canonical source it reads;
- which stable typed IDs it understands;
- what evidence it can provide to Lexi;
- which other integrations it depends on;
- whether it owns truth, evidence, registry policy, or presentation;
- how Lexi should fail when that integration is unavailable;
- invariants that prevent duplicate sources of truth.

It must not copy the underlying graph merely to make Lexi self-contained.

## Integration graph

```text
                    language-support
                           |
                           v
lexical-graph ---> lesson-graph <--- semantic-grammar-graph
     |                 |                    |
     |                 v                    |
     +----------> occurrence-graph <--------+
     |                 |
     v                 v
names-entities   provenance-sources
      \              /
       \            /
        v          v
       runtime-presentation
```

The diagram is conceptual. Exact dependencies are machine-readable in each `integration.json`.

## Canonical graph ownership

- **Lexical graph:** `Clickabl/gef-lexicon` owns lexemes, senses, forms, analyses and concepts.
- **Semantic/grammar graph:** `Clickabl/gef-lexicon` owns semantic functions, constructions and phrase patterns.
- **Lesson graph:** `Clickabl/gef-lexicon/curriculum/lesson-system-manifest.json` plus canonical `lessons/**/lesson.json` owns lesson parts, Core/Full readiness, rules, triggers, prerequisites, CEFR, quests, paths and release state.
- **Occurrence graph:** `Clickabl/gef-content` owns exact work/edition/anchor/span interpretation and passage-specific lesson evidence.
- **Names/entities graph:** `Clickabl/gef-lexicon` owns reusable names/name forms/name families/entities; exact story identity still requires occurrence evidence from Content.
- **Provenance/source graph:** `Clickabl/gef-lexicon/sources` and record-level source refs own reusable source/rights identity.
- **Language support registry:** `Clickabl/gef-expo/registry/language-support.json` owns product language identity and Tier 1/2/3 membership.
- **Runtime/presentation:** `Clickabl/gef-expo` owns lookup/ranking, learner context, lesson gating, Lexi/Gef trust presentation and UI.

## Shared typed-reference spine

Lexi and the lesson system share exactly these canonical target kinds:

`lexeme`, `sense`, `form`, `analysis`, `phrase_pattern`, `semantic_function`, `construction`, `concept`, `name_family`, `name_form`, `name`, `entity`.

Do not invent Lexi-only equivalents such as `dictionary_word`, `grammar_fact`, or free-form `lesson_tag` identifiers.

## Trust axes stay separate

Integrity review:

`candidate`, `approved`, `superseded`, `rejected`

Asset trust:

`machine_translated`, `machine_verified`, `public`, `gef_certified`

Lesson release:

`machine_created`, `machine_verified`, `general_public`, `education`

Annotation coverage:

`missing`, `partial`, `complete`, `not_applicable`, `blocked`

A complete annotation pass is not automatically approved. A verified lexical fact does not automatically certify a linked lesson. Confidence never promotes integrity.

## Lesson compatibility

Lexi is a consumer of the lesson graph, not a parallel curriculum engine.

A tap lesson offer is valid only when the canonical lesson graph confirms:

1. the `LES.*` exists;
2. a canonical tap trigger exists;
3. stable typed evidence matches the trigger/rule;
4. directional readiness resolves through the canonical precedence;
5. the resolved release stage meets the current audience gate;
6. Tier 3 is not promoted into Full grammar instruction.

Readiness precedence remains:

`part default -> tier override -> source-language override -> target-language override -> exact pair override`

Tier 3 may use canonical Core reading/comparison/game/quest/discovery experiences when coverage exists, but never Full grammar merely because the lexical graph contains deep morphology or constructions.

## Runtime resolution

Preferred semantic precedence:

1. approved exact occurrence evidence;
2. approved longest reusable phrase/construction/entity match;
3. approved contextual sense/form/analysis;
4. approved generic lexical lookup;
5. candidate evidence only as explicitly provisional Gef material;
6. unavailable when no defensible result exists.

The longest defensible reviewed span may win the initial interpretation while component words remain independently tappable.

## Annotation boundary

Reusable linguistic annotation belongs to the reusable graphs in `gef-lexicon`.

Exact occurrence annotation belongs to `gef-content` and uses clean standoff evidence over NFC-normalized text with zero-based, end-exclusive Unicode code-point offsets.

Presentation is never annotation. Glass, color, particles, badges, animation and layout stay in Expo.

See `lexi/annotations/README.md` for the pass model.

## Research boundary

External lexical systems may inform architecture, but public visibility is not permission to copy data into Gef. Any future ingestion lane must be explicit about source/version/license/provenance and commercial use before rows enter a publishable pipeline.

See `lexi/research/README.md`.

## Machine contract

`lexi/system/manifest.json` is the machine-readable Lexi SSOT.

Every integration listed there must have a corresponding `lexi/integrations/<id>/integration.json` that validates against `lexi/system/integration.schema.json`.

`node scripts/validate-lexi-system.mjs` enforces parity with the canonical lesson schema/status model and validates the integration graph so future architecture changes cannot silently leave Lexi behind.
