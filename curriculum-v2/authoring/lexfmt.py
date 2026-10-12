"""Tiny JSON writer that matches gef-lexicon's hand-formatted style: objects expanded, scalar arrays and short flat objects on one line."""
import json

def _scalar(v):
    return isinstance(v, (str, int, float, bool)) or v is None

def _inline_ok(v):
    if isinstance(v, list):
        return all(_scalar(x) for x in v)
    if isinstance(v, dict):
        return all(_scalar(x) or (isinstance(x, list) and all(_scalar(y) for y in x)) for x in v.values())
    return False

def _enc(v):
    return json.dumps(v, ensure_ascii=False, separators=(", ", ": "))

def dumps(v, indent=0, width=118):
    pad = "  " * indent
    if _scalar(v):
        return _enc(v)
    if isinstance(v, list):
        if _inline_ok(v) and len(_enc(v)) + indent * 2 <= width:
            return _enc(v)
        if not v:
            return "[]"
        inner = ",\n".join("  " * (indent + 1) + dumps(x, indent + 1, width) for x in v)
        return "[\n" + inner + "\n" + pad + "]"
    if isinstance(v, dict):
        if not v:
            return "{}"
        # A dict whose values are all scalars/short lists and that fits on a line is written inline (facts, scene entries).
        if _inline_ok(v) and len(_enc(v)) + indent * 2 <= width:
            return _enc(v)
        inner = ",\n".join("  " * (indent + 1) + _enc(k) + ": " + dumps(x, indent + 1, width) for k, x in v.items())
        return "{\n" + inner + "\n" + pad + "}"
    raise TypeError(type(v))

def write(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        f.write(dumps(obj) + "\n")
