# Gef Topic-First Curriculum Architecture

Status: active architecture.

Gef lessons are assembled from reusable curriculum topics and language realizations. There is no active v1 curriculum architecture. Git history is the archive for retired lesson shapes.

## 1. Core model

```text
human idea / structural system / communicative goal
  -> universal topic
  -> sparse language realization(s)
  -> learner context
  -> runtime-selected scenes
  -> reviewed corpus evidence + practice
```

The important scaling rule is simple: **a language becomes teachable one missing topic at a time.** Gef does not require a monolithic course to exist before a real learner can use the language.

## 2. Four topic kinds

### Orientation

Context about the language itself rather than a grammar target. Example:

- `TOPIC.orientation.language_overview`

Orientation topics may use language genealogy, scripts, historical relationships, or other reviewed language metadata.

### Meaning

Language-neutral semantic/discourse functions such as:

- `SEM.CAUSE_REASON`
- `SEM.PURPOSE`
- `SEM.BENEFICIARY`
- `SEM.PATH_ROUTE`
- `SEM.DESTINATION_GOAL`
- `SEM.DURATION`

Meanings are not English words. English *for* and Spanish *por/para* are realizations or surface mappings, not universal semantic identities.

### Form system

Cross-linguistically comparable structural systems that are not themselves meanings, such as:

- writing system and orthography
- noun classification / grammatical gender
- grammatical number
- articles / definiteness
- agreement
- case
- classifiers
- tense/aspect morphology
- tone
- evidentiality
- honorific/register systems

A realization may explicitly say the compared system is absent in a language. That is a useful linguistic fact, not “unsupported.”

### Communicative goal

Things a learner can do, such as:

- identify a person or thing
- ask for information
- negate a statement
- locate an entity
- describe motion
- explain a cause
- state a purpose
- make a request
- narrate events

Communicative goals form much of the learner-facing dependency spine. Meaning and form-system topics supply the machinery underneath them.

## 3. Canonical source layout

```text
curriculum-v2/
  topics/
    index.json
    {topic-key}.json
  realizations/
    {language-tag}/
      {topic-key}.json
  locales/
    {best-language-tag}/
      topics/
        {topic-key}.json
  bridges/
    ... optional cross-language transfer notes ...
```

This is the only active curriculum source in `gef-lexicon`.

### Topic

A topic owns:

- stable ID/key;
- topic kind/domain;
- prerequisite and relationship edges;
- comparison axes;
- language-selection policy;
- a surface-neutral scene blueprint;
- review state/version.

A topic does not own one target language, one learner-language pair, book-specific sentences, learner mastery, or React Native layout.

### Language realization

A realization owns only the language-specific truth needed for that topic:

- semantic-function mappings;
- `CTR.*` constructions;
- structural facts;
- genealogy/script metadata where relevant;
- conditions/exclusions;
- sparse delivery capabilities;
- review state/version.

Realizations are intentionally incomplete while the product grows. Missing fields remain missing until demand or research fills them.

### Best-language localization

Topic learner-facing copy is stored once per best language, not once per language pair.

If three German-speaking users begin learning Spanish, the normal work is to fill the missing German topic localizations and any Spanish topic realizations they need. Do not author a separate German-to-Spanish course tree.

### Optional bridge note

Some transfer information is truly pair-sensitive, such as false friends or a particularly helpful shortcut from Spanish to Italian. Those notes may live under `bridges/`.

They are exceptions. The architecture must never require an N x N matrix.

## 4. Learner context and focus languages

A runtime experience receives:

```text
bestLanguageTag
focusLanguageTags[]
comparisonLanguageTags[]
```

`focusLanguageTags` may contain one or several languages.

Selection priority is:

1. focus language(s);
2. best language;
3. other known/profile comparison languages;
4. topic-defined fallback reference languages only if the selected set is too small to make the comparison useful.

Fallback languages are scaffolding, never privileged semantic anchors.

Example: a learner with best language English, strong Spanish, and focus language Italian should normally see English and Spanish as concise reference explanations while Italian receives the deeper focus treatment.

If the learner already has a large useful language set, no random filler languages are added.

## 5. Missing data is an expected state

Gef follows demand instead of pretending every language has a finished course.

A missing realization means exactly that: this topic has not been filled for this language yet.

Do not turn missing data into:

- a fake Full/Partial/None course matrix;
- copied English grammar;
- runtime-generated canonical linguistic claims;
- an invented pairwise lesson.

The runtime may still render the parts of a topic that are available and explicitly surface a missing focus-language realization.

## 6. Runtime compiler and runtime composer

There is one canonical curriculum compiler:

`Clickabl/gef-expo/scripts/compile-topic-runtime.mjs`

It packages:

- the topic;
- all currently available language realizations for that topic;
- available best-language localizations;
- optional bridge notes;
- provenance.

It does **not** decide the learner's final lesson.

The Expo runtime composer (`src/features/lessons/buildTopicExperience.ts`) intersects that package with the learner context and expands the topic blueprint into an experience for this learner now.

This split matters:

- compile time validates/package reusable truth;
- runtime chooses which known/focus/reference languages matter for one learner;
- no model invents canonical grammar at runtime.

## 7. Surface-neutral scenes

Topics describe semantic scene kinds instead of app-specific runners:

- `context`
- `term_reveal`
- `concept`
- `language_tree`
- `language_comparison`
- `focus_explanation`
- `practice`
- `story_transfer`
- `review`
- `checkpoint`
- `completion`

A scene is an experience atom, not a React component.

The same scene data should be usable by:

- React Native full-screen/paged lessons;
- printable worksheet composition;
- teacher presentation mode;
- generated social/video lessons.

For example, `term_reveal` can become a full-screen new-word card in the app, a printable vocabulary panel, or one timed video scene without duplicating the linguistic record.

## 8. Language overview is the default orientation pattern

`TOPIC.orientation.language_overview` is the canonical “what is this language?” experience.

Its tree should be generated from the learner's profile first:

- focus languages highlighted;
- best/known languages included when genealogically useful;
- reference languages added only if the resulting tree needs more context;
- no filler if the learner already has enough relevant languages.

Genealogical relationship does not imply mutual intelligibility or cultural interchangeability.

## 9. Por/para is a realization, not a universal lesson frame

The old por/para work remains useful linguistic research because it already separates meanings such as cause, purpose, path, beneficiary, destination, and means.

The current universal topic is meaning-first. For example `TOPIC.meaning.cause_purpose` teaches cause vs purpose and lets Spanish map those meanings to the appropriate reviewed constructions.

Spanish can still receive a rich realization. English, Portuguese, Italian, Greek, or another language can express the same meanings differently without being forced into an English “for” chapter or a Spanish `por/para` binary.

## 10. Practice components stay generic

Keep reusable interaction mechanics when their responsibility is sound:

- `InlineChoice`
- `TypedResponse`
- `Unscramble`
- `PairMatch`
- `InteractiveClock`
- `InteractiveCalendar`
- generic future primitives such as `SelectInText`, `ParadigmExplorer`, `SpeechResponse`, and `BucketAssign`.

Do not create `PorParaExercise`, `GermanGenderExercise`, or `RussianCaseExercise` when the interaction is generic.

Grammar truth never lives in a React component.

## 11. Corpus evidence ownership

`gef-content` owns exact work/anchor/span occurrences, passage resolution, example quality, spoiler safety, and practice eligibility.

A topic realization identifies reusable linguistic targets. Publishing-time analysis associates reviewed story occurrences with those targets. Runtime selects appropriate examples according to learner history and context.

Do not copy story sentences into `gef-lexicon` to make a topic self-contained.

## 12. Learner state

The device database stores learner evidence, not curriculum truth.

Recommended entities:

- `learner_topic_mastery` for cross-language conceptual familiarity;
- `learner_realization_mastery` for language-specific form knowledge by modality;
- `learning_evidence` for append-oriented answer/read/listen/write/speak events;
- `topic_session_history` for the exact compiled/runtime topic version and learner language selection used in a session.

Understanding a concept in Spanish may shorten explanation in Italian. It must never mark the Italian realization mastered.

## 13. Adding support after demand appears

```text
real learner need
  -> identify missing topic/language data
  -> research the realization and/or best-language localization
  -> add candidate data
  -> review when possible
  -> compile
  -> every matching learner can now use the richer universal topic
```

There is no “finish German” prerequisite. Three German-speaking users learning Spanish can justify filling exactly the German explanation gaps they encounter first.

## 14. Source-of-truth split

### `gef-lexicon`

Topics, semantic functions, constructions, sparse language realizations, best-language curriculum copy, optional transfer bridges.

### `gef-content`

Exact corpus occurrences, reviewed passage evidence, example quality, spoiler safety, work-specific material.

### `gef-expo`

The one topic compiler, learner-context composition, local learner state, review scheduling, navigation/accessibility, app renderers, and reusable practice components.

## 15. Retired systems

Do not keep a live legacy curriculum for reference. Git history already provides that archive.

Do not restore:

- retired v1 lesson catalogs/families;
- old lesson-specific compiler adapters;
- `compile-lesson-runtime.mjs`;
- topic-specific compilers;
- pairwise course trees;
- legacy runners merely because an older AI session can find them more easily.

When old work contains a valuable fact or pedagogy pattern, migrate that fact into the current topic/realization/localization model and leave the old implementation in history.

## 16. Non-goals

The topic architecture does not mean:

- one identical learning path for every language;
- pretending every language has every grammatical category;
- using English as the interlingua;
- generating canonical grammar with an LLM at runtime;
- writing one lesson per language pair;
- requiring complete language support before shipping one useful topic;
- coupling linguistic truth to one output surface.
