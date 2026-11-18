# Canonical entity writer

This is the maintained home of the single existing entity writer and journal
(#87, Gef decision 0239). It was moved from the retired standalone Server, which
is neither a runtime dependency nor a deploy target. `relocation-source.json`
pins the original components and their import/schema adaptations. Lexicon owns
source identities; Content owns event bindings; VNext projects verified bytes.
There is no HTTP service, MCP registration, new issuer or second allocator here.

## Existing operator profile

The trusted local operator supplies the already-admitted environment binding:

```text
GEF_LEXICON_AUTHORING_REPO=<exclusive absolute Lexicon checkout>
GEF_LEXICON_AUTHORING_REMOTE=origin
GEF_LEXICON_AUTHORING_PUSH=true
GEF_ENTITY_AUTHORING_LANGUAGE_REGISTRY_FILE=<admitted absolute artifact>
GEF_ENTITY_AUTHORING_LANGUAGE_REGISTRY_SHA256=<actual SHA-256>
GEF_ENTITY_AUTHORING_LANGUAGE_REGISTRY_SOURCE_COMMIT=<admitted source commit>
```

Use the existing primary App artifact, not Lexicon's smaller contract or a newly
authored language list. Nothing automatically fetches, advances, cleans or replaces
the source checkout. Its real path, `.git`, main branch and fetch/push origins are
fenced before fresh admission. Missing, partial or changed authority refuses
before reservation or ID allocation.

Every operator mode also requires the retained `.git/gef-entity-operations`
directory before constructing a writer. A missing ledger is never an empty
history and is not initialized by `--inspect`, `--inspect-history` or `--input`.
Only isolated test fixtures explicitly seed their own journal.

Run from this maintained repository with its installed dependencies:

```sh
node scripts/author-entity-registry.mjs --inspect
node scripts/author-entity-registry.mjs --inspect-history
node scripts/author-entity-registry.mjs --input intent.json --actor agent:existing-operator
```

`--inspect` returns the guarded source/registry revision and one public entity.
`--inspect-history` requires the existing journal and validates its original
records/fingerprints under the source lock. It returns public receipts and a
journal digest, omitting private actors, intent bodies and source content. It
never creates a replacement journal, recovers an operation or establishes fresh
mutation admission. Retained history can be inspected while source work is dirty
or an operation is pending.

The mutation grammar stays the same: persistent `request_id`, exact Git
`expected_source_revision`, `expected_registry_revision` and a closed action:
`create`, `create-many`, `update`, `upsert-name`, `upsert-biography`,
`upsert-relationship` or `merge`. The trusted actor stays outside the input. New
facts remain candidates; new work-scoped biographies remain Content-owned.

## Preserve the same ledger and outcomes

The configured checkout's **same** `.git/gef-entity-operations` directory remains
the only intent/ID journal. Do not replace it, copy it into a serving release,
initialize another ledger or rewrite historical actors, requests, fingerprints
or IDs. Exact actor/body replays of terminal operations return original receipts;
changed intent conflicts. Nonterminal operations block fresh admission and remain
unchanged for separately reviewed reconciliation. Ordinary commands never enter
the historical recovery/reset/rebase engine.

The non-stealing cross-process `.git/gef-authoring.lock` covers validation,
reservation, allocation, commit and push. Age does not release another holder's
lock. An uncertain push retains its committed operation, original IDs and
`pushed:false`; do not allocate a replacement request or automatically recover it.

Writes run the owning read-only source validator/compiler checks, full
`npm run validate`, and the existing immutable package compiler. Source and
bounded generated paths commit together. `published` establishes a source/package
push, not human review, rights clearance or device delivery.

## Dependency and compatibility

The parser defines strict request/journal fields, defaults, historical inputs
and canonical fingerprints. This concrete protocol dependency is why Zod is
added. **4.6.7 is pinned**: old 3.25.76 is affected by
[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
The [fix](https://github.com/colinhacks/zod/commit/a0ebf970f2d752e5f58527cd2942ff48be4f46bd)
changes v4 collection parsing; importing a newer package's `zod/v3` would not use it.

All collections use the patched v4 parser. Explicit adaptations preserve the
admitted request-UUID/UTC timestamp grammar, biography shapes, string-keyed records and absent
PATCH fields. Missing `legacy_ids`/`external_ids` stay absent rather than acquiring
v4 defaults. Golden schemas, actual retained-history fingerprints and real
Git/process fixtures verify compatibility. The existing `fast-uri` audit finding
is separate; this move does not silently change unrelated validators.

`npm run validate:entities` includes writer/lock/process regressions;
`npm run validate` is the full owning gate. Supply the already-admitted
`GEF_LANGUAGE_SUPPORT_REGISTRY` input when the historical App checkout is absent.
Tests allocate only isolated fixture IDs. Real history inspection never replays
the November 11 operation. Metadata owns the separately evidenced London admission.
