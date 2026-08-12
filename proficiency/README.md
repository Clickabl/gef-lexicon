# Gef language proficiency system

This directory owns reusable, language-neutral and language-specific knowledge about language proficiency levels. It does **not** own the product language list, learner state, book difficulty decisions, or official test certification.

## Canonical scale

Gef uses the Common European Framework of Reference for Languages (CEFR) as its canonical display and progression scale because it is language-neutral and designed to describe communicative proficiency across languages.

Core Gef UI levels:

- `Pre-A1` — First steps
- `A1` — Beginner
- `A2` — Everyday
- `B1` — Independent
- `B2` — Strong independent
- `C1` — Advanced
- `C2` — Highly proficient

Do not invent `A0`. The CEFR Companion Volume added Pre-A1 descriptors for ability below A1. The six Common Reference Levels remain A1-C2; Pre-A1 is the useful entry state below them.

The Council of Europe also recognizes `A2+`, `B1+`, and `B2+` as useful subdivisions. Gef may use these internally or later in advanced UI, but they are not part of the initial seven-step user-facing progression.

## The most important rule: a level is a profile, not a single number

A person can be B1 at reading and A2 at speaking. A heritage speaker can have strong listening and weaker literacy. A learner can read a graded book well above the level at which they can improvise a conversation.

Gef therefore treats proficiency evidence as skill-scoped:

- reception;
- production;
- interaction;
- mediation;
- with modality details such as reading, listening, spoken, written, signed, and multimodal language where relevant.

An overall level is a **Gef rollup**, not a replacement for the underlying skill profile.

### Book labels are content demand

If a book is labeled `A2`, that means the book's **reading demand** is around A2. It does not mean everyone who finishes it is globally A2.

Store the scope with the label. Prefer fields such as:

- `difficulty_framework: cefr`
- `difficulty_level: A2`
- `difficulty_scope: reading`

Do not silently reinterpret a reading label as speaking, writing, or overall proficiency.

## What CEFR does and does not give us

CEFR gives Gef a common language for proficiency. It intentionally does not prescribe one universal list of words or grammar rules for every language.

Language-specific Reference Level Descriptions (RLDs) exist because vocabulary, grammar, spelling, pronunciation, text conventions, and cultural-pragmatic knowledge differ by language. The Council of Europe currently points to RLD work for languages including Croatian, Czech, English, French, German, Italian, Portuguese, Spanish, and additional independently developed/partial work for other languages.

That means:

- `A2` can be universal as a proficiency concept;
- `A2 Spanish vocabulary` is language-specific curriculum data;
- `A2 Japanese kanji/orthography expectations` are language-specific curriculum data;
- `A2 Arabic morphology targets` are language-specific curriculum data;
- a fixed claim such as `A2 = 1,500 words` must **not** be copied across languages.

## How to build vocabulary and grammar targets for Gef's learn-from languages

The product language universe comes from `Clickabl/gef-expo/registry/language-support.json`. Never copy the current 104 language tags into this directory as a second registry. Iterate the canonical registry when generating coverage reports or research tasks.

For each language and level, candidate research may eventually include:

1. communicative functions;
2. suggested vocabulary concepts and resolved Gef lexeme IDs;
3. grammar/construction targets;
4. orthography and script targets;
5. pronunciation or phonology targets;
6. discourse and text types;
7. cultural/pragmatic competence where defensible;
8. corpus examples;
9. assessment evidence.

### Vocabulary selection

Do not start with a proprietary CEFR word list and translate it 104 times.

A defensible Gef candidate vocabulary model should combine:

- communicative utility for the target level;
- frequency in open/licensed corpora and Gef's own corpus;
- coverage across multiple works and genres rather than one book;
- usefulness in common semantic functions;
- morphological and inflectional burden in the target language;
- ambiguity/polysemy;
- script and reading burden;
- reviewer judgment.

Store the resulting items as **Gef candidate curriculum suggestions**. Do not label them `official CEFR vocabulary` unless a source actually grants that status and the intended use is rights-cleared.

At higher B/C levels, a fixed vocabulary checklist becomes less useful. Range, precision, register, idiomaticity, inference, discourse control, and domain knowledge matter increasingly. Gef should still recommend lexicon growth, but it should not pretend there is a magical final C2 word list.

## Proposed learner progression model

This is a Gef product model, not an official CEFR assessment procedure.

A learner's level estimate should be updated from repeated evidence across representative tasks. Promotion should not happen because of one book, one quiz, one vocabulary total, or one lucky session.

Recommended evidence model:

- keep estimates per skill/modality;
- record the level and scope of each task;
- require repeated success across different content/examples before raising a skill estimate;
- include breadth, not just repeated success on one narrow pattern;
- allow placement/diagnostic evidence to seed the profile;
- let later evidence move estimates both up and down without shame or streak logic;
- use vocabulary and grammar mastery as supporting features, not as sole gates;
- label app-generated results as **Gef estimates**, not official CEFR certifications.

A future rollup algorithm should be conservative. It should never claim global B2 because the learner is B2 at reading while other core skills are unknown.

## Other proficiency systems

`frameworks.json` records other major systems so Gef can explain them without pretending they are interchangeable.

### ACTFL

Current ACTFL Proficiency Guidelines describe listening, speaking, reading, and writing using Novice, Intermediate, Advanced, Superior, and Distinguished ranges, with Low/Mid/High sublevels in the first three ranges.

Do **not** copy ACTFL guideline prose or examples. ACTFL expressly limits the Proficiency Guidelines to non-profit educational use absent permission and says they cannot be used for for-profit purposes.

### ILR

The United States Interagency Language Roundtable uses base levels `0` through `5` plus `0+` through `4+`. It is skill-specific and heavily associated with government/professional contexts. Do not force a one-to-one CEFR conversion without an authoritative scoped source.

### CLB / NCLC

Canada uses 12 Canadian Language Benchmarks for English and the Niveaux de compétence linguistique canadiens for French. These are skill-specific. Canadian immigration tables convert particular test scores to CLB/NCLC; those tables are not a license to invent a universal CEFR crosswalk.

### JLPT

The Japanese-Language Proficiency Test has N5 through N1. Starting with the December 2025 JLPT, passing score reports can include a CEFR reference indication from A1 through C1 depending on test level and total score.

This is an excellent example of why scope matters: the official JLPT documentation says the CEFR reference covers the linguistic knowledge and reception that JLPT tests. It does **not** cover speaking/writing production or interaction.

The current official score mapping is stored in `frameworks.json` with its scope attached.

### HSK

HSK is in transition. HSK 3.0 is designed around nine levels, but the official Chinese Tests Service notice described the January 31, 2026 HSK 3.0 Levels 1-6 administration as a pilot and said regular 2026 dates would continue under HSK 2.0 until a formal 3.0 launch date is announced.

Therefore HSK mappings must be date/version aware. Do not ship a timeless old HSK-to-CEFR table.

## Copyright and rights guardrails

Gef can explain frameworks without copying their protected expression.

### Council of Europe / CEFR

Use CEFR names, level codes, framework facts, concepts, and source citations. Write Gef's user-facing summaries independently.

Do not import the CEFR Global Scale, self-assessment grid, descriptor database, or translations into the commercial product. The Council of Europe's rights guidance requires permission for reproduction/translation of publication excerpts and commercial reuse is not something Gef should assume.

### ACTFL

Do not reproduce or translate ACTFL guideline text, examples, Can-Do Statements, or proprietary assessment content into Gef without written authorization appropriate to commercial use.

### Preply

The product-owner supplied Preply's English-level article as a strong UX/editorial reference. Treat it as **inspiration only**.

Do not copy:

- its prose;
- character quotations or the character-per-level device;
- its level nicknames as a package;
- its vocabulary counts;
- its study-hour estimates;
- its level-by-level wording or tips.

The Gef lesson should arrive at the subject independently from primary framework sources.

### Quotes

Do not assume that a quote becomes fair use merely because it appears in a lesson. Fair use is context-dependent, and translating a copyrighted quote can create additional rights questions. For this proficiency lesson, original examples are sufficient; there is no pedagogical need to take the risk.

## Translation strategy

The English rendering is source copy, not the canonical truth about levels. Structured level data in `frameworks.json` is the reusable truth.

When this lesson is localized across Gef's supported interface/best languages:

- translate Gef-authored prose, not official CEFR/ACTFL descriptor text;
- keep level codes (`A1`, `B2`, etc.) stable;
- localize Gef labels such as `Beginner` / `Everyday` naturally rather than assuming publisher-specific English labels have one canonical translation;
- preserve the distinction between `level`, `skill`, `content difficulty`, `test score`, and `Gef estimate`;
- preserve source/rights notes outside user-facing prose;
- use the canonical language registry and standard translation grouping rather than freezing a 104-file assumption into logic.

## Initial research order

1. Finish universal CEFR/other-framework facts and lesson copy.
2. Build robust Tier 1 language specifications (`en`, `es`, `fr`, `pt`, `it`, `el`) using rights-cleared/open evidence and the existing lexicon.
3. Exploit reputable RLD/reference work where available, but use it for validation and analysis rather than copying protected lists.
4. Expand structured language-level research to Tier 2.
5. Scale concept/vocabulary/readability research across all learn-from languages, with candidate/reviewer state and no promise of complete grammar paths for Tier 3.

The goal is universal **structure**, not universalized guesses.
