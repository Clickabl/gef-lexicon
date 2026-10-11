# zh (Standard Mandarin, simplified) — what the maintainer must add, and what a native-speaker reviewer must check

All content is `candidate`, unverified. Items marked **[CHECK]** are the ones I am least sure of.
I checked the four realization files and the bridge against `schemas/language-realization.schema.json` and
`schemas/topic-bridge-note.schema.json`, and wrote my own checks of INTRO_FACTS.md (symbols need examples, glosses cover every
term fact, every label id is supplied or listed below as already existing). I did not run `npm run validate`: the repo
validator still reads the old fact ids and the data tree is being changed by someone else.

## A. Vocabulary and ids used that are not in `slots/slots.json` (or that you should confirm)

| What | Where | Note |
|---|---|---|
| `family_id` `sino_tibetan`, `branch_ids` `sinitic` | overview genealogy | labels `family.sino_tibetan`, `branch.sinitic` are in locale-en.json |
| `script_ids` `Hani`, `Latn` (ISO 15924) | overview genealogy | the existing es/el overviews use `latin` / `greek`; I used ISO codes as briefed. Labels `script.Hani` is supplied; `script.Latn` already exists |
| layer ids `hanzi`, `pinyin` | writing facts | slots.json has no list of layer ids; labels `layer.hanzi`, `layer.pinyin` supplied |
| `tone_id` values `high_level`, `rising`, `dipping`, `falling`, `neutral` | tones.example.*, pinyin marks | slots.json has no tone-id list; `neutral` is the one most likely to be new. Labels `tone.*` supplied for all five |
| sound `note_id` values `aspirated_stops`, `retroflex`, `retroflex_r`, `palatal`, `back_unrounded_vowel`, `tone_contrast` | sounds.tricky.*, sounds.contrast.* | labels `sound.<id>` supplied |
| `variety` `standard` | sounds.consonants, sounds.vowels | as briefed; `standard_mandarin` would be more explicit if you prefer |
| mark ids `macron`, `acute`, `caron`, `grave`; mark role `tone` | pinyin marks | all four ids and the role are already in slots.json. Labels supplied for `macron`, `caron`, `markrole.tone` |
| `trait.subject_pronouns` value | grammar | see C1: slots.json offers only `required` / `often_dropped`; Mandarin needs a third value, e.g. `context_dependent` |

## B. Extra qualifier keys I added (not in INTRO_FACTS.md; bless or strip)

- `reading` (pinyin with tone marks) on `hook.*`, `writing.hanzi.example.*`, `sounds.tricky.*`, `sounds.contrast.*`,
  `tones.example.*` and every `trait.*.example.*`. INTRO_FACTS defines it only for writing examples. For Mandarin the learner
  cannot read the value (hanzi), so every spoken example needs its pinyin next to it.
- `parts` on `writing.hanzi.example.{forest,good,bright,rest}` (briefed): `"木 + 木"`, `"女 + 子"`, `"日 + 月"`, `"亻 + 木"`.
- `example_hanzi` and `tone_id` on `writing.pinyin.mark.*`: the hanzi word the example syllable stands for, and the tone it marks.
- `particle` (`"吗"`) on `trait.questions`; `example_verb` (`"说"`) on `trait.verb_endings` (copied from the old Greek shape even
  though the value is `none`).
- Examples on traits whose value is `none` (`verb_endings`, `cases`, `articles`): not required, added because they show what is
  absent (the verb 说 never changes; 我/他 are the same as subject and object; no word for "the"). Delete if unwanted.
- `tones.example.5` (neutral tone, 吗) in addition to the four, while `tones.system` has `count: 4`. It has no `contour`.
- Two extra labels no scene asked for: `layer.hanzi.note` (simplified vs traditional characters) and `layer.pinyin.note`.
  The brief asked that the traditional/simplified point be mentioned: it is in `layer.hanzi.note` (simplified is standard in
  mainland China and Singapore; traditional is used in Taiwan and Hong Kong; the lesson shows simplified). Use or ignore.

## C. Uncertain items for a native-speaker / phonetics reviewer

1. **[CHECK] `trait.subject_pronouns` = `required` (as briefed).** Mandarin routinely drops the subject when context makes it
   clear (吃了吗？ "Have you eaten?", 去哪儿？ "Where are you going?"). English also needs the subject, so the lesson would report
   "same as English" for a real difference. And the existing `often_dropped` label ("because the verb ending already says who")
   is wrong for Mandarin, where the cause is context, not verb endings. Suggest a new value `context_dependent`
   (or `dropped_from_context`) with its own generic label. I did not add an example of a dropped subject, since it would contradict
   `required`.
2. **[CHECK] IPA conventions.** Broad IPA with Chao tone letters. Tones: 1 `˥`, 2 `˧˥`, 3 `˨˩˦`, 4 `˥˩`; neutral tone has no
   letters. Third-tone sandhi (3+3 becomes 2+3) is applied inside words (你好 = `ni˧˥ xɑʊ˨˩˦`), while pinyin keeps the
   underlying tones (nǐ hǎo). The "half-third" (`˨˩`) before another tone is not marked: a third tone that is not changed by sandhi
   is always written `˨˩˦`. Single syllables are citation forms.
3. **[CHECK] Retroflex r and apical vowels.** Pinyin r is written `ɻ` (the approximant, as Wiktionary's Mandarin entries do; `ʐ`
   is the fricative variant that some sources prefer). 日 is `ɻ̩˥˩` (syllabic r). Other analyses write `ʐ`/`ʐ̩`. I avoided the vowels of zhi/chi/shi/ri/zi/ci/si
   everywhere else (e.g. the s/sh contrast uses 三/山, not 四/是).
4. **[CHECK] Inventories are simplified.** Consonants: 22 phonemes plus the glides `j w ɥ` listed as consonants (the English and
   French inventories list them the same way). Vowels: `a ɑ ɛ ɤ ə i y u o ɚ` plus diphthongs `aɪ eɪ ɑʊ oʊ`. In words I write
   pinyin `ao` as `ɑʊ`, `ou` as `oʊ`, `ie` as `jɛ`, `üe` as `ɥɛ`, `iu` as `joʊ`, `ui` as `weɪ`, and `ong` as `uŋ` (中 `tʂuŋ˥`,
   红 `xuŋ˧˥`, 龙 `luŋ˧˥`; many sources write `ʊŋ`). `ɚ` (er) is in the inventory but not used in any example.
5. **[CHECK] `parts` are visible components, not etymology claims.** 明 = 日 + 月 is how the character is built today; some
   scholars think the older form was 囧 (window) + 月. 好 = 女 + 子 (woman + child) is the commonly taught explanation; other
   readings of 子 exist. 休 = 亻 (the person component of 人) + 木 (a person resting against a tree) is the usual explanation.
6. **[CHECK] `writing.pinyin.example.u_umlaut` = lüè (略).** I needed a syllable in which ü appears with no tone mark on it, so that
   the highlight `ü` appears literally in the value. 略 is real but not a beginner word; gloss "slightly, briefly" is approximate.
   With ü in tone-marked syllables (nǚ, lǜ) the character is ǚ/ǜ, listed under `marked`.
7. **[CHECK] Pinyin symbol convention.** `symbols` = a to z without v (v is used only for foreign words and dialect), plus ü placed
   after u (where the keyboard letter v stands in for ü). That gives 26 entries. In pinyin ü is written u after j, q, x, y
   (e.g. 去 qù, 月 yuè) and ü after l, n (绿 lǜ, 女 nǚ).
8. **[CHECK] Direction.** Hanzi `ltr` is the modern mainland horizontal layout. Chinese can also be written top to bottom, in columns
   from right to left (traditional books, some signs, Taiwan). The lesson shows horizontal.
9. **[CHECK] Classifier examples.** I avoided 一本书 (yī/yì běn shū): the tone of 一 changes before another syllable and
   dictionaries write it as yī while textbooks write the changed tone. 三本书, 三个人, 两杯茶 (all unaffected by 一/不 sandhi) are
   used instead. 个 gè is often neutral in speech (ge).
10. **[CHECK] Formal-you examples.** 你是老师吗？/ 您是老师吗？ chosen over 你好吗/您好吗, which sounds textbook-like.
11. **[CHECK] Label wording** (English comparisons are simplified): `sound.aspirated_stops` (b d g "say the p of spin"),
    `sound.retroflex_r` ("between r and the s in measure"), `sound.palatal` (q like a light ch, x like a light sh, j is q without
    the puff), `sound.back_unrounded_vowel` ("say oh, then spread your lips"), `tone.dipping` ("in fast speech you often hear
    only the low dip"), `tone.neutral`.
12. **[CHECK] Glosses.** 麻 "hemp" (also "numb"); 吗 "question particle"; 怕 "to be afraid"; 中 "middle, center" (also 中国 China).
13. `spelling.predictability` = `low` as briefed, which describes the **character** layer. Pinyin is highly predictable
    (`high`): the fact has one value per language, so the pinyin side is not represented.
14. Overview: `related_language_tags` `yue` (Cantonese, a sister Sinitic language) and `my` (Burmese, a distant Sino-Tibetan
    relative) as briefed. I left out `ancestor_language_tags` (Old/Middle Chinese, `och`/`ltc`): not in the brief and I do not
    know whether those tags exist in the registry. `reach.regions` is only `asia` as briefed (large diaspora communities are not
    modelled). The tag `zh` is used for Standard Mandarin (ISO 639-3 `cmn`); the lesson name should say Mandarin or Chinese
    deliberately.
15. Punctuation: `writing.hanzi.punctuation` = 。 (full stop) and 、 (enumeration comma), each with an example. Comma, question mark
    and exclamation mark exist in full-width form and look like English ones, so they are not listed. Book-title marks 《 》 are
    not included.

## D. Labels I reused instead of re-supplying (they already exist in `locales/en/topics/*.json`)

`region.asia`, `script.Latn`, `mark.acute` ("acute accent"), `mark.grave` ("grave accent"), `sound.front_rounded_vowel`
(used for ü; the existing text, "Say ee with your lips rounded as if for oo", fits). If any of these is renamed in the new
locale, `zh` needs the same id.

## E. Bridge `bridge-en-zh.json`

Eleven English words that came from Chinese; none are look-alike cousins and the note text says so. Direct source varies, so
**[CHECK] each**:

| English | Chinese shown (Mandarin) | Direct source, per what I could confirm |
|---|---|---|
| tea | 茶 chá | **Hokkien** tê (Amoy) via Dutch *thee*; the Mandarin cognate is chá. (English "cha" came via Cantonese/Portuguese) |
| kung fu | 功夫 gōngfu | Wiktionary: Wade–Giles of **Mandarin**; Wikipedia's list says **Cantonese** gung1 fu1. Sources disagree |
| tofu | 豆腐 dòufu | via **Japanese** tōfu, from Chinese dòufu |
| ginseng | 人参 rénshēn | Wiktionary: **Hokkien** jîn-sim; several dictionaries: **Mandarin** rénshēn. Sources disagree |
| kowtow | 叩头 kòutóu | Cantonese kau3 tau4 **or** Mandarin kòutóu; Merriam-Webster cites Mandarin. Sources disagree |
| yin and yang | 阴阳 yīnyáng | Mandarin |
| feng shui | 风水 fēngshuǐ | Mandarin |
| tai chi | 太极拳 tàijíquán | Mandarin (the English word is a shortening of "tai chi chuan", Wade–Giles). Wiktionary lists 太极 tàijí as the source word; I show the full martial-art name |
| oolong | 乌龙茶 wūlóngchá | Mandarin wūlóng **or** Hokkien o͘-liông; disputed |
| pinyin | 拼音 pīnyīn | Mandarin |
| dim sum | 点心 diǎnxin | **Cantonese** dim2 sam1; the Mandarin reading of the same characters is shown |

- The note text says only that "some came straight from Mandarin; others through Hokkien, Cantonese or Japanese", and that the
  Chinese shown is "the Mandarin word with the same characters". It does not say which word came by which route.
- Skipped on purpose: typhoon (disputed), wok, lychee, chow mein, ketchup, mahjong (Cantonese, Hokkien or Wu, and the Mandarin
  word is a different word), gung-ho (Mandarin 工合, but not an everyday word), shih tzu (the Mandarin shīzi has apical vowels
  that are awkward in IPA), ginkgo and soy (came through Japanese).
- `note_id` is `look_alike_words`, matching the other bridges (el uses it for English words from Greek). The note is
  `helpful_transfer`; the `to_ipa` strings separate syllables of a word with a space.
- **No `false_friend` note.** I found no true false friends between English and Mandarin words. The old Tier 1 check in
  `validate-curriculum-v2.mjs` (`checkBridge`) requires one; for a borrowed-words bridge that requirement should be relaxed, as
  INTRO_FACTS.md already describes for pairs with no cognates.

## F. Hints for the copy author (not data)

- Writing: 日 is a picture of the sun (Wiktionary says so explicitly). The other pictures are the usual textbook ones, not
  checked here: 人 (a person seen from the side), 大 (a person with arms stretched out), 水 (flowing water), 山 (three peaks),
  月 (a crescent moon), 木 (a tree), 口 (an open mouth). Compounds: 林 (two trees = forest), 好 (woman + child = good),
  明 (sun + moon = bright), 休 (person + tree = rest).
- Pinyin looks like English but several letters do not sound the same (c, q, x, z, j, zh, ü). `looks_like` is defined for a
  symbol that resembles a different Latin letter; it does not cover the same letter with a different sound, so I added no
  facts for this. The tricky sounds q, x, zh, sh, r and ü cover the biggest traps.
