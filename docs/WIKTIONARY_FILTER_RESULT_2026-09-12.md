# Wiktionary source filtering — completed 2026-09-12

The complete downloaded English Wiktionary/Wiktextract archive was scanned
before lexical import. The owner-requested allowlist was derived from Expo's
canonical learn-from registry: 104 language identities, registry SHA-256
`30924325a938a1a35dc7ca666ecfb333b59bc8786822aa78b34e6f3761a46769`.

- Input: 10,806,865 source records; 2,826,618,017 compressed bytes.
- Retained lexical records: 8,390,377.
- Excluded out-of-scope lexical records: 2,367,486.
- Language-neutral redirects: 49,002, preserved in a separate source sidecar.
- Output: 2,040,222,933 compressed bytes (about 1.90 GiB).
- Source coverage: 102 source codes account for the 104 requested identities
  through `sources/wiktionary-language-map.json`. This is source availability,
  not completed Lexi entries or review approval. Shared Serbo-Croatian records
  are retained once, not blindly assigned to all three language identities.

Final `gzip -t` verification passed. The four additional source-label groups
were independently extracted from the checksum-verified recovery archive;
their counts matched the full scan: tl 39,738; sh 70,075; bh 430; kmr 6,970.

Server staging now contains `gef-wiktextract-supported.jsonl.gz`, its redirect
sidecar and `gef-wiktextract-filter-report.json` under
`/home/bigmkahi/push_secure/gef/dictionary-staging/`. These are private source
inputs, not public runtime dictionaries.

The original compressed file and its redundant `.jsonl.part` expansion were
removed from the server only after verification. Source recovery is retained
on the owner's Mac in `gef-wiktionary-20260912.YrVdRG`. The verified original
SHA-256 is `e4dbb4a3f96338ae240c1f3fcc65b6ec73746f71ffb3907dde33c3af0e61bb65`.

cPanel reported 24,164.44 MiB used and 27,035.56 MiB free after cleanup.
No lexical import, review promotion, app build or runtime deployment occurred
as part of this filtering operation.
