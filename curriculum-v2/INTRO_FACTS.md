# Language-intro facts (the "Meet this language" branch)

This file is the contract between the five intro topics, the realization facts that feed them, the best-language locale, and the
`gef-expo` facet providers. `scripts/validate-curriculum-v2.mjs` enforces it. Candidate content stays `review_state: "candidate"`
until a qualified reviewer approves it; nothing here is a verified claim.

## The branch

Soft order only (`relations: prepares_for`), never gating:

| # | Topic | Key | Stop |
|---|---|---|---|
| 1 | `TOPIC.orientation.language_overview` | `language_overview` | Where it comes from |
| 2 | `TOPIC.orientation.writing_system` | `writing_system` | How it looks |
| 3 | `TOPIC.orientation.sound_system` | `sound_system` | How it sounds |
| 4 | `TOPIC.orientation.grammar_glance` | `grammar_glance` | What's different |
| 5 | `TOPIC.orientation.shared_words` | `shared_words` | Words you already know |

Every Tier 1 language in `gef-expo/registry/language-support.json` (`lessonTiers.tier1_full`: en es fr pt it el) has a
realization for topics 1 to 4, and a bridge from every other Tier 1 language that has an interface locale (today `en`) for topic 5.

## Principles

1. **Facts are language-neutral and typed.** A realization describes one language by itself. It never mentions the learner's
   language. Prose in a learner's language lives only in `locales/{best}/topics/*.json` (`scene_copy`, `labels`, `glosses`).
2. **Differences are computed.** "Letters you don't have", "sounds that are new to you" and "what's different" are set
   differences between the focus realization and the best-language realization. Adding a language adds data once; it never adds
   a pair.
3. **Pair-sensitive truth only in bridges.** Cognates and false friends depend on both languages, so they are bridge notes
   (`curriculum-v2/bridges/{from}/{to}/shared-words.json`), the one place pairs are allowed.
4. **A fact that is missing is missing.** The runtime drops a scene whose facts are absent and says so honestly; it never
   substitutes another language's data.
5. **IPA is the shared notation for sound.** Broad phonemic transcription in IPA, for the standard variety named in the fact.
   Regional varieties are noted, never presented as the one correct form.

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

Facets: `first_word` (hook.*), `family_tree` (genealogy), `where_spoken` (reach.regions), `relation_to_best` (genealogy of both),
`family_check` (genealogy of the focus language and the other realizations in the package).

## Topic 2: `writing_system`

Capabilities: `explanation`, `reviewed_examples`, `recognition_practice`.

| fact_id | kind | value | qualifiers |
|---|---|---|---|
| `script.id` | `category` | ISO 15924 code (`Latn`, `Grek`) | |
| `script.direction` | `category` | `ltr` or `rtl` | |
| `script.has_case` | `boolean` | | |
| `alphabet.letters` | `term` | the alphabet, lowercase, in order | |
| `alphabet.marked` | `term` | letters carrying marks that are not alphabet letters themselves (may be empty) | |
| `punctuation.special` | `term` | punctuation the best language may lack (may be empty) | |
| `alphabet.example.{key}` | `term` | an example word | `ipa`, `highlight` (the character it shows), `name?` (the letter's name in its own language, with a Latin transliteration), `looks_like?` (the Latin letter it resembles in either case, when the sound differs) |
| `mark.{mark_id}` | `term` | a letter wearing the mark | `mark_id`, `role` (`stress sound_change pronounce_vowel vowel_quality`), `example`, `example_ipa` |

Every character in `alphabet.letters` outside `a` to `z` needs an `alphabet.example.*` with that `highlight`; a non-Latin script
needs one for every letter. A positional variant listed in `alphabet.marked` (Greek final sigma) is shown as a new letter when it has
such an example. Facets: `script_intro` (script.*, letters shared with the best language), `new_letters` (letters and
marks missing from the best language, with examples), `marks_and_punctuation` (mark.*, punctuation.special), `letter_check`.

## Topic 3: `sound_system`

Capabilities: `explanation`, `reviewed_examples`, `recognition_practice`, `listening`.

| fact_id | kind | value | qualifiers |
|---|---|---|---|
| `sounds.consonants` | `term` | IPA consonants of the standard variety | `variety` |
| `sounds.vowels` | `term` | IPA vowels of the standard variety | `variety` |
| `sounds.tricky.{id}` | `term` | an example word | `ipa` (the sound; omit when silent), `spelling`, `word_ipa`, `note_id` (a `sound.*` label), `silent?` |
| `sounds.contrast.{n}.a`, `.b` | `term` | two words that differ by one sound, or only by stress (Greek) | `ipa` (the word), `pair` (n), `note_id` |
| `stress.pattern` | `category` | `rule_with_written_accents`, `mostly_penultimate`, `phrase_final`, `marked_on_every_word`, `unpredictable` | |
| `spelling.predictability` | `category` | `high`, `medium`, `low` | |

At least three `sounds.tricky.*` and one contrast pair. Facets: `sound_overview`, `tricky_sounds` (sounds whose `ipa` is not in the
best language's inventory are marked new), `listen_pick` (contrast pairs), `sound_check`.

## Topic 4: `grammar_glance`

Capabilities: `explanation`, `comparison`, `reviewed_examples`, `recognition_practice`.

Each trait is one `category` fact `trait.{name}` and has at least one example `term` fact `trait.{name}.example.{n}`.

| trait | values | qualifiers on the trait fact |
|---|---|---|
| `noun_gender` | `none two three` | `values` (the genders), `articles?` |
| `articles` | `none definite_indefinite definite_only` | |
| `formal_you` | `none distinct` | `informal`, `formal` |
| `verb_endings` | `few many` | `example_verb` |
| `subject_pronouns` | `required often_dropped` | |
| `adjective_position` | `before_noun after_noun either` | |
| `cases` | `none pronouns_only some` | `count?` |
| `word_order` | `svo flexible` | |
| `questions` | `auxiliary_do intonation_or_inversion` | |

Languages with grammatical gender also carry `noun.{n}` `term` facts (at least four) with qualifiers `article` and `gender` for
the gender check. Facets: `trait_differences` (traits whose value differs from the best language, in the order above, at most
five), `trait_similarities`, `trait_check`.

## Topic 5: `shared_words` (bridges)

`bridges/{from}/{to}/shared-words.json`, `interface_language_tag` = `from`. Notes of kind `helpful_transfer` carry `pairs`
(look-alike words, at least six across the file), notes of kind `false_friend` carry `pairs` where `from` is the English-looking word
the learner will wrongly assume. Facets: `shared_words`, `false_friends`, `shared_words_check`.

## Locale (`locales/{best}/topics/{topic-key}.json`)

- `scene_copy[scene_id]`: `title`, `body`, `prompt`, `continue_label`. Tokens the runtime fills: `{language}` (focus language name in the
  best language), `{best}` (the best language's name), `{family}`, `{branch}`, `{regions}`, `{script}`, `{direction}`, `{shared}`,
  `{total}`, `{list}`, `{count}`.
- `labels`: names for every id a fact can use (`script.Latn`, `direction.ltr`, `family.indo_european`, `branch.romance`,
  `region.europe`, `sound.trill`, `stress.rule_with_written_accents`, `predictability.high`, `mark.acute`, `markrole.stress`,
  `trait.noun_gender.title`, `trait.noun_gender.two`, `relation.same_branch`, ...). Trait value labels read as a sentence about
  `{language}`.
- `glosses`: `"{language_tag}:{fact_id}"` to the meaning of that example.
- Gef's voice: brief and friendly, never claims anything is verified.
