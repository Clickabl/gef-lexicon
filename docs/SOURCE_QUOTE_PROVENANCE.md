# Source, quotation, and translation provenance

This document defines reusable source records for quoted media and translated quotation evidence. Canonical quotation text and occurrence metadata live in `Clickabl/gef-content`; reusable bibliography/source identities live in this repository.

## Source identity

Every externally quoted passage should reference a stable `source_id` from `sources/bibliography.json` when a reusable source identity exists. Do not duplicate film/song/book titles, URLs, release years, or external IDs into every occurrence.

Quoted-media source types include films, television series/episodes, songs, poems, plays, video games, speeches, advertisements, internet memes, social-media posts, and release-specific translation sources.

A `release_variant` source may point to a parent work with `parent_source_id` and describe a locale/channel such as an original text, official subtitle, dub, published translation, caption track, transcript, or script. This is important because an official dub and an official subtitle can legitimately use different wording.

## Translation provenance

Content editions must distinguish how quotation wording was obtained. The content repository's edition/quote schemas support methods such as:

- `original_text`
- `original_dialogue`
- `official_subtitle`
- `official_dub`
- `official_published_translation`
- `human_translation`
- `machine_translation`
- `inferred_translation`
- `unknown`

Verification is independent from method. A machine translation can be reviewed; an alleged official subtitle can still be unverified. Never infer `official` from fluency or familiarity.

When multiple official variants exist, retain them as distinct evidence rather than collapsing them. One variant may be selected as preferred for a particular content edition while alternatives remain available for linguistic comparison.

## Origin vs verification

The `source_id` attached to a quote identifies the originating work whenever possible. Exact-wording verification may come from a different reusable source, such as an official studio article, transcript, subtitle release, archive, or a curated reference. `gef-content` records those separately as `verification_source_ids` so provenance does not accidentally redefine the quote's origin.

## Quotations and lesson evidence

Do not store copyrighted quote text in lesson definitions or reusable lexicon objects. Lessons query corpus occurrences in `gef-content` using stable work/anchor/span IDs. This preserves the existing rule that reusable lesson logic is independent from book/example text.

Source identity is provenance, not permission. Rights/publication decisions belong to `gef-content` and must not be inferred from a `source_id` or an `official_url`.
