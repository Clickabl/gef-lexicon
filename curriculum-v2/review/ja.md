# ja (Japanese, standard Tokyo-based) — what the maintainer must add, and what a native-speaker reviewer must check

All content is `candidate`, unverified. Items marked **[CHECK]** are the ones I am least sure of, or that need a decision.

Checked structurally: I copied `scripts/validate-curriculum-v2.mjs`, `scripts/lib/curriculum-slots.mjs`, `schemas/` and `curriculum-v2/` into
`/private/tmp/claude-501/-Users-tim-Clickabl-Apps-gef-expo/1b7fec58-7384-4e26-a632-3ee8f634e18b/scratchpad/gen4/ja_work/stage/`, dropped the four realizations,
the bridge and the merged `locale-en.json` into that copy, and ran the real validator there: `OK ... complete: ar, el, en, es, fr, it, ja, pt, sw, zh`
(slots_version 2 letter rules, gloss coverage, label coverage, bridge, all passed). The real tree was not touched. The generator that wrote the files is in
`.../gen4/ja_work/` (`build.py`, `writing.py`, `fmt.py`, `merge.py`); re-run `python3 build.py` after editing data there.

## A. Things that need a decision (read these first)

1. **[CHECK] `trait.verb_endings` = `many`, but the generic label text is wrong for Japanese.** `trait.verb_endings.many` says "verbs change their form to
   match the subject". Japanese verbs never agree with the subject; they change for tense, negation, politeness, mood. `few` ("barely change with the
   subject") is true literally but undersells it. I followed the brief (`many`) and wrote examples that show the real changes
   (食べる / 食べない / 食べた / 食べなかった; polite 食べます / 食べません / 食べました). Suggest a new value (e.g. `many_not_subject`) or rewording the
   generic `many` text to "change their form for tense, politeness and more". Until then the grammar stop will say something false about Japanese.
2. **[CHECK] Punctuation needs a `sound` the validator insists on.** The slots_version 2 validator requires `qualifiers.sound` on every example of a
   non-logographic layer, including punctuation. Punctuation has no sound, so I used prosodic-break symbols: `‖` for 。 (major break), `|` for 、
   (minor break) and `∅` for 「 」 and ・ (no sound). The lesson will print these as `/‖/` etc. Either relax the validator for punctuation examples or
   confirm the sentinel. For punctuation, `reading` is the mark's Japanese name in romaji (maru, ten, kagikakko (open), kagikakko (close), nakaguro), and
   the romaji of the example word is in `word_reading`.
3. **[CHECK] `を` / `ヲ` `reading` is `wo`, `sound` is `o`.** Modern Japanese says を exactly like お. Charts write `wo`; modified Hepburn writes `o`. I used
   `wo` so the hear-and-pick can tell it from お, and `sound` `o` for the audio. The tile will say "Sounds like wo": if you prefer, change the reading to
   `o` (the lesson already drops same-reading distractors).
4. **[CHECK] Branch id `japanesic`, label "Japanese".** The family is Japonic (Japanese + Ryukyuan). The label `branch.japanesic` reads "Japanese" so the tree scene
   says "in the Japanese branch". Rename the id/label if you prefer the family-tree term "Japanesic" (Glottolog) or just `japanese`.
5. **[CHECK] `related_language_tags` is empty.** No Japonic language is in the registry (no Ryukyuan entry); Korean is not shown to be related (Wikipedia,
   Japonic languages: "no genetic relationship has been conclusively demonstrated"). Tier 2 language, so the validator does not require one.
6. **[CHECK] `writing.hiragana.vowels` = `all_written`** (not `inherent`, whose label says a consonant carries a built-in vowel unless a mark changes it,
   which is false for kana). Kana are moras; the generic label `kind.syllabary` says "syllable", close enough for a beginner.
7. **[CHECK] `direction` = `ltr` for all three layers.** Modern horizontal writing. Novels, newspapers and manga run top to bottom, right to left; the
   `layer.hiragana.note` label says so. There is no vertical value in the vocabulary.

## B. Vocabulary values and ids used that are not already in the registry / en locale

| What | Where | Note |
|---|---|---|
| `family_id` `japonic`, `branch_ids` `japanesic` | overview | labels `family.japonic`, `branch.japanesic` supplied |
| `script_ids` `Hira`, `Kana`, `Hani` | overview, layers | `script.Hira`, `script.Kana` supplied; `script.Hani` ("Chinese characters") already exists and is true for kanji |
| layer ids `hiragana`, `katakana`, `kanji` | writing | `layer.*`, `layer.*.lesson` ("Learn hiragana/katakana/kanji") and `layer.*.note` supplied. `layer.kanji` is just "Kanji" so "Kanji is a character system..." reads correctly |
| mark ids `dakuten`, `handakuten`, `small_tsu`, `small_ya`, `macron` | writing marks | all five are in slots.json. The brief says to prefix new `mark.*` ids with the language tag; these ids are already registered in slots.json and the runtime looks the label up as `mark.{mark_id}`, so I wrote `mark.dakuten`, `mark.handakuten`, `mark.small_tsu`, `mark.small_ya` unprefixed. `mark.macron` already exists (pinyin: "macron (flat bar)") and is reused for the katakana long-vowel mark ー, whose real name is chōonpu |
| mark roles `voicing`, `sound_change`, `doubling`, `palatalization`, `length` | writing marks | all in slots.json. New labels `markrole.voicing`, `markrole.palatalization`, `markrole.length`; `markrole.doubling` and `markrole.sound_change` reused verbatim |
| sound note ids `ja_tapped_r`, `ja_fu`, `ja_tsu`, `ja_unrounded_u`, `ja_small_tsu`, `ja_moraic_n`, `ja_voicing`, `ja_pitch_pair` | sounds | labels `sound.*` supplied. `sound.vowel_length` reused verbatim (its text is true for Japanese). I did not reuse `sound.tapped_r` (its "some speakers roll it" is Swahili-specific) or `sound.double_consonant` (Japanese marks doubling with a small っ, not a written double letter) |
| tone ids `ja_atamadaka`, `ja_heiban`, `ja_odaka`, `ja_nakadaka` | tones | labels `tone.*` supplied |
| `tones.system` `pitch_accent`, `stress.pattern` `not_applicable` | sounds | existing vocabulary and labels. Stress is `not_applicable` because Japanese has pitch accent, not stress |
| `trait.subject_pronouns` `context_dependent`, `trait.word_building` `agglutinating`, `trait.classifiers` `required`, `trait.formal_you` `levels`, `trait.questions` `particle`, `trait.word_order` `sov` | grammar | all in slots.json and the en locale already |

### Extra qualifier keys I added (not in INTRO_FACTS.md; bless or strip)

- `reading` (romaji) on every spoken example in overview, sounds and grammar (the learner cannot read kana/kanji yet), as zh does.
- `word_reading` on every kana example: romaji of the example word (modified Hepburn, macrons for long vowels). Generated by script from the kana, so typo-free; ヲタク is `otaku` and ほんをよむ is `hon o yomu`.
- `example_reading` on every `writing.*.mark.*` fact: romaji of the example word.
- `variants` on `small_ya` marks: the other two small kana (`ゅ`,`ょ` / `ュ`,`ョ`). The brief wanted one `small_ya` mark covering ya/yu/yo.
- `with_particle` on `tones.example.*`: the pitch letters of the word plus the particle が, which is what separates a flat word from an end-drop word
  (橋が `˩˥˩` against 端が `˩˥˥`).
- `parts` on six kanji (as in zh): 男 `田 + 力`, 林 `木 + 木`, 森 `木 + 木 + 木`, 明 `日 + 月`, 休 `亻 + 木`, 好 `女 + 子`.

## C. Conventions I chose

- **IPA.** Broad phonemic, Tokyo standard, not narrow: `ɯ` unrounded u; `ɕ`, `tɕ`, `dʑ` for し ち じ; `ts` つ; `ɸ` ふ; `ç` ひ; `ɾ` the r-tap; `ɴ` for every ん (phonemic /N/;
  it is really m, n, ŋ or ɴ depending on what follows); `ɡ` (U+0261); `ː` for long vowels; doubled consonants as `kː`, `tː`, `pː`. Vowel devoicing
  (すし, です) and nasal [ŋ] for が in word middle are not marked. `sounds.consonants`: p b t d k ɡ ts tɕ dʑ s z ɕ h ç ɸ m n ɴ ɾ j w; `sounds.vowels`: a i ɯ e o + long forms.
  ず/づ and じ/ぢ are the same sounds and are not listed twice.
- **Pitch accent marks.** Downstep is `ꜜ` (as Wiktionary's Japanese pronunciation does): 雨 `aꜜme` (HL), 飴 `ame` (LH, flat), 箸 `haꜜɕi`, 橋 `haɕiꜜ`
  (drop only after the word), 端 `haɕi`, 果物 `kɯdaꜜmono`. Chao-style `contour` letters are for the word alone (`˥˩` high-low, `˩˥` low-high).
- **Romaji.** Modified Hepburn with macrons (ō, ū, ā, ī, ē). Only の (`no`) vs を (`wo`) is bent to keep tiles distinct (see A3). し=shi, ち=chi, つ=tsu, ふ=fu.
- **Hiragana and katakana: 46 basic symbols each**, in gojūon order, in ten teaching groups: a, ka, sa, ta, na, ha, ma, ya (3), ra, wa-wo-n (3).
  Not included: the obsolete ゐ ゑ ヰ ヱ. The 25 voiced/semi-voiced kana (が, ぱ ...) are `marked`, not symbols, and are taught through the dakuten / handakuten marks (each
  gets one example word), as the brief asked. The marks are shown as the last group(s) of each kana lesson.
- **Hiragana examples** are native words that start with the kana where a very common word exists. Where none does I put the kana later in the word (ぬ in いぬ, ら in さくら,
  る in さる, れ in はれ, ん in ほん). I avoided ambiguous words (あめ is rain and candy, はし is bridge, chopsticks and edge, はな is flower and nose).
  Most words avoid dakuten and small kana the learner has not met yet; exceptions: めがね (が), りんご (ん and ご).
- **Katakana examples are loanwords** (brief). Most are from English. Not from English: コーヒー and ビール (Dutch), パン (Portuguese), ヨーグルト (German, via Turkish); ヲタク is a native Japanese word written in katakana. The first four are therefore **not** used in the
  "English words in Japanese" bridge note. Katakana words freely use ー, ッ and voiced kana that the learner only meets in the marks groups later in the same lesson.
- **Kanji layer.** 31 characters in 7 groups of 4 or 5 (numbers; sun/moon/elements; land; people; body; size and direction; built from parts). The value is the single character,
  `highlight` is the same character, `reading` is the romaji of the one reading I chose. I left out 火 (fire) on purpose: its everyday reading
  `hi` equals 日 `hi`, and the hear-and-pick would have two right answers.
- **Punctuation.** 。 、 and 「 」 (each bracket is its own symbol with its own example, so the highlight matches). Katakana layer: ・ only. ー is a mark (`macron`, role `length`), not punctuation.
- **Groups.** Punctuation is not in any `group.*` (the validator only accepts symbols there); the app puts leftover symbols (punctuation) into one more group of four automatically.
- **`has_case` false, `joined` false** for all three layers.
- **Layer roles.** hiragana `primary`; katakana and kanji `alternate` (as briefed), although in real writing all three are mixed in one sentence; the `layer.*.note` labels say this.

### Kanji: reading chosen for each example (romaji, Hepburn)

Rule: if the kanji can stand alone as a word, the everyday standalone (kun'yomi) reading; if it cannot (大, 小, 明), the on'yomi used in common compounds; numbers use the
on'yomi, which is what you say when counting. **[CHECK]** the choices marked ◆ are judgement calls.

| Kanji | Reading | Other readings a learner will meet | Gloss |
|---|---|---|---|
| 一 二 三 十 | ichi, ni, san, jū | hito(tsu), futa(tsu), mit(tsu), tō | one two three ten |
| 日 ◆ | hi | nichi (日本 Nihon is `ni`, 日曜日 nichiyōbi), jitsu, ka, bi | sun, day |
| 月 | tsuki | getsu, gatsu (月曜日, 一月) | moon, month |
| 水 | mizu | sui (水曜日) | water |
| 木 | ki | moku (木曜日) | tree, wood |
| 金 ◆ | kane | kin (金曜日), kon | gold, money |
| 山 | yama | san, zan (富士山) | mountain |
| 川 | kawa | sen | river |
| 田 | ta | den | rice field |
| 土 | tsuchi | do (土曜日), to | earth, soil |
| 人 | hito | jin, nin (三人 sannin) | person |
| 男 | otoko | dan, nan | man |
| 女 | onna | jo, nyo | woman |
| 子 | ko | shi, su | child |
| 口 | kuchi | kō | mouth |
| 目 | me | moku | eye |
| 手 | te | shu | hand |
| 耳 | mimi | ji | ear |
| 大 ◆ | dai | ō(kii), tai, ō | big |
| 小 ◆ | shō | chii(sai), ko-, o- | small |
| 上 | ue | jō, ue, ka(mi), a(garu) | up, above |
| 下 | shita | ka, ge, kuda(saru), sa(garu) | down, below |
| 中 | naka | chū (中国), jū | middle, inside |
| 林 | hayashi | rin | woods |
| 森 | mori | shin | forest |
| 明 ◆ | mei | aka(rui), myō, 明日 ashita (irregular) | bright |
| 休 ◆ | yasumi | yasu(mu), kyū | rest, a break |
| 好 ◆ | suki | kō, kono(mu) | to like |

## D. [CHECK] list for the reviewer

1. Pitch accent (all from Wiktionary `ja-pron`, which cites NHK, Daijirin, Shinmeikai and Nihon Kokugo Daijiten): 雨 [1], 飴 [0] (Wiktionary cites ZAJ only; I did not check NHK), 箸 [1], 橋 [2],
   端 [0], 果物 [2]. Tokyo; Kansai reverses many of these. Please confirm 飴 [0] and 果物 [2] against the NHK accent dictionary.
2. Tone labels use "beat" for mora, and say what happens on the particle が. Check they are clear.
3. `tones.example.6` 果物 `kɯdaꜜmono` is the nakadaka (middle-drop) example. 卵 たまご was my first choice but Wiktionary lists both [2] and [0] for it, so I left it out.
4. `sounds.contrast.3` かき / かぎ: the first word is glossed "persimmon, oyster" (both are かき). Fine for a hear-and-pick, but check the gloss.
5. `sounds.contrast.4` is a pitch pair (雨 / 飴, both `ame`): the two values are kanji because the kana are identical. The speech engine must say 雨 as HL and 飴 as LH;
   check on device. If it cannot, drop pair 4 (pairs 1 to 3 stand on their own).
6. `sounds.tricky.long_vowel`: おばあさん, `spelling` is the part `ばあ` that shows the length. `sounds.tricky.small_tsu`: `ipa` `kː`.
7. `hook.target` こんにちは glossed "hello, good afternoon": it is a daytime greeting (今日は, "as for today"), not for morning or evening; gloss and scene copy should not call it plain "hello" for all hours.
8. Hiragana examples whose commonness or picture value I am least sure of: けむり (smoke), ちかてつ (subway), はれ (fine weather), こめ (uncooked rice), おかし (お菓子, sweets; the お is part of the word),
   てら (temple). Alternatives if you want plainer words: けさ, ちず, れきし, こども, てんき.
9. `を` example is a phrase, ほんをよむ ("hon o yomu"), because を is only a particle and starts no word. `ヲ` has no ordinary word at all; I used ヲタク, a real but rare/stylised spelling of オタク
   (Wiktionary lists it as an alternative spelling). Replace with a better teaching phrase if you have one.
10. Katakana examples whose source is not English are still loanwords as asked: コーヒー, ビール, パン, ヨーグルト. ソース is from English "sauce" but in Japan usually means a Worcestershire-type sauce; the gloss says just "sauce".
11. `looks_like` is not set anywhere: no Latin letter looks enough like a kana to be a fair warning. The real confusables are inside the script (シ/ツ, ソ/ン, さ/き, ぬ/め, ね/れ/わ, は/ほ, る/ろ), which a
    later "confusables" facet could use. ソ/ン and シ/ツ are placed in different teaching groups.
12. Katakana extras not covered: ヴ (listed in `marked` only), the small vowels ァ ィ ゥ ェ ォ used for foreign sounds (ファ, ティ), the repeat marks 々 ゝ, and the numerals.
13. `grammar_glance` examples:
    - `trait.formal_you` levels: the pair is informal 元気？ / formal お元気ですか。, glossed exactly like the other languages' "How are you? (informal/formal)". The real ladder is plain / polite / honorific (食べる, 食べます, 召し上がります); only two registers fit the existing `register.*` labels.
    - `trait.word_building` 読ませられた is causative + passive ("was made to read"); natural and common, but long for a beginner. Swap for something easier if you like.
    - `trait.classifiers`: 三人 (sannin), 猫が二匹 (nihiki), 本を三冊 (sansatsu) are all regular; 二人 is irregular (futari) so I avoided it.
    - `trait.cases` = `none`: Japanese nouns do not change, particles (が, を, に) mark roles; the example 犬が猫を見る / 猫が犬を見る shows this. Examples were also added to `cases` and `articles` (value `none`) to show what is absent.
    - `trait.subject_pronouns` = `context_dependent` (the brief's value); the existing label text is true for Japanese.
14. `spelling.predictability` = `high` as briefed. True of the kana, not of kanji readings (which are the opposite). The label does not distinguish.
15. Hiragana/katakana examples are not marked with pitch accent (only the six `tones.example.*` are).
16. Gloss wording: 子 "child" (also "son, kid"), 田 "rice field", 金 "gold, money", 中 "middle, inside", 休 "rest, a break, a day off" (reading `yasumi` is the noun 休み, the stem of 休む), 好 "to like" (reading `suki` is 好き).

## E. Bridge `bridge-en-ja.json`

Three notes, all `candidate`:

- `borrowed_from_japanese` (`helpful_transfer`, 17 pairs). English and Japanese are not related, and the text says so. These are Japanese words English borrowed: tsunami, karaoke, sushi, emoji, origami, karate, judo, haiku, sudoku, kimono, futon, bonsai, manga, tycoon (大君 taikun, an old title of the shogun), rickshaw (人力車, shortened 力車), honcho (班長 hanchō, US military slang, probably WWII), skosh (少し, US military slang). Etymologies checked in Wiktionary's English entries (each says "borrowed from Japanese"; futon, bonsai and a few others come from Chinese roots but reached English through Japanese). `to` is shown in kana, not kanji, so a beginner can read it; the note says so.
- `english_words_in_japanese` (`helpful_transfer`, 12 pairs): hotel, taxi, camera, cake, milk, computer, radio, tennis, ice cream, television (テレビ, clipped), game, lemon; each checked as "borrowed from English" in Wiktionary's Japanese entries. コーヒー, ビール and パン are not here because they are not from English.
- `english_look_alikes_that_differ` (`false_friend`, 8 pairs, each with `to_meaning`): mansion (apartment building), smart (slim), claim (complaint), consent (the word English readers assume for コンセント, which is a wall socket from "concentric plug"), naive (sensitive), cunning (cheating on a test), Viking (buffet), tension (high spirits). Meanings checked in Wiktionary's Japanese entries.

**[CHECK]** `to_ipa` for all bridge pairs is broad IPA by the conventions above; the texts avoid claiming anything is verified.

## F. Sources checked

- Wiktionary (en) raw entries via `action=raw`: `{{ja-pron}}` pitch data for 雨 飴 箸 橋 端 果物 卵 鼻 花; English etymology sections for tsunami, karaoke, sushi, emoji, tycoon, origami, karate, judo, haiku, sudoku, kimono, futon, bonsai, manga, honcho, rickshaw, skosh; Japanese entries for every hiragana and katakana example word (all exist), マンション, スマート, クレーム, コンセント, ナイーブ, カンニング, バイキング, テンション, サイン, ヲタク, ヲ, and the English-origin check for カメラ, ラジオ, レモン, ケーキ, ホテル, タクシー, ミルク, コンピューター, テニス, アイスクリーム, ゲーム.
- Wikipedia "Japonic languages" (two branches, Japanese and Ryukyuan; Hachijō unclear; no relation to Korean shown), "Wasei-eigo" and "Gairaigo" (partial confirmation: カンニング, ハンドル).
- Everything else (kana inventory and order, Hepburn romaji, IPA values, counters, particles, the register examples) is my own knowledge of standard Japanese, not looked up. **[CHECK]** by a native speaker: the sentence examples in `grammar-glance.json`, the hiragana/katakana word IPA, and the kanji `parts`.
