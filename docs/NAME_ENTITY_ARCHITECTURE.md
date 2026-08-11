# GEF Names, Entities & Semantic Annotation Architecture

Names and named entities are intentionally separated from ordinary lexical meaning while remaining linkable to the lexicon when morphology requires it.

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
