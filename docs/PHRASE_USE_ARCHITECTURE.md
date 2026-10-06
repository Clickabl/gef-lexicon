# Reusable phrase-use joins

Status: implemented schema/validator/compiler foundation; canonical phrase coverage and runtime publication remain separate.
Canonical coding owner: Expo `TODO-LEXICON-PHRASES-V2-20261005`.

Ordinary lexemes and senses own lexical spelling and meaning, including lexicalized multiword expressions. A phrase-use catalogue joins an existing language-local lexeme/sense to a specific use context. It cannot duplicate definitions, names, characters, UI templates or book occurrences. It is reusable linguistic evidence, not another account or preference store.

## Canonical source

Optional files are `lexi/phrase-uses/{language-identity}.json`. Their exact identity is checked against the current Expo language registry. Missing source is an explicit gap; do not seed empty files for every language merely to imply coverage.

The closed version1 envelope has `schema_version`, `language_tag`, and `phrase_uses`. Each row has a stable human-readable `phrase_use_id`, existing `lexeme_id` and owning `sense_id`, `context`, register and region constraints using the existing usage-profile shapes, `source_refs`, and an independent four-state `review_state`.

`context.kind` initially accepts `greeting` or `general_expression`. Greeting context requires a nonempty unique `time_bands` array from morning, afternoon, evening, night and up_late. General expressions carry no time bands. These contexts identify applicability; they do not impose universal clock boundaries. One greeting may belong to several bands without duplicating its use identity.

Optional `literal_sense_refs` are typed existing same-language lexeme/sense pairs. The primary sense owns the natural meaning; absence of literal references is an honest missing literal explanation. Do not fabricate a literal definition or hide it inside a hint field. Every joined sense must belong to its stated lexeme. Proper-name/entity records are excluded from these phrase joins; names keep their existing separate source.

Register uses the existing nonempty usage-profile register array, and region uses the existing region_scope shape. Unknown region is explicit. Source IDs resolve to existing `sources/bibliography.json` entries; exact lexical source evidence remains on the canonical facts. A bibliography ID cannot itself establish review approval or usage applicability.

## Validation and package projection

Reuse `scripts/compile-core-packages.mjs`; do not add a competing phrase compiler. The validator exposes a pure validated join operation reused by that compiler, while its CLI inspects canonical files without rewriting them. Invalid fields, unknown identities, duplicate use IDs, dangling bibliography/fact references, cross-language or mismatched sense ownership fail validation, including unpublished rows.

Development emits only candidate/approved uses whose every required joined lexeme and sense is candidate/approved. Preserve authored review states. Effective review is approved only when the use and all referenced facts are approved. Production includes only that complete approved join. Rejected and superseded facts or uses never publish. This stricter join does not change the existing ordinary lexical selection rules.

The normalized core package stores phrase uses and optional literal sense relations with foreign keys and an index for exact language/context. It contains no copied definitions. Bump the fast-field policy version for the new tables, retaining core format2. Record distinct missing/empty/populated source status, authored state counts, emitted count and gap/available coverage in the manifest. Empty generated tables are not a success claim for phrase coverage.

Package identity remains content-derived from the exact source byte hashes, registry/schema/compiler policy and build mode. Do not make an unrelated Git commit alter every package identity. Record actual Git revision and dirty/unknown provenance separately when available; never invent a clean committed revision for modified files. Raw hashes are the exact input boundary. Identical pinned input bytes/policy/mode reproduce package IDs and SQLite bytes.

## Exact implementation scope

- `schemas/phrase-use-catalog.schema.json`: closed version1 schema, referring to existing usage-profile register and region shapes.
- `lexi/phrase-uses/README.md`: explain optional canonical sources, review and honest gaps. No authored catalogue rows are released in this coding slice.
- `scripts/validate-phrase-uses.mjs`: shared pure validation/projection plus canonical CLI.
- `scripts/compile-core-packages.mjs`: existing compiler extension, deterministic identity, normalized joins and coverage.
- `scripts/test-phrase-use-packages.mjs`: actual schema/validator/compiler/SQLite fixtures and distinct gap/review/provenance controls.
- `scripts/test-compiled-usage-profiles.mjs`: only update the existing core field-policy expectation and retain all source-profile roundtrip assertions.
- `docs/CORE_PACKAGE_FORMAT.md`: actual implemented package fields and publication boundary.
- `package.json`: existing validation and focused test wiring only; no dependencies or Actions.

No importer, canonical lexical/bibliography record, review approval, deployed receiver, other compiler or app source is released by this slice. Coordinator owns this architecture record, TALKIE, canonical queues and Git integration. Executor reports exact files/hashes and checks; it does not stage/commit/push.

## Actual runtime boundary

Current Expo evidence still uses static lexical JSON and core-v1 download/install; this core-v2 SQLite output has no verified publication/installation route. Existing `lexi/` canonical sources are in the documented CDN prefix, but source availability does not prove an approved runtime package or intended-sense Home join. App/server adapters and publishing remain separate required implementation work.

The Home source copy is independently translated UI. No fake Home information button or null-only phrase source is allowed. Genuine source research must import licensed lexical evidence through the existing importer, preserve all source senses, and create separately reviewed use context before the UI can explain its intended meaning. No model-generated UI template becomes a lexical fact by compilation.

## October6 source verification

The actual package fixtures cover duplicate canonical lexeme/sense/use IDs,
filename and current-registry identity, all-row references including rejected
and superseded uses, candidate/approved joined review, same-language missing
versus present-empty source identity, actual-input Git provenance, composite
language/time-band foreign keys and byte-identical deterministic SQLite. An
unrelated Git commit changes provenance without changing content package ID.
The temporary Git fixture uses main.

Complete repository `npm run validate` passes. Existing compiled usage-profile
round trips retain5 core-v1 and5 core-v2 packages,624 senses and14 profile rows.
The canonical phrase-use directory has0 catalogue files/0 authored rows; no
review state, imported lexeme, name or bibliography record was changed. Exact
executor source receipt: `/tmp/gef-phrase-use-final-source-freeze-20261006.json`,
SHA256 `3fcccb73d0788a647567b9006fe389bc25133f63d04840761b2e1c6ee47f1150`.
No deployed core-v2 package or app phrase explanation is established by these
compiler tests.
