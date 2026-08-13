# Gef Universal Lesson System

This page is the human-readable mirror of the lesson architecture agreed for Gef. It is intentionally comprehensive so a future human or agent does not need the original chats to reconstruct the product decisions.

The machine-readable source of truth is `curriculum/lesson-system-manifest.json` and its schemas. If this page and validated data disagree, correct the disagreement rather than treating this page as a second database.

---

## 1. Ownership and source of truth

Gef has three active repositories with hard boundaries.

### `Clickabl/gef-lexicon`

Owns reusable knowledge that survives any one book or UI:

- lesson groups and lesson parts
- reusable `LES.*`, `PART.*`, `GROUP.*`, `RULE.*`, `SEM.*`, `CTR.*`, concept, lexeme, and grammar-set identities
- lesson CEFR targets
- Core/Full completeness policy
- directional readiness rules and overrides
- language-specific lesson capability records
- learning-path definition and language overrides
- related-lesson graph
- reusable quest definitions/bindings when they are not tied to one exact text span
- lesson status/readiness SSOT

**The Lexicon is the lesson SSOT.**

### `Clickabl/gef-content`

Owns exact corpus evidence:

- works, editions, chapters, anchors, and exact story text
- standoff annotations for exact spans
- reviewed/candidate lesson-safe occurrences
- book/chapter lesson coverage
- default-reading evidence and selected reading bindings
- spoiler/passage safety

The Content repo should never become a second lesson database.

### `Clickabl/gef-expo`

Owns product/runtime concerns:

- app/runtime/UI
- lesson renderer and universal lesson components
- product language-support registry
- learner profile and best-language ordering
- reader interactions and lesson offers
- Agent Review Queue and task orchestration
- future admin/readiness surfaces or service layer

The Expo repo should consume Lexicon truth, not copy it.

---

## 2. Stable lesson hierarchy

The lesson system has three useful levels.

### Lesson group

A curriculum idea that may contain multiple independently placeable parts.

Examples:

- `GROUP.family`
- `GROUP.calendar_time`
- `GROUP.multiple_words_for`
- `GROUP.grammatical_gender`

### Lesson part

The smallest independently orderable/readiness-trackable teaching unit.

Examples:

- `PART.family.members`
- `PART.family.describe`
- `PART.calendar_time.days_of_week`
- `PART.multiple_words_for.semantic_map`
- `PART.multiple_words_for.spanish_por_para`

A group can contain parts that appear far apart in a language path. Being in the same family does **not** mean they must be consecutive.

### Concrete lesson definition

A reusable pedagogical implementation under `lessons/{language}/{slug}/lesson.json`, identified by `LES.*`.

Every concrete lesson must be represented by exactly one lesson part in the universal manifest. CI must fail when a concrete lesson is orphaned or a manifest points to a missing lesson.

A planned part may exist before a `LES.*` implementation does. That planned state must be explicit.

---

## 3. Core and Full are completeness tiers

Core/Full answer **how complete the lesson experience is**, not whether it is trusted or approved.

### Core

Core is the smallest genuinely useful lesson experience. It may be suitable for a low-depth or Tier 3 experience without claiming full grammar instruction.

Unless explicitly `not_applicable`, Core requires:

- canonical concepts/semantic identities
- intro/explanation
- a meaningful reusable interaction
- a defensible game or recognition activity
- a quest
- a default annotated reading
- annotation/backlink support
- learning-path placement
- CEFR target

For a Core lesson to claim **all-language coverage**, every canonical vocabulary/concept required by the part must resolve for every active language in the canonical `programs.learnFromLanguages` registry, or have an explicit researched record saying that there is no direct equivalent / the concept is packaged differently.

A broad English gloss is not enough. If a language lexicalizes a relationship or grammatical distinction differently, preserve those dimensions rather than forcing a fake one-to-one translation.

### Full

Full includes all Core requirements plus the language-specific depth needed for defensible instruction:

- structured rules/usage knowledge
- reviewed examples
- production/decision practice where a unique answer is genuinely defensible
- culture/register/context notes when relevant
- richer feedback
- related lessons and prerequisites

A Full lesson is not merely a longer Core lesson. It should add real instructional depth.

---

## 4. Language tiers and the universal concept layer

The product-wide language registry lives in:

`Clickabl/gef-expo/registry/language-support.json`

Never hard-code `104`, or any other strategic language count, into universal lesson logic. The current registry contains 100+ learn-from languages, but the lesson system must derive the active set from the registry so adding a language does not require rewriting manifests.

### Tier 1

Full-curriculum languages. These are the long-term complete-learning-path promise.

### Tier 2

Selective Full lessons where the required structured language data exists. Tier membership alone never makes a particular lesson Full.

### Tier 3

Read + Games / comparison-first languages.

Tier 3 may participate in Core when the concept layer is ready:

- cross-language comparison
- dictionary/lookup support
- recognition-safe games
- annotated reading
- reader quests
- lesson discovery

Tier 3 must **not** silently gain Full grammar instruction merely because a comparison record or concept row exists.

A lesson-specific promotion to Full requires explicit structured grammar/usage data and explicit eligibility according to the canonical registry/policy.

---

## 5. Best language, learning language, and directionality

Gef uses a learner's **best/explanation language**, not a presumed “native language.”

The phrase/profile concept `native language` and `nativeLanguage*` fields are forbidden in lesson definitions. “Native” remains valid only for unrelated meanings such as React Native or reviewer qualifications like an approved native speaker.

Lesson readiness is directional:

`best/explanation language → learning/target language`

Greek → Mandarin may have a different readiness result from Mandarin → Greek.

Do not materialize a giant source-language × target-language table for each lesson.

Resolve a directional pair from increasingly specific rules:

1. part default
2. source/target tier override
3. source-language override
4. target-language override
5. exact directional pair override

The exact pair override wins.

A dashboard may cache or summarize the resolved matrix, but the cache is never the SSOT.

---

## 6. Three status axes, not one overloaded badge

The product historically had several status ideas. They answer different questions and must stay separate.

### A. Integrity review

Answers: has the underlying authored/researched artifact been reviewed?

- `candidate`
- `approved`
- `superseded`
- `rejected`

Machine generation or validation must never self-promote `candidate` to `approved`.

### B. Asset trust

Existing product trust ladder:

- `machine_translated`
- `machine_verified`
- `public`
- `gef_certified`

A rendered lesson session inherits the minimum relevant trust of the assets it actually uses.

### C. Lesson audience/release stage

Answers: who is this resolved lesson experience ready for?

- `machine_created`
- `machine_verified` — minimum for public beta
- `general_public`
- `education`

`education` means explicit school/classroom readiness. It is not implied by being generally correct or public.

Examples of valid combinations:

- machine-created + candidate
- machine-verified + candidate
- general-public + approved/public assets
- education + approved/qualified review + certified assets

A schema pass is not linguistic approval. Human approval does not automatically mean school release.

---

## 7. CEFR is required everywhere

Every concrete `lesson.json` must declare `difficulty_band`.

Every lesson part in the universal manifest must declare a CEFR target.

Allowed bands include:

- `pre-A1`
- `A1`
- `A2`
- `B1`
- `B2`
- `C1`
- `C2`
- `mixed`

The universal part may also carry a range or language-specific override.

A language-specific override is appropriate when a concept is substantially harder/easier because of that language's structure. Do not distort the universal default to fit the hardest language, and do not invent an override without research.

A concrete implementation can contain a deeper Full surface than the Core orientation exposed by its part. Example: the generic multiple-words-for implementation is A2 as a complete rule/practice lesson, while a lighter semantic comparison orientation may be surfaced earlier. This difference must be explicit in part notes/ranges rather than hidden.

---

## 8. Ordered learning path, not sparse integer soup

Canonical ordered path:

`curriculum/learning-path-template.json`

The learning path is an array of learning objects. It may contain:

- lesson parts
- books
- chapters
- future learning objects

Numeric priority may remain as compatibility metadata or a scheduling hint, but it is not the curriculum SSOT.

Language-specific override operations may:

- move an item before/after another item
- omit an item
- insert an item
- replace an item
- adjust a CEFR target

Example: Spanish inserts `PART.multiple_words_for.spanish_por_para` after the generic semantic-map primer. Other languages do not inherit Spanish-specific por/para just because they share the group.

The Home / What's Next experience should resolve the next eligible item after applying:

- target-language path overrides
- prerequisites
- learner state
- availability/readiness
- completion state

Lesson-family siblings may deliberately be scattered through the path so the curriculum breathes instead of becoming four nearly identical modules in a row.

---

## 9. Related lessons are a graph

Canonical graph:

`curriculum/related-lessons.json`

Use stable relationships such as:

- `prerequisite`
- `next`
- `reinforces`
- `contrast`
- `sibling`
- `expands`
- `remediation`
- `discovery`

Do not bury important lesson relationships only in README prose or UI code.

---

## 10. Pedagogy first, components second

The required build workflow is in:

`docs/SO_YOU_WANT_TO_BUILD_A_LESSON.md`

Before writing JSON or UI, define what the learner should be able to notice, understand, choose, produce, or find in a real book.

Then brainstorm the interaction that best teaches that idea.

Only after that should an implementation inspect Expo's universal lesson component library:

`gef-expo/src/features/lessons/components/lesson-elements/`

Current reusable elements include concepts such as:

- comparison
- examples
- rule lists
- grammar primer
- facts
- language rules
- quest offer
- completion
- word bricks
- interactive clock
- interactive calendar
- interactive term cycle
- ordered term set

Rules:

1. Prefer an existing universal/native UI pattern when it teaches the idea well.
2. If a universal component is 80% right, improve it generically.
3. Create a new component only when the pedagogy is genuinely different.
4. Register/export the reusable component.
5. Test scroll, paged, classroom/presentation, accessibility, long translations, RTL, and large-script behavior where relevant.

Do not create one-off lesson screens merely because it is faster for one lesson.

---

## 11. Generic multilingual blurbs need visible evidence

The introduction to a cross-language lesson must explain a semantic concept without assuming languages package it the same way.

A lesson must never say something like “some languages use one word while others use two” and then fail to show a real example of the other pattern.

When the learner's selected languages do not naturally demonstrate the relevant contrast, the runtime may inject a **display-only contrast anchor**.

The anchor:

- is not added to the learner profile
- does not become a practice language
- exists only to make the pedagogical contrast concrete
- should maximize the relevant contrast

### Por/para gold-standard pattern

The “one or multiple words for ‘for’” family is the structural reference implementation.

English is useful as an example where the surface word `for` spans many semantic relationships.

Spanish is useful because `por` and `para` divide several of those relationships.

If neither selected language demonstrates the contrast, English or Spanish may be injected as a forms-only anchor, whichever better demonstrates the missing side.

Do not call every equivalent a preposition. Other languages may use:

- postpositions
- cases
- particles
- endings
- clause markers
- larger constructions

Por/para is the **gold-standard architecture example**, not an automatic quality promotion. Its actual data remains subject to review, quest, reading, annotation, and release gates.

---

## 12. Practice must have defensible answers

Gef must not generate artificial “right answers” because a UI wants a multiple-choice question.

A practice primitive should be omitted when:

- multiple answers are naturally valid
- the distinction is optional
- the prompt lacks a feature required to pick one form
- the language has no meaningful choice for that target
- the structured rules are not ready

Existing lesson patterns correctly use requirements such as:

- `require_unique_defensible_answer`
- `omit_when_no_meaningful_choice`
- `ask_only_features_explicitly_encoded_by_term`
- `omit_irrelevant_features`

Wrong answers should reveal the relevant explanation/rule, not create punitive streak behavior.

---

## 13. Games and the universal concept layer

Games should pair **semantic concepts**, not English spellings.

For example, the Family core matches relationship concepts such as mother/father/cousin rather than assuming every language has one word with the same boundaries.

If a target language has multiple valid forms because of age, gender, family side, register, affinity, or another distinction, the game should accept multiple forms unless the prompt specifies the needed feature.

Tier 3 is especially useful here: a language can have safe recognition/matching support long before it has a complete production lesson.

---

## 14. Every ordinary lesson needs a real reader bridge

Gef is a reading-centered language product. A normal language lesson is incomplete until it connects back to reading.

Unless explicitly `not_applicable` for a non-reading meta lesson, each lesson part requires:

- a canonical quest definition/binding
- a default annotated reading/book/chapter
- exact occurrence annotations in `gef-content`
- annotation links to Lexicon concepts/constructions/semantic functions
- lesson discovery metadata

The flow should support:

`book span → content annotation → Lexicon concept/construction → lesson part → optional lesson offer`

Example:

1. A reader taps a word that expresses the canonical `father` relationship.
2. The Content annotation resolves the exact occurrence to a Lexicon concept.
3. Lexicon says that concept participates in `PART.family.members`.
4. Expo may offer “Learn about family members” without interrupting reading.

Exact passages remain in Content. Reusable meaning remains in Lexicon. Interaction remains in Expo.

**Never attach an arbitrary book just to make the dashboard green.** Missing evidence must remain `required_missing` until a real binding exists.

---

## 15. Default readings and annotations

A default reading is not merely a title suggestion. It needs evidence that the relevant lesson concepts actually occur in a useful, spoiler-safe, pedagogically appropriate part of the work.

Content-side annotation passes should be able to record:

- concept/lexeme/sense identity
- construction identity
- semantic function
- lesson-safe occurrence quality
- quest suitability
- spoiler safety
- review/trust state

Missing annotation analysis means **not analyzed**, not “feature absent.”

---

## 16. Agent tasks and spare-capacity work

Gef already has a canonical Agent Review Queue in Expo. Lessons must reuse it rather than invent another queue.

Canonical queue schema:

`Clickabl/gef-expo/docs/product/schemas/agent-review-task-v1.schema.json`

Lesson-specific payload contracts:

- `schemas/lesson-ai-task-input.schema.json`
- `schemas/lesson-ai-task-output.schema.json`

A useful atomic lesson task targets one:

- lesson group
- lesson part
- source/best language
- target/learning language
- Core or Full tier
- component
- desired release stage

Examples:

- missing family concept realizations in Nepali
- verify the Greek → Mandarin intro explanation
- annotate a Spanish default reading for por/para
- research a language-specific CEFR/path override
- create a candidate reader quest

### Priority signals

Spare server capacity should prioritize missing work with signals such as:

- recent signup demand
- active learner demand
- learning-path criticality
- readiness gap
- concept/coverage gap
- staleness
- estimated compute/research cost

If 100 Nepali learners arrive, early-path Nepali gaps should move up the queue.

Demand affects **scheduling**, never truth or review status.

Prefer the smallest unblocker. If one missing concept blocks twenty pair combinations, fix that concept rather than generating twenty duplicated pair artifacts.

### Task vs TODO

- **TASK** = research, linguistic analysis, evidence gathering, content/review work.
- **TODO** = coding/product implementation.

Keep them separate and use dependencies when one requires the other.

---

## 17. Admin/readiness dashboard

The desired admin experience is a projection over the SSOT, not a new curriculum database.

It should eventually support:

- lesson group → part drilldown
- Core/Full coverage summary
- CEFR
- implementation state
- integrity-review summary
- asset-trust summary
- release-stage summary
- language-tier summary
- source → target pair drilldown
- component-level blockers
- target-language learning-path preview
- related lessons
- “Queue missing work” actions

Example summary language:

- all Tier 1 languages public-beta-ready
- top six languages general-public-ready
- English education-ready

Those summaries must be **derived** from resolved component-level truth rather than manually entered claims.

A minimal portable service/API layer should support the equivalent of:

- list lesson groups
- resolve lesson-part readiness for source + target
- summarize readiness by lesson/part/tier
- resolve a target-language learning path
- enqueue an atomic lesson-component task

Do not build a giant separate admin product before that data/service layer proves itself. A future web admin should be outside the learner app repo or consume the same API/service so a native admin client could also exist later.

---

## 18. Validation is part of the architecture

`npm run validate` must enforce the system, not merely document it.

The validation stack now includes:

- JSON Schema validation for every concrete `lesson.json`
- required CEFR/difficulty band
- stable ID/reference checks
- grammar/construction/semantic-function references
- no duplicate lesson IDs/rule IDs/trigger IDs
- forbidden `native language` profile terminology in lesson definitions
- manifest schema validation
- learning-path schema validation
- related-lesson schema validation
- status-model schema validation
- every actual lesson represented by the manifest
- every manifest implementation ID resolving to a real lesson
- lesson parts present in the ordered path/default or language override
- no duplicate binding of one concrete lesson to multiple parts

A future lesson that bypasses the SSOT should fail CI.

---

## 19. What “ready” means

There are two different meanings of ready.

### Architecture-ready

The lesson is:

- represented in the SSOT
- schema-valid
- CEFR-tagged
- placed/overridden in the learning path
- represented in the related graph where appropriate
- component/readiness gaps explicitly tracked
- compatible with language-tier policy
- using correct best-language terminology
- queueable through the canonical Agent Review Queue

### Audience-ready

The resolved directional lesson experience has all components needed for the intended release stage.

A lesson can be architecture-ready while still having red component cells. That is expected and useful.

A truthful red cell is better than an invented reading, generated linguistic claim, or fake approval.

---

## 20. Current architectural decisions that must not regress

- Lexicon is the lesson SSOT.
- Content owns exact corpus evidence.
- Expo owns runtime/UI/language registry/queue.
- No 104×104 lesson files or giant pair matrix.
- Language counts are derived from the registry.
- Core and Full are completeness tiers.
- Integrity, asset trust, and release stage are separate axes.
- CEFR is mandatory.
- Best language is the learner profile term.
- Tier 3 may get Core comparison/games/reading but not unsupported Full grammar.
- Every canonical Core concept must resolve across the active learn-from registry before claiming all-language Core.
- Ordered learning-path arrays and language overrides are canonical; sparse integer priority is not.
- Books and lessons may coexist in one learning path.
- Related lessons use a graph.
- Pedagogical interaction is designed before UI implementation.
- Reuse/improve universal UI components before making one-off components.
- Cross-language claims must render concrete contrast evidence.
- Por/para is the structural gold-standard example.
- Practice is omitted when there is no unique defensible answer.
- Ordinary lessons require a reader quest and default annotated reading.
- Missing evidence stays visibly missing.
- AI work uses the existing Agent Review Queue.
- Signup/learner demand prioritizes work but never bypasses review.
- Admin/readiness UI is a projection over the SSOT, never another database.
- Generated content remains candidate until real review.

For a compact build checklist and copyable JSON template, use `docs/SO_YOU_WANT_TO_BUILD_A_LESSON.md`.
