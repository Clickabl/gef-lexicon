# Language-intro facts (the "Meet this language" branch)

This file is the contract between the five intro topics, the realization facts that feed them, the best-language locale, and the
`gef-expo` facet providers. `scripts/validate-curriculum-v2.mjs` enforces it and reads its vocabularies from
`curriculum-v2/slots/slots.json`. Candidate content stays `review_state: "candidate"` until a qualified reviewer approves it;
nothing here is a verified claim.

## The branch

Soft order only (`relations: prepares_for`), never gating:

| # | Topic | Key | Stop |
|---|---|---|---|
| 1 | `TOPIC.orientation.language_overview` | `language_overview` | Where it comes from |
| 2 | `TOPIC.orientation.writing_system` | `writing_system` | How it looks |
| 3 | `TOPIC.orientation.sound_system` | `sound_system` | How it sounds |
| 4 | `TOPIC.orientation.grammar_glance` | `grammar_glance` | What's different |
| 5 | `TOPIC.orientation.shared_words` | `shared_words` | Words you already know |
| leaf of 2 | `TOPIC.orientation.script_lesson` | `script_lesson` | Learn the {script}: the letters themselves |

## Principles

1. **Facts are language-neutral and typed.** A realization describes one language by itself. It never mentions the learner's
   language. Prose in a learner's language lives only in `locales/{best}/topics/*.json` (`scene_copy`, `labels`, `glosses`).
2. **Slots, not scripts.** The lesson is a fixed set of slots (below). A language fills the slots that apply to it and the lesson
   shows exactly those. Right-to-left, joined letters, two writing systems, tones, noun classes and root-and-pattern words are
   slots like any other. A scene whose slots are empty is dropped, never faked; nothing is ever substituted from another language.
3. **Differences are computed.** "Letters you don't have", "sounds that are new to you", "reads the other way" and "what's different"
   are comparisons between the focus realization and the languages the learner already knows (see Known languages). Adding a
   language adds data once; it never adds a pair.
4. **Pair-sensitive truth only in bridges.** Cognates, false friends and borrowed words depend on both languages, so they are bridge
   notes (`curriculum-v2/bridges/{from}/{to}/shared-words.json`), the one place pairs are allowed.
5. **IPA is the shared notation for sound.** Broad phonemic transcription in IPA, for the standard variety named in the fact.
   Regional varieties are noted, never presented as the one correct form.
6. **Every language fills every slot or says it has not.** A value of `null` means "not filled yet". A language may be a draft
   (`completeness: "draft"`, the default for a new file) with nulls and missing facts; coverage reports them. Tier 1 languages and
   any realization marked `completeness: "complete"` must have every required slot filled.

## Adding a language (the whole procedure)

1. `npm run curriculum:skeleton -- sw --layers latin` writes the four realization files with every slot present and unfilled.
2. Fill what applies. Use `null` for what you do not know yet and `"none"` / `false` only for what is genuinely absent.
3. Add any new label ids the language needs to `locales/en/topics/*.json`, and any new vocabulary value to `slots/slots.json`.
4. `npm run validate` (structure, vocabularies, references) and `npm run curriculum:coverage` (what is filled and what is not).
5. In gef-expo: `pnpm lesson:compile`. No code changes: scenes appear as slots fill.

Copy for another best language (explaining Chinese to a German speaker, German to a Chinese speaker) is authored per language pair
from the two realizations, not translated from English; that happens after the English copy is approved.

## Known languages (what the lesson compares with)

The learner's *bases* are their best language plus every other language they know at C1 or above (profile proficiency C1, C2 or
Fluent/native). A base without a realization is skipped. Bases are ordered closest-first to the focus language (same branch, then
same family, then the rest; the best language wins ties). Then:

- Set differences (letters, marks, sounds, direction, writing system) are taken against the **union** of the bases: a letter is new
  only if none of them has it.
- Grammar traits lead with the closest base ("Like Spanish: ...") and report a trait as different only when no base shares it.
- The relation scene names the closest base first, then the best language when it differs.
- A language the learner already knows at C1 or above counts as met: its own stops show Done and stay openable.

## Fact shape

`facts[]` items are `{fact_id, fact_kind, value, qualifiers?}` (see `schemas/language-realization.schema.json`). Values are a
string, number, boolean, string array or null. A "spoken example" is a `term` fact whose `value` is the text in the language
and whose `qualifiers.ipa` is its IPA. Its English meaning is `glosses["{language_tag}:{fact_id}"]` in the locale.

## Topic 1: `language_overview`

Genealogy (`genealogy`): `family_id`, `branch_ids` (at least one), `related_language_tags` (at least one for Tier 1),
`origin_region_ids`, `script_ids`. Capabilities: `explanation`, `comparison`, `recognition_practice`.

| fact_id | kind | value | qualifiers |
|---|---|---|---|
| `reach.regions` | `category` | region ids (`europe americas africa asia oceania`) | |
| `hook.target` | `term` | a common greeting in the language | `ipa?` |
| `hook.decoy.1`, `hook.decoy.2` | `term` | two other common words, not greetings of the same word | `ipa?` |

Facets: `first_word` (hook.*), `family_tree` (genealogy), `where_spoken` (reach.regions), `relation_to_best` (genealogy of the focus
language and its bases), `family_check` (genealogy of the focus language and the other realizations in the package).

## Topic 2: `writing_system`

A language has one to four **writing layers**: its main script and anything that travels with it (Chinese characters and pinyin;
Japanese kana and kanji; Serbian Cyrillic and Latin). Capabilities: `explanation`, `reviewed_examples`, `recognition_practice`.
`{L}` is a layer id such as `latin`, `greek`, `arabic`, `hanzi`, `pinyin`; its names live in the locale (`layer.{L}`).

| fact_id | kind | value | qualifiers |
|---|---|---|---|
| `writing.layers` | `term` | the layer ids, primary first | |
| `writing.{L}.kind` | `category` | `alphabet abjad abugida syllabary logographic featural romanization` | |
| `writing.{L}.script` | `category` | ISO 15924 (`Latn`, `Grek`, `Arab`, `Hani`) | |
| `writing.{L}.role` | `category` | `primary` (exactly one), `aid` (helps you read or say the main one: pinyin), `alternate` (a second standard) | |
| `writing.{L}.direction` | `category` | `ltr` or `rtl` | |
| `writing.{L}.has_case` | `boolean` | upper and lower case | |
| `writing.{L}.joined` | `boolean` | letters join and change shape by position (Arabic) | |
| `writing.{L}.vowels` | `category` | `all_written`, `marks_optional` (Arabic), `inherent` (Devanagari), `not_applicable` | |
| `writing.{L}.symbols` | `term` | the inventory in order (letters, syllables); empty for `logographic` | |
| `writing.{L}.marked` | `term` | symbols that carry marks and are not inventory entries (may be empty) | |
| `writing.{L}.punctuation` | `term` | punctuation the learner may not know (may be empty) | |
| `writing.{L}.group.{n}` | `term` | one teaching group of 2 to 6 symbols, in teaching order (`n` from 1); every symbol of the layer is in exactly one group; a character layer groups its example characters | |
| `writing.{L}.example.{key}` | `term` | a very common, concrete word that shows the symbol (a logographic layer: the character or word itself) | `ipa` (the word), `highlight` (the symbol it shows), `sound` (the symbol's own sound in this language, broad IPA; not for characters), `reading` (a Latin transliteration of the symbol or word, required when the script is not Latin: pinyin, romaji, revised Romanization), `name?` (the symbol's own name with a Latin transliteration), `looks_like?` (the Latin letter it resembles when the sound differs), `forms?` (positional shapes, in order: isolated initial medial final), `parts?` (a character's components) |
| `writing.{L}.mark.{id}` | `term` | a symbol wearing the mark | `mark_id`, `role`, `example`, `example_ipa` |

Every symbol, Latin `a` to `z` included, needs a `writing.{L}.example.*` with that `highlight` (the lesson teaches letters with a word
and a sound for each), and the layer's `group.*` facts cover every symbol once; a `logographic` layer is carried by its examples (at
least six) and groups them. `slots_version: 2` on a realization declares this letter data present; the validator checks it for those
realizations (every complete language moves to 2). Facets: `script_intro` (the writing at a glance as a few labelled facts and a word to hear: which way it reads, what kind of writing, how many letters, what is new; only what differs from the writing the learner already reads) and `glyph_tour` (the symbols new to this learner on a tappable board; the letters themselves are learned in the script lesson, a leaf of this stop).

## The script lesson (a leaf of stop 2)

`TOPIC.orientation.script_lesson` is a lesson of its own for one writing layer of the focus language: "Learn the Arabic alphabet", "Learn
Chinese characters". It has no facts of its own: `fact_source_topic_id` points at `TOPIC.orientation.writing_system`, whose realizations
it reads, so a language's letters are written once. `layer.{L}.lesson` in the locale names it ("Learn the Arabic alphabet").

- **Full or short.** If any of the learner's bases already reads the layer's script (an English reader meeting Spanish, a Russian reader
  meeting Ukrainian), the lesson is short: only the symbols and marks no base has, shown with the same rich cards and one drill. If the
  script is new to them it is full: every group of the layer, with a drill after each, then a mixed review.
- **Wins throughout.** Every screen has something to hear, tap or answer; no screen is only text. The overview is a tappable board of all
  the symbols; each group is a board of large tiles whose selected symbol shows its name, sound, shapes and example word; each group
  ends in a hear-and-pick and a match; the end is a review of what was missed.
- Facets: `glyph_board` (all symbols, tap to hear), `glyph_group` (meet one group), `glyph_check` (the drill after a group), `glyph_review`.

## Topic 3: `sound_system`

Capabilities: `explanation`, `reviewed_examples`, `recognition_practice`, `listening`.

| fact_id | kind | value | qualifiers |
|---|---|---|---|
| `sounds.consonants` | `term` | IPA consonants of the standard variety | `variety` |
| `sounds.vowels` | `term` | IPA vowels of the standard variety | `variety` |
| `sounds.tricky.{id}` | `term` | an example word | `ipa` (the sound; omit when silent), `spelling`, `word_ipa`, `note_id` (a `sound.*` label), `silent?` |
| `sounds.contrast.{n}.a`, `.b` | `term` | two words that differ by one sound, a tone, or only by stress | `ipa` (the word), `pair` (n), `note_id` |
| `tones.system` | `category` | `none contour register pitch_accent` | `count?` |
| `tones.example.{n}` | `term` | a syllable or word showing one tone | `ipa`, `tone_id` (a `tone.*` label), `contour?` (IPA tone letters) |
| `stress.pattern` | `category` | `rule_with_written_accents mostly_penultimate phrase_final marked_on_every_word unpredictable not_applicable` | |
| `spelling.predictability` | `category` | `high medium low` | |

At least three `sounds.tricky.*` and one contrast pair; a tonal language (`tones.system` not `none`) also needs at least four
`tones.example.*`. Facets: `sound_overview`, `tone_overview`, `tricky_sounds` (sounds whose `ipa` is in no base's inventory are marked
new), `listen_pick` (contrast pairs), `sound_check`.

## Topic 4: `grammar_glance`

Capabilities: `explanation`, `comparison`, `reviewed_examples`, `recognition_practice`. Each trait is one `category` fact
`trait.{name}`; a trait whose value is not `none` has at least one example `term` fact `trait.{name}.example.{n}`. The traits, their
values and the order the lesson shows them (most surprising first) are in `slots/slots.json` (`grammar`), and the order is copied
into the topic's scenes as `facet_config.trait_order`, so the runtime hard-codes none of it.

Languages with grammatical gender or noun classes also carry `noun.{n}` `term` facts (at least four) with qualifiers `article` and
`gender` for the gender check. Facets: `trait_differences` (traits no base shares, in order, at most five), `trait_similarities`,
`trait_check`.

## Topic 5: `shared_words` (bridges)

`bridges/{from}/{to}/shared-words.json`. `interface_language_tag` is the language the note text is written in; for a learner whose
best language is `from` it equals `from`. For a base other than the best language (Spanish for an English-speaking learner of
Italian) the bridge is `from: es, to: it` with `interface_language_tag: en`, and each pair's `from` is the Spanish word.
Notes of kind `helpful_transfer` carry `pairs` (look-alike or borrowed words); notes of kind `false_friend` carry `pairs` where
`from` is the word the learner will wrongly assume. Where two languages share no cognates, `helpful_transfer` holds the words the
`from` language borrowed from `to` (English words that came from Arabic, Chinese or Swahili). Facets: `shared_words`,
`false_friends`, `shared_words_check`.

## Locale (`locales/{best}/topics/{topic-key}.json`)

- `scene_copy[scene_id]`: `title`, `body`, `prompt`, `continue_label`. Tokens the runtime fills: `{language}` (focus language name in the
  best language), `{best}` (the best language's name), `{base}` (the closest known base), `{family}`, `{branch}`, `{regions}`,
  `{script}`, `{direction}`, `{layer}`, `{shared}`, `{total}`, `{list}`, `{count}`.
- `labels`: names for every id a fact can use (`script.Arab`, `direction.rtl`, `layer.pinyin`, `kind.logographic`, `tone.rising`,
  `family.afro_asiatic`, `branch.bantu`, `region.africa`, `sound.pharyngeal`, `trait.word_building.root_and_pattern`, ...). Trait value
  labels read as a sentence about `{language}`.
- `layer.{L}.lesson`: the script lesson's title for that layer ("Learn the Arabic alphabet"); `glosses`: `"{language_tag}:{fact_id}"` to the meaning of that example.
- Gef's voice: brief and friendly, never claims anything is verified.
