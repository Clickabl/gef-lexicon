# Lexi lexical sets: concept-mediated lookup without pairwise translation tables

## Product boundary

Lexi is a structured lexical knowledge graph, not merely a prose dictionary and not a pairwise translator. A useful lexical sense may have no prose definition yet. It can still carry stable meaning through concept links, forms, register, typed relations, localized equivalents resolved through shared concepts, provenance, and lesson recommendations.

Exact passage-specific meaning and grammar evidence still belong to `gef-content` annotations. A reusable Lexicon sense says what a word can mean. A reviewed occurrence annotation says what this occurrence means or why this form is being used here.

## Reusable multilingual lexical sets

`lexicon-sets/` is the source contract for a bounded multilingual lexical domain that needs real Lexicon/package coverage before every language has a complete hand-authored `languages/{tag}/lexicon.json` tree.

A lexical set does not create a fake language profile and does not imply that the rest of that language's dictionary is complete. The SQLite compiler projects lexical-set entries into the same `dist/dictionaries/{tag}/core-v1.sqlite` package used by ordinary core lexicons.

## Family Members reference implementation

`LEXSET.family_members` consumes the canonical 104-language Family vocabulary and emits one lexical expression per actual expression, rather than one row per English gloss.

Example:

- English `mother`, `mom`, and `mum` are separate lexemes/senses.
- All three map primarily to the same female-parent relationship concept.
- `mother` is marked neutral; `mom` and `mum` are familiar candidate register metadata.
- They are related with `related_by_relationship`, not asserted to be exact synonyms.
- Each sense recommends `LES.mul.vocab.family_members`.

The same mechanism works when one surface has multiple senses or one sense has multiple concept links. `sense.concept_refs[]` is many-to-many capable. `primary_concept_id` remains the preferred translation pivot for backwards compatibility; broader/related concept links provide semantic navigation without making an overbroad translation match.

## Slash and many-form safety

Family authoring cells use the exact delimiter ` / ` between independently indexable expressions. The projection splits only that exact delimiter. An internal slash without surrounding spaces is preserved as lexical content.

A group of expressions in one broad relationship cell is **not** automatically a synonym set. It may encode relative age, maternal/paternal side, speaker gender, relationship path, address/reference status, or register. Generic relations therefore use `related_by_relationship`; stronger synonymy requires language-specific review.

## Lesson links and annotated books

Reusable senses may carry `lesson_refs[]` such as:

```json
{
  "lesson_id": "LES.mul.vocab.family_members",
  "role": "teaches_concept",
  "queueable": true
}
```

The Expo/Lexi evidence contract already supports lesson offers and a separate grammar `reason` with `ruleId`. This preserves the intended layering:

1. tap an ordinary word -> reusable Lexicon sense -> translations/related forms -> optional Learn More lesson;
2. tap an annotated occurrence -> exact occurrence evidence may additionally explain the grammar reason/rule;
3. reviewed occurrence evidence outranks a generic surface lookup;
4. candidate lexical-set content remains Gef/unverified until promoted.

## Trust

Coverage and linguistic approval are separate. `LEXSET.family_members` generates candidate / `machine_translated` knowledge for all 104 canonical languages so the development Lexi path is complete. Production-approved package gates must continue to exclude candidate data until language-specific review promotes it.
