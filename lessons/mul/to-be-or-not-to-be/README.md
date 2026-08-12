# To be or not to be — data boundary

Canonical user-facing title: **To be or not to be**.

The lesson directory owns pedagogical lesson structure and support-language lesson presentation.

Reusable cross-language Being grammar truth is owned by:

- `curriculum/semantic-functions.json`
- `curriculum/grammar-domains/being.v1.json`
- `curriculum/grammar-domains/being.concept-renderings.v1.json`

Those curriculum grammar-domain files are the preferred reusable data source for language-specific mappings and localized semantic labels/templates.

## Temporary comparison artifacts

The `language-maps/` directory and `concept-labels.json` were generated during the final 2026-08-11 archive/research pass as a second candidate implementation of the same information. They are **not** a second canonical database. Lexicon TODO #37 owns diff/reconciliation: carry forward any useful detail into `curriculum/grammar-domains/**`, validate the canonical contract, then remove the duplicates.

## Title policy

The final product title is the exact English quote fragment **`To be or not to be`**. Do not use the rejected joke variant `To be… or to be?` and do not automatically translate the Shakespeare quote as the lesson title. Explanations, semantic labels and grammar guidance are localized.

An older candidate field in `curriculum/grammar-domains/**` may still contain `To be, or not to be`; that comma is superseded by this final product decision and is queued for cleanup in TODO #37.

## Review state

All current Being grammar maps and multilingual concept renderings are candidate data until their language-specific research/review Tasks pass the required review gate. The existence of candidate mappings on `main` does not make them Lexi-verified facts.
