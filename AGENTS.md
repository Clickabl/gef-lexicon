# Agent Instructions for gef-lexicon

Read `docs/LEXICON_ARCHITECTURE.md` and `schemas/lexicon-entry.schema.json` before modifying or generating any lexicon content.

## Hard Rules

1. **First-Party Licensing**: Never copy definitions or example rows from Wiktionary, FreeDict, or copyrighted dictionaries. Write all definitions natively in the 6 interface languages (`en`, `es`, `fr`, `pt`, `it`, `el`).
2. **Review Status Honesty**: Generated candidate entries must use `"review_state": "candidate"`. Never mark unreviewed LLM output as `"approved"`.
3. **Form-vs-Analysis Separation**: Always place morphological features inside an array of `analyses` under each `wordForm`. Single surface spellings (`surface_nfc`) with multiple grammatical interpretations must list separate `analysis` objects.
4. **Layered Feature Buckets**: Group features into `base`, `possessor`, `subject`, `object`, and `clitic` buckets. Use open strings for `case` and `gender`/`class`.
5. **No Concept Inventing**: Do not invent fake `primary_concept_id` values. Leave as `null` or link to existing concepts in `concepts/graph.json`.
6. **Validation**: Run `node scripts/validate-lexicon.mjs` before committing any lexicon changes.
