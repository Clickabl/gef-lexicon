# Universal Being semantic model — research draft

**Status:** candidate research scaffold  
**Quality target:** Q3  
**Purpose:** define the reusable semantic territory that language-specific Being systems map onto.

This file is not a list of universal grammar rules. It is a candidate inventory of **questions every language research Task should answer**.

## Candidate semantic slots

| Research slot | Question |
|---|---|
| `BEING.IDENTITY` | Is X the same entity as Y? |
| `BEING.CLASSIFICATION` | Is X a member/type/category Y? |
| `BEING.PROPERTY` | What relatively characteristic property is attributed to X? |
| `BEING.STATE` | What current condition/state is X in? |
| `BEING.RESULTANT_STATE` | What state holds as the result of a change/event? |
| `BEING.LOCATION` | Where is X located? |
| `BEING.EXISTENCE` | Does X exist / is there an X? |
| `BEING.PRESENCE` | Is X present/available here or in the discourse situation? |
| `BEING.ANIMATE_EXISTENCE_LOCATION` | Does the language grammatically distinguish animate/inanimate or other noun classes for existence/location? |
| `BEING.TIME_DATE` | Does the language use its copular system for time/date predication? |
| `BEING.AGE_MEASURE` | Does the language use its copular system for age, size, measure, price or similar predication? |
| `BEING.ORIGIN_MATERIAL` | Does the language use its copular system for origin/material/source predication? |
| `BEING.POSSESSION_RELATED` | Does a construction historically/grammatically tied to existence/location express possession in a way useful to this lesson? |

## Cross-cutting realization dimensions

Every language Task should classify whether each slot is expressed through:

- independent copular verb;
- multiple competing copulas;
- existential verb/construction;
- locative verb/construction;
- adjective/stative verb predication;
- zero copula;
- bound copular suffix/clitic;
- case or adpositional construction;
- particle;
- noun-class/animacy-conditioned split;
- other language-specific machinery.

## Separate from copular semantics

English uses `be` as an auxiliary in progressive and passive constructions. Other languages may use related or unrelated forms. These **auxiliary uses must be researched but kept structurally separate** from the Being semantic slots above unless a language-specific analysis shows a genuine grammatical connection useful to learners.

## Research questions before promotion

1. Are `PROPERTY`, `STATE`, and `RESULTANT_STATE` sufficiently universal/reusable, or do some languages require a different cross-language decomposition?
2. Should `EXISTENCE` and `PRESENCE` remain separate?
3. Is animacy a semantic slot or better represented solely as a condition on a language-specific rule?
4. Which domains such as age, possession, origin/material, time/date belong in the core Being lesson versus later language-specific lessons?
5. Which labels can be localized through shared UI templates without importing English metaphors?

## Promotion rule

After the 21 language research files are completed, reconcile this scaffold against the evidence. Only then should stable `SEM.*` production IDs and `GRAMSET.*` records be created or expanded.
