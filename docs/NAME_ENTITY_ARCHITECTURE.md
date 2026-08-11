# GEF Names, Entities & Semantic Annotation Architecture

Names and named entities are intentionally separated from ordinary lexical meaning while remaining linkable to the lexicon when morphology requires it.

## 1. Four different things

- **Lexeme**: a language item with grammatical forms and senses, e.g. English `grace` as a common noun.
- **Name family**: a reusable personal-name identity with spelling variants, e.g. a Casey family that can contain `Casey`, `Kasey`, and `Kacey` after those variants are sourced/reviewed.
- **Entity**: a particular fictional or real person/place, e.g. Alex in `gef-intro` or Iron Henry in `frog-king`.
- **Occurrence annotation**: the exact interpretation of a character span in a particular passage.

These layers prevent a capitalized common word from silently becoming a person name.

## 2. Grace rule: spelling never decides meaning by itself

The string `Grace` can be:
- a person's name;
- the ordinary noun `grace`;
- part of a title or other entity.

For analyzed books, the passage annotation explicitly points to the intended `sense_id`, `name_id`, or `entity_id`. The published text is not modified.

For an unanalyzed book, lookup may return all matching candidates. Capitalization and context can affect ranking, but must not silently collapse the candidates into a name.

## 3. Name-family spellings

Alternative spellings that are genuinely orthographic variants of the same name can share one `name_id`.

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

Do not merge merely similar-looking names. Cognates, diminutives, and historically related names use `related_names` instead.

## 4. Gender-association display

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

## 5. Entities stay small

Gef is not trying to mirror Wikipedia.

Create an entity record when the person/character/place is useful to a work or lesson. Store only compact first-party metadata plus external identifiers and source references. `wikidata` is preferred for stable external identity when available; localized Wikipedia pages can be recorded as sources or resolved from the external identity.

Entities may also list other catalog works that reference them, allowing literary cross-links such as a recurring reference to a character from another work.

## 6. Bibliography/evidence records

Facts that came from outside the work should point to `source_id` records in `sources/bibliography.json`. This keeps URLs, licenses, dates, titles, and external IDs out of every lexical/name/entity record and makes provenance reusable.

## 7. Book annotations

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

## 8. Proper-name morphology

A name may still have a `PROPN` lexeme when the language needs grammatical analysis or inflected forms. The lexeme can link to a `name_id`, and a book-specific sense can link to the exact `entity_id`.

That keeps morphology in the lexicon without pretending a person is merely a dictionary meaning.
