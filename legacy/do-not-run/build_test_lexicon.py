#!/usr/bin/env python3
"""
Populates test lexicon data for gef-intro and frog-king across all target languages,
generating complete lexeme entries, paradigm forms with form-vs-analysis separation,
multi-lingual definitions (en, es, fr, pt, it, el), and distractor/quiz relationships
(homophones, homonyms, synonyms, antonyms, confusable senses).
"""

import os
import json
import uuid
import re
import unicodedata
from pathlib import Path

# Paths
GEF_CONTENT_DIR = Path("/Users/tim/gef-content/gef-content")
GEF_LEXICON_DIR = Path("/Users/tim/gef-lexicon")

INTERFACE_LANGS = ["en", "es", "fr", "pt", "it", "el"]

def make_uuid():
    return str(uuid.uuid4())

def normalize_nfc(text):
    if not text: return ""
    return unicodedata.normalize("NFC", text)

def clean_tokens(text):
    # Remove punctuation, split into words
    cleaned = re.sub(r'[^\w\s]', ' ', text)
    tokens = [t.strip() for t in cleaned.split() if t.strip() and not t.isdigit()]
    return list(dict.fromkeys(tokens))  # Deduplicate preserving order

# Simple POS heuristics per language
def infer_pos(word, lang):
    w_lower = word.lower()
    if word[0].isupper() and lang not in ["zh", "ja", "th", "ar", "he", "hi"]:
        return "PROPN", True
    if w_lower in ["the", "a", "an", "el", "la", "los", "las", "un", "una", "le", "la", "les", "der", "die", "das", "o", "a", "os", "as"]:
        return "DET", False
    if w_lower in ["and", "y", "et", "e", "und", "o", "ik", "wa"]:
        return "CCONJ", False
    if w_lower in ["in", "on", "at", "en", "de", "con", "por", "para", "dans", "auf", "in", "mit"]:
        return "ADP", False
    if w_lower.endswith(("ing", "ed", "ar", "er", "ir", "en", "at", "an", "o", "a")):
        return "VERB", False
    return "NOUN", False

# Generate multi-lingual definitions based on word and POS
def generate_definitions(word, pos, lang):
    defs = {
        "en": f"definition of '{word}' in context as a {pos.lower()}",
        "es": f"definición de '{word}' en contexto como {pos.lower()}",
        "fr": f"définition de '{word}' en contexte comme {pos.lower()}",
        "pt": f"definição de '{word}' em contexto como {pos.lower()}",
        "it": f"definizione di '{word}' in contesto come {pos.lower()}",
        "el": f"ορισμός του '{word}' στο πλαίσιο ως {pos.lower()}"
    }
    return defs

def build_lexeme_entry(surface_word, lang):
    word_nfc = normalize_nfc(surface_word)
    upos, is_proper = infer_pos(word_nfc, lang)
    
    lexeme_id = make_uuid()
    sense_id = make_uuid()
    form_id = make_uuid()
    analysis_id = make_uuid()
    
    sense_key = f"{word_nfc.lower()}-{upos.lower()}-sense1"
    
    # Distractor graph generation for language quizzes
    homophones = [f"{word_nfc}_hp1"] if len(word_nfc) > 3 else []
    homonyms = [f"{word_nfc}_hm1"] if len(word_nfc) > 4 else []
    synonyms = [f"{word_nfc}_syn1"]
    antonyms = [f"{word_nfc}_ant1"] if upos in ["ADJ", "VERB"] else []
    confusables = [f"{word_nfc}_distractor_a", f"{word_nfc}_distractor_b"]

    sense_obj = {
        "sense_id": sense_id,
        "sense_key": sense_key,
        "primary_concept_id": None,
        "definitions": generate_definitions(word_nfc, upos, lang),
        "sense_hint": {
            "en": f"as used in story context ('{word_nfc}')",
            "es": f"como se usa en el contexto ('{word_nfc}')"
        },
        "cefr_level": "A1" if len(word_nfc) < 5 else "A2",
        "register_label": "literary" if is_proper else "standard",
        "homophones": homophones,
        "homonyms": homonyms,
        "synonyms": synonyms,
        "antonyms": antonyms,
        "confusable_senses": confusables
    }

    features_base = {}
    if upos == "VERB":
        features_base = {"tense": "present", "mood": "indicative", "person": "3", "number": "singular"}
    elif upos in ["NOUN", "PROPN"]:
        features_base = {"number": "singular", "gender": "common"}
    elif upos == "ADJ":
        features_base = {"degree": "positive"}

    form_obj = {
        "form_id": form_id,
        "surface_nfc": word_nfc,
        "normalized_lookup": word_nfc.lower(),
        "attested_in_text": True,
        "analyses": [
            {
                "analysis_id": analysis_id,
                "features": {
                    "base": features_base,
                    "possessor": {},
                    "subject": {},
                    "object": {},
                    "clitic": {}
                },
                "display_label_key": f"{upos.lower()} form"
            }
        ]
    }

    lexeme = {
        "lexeme_id": lexeme_id,
        "lemma_nfc": word_nfc.lower() if not is_proper else word_nfc,
        "upos": upos,
        "proper_noun": is_proper,
        "review_state": "candidate",
        "senses": [sense_obj],
        "forms": [form_obj]
    }

    if is_proper:
        lexeme["language_pos"] = "proper-name"

    return lexeme

def process_work_editions(work_id):
    editions_dir = GEF_CONTENT_DIR / "works" / work_id / "editions"
    if not editions_dir.exists():
        print(f"Skipping {work_id}: editions directory not found.")
        return 0

    files = sorted([f for f in os.listdir(editions_dir) if f.endswith(".json")])
    print(f"Processing {len(files)} language editions for work: {work_id}...")

    total_words_processed = 0

    for file in files:
        lang_code = file.replace(".json", "")
        filepath = editions_dir / file
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        full_text = " ".join([seg.get("text", "") for seg in data.get("segments", [])])
        tokens = clean_tokens(full_text)

        lexemes = []
        for token in tokens:
            lexeme = build_lexeme_entry(token, lang_code)
            lexemes.append(lexeme)
            total_words_processed += 1

        # Determine whether lexemes belong in Language Core or Book Overlay
        core_lang_dir = GEF_LEXICON_DIR / "languages" / lang_code
        core_lang_dir.mkdir(parents=True, exist_ok=True)
        core_file = core_lang_dir / "lexicon.json"

        existing_core = {"schema_version": 1, "language_code": lang_code, "lexemes": []}
        if core_file.exists():
            with open(core_file, "r", encoding="utf-8") as cf:
                try: existing_core = json.load(cf)
                except Exception: pass

        # Separate proper nouns / book-specific overlays from core
        core_lexemes = existing_core.get("lexemes", [])
        overlay_lexemes = []

        for lex in lexemes:
            if lex.get("proper_noun"):
                overlay_lexemes.append(lex)
            else:
                core_lexemes.append(lex)

        # Write core language lexicon
        existing_core["lexemes"] = core_lexemes
        with open(core_file, "w", encoding="utf-8") as cf:
            json.dump(existing_core, cf, ensure_ascii=False, indent=2)
            cf.write("\n")

        # Write book overlay lexicon if proper nouns or book-specific terms exist
        if overlay_lexemes:
            book_lex_dir = GEF_LEXICON_DIR / "works" / work_id / "lexicon"
            book_lex_dir.mkdir(parents=True, exist_ok=True)
            overlay_file = book_lex_dir / f"{lang_code}.json"

            overlay_payload = {
                "schema_version": 1,
                "work_id": work_id,
                "language_code": lang_code,
                "lexemes": overlay_lexemes
            }
            with open(overlay_file, "w", encoding="utf-8") as of:
                json.dump(overlay_payload, of, ensure_ascii=False, indent=2)
                of.write("\n")

    return total_words_processed

def main():
    print("Starting test lexicon generation for gef-intro and frog-king...")
    
    count_intro = process_work_editions("gef-intro")
    count_frog = process_work_editions("frog-king")

    print("\nGeneration summary:")
    print(f"  gef-intro tokens/lexemes processed: {count_intro}")
    print(f"  frog-king tokens/lexemes processed: {count_frog}")
    print(f"  Total test lexemes generated: {count_intro + count_frog}")

if __name__ == "__main__":
    main()
