# Dictionary lookup for annotation agents

Web entry point: https://gef.clickabl.co/v1/lexi/sources/

One GET, no SSH, account, MCP installation, or repository checkout required:

```text
https://gef.clickabl.co/v1/lexi/sources/wiktionary?language=fa&word=قورباغه&format=html
```

Use `format=json` (the default) for structured output. URL-encode `word`.
English example: `?language=en&word=princess`; Spanish: `?language=es&word=princesa`.
The response matches exact NFC/casefold headwords and source-attested forms.
It retains every sense in each matching record, including ambiguous parts of
speech and etymologies. This is not substring search or a contextual sense guess.
Twenty records are returned per page; repeat with `offset=next_offset` until
`next_offset` is null. No sense is silently removed from a matching record.

The endpoint returns candidate source evidence, not canonical Lexi IDs or
approved translations. Each result contains `source_record`, `source_url`, and
`sense_safety` indexed by `source_sense_index`. The response `source` identifies
the archive checksum, edition, English definition language, attribution,
license notices, original registry, and verified language counts.

For annotations:

1. Retrieve all pages for each unique source surface; reuse results for repeats.
2. Reuse existing canonical Lexi lexeme/sense IDs whenever they already exist.
3. When an import is needed, retain `source_record` rows as a small JSONL input
   and run the canonical `scripts/import-kaikki-candidates.mjs` importer. Retain
   the response source manifest alongside the extract. Never promote candidates.
4. Preserve all senses and adult-content flags in Lexi; select the contextual
   sense separately in the book's standoff occurrence layer. Include every token
   occurrence and overlapping phrases where the book declares exhaustive coverage.
5. After actually importing, use authenticated `POST /v1/lexi/imports` to record
   source archive SHA, source_record_id, and destination Lexi IDs. Subsequent GET
   responses carry `lexi_import.status: "reported_imported"`. The receipt is an
   author assertion; it does not perform the import or approve lexical truth.
   The source stays retrievable. API contract: https://gef.clickabl.co/v1/lexi/openapi.json

English Wiktionary source codes are preserved. For special source groups, use
`tl` for Tagalog evidence supporting `fil`, `sh` for Serbo-Croatian source
evidence, `bh` for Bhojpuri, and `kmr` for Northern Kurdish. Consult
`sources/wiktionary-language-map.json`; do not assign every shared-group row to
every target variety. Absence from this pinned archive is not universal absence
from Wiktionary. The language-neutral redirect sidecar is retained but is not
silently treated as lexical evidence or followed by this first lookup.

## Adult classification

Classification is per sense, so an ordinary fastening sense of “pegging” can
remain distinct from its sexual sense. Detected adult senses carry
`adult_content: true`, `minimum_age: 18`, and the existing runtime `safety`
shape with `minimumBand: "AGE_18_20"`. The importer preserves these fields.
The shared rules are `scripts/wiktionary-safety-rules.json`; Python lookup and
JavaScript import parity is tested. Source labels and English gloss cues are
candidate triage, not a complete multilingual moderation system.

Null adult_content means **unclassified**, never “safe for children.” Identity
terms and educational anatomy alone are not adult classifications. Source rows
remain intact for research, including examples and relations; this public
authoring endpoint must not be used directly as a child-facing dictionary API.
Runtime delivery must apply age policy before exposing definitions, examples,
relations or expansion payloads. Adding metadata does not certify the already
released app's enforcement. Do not discard safety fields in a runtime projection.

## Storage and edits outside Git

The private SQLite source index is a disposable read projection of the filtered
archive. It is not editable Lexi truth. The raw original and excluded languages
are unnecessary for lookup. Original source recovery remains off-server.

Recommended future authoring storage: a separate durable draft store with stable
Lexi IDs, expected-revision conflict checks, append-only edit history, attribution,
and candidate review states. Authenticated writes should produce reviewed,
versioned exports into `gef-lexicon` and its package pipeline in batches. That
avoids a commit per keystroke while keeping one publication authority. No public
write endpoint or second live canonical database is introduced by this lookup.

## Operator notes

`scripts/wiktionary-index.py build` verifies the archive checksum and scans every
row, checking exact retained-language counts before publishing the index. Failed
builds remain `.building` and cannot serve queries. Rows without a headword are
retained and counted; only actual headwords/forms are searchable. Rebuild into a
new filename, verify it, then change server configuration. Never modify a serving
index in place. A 12 GiB index budget bounds disk growth on the shared account.

The server API lives in `gef-server/src/modules/lexicalSource/`. Private host
paths, installation and deployment settings are documented there in
`docs/LEXICAL_SOURCE_LOOKUP.md`.
