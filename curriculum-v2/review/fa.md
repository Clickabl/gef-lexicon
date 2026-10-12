# Persian (`fa`, standard Iranian Persian): needs, conventions and items to check

All content is `candidate`, nothing is verified. Items marked **[CHECK]** are where a native-speaker or linguist reviewer should look first.

How this was checked: the four realizations, the English locale additions and the bridge were overlaid on a fresh scratch copy of `gef-lexicon` (the live tree as of today, with ar el en es fr it ja ko pt ru sw tr uk zh already in it) and `scripts/validate-curriculum-v2.mjs` passed with `fa` as `completeness: "complete"`, `slots_version: 2` (the check includes the new U+2014 rule; no em dash or en dash is used in any file of this drop). Removing one gloss and one label in the copy made it fail, so the check does reach `fa`. I also simulated the script lesson's drill logic (`introScript.ts`) on the letter data: no example word is repeated, every group keeps at least three distinct readings (so the match drill is built), and every "which letter is in the word you hear?" question has at least two usable distractors. The real tree was not touched.

Sources: en.wiktionary Persian entries (the `{{fa-IPA}}` template expanded through the MediaWiki API, "Iran, formal" line, used for every word's IPA; Wiktionary's translit argument gave the vowels) and English etymology sections (every loanword and cognate in the bridge); en.wikipedia "Persian alphabet" (32 letters, letter names, non-joiners, nine letters used mainly in Arabic loans, ک and ی versus Arabic ك and ي, Persian digits, zero-width non-joiner), "Persian phonology" (consonant and vowel inventory, ق/غ, the tap ر, stress), "Persian grammar" (SOV, the object marker را, ezafe, no articles, no gender, the mi- prefix, the تو / شما distinction, the particle آیا).

## 1. Vocabulary and labels

**No new slot vocabulary was needed.** Every value is in `slots.json`: `abjad`, `Arab`, `rtl`, `marks_optional`, mark ids `fatha kasra damma sukun shadda hamza maddah`, mark roles `short_vowel no_vowel doubling glottal_stop vowel_quality`, `tones.system: none`, `stress: mostly_final`, `predictability: low`, `word_building: inflecting`, `noun_gender: none`, `classifiers: none`, `formal_you: distinct`, `verb_endings: many`, `subject_pronouns: often_dropped`, `cases: none`, `dual_number: none`, `adjective_position: after_noun`, `articles: none`, `questions: intonation_or_inversion`, `word_order: sov`.

**New ids used in the data** (a registry of ids, if one exists, may want them): branch ids `iranian`, `western_iranian` (in that order, so the "Where it comes from" scene says "Western Iranian"), sound-variety `standard_persian`, ancestor tag `pal` (Middle Persian, ISO 639-3; drop it if the app resolves ancestor tags against the registry).

**New label ids, written in `locale-en.json`** (none exists in the live locale today; no collisions were reported by the overlay):
- language_overview: `branch.iranian`, `branch.western_iranian`
- writing_system: `mark.hamza`, `mark.maddah`, `markrole.glottal_stop`
- sound_system: `sound.fa_gh`, `sound.fa_aa`, `sound.fa_glottal`, `sound.fa_same_sound`, `sound.fa_vav`
- grammar_glance: none

`mark.hamza` and `mark.maddah` are not prefixed with `fa` because the app builds the label key from the mark id (`mark.${mark_id}` in `introScript.ts`). Any other Arabic-script language (Urdu, Pashto, Kurdish) will want the same two labels and `markrole.glottal_stop`, so a collision is likely when another drop is merged. The texts are generic and true for all of them.

**Existing labels reused, so not rewritten:** `family.indo_european`, `region.asia`, `script.Arab` ("Arabic script"), `layer.arabic`, `layer.arabic.lesson` ("Learn the Arabic alphabet"), `mark.fatha mark.kasra mark.damma mark.sukun mark.shadda`, `markrole.short_vowel markrole.no_vowel markrole.doubling markrole.vowel_quality`, `sound.velar_fricative` (خ), `sound.tapped_r` (ر), `stress.mostly_final`, `predictability.low`, and every `trait.*` value label.

**[CHECK] The script lesson is titled "Learn the Arabic alphabet" for Persian**, because the brief says to reuse layer id `arabic` and its labels. The alphabet is the Perso-Arabic one (the Arabic letters plus پ چ ژ گ), so "Learn the Persian alphabet" would read better, but a per-layer label cannot say that without also changing Arabic's title. Options for the maintainer: a per-language override of `layer.arabic.lesson`, or a separate layer id `persian`. I did not add `layer.arabic.note` for the same reason (any note would also show under Arabic).

## 2. Conventions I chose (please confirm or change)

**One layer, `arabic`.** `kind: abjad`, `script: Arab`, `role: primary`, `direction: rtl`, `has_case: false`, `joined: true`, `vowels: marks_optional`. There is no second layer: Latin transliteration ("Fingilish") is informal and not a standard.

**`symbols` (33): the 32-letter Persian alphabet plus آ**, in dictionary order: آ ا ب پ ت ث ج چ ح خ د ذ ر ز ژ س ش ص ض ط ظ ع غ ف ق ک گ ل م ن و ه ی. آ is a symbol (not a mark) because Persian dictionaries list it as a first letter of its own, it is spelled with one precomposed code point (U+0622), and the validator only lets `symbols` appear in groups. Wikipedia counts it as a variant of ا (hence "32 letters"). The letters are the Persian forms: ک U+06A9 and ی U+06CC, never Arabic ك U+0643 and ي U+064A.

**Effect on a learner who reads Arabic (script lesson in short mode).** Symbols are compared by code point after NFC, so ک and ی count as "new" to an Arabic reader (they are different code points and shaped a little differently: Persian ی has no dots in its isolated and final forms), as do پ چ ژ گ. The short lesson therefore shows ی, ک, پ چ ژ گ and « (and the marks `hamza` and `maddah`, because the Arabic file has no mark facts with those ids, although Arabic readers know the shapes). That is honest but slightly over-inclusive; if the app ever folds ك/ک and ي/ی it will drop to پ چ ژ گ and «. There is no schema field to say "same letter as Arabic X", and writing it into the realization would be a pair-sensitive fact (the contract keeps those in bridges).

**Groups (9, sizes 3 to 5, every symbol once).** Teaching order by shape family, the four Persian-only letters last as a group of their own, so they are called out in the group order (the schema has no per-letter note field, and a "not in Arabic" flag would be pair-sensitive, see above):
1. آ ا د ذ (the tall stroke and the dal shape: letters that never join forward)
2. ر ز و (the descending hooks, and vav)
3. ب ت ث ن ی (the toothed family, told apart by dots)
4. ج ح خ (the jim shape)
5. س ش ص ض (the sin and sad shapes)
6. ط ظ ع غ (the tah and ain shapes)
7. ف ق ک (loops and bowls)
8. ل م ه
9. پ چ ژ گ (the four letters Persian added to the Arabic alphabet: پ is ب with three dots, چ is ج with three dots, ژ is ز with three dots, گ is ک with a second stroke)

Alternative if you prefer each Persian-only letter beside its look-alike (the layout I first drew): 1 آ ا د ذ, 2 ر ز ژ و, 3 ب پ ت, 4 ث ن ی, 5 ج چ ح خ, 6 س ش ص ض, 7 ط ظ ع غ, 8 ف ق ک گ, 9 ل م ه. It is also valid with the same example words. I chose the dedicated group so a learner (and an Arabic reader in short mode, who then gets one group of four instead of four single-letter groups) meets the extra letters together, and so the drills inside group 9 are between four clearly different shapes. No example word in a group contains another letter of the same group.

**`reading` (a Latin transliteration), shared by letters that sound alike on purpose.** ث س ص all read `s`; ذ ز ض ظ all read `z`; ح ه `h`; ط ت `t`; ق غ `gh`; ا آ `ā`; ع and the hamza letters `ʼ`. Persian really pronounces them alike, and the app's sound question already removes distractors with the same reading (`introScript.ts`, `soundQuestion`), so "Which one says s?" never offers a second correct answer; the match drill drops duplicate rights, and every group still has at least three distinct readings. A scholarly scheme (ṣ ẓ ṯ) would give unique readings but would teach spellings that do not change the sound. The identity of each letter is carried by its `name` (ثِ se, سین sin, صاد sād). `و` reads `v/u/o` and `ی` reads `y/i` (the brief allows slashed readings): their main `sound` is the consonant (v, j) because the examples وان and یخ show it, and the vowel use is taught in `sounds.tricky.vav`. The hamza letters ء أ ؤ ئ all read `ʼ` (so their short chunk has no match drill, only hear and word questions).

**Vowel transliteration is `ā` (macron), not `â`.** It matches the existing Arabic file (dāl, ghāf) so that the same letter reads the same in both languages. Many Persian textbooks write `â`; `a e o` are written as in the standard romanizations.

**`name` format** follows the Arabic file: the letter's own name in Persian script with its transliteration, e.g. `دال (dāl)`, `بِ (be)`. Names are the ones Iranian schools use (Wikipedia "Persian alphabet"). The two he letters are told apart as `حِ جیمی (he-ye jimi)` and `هِ (he)` so the "which one is called ...?" question has one answer. Names are not given to the hamza seats أ ؤ ئ (they are descriptive phrases). **[CHECK]** the names `الف مَدّه (alef madde)` for آ and `عین (eyn)`, `غین (gheyn)` (spelled in the Persian way, not ʿayn/ghayn).

**`forms`** are written as in the Arabic file: letter plus tatweel (U+0640), isolated, initial, medial, final, and two entries `[isolated, final]` for letters that do not join forward. Non-joiners here: آ ا د ذ ر ز ژ و (and أ ؤ). The shapes themselves (the two-eyed medial ـهـ, the Persian ی without dots at the end) are chosen by the font from the code points ه U+0647 and ی U+06CC.

**`looks_like`** only on ا (`I`), as in the Arabic file.

**Examples** (`writing.arabic.example.*`, one per symbol): short (at most 7 letters), concrete, mostly native words; written as in real text, without vowel marks, with the `ipa` carrying the reading. Loans and Arabic-origin words are used where the letter itself occurs mainly in them (ث ذ ض ظ ص ح ط ع غ are mainly Arabic-loan letters, Wikipedia): مثلث, ذرت, مریض, ظرف, صندلی, حمام, طلا, عسل, غار. **[CHECK]** that none reads oddly:
- ژ: `ژاکت` (jacket, a French loan). Native ژ words are rare; `مژه` (eyelash) has two pronunciations (moʒe, meʒe) so I did not use it.
- ا: `نان` (bread) shows ا as the long vowel /ɒ/ inside a word. Word-initially ا only carries a short vowel (/æ e o/ after a glottal stop: اسب /æsb/), which is not shown as a separate example.
- ت: `تخت` means "bed" and "throne".
- ض: `مریض` ends in ض (a word starting with ض is not a concrete everyday noun). `حوض` was avoided because of the /ow/ diphthong.
- ث: `مثلث` (triangle) has two ث. ث-initial words (ثانیه) contain ن and ی, which are in the same group.
- غ: `غار` (cave); `غذا` (food) has the variants ghazā and ghezā.
- ذ: `ذرت` (corn), said with a doubled r (zorrat).
- Letters that also name sounds elsewhere: ه is /h/ in هویج; its other uses (final /e/, as in خانه) are not shown as separate examples.

**`marked` (4)** = ء أ ؤ ئ, the glottal stop and its seats (carriers), each with an example and `sound: ʔ`: جزء, مأمور, مؤمن, رئیس. They are outside `symbols`, so the app teaches them in a short group after the 9 groups (it chunks variants and then punctuation in fours). Not covered: ة (appears in Persian only in a few Arabic loans), ۀ and the ezafe hamza ٔ above a final ه (see below), إ (rare), ى (rare), the lam-alef ligature, the Persian digits ۰ to ۹ (U+06F0 to U+06F9, with ۴ ۵ ۶ shaped differently from the Arabic digits; the schema has no slot for digits).

**`punctuation` (4)** = ، ؟ ؛ « (Persian comma, question mark and semicolon are mirrored; the quotation marks are « and », only the opening one is listed, as in the Russian file). The validator exempts punctuation from `sound` and `reading`, so none is given. Not covered: the zero-width non-joiner (ZWNJ, U+200C, "half-space", نیم‌فاصله), which Persian needs for می‌روم and کتاب‌ها (it is invisible, so it cannot be a lesson tile; the grammar examples contain it as the real character) and the dash (U+2014 is not used anywhere, and Persian does not use a dash as a lesson symbol).

**Marks (7)**, shown on د (short vowels) as the minimal set دَر دِل دُم (door, heart, tail), then:
- `fatha` دَ, `kasra` دِ, `damma` دُ: role `short_vowel` (Persian zabar, zir, pish; the existing labels name them fatha, kasra, damma). Persian writes these marks almost never outside textbooks and dictionaries. **[CHECK]** an optional extra line in the lesson copy giving the Persian names zabar, zir, pish; I could not add them without changing the shared `mark.*` labels.
- `sukun` فْ (هَفْت): role `no_vowel`. Persian uses it very rarely.
- `shadda` وّ (اوّل, "tashdid" in Persian): role `doubling`; gemination exists in Arabic loans (ævvæl).
- `hamza` ئ (مسئله): role `glottal_stop`.
- `maddah` آ (آسمان): role `vowel_quality` (آ = glottal stop plus /ɒ/; I did not use `length` because its label says "makes the vowel before it long", which is Arabic and not true here).
- `tanwin` is left out: Persian uses only the fathatan, on a few Arabic adverbs (مثلاً), and the only existing role for it, `case_ending`, has a label ("shows its role in the sentence") that is false for Persian.
- `mark.hamza` and `mark.maddah` repeat the shapes of the letters ئ and آ that are also lesson tiles (once as a letter, once as a mark with a different word). It follows the brief ("include ... hamza, maddah"); if you find the duplication distracting, delete the two mark facts and their two glosses and two labels.

**The ezafe (not a mark fact).** The linking vowel -e that joins a noun to its adjective or possessor (کتابِ خوب, ketābe xub) is almost never written; learner materials show it as a kasra, and after a final vowel it is -ye (خانهٔ من written with a small hamza above ه, or خانه‌ی من). It is in the grammar examples (`trait.adjective_position`), where the IPA shows the -e and the gloss says it is not written. **[CHECK]** whether a short "ezafe" note belongs in the lesson copy, since it is the first thing a beginner sees in real text.

**IPA conventions.** Broad phonemic, variety `standard_persian` (Tehran), adapted from Wiktionary's "Iran, formal" transcription: tie bars and the narrow aspiration and devoicing marks removed, ɾ for ر, ɡ is U+0261, vowels written without length marks (the Iranian standard has no phonemic length: i e æ ɒ o u; Wiktionary and Wikipedia write ɒː iː uː for long vowels, which I left out as the brief says "no length contrast as a rule"). Word stress is not marked (see Sounds). `ŋ` is not a phoneme: it is written n in رنگ (ɾænɡ) and جنگل (dʒænɡæl) although it is said [ŋ] before ɡ. `ɢ` is used for both ق and غ (see below).

## 3. Sounds

- `sounds.consonants` (23): p b t d k ɡ ɢ ʔ tʃ dʒ f v s z ʃ ʒ x h m n l ɾ j. `sounds.vowels` (6): i e æ ɒ o u. For an English reader the "new" ones are ɢ ʔ-as-a-consonant x ɾ ɒ. **[CHECK]** Wikipedia gives /q/ for ق and /ɣ/ for غ as separate phonemes and says they are often pronounced identically ([ɢ], and [ɣ] ~ [ʁ] between vowels); Wiktionary's Iranian transcription writes [q] and [ɢ] depending on the entry. I merged them as `ɢ` (the brief: "/q/ vs /ɣ/ merger") and the label says it softens between vowels. Many Iranian dialects (and Afghan Persian) keep ق and غ apart.
- Seven `sounds.tricky.*` (no tricky word contains another tricky spelling): `gh` قلم (ق, ɢ), `kh` خنده (خ, x, reuses `sound.velar_fricative`), `glottal` عسل (ع, ʔ), `aa` نان (ا, ɒ), `r` رنگ (ر, ɾ, reuses `sound.tapped_r`), `same_sound` صندلی (ص, s: the many letters that share one sound), `vav` دوست (و, u: و is not only v). Pharyngeals are lost: ع and ح are said as a glottal stop and as h.
- Three contrast pairs, all real minimal pairs: ماه / مه (moon, fog: ɒ or æ), قلم / کلم (pen, cabbage: ɢ or k), حال / خال (condition, beauty spot: h or x). The pair 1 label (`fa_aa`) and pair 2 label (`fa_gh`) are the same as the tricky ones; pair 3 reuses `velar_fricative`. A fourth pair مزه / مژه (taste, eyelash) is real but ʒ is not tricky for English and I left it out.
- `tones.system: none`. `stress.pattern: mostly_final` **[CHECK]**: most nouns and adjectives are stressed on their last stem syllable, verbs follow rules of their own (the prefixes می- and نه- carry the stress), and personal endings and enclitics are never stressed (Wikipedia "Persian phonology"). The generic label says "most words", which is a fair summary.
- `spelling.predictability: low` **[CHECK]** as the brief asks (short vowels are not written, so a beginner cannot read a word aloud from its letters). The consonants are mostly predictable and several letters share one sound (see `sound.fa_same_sound`), so `medium` is defensible.
- Label wording **[CHECK]**: "a g made behind the g of go" (ق/غ), "a rounded aw ... like the aw of law" (ɒ), the glottal stop note, the many-letters-one-sound list, and دوست "doost". These are pedagogical, not phonetic.

## 4. Grammar traits (every slot filled)

- `noun_gender: none` (and no gender in pronouns: او means he and she), `classifiers: none` (the counters تا and نفر are optional: دو کتاب is fine), `dual_number: none`, `cases: none` (nouns do not change; the object marker را is a separate word, shown in the word-order example).
- `formal_you: distinct`, `informal: تو`, `formal: شما` **[CHECK]**: Persian also has taarof (ritual politeness) and honorific verbs; `levels` is the other candidate, but the contrast most learners meet is تو and شما.
- `verb_endings: many`, `example_verb: رفتن` (six endings, mi- prefix). `subject_pronouns: often_dropped` (the example دوستت دارم "I love you" has no pronoun).
- `adjective_position: after_noun` (with the ezafe). `questions: intonation_or_inversion`: a yes-no question is a statement with rising intonation; the particle آیا exists but is formal and written. `word_order: sov`; the second example shows را marking a definite object.
- `articles: none` **[CHECK, imperfect fit].** There is no definite article in the standard language, and no indefinite article word either, but there is an indefinite suffix -ی (کتابی, "a book") and the numeral یک, and colloquial Persian has a definite -e. The slot has no "indefinite only" value, so `none` is the closest. I gave no example, because the label says "no words for the or a".
- `word_building: inflecting` **[CHECK, imperfect fit].** Persian is a regular suffixing language (plural -hā, personal endings, می-, ezafe, ـی) and is often called agglutinative-leaning; the label for `agglutinating` ("one long word can be a whole sentence") overstates it, so I chose `inflecting` ("words change their endings to show who, when and how many"). The examples are کتاب‌ها and می‌روم, with the real ZWNJ.
- There are no `noun.*` facts (no gender), and the gender check is skipped. All the generic trait labels used (`none`, `distinct`, `many`, `often_dropped`, `after_noun`, `sov`, `inflecting`, `intonation_or_inversion`) read correctly for Persian except as noted above.

## 5. Overview

- `family_id: indo_european`, `branch_ids: [iranian, western_iranian]`: the app treats a shared branch id as "same branch", so Kurdish (Western Iranian) will read as a close cousin and a language listing only `iranian` (Pashto, Eastern Iranian) as a cousin in the wider branch. Persian is Southwestern Iranian more precisely; I stopped at Western Iranian to keep the chip short. **[CHECK]**
- `related_language_tags`: `tg ku ckb ps`. `tg` (Tajik) is only listed under `candidateNames` in the registry, not yet a learn-from language; replace it if the app needs registry tags only. Urdu (`ur`) is not listed because it is Indo-Aryan (a vocabulary neighbour, not a relative at the Iranian level); Dari has no registry tag.
- `origin_region_ids: [asia]`, `reach.regions: [asia]` **[CHECK]**: Persian is spoken in Iran, Afghanistan (Dari), Tajikistan (Tajik) and by large communities in Europe and North America; I listed only the region where it is a national language.
- Hook: `hook.target` سلام (sælɒm, "hello"), decoys ممنون (thanks) and بله (yes). The hook facts carry `reading` (salām, mamnun, bale), as the Chinese and Russian files do.

## 6. Bridge (`bridge-en-fa.json`)

- English and Persian are distant cousins (both Indo-European), so the bridge is mostly **English words that came from Persian**, then nine **real cognates**. One `helpful_transfer` note, as asked (the app shows the first note's text only), 21 pairs; its text says honestly which group is which.
- Loanwords (12), each checked in the English Wiktionary etymology: bazaar (بازار), caravan (کاروان), pyjamas (پاجامه, Persian "pāyjāma", today "trousers"; Iranians usually say پیژامه for pyjamas, a re-borrowing from English), paradise (پردیس), shawl (شال), khaki (خاکی), kiosk (کوشک), jasmine (یاسمن), orange (نارنج, "bitter orange"), shah (شاه), dervish (درویش), candy (قند). Caveats: most came through Turkish, Arabic, Hindi or French; `to_meaning` is given where the Persian meaning differs (pyjamas, paradise, khaki, kiosk, orange, shah, dervish, candy). **paradise** comes from an ancient Iranian word that Persian also kept as پردیس (Wiktionary: Proto-Iranian *paridayjah); strictly it is a cousin, not a direct loan. **shawl**: the English comes from Persian via Hindustani, but Wiktionary says the Persian شال itself is from an Indo-Aryan language. **candy** came through Arabic, from Persian قند, and ultimately from Sanskrit. **[CHECK]** the Persian forms and IPA: پاجامه (pɒdʒɒme), نارنج (nɒɾendʒ, also nɒɾændʒ), کوشک (kuʃk), یاسمن (jɒsæmæn), قند (ɢænd).
- Cognates (9): father/پدر, mother/مادر, brother/برادر, daughter/دختر, name/نام, new/نو, mouse/موش, star/ستاره, two/دو. Each descends from the same Proto-Indo-European root (checked in the Wiktionary Persian etymologies; the p/f in father and the vowel changes hide most of it). Wiktionary also lists is/است and three/سه, which I left out to keep the list short.
- Considered and left out: **lilac** (via Arabic from Persian نیلک, but the modern Persian word is not clear), **bronze** (origin uncertain), **azure** (Persian لاجورد, but its Iranian pronunciation is uncertain), **pistachio** (the Iranian origin is not certain), **sherbet** and **checkmate** (the Persian words are Arabic or rare today), **taffeta**, **divan**, **jackal**.
- **No `false_friend` note.** Sound-alikes exist (man / من = "I", dust / دوست = "friend", to / تو = "you", do / دو = "two", car / کار = "work"), but they are accidental, they differ in script (the generic card says "Looks like ..."), and the brief asks for true false friends only. Say if you want them as a note.

## 7. Facts to be checked by a native speaker or linguist

Writing
- **[CHECK]** all 33 letter names and transliterations, and the 41 example words with their IPA (Wiktionary "Iran, formal", simplified as above), in particular ذرت (zorrat), ژاکت (ʒɒkæt), مثلث (mosællæs), مریض, صندلی, رئیس (ɾæʔis), مسئله (mæsʔæle).
- **[CHECK]** the choice of `ɢ` for ق and غ, `ɒ` for ا and آ, no vowel length.
- **[CHECK]** `forms` for آ (a final form ـآ exists but is "very rare and freely replaced with ordinary alef") and for the hamza seats; `looks_like: I` on ا.
- **[CHECK]** group order, the dedicated final group for پ چ ژ گ, and whether ا آ د ذ (no joining, simplest shapes) is a good first lesson.
- **[CHECK]** readings `v/u/o` and `y/i`, `ʼ` for ع ء and the seats, and shared readings for homophone letters (see section 2).
- **[CHECK]** the punctuation names (ویرگول, علامت سؤال, نقطه‌ویرگول, گیومه) and the sentences used as examples.
- **[CHECK]** mark examples دَر دِل دُم هَفْت اوّل مسئله آسمان (IPA ɒsmɒn; some say ɒsemɒn) and the `vowel_quality` role for maddah.

Sound
- **[CHECK]** the label wording and the stress and predictability values listed in section 3; `چطوری`/`چطورید` IPA (tʃetoɾi, tʃetoɾid; Wiktionary shows an /ow/ in چطور).

Grammar
- **[CHECK]** `word_building`, `articles`, `formal_you`, `questions`, as explained in section 4, and the English glosses of the grammar examples (all are plain meanings).

Bridge
- **[CHECK]** the loanword list and the Persian IPA, as explained in section 6.
