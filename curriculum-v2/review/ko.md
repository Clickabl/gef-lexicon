# ko (Korean, standard South Korean, Hangul only): conventions, vocabulary outside the registry, and what a native-speaker reviewer must check

All content is `candidate`, never verified. Items marked **[CHECK]** are the ones I am least sure of or that need a decision.

What I did to check the work: I wrote the files from one scripted source, with self-checks (every `highlight` is really inside its word
after decomposing the Hangul syllables, every group covers every symbol once, every block's `parts` match the block). I then copied the
read-only `gef-lexicon` validator tree into my scratchpad, added the four realizations, the bridge and the merged English locale, and ran
`node scripts/validate-curriculum-v2.mjs` there: **OK** (ko complete, `slots_version: 2`, all labels and glosses present). I did not touch
the real tree. Word forms and IPA of every jamo example, hook, tricky/contrast word and bridge word were compared with the en.wiktionary
Korean entries (see the source list at the end). The files contain no em dash (U+2014) and no punctuation symbol needed leaving out (`punctuation` is empty, so no punctuation example exists).

Counts: overview 4 facts; writing 69 facts (11 layer facts, 11 groups, 40 jamo examples, 7 block examples); sounds 21 facts (8 tricky, 4
contrast pairs); grammar 33 facts (12 traits, 21 examples); bridge 18 helpful pairs in one note (10 + 8) and 8 false friends; locale 14 labels and 87 glosses.

## A. Conventions I chose

### A1. One layer `hangul` and the inventory (40 jamo)

- `writing.layers` = `["hangul"]`: `featural`, `Hang`, `primary`, `ltr`, `has_case` false, `joined` false, `vowels` `all_written`.
- **Hanja (Chinese characters) is not a layer.** South Korean everyday text is Hangul only; Hanja shows up in names, newspapers' headlines and
  dictionaries. North Korea (Chosŏn'gŭl, different letter names and dictionary order) is not covered. Hangul can also run top to bottom (signs,
  calligraphy); the lesson shows horizontal.
- **Inventory = 40 jamo**: 14 basic consonants, 10 basic vowels, 5 tense consonants, 11 compound vowels (the South Korean dictionary counts
  19 consonants and 21 vowels; same 40).
- `symbols` is in **teaching order** (the groups joined), not dictionary order (ㄱ ㄲ ㄴ ㄷ ㄸ ㄹ … / ㅏ ㅐ ㅑ ㅒ …). **[CHECK]** If the "all symbols"
  board should follow the dictionary order, only `symbols` needs reordering; the groups stay.
- Not listed as symbols (spelled from jamo a reader already has): the 11 two-letter final clusters (ㄳ ㄵ ㄶ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ ㅄ). One of them is
  shown inside the block example 닭. `marked` is empty and so is `punctuation` (Korean uses the Western marks; words are separated by spaces).

### A2. Teaching groups (11 groups of 3 to 5; each symbol once)

| # | Symbols | Idea |
|---|---|---|
| 1 | ㅏ ㅓ ㅗ | first vowels |
| 2 | ㅜ ㅡ ㅣ | the other three straight-stroke vowels |
| 3 | ㅑ ㅕ ㅛ ㅠ | the same four with a second stroke = y-glide |
| 4 | ㅇ ㄱ ㅋ ㄲ | back of the mouth (ㅇ first, because blocks need it; final ㅇ is also "ng", made in the same place) |
| 5 | ㄴ ㄷ ㅌ ㄸ ㄹ | tongue tip (plain, puff-of-air partner, tense partner, then ㄹ) |
| 6 | ㅁ ㅂ ㅍ ㅃ | lips |
| 7 | ㅈ ㅊ ㅉ | the "j" family |
| 8 | ㅅ ㅆ ㅎ | hissing and breathy sounds |
| 9 | ㅐ ㅒ ㅘ ㅙ | compound vowels built on ㅏ |
| 10 | ㅔ ㅖ ㅝ ㅞ | compound vowels built on ㅓ |
| 11 | ㅚ ㅟ ㅢ | compound vowels ending in ㅣ after ㅗ ㅜ ㅡ |

- Reading of the brief: the six first vowels, then the four y-vowels, then consonants by place of articulation, then compound vowels. I put
  each **aspirated and tense partner directly after its plain consonant** (ㄱ ㅋ ㄲ), not all partners at the very end, because the family
  shows the three-way contrast and the shape logic (extra stroke = puff of air, doubled = tense) at once. **[CHECK]** If you meant "all
  partners last", regroup (every group still needs 3 to 5 symbols).
- Letters that sound the same for most Seoul speakers are never in the same group: ㅐ/ㅔ (group 9 vs 10), ㅒ/ㅖ (9 vs 10), ㅙ/ㅚ/ㅞ (9, 11, 10).
  See C2.

### A3. How a Hangul block is built (for the lesson copy)

A syllable block is **initial consonant + vowel + optional final consonant(s)**, stacked into one square. Blocks read left to right like English.

- Every block has an initial consonant slot. When the syllable starts with a vowel, the silent **ㅇ** holds the place: 아 is "a".
- The vowel's shape decides where it sits. Vertical vowels (ㅏ ㅑ ㅓ ㅕ ㅣ ㅐ ㅒ ㅔ ㅖ) go to the right of the consonant (나). Horizontal vowels
  (ㅗ ㅛ ㅜ ㅠ ㅡ) go underneath it (고). Compound vowels with both strokes (ㅘ ㅙ ㅚ ㅝ ㅞ ㅟ ㅢ) wrap right and below.
- A final consonant (받침) goes underneath: 한 = ㅎ + ㅏ + ㄴ, 물 = ㅁ + ㅜ + ㄹ. The same letter can be the initial or the final: ㅇ is silent at the
  start and "ng" at the end (강). A block can hold two finals, and only one is heard (닭 is said "dak").
- The seven `block_*` examples (아, 나, 고, 한, 물, 강, 닭) show exactly these cases. Each is a `writing.hangul.example.block_*` fact whose
  `highlight` is the **whole block**, whose `sound`/`reading` are the block's, and whose `parts` (e.g. `"ㅎ + ㅏ + ㄴ"`) list its jamo. They are
  not in `symbols` or any group (same as an extra example). **[CHECK]** The app must not treat these as inventory entries.

### A4. Unicode and highlight matching (app-side)

- `symbols`, groups and `highlight` use the **compatibility jamo** (U+3131 to U+3163: ㄱ ㅏ …). Words and blocks use ordinary precomposed
  syllables (NFC). A jamo is not a separate character inside a word, so the app has to decompose the word (NFD gives *conjoining* jamo,
  U+1100 to U+11FF, with different code points for the same letter as initial or final) and map compatibility jamo to them to find and
  highlight ㅏ in 아기. I checked every jamo example with such a mapping (letter name `HANGUL LETTER X` to `HANGUL CHOSEONG/JUNGSEONG/JONGSEONG X`).
  **[CHECK]** For ㅇ both occurrences are highlighted, silent initial and final "ng".

### A5. Qualifiers

- `sound` = the sound the symbol makes **in the position of the example word** (INTRO_FACTS wording). For consonants this is initial
  position (`k` in 가방), except: ㄹ has an example with the letter between vowels (`ɾ`, in 구름; `position: "between vowels"`) and ㅇ has an example with
  the letter at the end (`ŋ`, in 공; `position: "final"`). Initial and final differ, so the file says so with extra qualifiers:
  `position` (`initial`, `between vowels`, `final`), `final_sound` (what the consonant sounds like at the end of a syllable: ㄱ `k̚`, ㄷ `t̚`,
  ㅂ `p̚`, ㅅ ㅈ ㅊ ㅌ ㅎ ㅆ `t̚`, ㄹ `l`, ㄴ `n`, ㅁ `m`, ㅇ `ŋ`; absent for ㄸ ㅃ ㅉ, which never end a syllable) and, for ㅇ only,
  `initial_sound: "silent"`. These three keys are **not in INTRO_FACTS.md**; strip or bless them.
- `reading` = Revised Romanization of the jamo, with the dual forms the brief shows: ㄱ `g/k`, ㄷ `d/t`, ㅂ `b/p`, ㄹ `r/l`. ㅇ is `ng` (its
  final value; it is silent at the start). **[CHECK]** Possible drill clash: "Which one says k?" has ㅋ (`k`) and ㄱ (`g/k`) as answers; the same for d/t, b/p.
  If the drill matches strings exactly there is no problem; if it is read aloud to the learner, consider `g` for ㄱ.
- `name` = the standard South Korean letter name with its romanization: 기역 (giyeok) … for consonants (쌍기역 … for the tense ones), and the
  vowel written with a silent ㅇ for vowels (아 (a), 여 (yeo) …). North Korean names differ.
- `looks_like` only where a Latin capital resembles the shape and the sound is different: ㄴ L, ㄷ C, ㅌ E, ㅇ O, ㅜ T, ㅣ I. **[CHECK]** Cosmetic; it is
  the learner's first impression, not a scholarly claim. Drop any you dislike.
- `reading` is also on every spoken example outside the writing topic (hook, tricky, contrast, grammar examples), as for `zh`, because the
  value is in Hangul and a beginner cannot read it yet. `ipa` is on all of them too.
- `parts` (briefed for characters) is reused on block examples (jamo of the block) and on the two `trait.word_building` examples (word pieces).
- Grammar `level` (`casual`, `polite`, `formal`) on the three `trait.formal_you` examples is an extra key beside `register` (see C16).

### A6. IPA conventions

Standard Seoul Korean, broad but with the predictable allophones that help a learner: plain stops are voiceless at the start of a word and
**voiced between voiced sounds inside a word** (가방 `kabaŋ`, 아기 `aɡi`); tense `͈` (`p͈ t͈ k͈ s͈ tɕ͈`), aspirated `ʰ`, unreleased final stops `k̚ t̚ p̚`;
ㄹ is `ɾ` between vowels and `l` at the end of a syllable; ㅅ is `ɕ` before ㅣ and the y-vowels; ㅇ at the end is `ŋ`. IPA uses `ɡ` (U+0261) as the
other files do. Several-word examples are written **word by word as in a citation form** (no assimilation or tensification across spaces). The
inventory lists `l` and `ɾ` both, although they are one phoneme with two realizations (it is what a learner hears).

### A7. Sounds topic

- `tones.system` `none` (no examples); `stress.pattern` `not_applicable` (as briefed: Korean has no word stress to learn; phrase-level pitch
  patterns are not taught here); `spelling.predictability` `high` (see C13 for the caveat).
- Three-way contrast: `sounds.tricky.plain` (바다, `p`), `.aspirated` (코, `kʰ`), `.tense` (빵, `p͈`), and contrast pairs 1 (달 / 딸), 2 (불 / 풀), 3 (사다 / 싸다), so
  each series has a listening pair. Also tricky: `eu` (ㅡ), `eo` (ㅓ), `rieul` (ㄹ), `final_k` (a final ㅋ is just an unreleased k: 부엌), `s_before_i` (시간).
  Contrast pair 4 (고기 / 거기) is ㅗ vs ㅓ.
- **Vowel length is deliberately not in the data.** Standard Korean describes long and short vowels (눈 "eye" short, 눈 "snow" long), but length is
  "almost completely neutralized" among Seoul speakers today (Wikipedia, Korean phonology) and the pairs are spelled the same, so a listening
  pair cannot be built from text. No `ː` is used in `sounds.vowels`. Mention it, if at all, in the copy.
- **Final consonant neutralization** is the `final_k` tricky sound and the `final_sound` qualifier on each consonant; the label
  `sound.ko_final_stops` explains it.

### A8. Grammar mapping (closest values; see C16 for the imperfect fits)

`word_building` agglutinating; `noun_gender` none; `classifiers` required (counters); `formal_you` levels; `verb_endings` many; `subject_pronouns`
context_dependent; `cases` none (particles mark roles); `dual_number` none; `adjective_position` before_noun; `articles` none; `questions`
intonation_or_inversion (my judgement); `word_order` sov.

### A9. Overview

`family_id` `koreanic`, `branch_ids` `["korean"]`, `origin_region_ids` `["asia"]`, `reach.regions` `["asia"]` (diaspora in the Americas and
elsewhere is not modelled, as for `zh`), `script_ids` `["Hang"]`. `related_language_tags` is **empty**: the only other Koreanic language, Jeju (Jejueo), has no
tag in `registry/language-support.json`, and I did not list Japanese because a family link is not established. Hook: 안녕하세요 with the
decoys 감사합니다 (thank you) and 물 (water).

## B. Vocabulary values and labels outside the registry or the existing locale

No new value was needed in `slots/slots.json`: every value I used (`featural`, `levels`, `context_dependent`, `sov`, `not_applicable`, …) is already there.
Free-text ids I introduced (labels are in `locale-en.json`):

| Id | Where | Label |
|---|---|---|
| `family_id` `koreanic` | overview | `family.koreanic` "Koreanic" |
| `branch_id` `korean` | overview | `branch.korean` "Korean" |
| script `Hang` | writing | `script.Hang` "Hangul alphabet" |
| layer `hangul` | writing | `layer.hangul` "The Hangul alphabet"; `layer.hangul.lesson` "Learn the Hangul alphabet" |
| (optional) | writing | `layer.hangul.note`: how blocks are built, in 3 sentences (like `layer.hanzi.note`; no scene asks for it yet) |
| `variety` `standard` | sounds | none needed |
| `note_id` `ko_plain_stops`, `ko_aspirated`, `ko_tense_consonants`, `ko_eu_vowel`, `ko_eo_vowel`, `ko_rieul`, `ko_final_stops`, `ko_s_before_i` | sounds.tricky.*, sounds.contrast.* | `sound.ko_*` (8 labels) |

Reused, not re-supplied: `region.asia`, `direction.ltr`, `kind.featural`, `stress.not_applicable`, `predictability.high`, every `trait.<name>.<value>` label, `register.informal`, `register.formal`.
No `mark.*` or `tone.*` labels: there are no `mark` or `tones.example.*` facts (see C12). **Extra qualifier keys** beyond INTRO_FACTS.md: `position`, `final_sound`,
`initial_sound` (writing examples), `reading` (all spoken examples), `parts` (blocks, word pieces), `level` (formal_you examples).

## C. Uncertain items and decisions for a native-speaker / phonetics reviewer

1. **[CHECK] Group order and the "partners" reading** (A2). Also: the four y-vowels are taught before any consonant. If you prefer the y-vowels
   after the first consonant groups, swap group 3 with group 4 and nothing else changes.
2. **[CHECK] Same-sound letters and the "which letter did you hear" drill.** For most Seoul speakers ㅐ = ㅔ ([e̞]), ㅒ = ㅖ ([je̞]), and ㅙ = ㅚ = ㅞ ([we]).
   A drill that plays 개 ("dog", ㅐ) and 게 ("crab", ㅔ) cannot be answered by ear. Within each group no two letters sound alike, so group drills
   are safe. The **mixed review across groups** must not ask "which letter is in the word you hear" with such a pair among the answers (or must accept both).
   Facts about the pairs: `sound` of ㅐ is `ɛ` and of ㅔ is `e` (the spelling-based values; Wiktionary shows both as [ɛ] ~ [e̞]).
3. **[CHECK] Highlight matching** (A4): compatibility jamo vs conjoining jamo; silent-ㅇ highlight.
4. **[CHECK] Vowel `sound` values.** ㅓ `ʌ` (Wiktionary [ʌ̹], many speakers say [ɔ]); ㅚ `we` (formal [ø], Wikipedia: most speakers now use the diphthong); ㅟ `wi`
   (Wiktionary 귀 [kɥi] ~ [ky]; Wikipedia: nearly 90% of Seoul speakers say [ɥi]); ㅢ `ɰi` (becomes [i] after a consonant, [e] as the possessive particle 의; I used the
   word-initial value in 의자); ㅖ `je` (after a consonant other than ㅇ it is usually [e], so I used 예 with the silent ㅇ, not 시계). The monophthong list
   `sounds.vowels` has 8 vowels; the glides are in `sounds.consonants` (`j w ɰ`), as in the zh and en files.
5. **[CHECK] ㄹ and ㅇ.** ㄹ example 구름 has the letter between vowels (Korean has no native word that starts with ㄹ; loanwords like 라면 do). ㅇ example 공 shows only the final
   `ŋ`; the silent initial is explained by `initial_sound` and the block 아. `reading` `ng`.
6. **[CHECK] `reading` ambiguity** (A5): `g/k`, `d/t`, `b/p` vs `k`, `t`, `p`.
7. **[CHECK] Plain vs aspirated in today's Seoul speech.** For many younger speakers the word-initial plain/aspirated difference is carried mainly by pitch rather than
   by the puff of air. The pairs 불 / 풀 and 달 / 딸 / 사다 / 싸다 are still standard textbook pairs, but a text-to-speech voice may not separate 불 / 풀 well.
8. **[CHECK] IPA details.** (a) Voicing rule and no cross-word processes (A6). (b) 안녕하세요 `annjʌŋhasejo` (Wiktionary [a̠nɲʌ̹ŋɦa̠sʰe̞jo]): I wrote the geminate nasal and `h`
   phonemically. (c) ㅅ before ㅕ: Korean 셔 is [ɕʌ]; I wrote `ɕʌ` (마셔요 `maɕʌjo`, 맨션 `mɛnɕʌn`), not `ɕjʌ`. (d) 회사 `hwesa`: ㅎ is realized [ɸ] before ㅚ (Wiktionary [ɸwe̞sa̠]).
   (e) 태권도 `tʰɛk͈wʌndo` has the tense k of the standard pronunciation; 비빔밥 `pibimp͈ap̚` (tense) and 김밥 `kimbap̚` (Wiktionary lists both; I used the
   untensed one). (f) 한류 `hallju` (ㄴ becomes ㄹ before ㄹ; Wiktionary [ha̠ʎʎu]).
9. **[CHECK] Word choices.** Concrete, common, short; exceptions: ㅇ/ㄹ/most compound vowels do not start their word (Korean words starting with those letters are rare or
   have a silent ㅇ); 빵 (bread) is a loanword (I believe via Japanese from Portuguese; Korean has no native word for it) and 스웨터 (ㅞ) is from English, because ㅞ has hardly
   any native everyday word; 예 ("yes") and 얘기 ("talk", the usual spoken form of 이야기) are abstract but are the plain examples of ㅖ and ㅒ; 원숭이 has 3 blocks (8 jamo): I read
   "at most 7 letters" as 7 blocks. Homographs or multiple meanings to keep in mind: 풀 (grass; also glue), 싸다 (to be cheap; also to wrap), 은행 (bank; also ginkgo),
   유리 (glass; also "advantage"), 개 (dog; also the counter 개), 공 (ball; also "zero"), 달 (moon; also "month" in 한 달). Glosses give the main meaning only.
10. **[CHECK] Letter names.** I used the South Korean standard names (기역 니은 디귿 리을 미음 비읍 시옷 이응 지읒 치읓 키읔 티읕 피읖 히읗, and 쌍- for the five tense ones) and the
    vowel-with-ㅇ names for vowels. I did not look them up again on a dictionary page; they are well-known.
11. **[CHECK] Block examples.** 한국 is used for 한 ("Korea" is not concrete but it is the most useful word); 닭 `tak̚` is advanced (two finals) and could be dropped.
12. **No `mark` facts.** Hangul has no diacritics that change a sound or vowel (the old tone dots and ㆍ are obsolete), so none of the mark ids in slots.json applies and
    `writing.hangul.mark.*` is absent. The lesson's "marks" scene will be empty for ko, as intended.
13. **[CHECK] `spelling.predictability` `high`** is true for reading Hangul aloud letter by letter, but Korean spelling keeps the written form of the word parts
    and the **pronunciation rules change the sound at syllable borders** (liaison: 집에 [tɕibe]; nasalization: 갑니까 [kamnik͈a]; tensification: 먹겠어요 [mʌk̚k͈es͈ʌjo]; dropping of ㅎ: 좋은 [tɕoɯn];
    palatalization: 같이 [katɕʰi]; final neutralization: 꽃 [k͈ot̚]). The examples I chose use these on purpose in a few places (listed with the grammar examples
    below) and avoid them in the single-word jamo examples. The copy should say "reliable, with a few sound rules to learn".
14. **[CHECK] Sound changes in the grammar and bridge examples** (IPA from my own knowledge; only the single words were compared with Wiktionary): 갑니까 `kamnik͈a`, 먹겠어요 `mʌk̚k͈es͈ʌjo`,
    좋은 `tɕoɯn`, 있어요 `is͈ʌjo`, 집에서 `tɕibesʌ`, 먹었어요 `mʌɡʌs͈ʌjo`, 사랑해요 `saɾaŋhɛjo`, 친구들에게 `tɕʰiɡudɯɾeɡe`. Multi-word examples are in citation form: real speech tenses
    or voices some word starts (책 세 권, 두 개) and I did not mark that.
15. **[CHECK] Colloquial tense in loanwords.** Wiktionary shows 버스 [p͈ʌs͈ɯ] and 서비스 [s͈ʌbis͈ɯ] (tense, as often said); the standard spelling pronunciation is plain, and I wrote the plain
    form (`pʌsɯ`, `sʌbisɯ`). 택시 is `tʰɛk̚ɕ͈i` (tense ㅅ, as Wiktionary).
16. **[CHECK] Grammar: imperfect fits.**
    - `verb_endings` `many`: Korean verb endings are many (tense, politeness, mood, sentence type) but **do not agree with the subject**. The generic label
      `trait.verb_endings.many` says "verbs change their form to match the subject", which is **wrong for Korean**. The glosses of both examples say what really changes
      (and example 2 shows the verb staying the same for 저는, 너는, 우리는). Suggest a new value or a re-worded generic label ("change their endings for time, politeness and more").
      Because the lesson will compare with English (`few`), the comparison itself comes out right.
    - `cases` `none`: as briefed ("particles mark roles"). Korean nouns do not change shape; roles are marked by attached particles (이/가 subject, 은/는 topic, 을/를 object).
      Many grammars call those particles case markers. The example shows the particles swapping with the roles.
    - `dual_number` `none`: the label says "just singular and plural"; in Korean the plural marker 들 is optional and most nouns are unmarked for number. No example (value `none`).
    - `questions` `intonation_or_inversion`: everyday polite questions are a rising voice on the same sentence (커피 마셔요?); formal and casual styles use sentence-ending question
      forms (-ㅂ니까, -니) that replace the statement ending; question words stay in place. No separate question particle, so `particle` fits worse.
    - `formal_you` `levels`: three examples, casual 가?, polite 가요?, formal 갑니까?; `register` is `informal`, `informal`, `formal` so that the existing "which is formal" label ids work; the real
      distinction is in `level`. Korean has more levels than three, and avoids "you" itself, using names and titles. No qualifier is needed for `levels`.
    - `subject_pronouns` `context_dependent` fits (as for zh): both "I" and "you" are dropped in 사랑해요.
    - `classifiers` `required`: native numerals 두, 세, 한 with the counters 개 (things), 권 (books), 마리 (animals). With Sino-Korean numerals other counters are used (not shown).
    - `word_building` `agglutinating`: pieces are stacked on a root (집 + 에서; 먹 + 었 + 어요).
17. **Overview wording.** Scene copy "belongs to the Koreanic family, in the Korean branch" reads oddly because the family has two members (Korean and Jejueo) and some scholars treat Korean as an
    isolate. Fine as data; the copy author may want the "only living language of its branch" label. Japanese is not listed as a relative (the "Altaic" family is not accepted by most linguists).

## D. Bridge `bridge-en-ko.json`

Two notes: one `helpful_transfer` note, `loanwords_both_ways`, holding all 18 pairs (the app shows only the first note's text, so the text says honestly what the pairs are:
no cognates, loanwords in both directions, **the first 10 pairs are English words that came from Korean, the last 8 are Korean words that came from English**; the numbers in the text are
generated from the lists) and one `false_friend` note with 8 pairs.

- English words from Korean (pairs 1 to 10): kimchi, taekwondo, bulgogi, bibimbap, kimbap, soju, hangul, hanbok, mukbang, chaebol. Etymologies compared on en.wiktionary (all
  "borrowed from Korean"; chaebol is from the McCune-Reischauer form). Left out on purpose: hallyu and banchan (hallyu has no English Wiktionary entry; both are in the OED's Sept 2021
  batch of Korean words, which I only saw through news pages) and japchae. **[CHECK]** If you want them back, hallyu is 한류 `hallju`, banchan 반찬 `pantɕʰan`. `to` is the Korean spelling of the same word.
- Korean words from English (pairs 11 to 18): 커피 coffee, 컴퓨터 computer, 택시 taxi, 버스 bus, 호텔 hotel, 아이스크림 ice cream, 샌드위치 sandwich, 텔레비전 television. All have Wiktionary Korean
  entries with these meanings. 텔레비전 `tʰellebidʑʌn` (ㄹ + ㄹ is said double). The "no f or z, extra vowels" remark in the text is from general knowledge of Korean loanword adaptation (ㅍ for f, ㅈ for z, 으
  inserted). More true pairs were checked and are easy to add: 인터넷 internet, 카메라 camera, 초콜릿 chocolate, 케이크 cake.
- `konglish_false_friends` (`to_meaning` is what the Korean word really means): 파이팅 ("go for it!", from "fighting"), 서비스 ("on the house, a free extra"; it also means service), 맨션 ("apartment
  building", Wiktionary: condominium, apartment building), 콘센트 ("wall socket"), 샤프 ("mechanical pencil", a clipping of 샤프펜슬), 원피스 ("a dress"), 노트북 ("a laptop"), 커닝 ("cheating on a test").
  All eight meanings were read in the Korean Wiktionary entries; 맨션, 서비스, 커닝 were also confirmed in a Konglish article (Migaku). **[CHECK]** 노트북 (some
  English speakers say "notebook" for a laptop, so it is a weaker false friend) and 맨션 (in Korea it is also used for a low-rise block, not only luxury ones). Skipped on purpose: 핸드폰
  (a Korean-made compound, not a mismatched pair), 미팅 (its meanings have shifted).

## E. Sources I used

- Wikipedia, "Korean phonology" (consonant and vowel inventory, ㅐ/ㅔ merger, ㅚ/ㅟ, ㅢ, seven final sounds, vowel length, ㅅ before i): https://en.wikipedia.org/wiki/Korean_phonology
- en.wiktionary Korean entries (IPA and meaning), read through the MediaWiki API: every jamo example word and block word (아기, 어머니, 오리, 우산, 은행, 이름, 그림, 야구, 여우, 요리, 유리, 가방, 나무, 달, 구름, 문, 바다, 사과, 공, 집,
  치마, 코, 토끼, 포도, 하늘, 꼬리, 딸기, 빵, 쌀, 찌개, 개, 얘기, 과일, 돼지, 게, 예, 원숭이, 스웨터, 회사, 귀, 의자, 아이, 나라, 고기, 한국, 물, 강, 닭), the sound words (부엌, 꽃, 시간, 불, 풀, 사다, 싸다, 딸, 거기), the hook words (안녕하세요, 감사합니다),
  and all bridge words; en.wiktionary English entries for the etymologies of kimchi, taekwondo, bulgogi, bibimbap, kimbap, soju, hangul, hanbok, mukbang, chaebol, banchan.
- OED Korean words (Sept 2021), via news pages: https://abs-cbn.com/life/10/07/21/26-korean-words-added-to-oxford-english-dictionary and https://blog.talktomeinkorean.com/korean-words-in-the-oxford-english-dictionary/
- Konglish false friends: https://migaku.com/blog/korean/korean-false-friends
- `registry/language-support.json` (valid tags; `ko` is Tier 2; no Jejueo tag).
