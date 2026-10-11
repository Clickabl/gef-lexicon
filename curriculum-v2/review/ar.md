# Arabic (`ar`, Modern Standard Arabic): needs, conventions and items to check

All content is `candidate`, nothing is verified. Items marked **[CHECK]** are where a native-speaker or linguist reviewer should look first.

How this was checked: the four realizations, the English locale additions and the bridge were overlaid on a scratch copy of `gef-lexicon` and `scripts/validate-curriculum-v2.mjs` passed with `ar` treated as `completeness: "complete"` (every slot, example, label and gloss present). Removing one gloss in the copy made it fail, so the check does reach `ar`. The real tree was not touched.

## 1. Vocabulary and labels

**No new slot vocabulary was needed.** Every value used is already in `slots.json`: `abjad`, `Arab`, `marks_optional`, `rule_by_syllable_weight`, `root_and_pattern`, `dual_number: present`, `questions: particle`, mark role `case_ending`, mark ids `fatha kasra damma sukun shadda tanwin`. The generic labels for these values already exist in the live English locale (`kind.abjad`, `vowels.marks_optional`, `trait.word_building.root_and_pattern`, `trait.dual_number.present`, `trait.questions.particle`, ...).

**New ids used in the data** (the maintainer may want them in any registry of family, branch or layer ids): `family_id afro_asiatic`, `branch_ids semitic`, layer id `arabic`.

**New label ids, written in `locale-en.json`** (none of them exists in the live locale today, no collisions):
- language_overview: `family.afro_asiatic`, `branch.semitic`
- writing_system: `script.Arab`, `layer.arabic`, `mark.fatha`, `mark.kasra`, `mark.damma`, `mark.sukun`, `mark.shadda`, `mark.tanwin`, `markrole.short_vowel`, `markrole.no_vowel`, `markrole.doubling`, `markrole.case_ending`
- sound_system: `sound.pharyngeal_voiced`, `sound.pharyngeal_voiceless`, `sound.emphatic`, `sound.uvular_stop`, `sound.gargle_fricative`, `sound.glottal_stop`, `sound.vowel_length`

**Existing labels reused, so not rewritten:** `sound.velar_fricative` (for خ), `sound.double_consonant` (for the shadda contrast pair), `region.asia`, `region.africa`, `direction.rtl`. The four contrast pairs carry a `note_id` each (`vowel_length`, `emphatic`, `uvular_stop`, `double_consonant`); all four have a label, either new (first three) or reused (last).

**Generic label that reads wrongly for Arabic [CHECK]:** `trait.formal_you.none` says "{language} has just one “you”". Arabic has no polite/informal split (so `none` is right for the slot), but it does have separate "you" for a man, a woman, two people and groups (أنتَ / أنتِ / أنتما / أنتم / أنتنّ). Consider a different sentence for `none`, or a future slot for gendered "you". I did not add a `formal_you` example for `none`.

## 2. Conventions I chose (please confirm or change)

- **`gender` values are `masculine` / `feminine`**, not `masc` / `fem`. The brief said "consistently with the trait's `values` qualifier", the validator requires the gender to be one of `trait.noun_gender`.qualifiers.values, and the live locale already has `gender.masculine` / `gender.feminine`. `trait.noun_gender` carries `values: ["masculine","feminine"]`.
- **The article is invariable.** Every `noun.n` has `article: "ال"` (al-), written joined to the noun, so `value` is the bare noun and the app must join them without a space (ال + كتاب = الكتاب). An "article for this noun" quiz (`q.article_for_noun`) is degenerate for Arabic (always the same answer); suggest skipping it when the trait's `articles` list has one entry. Gender quiz is fine. All six nouns start with a "moon letter" (ك م ب ج ق م), so the article is always pronounced `al-`; no sun-letter assimilation (as-sayyāra, ash-shams) is needed, which is why شمس and سيارة were avoided.
- **`forms` (positional shapes)** are written with the real letter plus tatweel (U+0640): isolated = the letter, initial = letter + ـ, medial = ـ + letter + ـ, final = ـ + letter. It renders the right shape in any Arabic font and survives NFKC (Presentation Forms would not). **For the six letters that do not join forward (ا د ذ ر ز و) the list has two entries: [isolated, final]**, so length 4 means a full set and length 2 means "joins only to the right". The current validator accepts 2 to 4 entries. If the app indexes `forms[3]` as "final" this needs a branch on length; the alternative is always four entries with initial = isolated and medial = final.
- **`name` format** follows the Greek files, "Arabic (transliteration)": `أَلِف (alif)`. Names carry short-vowel marks so beginners can read them. The brief's example was `أَلِف alif`; trivial to switch. Hamza-seat variants (أ إ آ ؤ ئ) have no `name` because their Arabic names are descriptive phrases (alif with hamza above, ...), so I left it out rather than guess; `ء`, `ة`, `ى` have one.
- **Transliteration scheme** (names only): ā ī ū long vowels, ʾ hamza, ʿ ʿayn, ḥ ṣ ḍ ṭ ẓ dotted emphatics, th dh kh gh sh digraphs.
- **`looks_like`** is set only on alif (a plain vertical stroke, like I or l). No other Arabic letter resembles a Latin letter closely enough to be honest.
- **Vocalization.** Letter examples (`writing.arabic.example.*`) are written unvocalized, as in real text; the `ipa` gives the reading. Words in `sounds.*`, `writing.arabic.mark.*` and the grammar section are written with their short vowels (that is the point there). In grammar examples the case-ending marks are left off (citation or "pausal" form, as in a textbook word list and in IPA with no final -u/-a/-i) **except** `trait.cases.*` and `trait.word_order.*`, where the endings matter. **[CHECK]** a sentence like قَرَأَ الْوَلَدُ الْكِتَابَ has IPA `qaraʔa lwaladu lkitaːb` (elision of al- after a vowel, pausal end).
- **IPA conventions.** Broad phonemic, variety `standard`, no stress marks (MSA stress is rule-based and varies by tradition, see below), long vowels `aː iː uː`, doubled consonants as doubled letters (`darrasa`), emphatics as `sˤ dˤ tˤ ðˤ` (U+02E4), jeem as `dʒ`, hamza as `ʔ`, yeh as `j`. Diphthongs (`aj`, `aw`) are not in `sounds.vowels`.
- **Length marks vs English.** `aː iː uː` and `sˤ` etc. will register as "new" against English (which has no length-marked vowels), although Arabic /iː/ and English /i/ are close. That is the comparison logic's call, but you may prefer to list short vowels only plus a separate length note.
- **Extra qualifiers beyond the contract:** `ipa` on grammar examples and on `noun.n`; `root` on `trait.word_building.example.*`; `to_meaning` on two helpful_transfer pairs (sofa, safari) where the Arabic word does not mean the same as the English word (the bridge schema allows it). Drop any you do not want.
- **`marked` (8 entries)** = ء أ إ آ ؤ ئ ة ى, each with its own example. The lam-alif ligature ﻻ, the Arabic-Indic digits and the rare alif wasla ٱ are not covered.
- **Mark symbols** are shown on ب (بَ بِ بُ بْ بّ بً). `tanwin` is given role `case_ending` (it writes the -un / -an / -in ending), which is the one honest use of that role; fatha/kasra/damma are `short_vowel`, sukun `no_vowel`, shadda `doubling`.
- **Genealogy.** No `ancestor_language_tags` (Classical Arabic has no separate tag from `ar`). `script_ids` is the ISO code `Arab` as the brief asked (the Greek file uses an older style `greek`). Hebrew and Amharic are relatives at the Semitic level only (Hebrew is Northwest/Central Semitic, Amharic is South Semitic); the `notes` field says so.
- **Bridge** has only a `helpful_transfer` note. I know of no genuine, verifiable English/Arabic false friend, so there is no `false_friend` note, as instructed. The current validator only requires six helpful_transfer pairs.
- The generator script is not kept in the delivery.

## 3. Facts to be checked by a native speaker or linguist

Sound
- **[CHECK]** ج as `dʒ`. Standard textbook value; regionally [ʒ] (Levant, Maghreb) or [ɡ] (Egypt, parts of Yemen and Oman).
- **[CHECK]** خ and غ as velar `x` / `ɣ`. Many descriptions give uvular [χ] / [ʁ] for the standard. I chose the velar symbols (the common learner convention, and the same symbols Greek uses so comparison works). The غ label (`sound.gargle_fricative`) describes it as a gargling uvular-like sound; خ reuses `sound.velar_fricative` ("soft clearing of the throat").
- **[CHECK]** ظ as `ðˤ` (some varieties say [zˤ]); ض as `dˤ`; ر as a plain `r` (trill or tap).
- **[CHECK]** label wording: "like fogging up a mirror" (ح), "heavy version of a sound you know, back of the tongue down and back" (emphatics), "a bit like the French r" (غ). Pedagogical descriptions, not phonetics.
- **[CHECK]** `stress.pattern: rule_by_syllable_weight`. Textbook MSA stress (last heavy syllable counted from the end) differs between traditions and regions. Word-level IPA therefore carries no stress marks.
- **[CHECK]** `spelling.predictability: medium`. Consonants and long vowels are spelled predictably; short vowels, case endings and doubling are usually unwritten (this is what `marks_optional` expresses). Fully predictable only with the marks written.
- Contrast pairs: جَمَل/جَمَال (camel/beauty), سَيْف/صَيْف (sword/summer), كَلْب/قَلْب (dog/heart), دَرَسَ/دَرَّسَ (he studied/he taught). I believe all are real minimal pairs; a reviewer should confirm.

Writing
- **[CHECK]** all 28 letter names with short vowels (notably زَاي vs the also-common زَيْن, ضَاد/ظَاء, ثَاء, طَاء/ظَاء) and every IPA for the 28 example words.
- **[CHECK]** alif's example باب shows the long-vowel role in the middle of a word, not the initial alif (which is normally hamzat wasl or hamza). The same applies to و and ي: examples show the consonant use (ولد, يد); their long-vowel use (/uː/, /iː/) is not shown separately.
- **[CHECK]** `writing.arabic.example.teh_marbuta` (مدرسة) IPA `madrasa` is the pausal form; in a construct or with a case ending it is -atu/-ati/-ata.
- **[CHECK]** punctuation examples: «كيف حالك؟» (`kajfa ħaːluk`) is gender-neutral in writing; «أنا طالب؛ هو أستاذ» (`ʔana tˤaːlib huwa ʔustaːð`).
- Hook: **[CHECK]** `hook.target` مرحبا IPA `marħaba` (the form heard in speech; the full MSA accusative form is marħaban). Decoys شكرا (`ʃukran`, thank you) and نعم (`naʕam`, yes) are common non-greetings; شكرا is a thanks formula.

Grammar
- **[CHECK]** `trait.questions: particle` (هل / أ at the start of yes/no questions is the MSA standard; rising intonation alone is common in speech and informal writing). If the maintainer prefers a spoken-language view, `intonation_or_inversion` is the alternative.
- **[CHECK]** `trait.word_order: flexible`. Verb-first (VSO) is the classical and formal norm, subject-first (SVO) is also common in modern news and speech; both are shown.
- **[CHECK]** `trait.cases: some`, `count: 3` (nominative -u, accusative -a, genitive -i). These endings are rarely written or pronounced in everyday speech; the lesson text should not suggest learners must produce them.
- **[CHECK]** `trait.dual_number` example 1: the third form كُتُب is a broken plural (used for 3 to 10 things); the gloss "books (three or more)" simplifies the numeral rules.
- **[CHECK]** `trait.formal_you: none` (see the label note above).
- **[CHECK]** noun genders: كتاب, بيت, قلم masculine; مدرسة, جامعة, مدينة feminine. `trait.noun_gender` examples use adjective agreement (جديد / جديدة) so the difference is visible even though the article is the same.
- **[CHECK]** `trait.word_building` examples: roots ك ت ب and د ر س with the four forms each. The wording "(all built on the root k-t-b)" is in the gloss.

Bridge (English words from Arabic)
- Each English word was checked against Wiktionary's etymology (coffee, sugar, lemon, cotton, algebra, giraffe, zero, sofa, safari, mosque, jar, artichoke, hummus); all trace to Arabic, often through Italian, Spanish, Turkish, Persian or Swahili. This is a secondary source, not a reviewed one.
- **[CHECK]** pronunciation and spelling of the Arabic side: ليمون (`lajmuːn` in MSA dictionaries, `liːmuːn` in many speakers), زرافة (`zaraːfa`, also `zuraːfa`), قطن (`qutˤn`, also `qutˤun`), حمص (`ħummusˤ`; the chickpea itself is often `ħimmasˤ`), جرة (also spelled جرّة), صُفَّة (written vocalized because unvocalized صفة usually means "attribute" in modern Arabic; today's Arabic word for a sofa is different, so it carries `to_meaning`), سفر (`safar`, journey).
