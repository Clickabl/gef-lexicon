# Being / copula / state / location research program

Status: **research staging — not canonical grammar truth**

This directory is the research workspace for the cross-language grammar domain informally introduced by the lesson hook **“To be… or to be?”**.

The Shakespeare hook is editorial only. The linguistic model is not built around English `be` and must never assume every language has one equivalent verb.

## Product scope

Canonical curriculum tiers come from `Clickabl/gef-expo/registry/language-support.json`.

- **Tier 1 — Full curriculum:** research the Being domain deeply enough to support a complete reusable grammar set and eventual authored path.
- **Tier 2 — Selective lessons:** research only the Being-domain mappings needed for this lesson family. Do not expand into a complete grammar of the language.
- **Tier 3 — Read + Games:** no Being grammar lesson research is required. Parser/lexicon facts may still exist elsewhere when needed for reading.

Current Tier 1 + Tier 2 research set: 21 languages.

Tier 1: `en`, `es`, `fr`, `pt`, `it`, `el`.

Tier 2: `zh`, `ja`, `de`, `ko`, `ar`, `hi`, `uk`, `ru`, `tr`, `pl`, `fa`, `id`, `ca`, `gl`, `mk`.

## Universal semantic territory to investigate

These are **research slots**, not final production IDs. Each language may fuse, split, omit, or express them through entirely different grammatical machinery.

1. **IDENTITY / EQUATION** — X is Y; identifying one entity with another.
2. **CLASSIFICATION / MEMBERSHIP** — X is a teacher / animal / member of class Y.
3. **PROPERTY / CHARACTERISTIC** — X is old, red, intelligent, wooden, etc.
4. **CURRENT STATE / CONDITION** — X is tired, sick, open, angry, ready.
5. **RESULTANT STATE** — X is broken/closed/finished as a result of a change.
6. **LOCATION** — X is in/at location Y.
7. **EXISTENCE / PRESENCE** — there is/are X; X exists/is present.
8. **ANIMACY-SENSITIVE EXISTENCE/LOCATION** — if the language distinguishes animate/inanimate or other noun classes here.
9. **TEMPORAL/OTHER COPULAR PREDICATION** — time, date, age, measure, origin, material, possession-like structures, etc. only where the language treats them as part of the same system.
10. **ZERO COPULA / OMISSION CONDITIONS** — where no overt copular form appears and under which tense/person/register conditions.
11. **BOUND OR INFLECTIONAL COPULA** — where copular meaning is encoded as suffix/clitic/agreement rather than an independent word.
12. **AUXILIARY `BE`-TYPE USES** — progressive, passive, perfect, or other auxiliary uses must be identified and kept separate from true copular/existential rules when the language distinguishes them.

Research may propose additional semantic slots, but must explain why an existing slot cannot represent the distinction.

## Required language-document output

Every language file must answer:

### A. Inventory
- What forms/constructions participate in this domain?
- Are they independent verbs, particles, clitics, suffixes, zero forms, cases, adjective/verb morphology, existential constructions, or something else?
- Which forms are productive vs lexicalized/idiomatic?

### B. Semantic mapping
For every relevant form/construction, map exactly which research slots it can express and under what conditions.

Do not inherit another language's boundary. Portuguese does not inherit Spanish. Catalan does not inherit Spanish. Ukrainian does not inherit Russian.

### C. Decision rules
Express the language's actual contrasts as structured candidate rules such as:

- `form/construction`
- `semantic_slot`
- `conditions`
- `exclusions`
- `contrast_with`
- `register/dialect/region`
- `examples`
- `source_refs`

Avoid prose-only rules when the same fact can be represented structurally.

### D. Morphosyntax
Document relevant tense/person/number/gender/class agreement, omission, word order, negation, questions, complement type, case government, animacy, and dialect/register effects.

### E. Common learner traps
Document only real, source-supported traps. Do not manufacture an English-vs-target comparison merely because English is the research language.

### F. Book/corpus opportunities
Find current Gef corpus examples where available, especially simple reviewed/candidate passages that can later become lesson evidence. Book text remains owned by `gef-content`; this file only records candidate references.

### G. Sources and review
Prefer primary/authoritative grammar sources: national academies, university grammars, reference grammars, peer-reviewed work, or established pedagogical authorities. Record URLs/citations and what each source supports.

Machine research remains `candidate`. Native/professional review is a later review state, not implied by completing the Task.

## Tier-specific depth

### Tier 1 research standard

The file should become a serious inventory for the whole Being domain, including important exceptions, adjective-class effects, dialect/register distinctions relevant to learners, tense/aspect interactions, and enough rule coverage to design an ordered path.

Completion question: **Could Gef eventually build a complete learner-facing Being/copula/state/location module for this language from this research without discovering an entire missing subsystem?**

### Tier 2 research standard

The file only needs to support this cross-language Being lesson accurately. Capture the major constructions and contrasts a learner should see, plus nuance necessary to avoid misleading simplifications.

Completion question: **Can Gef accurately explain how this language handles the semantic territory in this lesson and produce a few defensible comparisons/examples?**

Do not turn Tier 2 research into curriculum debt.

## Rendering rule

The research facts are not translated 104 times.

Production should ultimately store language-specific rule atoms once, connected to reusable semantic-function IDs. Shared explanation templates and localized semantic labels render common statements. Custom translated prose is reserved for nuance that templates cannot express faithfully.

## Lesson hook

Possible public-facing title/hook:

> **To be… or to be?**
> Hamlet only had one “be.” Some languages make you choose.

Any Hamlet note should accurately explain that “To be, or not to be” concerns living versus dying, not a grammatical choice between copulas.

## Research files

Tier 1:
- `en.md`
- `es.md`
- `fr.md`
- `pt.md`
- `it.md`
- `el.md`

Tier 2:
- `zh.md`
- `ja.md`
- `de.md`
- `ko.md`
- `ar.md`
- `hi.md`
- `uk.md`
- `ru.md`
- `tr.md`
- `pl.md`
- `fa.md`
- `id.md`
- `ca.md`
- `gl.md`
- `mk.md`

## Promotion boundary

This research directory is deliberately separate from `grammar/`, `languages/*/constructions.json`, and `lessons/`.

Research completion may propose candidate production records. A later review/publishing step decides what becomes reusable lexicon/grammar truth. No research Task self-promotes its output.
