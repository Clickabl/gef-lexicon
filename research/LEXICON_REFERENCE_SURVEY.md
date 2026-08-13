# Lexical-resource reference survey

**Status:** architecture research only  
**Reviewed:** 2026-08-12  
**Commercial-data rule:** Nothing listed in this document is an approved Gef ingestion source merely because it appears here.

## Clean-room boundary

This survey exists to study lexical objects, annotation categories, coverage strategies, provenance, licensing patterns, and multilingual UX. It does **not** authorize copying external lexical rows into Gef.

Do not use this survey to scrape, import, translate, paraphrase entry-by-entry, reproduce relation graphs, mirror IDs, or seed first-party definitions from an external resource. A public web page is not an ingestion license.

Any future external-data proposal needs a separate ingestion decision identifying the exact source/version, rights holder, commercial/redistribution/modification/database rights, attribution or share-alike obligations, whether the data remains separate or enters Gef's database, item-level provenance, transformation assumptions, and appropriate product/legal approval.

This is engineering research, not legal advice.

## Architecture lessons

Gef's `Concept -> Sense -> Lexeme -> Form -> Analysis -> Occurrence` layering should remain first-party and explicit:

- a spelling is not a sense;
- a form is not a morphological analysis;
- a multilingual concept link is not proof of interchangeability;
- confidence is not review approval;
- a corpus occurrence is passage evidence, not reusable dictionary truth;
- a lesson reference is a pointer to curriculum, not a second copy of a lesson;
- provenance and rights belong to evidence, not a footnote added after publication.

## Resource survey

| Resource / standard | Useful design ideas | Licensing/provenance observation | Gef decision |
|---|---|---|---|
| **BabelNet** | Multilingual sense network, synsets/entities, typed links, source-aware aggregation | Standard BabelNet terms are non-commercial/research-oriented and underlying sources may have separate rights. | **Reference only.** No BabelNet synsets, links, glosses, IDs, lexicalizations, translations, rankings, or derived entry rows enter Gef without a separate commercial arrangement and ingestion decision. |
| **OntoLex-Lemon** | Separation of lexical entries/forms/senses, multilingual lexica, syntax/semantics, translation/variation and metadata | Data model/specification rather than a lexical dataset. | Adopt useful abstract modeling ideas independently. Gef does not need RDF merely to resemble OntoLex. |
| **Princeton WordNet** | Sense identity, synsets, typed lexical/semantic relations and POS distinctions | Princeton permits commercial use under its license subject to its terms/notices. | Architecture reference for this project. Any import remains a separate approved decision. |
| **Global WordNet / LMF ecosystem** | Resource language/license/version/status/confidence metadata and interoperable relation modeling | Individual resources retain their own licenses. The format is not a blanket data license. | Adopt provenance/version ideas; never treat a common format as permission. |
| **Wikidata Lexicographical Data** | First-class Lexeme/Form/Sense entities, grammatical features, qualifiers and sourceable statements | Wikidata structured Lexeme data is published under CC0, while other namespaces/content can differ. | Strong architecture reference; no import in this project. |
| **PanLex** | Broad multilingual graph, language varieties and source/permission metadata | Published snapshots are described by PanLex as CC0. | Useful coverage/provenance reference. No automatic ingestion; future use still needs quality/identity/provenance design. |
| **UniMorph** | Cross-language morphology and feature bundles; explicit syncretism | Schema is broadly reusable, but datasets can have source/license-specific provenance. | Use schema ideas, not paradigm rows by default. Preserve form-vs-analysis separation. |
| **Universal Dependencies** | Universal POS, morphology and dependency vocabulary with language-specific extensions | Treebank licenses vary; per-resource terms matter. | Conceptual annotation reference only unless an individual dataset is separately approved. |
| **FreeDict** | TEI dictionary representation and per-dictionary metadata | Individual dictionaries have separate terms; many are GPL-family. | Example of why “open” is not one commercial-use decision. Do not bulk-import. |
| **ConceptNet** | Typed commonsense relations, multilingual graph and provenance-oriented edges | CC BY-SA terms can materially affect combined/derivative database distribution. | Reference only unless a separately compatible distribution/legal strategy is approved. |
| **Wiktionary / Wikimedia lexical projects** | Broad community lexicography including etymology, pronunciation, morphology and relations | Different projects/namespaces have different licensing/provenance. | Research/reference by default. Do not use live Wiktionary as canonical Lexi truth. |

## Primary references reviewed

- BabelNet license: https://babelnet.org/license
- BabelNet full license: https://babelnet.org/full-license
- BabelNet downloads: https://www.babelnet.org/downloads
- OntoLex-Lemon model: https://www.w3.org/community/ontolex/wiki/Final_Model_Specification
- Princeton WordNet license: https://wordnet.princeton.edu/license-and-commercial-use
- Global WordNet formats: https://globalwordnet.github.io/schemas/
- Wikidata Lexicographical Data: https://www.wikidata.org/wiki/Wikidata:Lexicographical_data
- PanLex data license: https://panlex.org/license
- UniMorph schema: https://unimorph.github.io/schema/
- Universal Dependencies licensing: https://universaldependencies.org/contributing/licensing.html
- FreeDict documentation: https://freedict.org/documentation/
- ConceptNet FAQ: https://github.com/commonsense/conceptnet5/wiki/FAQ

## Design rules adopted independently

### Stable identity

Preserve durable IDs for lexemes, senses, forms, analyses, concepts, names/entities, semantic functions and constructions. Display text is not identity. Redirect superseded IDs instead of silently reusing them.

### Many-to-many form analysis

A surface form may support multiple analyses. Keep orthographic/phonological form separate from analysis bundles so syncretism remains representable.

### Typed multilingual relations

Do not store generic “translation = X” when the relation is approximate, regional, register-bound, construction-specific, broader/narrower, transliterated, localized, or context-only.

### Queryable provenance

Publishing automation should be able to determine who/what produced a claim, source/version, rights lane, process, review state, and supersession history.

### Confidence != approval

A model score of `0.99` is still candidate evidence. Machine verification is also not integrity approval. The canonical integrity states remain `candidate`, `approved`, `superseded`, `rejected`.

### Coverage != truth

Coverage matrices answer what has been analyzed/reviewed. Missing optional annotation, especially in Tier 3, is missing enrichment rather than evidence that a language lacks the feature.

### External data remains an explicit lane

If Gef later deliberately uses a third-party dataset, preserve source/license/provenance from acquisition through normalized records and packaged output. Do not wash external identity away during ETL.

## BabelNet-specific guardrail

BabelNet is useful as an architecture reference and as a reminder that a powerful multilingual graph can carry restrictive licensing.

Allowed here:

- study high-level public descriptions of multilingual sense/concept modeling;
- independently design Gef's own stable identity, typed relations, review and provenance systems.

Not allowed here:

- copy or derive BabelNet synset membership;
- copy cross-resource mappings/inter-resource links;
- copy glosses, lexicalizations, translations, examples, rankings, IDs or edge neighborhoods;
- query BabelNet entry-by-entry to generate Gef rows preserving its selection/arrangement;
- use an LLM to paraphrase BabelNet rows as a laundering step.

A future commercial license would be a new architecture/legal decision, not a retroactive reinterpretation of this clean-room research.
