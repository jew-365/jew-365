# AGENTS.md

## Purpose

- The icon study of 2026-11-01, for the owner's request: today's icons do not fit; a Jewish icon set with tefillin, tallit, siddur and the like. No open icon set has one (19 Iconify sets searched, [../../../../not-close.md](../../../../not-close.md)), so the set is drawn here.
- One gallery page shows 21 new drawings, one per icon id of [../../../../src/components/MitzvahIcon.tsx](../../../../src/components/MitzvahIcon.tsx) that stands for a mitzvah, a siddur group or a Jewish topic, in three styles (א thin line 1.6, ב bold line 2.1, ג duotone: line 1.6 with the main shape filled with the accent at 28%), beside today's drawing, in the app's `IconTile` and in mock rows of the library, the siddur tab and the More tab, in the gold and dark palettes.

## Ownership

- [icons.mjs](icons.mjs) is the new set: per icon its id, Hebrew name, idea and `draw(f)`, SVG markup on the app's 24-unit viewBox with round caps and joins, where `f` fills the main shape (`none` in outline). The tallit (`shacharit`) is the logo's `tallitShawl` from [../../../jew365-concepts/vector/build.mjs](../../../jew365-concepts/vector/build.mjs), its coordinates baked into the 24-unit box.
- [gen-today.mjs](gen-today.mjs) renders today's drawings from the app source into [today.json](today.json) (sucrase and `react-dom/server` from the repo's `node_modules`); rerun it when `MitzvahIcon.tsx` changes.
- [site-template.html](site-template.html) is the page and [build.mjs](build.mjs) writes it into the build output (`out/`, never committed); the build throws on an icon id `MitzvahIcon.tsx` lacks.

## Local Contracts

- Published as one private gallery Artifact: https://claude.ai/artifact/Ghusk1YmPNfTaExY11gs8F, from the page the build writes. Republish to the same link after a change.
- The UI icons (chevrons, check, close, plus, minus, bell, search and the like), `custom`, `calendar` and `sun` stay as they are.
- The owner's pick moves into `DRAWINGS` of [../../../../src/components/MitzvahIcon.tsx](../../../../src/components/MitzvahIcon.tsx) as `react-native-svg` elements, which ships as an over-the-air update.

## Work Guidance

- Check a redrawn icon at 96 points and inside a 44-point tile before publishing: at tile size a detail under about 1.5 units disappears.

## Verification

- `node gen-today.mjs` (only when today's icons change), then `node build.mjs`, in this folder.

## Child DOX Index

No child AGENTS.md files.
