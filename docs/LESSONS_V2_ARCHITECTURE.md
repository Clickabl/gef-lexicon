# Gef Lessons V2: Topic-First Curriculum Architecture

Status: candidate architecture for the post-v1 lesson system.

This document defines the replacement authoring model for Gef lessons. It does not delete or reinterpret the current v1 lesson system. Existing v1 lessons remain frozen reference material until the v2 compiler and Expo runtime reach parity.

## 1. Design goal

Gef should not be organized as one isolated course per language or as a catalog of grammar chapter names.

The canonical learning model is:

```text
human communicative idea or structural system
  -> universal curriculum topic
  -> language-specific realization(s)
  -> learner-specific comparison session
  -> contextual examples from reviewed corpus evidence
  -> practice + production + spaced review
```

A new language becomes more useful by adding reviewed realizations to existing topics. It does not require authoring a separate monolithic course before any instruction can ship.

## 2. Keep three kinds of universal curriculum nodes distinct

Do not force every teachable idea into `SEM.*`. Semantic functions are only one layer of the curriculum graph.

### A. Meaning nodes

Language-neutral semantic or discourse functions such as:

- `SEM.CAUSE_REASON`
- `SEM.PURPOSE`
- `SEM.BENEFICIARY`
- `SEM.SOURCE`
- `SEM.PATH_ROUTE`
- `SEM.DESTINATION_GOAL`
- `SEM.DURATION`
- `SEM.EXISTENCE_PRESENCE`

These answer questions such as “what relation or meaning is being expressed?”

### B. Form-system nodes

Cross-linguistically comparable structural systems that are not themselves meanings, for example:

- writing system and orthography
- grammatical noun classification / gender
- number systems
- articles and definiteness marking
- agreement
- case
- classifiers
- tense/aspect morphology
- tone
- evidentiality
- honorific and register systems

A form-system topic compares how languages package grammatical information without pretending that the system is universal or semantic.

### C. Communicative-goal nodes

Things a learner can do, for example:

- identify a person or thing
- ask for information
- negate a statement
- locate an entity
- describe motion
- explain a cause
- state a purpose
- make a request
- compare two things
- narrate a sequence of events

Communicative goals provide the learner-facing path. Meaning and form-system nodes supply the linguistic machinery beneath them.

## 3. Topic is the canonical teaching unit

A v2 topic is a reusable curriculum object with no required target language.

Example IDs:

```text
TOPIC.form.noun_classification
TOPIC.meaning.cause_purpose
TOPIC.meaning.source_path_goal
TOPIC.goal.locate_an_entity
TOPIC.goal.ask_for_information
```

A topic owns:

- stable topic ID and key;
- node kind (`meaning`, `form_system`, or `communicative_goal`);
- curriculum domain;
- learner-facing title/summary localization keys;
- links to existing semantic functions or other reviewed knowledge where applicable;
- prerequisite topic IDs;
- optional contrast/reinforcement relationships;
- focus axes used to compare language realizations;
- recommended lesson stages;
- review state and version.

A topic does **not** own:

- one target language;
- copied grammar facts for every language;
- book-specific example sentences;
- learner mastery;
- React Native presentation state.

## 4. Language realization is separate from topic

Each language can contribute zero or more reviewed realizations to a topic.

Recommended path:

```text
curriculum-v2/
  topics/
    ...
  realizations/
    en/
    es/
    pt/
    de/
    ru/
    ...
```

A language realization owns:

- `topic_id`;
- `language_tag`;
- links to reviewed `CTR.*` constructions and/or other existing linguistic records;
- mappings from semantic functions to constructions when the topic is meaning-based;
- language-specific conditions, exclusions, contrasts, and notes;
- explicit delivery capabilities;
- review state and version.

The realization must describe the language accurately even when another language has no analogous category.

Example: English can participate in `TOPIC.form.noun_classification` with a realization explaining that modern English does not have a productive grammatical noun-gender system, while still recording relevant pronominal/natural-gender behavior. Spanish, German, Russian, Latin, and other languages can expose their own classification and agreement systems. The topic remains one comparison surface without claiming the systems are identical.

## 5. Capability is multidimensional

Do not use one source-of-truth flag equivalent to `full | comparison_only | unavailable` for v2 authoring.

A realization should declare capabilities independently, for example:

```text
explanation
comparison
reviewed_examples
recognition_practice
production_practice
reading_transfer
listening
speaking
story_quest
```

The product may derive simple learner-facing labels from those capabilities, but the stored truth should remain dimensional.

This lets a language participate honestly. A language might have a reviewed comparison explanation and reading examples before it has production exercises or audio.

## 6. A lesson session is an intersection, not a stored pairwise course

The runtime session is derived from:

```text
TOPIC
+ selected learning language(s)
+ learner's best/known comparison languages
+ reviewed realization capabilities
+ learner mastery
+ reviewed corpus examples
+ current reading context
```

Do not store separate canonical lessons for every pair such as Spanish-to-Portuguese, Portuguese-to-Spanish, English-to-Spanish, and so on.

For a learner who knows Spanish and Portuguese while learning Italian, the same topic can compile a session that:

1. states the universal idea once;
2. shows Spanish and Portuguese as known comparison realizations;
3. emphasizes the Italian realization;
4. highlights helpful transfer and false equivalences;
5. practices only Italian targets unless the learner explicitly chooses broader comparison practice.

## 7. Lesson summary contract

Every topic summary should be able to derive the learner's relevant language support before the session begins.

Recommended learner-facing grouping:

- **Learning here**: selected learning languages with sufficient instructional capability;
- **Compare with**: known/best languages with reviewed comparison capability;
- **Reading examples only**: languages that can contribute reviewed examples but not a full instructional realization;
- **Not yet supported for this topic**: selected languages with no reviewed realization.

This should be computed from topic + realization capabilities. Do not hard-code a topic-wide language count into React Native.

## 8. One topic at a time

A topic should be narrow enough that a learner can answer “what did I just learn?” in one sentence.

Good topic boundaries:

- cause vs purpose;
- source, path, and goal;
- noun classification systems;
- singular/plural/other grammatical number;
- definite vs indefinite reference;
- entity location;
- completed vs ongoing event viewpoint.

Bad topic boundaries:

- “Prepositions” as one chapter;
- “All uses of por and para” as one first exposure;
- “Being” when it mixes identity, state, existence, location, event location, and time predication into one beginner node;
- broad vocabulary themes used as substitutes for grammatical prerequisites.

A broad domain may contain many topics. A lesson path can cluster related topics into a unit without making the unit the canonical linguistic object.

## 9. Recommended universal path

The learner-facing path should primarily follow communicative dependencies, with language-specific branches inserted only where required.

```text
sound / script recognition
  -> reference: people and things
  -> basic clauses and participants
  -> negation
  -> questions
  -> quantity / number / reference
  -> possession
  -> location
  -> source / path / goal
  -> time relations
  -> event viewpoint and aspect
  -> cause / purpose / beneficiary
  -> comparison and degree
  -> ability / obligation / possibility / desire
  -> social meaning and requests
  -> clause connection
  -> complex description / embedding
  -> narrative and discourse
```

Form-system branches attach where the target language needs them. Examples include grammatical gender, noun classes, case, classifiers, articles, agreement, tone, script, evidentiality, and honorifics.

The graph therefore defines prerequisites, not one universal screen order.

## 10. Lesson-stage blueprint

Most instructional topics should be composable from a small shared stage vocabulary:

1. `context` — encounter the target in meaningful text/dialogue;
2. `notice` — highlight the meaning-bearing form or contrast;
3. `explain` — concise concept explanation;
4. `focus_practice` — blocked practice on the new target;
5. `contrast` — introduce the nearest confusable alternative;
6. `produce` — learner constructs/types/speaks the target where supported;
7. `story_transfer` — return to reviewed story occurrences;
8. `review` — spaced retrieval after delay;
9. `checkpoint` — optional mastery/placement evidence.

Not every topic requires every stage. The data says which stages are recommended; the runtime chooses presentation appropriate to capabilities and learner state.

## 11. Practice mechanics remain generic

The Expo practice primitives are the right abstraction and should survive the curriculum rewrite.

Do not create `PorParaExercise`, `GermanGenderExercise`, or `RussianCaseExercise` components when the learner interaction is already expressible as a generic primitive.

Examples:

- form choice -> `InlineChoice`;
- typed production -> `TypedResponse`;
- reconstruction -> `Unscramble`;
- form/meaning pairing -> `PairMatch`;
- identify a span -> `SelectInText` when available;
- classify targets -> `BucketAssign` when available;
- paradigm exploration -> `ParadigmExplorer` when available.

Topic-specific teaching components may compose these primitives, but grammar truth never lives in the component.

## 12. React Native v2 feature contract

Recommended Expo ownership after the v2 compiler exists:

```text
src/features/lessons-v2/
  screens/
    TopicLessonScreen.tsx
  components/
    TopicLessonSummary.tsx
    SupportedLanguagesStrip.tsx
    TopicConceptIntro.tsx
    LanguageRealizationPanel.tsx
    LanguageComparisonGrid.tsx
    TopicStageRenderer.tsx
    TopicProgress.tsx
  hooks/
    useTopicLesson.ts
    useTopicSupport.ts
    useTopicSession.ts
  model/
    topicRuntimeDocument.ts
    topicSession.ts
  services/
    topicCompilerAdapter.ts
```

Names are proposed contracts, not permission to duplicate existing generic components. Reuse current `@/core/components` practice primitives and reusable lesson presentation code wherever the underlying responsibility is still correct.

The renderer should dispatch on data-driven stage/block types. There should be no screen per grammar topic.

## 13. Runtime compiled document

The app should consume a compiled, JSON-serializable topic document. It should contain only approved/review-eligible data needed for the active session.

Suggested high-level shape:

```text
TopicRuntimeDocument
  topic
  selectedLanguages[]
    languageTag
    role
    capabilities
    realizationBlocks[]
  stages[]
  examples[]
  practiceTargets[]
  trustSummary
```

The compiler may produce a compatibility adapter to the current `LessonRuntimeLanguage` and `LessonRuntimeBlock` contracts during migration.

Do not make the Expo runtime parse raw linguistic JSON or infer grammar at render time.

## 14. Corpus example ownership

`gef-content` remains the owner of exact work/anchor/span occurrence evidence.

A topic realization identifies what linguistic targets are relevant. Publishing-time analysis links reviewed occurrences to those targets. At runtime, the session selects examples according to spoiler, quality, learner-history, and current-book policies.

A new topic can therefore use old reviewed books without copying story sentences into the lexicon repo.

## 15. Learner-state database

Canonical curriculum truth must not be stored in the learner database. The device database stores evidence and mastery only.

Recommended local SQLite entities:

### `learner_topic_mastery`

Tracks cross-language conceptual familiarity.

- profile ID;
- topic ID;
- conceptual strength/confidence;
- evidence count;
- last seen;
- next review;
- version of scoring model.

### `learner_realization_mastery`

Tracks language-specific form knowledge.

- profile ID;
- topic ID;
- language tag;
- construction/target ID;
- modality (`recognition`, `reading`, `listening`, `writing`, `speaking`);
- strength/confidence;
- evidence count;
- last seen;
- next review.

### `learning_evidence`

Append-oriented attempt/evidence rows.

- evidence ID;
- session ID;
- topic ID;
- language tag;
- target IDs;
- practice primitive;
- modality;
- result / score;
- timestamp;
- source context (lesson, book occurrence, placement, review, etc.).

### `topic_session_history`

- session ID;
- topic ID;
- learning language tags;
- comparison language tags;
- source context;
- started/completed timestamps;
- compiled topic version.

A materialized review queue may be added for performance, but it should be derivable from mastery/evidence rather than becoming a second curriculum source of truth.

## 16. Mastery and cross-language transfer

Track at least three distinct layers:

1. **concept/topic understanding** — the learner understands the distinction;
2. **language realization mastery** — the learner recognizes/uses the target-language construction;
3. **communicative performance** — the learner can use the target in a modality and context.

Knowing `SEM.PURPOSE` through Spanish can reduce explanation time when learning Portuguese or Italian. It must never mark the new language's realization mastered.

A useful internal identity remains conceptually:

```text
topic/semantic target x language x construction x modality
```

## 17. Placement and skipping

Placement should gather evidence against topics and realizations instead of assigning one coarse “beginner/intermediate/advanced” label.

A learner may be allowed to skip conceptual explanation when topic mastery is strong while still being tested on the new language realization.

Placement evidence should be able to distinguish:

- understands the meaning;
- recognizes the form;
- chooses the form in context;
- produces the form;
- understands it in authentic reading/listening.

## 18. Adding a language

The incremental workflow should be:

```text
pick one existing topic
  -> research the language's relevant system
  -> add/reuse reviewed constructions and linguistic facts
  -> create the topic realization
  -> declare only capabilities actually supported
  -> validate
  -> add reviewed corpus evidence where available
  -> topic automatically becomes available to matching learners
```

There is no requirement to “finish the language” first.

A coverage dashboard can therefore report progress by topic rather than only by global language tier.

## 19. Source-of-truth split

### `gef-lexicon`

Owns:

- universal topics and graph relationships;
- semantic functions;
- form-system curriculum definitions;
- language-specific constructions/realizations;
- reusable pedagogical rules;
- localized/custom renderings when truly needed.

### `gef-content`

Owns:

- exact reviewed story occurrences;
- passage-level linguistic resolution;
- topic/lesson compatibility evidence;
- book/chapter example quality and spoiler safety.

### `gef-expo`

Owns:

- compiled runtime rendering;
- session language selection;
- learner mastery/evidence persistence;
- review scheduling;
- UI navigation and accessibility;
- practice components.

## 20. V1 archive and migration policy

Do not physically move or delete v1 source files while the shipping compiler/runtime may still import them.

Effective immediately for the v2 migration:

- v1 lesson IDs and lesson families are **frozen reference material**;
- new curriculum authoring should target v2 topics/realizations unless maintaining a shipping v1 bug;
- `legacy/lessons-v1/catalog-snapshot.json` records the v1 catalog being superseded;
- current v1 files stay at their existing paths until import consumers are removed;
- v1 data may be mined for reviewed facts, examples of pedagogy, and reusable constructions;
- do not blindly migrate v1 lesson boundaries into v2;
- after v2 compiler/runtime parity, perform a second migration that moves/deletes unreachable v1 files and preserves Git history.

This is an archive-first, cutover-second migration, not a flag-day rewrite.

## 21. First reference topics

Use a few topics to prove the architecture before converting the whole curriculum.

Recommended reference set:

1. **Noun classification systems** (`TOPIC.form.noun_classification`)
   - proves a form-system topic where languages differ radically or lack the category;
   - exercises comparison without abusing semantic functions.
2. **Cause vs purpose** (`TOPIC.meaning.cause_purpose`)
   - reuses the strongest existing por/para semantic work;
   - proves one semantic distinction can map to different constructions in many languages.
3. **Source, path, goal** (`TOPIC.meaning.source_path_goal`)
   - proves that “preposition” instruction can instead be driven by spatial semantics across adpositions, cases, particles, and other constructions.

Only after these compile cleanly across typologically different languages should the rest of the v1 lesson catalog be mapped into v2.

## 22. Non-goals

V2 does not mean:

- one identical path for every language;
- pretending every language has every grammatical category;
- making English the interlingua of the data model;
- generating unreviewed grammar at runtime;
- copying a lesson for every language pair;
- putting story sentences in `gef-lexicon`;
- deleting generic Expo practice primitives that already have the correct responsibility;
- treating AI-generated content as approved linguistic truth.
