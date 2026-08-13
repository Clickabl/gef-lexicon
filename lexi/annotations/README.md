# Lexi annotation system

This folder is the Lexi-facing index for annotation work.

The detailed pass taxonomy currently lives at `docs/ANNOTATION_PASSES.md`. The Lexi system treats that document as an annotation workflow over the integration graph, not as another linguistic database.

## Passes by integration

| Pass | Primary integration(s) |
|---|---|
| P01 normalization / writing system | lexical-graph, language-support |
| P02 lexical identity | lexical-graph, names-entities |
| P03 lexical category | lexical-graph |
| P04 morphology / form analysis | lexical-graph |
| P05 pronunciation / reading support | lexical-graph, language-support |
| P06 senses / first-party definitions | lexical-graph, provenance-sources |
| P07 concepts / semantic functions / names / entities | lexical-graph, semantic-grammar-graph, names-entities |
| P08 register / region / pragmatics | lexical-graph |
| P09 constructions / syntax / valency | semantic-grammar-graph, lexical-graph |
| P10 multiword expressions / collocations | semantic-grammar-graph, lexical-graph |
| P11 semantic relations / confusables | lexical-graph, semantic-grammar-graph |
| P12 commonness / learner difficulty | lexical-graph, provenance-sources |
| P13 canonical lesson linkage | lesson-graph plus whichever graph owns the typed subject |
| P14 corpus occurrence verification | occurrence-graph plus reusable subject graphs |
| P15 provenance / rights / trust audit | provenance-sources plus every graph contributing a visible claim |

## Coverage is not trust

Pass coverage uses:

`missing`, `partial`, `complete`, `not_applicable`, `blocked`

Integrity remains independently:

`candidate`, `approved`, `superseded`, `rejected`

A pass can be complete while every produced row remains candidate. Confidence or machine verification never promotes integrity.

## Runtime rule

These passes are publishing/review work. Lexi runtime consumes their compiled outputs through the integration contracts in `lexi/integrations/`; it does not run the annotation pipeline on every tap.
