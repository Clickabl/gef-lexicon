# Lexi SSOT moved

The canonical Lexi system now lives under `lexi/` so the feature has one obvious front door and one folder per integration.

Start here:

- Human SSOT: `lexi/README.md`
- Machine SSOT: `lexi/system/manifest.json`
- Integration contract: `lexi/system/integration.schema.json`
- Integration folders: `lexi/integrations/*/integration.json`
- Annotation index: `lexi/annotations/README.md`
- Research boundary: `lexi/research/README.md`

This compatibility pointer exists so older links into `docs/LEXI_SSOT.md` do not become misleading. New architecture references should point directly into `lexi/`.
