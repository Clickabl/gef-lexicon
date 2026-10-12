"""Ingest an authored language drop (<drop>/<lang>/) into the lexicon. Whatever files the drop has are merged: realizations
(any of the four topics), the English labels/glosses (never overwriting an existing one; conflicts are reported), the
en->lang bridge and the review notes. Run: python3 curriculum-v2/authoring/ingest_drop.py <drop> ru uk ..."""
import json, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lexfmt import write

DROP = os.path.abspath(sys.argv[1])
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
TOPIC_FILE = {"language_overview": "language-overview", "writing_system": "writing-system", "sound_system": "sound-system", "grammar_glance": "grammar-glance"}

def load(p): return json.load(open(p, encoding="utf-8"))

def merge(lang):
    src = f"{DROP}/{lang}"
    wrote = []
    for key, fname in TOPIC_FILE.items():
        p = f"{src}/{fname}.json"
        if not os.path.exists(p): continue
        os.makedirs(f"{ROOT}/realizations/{lang}", exist_ok=True)
        write(f"{ROOT}/realizations/{lang}/{fname}.json", load(p)); wrote.append(fname)
    added = {"labels": 0, "glosses": 0}; conflicts = []
    if os.path.exists(f"{src}/locale-en.json"):
        loc = load(f"{src}/locale-en.json")
        for kind in ("labels", "glosses"):
            for key, entries in loc.get(kind, {}).items():
                path = f"{ROOT}/locales/en/topics/{TOPIC_FILE[key]}.json"
                target = load(path); changed = False
                for k, v in entries.items():
                    cur = target.setdefault(kind, {}).get(k)
                    if cur is None:
                        target[kind][k] = v; added[kind] += 1; changed = True
                    elif cur != v:
                        conflicts.append((kind, key, k, cur, v))
                if changed:
                    target["version"] += 1; write(path, target)
    if os.path.exists(f"{src}/bridge-en-{lang}.json"):
        os.makedirs(f"{ROOT}/bridges/en/{lang}", exist_ok=True)
        write(f"{ROOT}/bridges/en/{lang}/shared-words.json", load(f"{src}/bridge-en-{lang}.json")); wrote.append("bridge")
    if os.path.exists(f"{src}/NEEDS.md"):
        os.makedirs(f"{ROOT}/review", exist_ok=True)
        shutil.copyfile(f"{src}/NEEDS.md", f"{ROOT}/review/{lang}.md"); wrote.append("NEEDS")
    print(lang, "wrote", wrote, added, "conflicts:", len(conflicts))
    for c in conflicts: print("  CONFLICT", c[0], c[1], c[2], "| live:", str(c[3])[:70], "| authored:", str(c[4])[:70])

if __name__ == "__main__":
    for lang in sys.argv[2:]: merge(lang)
