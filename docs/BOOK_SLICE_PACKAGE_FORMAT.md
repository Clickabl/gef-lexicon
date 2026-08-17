# GEF book lexicon slice v2

Status: Foundation package contract.

Book-language Lexi slices are generated from two canonical sources without creating a second hand-authored dictionary:

1. `Clickabl/gef-content` supplies exact occurrence-to-sense evidence and edition surface inventory.
2. `Clickabl/gef-lexicon` supplies the reusable canonical lexemes, senses, forms, analyses, definitions, pronunciation data, relations, provenance, review state, and safety fields those references point to.

The compiler is `scripts/compile-book-slices.mjs`.

## Build command

The compiler intentionally requires an explicit sibling `gef-content` checkout:

```text
npm run compile:book-slices -- --content-root=/path/to/gef-content
npm run compile:book-slices:production -- --content-root=/path/to/gef-content
```

Optional filters:

```text
--work=frog-king
--language=es
```

This explicit boundary prevents `gef-lexicon` from quietly growing copied story files or making assumptions about where another repository happens to live.

## Output

```text
dist/books/{work_id}/{language}/
  lexicon-v2.sqlite
  manifest.json
```

Each package is content-addressed from the exact source checksums, build mode, work ID, language tag, and package format version.

## Exact annotated senses

The compiler reads `works/{work}/linguistic/{language}.json` from `gef-content` and collects canonical `sense` targets from reviewed occurrence resolution chains.

It then includes only those referenced senses plus their owning lexeme and forms/analyses needed for local lookup. The occurrence itself, anchor, passage text, annotation offsets, and lesson evidence remain owned by `gef-content`; they are not copied into the slice.

Production mode ignores candidate occurrence references and candidate canonical senses. Development mode may include them for review/testing.

## One-hop relation stubs

A referenced sense may expose one-hop relation stubs such as synonym, antonym, broader/narrower, homophone, homonym, or confusable relationships.

A stub contains:

- source sense ID;
- relation type;
- target canonical ID;
- target object type when locally resolvable;
- a readable target lemma/surface when locally resolvable;
- relation metadata.

The destination node does not have to be fully copied into the slice merely to show a named edge. The universal resolver can satisfy deeper navigation from the installed core pack, downloaded expansion, or server.

## Unannotated fallback

Full annotation is not required before an author can publish a readable book.

For a JSON edition, the compiler scans segment text and writes only a unique normalized surface inventory with an example casing and occurrence count. It does **not** copy sentences or anchors into the lexicon slice and it does **not** assign a sense to those surfaces.

This lets the local resolver search the core dictionary for an unannotated surface while preserving uncertainty. The manifest explicitly records `exactSenseCertainty: false` for this fallback path.

If no edition is available beside the occurrence evidence, fallback mode is `core-only`.

## Integrity and provenance

The manifest records SHA-256 checksums for every canonical lexicon source and each content source used by the package, plus the final SQLite artifact checksum and byte size.

Compilation fails on missing referenced canonical senses, mismatched work/language identities, duplicate canonical lexeme IDs, SQLite foreign-key failures, or `PRAGMA quick_check` failure.

A successful package build proves structural/package integrity only. It does not promote candidate linguistic data, satisfy cultural review, or make an edition release-ready.
