# Upgrade brief: bring an existing language's writing data to slots_version 2

An already-authored language (it is in curriculum-v2/realizations/<lang>/) has a `writing-system.json` written BEFORE the script lesson existed. The script lesson ("Learn the <script> alphabet") needs, for EVERY symbol, a sound, a word, and (for non-Latin scripts) a reading, plus teaching groups. Your job: upgrade ONLY that language's `writing-system.json` (and add the English locale entries it needs).

## Read first (paths are relative to the gef-lexicon checkout)

1. `curriculum-v2/authoring/BRIEF.md`: the section "Rules for the letter data" and "Rules for everything" apply here exactly (examples for EVERY symbol incl. plain Latin a to z, qualifiers `highlight`, `ipa`, `sound`, `reading` (required when the script is not Latin), `name`, `looks_like`, `forms`, `parts`; groups of 3 to 5; marks; NEVER write the em dash character U+2014 anywhere; punctuation examples need no `sound`; all content is candidate).
2. `curriculum-v2/INTRO_FACTS.md` ("Topic 2" and "The script lesson").
3. Finished examples of the target shape: `curriculum-v2/realizations/{ru,uk,tr,de,pl,ja,ko,hi,fa}/writing-system.json` and the matching entries in `locales/en/topics/writing-system.json`.
4. The language's CURRENT file: `curriculum-v2/realizations/<lang>/writing-system.json` and its gloss/label entries in `locales/en/topics/writing-system.json`.

## What to do

- Start from the current file (copy it into your drop directory first) and keep every existing fact that is still right; add `"slots_version": 2` after `completeness` (keep `completeness`), bump `version`.
- Add the missing letter data: an example fact `writing.<layer>.example.<key>` for every symbol of every layer that lacks one (for Latin languages that is every plain letter a to z that has no example yet), each with the qualifiers above; add `sound`, `reading` (non-Latin), `name` to existing examples that lack them. Example words: very common, concrete, at most 7 letters, preferably starting with the symbol, native words over loans, highlight exactly as it appears in the word.
- Add `writing.<layer>.group.<n>` teaching groups (3 to 5 symbols each, every symbol of the layer in exactly one group, easy-first for an English speaker who does not know the script; a logographic layer groups its example characters, 4 to 6 per group, easy and common first; make sure a logographic layer has at least 12 example characters).
- Marks (`writing.<layer>.mark.<id>`) keep as they are unless wrong.
- Locale additions: put NEW entries only in `<lang>_upgrade/locale-en.json` as `{"labels": {"writing_system": {...}}, "glosses": {"writing_system": {"<lang>:<fact_id>": "English meaning"}}}`: a gloss for EVERY new example fact (and any existing example fact lacking one), `layer.<id>.lesson` ("Learn the <script> alphabet") for each layer lacking it. Do not repeat or change existing labels/glosses (the merge never overwrites them).
- Check your own work with the real validator on a scratch COPY of the tree (copy the gef-lexicon checkout to your scratch directory without node_modules/.git, symlink node_modules, overlay your files with `python3 curriculum-v2/authoring/ingest_drop.py <drop> <lang>` run from inside your copy, run `node scripts/validate-curriculum-v2.mjs`). The validator holds a `slots_version: 2` language to every letter-data rule.

## Where to write

Under `<drop>/<lang>/`: `writing-system.json` (the full upgraded file, valid JSON, 2-space indent, real characters), `locale-en.json` (additions only, see above) and `NEEDS.md` (what changed and every uncertain item marked `[CHECK]`). Do not write anywhere else; do not touch the real tree. Reply with a SHORT summary: facts added per language and the [CHECK] list.
