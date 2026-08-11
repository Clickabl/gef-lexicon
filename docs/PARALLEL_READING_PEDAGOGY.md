# Parallel reading and language-learning product rules

> Migrated from the retired Gef Notion workspace and August 2026 research chats. Current schemas and reviewed lexicon data remain authoritative. This document records product/pedagogy principles for future implementation.

## Core principle

Gef is **story-first**. Language support should reduce processing burden and help the learner notice useful patterns without turning every page into a worksheet.

Parallel text is a comparison tool, not six competing subtitles.

## Reading and vocabulary

Meaning-focused reading builds vocabulary cumulatively. One encounter rarely proves that a word is `learned`.

Track lexical encounters by sense and context, including actions such as:

- read;
- lookup;
- reveal;
- audio;
- compare;
- question/retrieval attempt.

Prefer internal familiarity evidence over a rigid learner-facing learned/not-learned flag.

Repeated encounters across books should inform support fading, recommendations, and optional review.

## Glosses and dictionary interaction

For beginners, the default word interaction should begin with one concise contextual gloss in the reader's best/interface language.

Then progressively disclose:

1. contextual sense/definition;
2. lemma and part of speech;
3. pronunciation;
4. morphology and conjugation/declension;
5. usage/register notes;
6. examples;
7. cross-language equivalents/comparison;
8. approved learner-friendly Gef explanation where appropriate.

Do not automatically combine sound, images, six translations, animation, and a full grammar chart into the first lookup state.

Definitions are not merely translation pairs. Store and resolve passage-specific sense.

## Parallel-text modes

A useful long-term interaction model is one persistent reader surface with optional layers:

### Story mode

- one to three languages visible by default where practical;
- illustration/narrative remain dominant;
- no constant cross-language highlighting;
- definitions and audio remain available.

### Compare mode

- expand selected languages;
- align corresponding meaning spans;
- optionally surface cognates/shared roots;
- show meaningful differences such as omitted subjects, split/merged phrases, agreement, case marking, or word-order changes;
- never imply that the English form is the master word order.

### Study mode

Layer over the same story position:

- definition;
- pronunciation;
- form/lemma;
- morphology;
- sentence role;
- cross-language equivalents;
- optional saved vocabulary/practice.

Switching modes must not lose the story anchor.

## Strongest-language support

The reader's strongest/interface language is a scaffold, not cheating.

Support may fade, be partially concealed, or be manually reduced over time, but the learner can restore it without penalty.

The app should support plurilingual behavior: a learner may use one language to understand another, compare multiple related languages, or have different strengths in reading/listening/vocabulary.

Do not collapse the user into one global proficiency score.

## Audio

Use deliberate sentence/aligned-segment playback.

- compact speaker control per visible language;
- optional synchronized highlighting;
- adjustable rate;
- replay should never consume a treat;
- do not auto-play every visible language in sequence unless the user explicitly chooses that behavior.

## Cognates and cross-language relations

The Romance cluster (Spanish, French, Portuguese, Italian) provides substantial cross-language transfer opportunities; English has many Latinate/French-derived cognates; Modern Greek offers a different script and rich morphology plus many internationally shared Greek roots.

Cognate support must be sense-specific. Similar spelling alone is insufficient.

Suggested relation categories:

- cognate;
- near-cognate;
- shared root;
- loanword;
- false friend;
- none/unknown.

Never highlight a pair as cognates solely from string similarity. False-friend warnings should appear only when the competing meaning is genuinely plausible in context.

Relations must support more than pairwise use because multilingual readers can benefit from three-way or broader families.

## Meaning alignment

Canonical alignment is semantic, not positional.

One neutral anchor/event may map to one or more target-language segments. Translation may naturally change:

- subject-pronoun expression;
- word order;
- article use;
- grammatical gender;
- clitic placement;
- case marking;
- clause boundaries;
- idiomatic phrasing.

Do not force six-language sentence columns into a schema that assumes one-to-one surface sentences.

## Comprehension support

Questions should be optional and light. Useful categories include:

- gist;
- prediction;
- event order;
- pronoun/reference resolution;
- contextual word meaning;
- cross-language noticing.

Do not place a mandatory quiz after every page or turn leisure reading into schoolwork sludge.

## Accessibility and cognitive load

- preserve real text for screen readers;
- allow screen-reader language order/skip control;
- do not identify languages/cognates by color alone;
- avoid simultaneous speech + aggressive motion + highlighting + expanding sheets;
- reduced-motion mode preserves all learning/navigation functionality;
- adjustable type, spacing, line length, and contrast;
- a different alphabet such as Greek should use the same ordinary lookup/pronunciation path rather than a special gate.

## Useful data concepts

Future schema work may need to represent:

- learner language profiles and skill estimates;
- lexical encounters;
- cross-language relations;
- semantic/alignment spans;
- sentence/word audio;
- comprehension prompts and attempts;
- support visibility/reveal events;
- multidimensional story difficulty.

Story difficulty should not be only one number. Useful dimensions include vocabulary coverage, sentence complexity, morphology, idiom density, alignment complexity, cultural/background knowledge, audio difficulty, and illustration support.

## Validation

Before treating pedagogy as finished, test with:

- children and adults;
- beginners and stronger readers;
- heritage speakers;
- one-language readers;
- Romance-language comparison users;
- English/Greek comparison users;
- screen-reader/reduced-motion users.

Optimize for comprehension, voluntary reading, and useful noticing rather than maximizing visible educational controls.
