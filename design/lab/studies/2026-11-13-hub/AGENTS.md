# AGENTS.md

## Purpose

- The study of 2026-11-13 for phase 2 of the discoverability program ([../../../../.claude/specs/discoverability.md](../../../../.claude/specs/discoverability.md), C4, C5, B1 and B2): the More tab as a capabilities hub, the new "all capabilities" screen and home's entry points, for the owner's pick before any code of that phase.
- The More tab: today's tab beside א named groups (the recommendation: search, "worth trying" with up to three offers, the row to all capabilities, then learning, prayer texts and tools, the calendar and the app with all mitzvot), ב goal tiles (offers in a sideways strip, one tile per goal with its capability icons, lit when on) and ג search first (a large field, common searches, one offer, an index of the goals). A switch on the page shows the tab named עוד or גלה (open decision 4).
- The capabilities screen: א one list by goal with a goal strip, "turn all on" per goal and each row's state and action (the recommendation), ב one folding card per goal with its icon strip.
- Home: today's home beside א a round search button by the logo and an "all mitzvot" row in My day (the recommendation), ב a search field under the greeting and a text link under My day.

## Ownership

- [gen-data.mjs](gen-data.mjs) writes [data.json](data.json) (committed) from the app's own code, through the TypeScript loader in [ts-loader/](ts-loader): the six palettes, the strings of [../../../../src/i18n/he.json](../../../../src/i18n/he.json), the 28 capabilities of [../../../../src/data/capabilities.ts](../../../../src/data/capabilities.ts) with a fresh install's states (nusach Ashkenaz, the default-on mitzvot, every add-on missing, the battery exemption missing), the offers' words, today's More rows and a sample day's windows (Wednesday 8 Kislev 5787, 2026-11-18, Jerusalem, from `dayWindow()`), and the icon drawings of [../../../../src/components/MitzvahIcon.tsx](../../../../src/components/MitzvahIcon.tsx) and its drawn set. Run `TZ=Asia/Jerusalem node --import ./ts-loader/register.mjs gen-data.mjs`.
- [build.mjs](build.mjs) writes the page into the build output (`out/`, never committed) from [site-template.html](site-template.html) and [data.json](data.json).
- [site-template.html](site-template.html) holds every phone, the palette and tab-name switches and the presses (turn on, download, fold, jump to a goal, a toast naming what the app would open). The words the app does not have yet ("כדאי לנסות", "כל היכולות", the group labels, "להפעיל הכול") are proposed copy in its `WORDS`.

## Local Contracts

- Published as one private gallery Artifact, as the compass-button study was: https://claude.ai/artifact/2kobw5urktHPE9s8rjnvpJ. Republish to the same link after a change.
- The owner's picks: none yet. No code of phase 2 starts before them.

## Work Guidance

- The picks become C5 in [more.tsx](<../../../../src/app/(tabs)/more.tsx>), C4 as `src/app/capabilities.tsx` and B1 and B2 in [home.tsx](<../../../../src/app/(tabs)/home.tsx>), under the `src/` DOX chain; the home's hero in the boards is a placeholder, since the study does not change it.

## Verification

- `node build.mjs` in this folder, then open the page at 1240 and at 430 points: no horizontal scroll, no page error, every press shows its toast.

## Child DOX Index

No child AGENTS.md files.
