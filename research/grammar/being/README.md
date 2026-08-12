# Being / copula / state / location research program

Status: **research staging — not canonical grammar truth**

This directory is the research workspace for the cross-language grammar domain introduced by the lesson hook **“To be, or not to be”**, the exact English wording from Shakespeare's *Hamlet*, Act 3, Scene 1.

The Shakespeare hook is editorial only. The linguistic model is not built around English `be` and must never assume every language has one equivalent verb. Do not machine-invent localized Shakespeare quotations. If the lesson title is localized as a quotation, use a reviewed source edition in that language.

## Product scope

Canonical curriculum tiers come from `Clickabl/gef-expo/registry/language-support.json`.

- **Tier 1 — Full curriculum:** research the Being domain deeply enough to support a complete reusable grammar set and eventual authored path.
- **Tier 2 — Selective lessons:** research only the Being-domain mappings needed for this lesson family. Do not expand into a complete grammar of the language.
- **Tier 3 — Read + Games:** no Being grammar lesson research is required. Parser/lexicon facts may still exist elsewhere when needed for reading.

Current Tier 1 + Tier 2 research set: 21 languages.

Tier 1: `en`, `es`, `fr`, `pt`, `it`, `el`.

Tier 2: `zh`, `ja`, `de`, `ko`, `ar`, `hi`, `uk`, `ru`, `tr`, `pl`, `fa`, `id`, `ca`, `gl`, `mk`.

## Universal semantic territory to investigate

The current candidate production IDs are maintained in `curriculum/semantic-functions.json` and grouped by `curriculum/grammar-domains/being.v1.json`. Research may split, merge, or refine them before review, but must not force another language into English- or Spanish-shaped grammar.

1. **IDENTITY / EQUIVALENCE** — identifying one referent as the same person, thing, name, or value as another expression.
2. **CLASSIFICATION / ROLE** — classifying someone or something as a category, profession, role, or type.
3. **CHARACTERISTIC / PROPERTY** — predicating a descriptive characteristic without assuming it is literally permanent.
4. **CURRENT STATE / CONDITION** — a state, condition, disposition, or situation holding at the reference time.
5. **RESULTANT STATE** — a state understood as the result of a prior change, event, or process.
6. **ENTITY LOCATION** — where a person, object, place, or other entity is.
7. **EVENT LOCATION** — where an event, meeting, performance, or occurrence takes place.
8. **EXISTENCE / PRESENCE** — asserting that something exists or is present.
9. **ABSENCE / NONEXISTENCE** — asserting that something is absent or does not exist.
10. **TIME / DATE PREDICATION** — stating clock time, day, date, season, or related temporal identification.
11. **ORIGIN / AFFILIATION** — origin, nationality, provenance, membership, affiliation, or belonging.
12. **MATERIAL / COMPOSITION** — what something is made of or composed of.
13. **POSSESSION AS EXISTENCE** — languages that express possession through existential or locative grammar rather than a dedicated have-type predicate.
14. **ZERO COPULA / OMISSION CONDITIONS** — where no overt copular form appears and under which tense/person/register conditions.
15. **BOUND OR INFLECTIONAL COPULA** — where copular meaning is encoded as suffix/clitic/agreement rather than an independent word.
16. **AUXILIARY `BE`-TYPE USES** — progressive, passive, perfect, or other auxiliary uses must be identified and kept separate from true copular/existential rules when the language distinguishes them.

The first 13 are candidate reusable semantic functions. Items 14–16 primarily describe **how a language realizes the domain**, rather than additional universal meanings.

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

Production stores language-specific rule atoms once, connected to reusable semantic-function IDs. `curriculum/grammar-domains/being.concept-renderings.v1.json` provides machine-candidate Tier 1/2 translations of the reusable semantic labels and rendering templates. Custom translated prose is reserved for nuance that templates cannot express faithfully.

## Lesson title

Canonical English lesson title:

> **To be, or not to be**

Source: William Shakespeare, *Hamlet*, Act 3, Scene 1.

This is an exact quotation from the work, not a grammar joke that must be recreated in every language. Any localized quotation title requires a reviewed source edition. A short lesson note may accurately explain that Hamlet's line concerns continuing life versus death, not choosing between grammatical copulas.

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

This research directory is deliberately separate from production grammar/construction and lesson data.

Research completion may propose candidate production records. The current initial candidate cross-language mapping lives in `curriculum/grammar-domains/being.v1.json`. A later review/publishing step decides what becomes approved reusable lexicon/grammar truth. No research Task self-promotes its output.
