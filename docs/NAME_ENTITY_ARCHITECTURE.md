# GEF Names, Entities & Semantic Annotation Architecture

Names and named entities are intentionally separated from ordinary lexical meaning while remaining linkable to the lexicon when morphology requires it.

## V2 direction — owner discussion, 2026-10-05

Keep two independently queryable sources: **Lexi Names** for reusable names and
**book characters** for particular entities in a work. Link them by stable IDs.
A normal tap on `Alex` or Italian `Ale` must find the general name without an
occurrence annotation, a character connection, or a name-family index. An exact
annotation can additionally identify the character; it never creates the general
name fact. This direction extends the existing normalized name compiler rather
than replacing books or throwing away their identities.

### Data shape

Use rows for language-specific data, not an English column, an Italian column,
and another schema change for each new language. There may be several attested
forms, pronunciations, and explanations in one language. A family is a graph of
sourced relationships, not a declaration that every member is interchangeable.

| Layer | Identity and data | Canonical owner |
| --- | --- | --- |
| General name | Existing language-local `name_id`, name kind, optional family membership | `gef-lexicon` |
| Name form | Durable form/spelling ID, name ID, exact spelling, language tag, script, applicable locale/period, form kind | `gef-lexicon` |
| Name relationship | Durable edge ID, source and target IDs, typed directed relation, applicability, evidence and its own review state | `gef-lexicon` |
| Name fact | Durable fact ID, subject name/form/family, fact kind such as etymology or usage; structured assertions and evidence | `gef-lexicon` |
| Fact rendering | Fact ID, explanation language tag, text, source or translation identity, independent revision/review state | `gef-lexicon` |
| Pronunciation | Exact attested form/label ID, language/dialect, optional IPA, recording reference and media rights/cache facts | Owning name or content source |
| Entity | Existing `entity_id`, entity kind, compact reusable identity and explicit external identity where available | `gef-lexicon` |
| Work character profile | Entity-to-work membership, sourced work-specific facts, localized renderings and where a fact becomes known | `gef-content` |
| Edition character label | Entity/work/edition IDs, actual label language, exact label and ordered name/form/lexical components | `gef-content` |
| Mention | Exact edition/representation/anchor/span/text-hash evidence pointing to the intended entity/name/sense | `gef-content` |

The name's language is different from the explanation's language. Italian
`Ale` may have an English explanation and an Italian pronunciation. A fact about
the family's origin can be shared, while an Italian usage fact stays attached to
the Italian name. Missing translation remains missing; a fallback explanation
must carry its actual language. These distinctions follow the established
lexeme/form/sense separation in [Wikidata's lexical data model](https://www.wikidata.org/wiki/Wikidata:Lexicographical_data/Documentation).
Use [BCP 47 language tags](https://www.w3.org/International/articles/language-tags/index.en)
where script or locale distinctions matter; do not count those variants as new
product languages.

For the current example, `name_en_alex` and `name_it_ale` are reusable name
records. `ent_gef_intro_alex` identifies the particular character. The English
and Italian editions refer to that same entity, each through its own attested
label. An unrelated Alex in another book gets a different entity ID. Reuse a
character across works only when explicit literary/source evidence establishes
that identity. A general name's population usage never determines an entity's
gender, nationality, biography, or pronunciation performance.

Relations distinguish spelling variants, short forms, diminutives, historical
derivation, transliteration, adaptation, and established local equivalents.
Do not derive a universal `Alex -> Alessandro` replacement, or infer new links by
walking a transitive family chain. Each link has its own sources and authority.
Book editorial name choices remain edition-specific; profile display-name
substitutions remain a separate opt-in choice. Read-time lookup never rewrites
the story text.

### Serving, authoring and agent operations

`gef-server` serves bounded joins/projections over pinned content and lexicon
versions. Use its existing MariaDB environment for operational state and a
versioned compiled name index for lookup. SQLite packages remain appropriate for
downloadable/offline dictionaries. MCP is the access interface, not the storage
system or a backup. No extra repository or database engine is required for this
split.

Agents need separate operations to look up a general name, inspect its actual
forms and sources, inspect one work's character profile, and propose an exact
mention/edition-label connection. Writes validate foreign keys, expected source
versions and idempotency through the existing Studio authorization boundary.
Candidate proposals retain author/source identity. Ordinary lookup may display
sourced candidates with honest authority; school retains its stricter policy.
That delivery rule does not approve a relationship or authorize an automatic
name substitution. Product whitelists and actual rights restrictions still
apply to their own operations.

An entity lookup uses exact work/edition context and may disclose only facts
appropriate to the passage reached; complete-book character summaries must not
silently become early-reading spoilers. Without reliable context, return
general-name and ordinary lexical candidates instead of choosing a character
from capitalization or string equality. Independent sources can disagree;
retain their separate assertions rather than overwriting one with another.

### Migration and current implementation limits

Preserve all current `name_*`, `NF.*`, `NFEQ.*`, `NFF.*`, and `ent_*` IDs and all
published book text. Assign durable form, usage, fact and relationship IDs once;
an array reorder must not change identity. Retain aliases for old compiler IDs
when migrating saved references. Import every existing `names/{language}/*.json`
file, including supplementary files. Keep v1 readers until the v2 package is
validated and atomically published with version, hash, source and foreign-key
checks. Back up authored inputs and operational state separately and test a
restore before removing old storage.

The existing compiler already has normalized names, spellings, families,
equivalence sets, forms, membership, usage, search and source-reference tables.
Its remaining v2 gaps are explicit explanation-language/fact provenance,
pronunciation ownership, edition-scoped character labels, durable non-positional
child IDs, and an ordinary lookup view that includes candidates without
misrepresenting them as approved. Its approved-only automatic localization view
can remain a distinct authority boundary. Untagged legacy prose stays verbatim
with unconfirmed language until a source audit establishes it.

The immediate app repair queries published language-local name packages
independently. The missing public family index must not veto that path.
The normalized v2 schema and character-profile migration described here are
design direction, not a claim that they have already been implemented or that
every name has data in every language. Track implementation in the canonical
Expo coding queue; source research and explanation-language audits belong in
the research queue.

## 1. Five different things

- **Lexeme**: a language item with grammatical forms and senses, e.g. English `grace` as a common noun.
- **Language-local name record**: a reusable name inside one language, stored under `names/{language}/`. It owns spelling variants, sourced usage history, and language-local facts.
- **Cross-language name family**: an explicit graph connecting reviewed local equivalents, adaptations, transliterations, short forms, and historical forms across languages. Stored under `name-families/`.
- **Entity**: a particular fictional or real person/place, e.g. Alex in `gef-intro` or Iron Henry in `frog-king`.
- **Occurrence annotation**: the exact interpretation of a character span in a particular passage.

These layers prevent a capitalized common word from silently becoming a person name and prevent historically related names from being collapsed into one identity.

## 2. Grace rule: spelling never decides meaning by itself

The string `Grace` can be:
- a person's name;
- the ordinary noun `grace`;
- part of a title or other entity.

For analyzed books, the passage annotation explicitly points to the intended `sense_id`, `name_id`, or `entity_id`. The published text is not modified.

For an unanalyzed book, lookup may return all matching candidates. Capitalization and context can affect ranking, but must not silently collapse the candidates into a name.

## 3. Language-local spelling variants

Alternative spellings that are genuinely variants of the same language-local name can share one `name_id`.

Illustrative shape only:

```json
{
  "name_id": "name_en_casey",
  "canonical_form": "Casey",
  "name_type": "given",
  "spellings": [
    {"text": "Casey", "status": "canonical", "script": "Latn"},
    {"text": "Kasey", "status": "variant", "script": "Latn"},
    {"text": "Kacey", "status": "variant", "script": "Latn"}
  ]
}
```

Do not merge merely similar-looking names. Cognates, diminutives, and historically related names remain explicit relations.

## 4. Cross-language name families

`name-families/*.json` is a layer above the existing per-language name database. It does **not** replace `names/{language}/`.

A family can contain multiple equivalence sets so the system never silently crosses distinctions such as:
- short/unisex forms;
- full masculine forms;
- full feminine forms;
- diminutives;
- transliterations;
- culturally established local equivalents.

Example family membership can connect reviewed records such as `Alex`, `Álex`, `Αλέξανδρος`, `Alejandro`, `Alessandro`, `Alexandre`, or `Александр`, while preserving the fact that those forms are not automatically interchangeable in every book, culture, or person's identity.

The automatic localization fallback order is:
1. reviewed local equivalent compatible with the selected equivalence set;
2. reviewed traditional adaptation;
3. reviewed transliteration;
4. preserve the entered/source form.

Books may override this in their book Bible. Users may override it in their profile. A person's identity never changes merely because a different display form is selected.

## 5. Gender-association display

Gef stores evidence, not a permanent “male/female score.”

Each sourced usage record may contain:
- region;
- start/end year;
- male share;
- female share;
- nonbinary/other or unknown share when available;
- sample size;
- `source_id`.

The UI can derive a simple indicator or a two-dimensional history visualization. One useful presentation is time on the vertical axis and feminine-to-masculine association on the horizontal axis. If there is insufficient evidence, Gef displays “usage data unavailable” rather than guessing.

This is a property of **name usage in a population**, not the gender of an individual person.

## 6. Entities stay small

Gef is not trying to mirror Wikipedia.

Create an entity record when the person/character/place is useful to a work or lesson. Store only compact first-party metadata plus external identifiers and source references. `wikidata` is preferred for stable external identity when available; localized Wikipedia pages can be recorded as sources or resolved from the external identity.

Entities may also list other catalog works that reference them, allowing literary cross-links such as a recurring reference to a character from another work.

## 7. Bibliography/evidence records

Facts that came from outside the work should point to `source_id` records in `sources/bibliography.json`. This keeps URLs, licenses, dates, titles, and external IDs out of every lexical/name/entity record and makes provenance reusable.

Name-family rows remain `candidate` until their particular relationship has been reviewed. A shared historical family does not grant permission to invent an unsourced spelling, gender association, etymology, or local equivalent.

## 8. Book annotations

Book text remains untouched. Semantic annotations are standoff records:

```json
{
  "surface": "Grace",
  "target": {
    "target_type": "sense",
    "target_id": "..."
  }
}
```

or:

```json
{
  "surface": "Grace",
  "target": {
    "target_type": "entity",
    "target_id": "..."
  }
}
```

This annotation is also the bridge used during translation: the translator can receive the source text plus stable semantic IDs, so ambiguous words and names preserve their intended meaning even when the target language needs a completely different form.

A book Bible chooses how each recurring character name is rendered in each edition. Some books preserve/transliterate a source name; Gef's own characters may deliberately use reviewed local equivalents. That is a book-level editorial choice, not a global automatic rewrite rule.

## 9. Proper-name morphology

A name may still have a `PROPN` lexeme when the language needs grammatical analysis or inflected forms. The lexeme can link to a `name_id`, and a book-specific sense can link to the exact `entity_id`.

That keeps morphology in the lexicon without pretending a person is merely a dictionary meaning.

## 10. Universal name-tap behavior

Any reviewed occurrence that resolves to a name or a named entity can expose name-family information through Lexi.

The content data remains semantic. It does not contain mobile styling instructions. Runtime evidence identifies facts by role, such as:
- name-family relationship;
- localized/transliterated form;
- sourced cultural footnote;
- gender-usage timeline;
- lesson offer;
- source citation.

Lexi owns one consistent scholarly presentation for those roles across every book.

The compact name primer should explain, in localized interface copy, that names may be preserved, transliterated, adapted, or have local historical equivalents. It may show a small reviewed sample of name forms. The primer is informational and never interrupts reading.

When `LES.mul.names.around_world` is available, the tap sheet offers two independent actions:
- **Learn now**;
- **Queue lesson**.

The queue action exists specifically so curiosity does not have to break story flow. The first use may show a one-time tooltip explaining the queue icon. The compact primer may be automatically expanded only for a bounded number of early name taps; after that it should collapse by default while remaining accessible.

## 11. Learner-name search and research queue

When the learner supplies a display name, the app searches the reviewed name index as they type and presents matching name records/families.

If a reviewed match is chosen:
- the profile can store its stable family/name identity;
- the names lesson can personalize examples;
- the dashboard can use reviewed local equivalents when the learner has opted in.

If no reviewed match exists:
- accept the typed name normally;
- do not invent local equivalents;
- do not promote a “learn about your name” feature that has no reviewed data;
- enqueue a normalized **name research request** for the publishing/solar-worker pipeline.

Multiple identical/normalized unknown-name requests should increase demand priority on one research job rather than create duplicate canonical name records. The worker produces candidates; review is still required before they enter the published name graph.

## 12. Cultural naming lessons

The names lesson may contain sourced cultural modules about how communities handle names, but each module is scoped to a community/language and must not be generalized globally.

Current research seeds include:
- Chinese strategies for rendering/adapting foreign names;
- American Sign Language / Deaf-community name-sign practices;
- historical and etymological name-family relationships.

These are educational culture notes, not rules the app applies to a learner's identity without consent.

## 13. Immutable research admission reference

`node scripts/compile-research-reference.mjs --registry-repo /path/to/gef-expo --out /path/to/reference-v1.json`
compiles `gef-research-reference-v1` for the authenticated Gef server research queue. The compiler
reads exact committed Git bytes from both repositories; uncommitted edits never become a referenced
revision. The deployment configuration pins the resulting file's SHA-256 independently.

The initial projection contains reusable `name_*` identities and coverage evidence only. It derives
language identities from the current Expo registry, preserves candidate status, and resolves a
language only through sourced approved facts. Cross-language coverage requires an explicit shared
equivalence set: the source name, family, source form, target form and any linked target name must
all be approved and sourced before coverage is `attested`. Short unisex forms never acquire full
masculine or feminine counterparts merely from shared family ancestry. A set without a matching
source form cannot establish that relation. Unknown references, unsafe source paths, duplicates and
unregistered languages fail compilation. Every evidence reference retains its exact source path,
Git commit and artifact hash. Missing data remains missing; absence is never invented.

This projection routes bounded research work; it is not a runtime names dictionary or approval.
It has no phrase records or ranked cohorts until their genuine canonical source contracts exist.
An instruction such as “research the most common English names” still needs a specified ranking
region, period and source, followed by a captured ranked candidate artifact. The compiler does not
invent that ranking or start a cohort. Server workers and Studio submit candidate results; normal
linguistic review continues to govern published names and equivalents.

Run `node --test scripts/test-research-reference.mjs` and `node scripts/validate-lexicon.mjs`
before publishing changes to this compiler. The source schemas retain arrays of language-local
forms and distinct equivalence roles and relation types; the sparse coverage projection does not
collapse those form arrays into a single presumed translation.

## 14. Public name-family discovery catalogue

The sole authored discovery catalogue is `lexi/name-family-index.json`. The
previous `registry/name-family-index.json` is relocated, not copied: `registry/`
is an internal prefix excluded from CDN publication. The existing published
`lexi/` and `name-families/` prefixes suffice; no allowlist expansion is needed.

The schema-version1 catalogue retains its existing purpose and descriptive
top-level review state. Its bounded refs contain only a stable family ID, safe
JSON basename and the exact owning family's review state. That top-level state
does not approve or override any family/form. Ref reconciliation enumerates the
actual canonical family files deterministically; family/form/name bodies and
identities stay untouched. There is no second public projection or new compiler.

`schemas/name-family-index.schema.json` closes the shape. A pure validation seam
in the existing `scripts/validate-lexicon.mjs` checks duplicate IDs/paths, missing,
extra and unknown family files, unsafe paths, and exact family ID/review-state
joins; `scripts/test-name-family-index.mjs` exercises that same seam and current
source parity. The ordinary CLI still validates the entire repository. A direct
execution guard permits focused import without running the whole CLI on import.

The app's names-search and ordinary Lexi adapters use that exact public index
URL and safe family basenames. Personal autocomplete/automatic forms retain
approved-only filtering; ordinary dictionary candidates retain honest candidate
authority and independent language-local fallback. Moving discovery metadata
does not create approved suggestions, source coverage or name translations.

The bounded source release changes only the old/new catalogue path, its new
schema, existing validator, focused manifest test, repository README and this
architecture note. Coordinator owns queue/file-map/TALKIE records, commits and
publication checks. Actual deployed byte/review readback and native autocomplete
remain separate acceptance checks; source fixtures cannot certify either.

The relocated catalogue now references the existing Alexander, Henry, Johannes
and Margaret files in filename order. All owning families and forms retain
their candidate status. Focused validation uses the same schema/join seam as
the full repository CLI; importing it does not execute that CLI. No source
approval or deployed publication is established by this source repair.
