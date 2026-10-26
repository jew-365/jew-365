# Action Log

Every task, bug fix and code action of the project that was done and verified, newest first. It continues [not-close.md](not-close.md): an item that closes there moves here in the change that closes it. Where the project stands today is [state.md](state.md); every store step in detail is [release/RELEASE_LOG.md](release/RELEASE_LOG.md). The rules that keep this file current are in the root [AGENTS.md](AGENTS.md), Project records.

## Entry format

```
- **<Title>** — what it is, in one line, linking the code or doc it touched.
  - Requested: who asked, when, where (a task) | Found: where and when (a bug). Verified: how.
  - Version: … · Committed: … · Pushed: … · Live: … · Channel: …
```

- **Version:** `OTA <version>-<n>` for work Metro bundles (write `expected` until it is published), `Build <version>` with the versionCode or buildNumber for native work, `Pages` for [docs/](docs) content that a push to `main` publishes.
- **Committed:** `yes` with the commit hashes, or `no`. A group lists each commit's subject once at its head; an entry outside a group writes the subject inline.
- **Pushed:** `yes` or `no`.
- **Live:** `no`, or where: the OTA label with its update group id, the build id with its version and versionCode / buildNumber and where it is installed from (Play track, TestFlight, App Store, direct APK), or the Pages URL.
- **Channel:** `production` or `preview` once live; `—` while not live and for Pages, which has none.
- `unknown` marks a value no record proves. Never guess one.

## 2026-10-26 — store status, China mainland out of the App Store

- **Store status of 2026-10-26** recorded in [release/RELEASE_LOG.md](release/RELEASE_LOG.md) and [state.md](state.md).
  - Requested: the owner, 2026-10-26. Verified: read from both consoles.
  - Version: none (docs) · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: n/a · Channel: —
- **China mainland removed from the App Store availability** — 174 countries or regions, every storefront but China mainland, whose law requires a permit for apps with religious content ([release/APP_STORE_METADATA_EN.md](release/APP_STORE_METADATA_EN.md)).
  - Requested: the owner, 2026-10-26, in a Claude Code session. Verified: App Store Connect after a reload: Availability (174 Countries or Regions), China mainland Not Available, Hong Kong, Macau and Taiwan Available on App Release.
  - Version: none (a console setting, no build) · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: saved in App Store Connect on 2026-10-26; the store applies it within 24 hours, and the app is not released yet · Channel: —

## 2026-10-26 — the owner's phone check of the preview app

- **Requested:** the user, 2026-10-26, in a Claude Code session, after testing preview build `c625eaa5` on a phone: eight changes with screenshots. The user also decided six design questions the same day (the schedule select, the reminder timing editor in both editors, another parasha read only with resume and bookmarks reaching it, a settings button in every mitzvah text, an out-of-season text opening the next day it is said, a fixed mitzvot group in the siddur tab).
- **Commits:** `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` on top of `aba8897`, pushed to `main` on 2026-10-26 with the preview variant of 2026-10-25; CI run `40305759310` green.
- **Version:** all JS, live in production update `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26, from `c1989c4`; its `WHATS_NEW` entry in [src/data/guide.ts](src/data/guide.ts) now names these changes too). Live on the `preview` channel since 2026-10-26 as `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`), published from the uncommitted working tree on top of `aba8897` with the preview identity (manifest name "Jew 365 P", scheme `jew365preview`).
- **Verification:** closed specs run by executors, an adversarial review Workflow (four area reviewers and four refuters; 10 findings confirmed and fixed), web checks at 360 dp in the expo-web preview, Android emulator checks of the Chok LeYisrael reader (the settings pill, the parasha sheet, another parasha, the commentary row) and of the custom reminder card (the labels, ‎−5 / ‎+5 in RTL, the number pad), and the gate on 2026-10-26: `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` (4722 tests in each of the four zones, the last run after the tzaddik content, with the one smoke case it caught fixed and rerun in the four zones).

- **Chok LeYisrael: no subtitle under the title** — the header drops "פרשת … · יום …", which the parasha row and the day row under it already show ([src/app/siddur/[id].tsx](src/app/siddur/[id].tsx)).
  - Requested: the user, 2026-10-26, with a screenshot of the reader's header. Verified: `chokReader.render.test.tsx` (66 tests), now reading the shown portion from the parasha row and the selected day; not seen on a device.
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-2` (group `ad014542-2e86-46c1-aaa7-db5a73049b57`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Chok LeYisrael: the section picker names the kind, beside the commentary control** — the picker and its sheet show only the section's kind (תורה, נביאים, כתובים, משנה…, `chok.kind.*`), and "עם פירושים" / "בלי פירושים" shares its row ([src/app/siddur/[id].tsx](src/app/siddur/[id].tsx)).
  - Requested: the user, 2026-10-26, after preview `1.0.21-1`, with a screenshot of the picker sheet. Verified: `chokReader.render.test.tsx` (66 tests); not seen on a device.
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-2` (group `ad014542-2e86-46c1-aaa7-db5a73049b57`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Mitzvah screen: the active row first** — a first card with the mitzvah's icon, "המצווה פעילה", an on / off caption and the switch, so a mitzvah is switched on or off from its own screen ([src/app/mitzvah/[id].tsx](src/app/mitzvah/[id].tsx)).
  - Requested: the user, 2026-10-26, after preview `1.0.21-1`. Verified: the mitzvah, smoke, design-system and i18n suites (277 tests); not seen on a device.
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-2` (group `ad014542-2e86-46c1-aaa7-db5a73049b57`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Sheets: the selected row has rounded corners and padding** — every `SheetAction` draws its text on an inner view padded `spacing.md` with `radius.lg` corners, and `selected` fills that view with `goldLight`; the bordered row around it carries no fill, so Android keeps the corners ([src/components/BottomSheet.tsx](src/components/BottomSheet.tsx)).
  - Found: the user, 2026-10-26, with screenshots of the schedule select and the reminder timing sheets: square corners and text against the fill's edge; a first fix in preview `1.0.21-2` (`ad014542-2e86-46c1-aaa7-db5a73049b57`) still put the fill on the bordered row. Verified: `BottomSheet.render.test.tsx` (32 tests, the fill's radius and padding per palette), the web preview at 375 dp; not seen on a device.
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-3` (group `659d3a2a-0e8c-4cad-bab6-ccd685b17485`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Chok LeYisrael: the parasha sheet follows the double-week choice, and the way back lands on today** — in a double week, the sheet marks only the parasha the choice shows and a tap on the other one opens it read only, as a bookmark into it already did ([src/components/ChokWeekControls.tsx](src/components/ChokWeekControls.tsx)); leaving a browsed parasha for this week clears the day picked while browsing, so the week opens on today's day with its "סיימתי" and make-ups ([src/app/siddur/[id].tsx](src/app/siddur/[id].tsx)).
  - Found: a review round of the uncommitted tree, 2026-10-26, asked by the user (five area reviewers; the other four areas had no findings), confirmed by tracing the code; the user asked to fix both. Verified: `chokReader.render.test.tsx` and `ChokWeekControls.render.test.tsx` (87 tests, two new reader cases and one new component case, three cases updated to the choice-aware marking), the gate below; not seen on a device.
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-6` (group `cbfb5ef7-6cc7-4ed9-a4c7-f908bd65a280`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Siddur reader: a prayer whose time has passed today opens today's text** — a mitzvah text whose window on the location's calendar date has already ended opens for that date under `siddur.timePassed` ("הזמן של היום עבר. מוצג הנוסח של היום"), with its "סיימתי", instead of jumping to the next day's text; the night before alot still opens the coming morning, and a text not said today still opens the next day it is said ([src/app/siddur/[id].tsx](src/app/siddur/[id].tsx)).
  - Found: the user, 2026-10-26, with a screenshot of Shacharit at 09:55 on a Monday showing Tuesday's Shir shel Yom (the Jerusalem window ended at 09:31, sof zman tefila); the user chose today's text with a notice. Verified: `siddurLinkedText.render.test.tsx` (45 tests: Shacharit at 09:55 and 09:00, Mincha at 21:00, Shacharit at 01:00 still the coming morning), the gate below, the web preview; not seen on a device.
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-5` (group `ee1f67ce-2bf7-49a8-8e9c-e0d4477b1465`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Siddur reader: the section picker fills its row again** — the picker always takes the row's free width (`pickerBeside`), so its title shows beside the chevron in every text, not only in Chok LeYisrael, where the commentary control shares the row ([src/app/siddur/[id].tsx](src/app/siddur/[id].tsx)).
  - Found: the user, 2026-10-26, with screenshots of Birchot HaShachar and Shacharit in preview `1.0.21-3`: a small box with a chevron and no text. The row added for the commentary control gave the picker its grow style only beside that control. Verified: `siddurReader.render.test.tsx` (the picker's `flexGrow`), the app and components suites (1857), typecheck, lint, the web preview at 375 dp; not seen on a device.
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-4` (group `d0ab0eb3-0e29-42db-87ff-1dfc27f00891`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Onboarding: space between the mitzvot list and the step dots** — the dots get `marginTop: spacing.lg` and the list `paddingBottom: spacing.lg` on every step with a list above them ([src/app/onboarding/](src/app/onboarding)).
  - Requested: the user, 2026-10-26 (item 1). Verified: the onboarding render suites; not seen on screen (the web preview is onboarded and redirects).
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Custom mitzvah: the schedule is a select field** — `OptionSelect` ([src/components/OptionSelect.tsx](src/components/OptionSelect.tsx)), drawn like the time field, opens a sheet of the three modes, each with a caption ("ימים קבועים בשבוע", "מתאריך עד תאריך", "מספר ימים ברצף") in [src/app/custom-mitzvah.tsx](src/app/custom-mitzvah.tsx).
  - Requested: the user, 2026-10-26 (item 2, decision 1). Verified: `OptionSelect.render.test.tsx`, `customMitzvah.render.test.tsx`, the web preview at 360 dp.
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Reminders: "מתי לשלוח" with explained options, in both editors** — `ReminderTimingFields` ([src/components/ReminderTimingFields.tsx](src/components/ReminderTimingFields.tsx)) over [src/utils/reminderTiming.ts](src/utils/reminderTiming.ts): before the start (up to 180 minutes, which the custom form could not set before), at the start or after it, before the end, at a set time, after the end if not marked (custom), after a Shabbat or Yom Tov exit (multi-day); then a minutes field named by what it counts with ‎−5 / ‎+5, and the send time. The custom form shows it as a select per reminder card ("התראה 1"), the mitzvah screen's `ReminderEditor` sheet as a radio list, and the mitzvah screen's reminder rows read the same words (`timingSummary()`).
  - Requested: the user, 2026-10-26 (item 3, decision 2). Verified: `reminderTiming.test.ts`, `ReminderEditor.render.test.tsx`, `customMitzvah.render.test.tsx`, `mitzvah.render.test.tsx`, the web preview (10 minutes before 08:00 reads "תישלח בשעה 07:50").
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Chok LeYisrael: "עם פירושים" / "בלי פירושים"** — the commentary control's labels, "עם פירושים" first, on a full-width row of its own above the section picker, because the new labels did not fit the toolbar at 360 dp ([src/app/siddur/[id].tsx](<src/app/siddur/[id].tsx>)).
  - Requested: the user, 2026-10-26 (item 4). Verified: `chokReader.render.test.tsx` (order and the row).
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Chok LeYisrael: any parasha** — a parasha row (`PickerCard`, a sheet of the 54 parashiyot by book) in [src/components/ChokWeekControls.tsx](src/components/ChokWeekControls.tsx). Another parasha is read only (no "סיימתי", no make-up folds, a "חזרה לפרשת השבוע" button); every open starts on this week's parasha, while the resume offer and a bookmark in another parasha take the reader there (`chokPlaceOf()`, `chokBrowsePortion()` in [src/utils/chok.ts](src/utils/chok.ts)).
  - Requested: the user, 2026-10-26 (item 5, decision 3 with the user's note on resume and bookmarks). Verified: `chokReader.render.test.tsx`, `ChokWeekControls.render.test.tsx`, `chok.test.ts`.
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **A settings button in every mitzvah text** — a `sliders` header pill to the text's mitzvah screen (Chok LeYisrael, mitzvah texts, standalone texts linked to a mitzvah, custom texts); `from` sends it back when the reader came from that screen.
  - Requested: the user, 2026-10-26 (item 6, decision 4: every mitzvah with a text). Verified: the reader suites; the web preview (the Omer text's pill returns to its mitzvah screen).
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Every siddur text opens at any time** — a text not said now opens resolved for the next time it is said (`standaloneReadingDay()`, `nextMitzvahTextWindow()` in [src/data/siddur.ts](src/data/siddur.ts), `windowDueToday()` in [src/utils/buildDayTimeline.ts](src/utils/buildDayTimeline.ts)) under a `siddur.offSeason` notice, without "סיימתי"; the siddur tab never disables a row and gets a fixed "מצוות" group; the settings search opens such texts; the mitzvah screen always offers "פתח נוסח" when the mitzvah has a text.
  - Requested: the user, 2026-10-26 (item 7, decisions 5 and 6). Verified: `siddurReadingDay.test.ts` (brute-force agreement over two Hebrew years, four zones), the catalog, search, reader and mitzvah screen suites, the web preview (Chanukah opens on כ״ה כסלו תשפ״ז, the Omer on ט״ז ניסן תשפ״ז, both with the notice).
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Review fixes of the batch** — the adversarial review Workflow confirmed 10 of 15 findings, all fixed:
  - the reminder editor sheet now shows the send time ("ההתראה הבאה תישלח ב…");
  - a parasha switch resets the reader's scroll state, so auto-scroll, the star and the last place start from the new text's top;
  - a text whose window opens after the current app day opens off season, without "סיימתי", from the siddur tab and the mitzvah screen (`windowDueToday()`), so a later Shabbat or Friday is never marked ahead. Shacharit opened at night therefore shows the morning's text off season;
  - the siddur tab's "מ-HH:MM" captions read the location's clock in every device zone;
  - stale doc sentences.
  - Found: the review Workflow, 2026-10-26. Verified: the reader, catalog, editor and mitzvah screen suites under `test:tz`, each fix with a test that fails without it.
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **The Chok LeYisrael credit from Settings opens the credit sheet** — `ChokCreditSheet` in [src/components/ChokLicenseNotice.tsx](src/components/ChokLicenseNotice.tsx), the sheet of the reader's credit line, instead of the raw `LICENSE.txt`; `PRODUCT_LINKS.chokLicense` is gone.
  - Requested: the user, 2026-10-26 (item 8). Verified: `settings.contact.render.test.tsx`, `ContactService.test.ts`.
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview

- **A page for every tzaddik of the hilulot list** — `/hilula/[id]` ([src/app/hilula/[id].tsx](<src/app/hilula/[id].tsx>)) for the 57 tzaddikim of `HILULOT`, opened from the hilulot list and from the hilula notice (`data.hilula.ids`; a notice that names two shows a switch between them). The page shows a biography (at most 80 words), two lessons, books and works (none for a biblical figure), one or two stories (at most 80 words), and the burial place with a Waze link where the grave is known and reachable. The content in [src/data/hilulaPages.ts](src/data/hilulaPages.ts) is in Hebrew and English, researched by five agents and fact-checked by five more: 124 corrections, 45 doubts. 48 graves link to Waze (9 of them through a search for the cemetery), and 9 explain why they do not.
  - Requested: the user, 2026-10-26, after the phone-check batch; the planner's choices D1 to D4 in [not-close.md](not-close.md) await the owner's approval, and the content awaits review there.
  - Verified: [src/app/__tests__/hilula.render.test.tsx](src/app/__tests__/hilula.render.test.tsx), [src/data/__tests__/hilulaPages.test.ts](src/data/__tests__/hilulaPages.test.ts) (every entry: word limits, no nikud, two sources, coordinates or a search), the tap-routing and planner suites, and the Android emulator (the Rambam page, its stories and its Waze button).
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **A display size for the whole app** — Settings → Device and notifications → Display: seven steps from 80% to 120%, with a sample of the pending size. Applying a step reloads the app, because the theme reads the factor once at launch ([src/theme/scale.ts](src/theme/scale.ts)). Tokens, fixed sizes, icons and the reader's text all scale; the reader's A+ / A− stays relative to it. A restore or reset that changes the size reloads too, and the onboarding restore does so only after its permission step.
  - Requested: the user, 2026-10-26 ("כרגע זה מוגדל יחסית"); the planner's choices D5 to D8 await the owner's approval.
  - Verified:
    - the scale, store, Settings and sweep suites, with tests at 0.8 and 1.2;
    - the web preview at 120% on 360 dp: no content wider than the screen on settings, home, the siddur tab, a mitzvah screen, the custom form or the reader;
    - the Android emulator: the stepper, the apply dialog and the reload, home at 80% and at 120%, and the Chok LeYisrael reader at 120%.
  - Version: OTA `1.0.21-2` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview

## 2026-10-25 — the preview app variant and its first build

- **Requested:** the user, 2026-10-25, in a Claude Code session: a second app that installs beside production for trying updates on the `preview` channel, named "יהודי 365 P", with today's icon in red shades instead of blue; Android now, iOS prepared.
- **Commits:** `bf8e8f4` (with the app work of 2026-10-26 in `9edff4b` `cdde147` `d2c206e` `c1989c4`), pushed to `main` on 2026-10-26.
- **The build:** EAS build `c625eaa5-34f5-4be4-b9b7-08e6d846dfb8` from that working tree, profile `preview`, finished 2026-10-25: `com.jew365.app.preview`, 1.0.21, versionCode 1 (the new id's own count), channel `preview`, signed with a keystore EAS generated for the new id (certificate SHA-256 `0ead621a…f462a622`), 118.6 MB, universal. The same run created the `preview` channel and branch on EAS. Installed on the Android emulator beside production; not yet on a phone.

- **A preview app variant beside production** — [app.config.js](app.config.js) turns the [app.json](app.json) config into "Jew 365 P" / "יהודי 365 P" with `com.jew365.app.preview`, scheme `jew365preview`, the red icon and splash ([assets/preview/](assets/preview), [locales/preview/](locales/preview)) when `APP_VARIANT=preview`, which the `preview`, `preview-device` and `preview-ios` profiles of [eas.json](eas.json) set; production's config is unchanged.
  - Requested: the user, 2026-10-25. Verified: an executor and two adversarial verifier rounds, `npx expo config` with and without the variable, the full gate (4254 tests in four zones), a local release build beside production on the emulator (9 of 10 checks; the tenth is the Hebrew name below), and the EAS APK: aapt package, labels, scheme and channel, then installed beside production and launched to the welcome step.
  - Version: Build 1.0.21, versionCode 1 of `com.jew365.app.preview` · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: build `c625eaa5`, a direct APK from its EAS page; on the emulator only · Channel: preview
- **Bug: a Hebrew Android phone showed the app's English name** — Expo writes `locales.he` to `values-b+he`, which Android never reads for Hebrew (it resolves `iw`); [scripts/withAndroidLegacyHebrewLocale.js](scripts/withAndroidLegacyHebrewLocale.js) writes the same strings to `values-b+iw`, Android only. Production has the same bug until its next build ([not-close.md](not-close.md)).
  - Found: the emulator side-by-side check, 2026-10-25 (launcher, Settings and a system dialog in Hebrew showed "Jew 365" and "Jew 365 P"). Verified: [scripts/__tests__/androidLegacyHebrewLocale.test.js](scripts/__tests__/androidLegacyHebrewLocale.test.js) (the file equals Expo's `values-b+he`), prebuild of both variants, `aapt2 compile` of `values-b+iw`, and `application-label-iw:'יהודי 365 P'` in build `c625eaa5`; not yet on a phone set to Hebrew.
  - Version: Build; in the preview build `c625eaa5`, production in its next build · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview build `c625eaa5` only · Channel: preview
- **A preview update carries the preview identity** — [scripts/publish-update.js](scripts/publish-update.js) sets `APP_VARIANT=preview` for an update to the `preview` channel and removes it for every other channel, because `eas update` ignores a build profile's `env`.
  - Found: the adversarial verifier, 2026-10-25. Verified: [scripts/__tests__/publishUpdate.test.js](scripts/__tests__/publishUpdate.test.js) for the three channels, and a mutation check.
  - Version: none (release tooling) · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: n/a · Channel: —
- **Build commands named by platform, profile and artifact** — `build:android:production:aab`, `build:android:production:apk`, `build:android:preview:apk`, `build:ios:production`, `build:ios:preview`; the ambiguous `build:android` and `update`, both aimed at preview, are gone ([package.json](package.json), root [AGENTS.md](AGENTS.md) Commands).
  - Requested: the user, 2026-10-25. Verified: `pnpm check:dox`; no reference to an old name left in the repo or the skills; `pnpm build:android:preview:apk` ran the preview build above.
  - Version: none (scripts) · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: n/a · Channel: —
- **The emulator skill knows the preview app** — `apk -BuildProfile preview` expects `com.jew365.app.preview` and saves `jew365-preview-<version>-<build>.apk`; `prepare` deletes an `android/` generated for another application id; `run` drops any `APP_VARIANT` of the calling shell ([.claude/skills/android-native-verify/native.ps1](.claude/skills/android-native-verify/native.ps1), [SKILL.md](.claude/skills/android-native-verify/SKILL.md)).
  - Found: the adversarial verifier and the device check, 2026-10-25. Verified: the package helpers per profile, the application-id check on a preview and a production `build.gradle`, and the download of build `c625eaa5`.
  - Version: none · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: n/a · Channel: —

## 2026-10-25 — the request batch of 2026-10-24

- **Requested:** the user's batch of 2026-10-24, specified in [not-close.md](not-close.md) (Requests of 2026-10-24) by `f4a798f` and `76b2fb1`, plus the user's calls of 2026-10-25. `T<n>` is a task's place in that list as first written, the label the verification reports use; `B<n>` is a bug's place in not-close.md Bugs, all found on 2026-10-25.
- **Commits**, all made and pushed on 2026-10-25 (`origin/main` = `aba8897`). The batch was split by layer, so one item spans the commits that hold its files:
  - `1e12449` docs(site): rav review page, guide pages, Selichot add-on, gzipped Chok
  - `0ddc971` build: siddur assets for Ushpizin and the Selichot download, Chok gzip
  - `196471c` feat(services): add-on core, planners and stores for the 2026-10-24 batch
  - `c3227e0` feat(data): new mitzvot, schedules, the siddur voice and one counting rule
  - `aba8897` feat(app): screens of the 2026-10-24 request batch

  The Hebrew dictionary [src/i18n/he.json](src/i18n/he.json) landed in `1e12449` and the English one, [src/i18n/en.json](src/i18n/en.json), in `196471c`, so every item that adds UI text also depends on those two; the entries below list the commits that hold each item's code.
- **Version:** all of it is JS, bundled assets or [docs/](docs). The app side is live in production update `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26), the label of the `WHATS_NEW` entry in [src/data/guide.ts](src/data/guide.ts) that [scripts/publish-update.js](scripts/publish-update.js) requires. Not published on 2026-10-25: production's latest is `1.0.21-1`.
- **Live on Pages since the push** (checked 2026-10-25): [docs/chok/manifest.json](docs/chok/manifest.json) carries `gz` and `gzipBytes`, a `.json.gz` and a `.siddur.gz` answer `application/gzip` with no `Content-Encoding`, and the Selichot manifest, `guide/`, `guide/en/` and `halacha-review.html` answer 200. That is the release precondition the batch's bundle needs.
- **Verification:** `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` (4230 tests in four zones) on the final tree; web end-to-end runs in headless Chromium and Android emulator runs per phase. The reports sit outside the repo, in a temp folder that may be cleaned: `C:/Users/avrah/AppData/Local/Temp/claude/C--Users-avrah--claude-spares-spare-AjNaXs/a853b006-2ba9-4681-b299-62bc80483cd6/scratchpad/e2e/` (`p1-web-report.md`, `p1-native-report.md`, `p4-web-report.md`, `p4-native-report.md`, `p5-web-report.md`, `p6-native-report.md`, `log.md` for phases 2 and 3) and `C:/work/kjw-ush.report.md`, `C:/work/kjw-ush2.report.md` (the Selichot add-on lane).

### Tasks

- **Restore Chok LeYisrael's learning-day window and let ליל שישי count for Thursday or Friday** — the window is alot to the next alot again (candle lighting on an erev); ליל שישי gets "סיימתי", filed by `chokThuNightDay`, asked once and offered in Settings ([src/data/mitzvot.ts](src/data/mitzvot.ts), [src/utils/chok.ts](src/utils/chok.ts), [src/stores/useUserStore.ts](src/stores/useUserStore.ts), [src/app/siddur/[id].tsx](<src/app/siddur/[id].tsx>)).
  - Requested: the user's call of 2026-10-25, not-close.md High — Chok LeYisrael. Verified: window and reader tests under `test:tz`; Android emulator, phase 4 check 16.
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Ask to turn on Chok LeYisrael right after its download (B10)** — a dialog after a first download that installs the add-on with the mitzvah off; "כן" switches it on with its 09:00 reminder ([src/components/ChokEnablePrompt.tsx](src/components/ChokEnablePrompt.tsx), [src/stores/useChokStore.ts](src/stores/useChokStore.ts), [src/services/ChokContentService.ts](src/services/ChokContentService.ts)).
  - Requested: the user's call of 2026-10-25, not-close.md High — Chok LeYisrael. Verified: render tests; Android emulator, phase 4 check 16 and phase 6 check 1 (live site).
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Count an unmarked window only when its mitzvah was on before the window ended** — `trackedOn()`: a done mark always counts; history, home, the day view, the schedule, the check-in and the weekly report agree ([src/utils/historyStats.ts](src/utils/historyStats.ts), [src/utils/buildDayTimeline.ts](src/utils/buildDayTimeline.ts), [src/app/day/[date].tsx](<src/app/day/[date].tsx>)). Also closes F1 below.
  - Requested: the user's call of 2026-10-25. Verified: web end-to-end phase 5, 4 of 4 checks.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **The reader's header without nikud** — the Hebrew date and the day's occasions in `he-x-NoNikud`, the Chanukah candle of the evening the text is read for ([src/app/siddur/[id].tsx](<src/app/siddur/[id].tsx>), [src/utils/siddur.ts](src/utils/siddur.ts)).
  - Requested: the user's call of 2026-10-25. Verified: Jest ([src/app/__tests__/siddurLinkedText.render.test.tsx](src/app/__tests__/siddurLinkedText.render.test.tsx)); no end-to-end run after it.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **A compact Chok LeYisrael credit line** — the add-on card shows "© תורת אמת · CC BY-NC-SA 2.5", which opens the full credit in a sheet; the reader keeps the full credit beside the text ([src/components/ChokLicenseNotice.tsx](src/components/ChokLicenseNotice.tsx)).
  - Requested: the user's call of 2026-10-25. Verified: render tests; web end-to-end phase 3.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Store copy names kinds of features, never counts** — the listings and the site's feature list rewritten to the owner's rule ([release/PLAY_CONSOLE_METADATA.md](release/PLAY_CONSOLE_METADATA.md), [release/APP_STORE_METADATA_HE.md](release/APP_STORE_METADATA_HE.md), [release/APP_STORE_METADATA_EN.md](release/APP_STORE_METADATA_EN.md), [docs/index.html](docs/index.html)). The task "Add Chok LeYisrael to the store listings" stays open in not-close.md: the copy is not yet re-entered in either console.
  - Requested: the owner's rule of 2026-10-25 ([release/AGENTS.md](release/AGENTS.md)). Verified: read against the rule; the site answers 200.
  - Version: Pages for the site; the consoles are a manual step · Committed: yes, `1e12449` · Pushed: yes · Live: the site at https://jew-365.github.io/jew-365/; Play and App Store: no · Channel: —
- **Publish the rav questions as a review page (T35)** — R1 to R10 with each rule as implemented, its source and an answer form ([docs/halacha-review.html](docs/halacha-review.html)).
  - Requested: the user's request of 2026-10-24, not-close.md Requests of 2026-10-24. Verified: web end-to-end phase 4 check 1 (375 and 1280, light and dark, form validation, draft restore, stubbed send); 200 on Pages, 2026-10-25.
  - Version: Pages · Committed: yes, `1e12449` · Pushed: yes · Live: https://jew-365.github.io/jew-365/halacha-review.html · Channel: —
- **Move Selichot out of the bundle into a downloadable add-on per nusach (T33)** — one add-on core for Chok LeYisrael and Selichot, one gzip per nusach on Pages, the download offered from the siddur tab, the More tab, the mitzvah screen and a pre-season home banner ([src/services/addons/addonContent.ts](src/services/addons/addonContent.ts), [src/services/SelichotContentService.ts](src/services/SelichotContentService.ts), [src/components/SelichotAddonCard.tsx](src/components/SelichotAddonCard.tsx), [docs/selichot/manifest.json](docs/selichot/manifest.json)). The app shrinks by about 5.5 MB only with the next build.
  - Requested: the user's request of 2026-10-24. Verified: the add-on core's suite against both add-ons; Android emulator, phase 4 check 20 and phase 6 check 2 (live site, offline read); lane reports `kjw-ush*.report.md`.
  - Version: OTA `1.0.21-2`; the files on Pages; the size gain in the next build · Committed: yes, `1e12449` `0ddc971` `196471c` `c3227e0` `aba8897` · Pushed: yes · Live: files on Pages; app production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production
- **Upgrade bottom-tabs to the version with the detach fix (T32)** — React Navigation pinned to the 7.18.8 set by `pnpm.overrides`, no native package changed ([package.json](package.json), [src/app/__tests__/tabsLayout.render.test.tsx](src/app/__tests__/tabsLayout.render.test.tsx)).
  - Requested: the user's request of 2026-10-24. Verified: tab layout suite; Android emulator phase 1. Not checked on an iPhone.
  - Version: OTA `1.0.21-2` · Committed: yes, `0ddc971` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Rework the five non-default palettes to the default's quality (T31)** — pink, purple, blue, dark and plum, approved on a preview board ([src/theme/colors.ts](src/theme/colors.ts), [design/palettes-2026-10-24/index.html](design/palettes-2026-10-24/index.html)).
  - Requested: the user's request of 2026-10-24. Verified: theme and design-system suites; web, home in all six palettes.
  - Version: OTA `1.0.21-2` · Committed: yes, `1e12449` `196471c` `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Add a user guide that stays current with every change (T30)** — one source, a stack screen, a web copy, and two guards: `publish-update.js` refuses a production update without its `WHATS_NEW` entry, and a test fails on a screen no topic names ([src/data/guide.ts](src/data/guide.ts), [src/app/guide.tsx](src/app/guide.tsx), [scripts/guide/build.js](scripts/guide/build.js), [docs/guide/index.html](docs/guide/index.html)).
  - Requested: the user's request of 2026-10-24 (added by `76b2fb1`). Verified: guide suites; web end-to-end phase 4 checks 2 and 3; Pages 200.
  - Version: OTA `1.0.21-2`; the web copy on Pages · Committed: yes, `1e12449` `0ddc971` `c3227e0` `aba8897` · Pushed: yes · Live: web copy at https://jew-365.github.io/jew-365/guide/; app production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production
- **Turn "Contact us" into "About and contact" (T29)** — the version line first, then the links card (guide, support, privacy, store page, the Chok credit) and the form ([src/app/(tabs)/settings.tsx](<src/app/(tabs)/settings.tsx>), [src/services/ContactService.ts](src/services/ContactService.ts)).
  - Requested: the user's request of 2026-10-24. Verified: [settings.contact.render.test.tsx](src/app/__tests__/settings.contact.render.test.tsx); web end-to-end phase 1.
  - Version: OTA `1.0.21-2` · Committed: yes, `1e12449` `196471c` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Merge app reset into a "Backup, restore and reset" section (T28)** — the reset below the restore, with the delete-data link per language ([src/app/(tabs)/settings.tsx](<src/app/(tabs)/settings.tsx>)).
  - Requested: the user's request of 2026-10-24. Verified: [settings.backup.render.test.tsx](src/app/__tests__/settings.backup.render.test.tsx); Android emulator phase 1 (share and picker, reset clears every alarm).
  - Version: OTA `1.0.21-2` · Committed: yes, `1e12449` `196471c` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Add bookmarks and the last reading position to the siddur reader (T27)** — stable segment keys from the build, a bookmarks store in the backup file, a bookmarks sheet and a resume offer ([scripts/siddur/build.js](scripts/siddur/build.js), [src/stores/useSiddurBookmarksStore.ts](src/stores/useSiddurBookmarksStore.ts), [src/app/siddur/[id].tsx](<src/app/siddur/[id].tsx>)).
  - Requested: the user's request of 2026-10-24. Verified: reader render tests, unique-key test; web end-to-end phase 3.
  - Version: OTA `1.0.21-2` · Committed: yes, `0ddc971` `196471c` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Search mitzvot and siddur texts from Settings (T26)** — mitzvot, texts and chapters in the settings search, from a generated chapter index ([src/utils/settingsSearch.ts](src/utils/settingsSearch.ts), [src/data/siddurChapters.generated.ts](src/data/siddurChapters.generated.ts)).
  - Requested: the user's request of 2026-10-24. Verified: search unit and render tests; web end-to-end phase 3.
  - Version: OTA `1.0.21-2` · Committed: yes, `0ddc971` `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Apply the women's liturgy in every siddur text (T25)** — the voice patches of R8 and R9 across the four nuschaot ([scripts/siddur/manifest.js](scripts/siddur/manifest.js), [assets/siddur/](assets/siddur)).
  - Requested: the user's request of 2026-10-24. Verified: dated siddur cases per voice and the printed-reading digest snapshot; web and Android emulator phase 3.
  - Version: OTA `1.0.21-2` · Committed: yes, `0ddc971` `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Add the siddur voice setting that follows gender (T24)** — `siddurVoice`, set by every gender change, a Settings chip row, and the reader's `forVoice()` step ([src/stores/useUserStore.ts](src/stores/useUserStore.ts), [src/app/siddur/[id].tsx](<src/app/siddur/[id].tsx>)).
  - Requested: the user's request of 2026-10-24. Verified: store and settings tests; a null voice keeps the printed text byte for byte.
  - Version: OTA `1.0.21-2` · Committed: yes, `0ddc971` `196471c` `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Make every Rosh Chodesh and hilula notice configurable (T23)** — each notice kind on or off, its days ahead and its time ([src/services/notifications/planners/roshChodesh.ts](src/services/notifications/planners/roshChodesh.ts), [src/services/notifications/planners/hilulot.ts](src/services/notifications/planners/hilulot.ts), [src/components/NoticeSettingsCard.tsx](src/components/NoticeSettingsCard.tsx)).
  - Requested: the user's request of 2026-10-24. Verified: notice and scheduler suites under `test:tz`; Android emulator phase 2 (alarms move with the settings).
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Store the Chok add-on compressed on the device (T22)** — the parashiyot downloaded and kept as gzip, read with `fflate` ([scripts/chok/build.js](scripts/chok/build.js), [src/services/chokFiles.ts](src/services/chokFiles.ts), [docs/chok/manifest.json](docs/chok/manifest.json)).
  - Requested: the user's request of 2026-10-24. Verified: download suites; Android emulator phase 1 (54 files, 4,799,405 bytes) and phase 6 (live site, hashes 54 of 54).
  - Version: OTA `1.0.21-2`; the gzip files on Pages · Committed: yes, `1e12449` `0ddc971` `196471c` · Pushed: yes · Live: files on Pages; app production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production
- **Show the Chok add-on's real download size (T19)** — the confirmation quotes the manifest's `gzipBytes` ([src/components/ChokAddonCard.tsx](src/components/ChokAddonCard.tsx)).
  - Requested: the user's request of 2026-10-24. Verified: card tests; Android emulator phase 6 (4.8 MB from the live manifest).
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Fold Rashi and Bartenura in Chok LeYisrael, globally and per passage (T18)** — `chokCommentaryOpen` and a tap per passage ([src/app/siddur/[id].tsx](<src/app/siddur/[id].tsx>)).
  - Requested: the user's request of 2026-10-24. Verified: reader tests; Android emulator phase 1.
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Ask which mitzvot to track during onboarding (T17)** — a mitzvot step between nusach and location on the shared library list ([src/app/onboarding/mitzvot.tsx](src/app/onboarding/mitzvot.tsx)).
  - Requested: the user's request of 2026-10-24. Verified: [onboarding.mitzvot.render.test.tsx](src/app/__tests__/onboarding.mitzvot.render.test.tsx); web end-to-end phase 3.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Build the schedule picker in the custom mitzvah form (T16)** — weekdays, a range from a calendar sheet, a streak from a wheel ([src/app/custom-mitzvah.tsx](src/app/custom-mitzvah.tsx), [src/components/CalendarRangePicker.tsx](src/components/CalendarRangePicker.tsx)).
  - Requested: the user's request of 2026-10-24. Verified: [customMitzvah.render.test.tsx](src/app/__tests__/customMitzvah.render.test.tsx); web end-to-end phase 2.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Add schedule modes to the custom mitzvah model (T15)** — `schedules` entries by weekdays, range or streak, ended ones switched off on every foreground ([src/utils/customMitzvah.ts](src/utils/customMitzvah.ts), [src/stores/customMitzvahLifecycle.ts](src/stores/customMitzvahLifecycle.ts)).
  - Requested: the user's request of 2026-10-24. Verified: model and lifecycle tests; [rootLayout.render.test.tsx](src/app/__tests__/rootLayout.render.test.tsx).
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Keep Maariv open all night (T14)** — maariv's window ends at the next alot (R6) ([src/data/mitzvot.ts](src/data/mitzvot.ts)).
  - Requested: the user's request of 2026-10-24. Verified: window tests; web end-to-end phase 2 (current at 01:30).
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Add Ushpizin as a seasonal mitzvah with its text (T13)** — the text for Ashkenaz, Sefard and Edot HaMizrach (not Chabad, R5), the night's guest in the reminder, lines in the pre-block notice ([assets/siddur/ashkenaz/ushpizin.siddur](assets/siddur/ashkenaz/ushpizin.siddur), [src/services/notifications/planners/holyBlock.ts](src/services/notifications/planners/holyBlock.ts), [src/data/__tests__/ushpizinMitzvah.test.ts](src/data/__tests__/ushpizinMitzvah.test.ts)).
  - Requested: the user's request of 2026-10-24. Verified: Ushpizin suite under `test:tz`; web end-to-end phase 4 check 12; Android emulator phase 4 check 21.
  - Version: OTA `1.0.21-2` · Committed: yes, `0ddc971` `196471c` `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Add Chanukah candles as a seasonal mitzvah (T12)** — eight nights with Friday and motzaei Shabbat timing (R4), the night named in the reminder through `bodyParams` ([src/data/mitzvot.ts](src/data/mitzvot.ts), [src/services/notifications/planners/mitzvot.ts](src/services/notifications/planners/mitzvot.ts)).
  - Requested: the user's request of 2026-10-24. Verified: window tests under `test:tz`; web and Android emulator phase 3.
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Add Selichot as a seasonal mitzvah (T11)** — chatzot halayla to sof zman tefila on each day of the nusach's season (R2) ([src/data/mitzvot.ts](src/data/mitzvot.ts), [src/utils/siddur.ts](src/utils/siddur.ts)).
  - Requested: the user's request of 2026-10-24. Verified: window tests per nusach; web end-to-end phase 3.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Add Kiddush Levana as a monthly mitzvah (T10)** — one multi-day window per month from the molad (R1), the `multiDay` engine support and the `blockExit` anchor ([src/utils/siddur.ts](src/utils/siddur.ts), [src/utils/buildDayTimeline.ts](src/utils/buildDayTimeline.ts), [src/utils/skipRules.ts](src/utils/skipRules.ts)).
  - Requested: the user's request of 2026-10-24. Verified: molad and period tests, mitzvah and home suites under `test:tz`; web and Android emulator phase 3 (blockExit + 15 notification).
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Add the bedtime Shema as a mitzvah (T9)** — `krias_shma_al_hamita`, nightfall to the next alot (R3) ([src/data/mitzvot.ts](src/data/mitzvot.ts)).
  - Requested: the user's request of 2026-10-24. Verified: window tests; Android emulator phase 2 (the 22:30 notification fired, open text and mark done from the shade).
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Prepare the registry for new default-on mitzvot (T8)** — `DEFAULT_ON_MITZVOT`, `enabledAt` stamped at the hydrate that adds one, men's ones off for a woman ([src/stores/useMitzvotStore.ts](src/stores/useMitzvotStore.ts), [src/stores/taharahOptIn.ts](src/stores/taharahOptIn.ts)).
  - Requested: the user's request of 2026-10-24. Verified: [newDefaults.test.ts](src/stores/__tests__/newDefaults.test.ts) under `test:tz`; web end-to-end phase 2 (an existing install gets no misses).
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Group the mitzvot library by category with a floating add button (T7)** — the shared `MitzvahLibraryList` ([src/components/MitzvahLibraryList.tsx](src/components/MitzvahLibraryList.tsx), [src/app/mitzvot.tsx](src/app/mitzvot.tsx)).
  - Requested: the user's request of 2026-10-24. Verified: library render tests; web and Android emulator phase 2 (geometry at 360 and 375).
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Add a follow-up reminder after the window for custom mitzvot (T6)** — the `followUp` anchor, 1 to 720 minutes after the window, dropped once the day is marked ([src/utils/skipRules.ts](src/utils/skipRules.ts), [src/app/custom-mitzvah.tsx](src/app/custom-mitzvah.tsx)).
  - Requested: the user's request of 2026-10-24. Verified: scheduler tests; Android emulator phase 1 (a real follow-up and mark done from the shade, also with the app swiped away).
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Give every mitzvah full reminder flexibility (T5)** — every anchor on every mitzvah, any number of reminders, a heads-up up to 180 minutes ahead; birchot hashachar until chatzot hayom (R7) ([src/components/ReminderEditor.tsx](src/components/ReminderEditor.tsx), [src/utils/skipRules.ts](src/utils/skipRules.ts)).
  - Requested: the user's request of 2026-10-24. Verified: editor and planner tests; Android emulator phase 1 (a 10:00 clock alarm in `dumpsys`).
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Require at least one reminder on every enabled mitzvah (T4)** — `canEnable()` and the shared dialog ([src/stores/useMitzvotStore.ts](src/stores/useMitzvotStore.ts), [src/hooks/useNeedsReminderDialog.tsx](src/hooks/useNeedsReminderDialog.tsx)).
  - Requested: the user's request of 2026-10-24. Verified: store and render tests; web end-to-end phase 1 check 1.
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Seat the tab bar at the bottom on iPhone (T3)** — the tab bar's bottom padding ([src/components/BottomTabs.tsx](src/components/BottomTabs.tsx)).
  - Requested: the user's request of 2026-10-24. Verified: [BottomTabs.render.test.tsx](src/components/__tests__/BottomTabs.render.test.tsx). Not checked on an iPhone.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Fix weekday and month names that read "null" on iOS (T2)** — names only from the dictionaries through `formatDate()`, with a tripwire against Luxon names; `SCHEDULE_FORMAT` raised ([src/i18n/index.ts](src/i18n/index.ts), [src/app/__tests__/designSystem.test.ts](src/app/__tests__/designSystem.test.ts)).
  - Requested: the user's request of 2026-10-24. Verified: i18n tests with Intl date names hidden. Not checked on an iPhone.
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Fix the blank tab screen on iOS (T1)** — `detachInactiveScreens={false}`, no `freezeOnBlur`, home's entering animation only while focused ([src/app/(tabs)/_layout.tsx](<src/app/(tabs)/_layout.tsx>), [src/app/(tabs)/home.tsx](<src/app/(tabs)/home.tsx>)).
  - Requested: the user's request of 2026-10-24. Verified: [tabsLayout.render.test.tsx](src/app/__tests__/tabsLayout.render.test.tsx). Not checked on an iPhone.
  - Version: OTA `1.0.21-2` · Committed: yes, `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview

### Bugs

- **F1: the day drilldown judged days before the install as missed** — closed by `trackedOn()` (Tasks above) ([src/app/day/[date].tsx](<src/app/day/[date].tsx>)).
  - Found: Android emulator, phase 4 check 15, 2026-10-25. Verified: web end-to-end phase 5.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **Keep a list row's switch reachable by screen readers** — a row with `trailing` holds its pressable part and the switch as siblings ([src/components/ListRow.tsx](src/components/ListRow.tsx)).
  - Found: review, 2026-10-25. Verified: `ListRow` render test and the library, notice, hilulot and Rosh Chodesh suites; web end-to-end phase 4 check 9. A VoiceOver pass on TestFlight is the owner's.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B21: refuse a malformed reminder offset instead of saving zero** — "-60-600" shows an error and saves nothing ([src/components/ReminderEditor.tsx](src/components/ReminderEditor.tsx)).
  - Found: Android emulator, 2026-10-25. Verified: render test; web end-to-end phase 4 check 8; Android emulator phase 4 check 18.
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B20: name the right Chanukah night in the reader's header** — the candle of the evening the text is read for, hebcal's candle labels left out ([src/app/siddur/[id].tsx](<src/app/siddur/[id].tsx>), [src/services/HebcalService.ts](src/services/HebcalService.ts)).
  - Found: Android emulator, 2026-10-25. Verified: reader tests; web end-to-end phase 4 check 7.
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B19: close the custom mitzvah form after save even when a link opened it** — back when possible, else replace to `/mitzvot` ([src/app/custom-mitzvah.tsx](src/app/custom-mitzvah.tsx)).
  - Found: web end-to-end phase 3, 2026-10-25. Verified: render test; web end-to-end phase 4 check 10.
  - Version: OTA `1.0.21-2` · Committed: yes, `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B18: keep the bookmark's delete button outside its row's button** ([src/app/siddur/[id].tsx](<src/app/siddur/[id].tsx>)).
  - Found: web end-to-end phase 3, 2026-10-25. Verified: reader test; web end-to-end phase 4 check 9 (no console warning).
  - Version: OTA `1.0.21-2` · Committed: yes, `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B17: withdraw reminders of a day that has ended** — presented mitzvah reminders leave the tray at their app day's end, so Android's cap of about 50 never fills ([src/services/NotificationScheduler.ts](src/services/NotificationScheduler.ts), [src/services/notifications/os.ts](src/services/notifications/os.ts)).
  - Found: Android emulator, 2026-10-25. Verified: [NotificationScheduler.endedDay.test.ts](src/services/__tests__/NotificationScheduler.endedDay.test.ts) under `test:tz`; Android emulator phase 4 check 19.
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B16: stamp the default mitzvot of a fresh install with its first launch** — no check-in or miss for days before the install ([src/stores/useMitzvotStore.ts](src/stores/useMitzvotStore.ts)). A new install's first session runs the build's embedded bundle, so new users get it fully only from the next build (not-close.md Other Open Items).
  - Found: Android emulator, 2026-10-25. Verified: store and check-in tests; Android emulator phase 4 check 15.
  - Version: OTA `1.0.21-2`; fully in the next build · Committed: yes, `196471c` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B15: grey Kiddush Levana in Settings search after its period ends** — the search uses `standalonePeriodEnded()` like the siddur tab and the reader ([src/utils/settingsSearch.ts](src/utils/settingsSearch.ts)).
  - Found: 2026-10-25. Verified: search test; web end-to-end phase 4 check 6.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B14: show a number pad for minutes and offsets on Android** ([src/components/ReminderEditor.tsx](src/components/ReminderEditor.tsx), [src/app/taharah/log.tsx](src/app/taharah/log.tsx)).
  - Found: Android emulator, 2026-10-25. Verified: render tests per platform; Android emulator phase 4 check 17.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B13: show a night custom text's Hebrew date by the night** ([src/app/siddur/[id].tsx](<src/app/siddur/[id].tsx>)).
  - Found: phase-3 verifier, 2026-10-25. Verified: reader test; web end-to-end phase 4 check 5.
  - Version: OTA `1.0.21-2` · Committed: yes, `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B12: open the Chanukah text in the siddur tab from the mitzvah's own start** — the text's hours read the mitzvah's window ([src/data/siddur.ts](src/data/siddur.ts)).
  - Found: phase-3 verifier, 2026-10-25. Verified: Friday-plag and Chabad-shkia tests; web end-to-end phase 4 check 4.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B11: keep a typed reminder label on Chanukah candles** — the keyed line stands in only for the registry's own wording ([src/services/notifications/planners/mitzvot.ts](src/services/notifications/planners/mitzvot.ts)).
  - Found: phase-3 verifier, 2026-10-25. Verified: [NotificationScheduler.bodyVariants.test.ts](src/services/__tests__/NotificationScheduler.bodyVariants.test.ts).
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B10** — see "Ask to turn on Chok LeYisrael right after its download" under Tasks.
- **B9: Chok LeYisrael's window from sunrise to shkia — superseded** — built and verified on 2026-10-25 (web end-to-end phase 3), then reverted the same day by the user's call to "Restore Chok LeYisrael's learning-day window" (Tasks). No commit holds it.
  - Requested: the user, 2026-10-25. Verified: n/a, reverted.
  - Version: none · Committed: no · Pushed: no · Live: no · Channel: —
- **B8: make the calendar range shading visible** — `goldWashStrong` between the ends, `textSub` for the Hebrew day ([src/components/CalendarRangePicker.tsx](src/components/CalendarRangePicker.tsx)).
  - Found: web end-to-end phase 2, 2026-10-25. Verified: contrast tests in six palettes; web end-to-end phase 3.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B7: schedule a mitzvah that an update switches on, without a format raise** — the module scope drops the schedule stamp when the hydrate added an id ([src/services/NotificationScheduler.ts](src/services/NotificationScheduler.ts)).
  - Found: phase-2 end-to-end review, 2026-10-25. Verified: [NotificationScheduler.headless.test.ts](src/services/__tests__/NotificationScheduler.headless.test.ts).
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B6: a mitzvah added today no longer reads 0% in history** — a "new" caption until one of its days is decided ([src/app/(tabs)/history.tsx](<src/app/(tabs)/history.tsx>)).
  - Found: web end-to-end phase 2, 2026-10-25. Verified: [history.render.test.tsx](src/app/__tests__/history.render.test.tsx); web phase 3; Android emulator phase 4 check 15.
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B5: typing a time by hand inside a bottom sheet works on Android** ([src/components/TimeField.tsx](src/components/TimeField.tsx), [src/components/BottomSheet.tsx](src/components/BottomSheet.tsx)).
  - Found: Android emulator phase 2, 2026-10-25 (older than the batch). Verified: render tests. No later device run of this exact path is recorded.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B4: a custom mitzvah between midnight and alot belongs to the evening before** — one day key on home, the day view, history and the planner ([src/data/customMitzvotAdapter.ts](src/data/customMitzvotAdapter.ts)).
  - Found: Android emulator phase 1, 2026-10-25. Verified: [customNightWindow.test.ts](src/data/__tests__/customNightWindow.test.ts) under `test:tz`.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B3: keep an ended streak's count on a save that does not change it** ([src/utils/customMitzvah.ts](src/utils/customMitzvah.ts), [src/app/custom-mitzvah.tsx](src/app/custom-mitzvah.tsx)).
  - Found: phase-2 verifier, 2026-10-25. Verified: render tests; web end-to-end phase 3.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B2: word Rosh Chodesh and hilula notices by when they actually fire** — coming wording before the opening shkia, present wording after it ([src/services/notifications/planners/roshChodesh.ts](src/services/notifications/planners/roshChodesh.ts), [src/services/notifications/planners/hilulot.ts](src/services/notifications/planners/hilulot.ts)).
  - Found: phase-2 verifier, 2026-10-25. Verified: [notices.test.ts](src/services/notifications/__tests__/notices.test.ts) under `test:tz`.
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **B1: apply the gender defaults in a headless launch too** — `applyGenderDefaultsToNew()` at the scheduler's module scope ([src/services/NotificationScheduler.ts](src/services/NotificationScheduler.ts), [src/stores/taharahOptIn.ts](src/stores/taharahOptIn.ts)).
  - Found: phase-2 verifier, 2026-10-25. Verified: [NotificationScheduler.headless.test.ts](src/services/__tests__/NotificationScheduler.headless.test.ts) under `test:tz`.
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview

### Fixes found while verifying the batch

- **The rav page's intro counted 16 items for 17** ([docs/halacha-review.html](docs/halacha-review.html)).
  - Found: web end-to-end phase 4 check 1, 2026-10-25. Verified: the committed page says 17.
  - Version: Pages · Committed: yes, `1e12449` · Pushed: yes · Live: https://jew-365.github.io/jew-365/halacha-review.html · Channel: —
- **FIX-D: on web, a library switch also pressed its row** — fixed in phase 1, later replaced by the list-row fix (Bugs above).
  - Found: web end-to-end phase 1, 2026-10-25. Verified: Playwright before and after.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **FIX-C: a switched-off mitzvah's screen no longer names its next reminder** ([src/app/mitzvah/[id].tsx](<src/app/mitzvah/[id].tsx>)).
  - Found: Android emulator phase 1, 2026-10-25. Verified: [mitzvah.render.test.tsx](src/app/__tests__/mitzvah.render.test.tsx); device rerun.
  - Version: OTA `1.0.21-2` · Committed: yes, `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **FIX-B: the Chok add-on was stored twice on Android by the HTTP cache** — `Cache-Control: no-store` on every file request ([src/services/addons/addonContent.ts](src/services/addons/addonContent.ts)).
  - Found: Android emulator phase 1, 2026-10-25. Verified: `cache/http-cache` 52 KB after the fix, 68 KB in phase 6.
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **FIX-A: the focused tab pill lost its rounded corners after a tab switch on Android** ([src/components/BottomTabs.tsx](src/components/BottomTabs.tsx)).
  - Found: Android emulator phase 1, 2026-10-25. Verified: device before and after.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **FIX-6: Hebrew short weekday names use the geresh** ([src/i18n/he.json](src/i18n/he.json)).
  - Found: phase-1 integration review, 2026-10-25. Verified: i18n tests.
  - Version: OTA `1.0.21-2` · Committed: yes, `1e12449` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **FIX-5: a Chok manifest without plain `files` is accepted**, so the installed bundle and a rollback both read the gzip manifest ([src/services/ChokContentService.ts](src/services/ChokContentService.ts)).
  - Found: phase-1 integration review, 2026-10-25. Verified: manifest tests.
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **FIX-4: searching "קישורים" lands on the links card, not the contact form** ([src/utils/settingsSearch.ts](src/utils/settingsSearch.ts)).
  - Found: phase-1 integration review, 2026-10-25. Verified: search unit and render tests.
  - Version: OTA `1.0.21-2` · Committed: yes, `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **FIX-3: the window-rule copy says "outside the active hours"** ([src/i18n/he.json](src/i18n/he.json), [src/i18n/en.json](src/i18n/en.json)).
  - Found: phase-1 integration review, 2026-10-25. Verified: custom form tests.
  - Version: OTA `1.0.21-2` · Committed: yes, `1e12449` `196471c` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **FIX-2: the follow-up range error in the custom form** ([src/app/custom-mitzvah.tsx](src/app/custom-mitzvah.tsx)).
  - Found: phase-1 integration review, 2026-10-25. Verified: custom form tests.
  - Version: OTA `1.0.21-2` · Committed: yes, `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview
- **FIX-1: a follow-up's default label is resolved when the notification is built**, so it follows the mitzvah's name and the UI language ([src/utils/mitzvahName.ts](src/utils/mitzvahName.ts)).
  - Found: phase-1 integration review, 2026-10-25. Verified: scheduler, mitzvah screen and web-parity tests.
  - Version: OTA `1.0.21-2` · Committed: yes, `196471c` `c3227e0` `aba8897` · Pushed: yes · Live: preview `1.0.21-1` (group `59dbbc4c-cf6b-483f-9a46-ab7a81c304d5`, 2026-10-26); production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, 2026-10-26) · Channel: production, preview

### Tooling

- **Jest `testTimeout` 30 s** — the first render of a heavy screen passed 5 s under `pnpm test:tz` ([package.json](package.json)).
  - Found: `test:tz` runs, 2026-10-25. Verified: the final gate.
  - Version: none (tests only) · Committed: yes, `0ddc971` · Pushed: yes · Live: n/a · Channel: —
- **The emulator skill tears down its `adb reverse`** ([.claude/skills/android-native-verify/SKILL.md](.claude/skills/android-native-verify/SKILL.md)).
  - Found: an adb server hang during phase 2, 2026-10-25. Verified: phase 6 teardown left `reverse --list` empty.
  - Version: none · Committed: yes, `0ddc971` · Pushed: yes · Live: n/a · Channel: —

## 2026-10-24 — the batch specified, store status

- **Specify the 2026-10-24 request batch and the user guide task** — closed tasks with flags and the rav questions R1 to R9 in [not-close.md](not-close.md).
  - Requested: the user, 2026-10-24. Verified: `pnpm check:dox`.
  - Version: none (docs) · Committed: yes, `f4a798f` docs(not-close): specify the 2026-10-24 request batch; `76b2fb1` docs(not-close): add the user guide task · Pushed: yes · Live: n/a · Channel: —
- **Store status of 2026-10-24** recorded in [release/RELEASE_LOG.md](release/RELEASE_LOG.md).
  - Requested: the owner, 2026-10-24. Verified: read from both consoles.
  - Version: none (docs) · Committed: yes, `562937f` docs(release): store status on 2026-10-24 · Pushed: yes · Live: n/a · Channel: —
- **Emulator display ids fixed in the emulator skill, its task lock untracked** ([.claude/skills/android-native-verify/SKILL.md](.claude/skills/android-native-verify/SKILL.md)).
  - Requested: unknown. Verified: unknown.
  - Version: none · Committed: yes, `6e32cc0` chore(claude): fix emulator display ids, untrack the task lock · Pushed: yes · Live: n/a · Channel: —

## 2026-10-23 — Chok LeYisrael as a downloadable add-on (OTA 1.0.21-1)

- **Chok LeYisrael from the Torat Emet database, downloaded inside the app** — [scripts/chok/](scripts/chok) builds [docs/chok/](docs/chok) from the committed source, the app downloads it from Pages, the mitzvah has a 09:00 reminder ([src/services/ChokContentService.ts](src/services/ChokContentService.ts)).
  - Requested: the user, 2026-10-23 (source and delivery calls). Verified: Android emulator (download from More, progress, reader, offline, delete, re-download, v1 to v2 update).
  - Version: OTA `1.0.21-1` · Committed: yes, `e2694e6` feat(chok): Chok LeYisrael as a downloadable Torat Emet add-on; `356d847` fix(chok): credit line that reads right in RTL, content v2 · Pushed: yes · Live: `1.0.21-1`, group `59a089c2-7147-415b-b22c-6dc970f39eba`, published 2026-10-23 for Android and iOS (9 Android and 4 iOS launches, no failures, on 2026-10-24); content v2 on Pages · Channel: production
- **Store records aligned with both consoles; the iPhone TestFlight link for testers** ([release/](release)).
  - Requested: the owner, 2026-10-23. Verified: read back from both consoles ([release/RELEASE_LOG.md](release/RELEASE_LOG.md), 2026-10-23).
  - Version: none (docs) · Committed: yes, `a476324` docs(release): iPhone TestFlight link for testers, App Store records; `b590c16` docs(release): align store records with both consoles · Pushed: yes · Live: n/a · Channel: —

## 2026-10-19 to 2026-10-22 — the Jew 365 identity, the redesign, build 1.0.21

The new app `com.jew365.app` (EAS `@jew-365-org/jew-365`). Every build below is read from `eas build:list` (2026-10-25).

- **iOS build 1.0.21 (4)** — `expo.name` in Latin letters so EAS finds the Xcode target, `@sentry/cli` as a direct dev dependency, the taharah fallback file out of iCloud, iPhone only ([app.json](app.json), [package.json](package.json)).
  - Requested: the owner, 2026-10-22 (iOS via TestFlight). Verified: build `72c51b1e` FINISHED after `052c2db2` and `1b4f562b` errored ([release/RELEASE_LOG.md](release/RELEASE_LOG.md)).
  - Version: Build `1.0.21`, buildNumber 4 · Committed: yes, `42e961d` fix(ios): give expo.name Latin letters so EAS finds the Xcode target; `a035ab3` feat(ios): keep the taharah fallback out of iCloud, ship iPhone only; `04500e7` fix(ios): add @sentry/cli as a direct dev dependency · Pushed: yes · Live: `72c51b1e` on TestFlight (public link), in App Store review since 2026-10-23 · Channel: production
- **The four symbols in every icon; the blue notification colour** ([scripts/logo/export.mjs](scripts/logo/export.mjs), [assets/](assets)).
  - Requested: the owner's rule, 2026-10-22. Verified: the APK checked for the symbols and the colour; the owner installed and approved it.
  - Version: Build `1.0.21`, AAB versionCode 8, APK versionCode 9 · Committed: yes, `11be1c8` feat(logo): the four symbols in every icon; blue notification colour · Pushed: yes · Live: AAB `cc56fee1` on Play `Closed testing - Alpha` (release `8 (1.0.21)`, approved 2026-10-22); APK `d54afeab` for direct installs · Channel: production
- **Keep the launcher icon clear of Samsung's mask; version 1.0.21** ([scripts/logo/export.mjs](scripts/logo/export.mjs)).
  - Found: the owner's Samsung phone, 2026-10-21 (1.0.20 icon cropped). Verified: the extracted foreground.
  - Version: Build `1.0.21`, AAB `0b2ddd8f` versionCode 6, APK `e2682ebc` versionCode 7, never uploaded (superseded by versionCode 8 and 9) · Committed: yes, `3a7b177` fix(android): keep the launcher icon clear of Samsung's mask; 1.0.21 · Pushed: yes · Live: superseded · Channel: —
- **The redesign: warm palette, premium UI, the Jew 365 logo; Expo SDK 54 patches** ([src/theme/colors.ts](src/theme/colors.ts), [design/references/2026-10-21/](design/references/2026-10-21)).
  - Requested: the owner, 2026-10-21. Verified: typecheck, lint, DOX and 2,710 tests in four zones; Android emulator.
  - Version: Build `1.0.20` (AAB `a0d84bad` versionCode 4, APK `811bbbb9` versionCode 5, never uploaded); in every 1.0.21 build since · Committed: yes, `73c50ad` feat: redesign with the warm palette, premium UI and the Jew 365 logo; `a10e790` chore(deps): Expo SDK 54 patch upgrades; merged in `93f2af4` · Pushed: yes · Live: in the 1.0.21 builds above · Channel: production
- **No promise of no server, no database or offline only, anywhere** ([release/RELEASE_LOG.md](release/RELEASE_LOG.md), 2026-10-21).
  - Requested: the owner, 2026-10-21. Verified: the Play descriptions edited to match.
  - Version: Pages and store copy; in the 1.0.21 builds · Committed: yes, `dcf802a` docs: drop every promise of no server, no database or offline only · Pushed: yes · Live: the site; both listings · Channel: —
- **The public site in the 2026-10-21 palette, the testers page, the rav's taharah answer form** ([docs/index.html](docs/index.html), [docs/testers/](docs/testers), [docs/taharah-review.html](docs/taharah-review.html)).
  - Requested: the owner, 2026-10-22. Verified: the pages answer 200 (2026-10-25).
  - Version: Pages · Committed: yes, `a9bcd3d` style(docs): the public site in the 2026-10-21 palette; `d882c4f` fix(logo): the site favicon comes from the logo export too; `adec680` feat(docs): an answer form for the rav's taharah review; `3f569b3` feat(docs): tester invitation page for the closed test; `5a069b6` fix(docs): sharp logo and a tab icon that survives dark themes · Pushed: yes · Live: https://jew-365.github.io/jew-365/ · Channel: —
- **Move project accounts to 365jew@gmail.com** — Expo organization, GitHub organization, Formspree, contact email ([src/services/ContactService.ts](src/services/ContactService.ts), [app.json](app.json)).
  - Requested: the user, 2026-10-20. Verified: keystore SHA-256 identical after the Expo move; Pages URLs 200.
  - Version: Build `1.0.20`, AAB `3753424b` versionCode 3 (never uploaded) · Committed: yes, `3f0ab1f` chore: move project accounts to 365jew@gmail.com · Pushed: yes · Live: in every later build · Channel: production
- **Move the app to the Jew 365 identity as a new app** — `com.jew365.app`, scheme `jew365`, a new EAS project; the previous app's backup file restores here ([app.json](app.json), [src/services/BackupService.ts](src/services/BackupService.ts)).
  - Requested: the user, 2026-10-19 (after `8f5e419` named it Jew 360 the same day). Verified: unknown beyond the build.
  - Version: Build `1.0.20`, APK `5d9a512f` versionCode 2 · Committed: yes, `8f5e419` feat: rename the app to Jew 360; `2a7b721` feat!: move the app to the Jew 365 identity · Pushed: yes · Live: APK `5d9a512f`, direct install; whether any install remains: unknown · Channel: production

- **Store steps, site notes, tooling and design housekeeping of 2026-10-20 to 2026-10-22** — the Play listing, submission, closed-test approval and site restyle recorded in [release/RELEASE_LOG.md](release/RELEASE_LOG.md) and [release/PLAY_CONSOLE_METADATA.md](release/PLAY_CONSOLE_METADATA.md); the repo skills and the done-gate config in [.claude/](.claude); the vendored Expo agent skills in [.agents/skills/](.agents/skills); rejected logo rounds dropped and the redesign directions board kept in [design/](design); the push-notification prompt turned off in [eas.json](eas.json).
  - Requested: the owner, 2026-10-20 to 2026-10-22 (the release-log rule and the store work). Verified: unknown.
  - Version: none (docs and tooling) · Committed: yes, `689879d` `96f6f52` `952959e` `791347a` `0e9e7c4` `245f21b` `ba1b2ad` `9dfe337` `d081d8c` `6f482ff` `442f304` `6216940` `8ad02c4` · Pushed: yes · Live: n/a · Channel: —

## Before 2026-10-19 — the previous app

The work below shipped in the previous app (its own package and EAS project, both since replaced; its installs get nothing from this project). Its builds and updates come from the project memory, so ids are as recorded there and anything unrecorded is `unknown`. Every commit is in `main` and pushed.

- **2026-10-18 — contact form, halacha hotline, Selichot and Nishmat texts, taharah resets, the siddur "Now" card, settings search and section summaries** ([src/services/ContactService.ts](src/services/ContactService.ts), [src/utils/settingsSearch.ts](src/utils/settingsSearch.ts)).
  - Requested: the user, 2026-10-14 to 2026-10-18. Verified: unknown.
  - Version: OTA `1.0.19-2` carried the contact form; what else it carried: unknown · Committed: yes, `a46b7a8` `ffb8f84` `1d00788` `380f45e` `cbff1d6` · Pushed: yes · Live: previous app, `1.0.19-2`, group unknown · Channel: production
- **2026-10-14 — backup and restore** — Android Auto Backup whitelist and a backup file ([scripts/withAndroidBackupRules.js](scripts/withAndroidBackupRules.js), [src/services/BackupService.ts](src/services/BackupService.ts)).
  - Requested: the user, 2026-10-14. Verified: Android emulator (bmgr archive, restore, file import and export).
  - Version: Build `1.0.19`, build id unknown · Committed: yes, `7c400ad` feat: backup and restore — Android Auto Backup whitelist and backup file · Pushed: yes · Live: previous app, build `1.0.19` · Channel: production
- **2026-10-12 — Tehillim book and day headings; the siddur and history tabs swapped** — published from the working tree before its commit.
  - Requested: the user, 2026-10-12. Verified: unknown.
  - Version: OTA `1.0.18-13` · Committed: yes, `53864f0` feat: swap siddur and history tabs; Tehillim book and day headings (2026-10-14) · Pushed: yes · Live: previous app, `1.0.18-13`, group `536ab53b-fbd9-4536-8a6a-2a2b62a27a82` · Channel: production
- **2026-10-12 — Tehillim, jumpable by the weekly division** ([assets/siddur/shared/](assets/siddur/shared)).
  - Requested: the user, 2026-10-12. Verified: web preview (picker jump timing).
  - Version: OTA `1.0.18-12` · Committed: yes, `77a1a99` feat(siddur): add Tehillim, jumpable by the weekly division · Pushed: yes · Live: previous app, `1.0.18-12`, group `d7e1448c-485e-4d9b-935d-e7ae8e122e33` · Channel: production
- **2026-10-12 — the app day turns at alot; clock reminders; overnight custom mitzvot; one-list library; taharah id fix**.
  - Requested: the user, 2026-10-12. Verified: unknown.
  - Version: OTA, label unknown (`1.0.18-11`, group `bb7aeb57-71f7-404b-b99d-558e68eac5aa`, is recorded with unknown content) · Committed: yes, `46f5d39` `9cfe8d1` `e8861f1` `186d7f8` · Pushed: yes · Live: previous app, unknown · Channel: production
- **2026-10-11 — Chok LeYisrael as a learning mitzvah with done and make-ups (hidden until the source permitted)**.
  - Requested: the user, 2026-10-11. Verified: CI green.
  - Version: OTA `1.0.18-9` · Committed: yes, `9cd884c` `e22129b` · Pushed: yes · Live: previous app, `1.0.18-9`, group `4da8da6c-7493-4695-9b22-435a4dea4674` · Channel: production
- **2026-10-11 — the More tab hub, the schedule as a stack screen, the Chok LeYisrael pipeline and reader (hidden)**.
  - Requested: the user, 2026-10-11. Verified: unknown.
  - Version: OTA `1.0.18-8` · Committed: yes, `3a3f3b2` `405f17c` · Pushed: yes · Live: previous app, `1.0.18-8`, group `09136a3b-dc3a-403e-95e9-0edbac16e67d` · Channel: production
- **2026-10-11 — English aligned with its Hebrew across every nusach** (85 segments in 21 assets).
  - Requested: the user, 2026-10-11. Verified: a reader and refuter sweep, then `siddur.test.ts`.
  - Version: OTA `1.0.18-7` · Committed: yes, `1d6a37f` fix(siddur): align English with its Hebrew across every nusach · Pushed: yes · Live: previous app, `1.0.18-7`, group `f167bf5b-a27c-4c64-95f6-f93d862cc65c` · Channel: production
- **2026-10-11 — siddur toolbar, prayers group, Tikkun HaKlali, Rosh Chodesh notices, weekly report, collapsible settings, gender palette, tzitzit removed** (the ten tasks queued that day).
  - Requested: the user, 2026-10-11. Verified: unknown.
  - Version: OTA `1.0.18-5` · Committed: yes, `fb7b42a` · Pushed: yes · Live: previous app, `1.0.18-5`, group unknown · Channel: production
- **2026-10-10 and 2026-10-11 — custom mitzvah active days and time pickers, reader picker row, wheel time picker, Shacharit chapters, six palettes, the ten-minute exit, the floating update banner**.
  - Requested: the user, 2026-10-10 and 2026-10-11. Verified: unknown.
  - Version: OTA, labels unknown · Committed: yes, `d941eed` `bfb39be` `baf0ea4` `a31ea2f` · Pushed: yes · Live: previous app, unknown · Channel: production
- **2026-10-10 — minyan or alone prayer mode, tallit and tefillin in Shacharit, settings regrouped, 15 scroll speeds**.
  - Requested: the user, 2026-10-10. Verified: unknown.
  - Version: OTA `1.0.18-1` · Committed: yes, `aa78864` · Pushed: yes · Live: previous app, `1.0.18-1`, group `d41cb566` (short id as recorded) · Channel: production
- **2026-10-09 — the product audit's stages: ESLint and Prettier, one design system, the siddur tab and mitzvot screen, the identity texts, the scheduler split, Sentry and the background task**.
  - Requested: the user, 2026-10-08 and 2026-10-09. Verified: a failed EAS build fixed by `85ac64a`, then a green build.
  - Version: Build `1.0.18`, `03f80575` versionCode 18 (`production-apk`) · Committed: yes, `d40c370` `329a518` `6a16a09` `095f406` `67d7c8c` `5697e69` `85ac64a` · Pushed: yes · Live: previous app, direct APK · Channel: production
- **2026-10-08 — taharat hamishpacha with minhag presets, reminders and a lock; numbered updates; the update notice; marital status; palettes; the standalone siddur; auto-scroll; hilulot notices**.
  - Requested: the user, 2026-10-08. Verified: Jest per feature (655 to 854 tests) with four-zone runs of the touched suites; no device run of the taharah lock is recorded.
  - Version: Build `1.0.17`, `c45e023a` versionCode 16; OTA `1.0.17-4` carried the standalone siddur (`00879a3`); `1.0.17-3`, group `7e2046c6-e9ed-43c7-a944-50aea5c12137`, content unknown · Committed: yes, `03eed0f` `bd67d3d` `c88e9bf` `c1aa116` `4e1cd74` `8979a30` `eb3444d` `00879a3` `7267916` `8086dd0` · Pushed: yes · Live: previous app, `1.0.17-4`, group `4af48eff-36a4-4163-8e89-5ba9dc5a4255` · Channel: production
- **2026-10-06 and 2026-10-07 — the quiet Shabbat and Yom Tov block, the check-in after it, the four-nusach siddur audit and the folds**.
  - Requested: the user, 2026-10-05 to 2026-10-07. Verified: unknown.
  - Version: Build `1.0.16` (APK versionCode 15); the first update on runtime 1.0.16, group `19a1b5af`, then group `d494e8ff` for the audit (short ids as recorded; updates were not numbered yet) · Committed: yes, `93ceb0c` `8f89844` `955f6b8` `d5ad641` `089afce` `0ba952a` `f6d405f` · Pushed: yes · Live: previous app · Channel: production
- **2026-10-04 and 2026-10-05 — the nusach siddur reader opened from notifications, home and the mitzvah screen; the real timezone test matrix**.
  - Requested: the user, 2026-10-04. Verified: `test:tz` in four real zones.
  - Version: Build `1.0.14` (APK versionCode 7) · Committed: yes, `f5cd5bd` `3a905e5` `1b49e51` `c9af9b6` `0a5b920` · Pushed: yes · Live: previous app · Channel: production
- **2026-08-09 to 2026-09-02 — halachic times and notification delivery corrected, background tasks at the bundle entry, the DOX contract, the public site and privacy policy** ([AUDIT.md](AUDIT.md)).
  - Requested: the 2026-08-09 failure-point audit. Verified: [AUDIT.md](AUDIT.md).
  - Version: Builds `1.0.12` and `1.0.13`, ids unknown · Committed: yes, `07082ea` `2c13bb5` `c3870eb` `43f41dc` `d51943c` `41b4681` `a27d456` `ad84d2c` `c58aa48` `9c4821a` · Pushed: yes · Live: previous app, unknown · Channel: unknown
- **2026-04-23 to 2026-07-01 — first development**, the WIP commits from the first to the last of that range.
  - Requested: the user. Verified: unknown.
  - Version: unknown · Committed: yes, `71214a9` to `edf9211` · Pushed: yes · Live: unknown · Channel: unknown
