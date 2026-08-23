# Gef Lessons V2: Topic-First Curriculum Architecture

Status: candidate architecture for the post-v1 lesson system.

This document defines the replacement authoring model for Gef lessons. Existing v1 lessons are frozen reference material until the v2 compiler and Expo runtime reach parity.

## 1. Design goal

Gef should not be organized as one isolated course per language or as a catalog of grammar chapter names.

The canonical learning model is:

```text
human communicative idea or structural system
  -> universal curriculum topic
  -> language-specific realization(s)
  -> learner-specific comparison session
  -> reviewed corpus examples
  -> practice + production + spaced review
```

A new language becomes more useful one topic at a time. It does not need a monolithic course before any instruction can ship.

## 2. The curriculum graph has three node kinds

Do not force every teachable idea into `SEM.*`. Semantic functions are only one layer.

### Meaning

Language-neutral semantic or discourse functions already represented by reviewed/candidate `SEM.*` records, such as:

- `SEM.CAUSE_REASON`
- `SEM.PURPOSE`
- `SEM.BENEFICIARY`
- `SEM.PATH_ROUTE`
- `SEM.DESTINATION_GOAL`
- `SEM.DURATION`
- `SEM.EXISTENCE_PRESENCE`

If a needed semantic function does not yet exist, research and promote it separately. Do not invent an ID merely to complete a topic.

### Form system

Cross-linguistically comparable structural systems that are not themselves meanings, for example:

- writing system and orthography
- grammatical noun classification / gender
- grammatical number
- articles and definiteness marking
- agreement
- case
- classifiers
- tense/aspect morphology
- tone
- evidentiality
- honorific and register systems

A form-system topic can explicitly represent that a language lacks the compared grammatical system.

### Communicative goal

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

Communicative goals provide the learner-facing path. Meaning and form-system nodes supply the machinery beneath them.

## 3. Topic is the canonical teaching unit

A v2 topic is reusable and has no required target language.

Example IDs:

```text
TOPIC.form.noun_classification
TOPIC.meaning.cause_purpose
TOPIC.meaning.source_path_goal
TOPIC.goal.locate_an_entity
```

A topic owns:

- stable topic ID/key;
- node kind;
- curriculum domain;
- learner-facing localization keys;
- links to existing semantic functions or other reviewed knowledge where applicable;
- prerequisite topic IDs;
- optional contrast/reinforcement edges;
- comparison axes;
- recommended lesson stages;
- review state and version.

A topic does not own:

- one target language;
- copied grammar facts for every language;
- book-specific sentences;
- learner mastery;
- React Native presentation state.

## 4. Language realization is separate from topic

Recommended source layout:

```text
curriculum-v2/
  topics/
    index.json
    {topic-key}.json
  realizations/
    en/
    es/
    pt/
    de/
    ru/
    ...
```

A realization owns:

- `topic_id`;
- `language_tag`;
- reviewed `CTR.*` construction links and/or other linguistic references;
- semantic-function mappings when the topic is meaning-based;
- conditions, exclusions, contrasts, and notes;
- explicit delivery capabilities;
- review state/version.

Do not create pairwise canonical lessons for Spanish-to-Portuguese, Portuguese-to-Spanish, English-to-Spanish, and so on.

## 5. Capability is multidimensional

V2 authoring should not store one source-of-truth flag equivalent to `full | comparison_only | unavailable`.

Capabilities are independent:

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

The UI may derive simple labels from these dimensions.

This lets a language honestly support comparison and reading examples before production or audio is ready.

## 6. Runtime session is an intersection

A lesson session is compiled from:

```text
TOPIC
+ selected learning language(s)
+ learner's best/known comparison languages
+ reviewed realization capabilities
+ learner mastery
+ reviewed corpus evidence
+ current reading context
```

For a learner who knows Spanish and Portuguese while learning Italian, one topic can:

1. explain the universal distinction once;
2. show Spanish and Portuguese as known comparison realizations;
3. emphasize Italian;
4. surface useful transfer and traps;
5. practice Italian targets unless broader comparison practice is explicitly selected.

## 7. Lesson summary contract

Before opening a topic, derive support for the learner's own language set:

- **Learning here**: learning languages with sufficient instructional capability;
- **Compare with**: known/best languages with reviewed comparison capability;
- **Reading examples only**: languages with reviewed examples but incomplete instruction;
- **Not yet supported for this topic**: selected languages without a reviewed realization.

Do not hard-code one topic-wide language count into React Native.

## 8. One topic at a time

A topic should be narrow enough that the learner can answer “what did I just learn?” in one sentence.

Good boundaries:

- cause vs purpose;
- source, path, and goal;
- noun classification systems;
- grammatical number;
- definite vs indefinite reference;
- entity location;
- completed vs ongoing event viewpoint.

Bad boundaries:

- “Prepositions” as a single chapter;
- “All uses of por and para” as one first exposure;
- “Being” if it mixes identity, state, existence, location, event location, and time predication into one beginner node;
- broad vocabulary themes standing in for grammatical dependencies.

## 9. Recommended learner-facing dependency spine

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

Language-specific form-system branches attach only where needed. The graph defines prerequisites, not one universal screen order.

## 10. Shared lesson-stage vocabulary

Most topics should be composable from:

1. `context`
2. `notice`
3. `explain`
4. `focus_practice`
5. `contrast`
6. `produce`
7. `story_transfer`
8. `review`
9. `checkpoint`

Not every topic requires every stage.

The recommended default learning rhythm is:

```text
context -> notice -> clear explanation -> blocked practice
-> nearest contrast -> production -> story reuse -> spaced review
```

## 11. Existing Expo practice primitives should survive

The curriculum rewrite should not become a UI rewrite for interaction mechanics that already have the right responsibility.

Reuse generic primitives such as:

- `InlineChoice`
- `TypedResponse`
- `Unscramble`
- `PairMatch`
- `InteractiveClock`
- `InteractiveCalendar`

and planned/general primitives such as `SelectInText`, `ParadigmExplorer`, `MediaPrompt`, `SpeechResponse`, and `BucketAssign` where they land.

Do not create `PorParaExercise`, `GermanGenderExercise`, or `RussianCaseExercise` when the interaction is already generic.

Grammar truth never lives in a React component.

## 12. React Native implementation stays inside the existing lessons feature

Do not create a permanent parallel `lessons-v2` product feature. Keep the existing `src/features/lessons` ownership boundary and replace its internal model incrementally.

Recommended end-state shape:

```text
src/features/lessons/
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
  legacy-v1/
    ...temporary compatibility adapters only...
```

Reuse current `@/core/components` practice mechanics and any lesson presentation component whose responsibility remains correct.

Routes stay thin. The renderer dispatches on data-driven stage/block types. There is no screen per grammar topic.

## 13. Runtime document

Expo consumes a compiled JSON-serializable document, not raw linguistic source files.

High-level shape:

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

A migration compiler may adapt this to the current v1 runtime shape temporarily.

The app must not infer grammar at render time.

## 14. Corpus evidence ownership

`gef-content` continues to own exact work/anchor/span evidence.

A topic realization says which linguistic targets matter. Publishing-time analysis links occurrences to those targets. Runtime chooses reviewed examples according to spoiler policy, quality, current book, and learner history.

Do not copy story sentences into `gef-lexicon` merely to make a lesson work.

## 15. Learner-state database

Canonical curriculum truth stays in packages. The local learner database stores evidence/mastery only.

Recommended SQLite entities:

### `learner_topic_mastery`

Cross-language conceptual familiarity:

- profile ID
- topic ID
- conceptual strength/confidence
- evidence count
- last seen
- next review
- scoring-model version

### `learner_realization_mastery`

Language-specific form knowledge:

- profile ID
- topic ID
- language tag
- construction/target ID
- modality: `recognition | reading | listening | writing | speaking`
- strength/confidence
- evidence count
- last seen
- next review

### `learning_evidence`

Append-oriented evidence:

- evidence ID
- session ID
- topic ID
- language tag
- target IDs
- practice primitive
- modality
- result/score
- timestamp
- source context such as lesson, book occurrence, placement, or review

### `topic_session_history`

- session ID
- topic ID
- learning language tags
- comparison language tags
- source context
- started/completed timestamps
- compiled topic version

A materialized review queue is allowed for performance but should be derivable from mastery/evidence.

## 16. Mastery and transfer remain separate

Track at least:

1. concept/topic understanding;
2. language realization mastery;
3. communicative performance by modality/context.

Knowing purpose through Spanish can shorten explanation when learning Portuguese or Italian. It must never mark the Portuguese or Italian construction mastered.

Conceptually, the durable key is:

```text
topic/semantic target x language x construction x modality
```

## 17. Placement and skipping

Placement gathers evidence against topics and realizations rather than assigning one coarse global level.

A learner may skip conceptual explanation when topic mastery is strong while still being tested on the new language realization.

Evidence should distinguish:

- understands the meaning;
- recognizes the form;
- chooses it in context;
- produces it;
- understands it in authentic reading/listening.

## 18. Adding a language

The incremental workflow is:

```text
pick one existing topic
  -> research the language's relevant system
  -> add/reuse reviewed constructions and linguistic facts
  -> create the topic realization
  -> declare only capabilities actually supported
  -> validate
  -> add reviewed corpus evidence where available
  -> topic becomes available to matching learners
```

There is no requirement to “finish the language” first.

## 19. Source-of-truth split

### `gef-lexicon`

Owns universal topics/graph edges, semantic functions, form-system definitions, language constructions/realizations, reusable pedagogical rules, and custom renderings when needed.

### `gef-content`

Owns exact reviewed story occurrences, passage-level linguistic resolution, compatibility evidence, example quality, and spoiler safety.

### `gef-expo`

Owns compiled runtime rendering, session language selection, learner evidence/mastery persistence, review scheduling, navigation/accessibility, and practice components.

## 20. V1 archive and migration policy

Do not physically move/delete v1 source while shipping compiler/runtime imports may still depend on it.

Effective for this migration:

- v1 lesson IDs/families are frozen reference material;
- new authoring targets v2 topics/realizations unless fixing a shipping v1 bug;
- `legacy/lessons-v1/catalog-snapshot.json` records the superseded catalog;
- current v1 source stays at existing paths until import consumers are removed;
- v1 may be mined for reviewed facts, constructions, and useful pedagogy;
- v1 lesson boundaries are not automatically migrated;
- after v2 parity, a second cleanup physically removes/relocates unreachable v1 code/data while Git history remains the archive.

This is archive-first, cutover-second, not a flag-day rewrite.

## 21. Reference topics

Prove the architecture with three deliberately different topics:

1. `TOPIC.form.noun_classification`
   - proves structural comparison and meaningful absence of a grammatical category.
2. `TOPIC.meaning.cause_purpose`
   - reuses existing por/para semantic work without making Spanish universal.
3. `TOPIC.meaning.source_path_goal`
   - proves relational comparison across adpositions, cases, particles, and other constructions.

Only after these work across typologically different languages should the remaining v1 catalog be mapped wholesale.

## 22. Non-goals

V2 does not mean:

- one identical path for every language;
- pretending every language has every category;
- using English as the data-model interlingua;
- generating unreviewed grammar at runtime;
- copying one lesson per language pair;
- putting story sentences in `gef-lexicon`;
- deleting generic Expo practice primitives with correct responsibilities;
- treating AI-generated content as approved linguistic truth.
