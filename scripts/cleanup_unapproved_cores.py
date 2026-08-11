#!/usr/bin/env python3
import os
import json
import shutil
from pathlib import Path

LEXICON_DIR = Path("/Users/tim/gef-lexicon")

APPROVED_LANGS = ["en", "es", "ja", "el"]

def main():
    langs_dir = LEXICON_DIR / "languages"
    if not langs_dir.exists(): return

    removed_langs = 0
    for l in os.listdir(langs_dir):
        if l not in APPROVED_LANGS:
            lang_path = langs_dir / l
            if lang_path.is_dir():
                shutil.rmtree(lang_path)
                removed_langs += 1

    print(f"Cleaned unapproved synthetic core languages. Retained gold-standard languages: {APPROVED_LANGS}.")
    print(f"Removed candidate core folders: {removed_langs}.")

if __name__ == "__main__":
    main()
