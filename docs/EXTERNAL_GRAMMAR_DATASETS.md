# External grammar datasets for Gef

Status: research decision record
Date: 2026-09-22
Canonical Task: `TASK-EXTERNAL-GRAMMAR-DATASETS`

## Purpose

Evaluate reusable multilingual data sources that can accelerate candidate grammar and morphology research without creating a second linguistic authority or bypassing Gef review.

Gef's existing boundaries remain controlling:

- Wiktionary stays the primary lexical source.
- Reusable grammar/morphology truth belongs in `gef-lexicon`.
- Exact work/anchor/span evidence belongs in `gef-content`.
- New imported or generated linguistic records remain `candidate` until reviewed.
- A dataset's license permits reuse; it does not make the imported linguistic interpretation approved.
- Dataset text/examples and dataset annotations can have different rights. Never assume an annotation license clears underlying source prose.

## Recommended source stack

| Source | Current release / coverage checked | What it contributes | Rights posture | Gef recommendation |
| --- | --- | --- | --- | --- |
| Universal Dependencies (UD) | UD 2.18, released 2026-05-15: 353 treebanks / 193 languages | UPOS, morphological features, dependency relations, lemmas, token-level syntax | **Per-treebank license.** Examples in the current release include CC BY-SA 4.0, CC BY-SA 3.0, CC BY-NC-SA 4.0 and CC BY-NC-SA 3.0. Some treebanks omit underlying text or require it separately. | **P0 evidence source.** Import annotations only through a per-treebank allowlist with exact release, treebank ID and license. Never treat "UD" as one blanket-reusable corpus. |
| UniMorph | Public project currently lists 169 annotated languages; individual language repositories carry their own source/license metadata | Lemma → inflected form → morphological feature bundles and paradigms | **Per-language/source license.** Many repositories use CC BY-SA 3.0, but the project must not be treated as one globally uniform license. | **P0 candidate morphology source.** Strong fit for Gef form/analysis layers. Preserve source language repo, revision, upstream source and license per imported row/batch. |
| Grambank | v1.0.1; 2,467 language varieties, 195 features, 441,663 datapoints | Comparative morphosyntactic/structural features across language families | CC BY 4.0 | **P0 typology source.** Useful for deciding what systems a language may need researched and for candidate structural facts. Do not turn coarse comparative feature values directly into learner-facing rules. |
| WALS Online | v2020.4; finished project with released CLDF/Zenodo versions | Cross-linguistic structural/phonological/grammatical features with chapter-level scholarship | CC BY 4.0 | **P1 corroboration/reference.** Good for feature definitions, historical typology and cross-checking. Prefer citing the specific chapter/feature, not only the WALS umbrella. It is not a live source of current language-specific pedagogy. |
| Glottolog | v5.3 at review date | Stable language identifiers, classifications, bibliography, macro-language/variety disambiguation | CC BY 4.0 | **P0 identity/bibliography source, not grammar authority.** Use Glottocodes to reconcile dataset language identities and source bibliography; do not infer grammar from genealogy. |
| OPUS | Continuously aggregated parallel corpora | Parallel text useful for later empirical checks and model evaluation | **Corpus-specific licenses and copyrights.** OPUS pages expose distinct licenses by corpus (for example CC BY 4.0 or public-sector terms). | **Do not bulk-import as one source.** Admit individual corpora only after a rights allowlist and a concrete research need. Parallel sentences are content, not automatically reusable lesson examples. |
| PanLex | Large multilingual lexical-translation database | Lexical translation links, especially low-resource language coverage | Current PanLex database license page states CC BY-NC-SA 4.0 and commercial use requires written permission | **Not suitable for production ingestion by default.** Gef is a commercial product, so keep PanLex out of the shipping source pipeline unless written commercial permission is secured and recorded. |

## Source-specific integration rules

### Universal Dependencies

UD is extremely useful but is the easiest source here to ingest incorrectly. The release is an aggregation of independently licensed treebanks. The importer must resolve and store at minimum:

- UD release (`2.18`, not moving `latest`);
- treebank repository identity such as `UD_Spanish-GSD`;
- language/variety identity plus mapped Glottocode when defensible;
- exact treebank license/SPDX-compatible representation;
- whether underlying surface text is included and reusable;
- annotation provenance and conversion notes where the treebank itself reports automated conversion;
- source sentence identity if any token-level evidence is retained.

A treebank carrying a noncommercial license is not eligible for the commercial shipping corpus merely because another UD treebank is CC BY-SA. Treebank annotations can still be used as bounded research evidence where license permits that use, but release packaging must fail closed.

### UniMorph

UniMorph aligns well with Gef's `Form -> analyses[]` architecture, but imports must not flatten ambiguity. One surface form may map to multiple lemmas/feature bundles. Candidate mapping should preserve:

- upstream language repository and commit/release;
- UniMorph feature bundle verbatim as source evidence;
- the normalized Gef feature mapping as a separate derived layer;
- all competing analyses for syncretic forms;
- per-language source/license attribution;
- source-specific caveats. Some UniMorph repositories explicitly document corrected or superseded datasets, so "present upstream" is not equivalent to gold truth.

The existing UD↔UniMorph compatibility work is useful as a mapping reference, but conversion code and converted output need their own provenance/license review rather than being silently treated as either project's canonical truth.

### Grambank and WALS

These sources answer questions such as "does this variety exhibit feature X?" much better than "how should Gef explain this to a learner?"

Use them to:

- prioritize research for missing language realizations;
- seed candidate structural facts;
- identify cross-linguistic comparison axes;
- detect suspicious claims produced elsewhere;
- locate primary descriptive grammars through their bibliographies.

Do not automatically generate rule prose, practice answers or `system_status: "absent"` from one typological cell. A reviewed absence is stronger than a database value and must remain a Gef review decision.

### Glottolog

Glottolog should be the reconciliation backbone when external sources disagree about language names/codes. Store external IDs rather than overwriting Gef's canonical product identity. Genealogical proximity never licenses copying grammar from one language into another.

### OPUS and other corpus aggregators

A corpus aggregator is a directory of separately governed sources, not a single rights grant. Any future OPUS ingestion TODO must start with an allowlist containing corpus/version/license/source and the exact intended use. Do not import parallel text merely to manufacture lesson examples.

### PanLex

PanLex is valuable for research coverage, but its current database license is noncommercial. Gef should not ship PanLex-derived database content under the default production path. Reconsider only if written commercial permission or a separately compatible source subset is documented.

## Proposed implementation order

1. **Language identity registry adapter:** map UD/UniMorph/Grambank/WALS identities to canonical BCP-47/ISO/Glottocode evidence without changing the Expo support registry.
2. **Source manifest schema:** dataset name, immutable version/revision, component/treebank/language ID, license, attribution, upstream URL, retrieval date, checksum when downloadable, and `shipping_eligible` derived from reviewed rights policy rather than importer guesswork.
3. **UniMorph candidate importer:** import paradigms into staging/candidate form-analysis records while preserving all analyses and raw feature evidence.
4. **UD candidate evidence importer:** annotation-only allowlisted treebanks first; reject missing or incompatible license metadata rather than falling back to the umbrella project name.
5. **Typology research adapter:** query Grambank/WALS for research/candidate structural facts; no direct learner-facing promotion.
6. **Cross-source reconciliation:** disagreements become review tasks/evidence sets. No majority-vote auto-approval.

## Required gates for any new importer TODO

- No moving `latest` in durable provenance. Pin a release or commit.
- Preserve upstream license and attribution at the smallest practical imported batch.
- Treat mixed-license aggregations component-by-component.
- Separate copied source evidence from Gef-normalized/derived fields.
- Candidate in, candidate out. Import never promotes review state.
- No external example sentence becomes Gef book/lesson content without its own content-rights decision.
- No language is promoted to a product support tier from dataset presence; `gef-expo/registry/language-support.json` remains authoritative.
- Keep dialect/variety identity. Do not coerce everything sharing an ISO macrolanguage into one grammar.
- Track transformation version so a changed mapping can be rebuilt/audited.
- Validate that generated morphology preserves multiple analyses instead of choosing one by convenience.

## Decision

For the current grammar-knowledge program, the preferred evidence stack is:

1. **UniMorph** for candidate paradigms and morphology;
2. **Universal Dependencies** for candidate token-level morphology/syntax, under a strict per-treebank rights allowlist;
3. **Grambank** for broad structural/typological candidate facts;
4. **WALS** for scholarly typological corroboration and feature definitions;
5. **Glottolog** for language identity and bibliography reconciliation.

OPUS is deferred to corpus-specific rights work. PanLex is excluded from default production ingestion because the current database license is noncommercial.

This research closes the dataset-evaluation portion of `TASK-EXTERNAL-GRAMMAR-DATASETS`. It does **not** authorize an importer, approve any linguistic record, or assert that every language needed by Gef is covered by these datasets.

## Sources checked

- Universal Dependencies downloads/release inventory: https://universaldependencies.org/download.html
- Universal Dependencies treebank pages and licenses: https://universaldependencies.org/treebanks/
- UniMorph project/schema/dataset inventory: https://unimorph.github.io/
- Grambank download/current dataset: https://grambank.clld.org/download
- Grambank coverage: https://grambank.clld.org/
- WALS download/license: https://wals.info/download
- Glottolog current release/license: https://glottolog.org/
- OPUS corpus catalog: https://opus.nlpl.eu/
- PanLex database license: https://panlex.org/database-license/
