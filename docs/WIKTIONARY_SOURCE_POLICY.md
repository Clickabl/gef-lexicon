# Wiktionary-first Lexi sourcing

Owner decision: 2026-09-12. Wiktionary is Lexi's primary lexical source.
Definitions and lexical data may be copied directly. This replaces the former
first-party-only/no-copy rule; paraphrasing every definition is not required.

## Provenance and trust

- Preserve Wiktionary contributor attribution, source edition, entry/page link,
  dump identity/checksum, available revision identifiers, applicable license,
  and any transformations. Missing revision metadata must not be invented.
- Wiktionary entry text is offered under CC BY-SA and GFDL terms. Keep the
  applicable notices and share-alike obligations with copied/derived material;
  do not label it proprietary or first-party. Source-specific quoted examples
  and media may have separate rights and are not automatically cleared.
- Source acceptance does not mean linguistic approval. Imported records remain
  `candidate`; importing cannot create approved exact-translation pivots.
- The English Wiktionary extraction covers many headword languages but its
  glosses are English. Keep headword language and definition language separate.
- Unrelated third-party dictionaries are not covered by this source decision.

References checked 2026-09-12:

- https://en.wiktionary.org/wiki/Wiktionary:Copyrights
- https://kaikki.org/dictionary/rawdata.html

## Filter before porting

Raw dumps stay outside Git and outside public runtime assets. Filter against
`Clickabl/gef-expo/registry/language-support.json` →
`programs.learnFromLanguages`, pinning the registry checksum. Never hard-code
the historical language count, use UI-only locales as dictionary targets, or
count script/region variants as additional languages.

`scripts/filter-wiktextract-languages.mjs` streams the complete gzip download,
validates its integrity and every JSON record, retains exact source language
matches plus the explicitly selected source groups in
`sources/wiktionary-language-map.json`, and writes a gzip subset plus an audit
report. It does not import lexemes, rewrite source records, approve meanings,
or silently alias languages. Shared source groups remain shared until import
review resolves each entry's actual applicability.
Language-neutral Wiktextract redirect rows are preserved in a separate JSONL
sidecar, not counted as lexical language coverage or silently discarded.
Missing canonical tags and excluded source tags are reported for explicit
source-code reconciliation before claiming complete language coverage.

Keep the original until the subset has been independently validated. Never
expand the full dump onto the cPanel account. Keep the verified compressed
original off-server for recovery when replacing server staging files.

Example (all data paths must be outside the repository):

```sh
node scripts/filter-wiktextract-languages.mjs \
  --input /data/raw-wiktextract-data.jsonl.gz \
  --registry ../gef-expo/registry/language-support.json \
  --source-map sources/wiktionary-language-map.json \
  --output /data/gef-wiktextract.jsonl.gz \
  --report /data/gef-wiktextract.filter-report.json
```

Only after filtering and source-code reconciliation should bounded research
batches feed the existing cross-product Agent Review Queue. Do not build a
second Lexi-only task queue or upload the multi-gigabyte raw dump to Git.


## Work-scoped extraction for exhaustive token layers

When a work already has an exhaustive token table, do not copy the 1.9 GiB private archive into Git and do not hand-create placeholder dictionary entries. Use `scripts/extract-work-wiktextract-subset.mjs` to stream the private archive once and retain the **full** Wiktextract rows whose lemma or attested form intersects the work's token surfaces. The resulting small gzip is still candidate source material: a form match selects records, never a sense or translation edge.

Gef Intro English example:

```sh
node scripts/extract-work-wiktextract-subset.mjs \\
  --input /home/bigmkahi/push_secure/gef/dictionary-staging/gef-wiktextract-supported.jsonl.gz \\
  --tokens ../gef-content/works/gef-intro/linguistic/en-tokens-001-034.tsv \\
  --language en \\
  --output /home/bigmkahi/push_secure/gef/dictionary-staging/gef-intro-en-source.jsonl.gz \\
  --report /home/bigmkahi/push_secure/gef/dictionary-staging/gef-intro-en-source-report.json
```

Run the same command with `es` and the Spanish token table. Feed those bounded full-row subsets to `import-kaikki-candidates.mjs`; preserve all senses and source assertions. Occurrence resolution is a separate content-review step and must not select the first imported sense automatically.
