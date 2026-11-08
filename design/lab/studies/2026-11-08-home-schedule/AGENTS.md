# AGENTS.md

## Purpose

- The home screen study of 2026-11-08, for the owner's request "לוח זמנים נוכחי מצומצם רלוונטי חכם פר תקופה למסך הבית": a current schedule on home that is condensed, relevant and smart about the period, read both as the part of the day and as the time of year. [BRIEF.md](BRIEF.md) holds the request and the shared rules.
- Four directions and today's home for comparison, on real Jerusalem data:
  - א `SchedNext`: a card under the hero with the period, its badges and the three times that matter most now, "כל זמני היום" opening the rest.
  - ב `SchedRail`: the current period as a short track with the now mark and its times, the next time large and the ones after it as chips.
  - ג `SchedDay`: five period rows, the current one open, past ones muted, future ones one line each; each opens on a press.
  - ד `SchedChips`: no new card; the hero's zmanim strip shows the four relevant times and the period badges, and "כל הזמנים" opens the full strip.
  - ה `HomeNow`: the home screen as it is, the base for comparison.

## Ownership

- [boards/HomeNow.html](boards/HomeNow.html) is a copy of the [2026-10-29-home-ellipse](../2026-10-29-home-ellipse/AGENTS.md) `HomeNow` board with `const SCHED` (`none`), the `/*SCHED*/` and `<!--SCHEDCARD-->` slots, `openFirstCls` on the open-now heading and `schedVals()` spread into its values. [gen-boards.mjs](gen-boards.mjs) writes `SchedNext`, `SchedRail`, `SchedDay` and `SchedChips` from it by `SCHED` (`a` to `d`); never edit those four by hand.
- [sched.js](sched.js) is the schedule engine every board shares (`schedPlan()`: periods, anchors, scores, badges; `schedVals()`: each direction's values, and `SchedChips`' strip). [sched.html](sched.html) is the card markup of א ב ג, [sched.css](sched.css) its styles. [build.mjs](build.mjs) injects all three and adds the `icA` and `icB` icon macros and the `date` prop.
- [gen-data.mjs](gen-data.mjs) writes [data.json](data.json) from the app's own code: `ZmanimService.getZmanim()` (the Ohr HaChaim rules), `dayWindow()` over `MITZVOT` for ten mitzvot (`win`), `HebcalService.holyBlockOn()` (the blocks, their lighting and exit) and @hebcal/core's events, for 75 days from 2026-10-25. [ts-loader/hooks.mjs](ts-loader/hooks.mjs) lets Node import the app's TypeScript at build time: `@/` to `src/`, types stripped by `typescript`'s `transpileModule`, and React Native, Expo, zustand and asset imports replaced by inert stubs. The app never imports any of it.
- [core.js](core.js) and [core.css](core.css) are the ellipse study's core, with misheyakir named "זמן תו״ט" as the app has named it since 2026-11-08. [assemble.mjs](assemble.mjs) writes the gallery and the canvas into the build output from [dirs.json](dirs.json); [site-template.html](site-template.html) adds a day picker (today, Rosh Chodesh, erev Shabbat, motzaei Shabbat, Kiddush Levana, Chanukah, erev Shabbat Chanukah, Asara BeTevet) beside the shared clock.

## Local Contracts

- Published as two private Artifacts; republish to the same links after a change:
  - gallery: https://claude.ai/artifact/RWquxzv3PmRkZhUHW5K54o (the build output's site folder as `root`, its index page as the file, its boards listed in `files`);
  - canvas (the Design type): https://claude.ai/artifact/BDc4e5AT1m23BrLSEHR7mT (the build output's canvas folder as `root`, its `canvas.json` as the file, each board and `support.js` in `files`).
- The owner's picks: none yet.
- The demo marks are the core's seeds (tefillin, Shacharit and Mincha marked at fixed times), so a scored list changes with them: a marked Mincha drops the shkia from the top three.

## Work Guidance

- Differences from the app that stay on purpose: Kiddush Levana, the Chanukah candles and the fast come from the app's windows and calendar, but no board marks them; the open-now cards and My day still list only the six default mitzvot; the period names and the scores are this study's proposal, not app code.

## Verification

- In this folder: `TZ=Asia/Jerusalem node --import ./ts-loader/register.mjs gen-data.mjs` (only when the data changes), `node gen-boards.mjs`, `node build.mjs`, `node assemble.mjs`.
- Check each board at the dates of the day picker through the `date` and `startTime` hash keys (`#date=2026-11-13&startTime=15:54`), in `theme=night` too, and the gallery at 430 points wide for no sideways scroll.

## Child DOX Index

No child AGENTS.md files.
