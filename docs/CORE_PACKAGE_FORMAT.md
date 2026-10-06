# GEF core lexicon package v2

Status: Foundation package contract.

`gef-lexicon` compiles canonical language records into deterministic per-language core packages for Gef's local Lexi resolver. The compiler is `scripts/compile-core-packages.mjs`.

## Output

For each language with canonical `lexicon*.json` sources:

```text
dist/core/{language}/
  core-v2.sqlite
  manifest.json
```

The package identity is content-derived. It does not contain a build timestamp. Identical source bytes, build mode, format version, and field-policy version produce the same `packageVersion`.

Production mode includes approved senses only. Development mode may also include candidate senses for testing and review. Candidate data must never be promoted merely because it compiled successfully.

## Phrase-use joins (field-policy version 4)

The compiler reads an optional canonical source at
`lexi/phrase-uses/{language-tag}.json`. This is a join to existing language-local
lexeme and sense IDs, not a second spelling/definition source. Each phrase-use
row records its context, register, region scope, bibliography references, and
independent review state. Greeting time bands and optional literal-sense links
are normalized into `phrase_use_time_bands` and
`phrase_use_literal_senses`; definitions remain on their canonical senses.

The `phrase_uses` table stores the use ID, exact language/lexeme/sense IDs,
context kind, register and region JSON, source references, authored review state,
and computed `effective_review_state`. The effective state is `approved` only
when the use and every referenced lexical fact are approved. Development output
includes candidate/approved uses only when all referenced facts are candidate or
approved, preserving candidate authority. Production includes only a fully
approved join. Rejected and superseded uses or facts are never emitted. Ordinary
lexical review filtering is unchanged.

The package manifest records phrase source path/hash when present, distinct
`missing`, `empty`, or `populated` source status, authored counts by review
state, emitted count, and `gap`/`available` coverage. Missing source is not
filled with artificial empty catalogues; present-empty and missing inputs both
produce explicit gaps. Registry, phrase-use and lexicon schema, and source-byte hashes affect
content-derived package identity. Git revision and dirty/unknown status are
reported separately and do not change package identity.

This compiler output is generated under `dist/core/`. The existence of
source JSON under the deployed `lexi/` prefix does not establish publication,
installation, or runtime consumption of `core-v2.sqlite`.

## Manifest

Each `manifest.json` records:

- package type, ID, version, language tag, and build mode;
- SQLite byte size and SHA-256 checksum;
- every canonical source file path and its SHA-256 checksum;
- counts of lexemes, senses, forms, analyses, pronunciations, phrase uses, time-band joins, and literal-sense joins;
- the fast-field/deep-field policy version and field lists.

Phrase-use fast fields name the actual normalized columns (`register_json`,
`region_scope_json`, and `source_refs_json`); manifest field names match SQLite.

The manifest is the download/install boundary. Runtime clients should verify the declared checksum before mounting or replacing an installed package.

## Fast fields

Fast fields are normalized into indexed SQLite columns because ordinary lookup and first-paint Lexi presentation need them without parsing large JSON objects.

They include:

- lexeme identity, language, lemma, lookup normalization, POS, proper-noun flag, and review state;
- sense identity, sense key, primary concept shortcut, CEFR level, register, review state, learner gloss, and definitions;
- form identity, surface spelling, normalized lookup, and attestation flag;
- analysis identity, morphology feature JSON, and display label;
- pronunciation IPA, locale, and notation.
- phrase-use IDs, context kind, exact lexeme/sense links, and honest review authority.

## Deep fields

Deep fields are retained as structured JSON attached to the owning canonical row. They are available immediately after local lookup but are not split into dedicated indexed columns until a measured runtime need justifies it.

They include:

- lexical feature bundles;
- typed and legacy relation evidence;
- concept-link metadata;
- examples;
- etymology, provenance, and source assertions;
- safety and review evidence;
- lifecycle redirects, splits, and merges;
- pronunciation media metadata beyond the fast IPA/locale/notation fields;
- future v2 extension fields not required for first-paint lookup.

This is a storage policy, not a semantic split. The canonical source remains authoritative for both fast and deep information.

## Stable IDs and source evolution

The compiler never creates semantic IDs. It preserves canonical `lexeme_id`, `sense_id`, `form_id`, `analysis_id`, and concept references from source.

A future sharded source layout such as `languages/{lang}/lexemes/...` may replace today's `lexicon*.json` authoring files without changing the package contract. The compiler boundary should adapt to new canonical source layout rather than forcing runtime package semantics back into authoring.

## Verification

Compilation performs SQLite foreign-key checks and `PRAGMA quick_check` before the package is accepted. Source-language mismatches, missing required lexical identity fields, duplicate lexeme IDs, and malformed form/analysis identity fail the build.

Use:

```text
npm run compile:core
npm run compile:core:production
```

A successful build proves package integrity only. It does not prove linguistic review, safety review, release eligibility, or product-wide language support tier membership.
