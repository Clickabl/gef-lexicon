# Swahili (sw) candidate data: what the maintainer needs to know

All content is `candidate`, unverified. Facts were checked against secondary sources (English Wikipedia, Wiktionary, learner and
textbook pages), not against a primary dictionary such as TUKI's Kamusi ya Kiswahili Sanifu. Items marked **UNCERTAIN** need a
native-speaker or specialist reviewer.

Validation: the four realizations, the English locale additions and the bridge were dropped into a throwaway copy of the
curriculum-v2 tree and `validate-curriculum-v2.mjs` passed (sw counted as complete) and `curriculum-v2-coverage.mjs` shows sw
4/4, 11/11, 5/5, 12/12. The real tree was not touched.

## 1. Vocabulary values

No new vocabulary value was needed: every category value I used (`alphabet`, `Latn`, `primary`, `ltr`, `all_written`, `none`,
`mostly_penultimate`, `high`, `agglutinating`, `classes`, `few`, `often_dropped`, `after_noun`, `intonation_or_inversion`, `svo`,
region `africa`) is already in slots.json.

New label ids (written in locale-en.json): `family.niger_congo`, `branch.bantu`, `sound.prenasalized_stop`, `sound.initial_ng`,
`sound.tapped_r`.

Label ids that already exist, repeated in locale-en.json with identical text so the file stands alone: `script.Latn`,
`layer.latin`, `sound.dental_fricative`, `sound.voiced_velar_fricative`, `sound.velar_fricative`. `region.africa` already exists and
is not repeated. I did **not** use "The Swahili alphabet" for `layer.latin`: that id is shared by every Latin-alphabet language and
already reads "The Latin alphabet".

Qualifiers I added that are not in INTRO_FACTS.md (harmless if ignored, adopt or drop as you like):
- `parts` (array of morphemes) on `trait.word_building.example.*`, for example `["ni","na","som","a"]`.
- `class` ("1/2") and `prefixes` ("m-/wa-") on `trait.noun_gender.example.*`.
- `optional_particle: "je"` on `trait.questions` and `particle: "je"` on its example 2.

Conventions that differ from other realizations:
- `genealogy.script_ids` is `["Latn"]` as requested; the existing es/fr/en/it/pt files use `"latin"` and el uses `"greek"` there.
  One of the two should be normalised.
- `variety` is `"standard"` as requested (el uses `standard_modern_greek`). Meant: the Unguja-based standard.
- `sounds.contrast.*` carry no `note_id` (matches the el realization and the validator, although the INTRO_FACTS table lists it).
- No `noun.*` facts: Swahili has no articles, so the existing gender check (article plus gender) cannot run. A check on class
  prefix could be built from the `class` and `prefixes` qualifiers.

## 2. Counting conventions

**Noun classes: `count: 16`.** Traditional Bantu numbering as used in Swahili grammars (and English Wikipedia's "Swahili grammar"):
classes 1 to 11, 14, 15, 16, 17, 18. Classes 12 and 13 are absent in standard Swahili. The infinitive class 15 and the three
locative classes 16 to 18 are counted, and each singular and plural class counts separately. Other conventions give different
numbers (for example about nine singular/plural pairings: 1/2, 3/4, 5/6, 7/8, 9/10, 11/10, 14, 15, 16-18; many beginner books teach
"eight main classes"). **UNCERTAIN** which number suits a first lesson; the label reads "classes ({count})".

**Alphabet (31 units).** a b ch d dh e f g gh h i j k kh l m n ng' ny o p r s sh t th u v w y z. `c` is not a unit: it occurs only
inside `ch` (Wikipedia adds that it also appears in unassimilated English loans). `q` and `x` are not used. The prenasalized
sequences mb, nd, ng, nj, mv, nz are spelled with two letters but are not listed as alphabet units. Plain `ng` (as in ngoma,
"drum") is not a unit and has no example fact; only `ng'` does. The apostrophe is ASCII U+0027; print also uses a typographic
apostrophe, and the highlight must match the symbol string exactly.

Design note: English's symbol list is a to z, so a comparison that is blind to multi-letter units will call ch, sh, th and gh "new
letters" to an English speaker although they already know them as digraphs.

## 3. Uncertain items (reviewer please check)

1. **UNCERTAIN: `kh` and its example `kheri`.** kh is listed as an alphabet unit (task list, a textbook list of digraphs,
   Wikipedia's consonant chart as marginal), but standard spelling usually writes the Arabic /x/ with plain h (heri, habari,
   hamsini). Wiktionary calls `kheri` an alternative form of `heri` (good fortune, blessing; "kwa kheri" is also seen for goodbye).
   Alternatives I did not use: `subalkheri` ("good morning"), `khabari`. If no common standard word is found, consider dropping kh
   from the symbols, the example and the tricky sound.
2. **UNCERTAIN: dh, th, gh, kh are marginal sounds.** They occur in words from Arabic, and many speakers, especially outside the
   Swahili coast, replace them (typically with z, s, g, h). I list them as standard-variety sounds because the standard alphabet
   has the digraphs; I did not verify how widely the distinct pronunciations are used.
3. **UNCERTAIN: prenasalized stops as single units.** `sounds.consonants` lists ᵐb ⁿd ⁿdʒ ᵑɡ as units. English Wikipedia notes that
   several studies analyse them as consonant clusters instead. The prenasalized fricatives mv (ᶬv) and nz (ⁿz) also exist and are
   not listed (the ᶬ glyph has poor font support). The word-initial "mbuzi" is treated as two syllables (mbu-zi).
4. **UNCERTAIN: vowel symbols.** I used /a e i o u/ (as in the es and el files). English Wikipedia and Wiktionary write /ɑ ɛ i ɔ u/.
   Against an English base the two choices change which vowels count as "new".
5. **UNCERTAIN: r.** Transcribed as a tap ɾ (Wiktionary's Unguja standard and Wikipedia say tap is more common; trill [r] also
   occurs). One appendix says that for many speakers l and r merge; not verified.
6. **UNCERTAIN: implosives.** Wikipedia and Wiktionary report b, d, j, g as implosives [ɓ ɗ ʄ ɠ] or voiced stops (variable). I list
   plain b, d, dʒ, ɡ and made no tricky sound about it. Wiktionary gives jambo as [ˈʄɑ.ᵐbɔ]; I wrote dʒ. Aspiration of p t k is also
   described as dialect-dependent; I claim nothing.
7. **UNCERTAIN: stress.** `mostly_penultimate` is the standard description. I did not check exceptions (some loanwords and
   interjections, words with a syllabic nasal such as mtu).
8. **UNCERTAIN: contrast pairs.** pata/bata ("get, find" / "duck"), nani/nane ("who" / "eight"), tamu/damu ("sweet" / "blood").
   Meanings are well known; bata = duck was confirmed in a dictionary list and nane/damu in word lists, tamu and nani from my own
   knowledge. `pata` as a bare word is the command form of kupata; the gloss says so.
9. **UNCERTAIN: questions value.** I chose `intonation_or_inversion` because yes/no questions are made by intonation alone, and the
   particle `je` before the clause is optional (sources say it is more common in careful or formal speech). `particle` would
   misleadingly say Swahili differs from Spanish in how it forms a question, and the inversion half of the label does not apply.
   A value such as `intonation_only` could be added. Question words stay in place ("Unaitwa nani?").
10. **UNCERTAIN: `formal_you: none`.** Swahili has wewe (you, singular) and ninyi (you, plural) and no formal "you". Politeness is
    carried by greetings and titles (for example shikamoo to elders, answered marahaba) and by words like tafadhali. If you model
    politeness more broadly, this trait is a weak fit. I did not verify whether plural forms are used to show respect to one person
    in standard usage.
11. **UNCERTAIN: `verb_endings: few`.** The subject, tense and object are prefixes. The final vowel does change (-a, -e in the
    subjunctive, -i in the negative present, and so on), which is why I chose `few` rather than `none`.
12. **UNCERTAIN: word-building examples.** ninasoma (ni-na-som-a), ninakupenda (ni-na-ku-pend-a, "I love you"), tutaonana
    (tu-ta-on-an-a, "see you later"; -an- is the reciprocal). The segmentation matches general grammar descriptions; the farewell
    sense of tutaonana is standard usage I know but did not find in the sources I fetched.
13. **UNCERTAIN: `hook.target` = habari.** Chosen over jambo because habari ("news") is the everyday greeting; jambo is
    listed as "hello" but is the form visitors hear most. The gloss notes the literal meaning.
14. **UNCERTAIN: bridge notes.**
    - "Hakuna matata" is real Swahili ("there are no troubles"; matata = troubles) but one source says speakers more often use
      other phrases such as "hamna shida"; I left any frequency claim out of the learner text.
    - "pole pole" is also written "polepole" (Wiktionary lists both); check the standard form.
    - The pair "Kwanzaa" to "kwanza" has a proper noun in `from`; the note text explains kwanza means "first".
    - The second note `english_words_in_swahili` (Swahili words borrowed from English: hoteli, polisi, kompyuta, televisheni,
      sinema, keki, bia) is extra to the brief. Each was confirmed on Wiktionary as an English loan. Drop it if the runtime shows
      one helpful_transfer note per bridge.
    - `bia` also has Arabic- and Bantu-origin homonyms; the beer sense is the English loan.
15. **No `false_friend` note.** I found no confident true false friends. Accidental look-alikes I considered and rejected:
    pole ("sorry", "slowly") against English "pole", safi ("clean") against "safe".
16. `reach.regions` is `["africa"]` only. Swahili is also spoken by diaspora communities outside Africa; I did not add them.
17. `related_language_tags: ["zu"]` as requested. Zulu is also a Bantu language but a distant relative of Swahili, so "relative"
    is only broadly true.
