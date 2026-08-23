# Gef Curriculum

`curriculum-v2/` is the **only active authoring surface for Gef lessons and curriculum**.

There is no live legacy curriculum tree. If an older lesson is useful as inspiration, retrieve it from Git history and migrate only the facts or pedagogy that still belong in the current model. Do not restore old lesson directories, catalogs, family manifests, pairwise course files, or retired compiler inputs.

## Canonical layout

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
    ... optional reviewed cross-language transfer notes only ...
```

### Topics

A topic is the universal teaching identity. It represents one coherent orientation, meaning distinction, structural system, or communicative capability.

Examples:

- `TOPIC.orientation.language_overview`
- `TOPIC.form.noun_classification`
- `TOPIC.meaning.cause_purpose`
- `TOPIC.meaning.source_path_goal`

A topic owns the comparison policy and a surface-neutral experience blueprint. It does not own one target language or one learner-language pair.

### Language realizations

`realizations/{language-tag}/{topic-key}.json` stores only what is known for that language and topic.

Realizations are deliberately sparse. A new language does not need a complete course. Add the reviewed facts, constructions, examples, or capabilities that are justified now; leave the rest absent until learner demand or research fills them.

An explicit linguistic absence, such as a language lacking a productive noun-class system, is different from missing data and may be represented with `system_status: "absent"` when reviewed.

### Best-language localization

`locales/{best-language-tag}/topics/{topic-key}.json` stores learner-facing topic copy in the learner's best language.

Do not create English-to-Spanish, Spanish-to-Italian, Portuguese-to-German, or other pairwise lesson copies. The runtime composes a session from the learner profile.

### Optional bridge notes

`bridges/` is reserved for genuinely pair-sensitive transfer information such as a useful shortcut, false friend, or contrast that cannot be derived cleanly from the two independent realizations.

Bridge notes are optional exceptions, never a required N x N matrix.

## Runtime composition

The canonical compiler is `Clickabl/gef-expo/scripts/compile-topic-runtime.mjs`.

It packages topic truth, available language realizations, best-language localizations, and optional bridge notes. The Expo runtime then selects:

1. one or more focus languages;
2. the learner's best language;
3. other profile languages useful for comparison;
4. fallback reference languages only when the profile does not provide enough useful context.

Missing realization data stays visibly missing. The compiler must never manufacture a fake support tier or silently substitute a different language's grammar.

## Surface-neutral scenes

A topic experience is built from reusable scene kinds such as:

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

The same semantic scene data may later feed the React Native app, a printable worksheet renderer, a presentation, or a video generator. Presentation code does not own linguistic truth.

## Review rule

New AI- or researcher-generated records start as `candidate`. Existing approved lexical or construction truth may be referenced, but the new topic/realization/localization/bridge record still carries its own review state.

## Adding support after users arrive

The intended workflow is incremental:

```text
learner demand appears
  -> identify the topic(s) they need
  -> research the missing language realization or best-language copy
  -> add only the missing reviewed/candidate data
  -> compile
  -> the same universal topic immediately becomes richer for matching learners
```

Do not wait to “finish a language,” and do not create a separate course tree for it.
