# GEF / Clickabl Lexicon Repository (`Clickabl/gef-lexicon`)

The reusable Clickabl-wide linguistic and curriculum graph for Gef and future
Clickabl language products.

This repository owns language knowledge that should survive any one book:

- interlingual lexical concepts;
- lexemes, senses, forms, analyses, morphology and pronunciation;
- phrase/expression and relation data;
- reusable personal-name families and entity metadata;
- language-specific constructions and contrast systems;
- language-neutral curriculum semantic functions;
- reusable lessons, pedagogical rule IDs, triggers and practice-module configs;
- support-language lesson renderings.

Exact story sentences and passage-specific lesson evidence belong in
`Clickabl/gef-content`, not here.

## Product-wide language support

This repository does **not** decide which languages are Golden, Partial,
Learner, App Translation Only, or otherwise supported.

Canonical product-wide authority:

`Clickabl/gef-expo/registry/language-support.json`

Human explanation:

`Clickabl/gef-expo/docs/product/LANGUAGE_SUPPORT.md`

A `languages/{lang}` profile, lexicon entry, lesson rendering, or incidental
piece of linguistic data does not promote that language's product support
level. Do not copy a strategic language list or count into this repository.

## Architecture

```text
concepts/                         lexical concept graph + generated reverse index
curriculum/                       language-neutral semantic/function concepts
languages/{lang}/profile.json     tokenizer/script/morphology capabilities
languages/{lang}/lexicon.json     reusable lexical core
languages/{lang}/constructions.json reusable language-specific grammar/constructions
names/                            reusable personal-name families
entities/                         reusable non-book entities where appropriate
lessons/{lang}/{lesson}/          reusable lesson logic
  lesson.json
  renderings/{support}.json
sources/                          bibliography/provenance records
schemas/                          machine-readable source contracts
scripts/                          validation/compilation
legacy/do-not-run/                quarantined historical generators
```

See:

- `docs/LEXICON_ARCHITECTURE.md`
- `docs/NAME_ENTITY_ARCHITECTURE.md`
- `docs/LESSON_GRAPH_ARCHITECTURE.md`

## Book boundary

Books do not carry copies of ordinary dictionary or lesson truth.
`Clickabl/gef-content` owns:

```text
works/{work}/editions/{lang}.json
works/{work}/linguistic/{lang}.json
works/{work}/lesson-coverage/{lang}.json
```

The content annotation resolves what a particular span means/does here. This
repo supplies the reusable IDs it points to.

For example, Spanish Frog King can annotate `para mantener...` as:

```text
CTR.es.prep.para_purpose_infinitive
  -> Spanish para purpose sense
  -> SEM.PURPOSE
  -> RULE.es.por_para.para_purpose
  -> LES.es.prep.por_para.core
```

The lesson is authored once and becomes available to every compatible reviewed
Spanish passage in the catalog.

## Review policy

Generated lexical, construction, name/entity and lesson material remains
`candidate` until a qualified human review promotes it. Machine generation is
not approval.

Do not import share-alike/copyrighted dictionary rows into the proprietary core.
External resources may only be used when licensing/provenance is explicitly
compatible or as non-copied validation references.

## Validation

```bash
npm ci
npm run validate
npm run validate:english
```

`npm run validate` runs both the structural lexicon iron gate and the lesson/
construction reference validator. GitHub Actions also regenerates the compiled
concept index and fails if generated output is stale.
