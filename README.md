# GEF Core Lexicon Repository (`Clickabl/gef-lexicon`)

The official cross-linguistic dictionary, morphological paradigm database, interlingual concept graph, and quiz distractor network for the **Global Education & Folktale (GEF)** platform.

## Architecture

GEF uses a 5-layer hybrid lexicon architecture:
- **Language Core** (`languages/{lang}/lexicon.json`): Reusable words, senses, paradigms, and multi-lingual definitions.
- **Book Overlay** (`works/{work_id}/lexicon/{lang}.json` in `gef-content`): Character names, invented terms, archaic forms, book-specific idioms.
- **Book Occurrences** (`works/{work_id}/alignments/{lang}.json` in `gef-content`): Sentence character span offsets mapping to lexemes and senses.
- **Global Concept Graph** (`concepts/graph.json`): Interlingual concepts linking senses across languages.
- **Quiz Distractor Network** (`distractors/{lang}.json`): Homophones, homonyms, antonyms, synonyms, and confusable senses for dynamic language learning quizzes.

## Validation

Run validator script across all schemas and language files:
```bash
node scripts/validate-lexicon.mjs
```
