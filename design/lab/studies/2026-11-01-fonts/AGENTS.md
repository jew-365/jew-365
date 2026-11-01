# AGENTS.md

## Purpose

- The font study of 2026-11-01, for the owner's request: "change the fonts in the project, except the siddur's; give me ideas and examples of what fits best".
- One gallery page compares eight directions for every app font but the reader's ([../../../../src/theme/typography.ts](../../../../src/theme/typography.ts): `fontFamilies.heebo` changes, `fontFamilies.siddur` stays Noto Serif Hebrew): Heebo (today), Rubik (my pick), Assistant, Noto Sans Hebrew, IBM Plex Sans Hebrew, Fredoka, Secular One with Assistant, and Frank Ruhl Libre with Assistant.

## Ownership

- [fonts.json](fonts.json) is the study's data: per direction its letter, badge, names, mood, the family and weight of each type role (`display`, `title`, `heading`, `sub`, `body`, `bold`, the app's variants), its Google Fonts query, its `@expo-google-fonts` package and its pros and cons.
- [site-template.html](site-template.html) is the page: a quick one-line comparison, my recommendation, and one card per direction with a phone of home in the app's gold palette (a switch shows the dark palette) at the app's sizes.
- [build.mjs](build.mjs) writes the page into the build output (`out/`, never committed) from the two.

## Local Contracts

- A type study compares fonts on static screens, so it has no `x-dc` boards, no canvas and no `assemble.mjs`; the gallery page is its one Artifact (private): https://claude.ai/artifact/TwZBkoqrLdwdDL2QnaUcmp, published from the page the build writes. Republish to the same link after a change.
- The phones show Thursday 2026-10-29 in Jerusalem at 08:20 with that day's zmanim (sof zman tefila 09:32, mincha gedola 11:50, tzeit 17:22) from [../2026-10-29-home-ellipse/data.json](../2026-10-29-home-ellipse/data.json); the two marks (07:05, 07:12) are demo marks.
- Every candidate has an `@expo-google-fonts` package, so the owner's pick ships as an over-the-air update.

## Work Guidance

- Headless Chromium loads Google Fonts here only with the session proxy passed to `chromium.launch({ proxy })`; without it every font falls back and the cards look alike.

## Verification

- `node build.mjs` in this folder throws when a direction lacks a field.

## Child DOX Index

No child AGENTS.md files.
