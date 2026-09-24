# GEF Core Lexicon & Distractor Engine Architecture

The web source-evidence lookup and sense-level adult flags are documented in
[AGENT_DICTIONARY_LOOKUP.md](AGENT_DICTIONARY_LOOKUP.md). The server index is a
read projection, not a second editable lexical authority.

Source: Notion "06 — Language, Dictionary & Lexicon Architecture", Codex review, and August 2026 cross-linguistic standards update.

## 1. Multi-Layer Hybrid Architecture

To prevent database bloat while supporting book-specific vocabulary, archaic terms, and proper names, GEF isolates lexicon data into 5 distinct architectural layers:

```text
Application Support/
  dictionaries/
    {lang}/core-v1.sqlite        <-- Shared Core Lexicon (reusable words, morphology, senses)
  books/
    {work_id}/
      v1/languages/{lang}/content.sqlite  <-- Book Overlay + Token Occurrences
  user/
    learner.sqlite                <-- User lookup history, spaced-repetition state
  cache/
    resolver-cache.sqlite         <-- Fast attached SQLite union index
```

| Layer | Contents | Location | Lifetime |
|---|---|---|---|
| **Language Core** | Reusable words, senses, morphology paradigms, common expressions, multi-lingual definitions | `languages/{lang}/lexicon.json` | Stays installed |
| **Book Overlay** | Character names, fictional places, invented words, archaic forms, book-only meanings, idioms | `works/{work_id}/lexicon/{lang}.json` | Deleted with book |
| **Book Occurrences** | Exact token spans (`start_char`, `end_char`), morphological analysis, phrase membership | `works/{work_id}/alignments/{lang}.json` | Deleted with book |
| **Local Resolver Cache** | Fast SQLite attached-union index of installed cores + overlays | Device `cache/` | Rebuildable |
| **Learner State** | Saved words, mastery scores, quiz history | Device `user/` | Persistent |

## 2. Many-to-Many Identity Model

```text
Concept (cpt_...) 
    ↓ (1-to-N)
Sense (sense_...) 
    ↓ (N-to-1)
Lexeme (lexeme_...) 
    ↓ (1-to-N)
Form (form_...) 
    ↓ (1-to-N)
Analysis (analysis_...) 
    ↓ (N-to-1)
Occurrence (Passage Span)
```

- **Concept**: Interlingual abstract meaning shared across human languages (e.g. `cpt_talk_communicate`).
- **Sense**: Language-specific meaning of a lexeme. One polysemous lexeme (e.g. English *turn*) has multiple sense entries.
- **Lexeme**: Lemma headword and part-of-speech container.
- **Form**: Physical orthographic surface spelling (`surface_nfc`).
- **Analysis**: Specific morphological feature bundle assigned to a surface spelling (resolving syncretism).
- **Distractor & Quiz Graph**: Senses maintain explicit relationships (`homophones`, `homonyms`, `synonyms`, `antonyms`, `confusable_senses`) used to generate dynamic distractor choices in language quizzes.

## 3. UniMorph & Universal Dependencies (UD) Layered Morphology

Morphological features are structured in controlled semantic layers (`base`, `possessor`, `subject`, `object`, `clitic`):

```json
{
  "surface_nfc": "evlerimizden",
  "analyses": [
    {
      "analysis_id": "019...",
      "features": {
        "base": { "case": "ablative", "number": "plural" },
        "possessor": { "person": "1", "number": "plural" },
        "politeness": "plain"
      },
      "display_label_key": "plural ablative with 1st person plural possessor"
    }
  ]
}
```

- `upos`: Universal Part of Speech (`NOUN`, `VERB`, `ADJ`, `ADV`, `PROPN`, etc.).
- `language_pos`: Language-specific subtype (e.g. `classifier` for CJK/Thai/Vietnamese/Bengali).

## 4. Wiktionary-first lexical sourcing

- Owner decision, 2026-09-12: Wiktionary is the main lexical source; direct copying of definitions and lexical records is allowed. The first-party-only requirement is withdrawn.
- Preserve source edition, dump/revision identity, attribution, license and modification records. Copied English-edition glosses are English even when their headword belongs to another language.
- Import permission is not review approval. Existing sense, morphology, concept and translation-authority gates remain in effect.
- Unrelated third-party sources still require their own reuse authority. See `WIKTIONARY_SOURCE_POLICY.md` for the canonical policy and raw-download filtering boundary.
