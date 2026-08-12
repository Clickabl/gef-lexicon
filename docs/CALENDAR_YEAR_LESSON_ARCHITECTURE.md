# Calendar-year lesson architecture

## Scope

This work adds three distinct A1 lesson families:

- `LES.mul.time.days_of_week`
- `LES.mul.time.months_of_year`
- `LES.mul.time.seasons`

They share one reusable data primitive, `KNOWSET.*` ordered concept sets, but they are not one combined lesson. English → Spanish is the concrete worked rendering. Source and target assets stay independent so the same lesson graph can support Greek → Portuguese, Chinese → English, Nepali → Portuguese, and other valid profile combinations without a pair matrix.

## Coverage contract

The current canonical registry is `Clickabl/gef-expo/registry/language-support.json` schema v4:

- Tier 1: 6 full learning languages.
- Tier 2: 15 selective learning languages.
- Tier 3: 83 read/games languages.
- `programs.learnFromLanguages`: all 104 languages.

For these three lessons, Tier 1 + Tier 2 are the full learning/target set: 21 languages. All 104 canonical learn-from languages may provide source/explanation copy. Tier 3 source coverage must never be interpreted as full target-teaching support.

The 104 source blurbs are intentionally short and begin at `machine_translated` / `candidate`. Structure and coverage can be validated automatically; linguistic quality still requires review.

## Reusable ordered-concept-set primitive

`schemas/ordered-concept-set.schema.json` exists for vocabulary systems that are fundamentally sets or cycles rather than grammar-rule bundles. It is deliberately generic enough for future lessons such as numbers, colors, compass directions, school subjects, or other ordered/cyclic vocabularies.

A knowledge set owns:

- canonical concept keys where a cross-language comparison layer is meaningful;
- one or more systems per language;
- the language's primary system;
- aligned terms plus optional readings/transliterations;
- variants;
- context-specific forms;
- cultural/context notes;
- explicit region/calendar/climate/hemisphere sensitivity.

A system may define its own `concept_keys` when a local system does not have the same cardinality as the broad comparison layer. That is how a four-season comparison can coexist with a two-season wet/dry model or a six-season traditional model without forcing fake one-to-one equivalence.

## New reusable lesson elements

### `ordered_term_set`

A rendering/family block that resolves terms from a `KNOWSET.*` record instead of hardcoding a word list into prose.

Useful selectors:

- `primary`: use the language record's primary everyday system.
- `session_context`: choose a contextually appropriate system while preserving alternatives.
- `all_contextual`: expose all relevant systems when a comparison surface needs them.

Optional display flags include readings, transliterations/variants, and date-format forms.

### `cultural_context`

A family-level semantic block for context facts that are not lexical identity. Examples: territory-dependent week layout, alternate calendars, regional month systems, hemisphere, or climate. Renderers may surface these with the existing `cultural_note` UI block.

### Practice primitives

- `ordered_sequence`: reconstruct an ordered list/cycle.
- `concept_term_match`: match concepts to terms in the selected language/system.
- `cycle_neighbor`: identify the item immediately before/after another item when a cyclic interpretation is valid.

These are reusable semantic jobs. They should not become three calendar-only UI widgets.

## Critical context separation

### Language is not calendar layout

Weekday vocabulary belongs to a language. The first column shown in a calendar belongs to locale/territory conventions. Unicode CLDR `weekData` models first-day and weekend information by territory. Therefore the Days lesson teaches a stable Monday → Sunday pedagogical cycle but does not assert that every locale displays Monday first.

### A month name can have grammatical context

Unicode CLDR distinguishes stand-alone and formatted month/day names because some languages use different grammatical forms in dates. The Months knowledge set therefore permits `format_forms` instead of pretending one dictionary form works everywhere. Greek, Russian, Ukrainian, and Polish records already demonstrate the pattern.

### Language is not hemisphere or climate

`summer` does not correspond to fixed months for every speaker of a language. Hemisphere and climate must come from geographic/context data. Likewise, a broad four-season vocabulary remains useful even where rainy/dry or other local seasonal systems describe lived climate better.

## Lesson 1: Days of the Week

The cross-language invariant is the seven-position week cycle, not the etymology of the labels.

English → Spanish worked layer:

- Monday → `lunes`
- Tuesday → `martes`
- Wednesday → `miércoles`
- Thursday → `jueves`
- Friday → `viernes`
- Saturday → `sábado`
- Sunday → `domingo`

Comparison notes intentionally highlight systems rather than trivia:

- Portuguese Monday–Friday names use the productive `-feira` pattern.
- Mandarin commonly uses `星期` plus a number for Monday–Saturday, with established Sunday forms.
- Japanese and Korean weekday systems preserve the East Asian Sun/Moon/five-element pattern.
- Persian uses a productive `شنبه` pattern for most weekdays.

## Lesson 2: Months of the Year

The broad comparison layer uses the Gregorian twelve-month cycle, but the data model does not pretend that this is the only active calendar vocabulary.

Examples represented in the knowledge set:

- Mandarin, Japanese, and Korean: modern Gregorian months are highly regular number + month systems.
- Arabic: a broad international Gregorian set, a Levantine regional Gregorian set, and Hijri month vocabulary can coexist.
- Persian: Iran's Solar Hijri months are represented as a primary contextual system alongside Gregorian month vocabulary.
- Hindi: Gregorian month vocabulary can coexist with the Indian Saka calendar month system.
- Greek, Russian, Ukrainian, and Polish: stand-alone month forms remain separate from forms used inside full dates.

The runtime should select the system that fits the session context, never silently delete alternates.

## Lesson 3: Seasons

The broad comparison layer is spring / summer / autumn / winter because it is internationally useful vocabulary, not because four temperate seasons are universal.

Represented alternatives/context:

- Indonesian `musim hujan` / `musim kemarau`: wet/dry climatic seasons.
- Traditional north/central Indian six-ritu cycle: Vasanta, Grishma, Varsha, Sharada, Hemanta, Shishira.
- Chinese 24 solar terms as a finer traditional solar-season layer.
- Japanese `nijushi-sekki` as an inherited 24-term seasonal layer still visible in cultural language.
- Persian Nowruz/Solar Hijri alignment with the beginning of spring.
- Hemisphere is runtime geographic context, not a property of Spanish, English, or any other language tag.

## Research anchors and source-ref keys

The knowledge-set JSON uses compact symbolic source refs. This table records what they mean.

| Source ref | Research anchor | What it supports |
| --- | --- | --- |
| `unicode-cldr-date-time-names` | Unicode CLDR Date/Time Names, Symbols, and Patterns | Language-specific weekday/month labels; stand-alone versus formatted grammatical forms. |
| `unicode-cldr-week-data` | Unicode LDML/CLDR week data | Territory-dependent first-day/weekend conventions. |
| `hko-chinese-calendar` | Hong Kong Observatory, Chinese calendar explanations | Normal lunar years with 12 months and leap years with 13; calendar context. |
| `hko-24-solar-terms` | Hong Kong Observatory, 24 Solar Terms | 24-term solar cycle and seasonal/agricultural context. |
| `china-24-solar-terms` | State Council Information Office / China government cultural explainer | Four seasons subdivided by the 24 solar terms. |
| `japan-24-sekki` | National Diet Library, Japan, and Government of Japan seasonal-calendar explainers | Japanese `二十四節気`, four seasons subdivided into 24 named terms, and continuing cultural use. |
| `saudi-hijri-calendar` | Saudi Ministry of Finance calendar/payroll pages | Current official use of Hijri and Gregorian month/date vocabulary side by side. |
| `iranica-solar-hijri` | Encyclopaedia Iranica, Calendars ii | Solar Hijri month structure and Nowruz year boundary. |
| `india-saka-calendar` | Government of India holiday/calendar publications | Official Saka dates and month names alongside Gregorian dates. |
| `ncert-six-seasons` | NCERT-derived SATHEE climate chapter | Traditional six-season model for north/central India and regional caution. |
| `bmkg-indonesia-seasons` | Indonesia BMKG seasonal forecasts | Operational use of rainy (`musim hujan`) and dry (`musim kemarau`) seasons. |

## Editorial guardrails

- Do not infer culture from a lexical distinction.
- Do not infer a territory convention from a bare language tag.
- Do not infer hemisphere from a language.
- Do not equate an alternate calendar with religion, nationality, or personal practice for every speaker.
- Do not force local systems into the cardinality of the English comparison set.
- Do not promote generated lower-resource blurbs because a validator passes. The validator proves coverage and structure, not translation truth.
- Do not create 104 × 21 pair-specific lesson copies. Join source blurbs and target structured facts at runtime.
