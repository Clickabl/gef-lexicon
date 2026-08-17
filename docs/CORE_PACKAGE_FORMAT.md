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

## Manifest

Each `manifest.json` records:

- package type, ID, version, language tag, and build mode;
- SQLite byte size and SHA-256 checksum;
- every canonical source file path and its SHA-256 checksum;
- counts of lexemes, senses, forms, analyses, and pronunciations;
- the fast-field/deep-field policy version and field lists.

The manifest is the download/install boundary. Runtime clients should verify the declared checksum before mounting or replacing an installed package.

## Fast fields

Fast fields are normalized into indexed SQLite columns because ordinary lookup and first-paint Lexi presentation need them without parsing large JSON objects.

They include:

- lexeme identity, language, lemma, lookup normalization, POS, proper-noun flag, and review state;
- sense identity, sense key, primary concept shortcut, CEFR level, register, review state, learner gloss, and definitions;
- form identity, surface spelling, normalized lookup, and attestation flag;
- analysis identity, morphology feature JSON, and display label;
- pronunciation IPA, locale, and notation.

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
