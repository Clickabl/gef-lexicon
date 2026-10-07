# Shared name graph, version 2

Status: source core published on 2026-10-07. Not activated in the application
and not the complete contextual-name feature.

## Identity and spelling

One `NS.*` record is one name sense across languages. `SP.*` records retain each
spelling, its exact language/representation, evidence, and primary status. A
short name and a full name remain distinct senses. A `short_form_of` relation is
informational; it never makes the renderer traverse from Tim to Timothy.

There is exactly one available primary per sense and representation. Explicit
`NR.*` links connect particular spellings of the SAME sense. An explicit mapping,
even a rejected one, takes precedence over a primary fallback. Secondary creative
spellings do not acquire inferred Cartesian links. `fallbackToPrimary` must be
explicit. The chosen literal is never silently corrected to a canonical spelling.

Every representation declares its script. Equivalent region variants can match
only with the same language and script. Traditional Chinese is not Simplified
Chinese; Latin Hindi is not Devanagari. Unicode script validation catches obvious
script mismatches, but does NOT linguistically validate a transliteration or
identify Simplified versus Traditional Han spellings. Source evidence still matters.

## Review and certainty

Beta lookup admits sourced `candidate`, `machine_reviewed`, and `approved` rows.
Reviewed lookup admits approved evidence only. Sense, spelling, and rendering
states are combined conservatively. No compiler or runtime promotes a state.
`certainty: null` is unknown, NOT zero, high certainty, or an invented score.
A combined numeric certainty is the minimum of supplied evidence values; it is
not a calibrated probability. Machine review is not human attestation.

Facts have their own language and evidence, with at most three per language.
The UI must additionally enforce the requested three-line visual limit. An empty
fact list is valid; no facts or translations are fabricated to fill the display.

## Autocomplete and reveal model

`NameGraphIndex.search` ranks exact matches before prefixes before substrings,
then the selected language/representation, then best language, then evidence and
stable tie breaks. Accents are retained. Complete-set exact resolution returns
`resolved`, `ambiguous`, or `unknown`; it never infers a unique sense from the
six visible suggestions. `NameEntrySession` retires stale queries and abandoned
account sessions and rejects stale clicks. Explicit selection survives language
reranking. Saving an unknown literal remains possible when the source fails.

`reveal` returns all eligible distinct NFC forms with provenance, not an eight-form
sample. It is DATA, not an animation implementation. The existing owner-approved
scattered reveal and its measured, accessible rendering still need to consume it.

## Public versus private

This is a PUBLIC REFERENCE graph, not account storage. Compiler input rejects
extra identity/job fields and requires registered bibliography source IDs.
Production compilation rejects synthetic test source IDs. The compiler is an
operator tool for repository-authored data, not an API for user-submitted JSON.
An external provider result must not be automatically sent to this publisher.
Private candidate name results require their existing account-scoped job boundary,
explicit processing choice, and separate public editorial admission when appropriate.

## Files

- `nameGraph.mjs`: pure validation, lookup, sense resolution, fact and rendering rules.
- `nameEntry.mjs`: framework-neutral live-entry state and request retirement.
- `nameGraphSource.mjs`: public immutable download, timeout, body ceiling, checksum and shared cache.
- `legacyNameGraph.mjs`: mechanical conversion of existing explicit equivalence sets.
- `compileNameGraph.mjs`: actual normalized SQLite and immutable JSON publication artifacts.
- `*.d.mts`: TypeScript consumer contracts.
- `fixtures.mjs` / `*.test.mjs`: synthetic tests; not publishable lexical evidence.

Only pure runtime files are mirrored into Expo. Verify/copy them with Expo's
`scripts/sync-name-graph-runtime.mjs`; never edit the consumer copy independently.

## Build and verification

Use Node 22.13 or later for built-in SQLite. This pass ran Node 22.16.0.

```sh
node --test packages/name-graph-v2/*.test.mjs
node scripts/compile-name-graph-v2.mjs --output /an/explicit/staging/lexi/name-graph-v2
```

Without `--input`, the compiler reads current `name-families/*.json`. One existing
equivalence set becomes one staging sense. Existing set membership is NOT proof
that it satisfies the owner's narrower name identity: audit and split mixed
identities before activation. It refuses mixed full/short sets or ambiguous
primaries. An explicit `--primary-map decisions.json` can select an EXISTING form
ID for a `[set ID, representation tag]` key. This is an editorial decision, not a
server agent's permission to pick the first row. Facts and variant-specific links
are not invented during legacy conversion. A fully authored graph can be passed
with `--input graph.json`; all source references must exist in the bibliography.

The output contains `<sha256>/graph.json`, `<sha256>/names.sqlite`, an immutable
artifact checksum receipt, and `manifest.json`. The pointer changes only after
both artifacts exist. Corrupt existing immutable data is refused, not silently
overwritten. A publisher lock prevents competing local builds. After a process
crash, remove a stale lock only after establishing that no publisher is running.

The JSON retains review states; runtime mode selects eligible rows. Producing a
file is not deployment, linguistic approval, or a new supported-language tier.
Use the current product-wide language registry for product-support claims.

## Database scope

This package creates an immutable reference SQLite file. It creates NO MySQL
schema, account table, Identity database, or external AI worker. The existing
Gef private-name migration `010_name_enrichment.sql` is a separate domain.
Do not enable external processing or alter that production schema merely because
this package's tests pass.

## Integration not completed in this patch

The current contextual sheet still expects the legacy reviewed-only match shape.
Do not swap adapters and relabel candidate rows as reviewed. The unified name
sense-choice/reveal/facts/visibility/handle flow, durable personal selection,
private provisional AI result consumption, full repository checks and native
visual acceptance are still required before feature activation. No source in
this package claims those steps already happened.
