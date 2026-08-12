# Family Members lesson: research and editorial notes

## Scope

`LES.mul.vocab.family_members` is an A1 lexical-semantic lesson, not a grammar lesson and not a claim that there is one universal family taxonomy.

The scalable model has three independent layers:

- **104 learn-from languages** get localized source/best-language bridge copy.
- **Current Tier 1 + Tier 2 learning languages (21)** get a structured full target profile with beginner terms, distinctions, cultural cautions, examples, and full lesson practice.
- **All 104 canonical learn-from languages** get a `game-core` target record covering the same fourteen beginner semantic slots, so Tier 3 remains eligible for vocabulary comparison and games without being promoted to a full grammar/course tier.
- Source, full-target, and game-core assets are joined at runtime. Do **not** create a 104 × 104 matrix of pair-specific lesson files.

## Why the lesson is relationship-first

Kinship vocabularies are semantic systems. Languages can package relationship dimensions differently, including generation, gender, relative age, maternal/paternal side, affinity through marriage, sex or gender of the speaker, and address/register. A one-word English gloss can therefore erase information that another language's term requires, while a specific English phrase can also map to a broader term elsewhere.

The lesson's central learner habit is:

1. identify the actual relationship;
2. notice which dimensions the target language lexicalizes;
3. choose the target form that matches those relationship features;
4. treat address, affection, honorifics, and regional variants as usage layers rather than pretending one dictionary gloss covers everything.

## Universal game-core contract

The universal core has fourteen semantic slots:

`family`, `mother`, `father`, `brother`, `sister`, `son`, `daughter`, `grandfather`, `grandmother`, `uncle`, `aunt`, `cousin`, `husband`, and `wife`.

These are **semantic prompts, not promises that every language owns one matching word**. Each language record therefore stores a `forms[]` list for the slot. That list can represent:

- genuine alternatives or register variants;
- an obligatory semantic split, such as older/younger sibling;
- maternal/paternal distinctions;
- speaker-gender distinctions;
- gendered cousin forms;
- a conventional or descriptive phrase where the broad English slot has no single lexical equivalent.

A game must generate a relationship clue specific enough to make its selected target form defensible. For example, if a language distinguishes a father's brother from a mother's brother, the game must ask about the actual side rather than presenting both forms as interchangeable answers to a vague English `uncle` prompt.

The 104-language game core is structurally complete at `machine_translated` trust. That means it is ready for machine-draft/beta surfaces and systematic review; it does **not** mean 1,456 semantic slots have been independently certified by native speakers.

## Research anchors

- Anna Wierzbicka and related Natural Semantic Metalanguage work treats kin terms as language-specific semantic concepts rather than simple universal labels. A learner-oriented overview appears in *The Semantics of Nouns*, chapter “The meaning of kinship terms: A developmental and cross-linguistic perspective.”
- Passmore & Jordan, “No universals in the cultural evolution of kinship terminology,” emphasizes that kinship terminologies are culturally and linguistically diverse systems and cautions against assuming one universal evolutionary pattern.
- The 2025 *Lingua* paper “The conceptual building blocks of kinship terminologies” compares English, Chinese, and Pitjantjatjara and models cross-linguistic kin concepts as structured combinations rather than one-to-one translations.
- A 2026 *Language and Cognition* study compares sibling terminology across English, French, German, Spanish, Portuguese, Russian, Urdu, Arabic, Japanese, Korean, and Chinese and documents strong cross-language differences in relative-age encoding.
- Khishigsuren et al. (LREC 2022), “Using Linguistic Typology to Enrich Multilingual Lexicons: the Case of Lexical Gaps in Kinship,” models a large kinship concept inventory across hundreds of languages and is especially useful for the game-core design: lexical gaps and finer-grained language-specific terms are normal, so a multilingual system must permit phrases and semantic splits rather than force one-to-one English glosses.

### Licensing guardrail

The public KinDiv research dataset associated with the LREC paper inherits CC BY-SA data from Wiktionary. Gef does **not** import or copy its lexical rows. The research is used to inform the semantic architecture only. Family Members lexical strings in Gef are first-party generated/researched candidates and must follow normal Gef review/promotion rules.

## Worked reference pair: English → Spanish

The English rendering uses Spanish as the concrete worked example because the owner requested that pair, but no runtime rule is Spanish-specific.

Beginner-safe contrasts:

- English `brother / sister` → Spanish `hermano / hermana`.
- English `uncle / aunt` → Spanish `tío / tía`.
- English gender-neutral `cousin` → Spanish commonly requires `primo / prima`.
- Spanish normally adds sibling age descriptively: `hermano mayor`, `hermano menor`, `hermana mayor`, `hermana menor`.
- Spanish normally adds maternal/paternal side descriptively when relevant: `abuela materna`, `tío paterno`, etc., rather than requiring different basic aunt/uncle/grandparent nouns for the two sides.
- Common in-law vocabulary (`suegro/suegra`, `cuñado/cuñada`) belongs in richer target profiles rather than being forced into the fourteen-slot universal game core.

Spanish lexical checks use the Real Academia Española dictionary where possible for the full profile. Equivalent Tier 1/Tier 2 profiles should prefer first-party language authorities, professional dictionaries with compatible use for research, or high-quality linguistic research while still writing Gef's learner copy independently.

## Culture and usage model

The **21 full target profiles** carry the richer culture/usage layer. Important dimensions currently represented include:

- gender encoded in common kin terms;
- relative sibling age;
- maternal versus paternal side;
- relative age among a parent's siblings;
- speaker gender affecting the selected term;
- reference forms versus address/respect forms;
- kin terms used as broader social address;
- honorific/register effects;
- dedicated affinity/in-law vocabulary;
- regional and household variation.

A Tier 3 best/source language can still orient the learner through its localized source bridge. Runtime should explain the selected Tier 1/Tier 2 target profile from structured distinctions rather than requiring a pair-specific prose file. This is the path to fully localizing cultural explanation without creating 104 × 21 authored essays.

## Editorial safety rails

- **Language is not culture is not family structure.** A lexical distinction does not prove that every community using the language organizes family life around that distinction.
- **Do not exoticize specificity.** A language with more basic kin terms is not “more family-oriented,” “more traditional,” or “more precise” overall. It simply lexicalizes different distinctions.
- **Do not flatten dialects.** Arabic, Chinese, Hindi, Indonesian, and many other entries especially need regional review. Generated records are common-core teaching candidates, not final sociolinguistic authority.
- **Address is not reference.** Japanese, Korean, Vietnamese, Indonesian, and other languages can use kin terms in address systems in ways that do not map cleanly to literal biological kinship.
- **Keep adoption, stepfamilies, same-gender parents, chosen family, and nonbinary people possible.** The lesson teaches lexical relationships, not a required family shape. Gendered conventional terms describe lexical behavior, not a requirement that every learner's real family fit a binary template.
- **A broad slot may have several answers for a reason.** Do not randomly accept every form as a synonym. Games must condition prompts on the relationship distinctions required by the target language.
- **No fake exactness.** A complete generated game-core record remains machine-draft content until reviewed. Coverage is not certification.

## Trust and review

All source bridges, full target profiles, and universal game-core records begin at `machine_translated` / generated-or-candidate trust. The validator proves structure, exact registry coverage, Unicode integrity, and separation of full versus game-only tiers. It cannot prove that every low-resource lexical form is correct.

Promotion should happen per language or per leaf record through the normal Gef trust ladder. High-value and low-confidence languages should receive native-speaker/professional review first; corrections do not require changing the lesson graph.
