# Family Members relationship-set game policy

## Why broad game cards may contain several forms

`LES.mul.vocab.family_members` has fourteen cross-language **semantic relationship territories** for its universal game core. They are deliberately broader than many languages' lexical systems.

For example:

- English `brother` occupies one broad source slot.
- Mandarin subdivides that territory into `哥哥` and `弟弟`.
- English `uncle` occupies one broad source slot.
- Arabic subdivides that territory at least into paternal `عم` and maternal `خال` in the common-core layer.
- English `grandfather` occupies one broad source slot.
- Hindi commonly distinguishes `दादा` and `नाना` by family side.

A basic PairMatch game may therefore compare the **whole realization set**:

```text
brother  ↔  哥哥 · 弟弟
uncle    ↔  عم · خال
grandfather ↔ दादा · नाना
```

This means “these target forms occupy this broad relationship territory.” It does **not** mean the forms on the right are synonyms or interchangeable.

## Two different game contracts

### 1. Relationship-set comparison

Safe for the universal 104-language core.

- Prompt/card identity is the canonical relationship territory (`brother`, `uncle`, etc.).
- Render every reviewed/candidate realization attached to that territory for each language.
- Match source territory to target territory.
- Do not score one member of a multi-form set as equivalent to another member of the same set.
- This supports all 104 × 103 cross-language directions without forcing English-shaped lexicalization.

### 2. Individual-form selection

Requires feature-aware prompts.

If the game asks the learner to choose **one particular form**, the prompt must contain enough relationship features to make the answer defensible. Depending on the target language those features may include:

- older vs. younger;
- maternal vs. paternal side;
- older vs. younger sibling of the parent;
- speaker gender;
- relative gender;
- address vs. reference;
- register/honorific context;
- region or dialect where genuinely required.

Example: a Mandarin individual-form exercise must distinguish an older brother from a younger brother before asking for `哥哥` versus `弟弟`.

## Runtime rule

Never reduce a multi-form relationship territory to an arbitrary “representative” word solely to make a matching game simpler. Preserve the forms and either:

1. show them together as a relationship-set card, or
2. move to a feature-aware exercise that selects one form honestly.

This policy is reusable for other vocabulary families whenever the comparison concept is broader than a target language's lexical distinctions.

## Trust

Current 104-language Family Members game-core records are machine-draft content. Structural completeness and safe game semantics do not imply native-speaker certification of every form.
