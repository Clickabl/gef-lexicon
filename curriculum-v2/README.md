# Gef Curriculum V2

This directory is the candidate authoring surface for the topic-first curriculum defined in `docs/LESSONS_V2_ARCHITECTURE.md`.

V1 lesson files remain frozen at their existing paths until the shipping compiler/runtime no longer depends on them. See `legacy/lessons-v1/`.

## Layout

```text
curriculum-v2/
  topics/
    index.json
    {topic-key}.json
  realizations/
    {language-tag}/
      {topic-key}.json
```

## Topic rule

One topic represents one coherent teachable distinction, structural system, or communicative capability.

Topics are universal curriculum objects. They do not declare a target language.

Examples:

- `TOPIC.form.noun_classification`
- `TOPIC.meaning.cause_purpose`
- `TOPIC.meaning.source_path_goal`

## Realization rule

Language realizations attach reviewed language-specific constructions and delivery capabilities to a topic.

A realization may participate even when the language lacks the compared grammatical system. For a form-system topic, an explicit reviewed `system_status: "absent"` is useful contrastive information rather than “no data.”

Do not create pairwise copies of the topic for every learner-language combination. Runtime comparison sessions are derived from the realizations available for the learner's selected languages.

## Review rule

New AI- or researcher-generated records start as `candidate` until reviewed. Existing approved lexical/construction truth may be referenced without changing its own review state, but the new topic/realization record still needs its own review.

## Reference implementation order

1. noun classification systems;
2. cause vs purpose;
3. source, path, and goal.

These are intentionally different problem types. They should prove that the architecture works for structural comparison, semantic contrast, and relational/spatial meaning before v1 is migrated wholesale.
