# Family Members: 104-language core coverage

## Current product contract

The canonical language set comes from `Clickabl/gef-expo/registry/language-support.json`. Do not hard-code a separate strategic language list here.

The current Family Members architecture has three independent coverage layers:

1. **Best/source-language bridge:** every canonical learn-from language has localized bridge copy explaining that kinship systems do not map one-to-one.
2. **Rich target lesson:** Tier 1 Full Curriculum + Tier 2 Selective Lessons languages have structured kinship profiles with distinctions, representative vocabulary, cultural/usage cautions, examples, and safe-practice features.
3. **Core target game vocabulary:** every canonical learn-from language has at least the eight relationship concepts `mother`, `father`, `brother`, `sister`, `son`, `daughter`, `grandfather`, and `grandmother`. Tier 1–2 inherit these from rich target profiles. Tier 3 Read + Games languages use `lesson-families/family-members/game-vocabulary/tier3.json`.

This deliberately does **not** create a source-by-target matrix. A Nepali learner studying Portuguese resolves the Nepali source bridge + Portuguese rich profile. A Kurdish learner playing a family game in Hawaiian resolves Kurdish source concepts + Hawaiian Tier 3 core terms through the same relationship concepts.

## Tier 3 safety

Tier 3 vocabulary is initially recognition-safe candidate data. A slash-separated cell means there are multiple common forms or a lexical subdivision relevant to the broad relationship. Examples include older/younger siblings, maternal/paternal grandparents, speaker-gender distinctions, or register differences.

Until language-specific review proves a unique answer:

- safe: target form → relationship concept;
- safe: matching several accepted target forms to one broad relationship;
- safe: source-language relationship concept ↔ target-language recognition;
- unsafe: require one target form when the prompt omits a distinction the language lexicalizes;
- unsafe: infer a cultural claim merely from the existence of a lexical distinction.

## Research basis

The rich Tier 1–2 profiles retain their language-specific references. Cross-linguistic design is additionally checked against:

- **Kinbank v1.2**, a global kinship-terminology database released under CC BY 4.0: <https://github.com/kinbank/kinbank/tree/v1.2>. Gef uses it as a research/verification pool, not as permission to relabel machine-generated rows as reviewed.
- Passmore & Jordan, **“No universals in the cultural evolution of kinship terminology.”**
- **“The conceptual building blocks of kinship terminologies”** (Lingua, 2025), which reinforces modeling kin concepts as combinations of relationship features rather than English word equivalents.
- Cross-linguistic sibling terminology research comparing major European and Asian languages, especially relative-age lexicalization.
- `docs/FAMILY_MEMBERS_LESSON_RESEARCH.md` for the original language-specific profile research and editorial cautions.

## Cultural editorial rule

Language is not culture, and culture is not a compulsory family structure. A lexical system may encode age, side of family, gender, affinity, honorific status, or speaker relation without implying that every speaker values or organizes family life in the same way.

The lesson must keep adoption, stepfamilies, same-gender parents, chosen family, blended families, and nonbinary people possible. A conventional gendered lexical item is a fact about a form, not a rule about the learner's family.

## Review ladder

All newly generated Tier 3 forms remain `candidate` / `machine_translated`. Structural validation proves registry coverage and data shape only. It does not prove linguistic accuracy. Language-specific review may promote individual assets without changing the lesson graph or game IDs.
