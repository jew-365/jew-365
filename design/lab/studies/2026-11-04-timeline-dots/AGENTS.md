# AGENTS.md

## Purpose

- The design study of 2026-11-04 for the owner's request that day: every notification of a mitzvah drawn on the axis of its time window, on the mitzvah screen's "חלון הזמן" card, "על ידי נקודות או אייקון מתאים ושניתן להזיז אותם על הציר כמו איקולייזר", each dot showing its kind and opening its values for editing on a tap. The owner took every recommendation of the brief: on every mitzvah's screen, a tap opens a small panel of the values with a way into the full editor. The one change was that the nags drag too, with "חזרה לנודניק החכם" beside them to restore the automatic smart nag ("גם הנודניקים יגררו ידנית, אבל יהיה ליד כפתור איפוס למצב חכם הדיפולטיבי").
- Three live boards (`Dots`, `Equalizer`, `Lanes`), each the mitzvah screen's header and window card on real Jerusalem data, with the same model:
  - every send of the window is a dot on the axis: a reminder, a nag of the critical zone or of the tail after it, a last-chance point;
  - a reminder drags along the axis and the smart nag follows it live;
  - a nag drags too, and the mitzvah's nags then stay where the user put them until "חזרה לנודניק החכם";
  - a tap on a dot opens its values below the axis: its kind, time, the notification as the phone shows it (the time-left line, title and body), -5 / +5 minutes, the full editor for a reminder, delete;
  - a tap on an empty stretch of the axis adds a reminder there;
  - "זום לזמן הקריטי" narrows the axis to the critical time, where the nags sit close;
  - the level in the card, and a list of every notification of the window in order under it, each row selecting its dot.
- The directions: א נקודות על הפס (the bar of today's card, a gold bell dot per reminder, an orange dot per nag, a red diamond per last-chance point; the recommendation), ב אקולייזר (a fader per notification standing on the bar, its height by kind, its knob in the stage colour), ג שני מסלולים (the user's reminders as pills above the bar, the smart nag's dots below it).

## Ownership

- [gen-data.mjs](gen-data.mjs) writes [data.json](data.json) with the app's own code through [ts-hooks.mjs](ts-hooks.mjs) (copied from the [2026-11-01-nagging](../2026-11-01-nagging/AGENTS.md) study). For each mitzvah it computes:
  - the window, from the registry's `computeWindow()` on `ZmanimService` zmanim, or the sample custom mitzvah's hours;
  - the default reminders' triggers, a mirror of the planner's `buildTriggerTime()` for the start, end and clock anchors;
  - the critical zone, the planner's zone rule for a registry kind, or the app's `customNagZone()`;
  - the last-chance points, from `performMinOf()`;
  - for levels 1 to 4, the nags of the app's own `smartNagTimes()` (`expect`).

  The palettes are `THEMES` of [../../../../src/theme/colors.ts](../../../../src/theme/colors.ts) and the copy is [../../../../src/i18n/he.json](../../../../src/i18n/he.json).
- [core.js](core.js) is the shared board logic:
  - a port of `smartNagTimes()` with no quiet hours and no holy block, held to `expect` by [check.mjs](check.mjs);
  - the window's sends with their stage (spec 2.5 of [../../../../.claude/specs/smart-nag.md](../../../../.claude/specs/smart-nag.md)) and wording;
  - the editing model: drag through pointer capture on each dot, the manual nags and the reset, the add on an empty stretch, the zoom, the values panel.

  [core.css](core.css) is the nagging study's CSS with this study's styles at its end, the stage colours of `TIME_STAGE_COLOR` among them.
- [build.mjs](build.mjs) wraps each board of [boards/](boards) with the core and the shared markup (`WINDOW_TOP`, `WINDOW_BOTTOM`, `TOAST`) into the build output's `project` folder.
- [assemble.mjs](assemble.mjs) writes the gallery through [site-template.html](site-template.html), and the canvas from [dirs.json](dirs.json).
- [check.mjs](check.mjs) is the study's check, and [BRIEF.md](BRIEF.md) is the contract for agents who change a board.

## Local Contracts

- Published to two private Artifacts; a next round republishes to the same links:
  - canvas: https://claude.ai/artifact/Mp67HPSdQDgucfb5Y7TZCP (the Design type: `root` the build output's canvas folder, `file_path` its `project/canvas.json`, each board beside it under `project/`);
  - gallery site: https://claude.ai/artifact/D2Zstpq5gmXECQuY4ix9ma (`root` the build output's site folder, `file_path` its `index.html`, the boards and `support.js` under `boards/`).
- The day: Wednesday 4 November 2026 (כ״ד חשון תשפ״ז) in Jerusalem, nusach Sefard, the Shema by the GRA. Five mitzvot: Shacharit 05:58 to 09:32, Mincha 11:53 to 16:52, Maariv and the bedtime Shema 17:05 to 04:47, and a sample custom mitzvah "לימוד יומי" 09:00 to 21:00, 20 minutes to perform, its reminders at the start and at 18:00. The custom mitzvah's hours and reminders are the user's input, not zmanim.
- The owner's pick (2026-11-05): א נקודות על הפס, the recommendation, with every recommendation of the brief and the dragged nags with their reset: "בציר ההתראות כבר בחרתי את ההמלצות שלך נקודות על הפס".
- What a pick needs in the app (a separate task under [../../../../src/AGENTS.md](../../../../src/AGENTS.md)):
  - a mitzvah's own nag times, persisted beside its reminders, which the planner sends instead of `smartNagTimes()`;
  - the reset that clears them;
  - the gesture on the window card (react-native-gesture-handler or the responder system).

## Work Guidance

- Dense nags overlap on a long window (ten minutes is about ten points on a twelve-hour axis): the zoom and the list under the card are the ways to reach each one, and a board must keep both.

## Verification

- In this folder:
  1. `node gen-data.mjs`, only when the data changes;
  2. `node build.mjs`;
  3. `node assemble.mjs`;
  4. `node check.mjs` with Playwright's Chromium (`NODE_PATH=$(npm root -g)` for a global install).
- The check covers:
  - every board, for every mitzvah and level, against the app's `smartNagTimes()`;
  - a dragged reminder that moves and takes the nags with it;
  - a dragged nag that offers the reset, and the reset;
  - a reminder added on an empty stretch, and the values panel;
  - the zoom in both palettes;
  - the gallery at 430 and 1100 points with no sideways scroll and every phone rendered.

## Child DOX Index

No child AGENTS.md files.
