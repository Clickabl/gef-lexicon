# Gef language proficiency architecture

Status: candidate architecture for Draft PR #39. This document is the durable
repo explanation for the language-level system. Machine-readable truth lives in
`proficiency/gef-scale.json`, `proficiency/frameworks.json`, and the language-
specific proficiency records governed by the schemas in `schemas/`.

## Product decision in one screen

Gef's manual proficiency control is a zero-centered scale with seven outward
stops:

```text
0  No knowledge yet
1  A1  Beginner
2  A2  Everyday
3  B1  Independent
4  B2  Strong independent
5  C1  Advanced
6  C2  Highly proficient
7  Fully fluent / Native
```

`Fully fluent / Native` is a **Gef-only presentation tier**. It is not CEFR C3,
not an official external rating, and not a claim of perfection. It exists
because a person dragging a self-description control needs a natural top choice
for mature, effortless command comparable to a fully fluent adult native
speaker. A native child is not automatically at this top tier, and a non-native
adult whose ability genuinely fits may select it.

CEFR's `Pre-A1` remains an important first-steps band in lessons, diagnostics,
and future evidence logic. Gef models it internally as the conceptual interval
between zero and A1 (`0.5`) rather than adding an eighth outward ring to the
manual picker.

## Six-axis profile

A language profile is not one scalar. Gef can retain six independent axes:

1. **Reading** — understanding written language and connected texts.
2. **Listening** — understanding spoken language in real time.
3. **Speaking** — producing understandable spoken language with range, control,
   fluency, and situational flexibility.
4. **Writing** — producing written language with suitable structure, range,
   control, style, and audience awareness.
5. **Interaction** — participating in exchanges: responding, taking turns,
   repairing misunderstandings, and keeping communication moving.
6. **Mediation** — helping meaning cross a gap between people, texts, languages,
   or viewpoints. This includes explaining, summarizing, translating,
   interpreting, reformulating, or otherwise making information accessible to
   someone who cannot use the original directly.

A radar/spider chart is an appropriate visualization because real profiles are
jagged. Someone can be C1 in reading and A2 in speaking without either value
being wrong.

### Current Gef evidence boundary

Gef is currently a reading-first product. It may let a reader self-report all
six axes, but **only Reading may currently receive app-observed proficiency
evidence**. The app must not infer speaking, listening, writing, interaction, or
mediation from books, dictionary usage, or reading lessons.

The other axes are intentional future seams for listening experiences, social or
conversation features, writing features, interpretation/translation activities,
or a separate product surface. Their presence in the data model is not a claim
that today's app assesses them.

## Quick picker and optional fine-tuning

The existing simple "how much of this language do you know?" interaction remains
the fast path. A reader can choose one stop from zero through `Fully fluent /
Native` and continue.

A secondary **Fine-tune** action may open the full six-axis radar editor. When a
reader enters fine-tuning for the first time, the quick value may seed all six
axes. Editing one axis never silently changes another. Skipping fine-tuning is
valid.

For reading behavior, prefer an explicit Reading-axis self-report when present;
otherwise use the quick self-report as the reader's initial reading preference.
Do not overwrite either self-report with future app estimates. Estimated and
self-reported proficiency are different evidence records.

## Gefstimate

The canonical semantic concept is **Gef estimate**. English UI may render the
first-party portmanteau **Gefstimate**.

Do not transliterate `Gefstimate` into every language. The wordplay only works
where the localized word for estimate keeps a recognizable `estim-` / `stima-`
shape after Gef is fused into it. `proficiency/gefstimate-wordplay.json` contains
a first-pass sweep of the current learn-from registry:

- strong candidates such as English `Gefstimate`, Spanish `Gefstimación`, French
  `Gefstimation`, Portuguese `Gefstimativa`, Italian `Gefstima`, Indonesian
  `Gefstimasi`, Romansh `Gefstimaziun`, and Haitian Creole `Gefstimasyon`;
- register-sensitive candidates where a matching loanword exists but may sound
  statistical or technical in ordinary UI;
- literal-default languages where Gef should simply localize the meaning
  "Gef estimate" naturally.

Every non-English portmanteau remains candidate copy until a fluent/native
reviewer confirms that it sounds delightful rather than manufactured.

## CEFR relationship

Gef uses the Common European Framework of Reference for Languages as its shared
international coordinate system because A1 through C2 are language-neutral
reference levels. The modern CEFR Companion Volume also includes Pre-A1 and
expands the framework's treatment of mediation, online interaction,
plurilingual/pluricultural competence, and sign language.

Gef does **not** copy Council of Europe descriptor tables. User-facing level
explanations are first-party Gef prose. The external framework name, level codes,
version/date facts, and properly sourced relationships may be referenced as
facts, but protected publication text and logos are not imported or mass-
translated without appropriate rights clearance.

The modern CEFR phonological-control work also deliberately moved away from a
"native speaker" ideal toward intelligibility and effective communication. This
is another reason Gef's `Fully fluent / Native` stop must remain visibly a Gef
self-description extension rather than pretending CEFR itself has a level above
C2.

## Framework glossary without acronym soup

These systems matter mainly for interoperability and future credential import.
Normal Gef readers do not need to learn the acronyms to use the app.

### CEFR — Common European Framework of Reference for Languages

Council of Europe framework using A1, A2, B1, B2, C1, and C2, plus Pre-A1 in the
Companion Volume. Gef uses CEFR as the common reference coordinate system while
writing its own explanations.

### JLPT — Japanese-Language Proficiency Test

A standardized Japanese test with levels N5 through N1. Beginning with the
December 2025 test, passing score reports can include an official CEFR reference
indication based on test level and total score. Crucially, JLPT tests language
knowledge plus **reading and listening**, not speaking, writing, or interaction.
A JLPT-derived mapping therefore belongs only on the skills the test actually
measured.

### HSK — Chinese Proficiency Test / Hanyu Shuiping Kaoshi

Standardized Mandarin Chinese proficiency testing. HSK is currently in a major
transition. Official Chinese testing notices describe an HSK 3.0 system with
three stages and nine levels, but the January 2026 Levels 1–6 event was a pilot
and the official notice stated that regular 2026 exam dates continued under HSK
2.0 until the formal HSK 3.0 launch is announced. Gef must version HSK data by
system and date instead of treating one old conversion chart as eternal truth.

### ILR — Interagency Language Roundtable

A United States government-oriented skill-level system, commonly expressed as
0 through 5 with plus levels between them. It has separate skill descriptions
and is useful for government/professional credentials. It is not a one-to-one
mathematical synonym for CEFR.

### ACTFL

A widely used United States proficiency framework with broad levels Novice,
Intermediate, Advanced, Superior, and Distinguished, with Low/Mid/High
sublevels in several bands. ACTFL's guideline prose has explicit restrictions
on for-profit use, so Gef may identify the framework and factual level names for
interoperability but must not reproduce the protected guideline descriptions or
represent a Gef estimate as an official ACTFL rating.

### CLB / NCLC — Canadian Language Benchmarks

Canada's adult English benchmark system (CLB) and parallel French system
(NCLC). They use 12 benchmarks and track listening, speaking, reading, and
writing separately. They are useful external credentials, not a reason to force
an unsourced one-to-one CEFR conversion.

## Crosswalk rule

Never flatten external systems into a magic conversion table merely because two
scales both have ordered labels. A crosswalk record must retain:

- source framework and version;
- original level and, when relevant, score range;
- date;
- skills actually assessed;
- whether the mapping is official, empirical, approximate, or a teaching
  convention;
- source and scope;
- confidence where the mapping is not official.

The JLPT's current official CEFR reference is a good model: useful, precise, and
explicitly limited to what the exam measures.

## Rights and naming policy

Gef's practical rule is conservative:

- framework names, factual level codes, dates, and sourced relationships may be
  referenced;
- do not copy or mass-translate proprietary descriptor prose, test questions,
  examples, logos, or commercial course inventories;
- do not imply endorsement by the Council of Europe, ACTFL, the Japan
  Foundation, Chinese testing authorities, or another framework owner;
- call app-generated results Gef estimates / localized Gefstimates, not
  "official CEFR certification";
- external credentials stay external credentials even when Gef uses them as
  evidence.

This is product rights policy and risk reduction, not a promise that a particular
use is immune from legal challenge. Material rights questions still receive
source-specific review.

## BabelNet: architectural cousin, not a data dependency

BabelNet is a huge multilingual semantic network originally conceived by
Roberto Navigli at the Sapienza NLP Group and now engineered and maintained by
Babelscape. Its architecture is philosophically close to Gef's lexicon:
meaning-centered nodes connect lexicalizations across languages, supporting
word-sense disambiguation and multilingual semantic relationships.

That makes BabelNet valuable **design literature** for Gef, but not an upstream
ID system or dataset. Gef keeps its own stable concept, lexeme, sense, entity,
and construction identities. BabelNet IDs may someday be stored as optional
external identifiers when doing so is lawful and useful, just as another
knowledge-base identifier might be, but Gef identities never depend on them.

This firewall is important because BabelNet's official data/API license is a
non-commercial license limited to research institutions; commercial use is
excluded absent a separate agreement. Gef must not derive its commercial
proprietary lexical graph from BabelNet data under the ordinary research
license.

A future research relationship with Sapienza/Babelscape is a separate,
potentially interesting path. It does not change the current data-provenance or
licensing rules.

## Semantic territories, not universal word totals

Gef's language curriculum should map what a learner can understand and do, then
connect those targets to language-specific lexical and grammatical evidence.
The reusable shape remains:

```text
Gef concept
  -> language-specific lexeme
      -> sense / usage
          -> morphology, construction, register, pragmatics, corpus evidence
```

A concept can be basic in one language and relatively uncommon or structurally
awkward in another. One spelling can express several senses. One concept can need
several lexemes or a phrase. Scripts, compounds, morphology, and segmentation
make universal word totals especially misleading.

Therefore an `A2 = N words` rule is forbidden as a universal product truth.
Language-specific vocabulary inventories can still be useful evidence when
licensed, sourced, reviewed, and stored as candidate curriculum mappings rather
than definitions of CEFR itself.

## Future placement and continuous evidence

No automated placement engine is being implemented as part of this architecture.
The seam is intentionally documented now so the data model does not paint Gef
into a corner.

Future evidence may include:

- optional placement tests;
- repeated lesson performance;
- successful reading across varied text difficulty;
- comprehension results;
- dictionary/reveal assistance patterns interpreted cautiously;
- correction and mistake patterns where the product can genuinely observe them;
- breadth of reviewed concepts and constructions encountered successfully;
- external credentials with their original scope.

Future adaptive testing may use calibrated item-response or Rasch-family models,
but only after Gef has real calibrated items and validation data. "AI adaptive"
is not itself psychometric validity.

A historical certificate never disappears because time passed. Gef may lower its
confidence that an old credential reflects **current** ability, but credential
history and current-proficiency confidence are separate records.

## Product ownership across the three repositories

- `gef-lexicon` owns this scale, framework facts, first-party level definitions,
  lesson data, proficiency language-spec schemas, and future curriculum evidence.
- `gef-expo` owns the picker, radar editor, accessibility behavior, local learner
  state, presentation/localization, and reading evidence orchestration.
- `gef-content` owns book/story difficulty evidence and corpus occurrences. A
  book's level describes **reading demand** unless another scope is explicitly
  stated.

The Expo UI handoff is documented in:

`Clickabl/gef-expo/docs/product/LANGUAGE_PROFICIENCY_UI.md`

The reusable lesson is:

`LES.mul.meta.international_language_levels`

Any level badge or picker may offer **Learn more about language levels** and open
that lesson, optionally deep-linking to the relevant level section.
