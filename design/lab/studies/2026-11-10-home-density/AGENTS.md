# AGENTS.md

## Purpose

- The home screen study of 2026-11-10, after the owner checked preview `1.0.21-70` ("בדקתי בטלפון, עובד") and asked for the new sizes: lower and narrower the carousel and the greeting with the date; a wider and slightly taller circle that is easier to reach; no background behind the clock inside the circle, its content fitted to the circle's size so nothing sits on anything else; less space between the elements (circle, carousel, greeting, board); a slimmer bottom tab bar; all for more room for the open mitzvot. "תמצא איזון, תן לי דוגמאות של הסדר הגדלים החדשים".
- Four size arrangements beside today's home (`now`), each a set of numbers in [variants.mjs](variants.mjs): א `balanced`, ב `bigArc` (most of the room to the circle), ג `openSky` (the greeting on the sky, no glass), ד `maxCards` (the carousel on one line, most of the room to the cards). Every proposal puts the clock on the sky inside the circle at a share of its radius, its caption as wide as the circle, the drag hint in the circle's lower half, the period card in two rows with its tabs on the title row, chips of 44 points, and the bar's pill at 44 by 28 without its underline; all but `now` move "חזרה לעכשיו" into the circle under the clock, which lets the empty sky above the circle be cut (`crop`).

## Ownership

- This study shows the real app, not a template: a size is the question, and the app's own layout answers it best. [build.mjs](build.mjs) copies the repository to `jew-365-density-app` beside it, outside the repository so Jest, Metro and the DOX check never see the copy (its `node_modules` hard-linked, `src` a real copy, the web exports in its `dist-density`), applies a variant's edits to that copy (each names the exact text it replaces and fails when the app moved it), exports the web build and captures home through [../../../../scripts/store/screenshots.mjs](../../../../scripts/store/screenshots.mjs) (its seeded install and its clock, Wednesday 2026-11-04 15:40 in Jerusalem) at 400 by 800 and 402 by 874. The repository's `src` is never written.
- [build.mjs](build.mjs) `--at HH:MM` captures the same day at another hour through a copy of the screenshot script in the app copy, with only its `NOW` time changed, into `shots/<id>@HHMM`.
- [assemble.mjs](assemble.mjs) writes the gallery into the build output's `site` folder: each capture as a JPEG, the height of each hero measured off its capture (the first row of the page colour under the land, in points), the radius from the variant's scene rule, and the size table, then a section of the other hours' captures in pairs when there are any. It needs python3 with Pillow.
- There is no canvas: the boards of earlier studies draw a copy of home, and this question needs the app itself.

## Local Contracts

- Published as one private Artifact; republish to the same link after a change: https://claude.ai/artifact/GyqeKYGChr3rYCwAGXr2An (the build output's `site` folder as `root`, its `index.html` as the file, the ten JPEGs under `shots/` in `files`).
- The owner's pick: none yet; on 2026-11-10 the owner was choosing between א and ג ("מתלבט בין א לג"), so both were also captured at 06:10, 17:00 and 20:30 (`node build.mjs --only balanced,openSky --at HH:MM`), shown in pairs on the gallery.

## Work Guidance

- A variant is numbers, not code: add a parameter to `NOW` with today's value and a case in `editsFor()`, so `now` stays the app as it is.

## Verification

- In this folder: `CHROME_PATH=<chromium> node build.mjs` (all variants, about 30 seconds each; `--only id,id` for some), then `node assemble.mjs`, which prints each hero's height.
- Look at every capture: nothing in the circle overlaps the arc, the sun or another line, and the period card's title is not cut.

## Child DOX Index

No child AGENTS.md files.
