# AGENTS.md

## Purpose

- The design study of 2026-11-01 for the nagging levels and reminder nags (the item "Design study: the nagging controls"
  in [../../../../not-close.md](../../../../not-close.md); spec [../../../../.claude/specs/nagging-levels.md](../../../../.claude/specs/nagging-levels.md),
  section 4): the surfaces the owner picks. The app's screens were built the same night on the baseline, direction א
  with boards ד to ו, before the pick (the owner's word: carry out every task that needs no decision of theirs); a different
  pick changes them. The app differs from the boards in two places, each cheap to change: the count is a row of chips 1 to
  5, not a stepper, and the mitzvah screen's level row is its own card right above the reminders card.
- Seven live boards on real Jerusalem data:
  - Settings, Device and notifications (spec 4.1), three directions for the level control, the owner picks one:
    - א שורת ארבע מדרגות ([boards/LevelSegmented.html](boards/LevelSegmented.html)): spec 4.1 exactly, the baseline the app is built on: the field label, a SegmentedControl of the four levels named by their names, the chosen level's name and description, the per-day estimate and the hint;
    - ב מד ארבע נקודות ([boards/LevelDots.html](boards/LevelDots.html)): four dots that fill up to the level like a signal meter, the level's name beside the label, the two ends of the scale under the first and last dot;
    - ג דוגמה חיה ([boards/LevelExample.html](boards/LevelExample.html)): a four-stop slider with the names as buttons under it, and the day's real Shacharit and bedtime Shema reminders at the chosen level as the clock times they go out (the main filled, each repeat outlined).
  - ד the mitzvah screen (4.2, [boards/MitzvahLevel.html](boards/MitzvahLevel.html)): the level ListRow (bell, chevron) under the reminders card's title, its BottomSheet of "like the app" and the four levels (each captioned by its description and the per-day estimate for this mitzvah), and a nag line on each reminder row (from the level, custom, or "בלי נודניק"); a row opens the editor.
  - ה the reminder editor (4.3, [boards/ReminderNag.html](boards/ReminderNag.html)): the nag block between the send-time line and the label: לפי הרמה / בלי / מותאם, the count stepper (1 to 5), the interval chips (3, 5, 10, 15), the placement control or the before-only line, and the live preview of the repeat times with a dropped one in the urgent colour.
  - ו the custom mitzvah form (4.4, [boards/CustomForm.html](boards/CustomForm.html)): the "רמת נודניקיות למצווה" OptionSelect and the same nag block in each reminder card, with the preview printed as clocks of the mitzvah's own hours.
  - ז the notification tray (4.5 and 3.6, [boards/TrayChain.html](boards/TrayChain.html)): an Android shade with one reminder's chain, each repeat's body ending in "· תזכורת k מתוך n", cleared by one "עשיתי"; a demo bar advances the clock and picks the chain and level.

## Ownership

- [gen-data.mjs](gen-data.mjs) writes [data.json](data.json) with the app's own code, loaded through [ts-hooks.mjs](ts-hooks.mjs) (Node module hooks: the `@/` alias, TypeScript transpiled by the repository's `typescript`, and inert stubs for the modules that would pull in the stores or the siddur assets):
  - the windows of Shacharit, Maariv and the bedtime Shema on the day and the next, from the registry's `computeWindow()` on `ZmanimService` zmanim, and their default reminders ([../../../../src/data/mitzvot.ts](../../../../src/data/mitzvot.ts));
  - the default daily set (tefillin, the Shema, Shacharit, Mincha, Maariv, the bedtime Shema: 12 reminders a day) for the per-day estimate;
  - the palettes of [../../../../src/theme/colors.ts](../../../../src/theme/colors.ts) (gold and dark), the mitzvah icons of [../../../../src/components/jewishIcons.generated.ts](../../../../src/components/jewishIcons.generated.ts) painted by `MitzvahIcon`'s `toneOf()`, the notification silhouette of [../../../jew365-concepts/vector/mark-o-notif.svg](../../../jew365-concepts/vector/mark-o-notif.svg) in the notification colour of [../../../../app.json](../../../../app.json);
  - the copy (see Local Contracts).
  - It checks the four rules the boards port to plain JS against the app over every combination the boards offer (610,781 cases) and throws on the first disagreement: whether a trigger goes out (`reminderFires()` of [../../../../src/utils/skipRules.ts](../../../../src/utils/skipRules.ts)), the timing line (`timingSummary()` of [../../../../src/utils/reminderTiming.ts](../../../../src/utils/reminderTiming.ts)), the custom clock (`reminderClock()` of [../../../../src/utils/customMitzvah.ts](../../../../src/utils/customMitzvah.ts)) and the main trigger (a mirror of the planner's `buildTriggerTime()`, which imports the stores); and the level table, the placements and the offsets against [../../../../src/utils/nagging.ts](../../../../src/utils/nagging.ts) when the app has it.
- [core.js](core.js) and [core.css](core.css) are this study's core, started from a copy of the [2026-10-28-home-mix](../2026-10-28-home-mix/AGENTS.md) core and rewritten for it: the level table, the placement rule, `nagFor()`, the offsets, the trigger and drop rules, the mitzvah screen's state, the level sheet, the reminder editor with the nag block, the Settings values and the toast; the app's tokens, type scale and shared components in CSS.
- [build.mjs](build.mjs) (copied from the home-mix build) turns each board into `<Name>.dc.html` in the build output: the palettes and Rubik, the shared markup macros (the Settings section, the mitzvah screen, the level sheet, the editor, the nag block, the tab bar, the toast) and the canvas tweaks (theme, the app's level, the mitzvah). [assemble.mjs](assemble.mjs) writes the gallery and the canvas into the build output (never committed) from [dirs.json](dirs.json), each board's gallery text and demo links, through [site-template.html](site-template.html), the gallery page.
- [check.mjs](check.mjs) is the study's check (Verification). [BRIEF.md](BRIEF.md) is the contract for agents who build boards here.

## Local Contracts

- Published to two private Artifacts; a next round of this study republishes to the same links:
  - canvas: https://claude.ai/artifact/Mz4HEjiCxcUXd3AeLqB2Ct (the Design type: `root` the build output's canvas folder, `file_path` its `project/canvas.json`, each board beside it under `project/`);
  - gallery site: https://claude.ai/artifact/C6sFq2YZkkj4Lj2YVCaoXK (`root` the build output's site folder, `file_path` its `index.html`, the boards and `support.js` under `boards/`).
- The owner's pick, per surface (the gallery's "הבחירה שלך" copies it as text):
  - Settings level control (א, ב or ג): not yet.
  - The mitzvah screen (ד): not yet.
  - The reminder editor (ה): not yet.
  - The custom mitzvah form (ו): not yet.
  - The notification tray (ז): not yet.
- The data: Monday 2 November 2026 (כ״ב חשון תשפ״ז) in Jerusalem, seen at 05:30, nusach Sefard, the Shema by the GRA. Shacharit 05:56 to 09:33, Maariv and the bedtime Shema from 17:19 to 04:43 the next morning. The custom form's sample (לימוד יומי, 21:00 to 22:00, a reminder at the start by the level and a follow-up 30 minutes after the end with its own nag of 2 every 15 minutes before) is the user's input, not a zman.
- Copy: the table of spec section 7 for every key it lists, the app's [../../../../src/i18n/he.json](../../../../src/i18n/he.json) for every other key. While the study was built, the app's he.json gained its own wording of seven of those keys (`copyDiffs` in [data.json](data.json)), which the study does not show: `nag.level.2.desc` to `nag.level.4.desc` (one line per level; level 2 reads "עוד התראה אחת, במרחק 10 דקות" where the spec's shared line prints "עוד 1 התראות, כל 10 דקות"), `nag.effect` (a comma before the placement), `nag.previewAllDropped`, and `nag.row.fromLevel` / `nag.row.custom` (one `%{effect}`). The owner's pick decides which wording ships.
- Copy the study proposes, with no key in the spec: a repeat that does not go out for a reason other than "after the end" reads "%{time} מוקדם ביותר משלוש שעות לפני תחילת הזמן, לא תישלח" (before the heads-up limit), "%{time} כבר עבר, לא תישלח" (already past), "%{time} עוד לפני סוף הזמן, לא תישלח" (a follow-up's repeat at or before the end) and "%{time} יותר מ-12 שעות אחרי הסוף, לא תישלח" (a follow-up's repeat past its 720 minutes); the app's he.json now has `nag.previewSkipped` ("%{time} לא תישלח") for these.
- Two notes for the spec: `custom.hint.reminders` ("כל התראה היא הודעה אחת ביום…", shown on the form) contradicts the nag and needs new wording; and a repeat is numbered in time order, so a before chain reads "תזכורת 1 מתוך 2", "תזכורת 2 מתוך 2" and then the main with no suffix.
- The per-day estimate is `Σ (1 + count)` (spec `remindersPerDay()`): in Settings over the default daily set at the app's level (12, 24, 36, 48), on the mitzvah screen and in the form over that mitzvah's reminders at its level.
- What the boards leave out on purpose: on the mitzvah screen, the cards between the active card and the reminders card (today's window, content, settings); on the form, the fields between the hours and the reminders (category, schedule, skip switches); in Settings, the location block beyond the city name and everything after the quiet hours. The tray is Android's shade; the demo bar under it is the study's, not the app's.

## Work Guidance

- The DC rules learned here are in [BRIEF.md](BRIEF.md): a boolean hole in `disabled`, a raw `<img src="{{...}}">`, the range input under test, and the 24-hour text field in place of the browser's time input.
- The Design type serves `support.js` itself: the canvas sends only `project/canvas.json` and the boards; the gallery sends `boards/support.js` beside its boards.
- Locally the gallery needs a server that sends UTF-8: Python's `http.server` sends no charset and the page reads garbled; [check.mjs](check.mjs) runs its own server.

## Verification

- In this folder: `node gen-data.mjs` (it fails on any disagreement with the app), `node build.mjs`, `node assemble.mjs`, then `node check.mjs` with Playwright's Chromium (`NODE_PATH=$(npm root -g)` for a global install). It drives every board (the levels, the sheet and its override, the custom and exempt lines, the dropped repeats, the count's cap of 5, the before-only line, the form's level and clocks, the tray's chain and one "עשיתי") and opens the gallery at 430 and 1100 points (no sideways scroll, the bar sticky only at 1100, each control row one line, every phone rendered), and fails on a console error. Checked so on 2026-11-01, with screenshots at 390, 430 and 1100 points in the gold and dark palettes.

## Child DOX Index

No child AGENTS.md files.
