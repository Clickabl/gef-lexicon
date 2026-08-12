# Gef / Clickabl Lexicon Repository (`Clickabl/gef-lexicon`)

The reusable Clickabl-wide linguistic and curriculum graph for Gef and future Clickabl language products.

This repository owns language knowledge that should survive any one book:

- interlingual lexical concepts;
- lexemes, senses, forms, analyses, morphology and pronunciation;
- phrase/expression and relation data;
- reusable personal-name families and entity metadata;
- language-specific constructions and contrast systems;
- language-neutral curriculum semantic functions;
- reusable lessons, pedagogical rule IDs, triggers and practice-module configs;
- support-language lesson renderings.

Exact story sentences and passage-specific lesson evidence belong in `Clickabl/gef-content`, not here.

## Product-wide language support

This repository does **not** decide product tier membership.

Canonical product-wide authority:

`Clickabl/gef-expo/registry/language-support.json`

Human explanation:

`Clickabl/gef-expo/docs/product/LANGUAGE_SUPPORT.md`

Standard batch grouping for translation/review:

`Clickabl/gef-expo/registry/standard-translation-groups.json`

Current curriculum-depth model:

- **Tier 1 — Full curriculum:** English, Spanish, French, Portuguese, Italian, and Modern Greek. These languages are the long-term complete-grammar/path promise.
- **Tier 2 — Selective lessons:** lesson-specific grammar mappings when a reviewed cross-language lesson naturally applies. No complete grammar inventory or full path is promised.
- **Tier 3 — Read + Games:** the merged former Tier 3/Tier 4 population. Reading, dictionary, comprehension, progression, script support where useful, and reusable Games; no grammar lessons are promised.

A `languages/{lang}` profile, lexicon entry, construction, or incidental piece of linguistic data does not promote that language's curriculum tier. A Tier 3 language may still need sophisticated morphology/construction data for lookup, translation, corpus analysis, or Games. **Linguistic knowledge is not curriculum commitment.** Do not copy strategic language lists or counts into this repository; read the Expo registry.

## Grammar-set scaling rule

Cross-language lesson families are built on **shared semantic functions + independent language mappings**.

Do not clone one language's grammar into another. Spanish `ser/estar`, Japanese copular/existential constructions, Russian zero-copula behavior, and other systems can occupy related semantic territory without sharing rules.

- Tier 1 may maintain complete reusable grammar sets, rich rule inventories, nuance/exceptions, authored tips, and full path placement.
- Tier 2 should normally contribute only the structured rule atoms needed by a lesson that actually includes that language: form/construction, semantic-function IDs, rule/relationship kind, applicability/contrast metadata, reviewed examples, and sources.
- Tier 2 explanations should prefer shared localized rendering templates over hand-translating bespoke prose for every rule/interface language pair.
- Tier 3 receives no grammar lessons, even if lexicon/parser knowledge exists for that language.

## Architecture

```text
concepts/                           lexical concept graph + generated reverse index
curriculum/                         language-neutral semantic/function concepts
languages/{lang}/profile.json       tokenizer/script/morphology capabilities
languages/{lang}/lexicon.json       reusable lexical core
languages/{lang}/constructions.json reusable language-specific grammar/constructions
names/                              reusable language-local personal names
name-families/                      reviewed/candidate cross-language name relationships
entities/                           reusable non-book entities where appropriate
lessons/{lang}/{lesson}/            reusable lesson logic
  lesson.json
  renderings/{support}.json
research/grammar/                   research staging; never approval by itself
sources/                            bibliography/provenance records
schemas/                            machine-readable source contracts
scripts/                            validation/compilation
legacy/do-not-run/                  quarantined historical generators
```

See:

- `docs/LEXICON_ARCHITECTURE.md`
- `docs/NAME_ENTITY_ARCHITECTURE.md`
- `docs/LESSON_GRAPH_ARCHITECTURE.md`
- `docs/SOURCE_QUOTE_PROVENANCE.md`

## Book boundary

Books do not carry copies of ordinary dictionary or lesson truth. `Clickabl/gef-content` owns exact edition text, occurrence evidence, and book/chapter lesson coverage.

The content annotation resolves what a particular span means/does here. This repo supplies the reusable IDs it points to.

For example, Spanish Frog King can annotate `para mantener...` as:

```text
CTR.es.prep.para_purpose_infinitive
  -> Spanish para purpose sense
  -> SEM.PURPOSE
  -> RULE.es.por_para.para_purpose
  -> LES.es.prep.por_para.core
```

The lesson is authored once and becomes available to every compatible reviewed Spanish passage in the catalog.

## Review policy

Generated lexical, construction, name/entity, grammar-research, and lesson material remains `candidate` until the appropriate review promotes it. Machine generation is not approval.

Do not import share-alike/copyrighted dictionary rows into the proprietary core. External resources may only be used when licensing/provenance is explicitly compatible or as non-copied validation references.

## Validation and compilation

```bash
npm ci
npm run validate
npm run validate:english
npm run compile:sqlite
npm run compile:names
```

`npm run validate` runs structural lexicon plus curriculum/lesson reference validation. GitHub Actions also regenerates deterministic compiled artifacts and checks development/production package gates. Production name compilation includes approved rows only; candidate rows remain development/review data.
