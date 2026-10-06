# Phrase-use source catalogues

This directory is an optional authoring location for reusable phrase-use
records. A per-language file is named `{language-tag}.json` and is validated
against `schemas/phrase-use-catalog.schema.json` plus the current product
language registry.

Phrase uses join an existing same-language lexeme and its owning sense to a
greeting time band or a general-expression context. The lexeme/sense retain the
canonical spelling and meaning. A phrase-use row must not copy definitions,
glosses, phrase templates, names, entities, or story text. Optional literal
references are typed links to other existing same-language lexeme/sense pairs;
when no supported literal sense exists, leave the references absent.

Rows carry their own `candidate`, `approved`, `rejected`, or `superseded`
review state, separate from all linked lexical facts. Candidate and approved
rows may appear in development output only when every linked fact is itself
candidate or approved. Their effective authority is approved only when every
member of the join is approved. Production output requires the use and every
linked lexical fact to be approved. Rejected and superseded rows never publish.

Do not add an empty file to imply language coverage. Missing source and a
present catalogue with no rows are reported distinctly in the generated core
manifest, both as explicit gaps. Compilation never assigns IDs or promotes
review state. Source references must resolve to existing bibliography records;
they do not establish approval or usage applicability by themselves.

These catalogues remain source data under the existing `lexi/` publication
prefix. The core-v2 compiler output is a separate package artifact; this
source layout does not claim an Expo v2 package installation or runtime path.
