# External grammar datasets for Gef candidate evidence

Status: research decision record
Date: 2026-09-09
Canonical Task: `TASK-EXTERNAL-GRAMMAR-DATASETS`

This document evaluates external multilingual resources as **evidence for candidate linguistic facts**, not as a replacement for Gef review. Canonical reusable grammar remains in `gef-lexicon`; exact passage occurrences remain in `gef-content`.

## Executive decision

Gef should not pick one giant external database and call it grammar truth. The useful resources answer different questions:

- **Grambank / WALS**: broad typological priors and structural features.
- **Universal Dependencies**: attested syntactic/morphosyntactic patterns in treebanks.
- **UniMorph**: inflectional morphology/paradigm evidence.
- **PanLex**: broad candidate lexical translation/equivalence discovery.
- **Wiktionary**: high-coverage lexical/sense/translation evidence with significant share-alike/provenance constraints.
- **authoritative language-specific grammars**: highest-value rule-level evidence, but source-by-source copyright/licensing and manual interpretation.

No source should auto-promote a Gef construction, semantic function, rule, lesson realization, or lexicon sense. External evidence enters as source-linked **candidate** facts, validators check structure, and a qualified review step determines canonical/trusted promotion.

## Source registry requirement

Before importing or mining external datasets at scale, every source/release should have a source-registry record containing at least:

```text
source_id
source_name
source_version_or_release
source_url / DOI
retrieved_at
content_hash when snapshotting
license / SPDX-style identifier where possible
commercial_use_allowed
redistribution_allowed
share_alike_required
attribution_required
source_scope
upstream_provenance_notes
language_identifier_systems[]
ingestion_mode
review_notes
```

Recommended `ingestion_mode` values:

- `structured_import`: compatible structured facts may be transformed into internal candidate records with required attribution/provenance.
- `evidence_only`: query/cite the source to support a newly authored Gef fact; do not redistribute its text/data payload.
- `manual_fact_extraction`: a reviewer consults the source and authors a structured fact in Gef with precise citation/page locator.
- `blocked`: license, provenance, or product-use constraints do not permit the intended use.

A dataset name is not a license. Inspect the exact release/treebank/language package actually consumed.

## Language identity crosswalk

External sources use incompatible language identifiers. Build an explicit crosswalk instead of equating strings by coincidence:

```text
Gef BCP-47 language identity
<-> ISO 639-1/639-3 where applicable
<-> Glottocode / Glottolog variety
<-> UD treebank language + treebank ID
<-> UniMorph repository/code
<-> PanLex language-variety ID
<-> WALS language ID
<-> Grambank Glottocode
```

Scripts, transliterations, dialects, regional variants, macrolanguages, and historical varieties must remain distinct when the source distinguishes them. A Glottocode or ISO code can be useful evidence for identity, but it does not override `gef-expo/registry/language-support.json` as product support authority.

# 1. Universal Dependencies (UD)

Official project: https://universaldependencies.org/
Official licensing guidance: https://universaldependencies.org/contributing/licensing.html

## What it gives Gef

UD provides tokenized/dependency-annotated corpora using cross-linguistic POS, morphological features, lemmas, dependency relations, and language/treebank-specific documentation. It is particularly useful for testing whether a proposed construction/rule is actually attested and for discovering candidate surface patterns.

Useful candidate evidence:

- adposition/case realization patterns;
- case and agreement features;
- dependency relations around purposive/benefactive/causal phrases;
- auxiliary/copula/clause-marker patterns;
- word order and attachment patterns;
- morphology visible through UD FEATS;
- corpus examples that can direct a linguist to a phenomenon.

## Licensing

UD is **not one uniform reusable license**. Official UD guidance says licenses are attached per treebank. New treebanks default to CC BY-SA 4.0 but may use CC BY-NC-SA, and existing treebanks include materially different licenses.

Current examples inspected:

- English EWT: CC BY-SA 4.0.
- English ParTUT: CC BY-NC-SA 4.0.
- English GUM: CC BY-NC-SA 4.0.
- English PUD: CC BY-SA 3.0.
- English ESL: annotation layer is CC BY-SA, while underlying text is not distributed and must be obtained separately.

### Gef policy

Maintain a **per-treebank allowlist**. Do not bulk-import an entire UD release into a commercial Gef artifact.

- `NC` treebanks are blocked for ordinary commercial product incorporation unless separately cleared.
- `BY-SA` treebanks require deliberate share-alike/legal architecture before redistributing derived dataset material.
- Treebanks whose text rights differ from annotation rights need both layers checked.
- Safest default use is `evidence_only` or aggregate/candidate-pattern extraction rather than copying source sentences into Gef.

## Strengths

- attested context rather than isolated grammar claims;
- standardized relations/features across many languages;
- useful for testing constructions and finding ambiguity;
- stable treebank IDs and release versions.

## Gaps / risks

- corpus/register bias can make absence look like linguistic impossibility;
- annotation conventions simplify or normalize real language-specific distinctions;
- dependency labels are syntactic analysis, not Gef semantic functions;
- treebank quality/coverage varies;
- surface frequency must not become a pedagogical rule automatically;
- mixed licensing is operationally expensive.

## Recommended use

`evidence_only` by default, with narrowly allowlisted structured imports where a specific treebank's license and upstream text rights are deliberately accepted.

# 2. UniMorph

Project: https://unimorph.github.io/
Data repositories: https://github.com/unimorph/
Schema tooling: https://github.com/unimorph/um-canonicalize

## What it gives Gef

UniMorph organizes inflectional paradigms as lemma + surface form + standardized morphological feature bundles. It is especially useful for languages where a semantic relation is realized through case marking, agreement, inflection, or clitic morphology rather than a freestanding English-like preposition.

Useful candidate evidence:

- inflected surface forms;
- paradigm completeness candidates;
- person/number/gender/case/tense/aspect/mood feature combinations;
- language-specific morphological tags that signal where universal schema is insufficient;
- validation of whether a proposed form belongs to an inflectional paradigm.

## Licensing

Do **not** assume the UniMorph umbrella has one uniform license. Individual language repositories inspected today commonly state CC BY-SA 3.0, including Spanish, Swedish, Turkish, Russian, Braj and Shona. Their upstream sources differ; examples include English Wiktionary and Wikipedia-derived data.

The separate `um-canonicalize` software is Apache-2.0, but the software license does not relicense the language data.

At least one UniMorph language repository has had an unresolved issue asking for its missing license, which reinforces the need for per-language-package verification.

### Gef policy

- Record license and upstream source **per language repository/release**.
- Treat CC BY-SA language data as `evidence_only` by default unless Gef explicitly adopts a compatible share-alike redistribution path for the relevant transformed data.
- Missing/unclear license = `blocked`, not 'probably same as the others'.
- Never let Wiktionary-derived UniMorph data bypass Gef's Wiktionary/source restrictions merely by traveling through UniMorph.

## Strengths

- morphology-centered rather than English-spelling-centered;
- standardized feature vocabulary makes cross-language comparison practical;
- valuable for case-rich/agglutinative/fusional languages;
- can expose relevant distinctions that typology databases only mark as present/absent.

## Gaps / risks

- paradigm data is not contextual sense resolution;
- feature inventory can be incomplete or contain language-specific tags;
- sources and licenses vary per language;
- generated/harvested paradigms can contain noise;
- an inflected form does not prove the semantic function of a particular occurrence.

## Recommended use

`evidence_only` / candidate morphology enrichment, with direct structured import only after per-language licensing and source-provenance approval.

# 3. Grambank

Website: https://grambank.clld.org/
Repository: https://github.com/grambank/grambank
Versioned dataset: https://doi.org/10.5281/zenodo.7844558 (v1.0.3 inspected)
License: CC BY 4.0

## Coverage

Current Grambank site reports:

- 2,467 language varieties;
- 195 grammatical features;
- 215 language families plus 101 isolates;
- 441,663 datapoints, 362,025 excluding unknown/not-known values.

The dataset uses Glottocodes, making language-variety crosswalking substantially cleaner than name matching.

## What it gives Gef

Grambank is a strong **typological prior**. Its feature questions cover structural properties such as whether a language has prepositions, word order, nominal plurality, tense and many other comparative variables.

For the “ways to express for” family, Grambank can quickly flag structural expectations such as:

- whether adpositions exist and what broad type is plausible;
- whether case marking is prominent;
- ordering/structural tendencies;
- whether a candidate rule would be typologically surprising and deserves extra verification.

## Licensing

The Grambank repository and official site state CC BY 4.0. Version and citation should be preserved, and attribution is required.

## Strengths

- commercial-compatible attribution license;
- broad global coverage;
- stable feature IDs and Glottocodes;
- explicit unknown values rather than silently treating missing as false;
- useful for routing research-required languages.

## Gaps / risks

- only 195 comparative features: intentionally coarse relative to a pedagogical grammar;
- a binary feature such as “has prepositions” does not tell Gef which form expresses purpose, recipient, duration, exchange, cause, etc.;
- database values summarize grammars and grammar sketches, not exhaustive language truth;
- language variety coverage still has gaps;
- feature coding may not capture dialect/register variation.

## Recommended use

`structured_import` is legally plausible for source-linked **candidate typology evidence**, while canonical Gef rules remain independently authored/reviewed. Never map a Grambank yes/no feature directly to a user-facing lesson rule without linguistic review.

# 4. WALS Online

Website: https://wals.info/
Current published dataset: WALS Online v2020.4
DOI currently advertised by the site: https://doi.org/10.5281/zenodo.13950591
License: CC BY 4.0

## What it gives Gef

WALS provides classic typological chapters/features with language values and bibliographies. It is useful when Gef needs a documented comparative claim, especially for word order, case, adposition type, possession, clause structure, grammatical categories, and other high-level features.

Its chapter-level bibliography is especially valuable because a WALS datapoint can lead a reviewer to the underlying grammar rather than becoming the endpoint of research.

## Licensing

WALS Online states CC BY 4.0 and asks users to cite the specific chapter for narrow feature use, not only the overall database.

## Strengths

- clear CC BY license;
- stable feature/chapter structure;
- references underlying language-specific sources;
- useful cross-check against Grambank and for selecting grammars to inspect.

## Gaps / risks

- WALS is a finished project and the site says it will no longer be updated;
- sparse feature-by-language matrix;
- one categorical datapoint cannot encode all constructions/meanings;
- historical source analyses may be superseded;
- not a lexeme/paradigm/corpus source.

## Recommended use

`structured_import` for source-linked candidate typological evidence or `manual_fact_extraction` when following a feature into the cited grammar. Keep WALS feature IDs/chapter citations in provenance.

# 5. PanLex

Website: https://panlex.org/
Data license: https://panlex.org/license
Development/source model: https://dev.panlex.org/source-registration/
License for distributed PanLex snapshots: CC0 1.0 Universal

## What it gives Gef

PanLex is a very broad multilingual lexical translation graph. It can help discover candidate expressions and cross-language equivalences, especially for lower-resource languages where a direct English/Wiktionary path is thin.

Useful candidate evidence:

- expressions by language variety;
- translation/denotation links;
- word-class information where present;
- source records and source provenance;
- language-variety identifiers;
- candidate equivalents to send into deeper linguistic review.

## Licensing and provenance nuance

PanLex explicitly distributes its database snapshots under CC0 and permits commercial copying/modification/distribution without permission. It also preserves source records and source license categories.

However, PanLex documents that it assimilates selected lexical translation facts from thousands of heterogeneous sources and records each source's permission/license status. Its own technical publications acknowledge the complexity of those upstream claims.

### Gef policy

The distributed PanLex data can be treated as CC0 at the dataset level, but **retain PanLex source IDs/provenance whenever available** and avoid using PanLex as a laundering mechanism for copied dictionary prose.

Do not import external definitions/example sentences merely because a translation edge is in PanLex. Use the translation relation as candidate evidence, then author/review Gef lexical truth under Gef's own source rules.

## Strengths

- extremely broad language/variety reach;
- permissive CC0 distribution;
- source-aware data model;
- good candidate generator for lexical equivalence.

## Gaps / risks

- translation equivalence can be many-to-many and context-insensitive;
- a PanLex “meaning” cluster is not automatically a Gef sense/concept identity;
- source quality varies;
- lexical translation does not establish grammar/construction rules;
- dialect/variety mapping still needs careful crosswalk.

## Recommended use

`structured_import` only into a **candidate translation-evidence layer**, with PanLex/source provenance. Never auto-create canonical `sense_id`, `concept_id`, or lesson rule solely from a PanLex edge.

# 6. Wiktionary

Website: https://www.wiktionary.org/
Copyright/license: https://en.wiktionary.org/wiki/Wiktionary:Copyrights
Current text license: CC BY-SA 4.0 plus GFDL, with some externally sourced/fair-use content carrying additional constraints.

## What it gives Gef

Wiktionary has exceptional breadth for:

- lemmas/forms;
- parts of speech;
- inflection tables;
- etymology clues;
- sense inventories;
- translations;
- usage labels;
- language-specific templates/categories.

Gef already treats it as useful linguistic source evidence.

## Gef licensing/content rule

`AGENTS.md` is explicit: **never copy Wiktionary definitions or example rows** into the Gef lexicon. Write first-party definitions natively. External data may be used only with compatible license/provenance.

Because Wiktionary text is share-alike and individual pages may include third-party/fair-use material, the safe default is `evidence_only`, not bulk textual import.

Use Wiktionary to:

- discover a candidate sense/form/translation;
- identify a language-specific distinction to research;
- collect a stable page/revision/source reference;
- verify against another source when the fact matters pedagogically;
- author an independent structured Gef fact/definition with provenance.

Do not use it to:

- copy definitions/examples verbatim;
- turn one English gloss into a universal concept automatically;
- treat translation lists as context-free semantic identity;
- bypass source license review by using a downstream mirror.

# 7. Authoritative language-specific grammars

This remains the most important source class for the exact 98-language “for” audit.

## What they give Gef

A good reference grammar can establish distinctions that no global dataset captures cleanly:

- purpose vs recipient/beneficiary;
- cause/reason vs intended use;
- duration/exchange/substitution;
- adposition vs case suffix vs clitic vs clause marker;
- animacy/humanness constraints;
- register/dialect differences;
- complement type requirements;
- word order and morphological conditioning;
- constructions that have no one-word English equivalent.

## Licensing

Treat every grammar independently. Copyrighted grammar prose/examples are not automatically redistributable merely because factual grammar rules can be researched from them.

Default ingestion mode: `manual_fact_extraction`.

Record:

- author/title/edition/year;
- publisher/URL/DOI/ISBN where applicable;
- page/section/table locator;
- the independently authored structured Gef rule supported by the source;
- exact quoted text only when necessary and legally permitted, kept minimal in internal evidence rather than product copy.

Prefer grammars from publishers/authors/open repositories that permit research access, but source authority and licensing are separate axes.

# Recommended evidence stack for the 98-language “for” audit

For each learner-capable language:

1. **Identity gate**
   - map the Gef BCP-47 identity to Glottocode/ISO and external-source IDs;
   - verify dialect/script scope.

2. **Typology preflight**
   - query Grambank and WALS for relevant structural features;
   - use results to decide what forms/categories to look for, never as final rule text.

3. **Morphology preflight**
   - consult a correctly licensed UniMorph language package when available;
   - identify candidate case/inflectional realizations.

4. **Corpus evidence**
   - inspect compatible UD treebanks for attested forms/constructions and ambiguity;
   - never conclude “absent” from corpus non-occurrence alone.

5. **Lexical candidate expansion**
   - use PanLex and Wiktionary to discover candidate equivalents/senses;
   - preserve source IDs and treat translations as hypotheses.

6. **Authoritative rule research**
   - confirm pedagogically meaningful distinctions in an authoritative language-specific grammar or comparable reviewed source;
   - cite exact page/section.

7. **Candidate Gef record**
   - author structured forms/constructions/rules and semantic-function links natively;
   - `review_state: candidate`;
   - source refs include every material source above.

8. **Review**
   - validator + linguistic/human review according to the Agent Review Queue/trust lifecycle;
   - only reviewed evidence may promote user-facing trust.

## Evidence conflicts

When sources disagree:

- do not majority-vote databases;
- preserve each claim/source/version;
- check whether they describe different dialects, registers, eras, senses, or analysis conventions;
- prefer direct language-specific evidence for a narrow rule over a broad typological summary;
- route unresolved material to review rather than forcing one answer for queue completion.

# Source suitability matrix

| Source | Best use | License posture | Gef default | Do not infer |
| --- | --- | --- | --- | --- |
| Grambank | broad structural typology | CC BY 4.0 | structured candidate evidence | exact form/semantic rule |
| WALS | comparative typology + bibliography | CC BY 4.0 | structured/manual evidence | exhaustive/current grammar |
| UD | attested syntax/morphology | per-treebank mixed; BY-SA/NC common | evidence-only + allowlist | semantic function from dependency label |
| UniMorph | inflection/paradigms | per-language; BY-SA common; upstream varies | evidence-only + per-language allowlist | contextual sense/meaning |
| PanLex | translation candidates across varieties | distributed data CC0; preserve upstream provenance | candidate translation evidence | canonical Gef sense/concept |
| Wiktionary | lexical/sense/form discovery | CC BY-SA 4 + GFDL; mixed page provenance | evidence-only | copyable first-party definition |
| language-specific grammar | exact rule/dialect/register evidence | source-specific | manual fact extraction | redistribution rights from factual use |

# Implementation recommendation

The next engineering step should **not** be a generic “download every dataset” script.

Build one source-evidence adapter contract with:

- explicit source/release/license record;
- language identity crosswalk;
- candidate evidence payload;
- source locator/feature/row IDs;
- transformation provenance;
- no canonical trust promotion;
- license-based import policy (`structured_import`, `evidence_only`, `manual_fact_extraction`, `blocked`).

Then add narrowly scoped adapters only where they materially reduce research work. Grambank/WALS are the lowest licensing-risk typology adapters. UD/UniMorph require per-dataset allowlists. PanLex is useful as a candidate lexical graph. Wiktionary should remain evidence-first under the existing no-copy rule.

## Completion conclusion

External resources can substantially accelerate the 98-language grammar audit, but they should behave like a **research exoskeleton**, not an oracle. Typology routes the researcher, morphology/corpora supply attested candidates, lexical graphs expand hypotheses, and language-specific grammars support the final rule. Gef still authors and reviews its own reusable semantic/construction truth.