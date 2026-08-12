# SO YOU WANT TO BUILD A LESSON?

This is the canonical build contract for Gef lessons.

If a lesson-specific README, chat, task, TODO, or old manifest disagrees with this document, update that artifact to point here. Reusable lesson truth lives in **`Clickabl/gef-lexicon`**. Exact book text and occurrence annotations live in **`Clickabl/gef-content`**. Runtime/UI, the canonical language-support registry, and the Agent Review Queue live in **`Clickabl/gef-expo`**.

Canonical machine-readable files:

- `curriculum/lesson-system-manifest.json`
- `schemas/lesson-system-manifest.schema.json`
- `curriculum/learning-path-template.json`
- `schemas/learning-path.schema.json`
- `curriculum/related-lessons.json`
- `schemas/related-lessons.schema.json`
- `schemas/lesson-ai-task-input.schema.json`
- `Clickabl/gef-expo/registry/language-support.json`
- `Clickabl/gef-expo/docs/product/schemas/agent-review-task-v1.schema.json`

## 1. Start with pedagogy, not JSON

Before editing a manifest, answer these questions:

1. What should the learner be able to **notice, understand, choose, produce, or find in a book** after this lesson?
2. What is the smallest useful **Core** version?
3. What makes the **Full** version genuinely more educational rather than merely longer?
4. What misconceptions will a naive word-for-word translation create?
5. What is the most memorable interaction for this concept?
6. Does the topic need multiple lesson parts? If yes, what can be learned independently and what must be sequential?
7. What CEFR band is appropriate by default? Could that shift for a particular learning language?
8. What real reading should prove that the lesson belongs in a reading app?

Do not start by cloning screens. A lesson is a pedagogical graph rendered by reusable runtime components.

## 2. Core and Full are completeness, not quality

Every directional language pair resolves a completeness tier and a release stage independently.

### Core

Core is the minimum useful lesson experience. It must be able to support low-depth participation such as explanation, recognition-safe game play, and a reader quest without pretending unsupported grammar is teachable.

Core requires, unless the manifest explicitly marks a component not applicable:

- canonical lesson concepts
- intro/explanation
- a meaningful UI interaction
- a game
- a quest
- a default annotated reading
- annotation/backlink support
- learning-path placement
- CEFR target

**Hard invariant:** every canonical vocabulary/concept required by the part must resolve for every language in the canonical `learnFromLanguages` program, or carry an explicit researched no-direct-equivalent record, before the part may claim all-language Core coverage.

The current product happens to have 100+ languages. **Never hard-code 104 into lesson logic.** Derive the active set from `gef-expo/registry/language-support.json` because that registry can grow.

Tier 3 may participate in Core through comparison, recognition-safe games, reading, annotation discovery, and quests when the concept coverage exists. That does **not** make Tier 3 a Full grammar-learning target.

### Full

Full adds everything needed for defensible instruction in the selected learning language:

- structured rules or language-specific usage knowledge
- reviewed examples
- production/decision practice where the language supports a unique defensible answer
- cultural/register/context notes when relevant
- richer feedback
- related-lesson links and prerequisites
- all Core requirements

Full grammar eligibility still follows the canonical language-support registry. Today that means Tier 1 plus selective Tier 2 support, not Tier 3.

## 3. Review state and release stage are different axes

Do not collapse these into one field.

### Integrity review state

Canonical existing values:

1. `candidate`
2. `approved`
3. `superseded`
4. `rejected`

Generated or machine-checked content remains `candidate` until the required human/research review approves it.

### Release stage

Canonical lesson release ladder:

1. `machine_created`
2. `machine_verified` — minimum for public beta
3. `general_public`
4. `education`

A JSON Schema pass is not linguistic approval. A human approval is not automatically an education release decision. Both dimensions are visible in readiness data.

## 4. Readiness is directional and component-level

The dashboard/runtime must be able to answer questions such as:

- Greek best/explanation language → Mandarin learning language
- Nepali best/explanation language → English learning language
- Core vs Full
- whole part readiness
- quest readiness only
- reading-annotation readiness only
- Tier 1 summary vs exact language-pair drilldown

Do **not** store a giant source-language × target-language table for every part.

Resolve readiness using this precedence:

1. part default
2. source/target tier override
3. source-language override
4. target-language override
5. exact directional pair override

An exact pair override wins. Dashboard summaries are projections/caches of the resolved truth, never the SSOT.

## 5. Break lessons into parts

A lesson group is a curriculum concept. A part is the smallest independently placeable learning object.

Example: Calendar and Time currently resolves as:

- `PART.calendar_time.time_of_day`
- `PART.calendar_time.days_of_week`
- `PART.calendar_time.months_and_years`
- `PART.calendar_time.seasons`

Those parts do not need to be adjacent in the learning path. `months_and_years` is currently marked partial because the existing lesson implements months, not the full years portion. `time_of_day` is currently planned.

Each part requires:

- stable `PART.*` ID
- title
- implementation status
- CEFR default
- optional CEFR range
- optional per-learning-language CEFR override
- prerequisite part IDs when genuinely sequential
- core concept refs
- quest binding
- default reading binding
- readiness profile
- gap list

If a language makes an apparently simple topic unusually complex, use a language-specific CEFR/path override. Do not distort the universal default to fit the hardest language, and do not invent an override without research.

## 6. The learning path is an ordered array

Canonical path: `curriculum/learning-path-template.json`.

Do not make numeric priority the curriculum SSOT. The path is an ordered array of learning objects. It can contain:

- lesson parts
- books
- chapters
- other learning objects

Language-specific overrides can move, omit, insert, replace, or retarget CEFR for individual items.

`curriculum/learning-path-placements.json` remains a compatibility projection while older consumers migrate.

The Home/What's Next surface should resolve the next eligible item from the active learning-language path after applying language overrides, prerequisites, availability, learner state, and readiness.

## 7. Related lessons are a graph, not hand-written links

Canonical graph: `curriculum/related-lessons.json`.

Supported relationships include:

- prerequisite
- next
- reinforces
- contrast
- sibling
- expands
- remediation
- discovery

Use graph edges for recommendations and curriculum traversal. Do not bury these relationships only in prose.

## 8. Design the interaction, then audit UI components

Before creating UI:

1. Describe the ideal teaching interaction without naming a component.
2. Inspect the runtime lesson-element registry in `gef-expo/src/features/lessons/components/lesson-elements/`.
3. Prefer an existing universal/native element.
4. If an existing element is 80% right, improve it generically instead of creating a lesson-specific clone.
5. Create a new universal lesson element only when the interaction is genuinely different.
6. Export/register it in the lesson-element registry.
7. Add its stable runtime reference to the lesson part when the SSOT needs to require that interaction.
8. Test scroll, paged, presentation/classroom, accessibility, long translations, RTL, and large script glyphs where relevant.

Existing runtime building blocks found during this audit include:

- `LessonComparison`
- `LessonExample`
- `LessonPracticeSlot`
- `LessonRuleList`
- `LessonSection`
- `LessonTextBox`
- `LessonGrammarPrimer`
- `LessonFacts`
- `LessonLanguageRules`
- `LessonQuestOffer`
- `LessonCompletion`
- `LessonWordBrick`
- `LessonInteractiveCalendar`
- `LessonInteractiveClock`
- `LessonInteractiveTermCycle`
- `LessonOrderedTermSet`

These names are implementation references, not permission to force every concept into the same interaction.

## 9. Generic multilingual blurbs need concrete contrast evidence

The gold-standard pattern is `lesson-families/multiple-words-for-for/` plus `lessons/es/por-vs-para/lesson.json`.

The intro should explain a **semantic idea**, not assume every language packages it the same way.

For the “for” family, English is useful because one surface word spans many relationships; Spanish is useful because `por` and `para` split several of those relationships. If the learner's selected languages do not themselves expose the claimed contrast, inject a **display-only contrast anchor** that does.

Rules:

- Best/explanation language comes first.
- Learning languages remain the actual practice targets.
- A contrast anchor does not become a profile language or practice language.
- Prefer a language that maximizes the pedagogically relevant contrast.
- Never claim “some languages do X while others do Y” and then render only examples of X.
- Do not call every equivalent a preposition. Languages may use postpositions, particles, cases, endings, clause markers, or larger constructions.
- The blurb must still read naturally when source and target happen to use the same strategy.

The por/para family is the **structural gold standard**, not automatically the highest review state. Its current gaps remain visible in the universal manifest.

## 10. Lexicon concepts must be universal enough for Core

A lesson's concepts belong in Lexicon truth, not duplicated in UI fixtures.

For every Core concept:

1. define a stable semantic/concept identity
2. attach language realizations for every active learn-from language
3. represent distinctions explicitly rather than forcing one English gloss onto every language
4. represent researched no-direct-equivalent behavior when necessary
5. preserve alternate forms/register/script data when relevant
6. validate coverage against the current registry-derived language set

A Tier 3 language may have only the concept/game layer. That is still valuable because it enables cross-language matching, lookup, annotated reading, and quests.

## 11. Every ordinary language lesson needs a quest and default annotated reading

Unless a manifest explicitly marks the component `not_applicable` for a non-reading meta lesson, each lesson part needs:

- a canonical quest definition or binding
- a default reading/book/chapter binding in `gef-content`
- occurrence annotations in that reading linking surface spans to Lexicon concepts/constructions
- lesson discovery metadata so tapping a relevant annotated term can offer the lesson

Example behavior:

1. A reader taps a word corresponding to the canonical `father` relationship concept.
2. The content annotation resolves the occurrence to the Lexicon concept.
3. Lexicon says that concept belongs to `PART.family.members`.
4. Runtime may offer “Learn about family members” without interrupting reading.

The book owns exact occurrence evidence. The Lexicon owns reusable meaning and lesson membership. The app owns the interaction.

Do not invent a default book just to make the field green. `required_missing` is healthier than fake coverage.

## 12. Queue missing work through the existing Agent Review Queue

Do not create another AI queue.

Canonical runtime queue contract lives in `gef-expo/docs/product/schemas/agent-review-task-v1.schema.json`.

Use `schemas/lesson-ai-task-input.schema.json` as the lesson-specific input payload inside that task contract.

An atomic lesson task should target exactly:

- lesson group
- lesson part
- source/best language
- target/learning language
- Core or Full
- one component
- desired release stage
- canonical source refs

Examples of components to queue:

- missing lexicon concepts for Nepali
- machine verification of the Greek → Mandarin intro blurb
- Spanish por/para default-reading annotation pass
- family quest creation for a target language
- language-specific CEFR/path research

### Spare-capacity priority

The server may compute a queue score from signals such as:

- recent signup demand
- active learner demand
- learning-path criticality
- readiness gap
- concept/coverage gap
- task staleness
- estimated compute/research cost

A sudden increase in Nepali learners should raise Nepali work near the front of the queue, especially for the earliest missing items in the Nepali path. Demand is a prioritization signal, never permission to skip review gates.

Prefer the smallest unblocker. If one missing lexicon concept prevents twenty Core lesson pairs, fix that before generating twenty duplicate pair artifacts.

## 13. Admin/dashboard contract

Do not build a second curriculum database for the admin UI.

An admin surface should read projections from the Lexicon manifest and queue tasks through the existing Expo Agent Review Queue.

Minimum useful views:

- lesson-group list
- part list with CEFR and implementation state
- Core/Full coverage summary
- release-stage histogram
- review-state histogram
- language-tier summary
- source → target pair drilldown
- component drilldown
- gap/blocker list
- learning-path preview for a selected target language
- related lessons
- “Queue missing work” action for any drilldown row

Minimum API shape, whether implemented as server routes or native service calls later:

- `GET lesson groups`
- `GET resolved lesson-part readiness for source + target`
- `GET readiness summary for lesson/part/tier`
- `GET resolved learning path for target language`
- `POST lesson component task` → canonical Agent Review Queue

The UI must never write release status directly as a side effect of generation. Promotion is a separate reviewed action.

## 14. Definition of done

### Core done for one directional pair

- all required Core components resolve ready
- relevant concepts exist for source and target
- game is defensible
- quest is bound
- default annotated reading is bound
- lesson discovery/backlink is wired
- CEFR/path placement resolves
- release/review states meet the intended audience gate

### All-language Core done

Everything above resolves for every active learn-from language according to the registry-derived language set. Do not count missing rows as zero-support success.

### Full done for one directional pair

- Core done
- learning target is eligible for Full support
- rules/usage knowledge reviewed enough for intended release
- examples are defensible
- practice avoids ambiguous fake-right-answer exercises
- culture/register notes are sourced where required
- related/prerequisite edges resolve

### Education done

`education` release requires explicit school/classroom readiness. Machine verification, public use, or `approved` integrity state alone does not imply it.

## 15. Copy this template

Use stable IDs. Delete comments before committing JSON.

```json
{
  "group": {
    "group_id": "GROUP.topic",
    "title": "Topic",
    "gold_standard": false,
    "family_refs": ["lesson-families/topic/family.json"],
    "related_lessons_ref": "curriculum/related-lessons.json"
  },
  "part": {
    "part_id": "PART.topic.part_name",
    "title": "Part title",
    "implementation_lesson_ids": ["LES.xx.domain.topic"],
    "implementation_status": "implemented",
    "cefr": {
      "default": "A1",
      "range": ["A1", "A2"],
      "language_overrides": {}
    },
    "prerequisite_part_ids": [],
    "core_concept_refs": ["path/to/canonical-concepts.json"],
    "quest": {
      "status": "candidate",
      "ref": "path/to/quest-or-lesson-binding"
    },
    "default_reading": {
      "status": "required_missing",
      "notes": "Bind a reviewed gef-content work/chapter and its annotations."
    },
    "ui_component_refs": [],
    "readiness": {
      "default": {
        "available_tier": "core",
        "release_stage": "machine_created",
        "review_state": "candidate",
        "components": {}
      },
      "tier_overrides": [],
      "language_overrides": [],
      "pair_overrides": []
    },
    "gaps": []
  }
}
```

## 16. Before you merge

- Run the universal lesson-system validator.
- Run the existing Lexicon validators.
- Confirm the active language count is derived from Expo's registry.
- Confirm no Tier 3 target accidentally gained Full grammar eligibility.
- Confirm every claim about a contrast has an actual rendered contrast example.
- Confirm missing corpus evidence says `required_missing`/not analyzed rather than absent.
- Confirm newly generated linguistic data is still `candidate` unless a real review changed it.
- Confirm learning path changes are expressed in the ordered template/override system.
- Confirm related lesson relationships use the graph.
- Confirm UI work reused or improved the universal lesson-element library before adding a bespoke component.
- Confirm queued AI work uses the canonical Expo Agent Review Queue.

When something is incomplete, update `curriculum/lesson-system-manifest.json` first. The manifest is the scoreboard; it is allowed to be red. A truthful red cell is more useful than a green lie.
