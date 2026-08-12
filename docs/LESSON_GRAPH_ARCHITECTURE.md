# GEF Lesson, Construction & Curriculum Graph

Source: the Gef lesson system, reader UX, publishing pipeline, and lexicon architecture as consolidated in August 2026.

## Core separation

Gef keeps four independent systems:

1. **Books/content** say what exact language appears in a passage.
2. **Lexicon/parser** says what a token, phrase, form, sense, entity, or construction is doing there.
3. **Lesson graph** says what can be taught from those reviewed linguistic facts.
4. **Learner state** says whether and when a particular reader should see or practice it.

A lesson is never copied into every book. A book stores only reviewed occurrence evidence. A new lesson can therefore become useful in old books without rewriting canonical prose.

## Ownership

`gef-lexicon` owns reusable language knowledge:

```text
concepts/                           interlingual lexical concepts
curriculum/semantic-functions.json language-neutral semantic/function concepts
languages/{lang}/lexicon.json      lexemes, senses, forms, analyses
languages/{lang}/constructions.json language-specific constructions/contrast systems
lessons/{lang}/{lesson}/lesson.json reusable lesson logic
lessons/{lang}/{lesson}/renderings/{support}.json custom support-language prose only when truly needed
research/grammar/                   research staging before grammar promotion
```

`gef-content` owns exact corpus evidence:

```text
works/{work}/linguistic/{lang}.json       passage-specific resolution chains
works/{work}/lesson-coverage/{lang}.json  sparse lesson compatibility/review records
```

The app owns learner history, cooldowns, dismissal, ranking, and rendering.

## Curriculum depth is separate from linguistic knowledge

Canonical tier membership lives in `Clickabl/gef-expo/registry/language-support.json`.

- **Tier 1 — Full curriculum:** full grammar sets and eventual complete authored paths.
- **Tier 2 — Selective lessons:** a language contributes only the reviewed mapping required by a lesson that actually includes it. No complete grammar inventory/path is promised.
- **Tier 3 — Read + Games:** no grammar lessons. Lexicon/parser grammar data may still exist when reading, lookup, translation, corpus analysis, or Games need it.

Do not infer curriculum eligibility merely because a construction record exists.

## Semantic functions are not English glosses

Do not model English surface words such as `for` or `be` as universal concepts. Use language-neutral functions such as:

- `SEM.PURPOSE`
- `SEM.CAUSE_REASON`
- `SEM.BENEFICIARY`
- `SEM.DESTINATION_GOAL`
- `SEM.EXCHANGE_SUBSTITUTION`
- `SEM.PATH_ROUTE`
- `SEM.MEANS_CHANNEL`
- `SEM.DEADLINE_TARGET_TIME`

For new domains such as Being/state/location/existence, research the cross-language semantic territory first. A language-specific construction maps real lexical/syntactic behavior onto one or more semantic functions. Spanish `ser/estar`, Portuguese `ser/estar`, Japanese copular/existential constructions, and Russian zero-copula patterns are independent implementations even when they occupy analogous semantic territory.

## Constructions

A construction is reusable linguistic knowledge above the individual word sense. Examples:

- Spanish `para + infinitive` expressing purpose
- Spanish interrogative `por qué`
- English `used to + VERB`
- a reviewed multiword expression pattern
- a syntax pattern such as omitted subjects

Construction IDs are stable and language-specific (`CTR.es...`). They may reference lexemes, senses, phrase patterns, morphology features, semantic functions, or other constructions.

## Grammar sets and rule atoms

A cross-language grammar set compares a semantic domain across independent language systems. It does **not** mean one master language owns the rules.

Prefer reusable structured rule atoms such as:

- form/construction identity;
- semantic-function IDs;
- rule/relationship kind;
- applicability/conditions;
- exclusions;
- contrast targets;
- register/dialect/region metadata;
- reviewed examples/source refs.

Tier 1 may build a complete language-wide grammar inventory for the domain. Tier 2 should stop once the specific lesson family can represent that language accurately. Tier 3 does not receive grammar-lesson mappings merely to maximize language count.

## Lessons and rules

A lesson is a reusable pedagogical object (`LES.es...` or a reviewed cross-language family). It owns:

- target language or cross-language scope;
- stable pedagogical rules/micro-skills;
- prerequisites;
- links to semantic functions and constructions;
- trigger rules;
- reusable practice-module configurations;
- example-query constraints;
- cooldown/dismissal defaults;
- version and review state.

Rule IDs are semantic and stable. Never encode only a presentation number such as `reason_4`. A rendering may display a rule fourth today and fifth tomorrow without changing the occurrence annotation.

## Support-language rendering without combinatorial explosion

The canonical grammar fact is stored **once** in the language-specific structured rule graph.

Do not create `number of grammar rules × number of interface languages` hand-authored copies.

Common explanation should be assembled from shared localized templates and localized semantic labels, for example the conceptual structure:

`Use {FORM} for {SEMANTIC_FUNCTION} when {CONDITION}.`

A support-language rendering file is appropriate for:

- genuinely custom pedagogy;
- nuance/exceptions not representable by the shared template vocabulary;
- cultural/usage notes;
- deliberate lesson narrative or humor.

It is not required merely because another interface language exists.

Tier 2 especially should rely on structured mappings + reusable templates. Tier 1 can justify richer authored prose because Tier 1 has the full-curriculum promise.

## Passage resolution chain

Canonical story text stays plain NFC text. Standoff annotations identify exact Unicode code-point spans and can resolve several layers at once.

A tap may expose, in progressive disclosure:

```text
selected phrase / named entity / expression
  -> construction or phrase pattern
  -> contextual sense
  -> lexeme
  -> exact form + morphological analysis
  -> language-neutral lexical/semantic concepts
  -> applicable lesson rules and lessons
```

The longest reviewed phrase/entity span may win initial selection, but component words remain independently tappable. The UI chooses presentation; the annotation does not encode sparkles, underlines, colors, or other visual styling.

## Ambiguity

For analyzed published content, passage-specific annotations should resolve the intended sense/construction wherever review is sufficient. For unanalyzed or ambiguous material, retain multiple candidate targets and mark the resolution unresolved/candidate rather than guessing.

This is what keeps `Grace` the personal name distinct from `grace` the common noun while allowing both to exist in the lookup index.

## Lesson occurrence evidence

A passage occurrence can match zero or more lessons. A match records:

- `lesson_id`;
- stable `rule_id` where applicable;
- construction/semantic evidence already present in the resolution chain;
- pedagogical quality;
- whether deterministic practice is safe;
- review state and optional reviewer/provenance.

Do not put a free-form `lesson_tag` string on words.

## Book/chapter compatibility matrix

The canonical model is sparse: one row per actual `(edition scope, lesson)` relationship. A generated matrix/CSV may pivot these rows into books/chapters as rows and hundreds or thousands of lessons as columns.

Coverage states must distinguish:

- `not_analyzed`
- `candidate`
- `partial`
- `reviewed_compatible`
- `reviewed_no_suitable_examples`

An empty cell must never ambiguously mean both "not analyzed" and "this chapter does not contain the feature."

## Example: Spanish por/para

The same lesson can receive different reasons from different occurrences:

```text
por la hierba       -> CTR.es.prep.por_path_route      -> RULE.es.por_para.por_path_route
¿Por qué lloras?    -> CTR.es.prep.por_que_question    -> RULE.es.por_para.por_reason_question
Por eso ...         -> CTR.es.discourse.por_eso        -> RULE.es.por_para.por_consequence
para mantener ...   -> CTR.es.prep.para_purpose_inf    -> RULE.es.por_para.para_purpose
una por una         -> CTR.es.prep.por_distributive    -> RULE.es.por_para.por_distributive
```

The lesson can order or group those rules however a teacher prefers without changing the canonical corpus annotations.

## Runtime rule

Heavy phrase detection, tokenization, morphology, sense assignment, construction matching, and lesson-candidate indexing happen at publishing time. Runtime work is lookup, spoiler-safe example selection, learner-aware ranking, and rendering.

Lessons are offers, not reading gates. The safest default discovery surface is a lesson link inside a tap sheet or an explicitly opened Lessons surface.
