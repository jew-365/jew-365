# AGENTS.md

## Purpose

- The design study of 2026-11-04 for two of the owner's requests of that day, before any production code:
  - a mitzvah reminder that says how long is left until its time ends, with a colour that shows how close the end is ("ספרות הזמן שנשאר יצבעו בצבע של ההתראה ירוק אדום וכתום", in a classic, clean direction);
  - a subtle mark on home, on or beside each mitzvah, of its nagging level.
- Two surfaces, each a pick of one direction, on real Jerusalem data of Wednesday 4 November 2026:
  - the notification (11 boards under [boards/notif/](boards/notif)): the day's reminders as they reach an Android shade or an iPhone lock screen, worded by each direction; ten need no build, and יא (`NotifLive`) is the idea for a later build;
  - home (8 boards under [boards/home/](boards/home)): the app's home with the level beside the mitzvah's name in the open card and in every My day look.
- The notification directions (א to יא): א the recommended combination (a coloured dot by the time, the end time that never goes stale, words instead of a number at red, the Android accent colour), ב a coloured dot, ג a coloured meter of five squares, ד a quiet meter (▰▱), ה words instead of colour, ו an hourglass, ז the Android accent colour alone, ח the time in the title, ט the end time only, י the share of the time left, יא live with a build (a running countdown in coloured digits, a progress bar, the iPhone's Live Activity and Dynamic Island).
- The home directions (א to ח): א a bell and a dot per repeat, ב a bell with sound waves, ג signal bars (always shown), ד a bell and ×n, ה a soft label "3 פעמים", ו dots alone, ז a small dial, ח only on a mitzvah whose own level differs from the app's.

## Ownership

- [gen-notif.mjs](gen-notif.mjs) writes [data/notif.json](data/notif.json) with the app's own code through [ts-hooks.mjs](ts-hooks.mjs) (copied from the [2026-11-01-nagging](../2026-11-01-nagging/AGENTS.md) study): the windows of the default daily set from the registry's `computeWindow()` on `ZmanimService` zmanim, each default reminder's trigger (a mirror of the planner's `buildTriggerTime()`), the repeats of levels 2 to 4 from `nagFor()` and `repeatOffsets()` of [../../../../src/utils/nagging.ts](../../../../src/utils/nagging.ts), every main and repeat kept only when the app's `reminderFires()` lets it out; the palettes of [../../../../src/theme/colors.ts](../../../../src/theme/colors.ts), the notification silhouette and the app icon of [../../../jew365-concepts/vector/](../../../jew365-concepts/vector), the notification colour of [../../../../app.json](../../../../app.json) and the copy of [../../../../src/i18n/he.json](../../../../src/i18n/he.json).
- [gen-home.mjs](gen-home.mjs) writes [data/home.json](data/home.json): the [2026-10-29-home-ellipse](../2026-10-29-home-ellipse/AGENTS.md) generator with its zmanim, candle lighting and exit taken from the app's `ZmanimService` (the Ohr HaChaim method of 2026-11-03) instead of its own kosher-zmanim calls, and the demo day 4 November 2026.
- [core/notif.js](core/notif.js) is the notification core, started from the nagging core and rewritten: the moment looked at, the platform and the level, the stage (`stageOf()`: red at 15 minutes or under 20% of the window, orange at an hour or half of it, green before; `before` ahead of the window), the time left as the app's `formatRemaining()` prints it, and every direction's wording in `dirText()`. [core/notif.css](core/notif.css) is the nagging core's CSS unchanged. [core/home.js](core/home.js) and [core/home.css](core/home.css) are the home-ellipse core, with `theme=dark` read as its night palette.
- [notif-base.html](notif-base.html) is the one source of the ten generated notification boards and [home-base.html](home-base.html) (the home-ellipse `HomeNow` board) of the eight home boards; [gen-notif-boards.mjs](gen-notif-boards.mjs) and [gen-home-boards.mjs](gen-home-boards.mjs) write them (the home generator adds the level slot after the name and `nagOf()`). [boards/notif/NotifLive.html](boards/notif/NotifLive.html) was started from [notif-base.html](notif-base.html) and is kept by hand. Never edit a generated board.
- [build.mjs](build.mjs) runs both generators and [build-notif.mjs](build-notif.mjs) (the nagging build) and [build-home.mjs](build-home.mjs) (the home-ellipse build) into the build output's `project` folder. [assemble.mjs](assemble.mjs) writes the gallery through [site-template.html](site-template.html) and the canvas from [dirs.json](dirs.json). [check.mjs](check.mjs) is the study's check. [BRIEF.md](BRIEF.md) is the contract for agents who change a board.

## Local Contracts

- Published to two private Artifacts; a next round republishes to the same links:
  - canvas: https://claude.ai/artifact/RqgAKD1iiJfQcPiGtS8yKT (the Design type: `root` the build output's canvas folder, `file_path` its `project/canvas.json`, each board beside it under `project/`);
  - gallery site: https://claude.ai/artifact/67xThcj5rmdEzt1beon62k (`root` the build output's site folder, `file_path` its `index.html`, the boards and `support.js` under `boards/`; `support.js` is [../../runtime/support.js](../../runtime/support.js), the Design type's own runtime byte for byte).
- The owner's picks: none yet.
- The day: Wednesday 4 November 2026 (כ״ד חשון תשפ״ז) in Jerusalem, nusach Sefard, the Shema by the GRA. Shacharit 05:58 to 09:32, the morning Shema 05:58 to 08:37, Mincha 11:53 to 16:52, Maariv and the bedtime Shema 17:05 to 04:47.
- The demo's own values, not the app's: the moments looked at (06:00 to 23:02), the home demo's own levels (the morning Shema 4, Shacharit 3, the bedtime Shema 2) and the stage thresholds, which are this study's proposal.
- Findings the boards show: a notification is worded when it arrives and never changes, so a "נשארו" number goes stale while it sits in the tray (at 08:50 the Shema reminder of 08:07 still reads "נשארו 30 דק'" after its time ended at 08:37); the end time ("עד 08:37") stays true, which is why most directions carry it. Several registry bodies already state the minutes left ("נותרו 30 דק' לק"ש", "נותרה שעה למנחה"); a direction that adds a time line makes those numbers redundant.
- What needs a build: colouring digits inside the text, a running countdown, a progress bar, removing a notification when its time ends, and the iPhone's Live Activity (יא). Everything else uses what the installed expo-notifications already sends (`subtitle`, Android's `subText` and the iPhone's subtitle, and Android's `color`), so it ships as an update.

## Work Guidance

- Emoji look different on every phone; the boards show the browser's.
- The home boards print five console errors before the runtime fills their SVG attributes, inherited from the home-ellipse board; they are not page errors.

## Verification

- In this folder: `node gen-notif.mjs` and `node gen-home.mjs` (only when the data changes), `node build.mjs`, `node assemble.mjs`, then `node check.mjs` with Playwright's Chromium (`NODE_PATH=$(npm root -g)` for a global install): every board in both palettes and every demo hash with no page error, notifications on both platforms at 08:10, a level shown on home at 07:42, and the gallery at 430 and 1100 points with no sideways scroll and all 19 phones.

## Child DOX Index

No child AGENTS.md files.
