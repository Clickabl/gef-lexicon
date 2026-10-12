# Turkish (`tr`): needs, conventions and items to check

All content is `candidate`, nothing is verified. Items marked **[CHECK]** are where a native-speaker or linguist reviewer should look first.

How this was checked: the four realizations, the English locale additions and the bridge were overlaid on a scratch copy of `gef-lexicon` (`.../gen4/tr_work/stage/`, made with `stage_merge.py`), and `scripts/validate-curriculum-v2.mjs` passed with `tr` as `completeness: "complete"` with `slots_version: 2`. Removing one gloss and one label in the copy made it fail, so the check does reach `tr`. The real tree was not touched. The generator that wrote the files is `.../gen4/tr_work/build.py` (it also asserts the group rules below: every symbol in exactly one group, no example word containing another letter of its own group, every word at most 7 letters, tricky words free of each other's spellings). I also read the app's intro code (`introScript.ts`, `introWriting.ts`, `introShared.ts`) to see how the facts are used; where that changed a choice it is said below. No file contains the character U+2014.

Sources: en.wikipedia "Turkish alphabet" (29 letters, letter names, ğ rules, circumflex, q w x), "Turkish phonology" (inventory, vowel harmony, palatal allophones of k and g, stress and its exceptions), "Turkish grammar" (six cases, no gender, bir, SOV, mi particle, sen and siz, adjectives take no endings); en.wiktionary `{{tr-IPA}}`, expanded through the MediaWiki API, for the IPA of every Turkish word; en.wiktionary etymology sections for every bridge pair; en.wiktionary REST definitions for the false-friend meanings and a few example words (jilet, dış, ün, gol, vapur, un, kâğıt, tülbent).

## A. Things that need a decision (read these first)

1. **[CHECK] The app shows the wrong capital for i.** `introWriting.ts` `upperAndLower` does `letter.toLocaleUpperCase('und')`, so the tile for `i` reads "I i" (should be "İ i") and the tile for `ı` reads "I ı" (correct). `symbols` must stay lowercase (as in every other language), so this cannot be fixed in data. One-line fix for the maintainer: pass the focus language tag, `toLocaleUpperCase(languageTag)` (`tr` upper-cases i to İ and ı to I; other languages are unaffected). `upperAndLower` has no context argument today, so `symbolItem` in `introScript.ts` would pass `context.focus.languageTag`. Until then the dotted capital İ is simply never shown.
2. **[CHECK] Two generic labels do not fit Turkish exactly** (value chosen is the closest in `slots.json`):
   - `trait.articles` = `none`, whose label says "{language} has no words for “the” or “a”". Turkish has no word for “the”, but `bir` ("one") also does the job of “a” (`bir kitap`). Two examples show both facts (`Kitap masada.`, `Bir kitap okuyorum.`) and the glosses say so. A new value `indefinite_only` ("has a word for “a” but none for “the”") would be exact.
   - `trait.cases` = `some`, whose label says "nouns, articles and adjectives change form for their role in the sentence". In Turkish nouns and pronouns take case endings; adjectives never do and there are no articles. `pronouns_only` would be wrong (nouns decline), so `some` is closest. `count: 6` (nominative, accusative, dative, locative, ablative, genitive; the instrumental `-le/-la` is counted separately by some authors, per Wikipedia).
3. **Vowel harmony has no slot.** It is Turkish's most distinctive feature and nothing in the contract carries it. I used what exists: `trait.word_building.example.2` (`kitaplarımızdan`, gloss says the same endings change their vowels to match, set beside `evlerimizden`), and the three vowel contrast pairs (ı/i back and front, o/ö and u/ü rounded and front-rounded). Suggest a `trait.vowel_harmony` slot (`none`/`present`) or a `sound.*` note slot.
4. **[CHECK] `sound` for ğ is `ː`.** ğ has no sound of its own; it lengthens the vowel before it (dağ is said "daa") and between vowels it is silent or a light glide. The validator wants a non-empty `sound`, and the closest IPA is the length mark, so the tile reads "/ː/". The tricky-sound fact for ğ is `silent: true` with `word_ipa` `daː`. If "/ː/" looks odd on a tile, a short caption "no sound of its own" would be more honest.
5. **[CHECK] For an English reader the script lesson is the short one.** English has a to z, so only `ç ğ ı ö ş ü` (and the circumflex mark) are new: part 1 shrinks to `ş ç`, part 2 to `ğ ı ö ü`. That is why the surprising consonants `c` (is "j"), `j` (is "zh"), `r` (is a tap) and `y` are not in the new-letters lesson: they are taught in the sound stop (tricky sounds `c`, `j`, `r`, `ch`; contrast pair cam/çam) and in the full lesson for readers of other scripts. No data change needed; this is for the maintainer to know.

## B. Vocabulary and labels

**No new slot vocabulary was needed.** Every value is in `slots.json`: `alphabet`, `Latn`, `all_written`, `none` tones, `mostly_final`, `high`, mark id `circumflex` with role `sound_change`, and the grammar values `agglutinating`, `none`, `none`, `distinct`, `many`, `often_dropped`, `some`, `none`, `before_noun`, `none`, `particle`, `sov`.

**New ids used in the data:** family `turkic`, branch `oghuz` (the tree scene reads "Turkish belongs to the Turkic family, in the Oghuz branch"; Oghuz is also called Southwestern Turkic), sound-variety `standard_turkish`, ancestor tag `ota` (Ottoman Turkish, ISO 639-3; drop it if the app resolves ancestor tags against the registry).

**New labels, written in `locale-en.json`** (checked against the live locale, no collisions):
- language_overview: `family.turkic`, `branch.oghuz`
- writing_system: none
- sound_system: `sound.tr_dotless_i`, `sound.tr_o_umlaut`, `sound.tr_soft_g`, `sound.tr_c`, `sound.tr_ch`, `sound.tr_j`, `sound.tr_tapped_r`
- grammar_glance: none

**Existing labels reused verbatim:** `script.Latn`, `layer.latin` ("The Latin alphabet"), `layer.latin.lesson` ("Learn the Latin alphabet"), `mark.circumflex`, `markrole.sound_change` ("Changes how the letter sounds."), `sound.front_rounded_vowel` (for ü: "Say “ee” with your lips rounded as if for “oo”.", exactly right), `stress.mostly_final`, `predictability.high`, `region.europe`, `region.asia`, every `trait.*` value label.

**Labels I deliberately did not add:** `layer.latin.note`. The writing-stop notes are read per layer id, and `layer.latin` is shared by every Latin-script language, so a Turkish-only sentence there would show for Spanish and English too. The things such a note would say (29 letters; no q, w or x; dotted and dotless i are different letters) are in section C instead.
**Labels I did not reuse though close:** `sound.tapped_r` (its last sentence, "Some speakers roll it", is Swahili-specific, as the Japanese author also found); `sound.ja_unrounded_u` (the ı sound is the same as Japanese う, but that label says "softer and shorter than English oo", which is about Japanese); `markrole.palatalization` and `markrole.length` (their texts are Japanese kana descriptions, and the circumflex does both jobs in Turkish only in loanwords, so the neutral `sound_change` is safest).

## C. Conventions I chose (please confirm or change)

**The alphabet**
- One layer, `latin`, `alphabet`, `ltr`, `has_case: true`, `joined: false`, `vowels: all_written`, role `primary`.
- `symbols` are the 29 letters in alphabet order, lowercase: `a b c ç d e f g ğ h ı i j k l m n o ö p r s ş t u ü v y z`. Turkish has **no q, w or x** (they are not part of the alphabet; per Wikipedia they were banned from official use in Turkey from 1928 to 2013 and now appear only in some loanwords and names). English has them and Turkish does not; the lesson only teaches what is new, so nothing to do.
- **Dotted and dotless i.** `i` (capital İ) and `ı` (capital I) are two separate letters, both listed as symbols. The capital pairs are not data (the app derives upper case); see A1 for the app problem. I kept the alphabet order `ı` then `i` (as in the official order). In the teaching groups `i` is in the vowel group (3) and `ı` in group 6; the contrast pair dış/diş and the tricky sound `ı` put them side by side.
- `looks_like` is set on `ç` (c), `ğ` (g), `ı` (i), `ö` (o), `ş` (s), `ü` (u): the new letters that resemble a letter an English reader knows and sound different. It is **not** set on `c`, `j`, `y`, `r`: they are the same Latin letters an English reader knows, so "Looks like c" on the tile for c would be nonsense; their different sounds are taught as tricky sounds.
- `name` is the letter's Turkish name: a, be, ce, çe, de, e, fe, ge, **yumuşak ge** (ğ, "soft ge"), he, ı, i, je, ke, le, me, ne, o, ö, pe, re, se, şe, te, u, ü, ve, ye, ze. **[CHECK]** Wikipedia also lists `ka` for k and `ha`/`haş` for h as alternative names; I used the main ones (`ke`, `he`). The names are all distinct, so the name question always has one right answer.
- `sound` is the letter's own main sound, broad IPA: `c` dʒ, `ç` tʃ, `g` ɡ (U+0261), `ğ` ː (see A4), `ı` ɯ, `j` ʒ, `ö` ø, `r` ɾ, `ş` ʃ, `ü` y, `y` j, the rest as expected. There is no `reading` (the script is Latin).
- **Marks.** One mark, `circumflex` (value `â`, role `sound_change`, example `kâğıt` "paper", IPA `caːˈɯt`). The circumflex is optional and fading; it marks a long vowel in Arabic and Persian loans, makes k, g or l before it sound "softer" (palatal: `kâr` "profit" against `kar` "snow"), and tells apart same-spelled words (`hâlâ` "still" against `hala` "aunt"). `writing.latin.marked` lists `â î û`, but only `â` has a mark fact and no per-letter examples (as for Russian stress vowels), so `î` and `û` have no tile of their own. **[CHECK]** `kâğıt` is the dictionary spelling (Wiktionary lists `kağıt` as the alternative), and that the circumflex is worth teaching at all. `punctuation` is empty: Turkish uses the apostrophe to separate an ending from a proper name (`Ankara'da`), which I did not treat as a symbol to learn.

**Groups (6 groups of 4 or 5, easy first for an English reader)**
1. `m n b d f`: consonants that look and sound like English.
2. `k s l p h`: more of the same.
3. `a e i o u`: the five vowels, said as in Spanish or Italian, not as in English.
4. `t v y z`: more familiar letters (`y` is always the "y" of "yes").
5. `ş ç c j r`: the consonants that are new or surprising (sh, ch, **c is "j"**, **j is "zh"**, the tapped r).
6. `g ğ ı ö ü`: hard g with its soft partner, then the three odd vowels.

Every symbol is in exactly one group, and no example word contains another letter of its own group, so the "which letter is in the word you hear?" question always has the full set of distractors. **[CHECK]** the order; `i` is in the vowel group rather than next to `ı` so the vowel group stays complete; swap if you prefer `ı i` together.

**Example words** (one per letter, 2 to 7 letters, no word used twice): ay, bal, cam, çay, dil, ev, fil, gece, dağ, hava, ışık, ip, jilet, kedi, lale, masa, nar, ok, ördek, para, resim, su, şapka, top, un, üzüm, vapur, yol, zil. Chosen by commonness and picture value, native where a native word is as common. I did not check each word's etymology. To my knowledge no native Turkish word begins with j, r or v, so `jilet` (a loan; I believe from the Gillette brand name, not checked), `resim` and `vapur` are loans by necessity; `lale`, `nar`, `masa`, `fil` and others in everyday use also came in through Arabic or Persian. **[CHECK]** that none reads oddly: `jilet` ("razor blade"; Wiktionary glosses it "razor"), `ip` and `ok` and `un` are one-syllable words chosen so the vowel group needs no second vowel; `dil` is "tongue, language"; `hava` is "air, weather"; `top` is "ball" (also "cannon"); `ay` is "moon, month".

**Sounds**
- IPA is broad phonemic, adapted from Wiktionary `{{tr-IPA}}`. Simplifications from Wiktionary: palatal `c ɟ` (kedi `[ceˈdi]`, gemi `[ɟeˈmi]`) written as plain `k ɡ` because the palatal sounds are allophones before front vowels; dark `ɫ` written `l`; tie bars removed; `ø` for ö; `ɾ` for r. Stress `ˈ` is placed before the stressed syllable of every word of two or more syllables and omitted on one-syllable words. Every two-syllable word chosen has final stress, which is the default.
- `sounds.consonants`: `p b t d k ɡ c ɟ f v s z ʃ ʒ h tʃ dʒ m n l ɾ j`. **[CHECK]** `c` and `ɟ` are listed (the palatal sounds of k and g, phonemic only in loans and names per Wikipedia) so the "new sounds" comparison marks them new to an English speaker; drop them if you read them as allophones only. `ʒ` is in loans only. `sounds.vowels`: `i y ɯ u e ø a o`. **[CHECK]** Wikipedia's text writes the vowel of ö as `œ`; Wiktionary writes `ø`; I followed Wiktionary since that is what I checked, and `ø` is used everywhere here.
- Eight `sounds.tricky.*`: `ı` (ışık), `ö` (göz), `ü` (üzüm, label reused), `ğ` (dağ, silent), `c` (cam), `ç` (çay), `j` (jilet), `r` (kar). No tricky word contains another tricky spelling (asserted in the generator), because the app's "which spelling makes the sound?" question offers all eight spellings as options.
- Four contrast pairs, all real words: dış/diş (outside, tooth: ı or i), gol/göl (goal, lake: o or ö), cam/çam (glass, pine: c or ç), un/ün (flour, fame: u or ü). Checked as existing Turkish nouns in Wiktionary. **[CHECK]** the `sık`/`sik` pair the brief mentioned was not used (`sik` is vulgar). I also left out kar/kâr (snow, profit): a real pair, but a text-to-speech voice will probably say both the same.
- `stress.pattern: mostly_final`. Turkish stress is on the last syllable by default; real exceptions (not in the data): place names (İstanbul, Ankara: stress earlier), many adverbs (şimdi, yarın), words with a negative or certain suffixes, compounds, and borrowed words. The label says "most", which is true.
- `spelling.predictability: high`. Letters map to sounds almost one to one; the known leaks are ğ, the palatal k/g/l in loans, and loanword vowel length.
- `tones.system: none`. Vowel harmony: see A3.

**Grammar** (all twelve traits filled, examples for every value that is not `none`, plus a few for `none` that show what is missing, as the Japanese author did)
- `word_building: agglutinating`. Examples: `evlerimizden` (ev + ler + imiz + den), `kitaplarımızdan` (same endings, harmony shown), `anlayamıyorum` ("I can’t understand"; **[CHECK]** the English gloss stays plain, the morphemes are anla + yama + yor + um).
- `noun_gender: none`: `O geliyor.` (the one pronoun `o` means he, she and it). No `noun.*` facts (those are only for languages with gender).
- `classifiers: none`: `üç elma`. **[CHECK]** the casual `tane` ("iki tane elma") exists and is optional; the generic label ("counts things the way you do") is true enough.
- `formal_you: distinct`: `sen` and `siz`; examples `Nasılsın?` and `Nasılsınız?` with register qualifiers.
- `verb_endings: many` (the generic label fits Turkish exactly: tense, politeness and person); `example_verb: gitmek`, one example listing six forms of `gidiyor`.
- `subject_pronouns: often_dropped` (`Geliyorum.`).
- `cases: some`, count 6 (see A2): `ev / evi / eve / evde / evden / evin` and `Okula gidiyorum.`
- `dual_number: none`. `adjective_position: before_noun` (`büyük ev`, `yeni kitap`; adjectives do not decline).
- `articles: none` (see A2). `questions: particle` (`mi/mı/mu/mü`, itself a harmony word: `musun`, `mı`). `word_order: sov` (the neutral order; other orders are possible for emphasis).

**Overview**
- `family_id: turkic`, `branch_ids: [oghuz]`, `related_language_tags: [az, tk, uz, kk, ky, ug]` (all in the registry; az and tk are the close Oghuz relatives, the rest are other branches). Because the app treats a shared branch id as "close cousins", a realization for Azerbaijani or Turkmen that lists `oghuz` will read as the closest to Turkish, and Uzbek or Kazakh (other branches, same family) as distant cousins. **[CHECK]** that this is the intended reading for the other Turkic realizations. The notes field says the Altaic hypothesis is disputed and not used.
- `origin_region_ids: [asia]` (Turkic began in Central Asia, Turkish took shape in Anatolia); `reach.regions: [europe, asia]` (Turkey spans both; also Cyprus, the Balkans, and a large diaspora in Germany and elsewhere that I did not add as a region). **[CHECK]** whether `origin_region_ids` should also include `europe`.
- Hook: `Merhaba` (hello) with decoys `teşekkürler` (thank you) and `evet` (yes). Merhaba is common in every register; the longer `teşekkür ederim` was not used.

## D. Bridge `bridge-en-tr.json`

- English and Turkish are not related, so there is **one `helpful_transfer` note** (the app shows only the first note's text as the page text), 21 pairs, and its text says honestly what they are: loanwords, mostly English words that came from Turkish, then the last seven that went the other way. It also says tulip comes from the Turkish word for a thin cloth, not the flower.
- English words from Turkish (14), checked in the Etymology sections of the English entries on Wiktionary: yogurt (from Ottoman Turkish yoğurt), coffee (Arabic qahwa, Ottoman Turkish kahve, Italian, Dutch, English: Turkish is one link, not the source of the word), kebab (Wiktionary: ultimately Arabic, with routes through Turkish kebap and other languages), baklava (Ottoman Turkish), kiosk (Ottoman Turkish köşk, through French and Italian), tulip (Ottoman Turkish dülbend, modern Turkish tülbent "muslin, cheesecloth", through French), divan (Ottoman Turkish, through French), horde (Turkic ordu "army", through Polish and Russian: **[CHECK]** the route is long), kismet (Ottoman Turkish kısmet), bosh (Ottoman Turkish boş "empty"), pilaf (Ottoman Turkish pilav), sherbet (Ottoman Turkish şerbet), fez (Ottoman Turkish fes), kilim (Turkish). The text and `to_meaning` fields avoid claiming more than that.
- Turkish words from French or English (7): televizyon (French télévision), bisiklet (French bicyclette), otobüs (French autobus), otel (French hôtel), tren (French train, through Ottoman Turkish), sandviç and tişört (English). Checked on Wiktionary's Turkish entries. `telefon` was not used because that page did not load fully. **`bilgisayar`** (computer) is a Turkish coinage, not a loan, so it is not here.
- Verified but left out: caviar (Wiktionary: direct source is Middle French; Turkish havyar only "probably" an intermediary), yurt (reached English through Russian from a Turkic word that means "homeland" in Turkish), turban and ottoman (doublet and name rather than plain loans), kayak (from Inuit, not Turkish), yataghan and janissary (rare).
- One `false_friend` note, six pairs, meanings from Wiktionary's Turkish entries: at (a horse), bin (a thousand), ham (raw, unripe), pasta (cake, pastry), son (last, the end), ten (skin). They are spelled exactly like the English word, so `from` and `to` are the same spelling; they are coincidences, and the note text says so. **[CHECK]** `pasta` also means the noodle dish in some uses; the common everyday meaning is a cake or pastry.
- Bridge IPA follows the same simplified Wiktionary convention (ɡ is U+0261, no palatal c ɟ).

## E. Facts to be checked by a native speaker or linguist

Writing
- **[CHECK]** the 29 letter names (esp. `yumuşak ge`, `ke`, `he`), the 29 example words with their IPA, and the `sound` of ğ (`ː`).
- **[CHECK]** `kâğıt` as the mark example and whether `î`/`û` need tiles.
- **[CHECK]** the group order (esp. where `i` and `r` sit) and the `looks_like` choices.

Sound
- **[CHECK]** the label wording: "like the vowel in British “fur”, said without the r" for ö, "say “ee”, then pull your tongue back and keep your lips flat" for ı, the "daa" description of ğ (also a light glide between vowels), and "mostly in borrowed words" for j.
- **[CHECK]** `c ɟ` in the consonant list, `ø` against `œ`, `ɾ` for word-final r (often breathy or devoiced in speech), and `spelling.predictability: high`.
- **[CHECK]** the contrast pairs on a device: a text-to-speech voice must say dış and diş (and gol/göl, un/ün) differently.

Grammar
- **[CHECK]** `articles: none` and `cases: some` against their generic labels (A2), `classifiers: none` (tane), `subject_pronouns: often_dropped`, the glosses of the word_building examples, and all example sentences (`Kitap masada.`, `Çay içiyor musun?`, `Bu senin kitabın mı?`, `Kedi balığı yiyor.`, `Okula gidiyorum.`).
