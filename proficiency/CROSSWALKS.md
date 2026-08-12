# Gef external proficiency crosswalks

Machine-readable crosswalk data lives in `proficiency/external-crosswalks.json`.

The core rule is simple: **preserve the external result, then show a scoped Gef/CEFR reference beside it.** Never replace the original credential with a converted level.

## JLPT — Japanese-Language Proficiency Test

This is the cleanest external integration. From the December 2025 JLPT, the test authority itself reports CEFR reference levels for passing results based on JLPT level and total score.

- N5 passing result -> A1
- N4 passing result -> A2
- N3 score 95-103 -> A2
- N3 score 104+ -> B1
- N2 score 90-111 -> B1
- N2 score 112+ -> B2
- N1 score 100-141 -> B2
- N1 score 142+ -> C1

Scope warning: JLPT explicitly says its CEFR reference covers language knowledge and reception tested by JLPT, especially reading/listening. It does not prove speaking, writing, interaction, or mediation.

Gef may therefore show this as a **Reference equivalent**, not merely a guessed conversion.

Primary source: https://www.jlpt.jp/e/about/cefr_reference.html

## HSK — Chinese Proficiency Test

### HSK 2.0

The six-level HSK generation has historically published a direct issuer mapping:

- HSK 1 -> A1
- HSK 2 -> A2
- HSK 3 -> B1
- HSK 4 -> B2
- HSK 5 -> C1
- HSK 6 -> C2

Keep this attached specifically to `HSK 2.0`. The level numbers must never be reused as though they mean the same thing in HSK 3.0.

As of 12 Aug 2026, the official Chinese Tests Service still says regular 2026 exam dates use HSK 2.0. The Jan 31 2026 HSK 3.0 event was explicitly a pilot, with formal HSK 3.0 launch timing to be announced separately.

Primary sources:
- https://admin.chinesetest.cn/gonewcontent.do?id=40575936
- https://www.chinesetest.cn/notice

### HSK 3.0

HSK 3.0 uses three stages / nine levels. The official structure is strong enough for Gef to understand the ordering and skill model, but no authoritative current nine-level CEFR concordance was found.

Gef may therefore offer only an **estimated orientation**, marked `≈ Gef estimate`:

| HSK 3.0 | Gef orientation |
| --- | --- |
| 1 | ≈ A1 |
| 2 | ≈ A1-A2 |
| 3 | ≈ A2 |
| 4 | ≈ B1 |
| 5 | ≈ B1-B2 |
| 6 | ≈ B2 |
| 7 | ≈ B2-C1 |
| 8 | ≈ C1 |
| 9 | ≈ C1-C2 |

These rows are intentionally low-confidence heuristics. The more defensible statement is stage-level: Levels 1-3 are elementary territory, 4-6 intermediate, and 7-9 advanced. Never use this table for certification or silent automatic placement.

Primary current structure sources:
- https://www.chinesetest.cn/HSK
- https://www.chinesetest.cn/HSK/7-9

## Duolingo Score

Do not confuse two different 160-point Duolingo systems.

### In-app Duolingo Score

Duolingo publishes this course-progress alignment:

- 0-9 -> very early A1
- 10-19 -> early A1
- 20-29 -> high A1
- 30-59 -> A2
- 60-79 -> early B1
- 80-99 -> high B1
- 100-114 -> early B2
- 115-129 -> high B2
- 130-160 -> C1/C2

This describes progress through CEFR-aligned Duolingo course content. It is not an independent certification that every skill is at that level. Gef may accept a user-entered Duolingo Score as placement evidence with that limitation visible.

Primary source: https://blog.duolingo.com/duolingo-score/

### Duolingo English Test (DET)

DET is a separate standardized English test. Its published CEFR alignment is:

- 60-95 -> B1
- 100-125 -> B2
- 130-150 -> C1
- 155-160 -> C2

Primary source: https://blog.englishtest.duolingo.com/duolingo-test-aligned-with-cefr/

## ACTFL

ACTFL means **American Council on the Teaching of Foreign Languages**.

ACTFL states that its Proficiency Guidelines may be used for non-profit educational purposes only and that no other uses are authorized without express written permission. Gef therefore keeps ACTFL as an external framework reference only: framework name, factual level names, external credentials, and independently sourced concordance facts where lawful. Gef does not copy the Guidelines, examples, protected graphics, or issue an "ACTFL rating."

Primary source: https://www.actfl.org/use-of-actfl-proficiency-guidelines-and-issuing-of-official-actfl-tests

## Display rule

- Official issuer mapping: `Reference equivalent: B2`
- Gef-created heuristic: `Gef estimate: ≈ B2`
- Never hide the original source result.
- Never imply Gef is an official CEFR/JLPT/HSK/ACTFL/Duolingo certifier.
- Every mapping carries framework version and measured-skill scope.
