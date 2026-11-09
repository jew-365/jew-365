# AGENTS.md

## Purpose

- The home screen study of 2026-11-08, for the owner's request "לוח זמנים נוכחי מצומצם רלוונטי חכם פר תקופה למסך הבית": a current schedule on home that is condensed, relevant and smart about the period, read both as the part of the day and as the time of year. [BRIEF.md](BRIEF.md) holds the request and the shared rules.
- Round 2 (2026-11-08), after the owner said round 1's four schedule cards went too far: one small board in three layers, the owner's words "חלק של זמנים קבועים ... ועוד מרכיב של זמנים משתנים חכמים בהתאם לתקופה או לשעה ביום, ועוד מרכיב חכם שהוא מזהה מה רלוונטי עבור אותו למשתמש ספציפי שהוא יכול לבחור להוסיף ללוח":
  - fixed: four times always shown (הנץ, סוף ק״ש, שקיעה, צאה״כ), the next one marked;
  - now: up to two times the hour and the period add (from `schedPlan()`), or one period badge when no time does;
  - mine: the times the user pinned, from a sheet of suggestions read off the user's enabled mitzvot and marks ("מומלץ לך", each with its reason) and the other zmanim ("עוד זמנים").
- The same board in three placements, and today's home for comparison:
  - א `BoardCard`: a card under the hero, above open now.
  - ב `BoardStrip`: the hero's zmanim strip itself, fixed, smart and mine chips and a + chip.
  - ג `BoardTop`: a slim band pinned to the top of the screen.
  - ד `HomeNow`: the home screen as it is.
- Round 3 (2026-11-08), the owner: "תן לי דוגמאות נוספות יותר יצירתיות עם ניצול שטח מירבי תוך שמירה על חלוקה הקיימת ... מתרחב לבחירה או נגלל או יורד כוילון ... לפחות 10": twelve placements of the same three layers, each layer one colour everywhere (fixed the text colour, now the accent, mine the info blue), first in the gallery: 1 `R3Curtain` (a sticky line that drops a curtain), 2 `R3Island` (a floating pill that stretches), 3 `R3Stack` (one card, three tabs), 4 `R3Bento` (tiles, the next time large with a ring), 5 `R3Shul` (a synagogue board, two columns, all the day's times on a press), 6 `R3Collapse` (the full board that shrinks to one sticky line on scroll), 7 `R3Ticker` (one rotating line, a sheet on a press), 8 `R3Wallet` (stacked cards, one opens), 9 `R3Drawer` (a bottom drawer: peek, half, full), 10 `R3Snap` (a card per layer, swiped sideways), 11 `R3Ribbon` (the whole day on a horizontal axis), 12 `R3Flip` (a card whose back holds mine).
- Round 4 (2026-11-09): the owner picked the bento of round 3 ("אהבתי את הבנדטו") and asked to remove the hero's zmanim strip, keep only the relevant times in view with the rest a sideways scroll away, carry the hero's background down under the bento so it ends before the mitzvah cards, and make the bento and the arc scene smaller. `R4Bento` (`SCHED` `p`, first in the gallery): the bento sits inside the hero's `.block` on the land gradient in place of the strip (`heroCls` `hb` hides it), two rows of 46-point frosted tiles that scroll sideways, a large tile for the next time, then the now layer, the fixed times still ahead and mine, then the past and the other zmanim, then +; a period badge above it when one applies; the scene drawn at `K = 156 / 216` instead of 192 / 216.
- Round 1's four directions (`SchedNext`, `SchedRail`, `SchedDay`, `SchedChips`) were removed from both Artifacts; git history keeps them.

## Ownership

- [boards/HomeNow.html](boards/HomeNow.html) is a copy of the [2026-10-29-home-ellipse](../2026-10-29-home-ellipse/AGENTS.md) `HomeNow` board with `const SCHED` (`none`), the `/*SCHED*/`, `<!--SCHEDTOP-->` and `<!--SCHEDCARD-->` slots, the scroll div's `onScroll` and `uiCollapsed` (for `R3Collapse`), `openFirstCls` on the open-now heading and `schedVals()` spread into its values. [gen-boards.mjs](gen-boards.mjs) writes `BoardCard`, `BoardStrip`, `BoardTop` (`SCHED` `a` to `c`) and the twelve `R3*` boards (`d` to `o`) and `R4Bento` (`p`, with its own `K`) from it; never edit them by hand.
- [sched.js](sched.js) is the engine every board shares: `schedPlan()` (periods, anchors, scores, badges), `boardCatalog()` (the pinnable times and the reason each is suggested) and `schedVals()` (the three layers, the pin sheet, and `BoardStrip`'s chips). [sched.html](sched.html) is the card of א, [sched-top.html](sched-top.html) the band of ג, [sched-sheet.html](sched-sheet.html) the pin sheet, [sched.css](sched.css) their styles. Round 3's markup is [r3-top.html](r3-top.html) (the curtain bar, the island spacer, the collapsing board, the ticker), [r3-card.html](r3-card.html) (the boards under the hero), [r3-over.html](r3-over.html) (the curtain, the island, the ticker's sheet, the drawer) and [r3-layers.html](r3-layers.html), the three-layer list they share through `<!--LAYERS-->`; [r3.css](r3.css) styles them. Round 4's bento is [r4-hero.html](r4-hero.html), injected at the board's `<!--HEROBENTO-->` slot after the zmanim strip, and [r4.css](r4.css). `schedVals()` adds the next time, the layers, the day's full list, the ribbon's rows and each board's UI state (`ui`). [build.mjs](build.mjs) injects them and adds the `icA` and `icB` icon macros and the `date` prop.
- [gen-data.mjs](gen-data.mjs) writes [data.json](data.json) from the app's own code: `ZmanimService.getZmanim()` (the Ohr HaChaim rules), `dayWindow()` over `MITZVOT` for ten mitzvot (`win`), `HebcalService.holyBlockOn()` (the blocks, their lighting and exit) and @hebcal/core's events, for 75 days from 2026-10-25. [ts-loader/hooks.mjs](ts-loader/hooks.mjs) lets Node import the app's TypeScript at build time: `@/` to `src/`, types stripped by `typescript`'s `transpileModule`, and React Native, Expo, zustand and asset imports replaced by inert stubs. The app never imports any of it.
- [core.js](core.js) and [core.css](core.css) are the ellipse study's core, with misheyakir named "זמן תו״ט" as the app has named it since 2026-11-08. [assemble.mjs](assemble.mjs) writes the gallery and the canvas into the build output from [dirs.json](dirs.json); [site-template.html](site-template.html) adds a day picker (today, Rosh Chodesh, erev Shabbat, motzaei Shabbat, Kiddush Levana, Chanukah, erev Shabbat Chanukah, Asara BeTevet) beside the shared clock.

## Local Contracts

- Published as two private Artifacts; republish to the same links after a change:
  - gallery: https://claude.ai/artifact/RWquxzv3PmRkZhUHW5K54o (the build output's site folder as `root`, its index page as the file, its boards listed in `files`);
  - canvas (the Design type): https://claude.ai/artifact/BDc4e5AT1m23BrLSEHR7mT (the build output's canvas folder as `root`, its `canvas.json` as the file, each board and `support.js` in `files`).
- The owner's picks: the bento (round 3, 2026-11-09), refined in round 4's `R4Bento`.
- The demo marks are the core's seeds (tefillin, Shacharit and Mincha marked at fixed times), so the now layer changes with them: a marked Mincha drops the shkia. The pins live in the board's state only, starting with זמן תו״ט; the reason "סימנת מנחה אחרי פלג השבוע" is a demo of a suggestion read from marks, not computed from them.

## Work Guidance

- Differences from the app that stay on purpose: Kiddush Levana, the Chanukah candles and the fast come from the app's windows and calendar, but no board marks them; the open-now cards and My day still list only the six default mitzvot; the period names, the scores, the four fixed times and the suggestion reasons are this study's proposal, not app code.

## Verification

- In this folder: `TZ=Asia/Jerusalem node --import ./ts-loader/register.mjs gen-data.mjs` (only when the data changes), `node gen-boards.mjs`, `node build.mjs`, `node assemble.mjs`.
- Check each board at the dates of the day picker through the `date` and `startTime` hash keys (`#date=2026-11-13&startTime=15:54`), in `theme=night` too, and the gallery at 430 points wide for no sideways scroll.

## Child DOX Index

No child AGENTS.md files.
