#!/usr/bin/env python3
import json
import uuid
import re
from pathlib import Path

LEXICON_DIR = Path("/Users/tim/gef-lexicon")

def is_uuid(val):
    return bool(re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', str(val), re.I))

def fix_uuids_in_object(obj, id_map):
    if isinstance(obj, dict):
        new_obj = {}
        for k, v in obj.items():
            if k in ("lexeme_id", "sense_id", "form_id", "analysis_id", "concept_id", "primary_concept_id") and isinstance(v, str):
                if not is_uuid(v):
                    if v not in id_map:
                        id_map[v] = str(uuid.uuid4())
                    new_obj[k] = id_map[v]
                else:
                    new_obj[k] = v
            elif k in ("senses_by_language", "homophones", "homonyms", "synonyms", "antonyms", "confusable_senses") and isinstance(v, dict):
                new_dict = {}
                for subk, subv in v.items():
                    if isinstance(subv, list):
                        new_dict[subk] = [id_map.get(item, str(uuid.uuid4()) if not is_uuid(item) else item) for item in subv]
                    else:
                        new_dict[subk] = id_map.get(subv, subv)
                new_obj[k] = new_dict
            elif k in ("senses_by_language", "homophones", "homonyms", "synonyms", "antonyms", "confusable_senses") and isinstance(v, list):
                new_obj[k] = [id_map.get(item, str(uuid.uuid4()) if not is_uuid(item) else item) for item in v]
            else:
                new_obj[k] = fix_uuids_in_object(v, id_map)
        return new_obj
    elif isinstance(obj, list):
        return [fix_uuids_in_object(item, id_map) for item in obj]
    return obj

def main():
    id_map = {}
    
    # 1. concepts/graph.json
    c_file = LEXICON_DIR / "concepts" / "graph.json"
    if c_file.exists():
        with open(c_file, "r", encoding="utf-8") as f:
            c_data = json.load(f)
        c_data = fix_uuids_in_object(c_data, id_map)
        with open(c_file, "w", encoding="utf-8") as f:
            json.dump(c_data, f, ensure_ascii=False, indent=2)
            f.write("\n")

    # 2. Approved language core files
    for lang in ["en", "es", "ja", "el"]:
        lf = LEXICON_DIR / "languages" / lang / "lexicon.json"
        if lf.exists():
            with open(lf, "r", encoding="utf-8") as f:
                l_data = json.load(f)
            l_data = fix_uuids_in_object(l_data, id_map)
            with open(lf, "w", encoding="utf-8") as f:
                json.dump(l_data, f, ensure_ascii=False, indent=2)
                f.write("\n")

    print(f"Fixed {len(id_map)} non-hex ID strings to standard UUID hex format.")

if __name__ == "__main__":
    main()
