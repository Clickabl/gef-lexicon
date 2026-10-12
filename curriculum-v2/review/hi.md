# Hindi (`hi`): needs, conventions and items to check

All content is `candidate`, nothing is verified. Items marked **[CHECK]** are where a native-speaker or linguist reviewer should look first.

How this was checked: the four realizations, the English locale additions and the bridge were overlaid on a scratch copy of the current `gef-lexicon` (including the `ja`, `ko`, `ru`, `uk`, `tr` drops already merged), and `scripts/validate-curriculum-v2.mjs` passed with `hi` as `completeness: "complete"` and `slots_version: 2` (every slot, example, group, label and gloss present, the U+2014 rule included). No label or gloss collided with a live one. My own checks on top: all 57 symbol readings are different, every example word contains its `highlight` and is at most 7 code points, every symbol and nukta letter has an example, the 13 groups cover each of the 57 symbols once, all strings are NFC, and no file contains an em dash or en dash. The real tree was not touched.

Sources: Wiktionary Hindi pronunciation (the `{{hi-IPA}}` template, expanded through the MediaWiki API) for the IPA of every word; en.wiktionary "Appendix:Hindi pronunciation" and the Hindi entries for ङ ञ ज्ञ क्ष त्र ◌ं ◌ँ (letters and signs); en.wikipedia "Hindustani phonology" (consonant and vowel tables, ऐ ɛː/æː, औ ɔː, ष ʂ replaced by ʃ in casual speech, ɣ x q replaced by ɡ kʰ k by many speakers, weight-based stress, schwa deletion); en.wikipedia "Hindi" (Indo-Iranian > Indo-Aryan, Shauraseni Prakrit and Apabhramsha ancestry, Devanagari "an abugida", Hindi and Urdu as two registers, where spoken); en.wikipedia "Hindi grammar" (two genders, nominative/oblique/vocative, split ergativity with ने, तू/तुम/आप, verb agreement, adjective agreement); a web search for pro-drop (Hindi is pro-drop, with restrictions on third person) and for yes/no questions (क्या optional, rising intonation required); en.wiktionary etymology sections for every bridge pair (section 3).

## 1. Vocabulary and labels

**No new slot vocabulary was needed.** Every value is already in `slots.json`: `abugida`, `Deva`, `inherent`, `ltr`, mark ids `matra virama anusvara chandrabindu nukta`, roles `vowel_sign no_inherent_vowel nasalization sound_change`, `rule_by_syllable_weight`, `high`, and the grammar values listed in section 2.

**New ids used in the data**: layer id `devanagari`; branch id `indo_aryan`; sound variety `standard_hindi`; ancestor tag `sa` (Sanskrit; the app only types `ancestor_language_tags`, and `sa` is not in the registry, like `orv` for Russian).

**New label ids, written in `locale-en.json`** (checked against the live locale: none exists today, no collisions):
- language_overview: `branch.indo_aryan`
- writing_system: `script.Deva`, `layer.devanagari`, `layer.devanagari.lesson`, `layer.devanagari.note`, `mark.matra`, `mark.virama`, `mark.anusvara`, `mark.chandrabindu`, `mark.nukta`, `markrole.vowel_sign`, `markrole.no_inherent_vowel`, `markrole.nasalization`
- sound_system: `sound.hi_aspirated`, `sound.hi_breathy`, `sound.hi_retroflex`, `sound.hi_dental`, `sound.hi_nasal_vowel`, `sound.hi_flap`, `sound.hi_schwa_deletion`
- grammar_glance: none (every trait value label already exists)

The `mark.*` labels are not prefixed `hi_` because the mark ids come from the shared vocabulary and the validator asks for `mark.{mark_id}`; they describe the sign itself, so Marathi, Nepali or Sanskrit can reuse them.

**Existing labels reused, so not rewritten:** `family.indo_european`, `region.asia`, `markrole.sound_change`, `sound.vowel_length` (its text is exactly right for Hindi), `stress.rule_by_syllable_weight`, `predictability.high`, all `trait.*` value labels, `kind.abugida`, `vowels.inherent`.

**Label choices to confirm:**
- `layer.devanagari` is "Devanagari" (not "The Devanagari script"), because `kind.abugida` reads "{layer} is an abugida"; `script.Deva` is "Devanagari script".
- `layer.devanagari.note` carries the headline-bar point (the app reads `layer.{id}.note` in the writing intro): "Hindi hangs its words from a headline bar. The letters keep their own shapes and are not joined, and there are no capital letters. Vowel signs wrap around a consonant and replace its built-in “a”." This is where "joined: false" is explained, since the schema has no place for a note on `joined`.
- The sound labels use Devanagari letters inside English sentences (as the Russian ones do) and approximations such as "club house squeezed into one sound" for breathy voice. **[CHECK]** that these analogies read well to an English beginner.

## 2. Conventions I chose (please confirm or change)

**The layer**
- One layer `devanagari`: `abugida`, `Deva`, `primary`, `ltr`, `has_case: false`, `joined: false`, `vowels: inherent`. Devanagari letters hang from a headline bar (shirorekha) that touches in a word, but letters are not contextually shaped (no initial/medial/final forms), so `joined` is false and no `forms` qualifier is used.

**Symbols (57), in conventional order**
- 11 independent vowels अ आ इ ई उ ऊ ऋ ए ऐ ओ औ; 33 consonants in varga order (क ख ग घ ङ / च छ ज झ ञ / ट ठ ड ढ ण / त थ द ध न / प फ ब भ म / य र ल व / श ष स ह); 3 conjunct units क्ष त्र ज्ञ; and the 10 vowel signs shown on क (का कि की कु कू कृ के कै को कौ).
- **क्ष त्र ज्ञ are symbols [CHECK].** They are irregular ligatures, not separate letters of the 33, but every Hindi chart ends with them and their shapes cannot be guessed (ज्ञ is not recognisably ज + ञ). श्र (listed as a fourth in some school charts) is left out.
- **The matras are symbols as क + sign (the "barakhadi" row) [CHECK].** The validator requires every group member to be a symbol, and the brief asked for the matras in teaching groups, so each sign is taught as a syllable on क with its own example word, sound and reading (`kā ki kī ku kū kri ke kai ko kau`). A bare sign (ि ु ृ) would render as a stray mark in a large tile, so a carrier is needed. The generic `mark.matra` fact then also exists (value कि) as the concept tile the app appends after the groups; for that reason its example word (किसान) differs from the symbol कि's (किताब). `name` on these ten is "आ की मात्रा (ā kī mātrā)" etc. **[CHECK]** the traditional names (some books say "छोटी इ की मात्रा", "बड़ी ई की मात्रा").
- **Nukta letters are `marked`, not symbols.** `marked` = क़ ख़ ग़ ज़ ड़ ढ़ फ़, each with its own example, so the app adds them as extra tiles after the 13 groups (4 + 4 with the danda). They cannot be in a group (groups hold symbols only). They are written NFC, that is base letter + U+093C (the precomposed U+0958 to U+095F are composition exclusions and normalise to this form); every file is NFC, and the app's `foldLetter` is NFC too.
- **ड़ and ढ़ [CHECK]:** some charts list them as ordinary letters (they are very common: लड़का, पढ़ना). Following the brief, they are `marked`. If they should be inventory entries they would move to `symbols` and a group of their own.
- No `looks_like`: no Devanagari letter resembles a Latin letter closely enough to mislead (I considered ट, ठ, ड, ब, ख and left them out). No `forms`.
- **Not taught, on purpose:** the Devanagari digits ०-९ (not letters or punctuation; a numerals layer would be a separate decision); the English-loan vowel sign ऑ/ॉ (डॉक्टर, ऑफ़िस), so no example word uses it (the bridge uses स्कूल, स्टेशन, ट्रेन, टिकट, होटल, बटन for English words in Hindi); the double danda ॥.
- **Visarga ः is not a `mark` fact.** It appears only in Sanskrit-style words (दुःख, अतः), and `visarga` is not in `slots.json`'s mark ids. To add it, put `visarga` in `mark_ids`, add `mark.visarga` ("visarga (two dots, one above the other, after a letter)"), and a fact `writing.devanagari.mark.visarga` (value दुः, role `sound_change`, example दुःख /d̪ʊ(ɦ)kʰ/, "sorrow"; Wiktionary shows the ɦ as optional). With 5 marks the app shows a group of 4 and a group of 1 (nukta).

**Teaching groups (13).** Vowels in 3 groups (अ आ इ ई / उ ऊ ऋ / ए ऐ ओ औ), the five vargas one group each (all five letters), य र ल व, श ष स ह, the three conjuncts, then the matras in two groups of five. Each group has 3 to 5 symbols. Three example words contain another letter of their own group (पतङ्ग has ग, पञ्च has च, वकील has ल); the app already drops such letters from the options of its "which letter is in the word you hear?" question, so there is no ambiguous answer.

**Example words.** Native or long-naturalised, concrete, at most 7 code points, picked from the standard Hindi alphabet charts and checked as Hindi lemmas in Wiktionary. Notes:
- **ङ and ञ [CHECK]:** no common word starts with either, and everyday Hindi writes these nasals with the anusvara (पतंग, पंच). I used the Sanskrit-style spellings पतङ्ग (kite) and पञ्च (five; the usual word is पाँच) so the letter is visible in a word; पतङ्ग and पञ्च are not Hindi lemmas in Wiktionary (पतंग is). A reviewer may prefer a different word or to drop the examples' "everyday" claim. The IPA of पतङ्ग is that of पतंग; for पञ्च I wrote /pəɲtʃ/ (Wiktionary has /pənt͡ʃ/ phonemically and [pɐ̃nt͡ʃ] phonetically).
- I avoided words Wiktionary lists as "nuqtaless forms" of a nukta spelling (कलम for क़लम, खरगोश for ख़रगोश, किला for क़िला), so क uses कमल, ख uses खाना, and the matra mark uses किसान.
- उल्लू (owl) is also an insult in slang; it is the traditional word for उ. ऐनक (Persian), औरत and किताब (Arabic) are not native Hindi words but are ordinary Hindi.
- भाषा for ष; क्षमा, मित्र, ज्ञान for the conjuncts. `मित्र` is /mɪt̪ɾ/ (Wiktionary shows a reduced final vowel).
- Danda example: यह आम है। ("This is a mango."); no `sound` or `reading` (the validator no longer asks for them on punctuation).
- Every example also carries `word_reading` (a Latin transliteration of the word) and every mark `example_reading`. These are extra qualifiers outside the contract, as in the Japanese drop; the app ignores them today. A learner who cannot read the word yet benefits if the app shows them later.

**`reading` scheme [CHECK].** One compact, IAST-derived scheme with a few English-friendly digraphs, chosen so that all 57 readings differ (the app's sound questions and match drills break on duplicates): vowels `a ā i ī u ū ri e ai o au`; consonants `ka kha ga gha nga | cha chha ja jha nya | ṭa ṭha ḍa ḍha ṇa | ta tha da dha na | pa pha ba bha ma | ya ra la va | śa ṣa sa ha`; conjuncts `ksha tra gya`; matras `kā ki kī ku kū kri ke kai ko kau`; nukta `qa xa ġa za ṛa ṛha fa`. श is `śa` and ष is `ṣa` (they sound the same in modern Hindi; the dot-below and acute keep the readings different); retroflex letters take a dot below so they differ from the dental ones. An English reader may stumble on ṭ ḍ ṇ ṣ ś, but the IPA is shown next to each. The same macron style is used in `name` and in hook `reading`.

**`sound` (what the symbol says).** Consonants are given with their built-in vowel, as the syllable the letter spells on its own (क is /kə/, ख /kʰə/, ट /ʈə/, त /t̪ə/), vowels as vowels, the matra syllables as syllables (कि /kɪ/). Choices: श and ष are both /ʃə/ **[CHECK]** (Wiktionary's phonemic form for ष is /ʂ/ but its phonetic form [ʃ]; Wikipedia says /ʂ/ survives mainly in Sanskrit loans and is /ʃ/ in casual speech, so the word भाषा is written /bʱaːʃaː/); क्ष is /kʃə/ and ज्ञ /ɡjə/ **[CHECK]** (Wiktionary's phonemic form for ज्ञान is /d͡ʒɲɑːn/ but its phonetic form is [ɡjä̃ːn]; north Indian speech says "gyaan"); ऋ is /ɾɪ/ (Hindi says "ri", not an r-vowel); ऐ /ɛː/ and औ /ɔː/ **[CHECK]** (Wikipedia notes /æː/ for ऐ in some sources, Ohala 1999 uses ɛː); ङ /ŋə/, ञ /ɲə/ and ण /ɳə/ are the nasals that anusvara can stand for; ड़ /ɽə/ and ढ़ /ɽʱə/ are flaps.
- IPA style: broad and phonemic, from Wiktionary's `{{hi-IPA}}` simplified: syllable dots removed, tie bars removed (tʃ dʒ), the open vowel written `a` (Wiktionary has ɑ), dental stops marked with U+032A (t̪ d̪), `ɾ` for र, final schwas shown only where Wiktionary shows them (कमल /kəməl/, सब /səb/, लड़की /ləɽkiː/). Schwa deletion is therefore already in the IPA.

**Marks (5).** `matra` (value कि, role `vowel_sign`), `virama` (प् in सप्ताह, `no_inherent_vowel`), `anusvara` (कं in कंघी, `nasalization`), `chandrabindu` (आँ in आँख, `nasalization`), `nukta` (ज़ in ज़रूर, `sound_change`). Anusvara's value changes with the next consonant (ŋ before velars, n before dentals, m before labials, plain nasalization before sibilants and at the end); the label does not try to say all of that, the sound note on कंघी does it by example. **[CHECK]** `nukta` role: `sound_change` fits (it changes the letter's sound), though a dedicated role could say "foreign sound".

**Punctuation:** `["।"]` only (the danda, Hindi's full stop). Question marks, commas and quotation marks are as in English.

**Sounds**
- `sounds.consonants` (39 symbols): the stops with their aspirated or breathy partners, dental and retroflex rows, affricates, nasals (ɳ ŋ ɲ are written letters but allophones of n or marginal), f s z ʃ ɦ, and **x ɣ q [CHECK]** (the nukta fricatives; Wikipedia says many speakers replace them with kʰ ɡ k). ʂ and ʒ are not listed (ʂ is read as ʃ, ʒ is spelled झ़ and is rare). `sounds.vowels` (16): ə ɪ ʊ aː iː uː eː ɛː oː ɔː, plus the nasal vowels ə̃ ãː ĩː ũː ẽː õː **[CHECK]** (Masica lists the long nasal vowels; the analysis is disputed). `variety: standard_hindi`.
- Eight `sounds.tricky.*`, each with a different spelling and no word that contains another entry's spelling (the app's "which spelling makes this sound?" question offers all eight): aspiration (ख, खाना), breathy voice (भ, भालू), retroflex (ट, टोपी), dental (द, दादी), nasal vowel (◌ँ, हाँ), flap (ड़, लड़का), **schwa deletion (ब, सब, `silent: true`)** and vowel length (ऊ, ऊन, `sound.vowel_length` reused). **[CHECK]** the schwa entry: the "spelling" is the final ब whose built-in "a" is not said, so the quiz shows ब for a word where nothing is "made" by it; the card text explains it. The nasal entry's spelling is ◌ँ (U+25CC dotted circle + U+0901) so the sign has a visible base.
- Four contrast pairs, all common words: पल/फल (moment/fruit; aspiration), दाल/डाल (lentils/branch; dental vs retroflex), पिता/पीता (father/he drinks; vowel length), सास/साँस (mother-in-law/breath; nasalization). **[CHECK]** साँस: Wiktionary lists it as an alternative spelling of सांस (anusvara) and gives /sɑ̃ːs/ for साँस and /sɑːns/ for सांस; I used the chandrabindu spelling so the sign shows. **[CHECK]** that a text-to-speech voice says पीता with a long ी and साँस nasal.
- `tones.system: none`.
- `stress.pattern: rule_by_syllable_weight` **[CHECK]**: Wikipedia's Hindustani phonology gives a weight-based rule (stress the heaviest syllable, the last if tied, ignoring the final mora; penult if all are light). The generic label says "Stress follows a rule based on how heavy the syllables are, so you can work out where it falls." Native speakers do not usually experience Hindi stress as strong.
- `spelling.predictability: high` **[CHECK]**: as asked in the brief. The letters map to sounds almost one to one, but the inherent "a" is silently dropped at word ends and in some middle syllables (सब, लड़की), and that is not written. `medium` is defensible. The schwa note and the tricky entry carry the caveat.

**Grammar (all twelve traits filled)**
- `word_building: inflecting` (nouns, adjectives and verbs change endings; Hindi also uses postpositions and auxiliaries heavily, which has no slot).
- **`noun_gender: two`** (masculine, feminine). The gender check and the validator need an `article`; Hindi has none, so I used the possessive मेरा / मेरी ("my"), which agrees with the noun's gender (मेरा लड़का, मेरी किताब). Six nouns: लड़का, घर, पानी (masculine); किताब, रोटी, चाय (feminine). **[CHECK]** imperfect fit, same device as Russian's мой/моя/моё.
- **`formal_you: distinct` [CHECK]** with informal तुम, formal आप. Hindi really has three: intimate तू, familiar तुम, formal आप (Wikipedia). `levels` would say "several levels of politeness built into its verbs and words", which overstates Hindi, so I chose `distinct`; the cards show तुम and आप only.
- `verb_endings: many`, `example_verb: बोलना` (verbs agree in gender, number and person; the examples are said by a man, the second one shows he/she).
- **`subject_pronouns: context_dependent` [CHECK].** Hindi is pro-drop (Wikipedia, linguistics papers) but the drop is easier for "I" and "you" and restricted for the third person; ordinary beginner sentences keep the pronoun. Both forms are shown (मैं हिंदी बोलता हूँ। / हिंदी बोलता हूँ।). `often_dropped` is the alternative.
- **`cases: some`, `count: 3` [CHECK].** Wikipedia's Hindi grammar lists nominative (direct), oblique and vocative; many teaching books say "two cases, direct and oblique". The vocative differs from the oblique only in the plural (लड़को!). Roles are mostly shown by postpositions (को, से, का, में, पर), which have no slot. Examples: लड़का / लड़के को / लड़कों को; मैं / मुझे / मेरा; and the ergative sentence लड़के ने किताब पढ़ी। (the split-ergative ने, only in the perfective, shown here because there is no slot for it).
- `dual_number: none`; `adjective_position: before_noun`; `articles: none` (एक "one" can act as "a" but is a number; example 1 shows a sentence with no article); `classifiers: none`.
- **`questions: particle`** with `particle: क्या`. क्या is optional and rising intonation alone makes a yes/no question, so `intonation_or_inversion` would also be true; I chose `particle` because it is what a learner meets first and it differs from English. **[CHECK]**
- `word_order: sov`, examples मैं चाय पीता हूँ। / वह किताब पढ़ती है।
- Every grammar example has `ipa` (joined from Wiktionary's word IPA: मैं /mɛ̃ː/, हूँ /ɦũː/, है /ɦɛː/, हैं /ɦɛ̃ː/ and so on, so sentence-level reduction is not modelled) and `reading`.

**Overview**
- `family_id: indo_european`, `branch_ids: ["indo_aryan"]` **[CHECK]**. I did not also list `indo_iranian` (Hindi's grandparent branch) because the app treats any shared branch id as "close cousins", and a Persian or Pashto realization listing it would then read as a close cousin of Hindi. With one branch the lesson says "Indo-European family, Indo-Aryan branch", and Urdu, Bengali, Punjabi, Marathi, Gujarati and Nepali (all in the registry) will show as close cousins when their realizations list `indo_aryan`.
- `related_language_tags`: `ur bn pa mr gu ne`. Urdu is the closest (same spoken base); the others are Indo-Aryan cousins, not mutually intelligible. `ancestor_language_tags: ["sa"]` **[CHECK]**: Hindi descends from Sauraseni Prakrit, from the Old Indo-Aryan family; Wiktionary treats Sanskrit as the ancestor of inherited Hindi words.
- `origin_region_ids: ["asia"]`, `reach.regions: ["asia"]` **[CHECK]**. Hindi is also an official language in Fiji and has large diaspora communities (Trinidad and Tobago, Guyana, Suriname, South Africa, Mauritius, the UK, the US, the UAE); I kept `asia` only because the standard language is not the main language there. Add `oceania americas africa europe` if the scene should say so.
- Hook: `hook.target` नमस्ते (namaste, "hello" and "goodbye"), decoys धन्यवाद (thank you) and हाँ (yes). The hook facts carry `reading` as the Russian and Chinese files do.

## 3. Bridge (`bridge-en-hi.json`)

- English and Hindi are distant cousins (both Indo-European), so the bridge is mostly **loanwords**. There is **one `helpful_transfer` note** (23 pairs, as the coordinator asked; the app shows only the first note's text) whose text says honestly what each group is, then one `false_friend` note (6 pairs) whose text says they are sound-alikes only, because Hindi is not written in Latin letters.
- **English words from Hindi (12):** bungalow बंगला, jungle जंगल, shampoo चाँपो, pyjamas पाजामा, guru गुरु, yoga योग, cot खाट, thug ठग, loot लूट, cheetah चीता, chutney चटनी, sari साड़ी. Checked in en.wiktionary etymology sections: jungle (Hindi जंगल, from Sanskrit), shampoo (Hindi चाँपो, imperative of चाँपना "to press, knead"; the Hindi shown is the source word, not the modern re-borrowed शैंपू, and `to_meaning` says so), pajamas/pyjamas (Hindi पाजामा / पैजामा, from Persian), guru (Hindi गुरु, from Sanskrit), cot (Hindi खाट), thug (Hindi ठग), loot (Hindi लूट), cheetah (Hindi चीता), chutney (Hindi चटनी), sari (Hindi साड़ी). **Caveats [CHECK]:** bungalow is "borrowed from Gujarati બંગલો; compare Hindi बंगला" (not directly from Hindi); yoga is "borrowed from Sanskrit योग" (Hindi has the same word); the note text says "some of them by way of Persian or other Indian languages" to cover these. I left out avatar, karma, pundit and dekko (Sanskrit or slang) for length.
- **English words in Hindi (6):** school स्कूल, station स्टेशन, train ट्रेन, ticket टिकट, hotel होटल, button बटन. All have `{{bor+|hi|en|...}}` etymologies in Wiktionary (होटल: English, ultimately from Latin). I avoided डॉक्टर and अस्पताल (ॉ is not taught; अस्पताल came through Portuguese) and गिलास (two possible etymologies), and बस (it is also a native word meaning "enough").
- **Old shared words (5):** three/तीन, seven/सात, two/दो, new/नया, brother/भाई, all inherited from Proto-Indo-European (Wiktionary's Hindi etymologies name the English cognates: तीन "distantly three", सात "distantly seven", दो "distantly two", नया from *néwyos "whence new", भाई with brother). They are hard to hear as cousins; the note says so ("true look-alike words are rare"). Left out as too distant: नौ (nine), नाम (name), दाँत (tooth).
- **False friends (6):** din/दिन (day), come/कम (less, little), bee/भी (also, too), or/और (and, more), ball/बाल (hair), sub/सब (all). Pure sound-alikes (not look-alikes), meanings from Wiktionary. **[CHECK]** with a native speaker which of these an English beginner really confuses by ear; "or / और" is the neatest (और means "and").
- Bridge IPA follows the same Wiktionary-derived convention as the realizations.

## 4. Facts to be checked by a native speaker or linguist

Writing
- **[CHECK]** all 65 examples (word, gloss, IPA), especially पतङ्ग and पञ्च for ङ and ञ, उल्लू (slang meaning), and whether each word is the one a Hindi teacher would pick.
- **[CHECK]** the matra-on-क approach, the ten matra names, and the conjuncts as symbols (क्ष त्र ज्ञ), श्र left out.
- **[CHECK]** the `reading` scheme (ṭ ḍ ṇ ṣ ś ṛ ġ and macron vowels), and that "ksha tra gya" are the readings a teacher would give.
- **[CHECK]** group order (vowels, then vargas, then य र ल व, श ष स ह, conjuncts, matras); a teacher may prefer to introduce the matras right after the vowels.
- **[CHECK]** the `sound` values for श ष क्ष ज्ञ ऋ ऐ औ, and ड़ ढ़ (ɽ, ɽʱ).
- **[CHECK]** visarga omitted; digits and ऑ/ॉ not taught; nukta role `sound_change`.

Sound
- **[CHECK]** the label wording: "club house" for breathy sounds, the retroflex and dental descriptions, the French "bon" analogy for nasal vowels.
- **[CHECK]** `stress.pattern: rule_by_syllable_weight`, `spelling.predictability: high`, and the vowel inventory (nasal vowels, ɛː/æː for ऐ).
- **[CHECK]** the schwa-deletion tricky entry (spelling ब, `silent`), and the TTS question on पीता and साँस.

Grammar
- **[CHECK]** `subject_pronouns: context_dependent`, `formal_you: distinct` (तू is not shown), `cases` count 3, `questions: particle`, मेरा/मेरी standing in for articles, all examples and their English glosses (plain meanings, no claims).

Overview and bridge
- **[CHECK]** `branch_ids` with `indo_aryan` only, `ancestor_language_tags: ["sa"]`, `reach.regions: ["asia"]`, and the bridge caveats above (bungalow via Gujarati, yoga from Sanskrit, shampoo shown as चाँपो).
