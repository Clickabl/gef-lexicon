# Universal Being semantic model — initial 21-language synthesis

**Status:** candidate research synthesis  
**Quality target:** Q3  
**Production candidate:** `curriculum/grammar-domains/being.v1.json`  
**Reusable semantic IDs:** `curriculum/semantic-functions.json`

This is not a list of universal grammar rules. It is the current semantic comparison model after an initial pass across all 21 Tier 1 and Tier 2 languages. The language-specific Tasks remain open for deeper evidence, examples, exceptions, and review.

## Current candidate semantic functions

| Production candidate | What it asks |
|---|---|
| `SEM.IDENTITY_EQUIVALENCE` | Is X identified/equated with Y? |
| `SEM.CLASSIFICATION_ROLE` | Is X classified as a type, profession, category, or role? |
| `SEM.CHARACTERISTIC_PROPERTY` | What descriptive characteristic/property is attributed to X? |
| `SEM.CURRENT_STATE` | What condition/state holds at the reference time? |
| `SEM.RESULTANT_STATE` | What state holds as the result of a prior change/event? |
| `SEM.ENTITY_LOCATION` | Where is a person, object, place, or other entity? |
| `SEM.EVENT_LOCATION` | Where does an event or occurrence take place? |
| `SEM.EXISTENCE_PRESENCE` | Does something exist or is it present? |
| `SEM.ABSENCE_NONEXISTENCE` | Is something absent or nonexistent? |
| `SEM.TIME_DATE_PREDICATION` | How is time/date predicated when connected to the Being system? |
| `SEM.ORIGIN_AFFILIATION` | How is origin, provenance, nationality, membership, or affiliation predicated? |
| `SEM.MATERIAL_COMPOSITION` | How is material/composition predicated? |
| `SEM.POSSESSION_AS_EXISTENCE` | Does the language express possession through an existential/locative pattern useful to this comparison? |

All remain **candidate**. They exist now so language mappings can use stable comparison targets, but research/native review may still split, merge, rename, or narrow them.

## What the initial cross-language pass changed

### 1. Entity location and event location should remain separate

Spanish provides a strong pedagogical reason: ordinary entity location commonly uses `estar`, while event location commonly patterns with `ser`. Catalan also shows that even closely related languages need independent location rules. A single universal `LOCATION` bucket would hide a real cross-language contrast.

### 2. Existence is not just another location label

English `there is/are`, Spanish `hay`, French `il y a`, Italian `esserci`, Catalan `haver-hi`, Japanese `いる/ある`, Korean `있다/없다`, Turkish `var/yok`, Indonesian `ada`, and Slavic existential patterns show that introducing existence/presence often deserves a separate semantic target from locating an already discourse-known entity.

### 3. Absence/nonexistence is worth tracking separately

Several languages have especially salient negative existential forms or patterns (`없다`, `yok`, `нет`, `немає`, `نیست`, `tidak ada`, `no hi ha`, etc.). The learner-facing comparison may therefore benefit from a distinct `SEM.ABSENCE_NONEXISTENCE` even though some languages simply negate an ordinary existential construction.

### 4. Animacy is a rule condition, not a universal meaning

Japanese strongly distinguishes animate `いる` from inanimate `ある`, and other languages may use noun-class or animacy distinctions. But the underlying meanings are still location/existence. Therefore animacy belongs primarily in language-specific applicability/condition metadata rather than as a separate universal semantic function.

### 5. Zero copula and bound copula are realization strategies

Arabic present nominal predication, Russian/Ukrainian present copular omission, Turkish copular morphology, Persian enclitic copulas, and other systems demonstrate that “what word means be?” is the wrong universal question.

Represent these as language-specific rule realization properties such as:

- `independent_copula`
- `zero_copula`
- `bound_copula`
- `existential_construction`
- `locative_construction`
- `adjectival_or_stative_predicate`
- `case_or_adpositional_construction`

They are not additional semantic meanings.

### 6. Permanent versus temporary is not a universal semantic axis

Spanish `ser/estar` is not adequately modeled as permanent versus temporary, and related Romance systems do not share identical boundaries. The reusable semantic layer therefore uses characteristic/property, current state, and resultant state without assigning a universal permanence value.

### 7. Possession can be adjacent to Being without becoming universal copular grammar

Russian `у ... есть`, Turkish `var/yok`, Korean `있다/없다`, Mandarin `有`, Japanese existential patterns, Persian constructions, and other languages show that possession may be built from existence/location. This is useful comparative material, but it should only enter a target-language lesson when the relationship is real and pedagogically useful.

### 8. Auxiliary uses of be-type forms stay separate

English `be` in progressive/passive constructions is not the same semantic job as copular identity/state/location. Similar caution applies in every language. The grammar graph can connect historically/formally related constructions later without collapsing them into the Being semantic domain.

## Current language-strategy snapshot

The candidate production map currently captures several broad strategy types:

- **Romance split-copula systems:** Spanish, Portuguese, Catalan, Galician, with different boundaries; Italian is not modeled as simply another Spanish-style split.
- **Broad copula + separate existential:** English, French, German, Italian, Modern Greek, Polish and others.
- **Identity/copula vs existence/location split:** Mandarin, Japanese, Korean and several other systems.
- **Zero-copula present contexts:** Arabic, Russian, Ukrainian and Indonesian in relevant constructions.
- **Bound/inflectional copular systems:** Turkish and Persian show why a standalone-verb assumption fails.
- **Existential/negative-existential pairs:** multiple languages make presence/absence a particularly visible learner contrast.

These are comparison categories only, not genetic or universal grammar classes.

## Rendering conclusion

The semantic labels can be localized once per support language. They do not require every language-specific rule to be rewritten 21 times.

Current machine-candidate Tier 1/2 renderings live in:

`curriculum/grammar-domains/being.concept-renderings.v1.json`

That file contains all 13 semantic labels in all 21 Tier 1/2 languages plus reusable explanation templates. Language-specific nuance remains attached to the relevant rule and receives bespoke rendering only when templates cannot express it faithfully.

## Remaining research questions

1. Which Tier 1 languages need additional major semantic subdivisions for a complete path, especially adjective-class and tense/aspect interactions?
2. Should age/measure/price become additional cross-language semantic functions or remain language-specific adjacent domains?
3. Which possessive-existential systems are pedagogically close enough to include in the core lesson versus a later ownership lesson?
4. What source-backed corpus examples should become golden fixtures for each Tier 1/2 language?
5. Which Tier 2 language mappings need narrower wording to avoid implying a complete grammar account?
6. Which candidate concept labels need native terminology changes before learner-facing approval?

## Review boundary

The initial candidate graph is now populated, but **none of this is automatically approved Lexi truth**. The 21 language research Tasks remain open. Their purpose is to deepen and challenge this seed model, attach stronger sources/examples, and identify exceptions before review/promotion.
