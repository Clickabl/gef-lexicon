# Family Members: 104-language core coverage

## Current product contract

The canonical language set comes from `Clickabl/gef-expo/registry/language-support.json`. Do not hard-code a separate strategic language list here.

The current Family Members architecture has four independent coverage layers:

1. **Best/source-language bridge:** every canonical learn-from language has localized bridge copy explaining that kinship systems do not map one-to-one.
2. **Reusable support-language facts:** the small stable set of kinship-language facts is localized once per source language, so an Oromo learner can receive an Oromo explanation of a Korean or Japanese distinction without an Oromo→Korean or Oromo→Japanese authored lesson copy.
3. **Rich target lesson:** Tier 1 Full Curriculum + Tier 2 Selective Lessons languages have structured kinship profiles with distinctions, representative vocabulary, cultural/usage cautions, examples, and safe-practice features.
4. **Universal target/game vocabulary:** every canonical learn-from language has the same 14 broad relationship concepts: `mother`, `father`, `brother`, `sister`, `son`, `daughter`, `grandfather`, `grandmother`, `uncle`, `aunt`, `cousin`, `niece_nephew`, `partner`, and `spouse`.

This deliberately does **not** create a source-by-target matrix. A Nepali learner studying Portuguese resolves the Nepali source/support copy + Portuguese rich profile + Portuguese universal vocabulary. A Kurdish learner playing a family game in Hawaiian resolves Kurdish support copy + Hawaiian universal vocabulary through the same relationship concepts.

## Universal concept safety

The 14 labels are semantic pivots, not claims that every language has one word for each relationship. A slash-separated cell means there are multiple common forms, a compositional description, or a lexical subdivision relevant to the broad relationship. Examples include older/younger siblings, maternal/paternal grandparents, speaker-gender distinctions, distinct uncle/aunt paths, register differences, or several common spouse/partner forms.

Until language-specific review proves a unique answer:

- safe: target form → relationship concept;
- safe: matching several accepted target forms to one broad relationship;
- safe: source-language relationship concept ↔ target-language recognition;
- safe: show all relevant forms when a broad concept underspecifies the target language;
- unsafe: require one target form when the prompt omits a distinction the language lexicalizes;
- unsafe: treat slash-separated forms as interchangeable synonyms without checking their features;
- unsafe: infer a cultural claim merely from the existence of a lexical distinction.

## Tier 1 / Tier 2 rich lesson

The rich target profiles are not generic essays about how families behave. They describe **kinship language and usage**: age distinctions, maternal/paternal side, gender, marriage links, address/reference forms, honorifics, social address, and broad/context-dependent terms where those matter for actual word choice.

A Tier 3 source-language learner can still consume these Tier 1/2 distinctions because the reusable fact inventory is localized once into every canonical support language. The target profile selects fact IDs; it does not carry 104 independently authored translations of the same linguistic claim.

## Tier 3 target policy

Tier 3 is intentionally narrower as a target:

- all 14 universal relationship concepts are present;
- comparison and recognition-safe games are available;
- multiple target forms are retained when the broad concept is underspecified;
- rich cultural-usage prose is not invented merely because a vocabulary row exists;
- language-specific review can later promote a Tier 3 target into a richer profile without changing the concept IDs or game contracts.

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

All newly generated universal forms and support-language fact translations remain `candidate` / `machine_translated`. Structural validation proves registry coverage and data shape only. It does not prove linguistic accuracy. Language-specific review may promote individual assets without changing the lesson graph or game IDs.
