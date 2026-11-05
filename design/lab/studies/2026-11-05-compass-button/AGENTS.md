# AGENTS.md

## Purpose

- The study of 2026-11-05 for the owner's word on the prayer compass button the siddur shows before every Amidah ("הכפתור של המצפן לא יצא יפה, תעשה לי דף במעבדה עם כמה אופציות"): seven designs on one gallery page, each in a slice of the reader at the end of Ashrei and the start of the Amidah of Mincha, nusach Ashkenaz.
- The options: א today's full-width row in the primary colour at 0.7; ב a hairline divider with an outlined pill; ג a row card with an icon tile, a title, a caption line and a chevron (the recommendation); ד a soft tinted banner on `goldLight` in `goldText`; ה a round button in the Amidah's title row; ו a row card whose tile is a small dial already pointing at the Kotel; ז a chip on the Amidah card's corner.

## Ownership

- [build.mjs](build.mjs) writes the page into the build output (`out/`, never committed) from [site-template.html](site-template.html), reading at build time the palettes of [../../../../src/theme/colors.ts](../../../../src/theme/colors.ts), the strings of [../../../../src/i18n/he.json](../../../../src/i18n/he.json), the text of [../../../../assets/siddur/ashkenaz/mincha.siddur](../../../../assets/siddur/ashkenaz/mincha.siddur) (the last plain paragraph of Ashrei and the first three segments with nikud of the Amidah, so its opening halachic note is left out), the `compass` icon of [../../../../src/components/MitzvahIcon.tsx](../../../../src/components/MitzvahIcon.tsx), and the bearing and distance from Tel Aviv ([../../../../src/data/cities.ts](../../../../src/data/cities.ts)) to `KOTEL` by the formulas of [../../../../src/utils/compass.ts](../../../../src/utils/compass.ts) (129°, 55 km), which option ו shows.
- [site-template.html](site-template.html) holds the seven options, the palette chips (the six palettes, remembered per viewer) and a toast that shows what a press opens.

## Local Contracts

- Published as one private Artifact: https://claude.ai/artifact/6eQvNboj9TgFJFFSe4PJgc, from the page the build writes. Republish to the same link after a change.
- The owner's pick, the same day: option ב, the divider with an outlined pill ("תממש את אופציה ב"). It ships in [../../../../src/app/siddur/[id].tsx](<../../../../src/app/siddur/[id].tsx>) with the page's line at 0.55 and the pill's 1.5-point border.

## Work Guidance

- The pick becomes a change to the compass button in [../../../../src/app/siddur/[id].tsx](<../../../../src/app/siddur/[id].tsx>) under [../../../../src/app/siddur/AGENTS.md](../../../../src/app/siddur/AGENTS.md); option ו needs a live heading in the reader, which only the compass screen subscribes to today.

## Verification

- `node build.mjs` in this folder, then open the page it writes at 1200 and at 430 points: no horizontal scroll, no page error, each press shows the toast.

## Child DOX Index

No child AGENTS.md files.
