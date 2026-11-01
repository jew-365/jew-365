# AGENTS.md

## Purpose

- The icon study of 2026-11-01, for the owner's request: today's icons do not fit; a Jewish icon set with tefillin, tallit, siddur and the like. No open icon set has one (19 Iconify sets searched, [../../../../not-close.md](../../../../not-close.md)), so the set is drawn here.
- Round 1 (line icons on the app's 24-unit grid in three line styles) was rejected by the owner the same day ("the icons look awful, give me something beautiful") and replaced in place.
- Round 2, the current one: one gallery page shows 21 flat, coloured illustrations, one per icon id of [../../../../src/components/MitzvahIcon.tsx](../../../../src/components/MitzvahIcon.tsx) that stands for a mitzvah, a siddur group or a Jewish topic, beside today's drawing, in the app's `IconTile` (the art at 30 points in the 44-point tile) and in mock rows of the library, the siddur tab and the More tab, in the gold and dark palettes, in two options: א full colour, ב the same drawings in the accent's tones only.

## Ownership

- [icons.mjs](icons.mjs) is the new set: per icon its id, Hebrew name, idea and `draw(uid)`, SVG markup on a 48-unit viewBox whose every colour is a role variable (`--i-ink`, `--i-gold`, `--i-paper`, `--i-flame`, `--i-wood`, `--i-wine` and the rest; `uid` names the shofar's gradient). [site-template.html](site-template.html) sets the roles: full colour in `:root`, the accent's tones under `.tonal`. Shared helpers draw a flame, a four-point star, a crescent from two circles and the open book.
- [gen-today.mjs](gen-today.mjs) renders today's drawings from the app source into [today.json](today.json) (sucrase and `react-dom/server` from the repo's `node_modules`); rerun it when `MitzvahIcon.tsx` changes.
- [site-template.html](site-template.html) is the page and [build.mjs](build.mjs) writes it into the build output (`out/`, never committed); the build throws on an icon id `MitzvahIcon.tsx` lacks.

## Local Contracts

- Published as one private gallery Artifact: https://claude.ai/artifact/Ghusk1YmPNfTaExY11gs8F, from the page the build writes. Republish to the same link after a change.
- The UI icons (chevrons, check, close, plus, minus, bell, search and the like), `custom`, `calendar` and `sun` stay as they are.
- The owner's pick moves into `DRAWINGS` of [../../../../src/components/MitzvahIcon.tsx](../../../../src/components/MitzvahIcon.tsx) as `react-native-svg` elements, which ships as an over-the-air update.

## Work Guidance

- Check a redrawn icon at 120 points and inside the 44-point tile, on the light and the dark tile, before publishing: at tile size a detail under about 2 units of the 48-unit box disappears.
- In the app the roles become fixed colours (or theme tokens for the tonal option) passed to `react-native-svg`, and the art needs its own size in `IconTile` (30 of 44 points, not the line icons' 24).

## Verification

- `node gen-today.mjs` (only when today's icons change), then `node build.mjs`, in this folder.

## Child DOX Index

No child AGENTS.md files.
