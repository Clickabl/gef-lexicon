# Russian (`ru`): needs, conventions and items to check

All content is `candidate`, nothing is verified. Items marked **[CHECK]** are where a native-speaker or linguist reviewer should look first.

How this was checked: the four realizations, the English locale additions and the bridge were overlaid on a scratch copy of `gef-lexicon`, and `scripts/validate-curriculum-v2.mjs` passed with `ru` as `completeness: "complete"` with `slots_version: 2` (every slot, example, group, label and gloss present). Removing a gloss and two labels in the copy made it fail, so the check does reach `ru`. The real tree was not touched. I also read the app's intro code (`introScript.ts`, `introSound.ts`, `introGrammar.ts`, `introShared.ts`, `introOverview.ts`) to see how the facts are used; where that changed a choice it is said below.

Sources: Wiktionary Russian pronunciation (the `{{ru-IPA}}` template, expanded through the MediaWiki API) for every word's IPA; en.wikipedia "Russian alphabet" (33 letters, letter names, `ъ`/`ь` described as silent, `ё` usually printed as `е`, acute stress mark only in learner materials); en.wikipedia "Russian grammar" (six cases, three genders, no articles, T-V distinction, adjectives before nouns); en.wikipedia "List of English words of Russian origin" and en.wiktionary etymology sections (vodka, borscht, steppe) for the bridge; en.wiktionary etymologies of сестра, соль, мышь, молоко for the cognates.

## 1. Vocabulary and labels

**No new slot vocabulary was needed.** Every value is already in `slots.json`: `alphabet`, `Cyrl`, `all_written`, mark id `acute` with role `stress`, `unpredictable`, `noun_gender: three`, `cases: some`, `formal_you: distinct`, `verb_endings: many`, `subject_pronouns: required`, `adjective_position: before_noun`, `articles: none`, `questions: intonation_or_inversion`, `word_order: flexible`, `word_building: inflecting`, `classifiers: none`, `dual_number: none`.

**New ids used in the data** (a registry of ids, if one exists, may want them): layer id `cyrillic`; branch ids `slavic`, `east_slavic` (in that order, so the "Where it comes from" scene says "East Slavic", the last one); sound-variety `standard_russian`; ancestor tag `orv` (Old East Slavic, ISO 639-3).

**New label ids, written in `locale-en.json`** (checked against the live locale: none exists today, no collisions):
- language_overview: `branch.slavic`, `branch.east_slavic`
- writing_system: `script.Cyrl`, `layer.cyrillic`, `layer.cyrillic.lesson`, `layer.cyrillic.note`
- sound_system: `sound.ru_soft_consonant`, `sound.ru_y_vowel`, `sound.ru_vowel_reduction`, `sound.ru_final_devoicing`, `sound.ru_zh`, `sound.ru_shch`, `sound.ru_stress_meaning`
- grammar_glance: none (every trait value label already exists)

**Existing labels reused, so not rewritten:** `family.indo_european`, `region.europe`, `region.asia`, `mark.acute` ("acute accent"), `markrole.stress`, `sound.trill` (for р), `sound.velar_fricative` (for х), `stress.unpredictable`, `predictability.medium`, `gender.*`, `register.*`, all `trait.*` value labels.

**Label choices to confirm:**
- `layer.cyrillic` is "Cyrillic", not "The Cyrillic alphabet" (as Greek has "The Greek alphabet"), because `kind.alphabet` reads "{layer} is an alphabet" and "The Cyrillic alphabet is an alphabet" is clumsy. `script.Cyrl` is "Cyrillic alphabet" ("Russian is written in the Cyrillic alphabet, left to right"). Change if you prefer the Greek style.
- `layer.cyrillic.note` is one extra sentence (the app reads `layer.{id}.note` in the writing intro, as for pinyin): "Everyday Russian leaves out stress marks and usually prints ё as е. Learner books put them back." This is where the "stress is written only in learner texts" point is made, next to the generic `stress.unpredictable` label.

## 2. Conventions I chose (please confirm or change)

**Letters and groups**
- `symbols` are the 33 letters of the modern alphabet in order, lowercase, `ё`, `й`, `ъ` and `ь` included as symbols (each is a separate letter, so no `ё` diaeresis mark and no `й` breve mark exist; the lesson shows capital and lower case together because `has_case` is true).
- Eight teaching groups of 3 to 5, easy-first, following the brief: (1) а к м о т, letters that look and sound like Latin; (2) е в н р, (3) с у х п, the false friends (`е` is a mild one: it reads "ye"); (4) б д л г ф, new shapes with familiar sounds; (5) з и й э; (6) я ю ё, the "soft" vowels; (7) ж ш ч щ ц, the hushing and hissing sounds; (8) ы ь ъ, the odd ones last. Every letter is in exactly one group, and no example word in a group contains another letter of the same group (so the app's "which letter is in the word you hear?" never has an ambiguous answer).
- `looks_like` is set on в (B), н (H), р (P), с (C), у (Y), х (X), е (e), п (n), ь (b), the resemblances that mislead. The capital forms are named for в н р с у х because that is where learners meet them (street signs, РЕСТОРАН); п and ь are lowercase shapes. Not set where a letter only resembles a digit or a mirrored letter (з, ч, и, я, э).
- `reading` follows a simple English-friendly transliteration (BGN/PCGN style: ye yo zh kh ts ch sh shch yu ya, `э` = e) **with one deliberate change [CHECK]**: `й` is `j` and `ы` is `y` (the ISO 9 values), so that all 33 readings are different (the app's sound questions and match drills filter or break on duplicates, and BGN would give both `й` and `ы` the reading `y`). An English reader may expect `y` for `й` ("may", "boy"); the IPA `/j/` is shown next to it.
- `ъ` and `ь` readings are the standard transliteration marks `ʺ` (U+02BA) and `ʹ` (U+02B9). **[CHECK]** how the app renders them ("ʺ · /ʔ/", "ʹ · /ʲ/").
- `name` follows the Greek and Arabic files, "Cyrillic (transliteration)": бэ (be), вэ (ve), гэ (ge), дэ (de), е (ye), ё (yo), жэ (zhe), зэ (ze), и (i), и краткое (i kratkoye), ка (ka), эль (el), эм (em), эн (en), о (o), пэ (pe), эр (er), эс (es), тэ (te), у (u), эф (ef), ха (kha), цэ (tse), че (che), ша (sha), ща (shcha), твёрдый знак (tvyordyy znak), ы (y), мягкий знак (myagkiy znak), э (e), ю (yu), я (ya). **[CHECK]** `э` is also called "э оборотное" (reversed e); I used the plain name.
- Example words are written plainly, without stress marks, as in real text; the `ipa` shows the stress. Words in the stress contrast pair and the `acute` mark example carry the acute (U+0301) because stress is the point there.
- Example words were chosen to be concrete, short (7 letters at most, `бабушка`, `попугай` and `подъезд` are the longest) and native where a native word is as common. Words that are loans but were the best picture-able choice for their letter: `фото`, `эхо` (almost every word starting with `ф` or `э` is a loan), `юбка`, and the old loans `арбуз`, `чай`, `попугай`. **[CHECK]** that none reads oddly: `мир` is "world, peace" (not very concrete); `три` is the number three; `подъезд` is the entrance or stairwell of an apartment block (the only everyday native word with `ъ` that is a plain noun).
- `sound` is the letter's own main sound, broad IPA: vowels a e i o u ɨ, `е ё ю я` as je jo ju ja (word-initially; after a consonant they only soften it, see `ь`), `ж ш щ ч ц` as ʐ ʂ ɕː tɕ ts, `х` as x, `г` as ɡ (U+0261).
- **`ъ` and `ь` [CHECK].** The honest description is that neither has a sound of its own (Wikipedia: "None (silent)"). The brief asked for the closest IPA, so `ь` has `sound: "ʲ"` (the softness it marks) and `ъ` has `sound: "ʔ"` (a slight break between a prefix and the following `е ё ю я`, which keep their /j/: подъезд [pɐdˈjest]). `ʔ` is a convenience, not a claim that Russians say a glottal stop; some speakers do and most just keep the /j/. If the app shows `/ʔ/` on the tile, a short caption "no sound of its own" would be more honest.

**Punctuation (the app treats punctuation as lesson tiles, with `sound` and `reading` shown)**
- `punctuation` is `«` and `—`: the guillemets (Russian "кавычки-ёлочки"; only the opening one is listed, because the closing `»` appears in the same example «Привет!») and the dash, which in Russian stands for "is" ("Папа — врач", Dad is a doctor).
- **[CHECK] workaround.** The validator wants a non-empty `sound` and `reading` for every example in a non-Latin layer, even for punctuation. I used `sound: "∅"` for «, `sound: "|"` (an IPA short pause) for —, and `reading: "quotes"` / `"dash"`. These render as "quotes · /∅/" and "dash · /|/". If you would rather not have punctuation in the lesson at all, set `punctuation` to `[]` and drop the two examples; nothing else depends on them.

**Marks**
- Only one: `acute` (stress), `writing.cyrillic.mark.acute`, value `о́` (о + U+0301), example `молоко́` (məlɐˈko). It is also listed in `marked` as the nine stressed vowels `а́ е́ и́ о́ у́ ы́ э́ ю́ я́`, which are not inventory letters and have no example facts of their own. Spanish and Greek readers already have `acute`, so the lesson skips it for them.

**Sounds**
- IPA is broad, adapted from Wiktionary's Russian pronunciation: reduced vowels are shown (ɐ ə ɪ ʊ), palatalization with ʲ, voicing assimilation and final devoicing applied. Simplified from Wiktionary: dark ɫ written l, ʉ written u, ɵ written o (ёж joʂ), the tie bars removed (ts, tɕ), the fronted a of чай [tɕæj] written a, and the optional (j) of еда written j. **[CHECK]** whether a phonemic (not reduced) transcription would suit the app's TTS and comparison better; I chose the reduced one because akanye is one of the featured sounds and the learner hears it.
- `sounds.consonants` lists the hard and soft pairs as separate symbols (p pʲ, b bʲ, ...) and the hushing sounds ʂ ʐ ɕː tɕ ts; `sounds.vowels` lists the six stressed vowels i ɨ u e o a (the reduced vowels ɐ ə ɪ ʊ are not listed). The "new sounds" comparison therefore marks ʲ-consonants, ɨ, ʂ ʐ ɕː, and r (for English) as new.
- Eight `sounds.tricky.*`: soft consonants (мать, spelling `ь`), ы (сын), the trilled р (рука, `sound.trill` reused), unstressed о (молоко, ɐ), final devoicing (снег, г said k), ж/ш (жук), щ/ч (щука), х (хлеб, `sound.velar_fricative` reused). No tricky word contains another tricky spelling, because the app's "which spelling makes the sound?" question offers all eight spellings as options.
- Four contrast pairs, all real and common: брат/брать (hard or soft т), был/бил (ы or и), жар/шар (ж or ш), за́мок/замо́к (stress: castle or lock). Pair 4 is written with the acute so the two words differ on the page. **[CHECK]** a text-to-speech voice may ignore the combining acute and say both words the same; if so the app should either use recorded audio for that pair or drop it.
- `stress.pattern: unpredictable` (Russian stress is free and mobile, and ordinary text does not mark it; learner materials, dictionaries and minimal pairs do). The generic label already says so.
- `spelling.predictability: medium` **[CHECK]**: letters map to sounds regularly once you know the stress, but the stress is unmarked and unpredictable, and the vowel quality, final devoicing, assimilation and a few endings (-ого read -ово, чт- read шт-) are not shown. `high` is defensible for the consonants and for a reader who has the stress.
- `tones.system: none`.

**Grammar**
- **`articles` qualifier for gender [CHECK, imperfect fit].** Russian has no articles (`trait.articles: none`), but the gender check (`q.article_for_noun`, "Which little word goes with …?") and the validator need an `article` on every `noun.*` and `articles` on `trait.noun_gender`. I used the possessive `мой / моя / моё` ("my") as the word that agrees with the noun's gender (мой стол, моя книга, моё окно). I avoided `этот / эта / это` because `это` is also invariable "this is" and would confuse the answer. Six nouns, two of each gender: стол, книга, окно, дом, вода, море.
- **`subject_pronouns: required` [CHECK].** Russian says the subject pronoun in ordinary sentences ("Я говорю по-русски"), and it must say it in the past tense, which has no person endings. Dropping `я` and `ты` is possible and common in casual speech with present-tense verbs ("Люблю тебя"). The closest values were `required` or `context_dependent`; I chose `required` so an English speaker is not told to drop pronouns. A reviewer who prefers `context_dependent` should change it; the example would then be `Люблю тебя.`
- **`questions: intonation_or_inversion`.** A yes/no question is a statement with rising intonation on the word asked about ("Ты говоришь по-русски?"). The particle `ли` ("Говорите ли вы...?") exists but is bookish or formal, so `particle` would overstate it.
- **`word_order: flexible`.** Neutral order is subject-verb-object; endings (cases) show who does what, so the object can come first for emphasis. Both orders are shown.
- **`cases: some`, `count: 6`** (nominative, genitive, dative, accusative, instrumental, prepositional). Wikipedia notes a few more minor cases (locative, partitive, vocative) are described; six is the standard teaching count. The example shows one noun in all six, then a sentence where the pronoun changes (я / меня).
- **`formal_you: distinct`**, `informal: ты`, `formal: вы` (the same as the plural). `verb_endings: many`, example verb `говорить`. `noun_gender: three` with `values: masculine, feminine, neuter`. `dual_number: none` (the genitive singular after 2 to 4 is not a dual). `classifiers: none`.
- `trait.word_building.example.2` is `книгу` (the form after a verb) to show the word itself changes; its gloss says so.

**Overview**
- `family_id: indo_european`, `branch_ids: [slavic, east_slavic]`. Because the app's relation check treats any shared branch id as "same branch", a Slavic language that lists `slavic` as a branch (Polish, Czech, Bulgarian, Serbian) will read as "close cousins" to Russian, and one that lists only `east_slavic` (Ukrainian, Belarusian) as the closest. **[CHECK]** that this is the intended reading for the other Slavic realizations.
- `related_language_tags`: `uk`, `be`, `pl`, `cs`, `bg`, `sr` (all in the registry). Ukrainian and Belarusian are the close ones; the other four are a sample of the more distant Slavic cousins. Add `sk sl hr bs mk` if you want the full set; I kept the chip list short.
- `origin_region_ids: [europe]` (Russian arose in Eastern Europe) and `reach.regions: [europe, asia]` (Russia is largely in Asia, and Russian is widely used in the Caucasus and Central Asia). **[CHECK]** if the brief's "regions europe and asia" was meant for the origin field too.
- `ancestor_language_tags: [orv]` (Old East Slavic). Drop it if the app resolves ancestor tags against the registry (like `grc`, `ang`, it is probably not in it).
- Hook: `hook.target` Привет (prʲɪˈvʲet, informal "hi"), decoys спасибо (thank you) and да (yes). The formal greeting Здравствуйте was not used (longer, harder to hear as a first word). Hook facts also carry `reading` (privet, spasibo, da), as the Chinese file does for pinyin.

## 3. Bridge (`bridge-en-ru.json`)

- English and Russian are distant cousins (both Indo-European), so the bridge is mostly **English words that came from Russian**, then a few real shared words. There is **one `helpful_transfer` note**, not two, because the app shows only the first note's text as the page text (`introShared.ts`); the one text says honestly which kind each group is (loanwords first, then old shared words and baby-talk words). 17 pairs.
- Loanwords (11): vodka, tsar, sputnik, borscht, babushka, intelligentsia, troika, samovar, cosmonaut, dacha, matryoshka. Verified against en.wikipedia's list of English words of Russian origin and Wiktionary. Caveats a reviewer may want worded differently: **borscht** reached English through Yiddish, from Russian or Ukrainian (Wiktionary); **tsar** is originally from Latin Caesar; **intelligentsia** and **cosmonaut** are built from Latin and Greek parts but were coined or borrowed as Russian words; **sputnik** is dated in English. `to_meaning` is given where the Russian word means something else: sputnik (satellite, travelling companion), babushka (grandmother; English means a headscarf), troika (a group of three, a three-horse team), dacha, matryoshka.
- Old shared words (6): brother/брат, sister/сестра, mother/мать, new/новый, three/три, salt/соль. These are inherited from a common Indo-European ancestor (the sound changes over thousands of years hide most of it). Checked in Wiktionary etymologies: сестра (PIE *swésōr), соль (PIE *sḗh₂l, "and Old English sealt"). **[CHECK]** the rest from standard Indo-European etymology (брат, мать, новый, три). Words I considered and left out as too distant to recognise: дочь, нос, два, мышь, имя, молоко.
- **мама and папа [CHECK]**: I included them (the brief suggested мама) as the last two pairs, but they are nursery words found in many unrelated languages, not true inherited cognates, and the note text says exactly that ("baby-talk words that sound alike in many languages").
- One `false_friend` note (6 pairs): magazine/магазин (shop), family/фамилия (surname), accurate/аккуратный (neat, tidy), cabinet/кабинет (office, study room), fabric/фабрика (factory), romance/роман (a novel). These are well-known false friends from textbooks; **[CHECK]** each meaning with a native speaker (аккуратный can also mean "careful" or "punctual"; роман also means a love affair).
- Bridge IPA follows the same Wiktionary-derived convention as the realizations (ɡ is U+0261).

## 4. Facts to be checked by a native speaker or linguist

Writing
- **[CHECK]** all 33 letter names and transliterations, and the 33 example words with their IPA (from Wiktionary, simplified as above).
- **[CHECK]** `ъ`/`ь` sounds (`ʔ`, `ʲ`) and readings (`ʺ`, `ʹ`), and `й`/`ы` readings (`j`/`y`), as explained above.
- **[CHECK]** the punctuation workaround (`∅`, `|`, "quotes", "dash").
- **[CHECK]** group order: whether `е` belongs with the true friends (I put it with the false friends because it reads "ye"), and whether `ы ь ъ` should come before the hushing sounds.

Sound
- **[CHECK]** the label wording: "like the n in canyon" (soft consonants), "ee with the tongue pulled back" (ы), "like fresh sheep" (щ), the curled-tongue description of ж and ш, and `sound.trill` ("taps ... several times"; Russian р is often only one or two taps).
- **[CHECK]** `sounds.vowels` as six stressed vowels (some Moscow-school descriptions give five, with ы as a variant of и), and `sounds.consonants` with soft counterparts of к г х listed (`kʲ ɡʲ xʲ`; they occur mostly before front vowels and in loanwords).
- **[CHECK]** `spelling.predictability: medium`, and the TTS question on the stress pair.

Grammar
- **[CHECK]** `subject_pronouns: required`, the possessives standing in for articles, `questions: intonation_or_inversion`, `cases` count 6, examples and their English glosses (all glosses are plain meanings, no claims).

- The Russian dash (U+2014) is deliberately not a punctuation tile or an example: the app has a house rule against that character in anything it shows. Russian uses it where English would use a hyphen or a comma; teach it in prose once a reviewer has decided how.
