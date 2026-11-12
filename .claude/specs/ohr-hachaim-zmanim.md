# Spec: zmanim per the Ohr HaChaim luach (characterization and handover)

Status: characterized on 2026-11-02 in a cloud session (Claude Code on the web), on the owner's words of that day, in Hebrew: "יש באג בזמנים ההלכתיים. אני רוצה שכל הזמנים יהיו לפי זמני 'אור החיים'. בוא נאפיין ביחד מה צריך לעשות". On 2026-11-03 the owner asked for every finding to be written as a batch of tasks, with everything the cloud session could not do, so that a new session on their own computer takes it from here. Nothing under `src/` was changed. The tasks are in `not-close.md`, batch "Zmanim per the Ohr HaChaim luach, 2026-11-03"; the open decisions are Q17 to Q26 there, and R15 under For the rav. Section 11 is the handover: what the cloud session could not do and what the next session does first.

The luach: "לוח אור החיים" (also "לוח המאור"), the annual zmanim calendar of Yeshivat Ohr HaChaim in Jerusalem, edited by Rabbi Shlomo Benizri on the rulings of Rav Ovadia Yosef, the calendar Sephardic communities in Israel follow; its app is "לוח המאור" (`maor.orhachaim.org`).

## 1. The finding

The app does not have one wrong zman. It computes by a different method: depression angles (alot 16.1°, misheyakir 11.5°, tzeit 7.083°), the MGA day in fixed minutes, sunrise and sunset at sea level, and a Shabbat exit of tzeit plus a 10-minute margin. The Ohr HaChaim luach computes everything in seasonal minutes (דקות זמניות) of the GRA day (sunrise to sunset), from sunrise and sunset taken at the city's height, with fixed minutes only for the end of Shabbat, candle lighting and one stringent nightfall. So almost every zman moves, by 2 to 24 minutes, and in both directions.

What the owner sees as a bug is therefore the whole table of section 2 against section 3. The owner's own case (which zman, which date and city, what the luach showed) is still unknown: Q26.

## 2. What the app computes today

All in `src/services/ZmanimService.ts` (`getZmanim()`, `getCandleLighting()`, `getHavdalah()`, `candleLightingMinutes()`, `holyBlockExit()`), over `kosher-zmanim` 0.9.0's `ComplexZmanimCalendar`.

| Zman | Today | Where it is read |
| --- | --- | --- |
| Sunrise, sunset | `getSeaLevelSunrise()` / `getSeaLevelSunset()`; the city's `elevation` reaches the `GeoLocation` but no getter uses it (6 of 20 cities carry one) | every window; the Hebrew date turns at shkia (`hebrewDaysAt()` in `HebcalService.ts`); hilula and Rosh Chodesh notices anchor on shkia; taharah onot (`src/utils/taharah/onot.ts`) |
| Alot hashachar | `getAlosHashachar()`, 16.1°; `getAlos72()` or 72 fixed minutes where 16.1° has no solution | the app's day (`appDay()`, `dawnAt()`), birchot hashachar, Chok LeYisrael, every night window's end (`nextAlot()`), the check-in deadline |
| Misheyakir | `getMisheyakir11Point5Degrees()`, else 11°, else 52 fixed minutes before sunrise, clamped inside (alot, sunrise) | the tefillin window's start |
| Sof zman Shema | GRA: `getSofZmanShmaGRA()`; MGA: `getSofZmanShmaMGA()`, 72 **fixed** minutes each side | `ksSofZman` in `useUserStore.halachicOpinions` (`GRA` by default) picks one for the Shema window, the home strip (`dayArc.ts`) and the day model; the schedule's row (`ZMAN_KEYS` in `buildDayTimeline.ts`, label `zman.sofZmanShmaGra`) always shows GRA |
| Sof zman tefila | `getSofZmanTfilaGRA()` | shacharit's end, Selichot's end, the strip, the schedule |
| Chatzot, chatzot halayla | `getChatzos()`, `getSolarMidnight()` | birchot hashachar's end, Selichot's start, the strip |
| Mincha gedola | `getMinchaGedola()`, 6.5 seasonal hours | mincha's start |
| Mincha ketana | `getMinchaKetana()` | the type only; no window reads it |
| Plag hamincha | `getPlagHamincha()`, 10.75 seasonal hours from sunrise (1.25 before sunset) | the Chanukah candles on the erev of a holy block, the strip, the schedule |
| Tzeit hakochavim | `getTzaisGeonim7Point083Degrees()`, else 30 fixed minutes | maariv, the bedtime Shema, the Omer, the Chanukah candles, Ushpizin, Kiddush Levana, a tevila (`HebcalService.nightfall()`), the end of the doubtful span after shkia, the sky scene |
| Shabbat and Yom Tov exit | tzeit + `HOLY_BLOCK_EXIT_MIN` (10), the owner's call of 2026-10-10 (`holyBlockExit()`) | the block's end, havdalah, the pre-block notice's exit time, the check-in nudges, the Shabbat screen, every night window of a block's last day |
| Candle lighting | 40 minutes before sunset in Jerusalem (`cityId === 'jerusalem'`), 18 elsewhere in Israel, 20 abroad, or `location.candleLightingMinutes` | the block's start, the `candle_lighting` window, the pre-block notice |
| Rabbeinu Tam | not computed | — |

The app also states this method to the rav: section 1 of `docs/halacha-review.html` ("1. הזמנים שהכללים משתמשים בהם"), and `docs/taharah-review.html` names "7.083 מעלות" twice (the doubtful span and the tevila night).

## 3. The Ohr HaChaim luach's definitions

`H` is one seasonal hour of the GRA day: (sunset − sunrise) / 12, both at the city's height; "n zmaniyot minutes" is n × H / 60.

| Zman | The luach | Confidence | Evidence (section 12) |
| --- | --- | --- | --- |
| Sunrise, sunset | astronomical, at the city's height (elevation-adjusted). The printed sunrise is the *visible* one from the Bechoray Yosef (Chai Tables) horizon tables, which cannot be reproduced without those tables; the printed sunset is the height-adjusted one | high for the height; the visible sunrise is out of reach | KosherKotlin PR #27 ("Jerusalem 40 minutes counted from height rather than sea-level sunset"), Zayit PR #554 ("the zmaniyos day from the city's height"), Zemaneh Yosef ("elevation included"), the Moreshet Maran forum on Bechoray Yosef |
| Alot hashachar | sunrise − 72 zmaniyot minutes, in winter and in summer alike | high | Rabbi Amir Dadwand's note on daat.ac.il (criticizes the luach for exactly this), meshiv.co.il, the Rabbi Ovadiah Yosef Calendar README |
| Misheyakir (טלית ותפילין) | alot + 6 zmaniyot minutes, that is sunrise − 66 zmaniyot minutes | medium-high; KosherKotlin's set also carries a 60-minute variant (Q25) | the Rabbi Ovadiah Yosef Calendar README ("6 zmaniyot after dawn"), KosherKotlin v3.0.0 notes |
| Sof zman Shema MGA | 3 seasonal hours of the MGA day: from alot (72 zmaniyot before sunrise) to tzeit (72 zmaniyot after sunset) | medium-high | the same README; the luach prints MGA and GRA side by side |
| Sof zman Shema GRA, sof zman tefila GRA, chatzot, mincha ketana | as today (3, 4, 6, 9.5 seasonal hours) | high | the luach's zmanim are fractions of the GRA day (PR #27) |
| Mincha gedola | chatzot + the larger of 30 fixed minutes and 30 zmaniyot minutes | high | KosherKotlin PR #27, checked against the printed Bnei Brak page |
| Plag hamincha | 1.25 seasonal hours before tzeit (Yalkut Yosef), not before sunset (the Halacha Berurah's time, which the luach's set also carries) | medium (Q22) | the same README ("Yalkut Yosef writes to calculate it as 1 hour and 15 zmaniyot minutes before tzeit"), KosherKotlin v3.0.0 ("Plag HaMincha (Yalkut Yosef)"), the Zemaneh Yosef FAQ |
| Tzeit hakochavim | sunset + 13.5 zmaniyot minutes | high | the README, meshiv.co.il, KosherKotlin v3.0.0 |
| A stringent nightfall | sunset + 20 fixed minutes (`tzais20` in the luach's set); its printed use is unknown, probably the end of a fast (Chazon Ovadia: 20 minutes) | low on its use (Q26) | KosherKotlin PR #27, the README |
| Exit of Shabbat and Yom Tov | sunset + 30 fixed minutes in Israel, + 40 abroad | high; matched to the minute, section 4 | Zayit PR #554, KosherKotlin PR #27 |
| Rabbeinu Tam | sunset + 72 zmaniyot minutes (abroad: never more than 72 fixed minutes, per Zemaneh Yosef's note on Yalkut Yosef) | high in Israel, section 4; medium abroad | Yalkut Yosef 293 (itim-latora), the Zemaneh Yosef calendar notes |
| Candle lighting | a per-city table: Jerusalem 40, a city the table lacks 20 in Israel and 18 abroad; Haifa's 30 is the city's custom (Rabbi Yosef Mashash), whether the luach prints it is unknown | medium (Q20) | KosherKotlin PR #27's city table, the mako.co.il and Chabad pages on the customs |
| Chatzot halayla | not read; the luach prints one chatzot. Decision: keep `getSolarMidnight()` (it differs from chatzot + 12 hours by under a minute) | — | — |

## 4. What was verified in the cloud session

1. **A printed Shabbat of the luach, to the minute.** Zayit PR #554 quotes the luach's printed Tel Aviv times for Shabbat 2 to 3 October 2026: candles 18:05, Shabbat ends 18:55, Rabbeinu Tam 19:36. Computed with the definitions above (Tel Aviv, 5 m): sunset Friday 18:25 → candles (−20) **18:05**; sunset Saturday 18:24 → exit (+30) **18:54**, Rabbeinu Tam (72 zmaniyot) **19:35**. The one-minute differences are the luach's rounding. The app today gives that Saturday's exit as **19:03**, eight minutes after the luach.
2. **The calculator.** `pnpm install` could not run (section 11), so the numbers below come from `.claude/specs/ohr-hachaim-zmanim-compare.mjs`, a dependency-free NOAA solar calculator (the algorithm `kosher-zmanim`'s `NOAACalculator` implements). It reproduces the values the repo pinned with `kosher-zmanim` within a minute: Jerusalem 2026-01-16 shkia 16:59 (pinned 16:58:39), 2026-01-17 tzeit 17:31 (17:31:17), 2026-01-15 tzeit 17:30 (17:29:36). Run it with `node .claude/specs/ohr-hachaim-zmanim-compare.mjs`.
3. **Jerusalem, the app against the luach's definitions** (the luach column at the city's height, 754 m; minutes of difference as luach minus app):

| Zman | 2026-11-02 app → luach | 2026-12-21 | 2027-03-21 | 2027-06-21 |
| --- | --- | --- | --- | --- |
| Alot | 04:42 → 04:46 (+4) | 05:17 → 05:29 (+12) | 04:30 → 04:24 (−6) | 04:06 → 04:03 (−3) |
| Misheyakir | 05:04 → 04:51 (−13) | 05:40 → 05:34 (−6) | 04:52 → 04:31 (−21) | 04:34 → 04:10 (−24) |
| Sunrise | 05:56 → 05:52 (−4) | 06:35 → 06:30 (−5) | 05:42 → 05:38 (−4) | 05:34 → 05:29 (−5) |
| Shema MGA | 08:03 → 08:04 (+1) | 08:30 → 08:33 (+3) | 08:08 → 08:06 (−3) | 08:31 → 08:22 (−9) |
| Shema GRA | 08:39 → 08:37 (−2) | 09:06 → 09:04 (−2) | 08:44 → 08:42 (−2) | 09:07 → 09:05 (−2) |
| Mincha gedola | 11:50 → 11:52 (+2) | 12:02 → 12:07 (+5) | 12:17 → 12:17 (0) | 13:16 → 13:17 (+1) |
| Plag | 15:41 → 15:57 (+16) | 15:36 → 15:52 (+16) | 16:35 → 16:52 (+17) | 18:19 → 18:39 (+20) |
| Sunset | 16:49 → 16:53 (+4) | 16:39 → 16:44 (+5) | 17:51 → 17:55 (+4) | 19:48 → 19:52 (+4) |
| Tzeit | 17:19 → 17:06 (−13) | 17:12 → 16:56 (−16) | 18:20 → 18:09 (−11) | 20:22 → 20:09 (−13) |
| Shabbat exit | 17:29 → 17:23 (−6) | 17:22 → 17:14 (−8) | 18:30 → 18:25 (−5) | 20:32 → 20:22 (−10) |
| Rabbeinu Tam | — → 17:59 | — → 17:45 | — → 19:09 | — → 21:19 |

So every window that opens at tzeit (maariv, the bedtime Shema, the Omer, the Chanukah candles, Ushpizin, Kiddush Levana, a tevila) opens 11 to 16 minutes late against the luach, tefillin opens 6 to 24 minutes late, the Shabbat exit is 5 to 10 minutes late, and plag is 16 to 20 minutes early.

4. **Third-party sites are not the luach.** The "לפי שיטת אור החיים" page of calendar.2net.co.il (Jerusalem, 2026-10-30: alot 04:42, tallit 04:48, tzeit 17:09, Rabbeinu Tam 18:03) is 72, 66, 18 and 72 **fixed** minutes from sea-level sunrise and sunset, not the luach's seasonal minutes. Calibrate only against the printed luach or its app (Q26).

## 5. Target design

### 5.1 Rules

```text
sunrise, sunset  = elevation-adjusted (kosher-zmanim getSunrise()/getSunset() with the GeoLocation's
                   elevation; or setUseElevation(true) if the installed version has it: check the d.ts)
H                = (sunset − sunrise) / 12                        // getShaahZmanisGra()
z(n)             = n × H / 60                                     // n seasonal minutes
alot             = sunrise − z(72)                                // getAlos72Zmanis()
misheyakir       = sunrise − z(66)                                // computed; Q25
shemaMGA         = alot + 3 × ((sunset + z(72)) − alot) / 12      // getSofZmanShmaMGA72MinutesZmanis()
shemaGRA         = sunrise + 3H;  tefilaGRA = sunrise + 4H;  chatzot = sunrise + 6H
minchaGedola     = chatzot + max(30 min, H / 2)                   // getMinchaGedolaGreaterThan30()
minchaKetana     = sunrise + 9.5H
tzeit            = sunset + z(13.5)                               // computed
plag             = tzeit − 1.25H                                  // Q22; computed
tzeitShabbat     = sunset + 30 min (inIsrael) | + 40 min (abroad) // new field; Q19 on the margin
rabbeinuTam      = sunset + z(72)                                 // only if shown; Q24
chatzotLayla     = getSolarMidnight()                             // unchanged
candles          = sunset − minutes(city)                         // Q20
```

Which getters the installed `kosher-zmanim` 0.9.0 actually exports is to be read from its `.d.ts` once `node_modules` exists; every zman above is also a one-line `getTimeOffset()` from sunrise or sunset, so a missing getter costs nothing. The fixed-minute fallbacks of today (`ALOT_FALLBACK_MIN`, `MISHEYAKIR_FALLBACK_MIN`, `TZEIT_FALLBACK_MIN`, the misheyakir clamp) go: seasonal minutes exist on every day the sun rises and sets, and `null` stays the answer where it does not.

### 5.2 Shape

- `Zmanim` (`src/types/zmanim.ts`) gains `tzeitShabbat: Date` (the exit basis). `tzeitHakochavim` stays the weekday nightfall. `holyBlockExit()` returns `tzeitShabbat` plus whatever margin Q19 leaves (`HOLY_BLOCK_EXIT_MIN` becomes that margin, 0 if the owner drops it), and `getHavdalah()`, `HebcalService.nightfall()` (a block's last day) and `holyBlockAround()` keep reading it, so the Shabbat screen, the pre-block notice, the check-in nudges and every night window of a block's last day follow without change.
- `hebrewDaysAt()` keeps shkia → tzeit (13.5 zmaniyot) as the doubtful span: shorter than today, which only narrows when a text or a mark is doubtful.
- `candleLightingMinutes()` reads the city table of Q20; `location.candleLightingMinutes` stays the per-city override and is the natural home of Haifa's 30 and any other printed value.
- `CITIES` (`src/data/cities.ts`): `elevation` on every entry (14 of 20 lack one), from the luach's own heights where it prints them, else a geographic source, each noted in a comment; `refreshSavedLocation()` already carries a corrected value to every install, and `resolvedLocation()` already copies a city's elevation to a fix within 25 km; a far fix keeps 0 (Q17). The zmanim cache key already includes the elevation.
- No new setting and no method switch (Q23): the luach for every user, every nusach, in Israel and abroad. The `ksSofZman` setting stays; its default is Q21.
- Chok LeYisrael, the custom mitzvot, the quiet hours, the nags, the planners and the ids are untouched: they read `Zmanim` fields and dates, not the method.

### 5.3 What changes for the user

Every zman on the home strip, the schedule and the day view; every window's edges (the planners reschedule by themselves: a moved trigger changes `data.contentHash`, which `os.sync()` catches on the next foreground; no `SCHEDULE_FORMAT` raise); the Shabbat exit (earlier), candle lighting outside Jerusalem (2 minutes earlier in Israel, 2 later abroad); the taharah onot (the doubtful span) and the tevila's nightfall; the sky scene's night.

## 6. Files and surfaces

- `src/services/ZmanimService.ts`, `src/types/zmanim.ts`, `src/services/HebcalService.ts` (exit, nightfall, blocks), `src/data/cities.ts` (elevation, candle minutes), `src/data/mitzvot.ts` (plag read as is; the Sunday Tisha B'Av havdalah's start, Q26).
- `src/utils/dayArc.ts` and `src/utils/buildDayTimeline.ts` (the strip and the schedule rows; `sofShma` per the setting, Q21; Rabbeinu Tam only on Q24), `src/theme/sky.ts`.
- `src/utils/taharah/onot.ts`, `src/utils/taharah/tasks.ts` (read `tzeitHakochavim`; unchanged unless the rav page's wording changes).
- `src/i18n/he.json` and `en.json`: a label only if a row is added (Rabbeinu Tam) or the method is named in Settings or the guide.
- The documents of section 8.

## 7. Tests

- New: `src/services/__tests__/ZmanimService.ohrHachaim.test.ts`, the calibration suite: the luach's printed values (Q26: Jerusalem and one more city, a winter and a summer date; already in hand: Tel Aviv 2026-10-02/03, candles 18:05, exit 18:55, Rabbeinu Tam 19:36), each within one minute. Under `pnpm test:tz`.
- Suites that pin minute values of the old method and must be re-pinned (found by `grep -rln "7.083\|7Point083\|getAlosHashachar\|16.1\|11.5\|Geonim\|MGA\|zmanis" src`): `src/services/__tests__/ZmanimService.test.ts` (its "Jerusalem 2026-04-23 matches published zmanim" case: misheyakir 05:08, sunrise 06:01, shkia 19:13, Shema GRA 09:19, from an unnamed source; re-pin to the luach), `ZmanimService.extra.test.ts`, `HebcalService.test.ts`, `reminderLogic.test.ts`, `NotificationScheduler.nextReminder.test.ts`, `src/services/notifications/__tests__/notices.test.ts`, `src/data/__tests__/mitzvot.windows.test.ts`, `mitzvotExtras.test.ts`, `chokMitzvah.test.ts`, `src/utils/__tests__/buildDayTimeline.test.ts`, `checkIn.test.ts`, `chok.test.ts`, `chokText.test.ts`, `clock.test.ts`, `customMitzvah.test.ts`, `historyStats.test.ts`, `homeDay.test.ts`, `taharah.tasks.test.ts`, `weeklyReport.test.ts`, `src/app/__tests__/customMitzvah.render.test.tsx`, `day.render.test.tsx`, `mitzvah.render.test.tsx`, `more.render.test.tsx`, `siddur.catalog.render.test.tsx`, `siddur.now.render.test.tsx`, `siddurLinkedText.render.test.tsx`, `src/components/__tests__/DayLooks.render.test.tsx`, `ReminderEditor.render.test.tsx`. Other suites assert order and spans, not minutes, and should hold; `pnpm test:tz` decides.
- `src/data/__tests__/cities.test.ts` pins an elevation on every city.

## 8. Documents and records

- `docs/halacha-review.html`: section 1 rewritten to section 3 of this spec, a new item R15 (the luach as the method for every user), `RULES_VERSION` raised by one (4, section 13).
- `docs/taharah-review.html`: the two "7.083 מעלות" lines (the doubtful span, the tevila night) say "13.5 דקות זמניות אחרי השקיעה"; `TAHARAH_RULES_VERSION` stays unless a preset value changes.
- Root `AGENTS.md` (Zmanim and Calendar: the getters, `holyBlockExit`, candle minutes), `src/services/AGENTS.md` (ZmanimService's ownership line, the fallbacks paragraph), `src/data/AGENTS.md` (cities' elevation, candle minutes).
- `src/data/guide.ts`: the home topic names the luach ("לפי לוח אור החיים"), a `WHATS_NEW` entry under the next production label (`1.0.21-11` after `1.0.21-10`, per `release/RELEASE_LOG.md`); `pnpm guide:build`.
- `docs/index.html` FAQ ("הזמנים לא נכונים") names the luach; the store copy ("זמני הלכה מדויקים") may add it, the owner's call.
- `not-close.md`: the batch and Q17 to Q26, R15; `state.md`: the next step; the bug entry.

## 9. Release

Pure JavaScript: `pnpm update:preview`, a phone check of the preview app against the luach (the strip, a Shabbat's candles and exit, a mitzvah screen's next reminder), then `pnpm update:production` with the `WHATS_NEW` entry. No native change, no `SCHEDULE_FORMAT` raise, no store step.

## 10. Open questions (the owner) and R15 (the rav)

Q17 to Q26 in `not-close.md`, For the owner, each with the assumption the code takes until answered:

- Q17 sunrise and sunset at the city's height, and a far GPS fix at 0.
- Q18 the visible sunrise of the luach is out of reach; the astronomical sunrise at the city's height stands in (a few minutes before the printed one in Jerusalem).
- Q19 the exit at the luach's 30 / 40 minutes; keep or drop the 10-minute margin of 2026-10-10.
- Q20 candle lighting minutes per city as the luach prints them.
- Q21 the Shema time's default (GRA today) and whether the schedule shows both like the luach.
- Q22 plag per Yalkut Yosef (before tzeit).
- Q23 scope: every user, every nusach, abroad too, no method setting.
- Q24 Rabbeinu Tam shown or not.
- Q25 misheyakir at 66 zmaniyot (alot + 6) or the 60 variant.
- Q26 the calibration material: the luach's printed pages or its app's values, the owner's bug case, the use of the 20 fixed minutes, the fast's end.
- R15 the luach as the method for every user (the rav).

## 11. Handover: what the cloud session could not do

1. **No dependencies, no checks run.** The cloud environment resolves no address for `registry.npmjs.org` (`ENOTFOUND` on every tarball, 2026-11-02), so `pnpm install --frozen-lockfile` failed and `node_modules` does not exist there: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:tz` and `kosher-zmanim` itself never ran. Every number in this spec comes from the NOAA script of section 4; the first thing the local session does is `pnpm install`, then run the script's dates through `ZmanimService` and compare.
2. **The luach was never read first-hand.** `WebFetch` failed with `ENOTFOUND` for `github.com` (the KosherKotlin PR #27 diff and its `OhrHaChaimTest.kt`, the Zayit PR #554 tests, the Rabbi Ovadiah Yosef Calendar README), `maor.orhachaim.org`, `calendar.2net.co.il`, `skyview2020.co.il` and `blog.calj.net`; only web search snippets reached the session. Section 3 rests on those snippets plus the one printed Shabbat of section 4. The local session reads the PR #27 diff and tests (they encode every zman of the luach and were checked against printed Bnei Brak and Jerusalem pages) and the README, and above all the luach itself, before pinning the calibration suite.
3. **The `kosher-zmanim` getters are unconfirmed.** Section 5.1 names the KosherJava methods from memory; the installed `ComplexZmanimCalendar.d.ts` decides which exist (`getAlos72Zmanis`, `getSofZmanShmaMGA72MinutesZmanis`, `getMinchaGedolaGreaterThan30`, `getTzais72Zmanis`, `setUseElevation`); the rest are `getTimeOffset()` one-liners.
4. **No device.** Nothing was seen on a phone or the emulator.
5. **The owner's case is unknown.** Which zman, date and city the owner compared, and the luach's value, were not asked before the handover: Q26.
6. **Elevation values** for the 14 cities without one were not looked up (no network to a geographic source); the luach prints a height per city, which is the better source anyway.

## 12. Sources

Read as search snippets in the cloud session (the pages themselves were unreachable there):

- KosherKotlin PR #27, "add the zmanim of the אור החיים luach": https://github.com/kdroidFilter/KosherKotlin/pull/27
- KosherKotlin v3.0.0 release notes: https://github.com/kdroidFilter/KosherKotlin/releases/tag/v3.0.0
- Zayit PR #554, "move to KosherKotlin 3.0 and read the real luachs" (the printed Tel Aviv Shabbat): https://github.com/kdroidFilter/Zayit/pull/554
- The Rabbi Ovadiah Yosef Calendar apps (the Ohr HaChaim calendar's calculations): https://github.com/Elyahu41/RabbiOvadiahYosefZmanimApps
- Zemaneh Yosef FAQ and calendar notes: https://royzmanim.com/FAQ
- משיב כהלכה, חישוב צאת הכוכבים: https://meshiv.co.il/shelot_vetshuvot/חישוב-זמן-צאת-הכוכבים-באירופה/
- הרב איתן צקוני / הרב אמיר דאדוואנד on daat.ac.il, זמני היום: https://www.daat.ac.il/daat/kitveyet/shana/tsikoni-1.htm
- קיצוש"ע ילקוט יוסף סימן רצג (Rabbeinu Tam in seasonal minutes): https://itim-latora.org/כתבים/קיצור-שולחן-ערוך-ילקוט-יוסף/?page=290
- פורום מורשת מרן, הקדמת לוח אור החיים and the Bechoray Yosef sunrise: https://forum.moreshet-maran.com/threads/לוח-אור-החיים-הקדמה.3088/
- לוח המאור של ישיבת אור החיים: https://maor.orhachaim.org/
- Candle lighting customs by city (mako.co.il, Chabad Jerusalem): https://www.mako.co.il/spirituality-popular_culture/Article-494842ff06e9431006.htm

## 13. Built on 2026-11-03 (local session)

What the local session found, decided and built; it supersedes the assumptions of sections 3, 5 and 10 where they differ.

- **A printed page of the luach.** Page 27 of the 5781 luach (Sunday 2020-09-27 to Shabbat 2020-10-03, Jerusalem, Tel Aviv, Haifa, Be'er Sheva), published in the Rabbi Ovadiah Yosef Calendar README (`https://i.imgur.com/QqGAtTB.jpg`), transcribed in full into `src/services/__tests__/ZmanimService.ohrHachaim.test.ts`. It settles: plag per Yalkut Yosef (the sunset-based plag misses by 14 minutes), misheyakir 66 seasonal minutes (60 misses by 5 to 7), chatzot the solar transit, candle lighting 20 minutes in every city, Haifa included (Jerusalem prints 20 with "לנוהגים 40" beside it), the exit 30 minutes after sunset for Shabbat, Yom Tov and Yom Kippur.
- **An independent implementation (not the publisher’s official code).** `royzmanim.com` (Zemaneh-Yosef/royzmanimwebsite, `assets/js/ROYZmanim.js` in `fixedMil` mode, approved by Rav Yitzhak Yosef) and KosherKotlin PR #27 (merged; verified against ROYZmanim.js to the second): the definitions of section 3 hold; netz falls back to the sea-level sunrise where the visible one is unknown; a fast ends 20 fixed minutes after sunset (the luach's introduction); that project rounds each zman on its stringent side (`_data/zmanim.yml`: alot, the Shema and tefila times, sunset and candles earlier; misheyakir, mincha, plag, tzeit, the exit later). Chatzot on the page matches the nearest minute.
- **Heights.** With the cities' real heights every printed value lands on its minute or one minute off; no single correction to the sun model fits all four cities, so each printed city carries an effective height fitted to the page (Jerusalem 1150, Tel Aviv 75, Haifa 390, Be'er Sheva 300), which puts Jerusalem at 56 of 58 values exact. The other cities take SRTM 30 m heights (Safed keeps its 900). The fit rests on one autumn week: the owner sends a winter and a summer week after the fix, and the heights are re-fitted against them if needed.
- **Owner's answers (2026-11-03, "כמו בלוח" to both):** the exit exactly as the luach, the 10-minute margin of 2026-10-10 dropped (Q19); candle lighting 20 minutes in Jerusalem too (Q20). Q23 was the original request. Settled by the evidence above: Q17, Q18 (sea-level netz, as before), Q22, Q25, Q26's fast end. Q21: the GRA default and the setting stay, and the schedule shows both Shema rows as the luach does. Q24 (Rabbeinu Tam) stays open; nothing shows it. Family purity's doubtful span after shkia follows the luach's tzeit as well, about half the old one (the owner, 2026-11-03: "לפי הלוח"); the taharah page carries it to the rav (its rules version 2). Release: a preview update first, checked on the owner's phone, then production (the owner, 2026-11-03).
- **Built:** `ZmanimService.getZmanim()` per section 5.1 with the rounding above; `Zmanim.tzeitShabbat` (the exit) and `Zmanim.tzeitTaanit` (a fast's end, which opens the Sunday Tisha B'Av havdalah); `HOLY_BLOCK_EXIT_MIN` removed; `candleLightingMinutes()` 20 or the location's own; every city's `elevation`; `sofZmanShmaMA` in `ZMAN_KEYS`; the rav page's section 1, R15 and `RULES_VERSION` 4; the taharah page's two lines; the guide; the support page's FAQ.


## 14. Independent winter/summer verification, 2026-11-04

The owner supplied the two printed weeks and explicitly reported discrepancies on **preview**, not production. The [full evidence and results](ohr-hachaim-5787/README.md) supersede section 13's claims of exact printed-minute matching and its treatment of another project's rounding as publisher behavior. [Printed fixtures](ohr-hachaim-5787/printed.json), the original photographs and a [reproducible checker](ohr-hachaim-5787/check.cjs) cover 492 app values plus eight separate Rabbeinu Tam formula checks. 63 app values differ by more than one minute: 41 visible sunrises and 22 other Jerusalem values, including summer plag by three minutes. All non-sunrise values in the other three cities are within one minute.

The original older introduction scans were read directly; the publisher's exact 5787 reference inputs remain unknown. Sea-level sunrise is a fallback of Zemaneh Yosef, not the luach's Bikurei Yosef sunrise. A finite height-only search improves some Jerusalem values but cannot satisfy all new-page weekly and daily comparisons at once; no experimental height was applied. Four device zones produce identical printed comparisons; 276 integration tests per zone pass, along with typecheck and lint. Existing autumn-only tests passing does not settle winter/summer accuracy.

The next change needs authoritative city/horizon and rounding inputs, and the visible-sunrise data source, before publishing a claim of exact matching. **2026-11-12:** the owner set the bar at one minute, and the correction was built without the publisher: the visible sunrise from the public terrain over a fitted observer point per city, and Jerusalem's sunset at its own height; all 492 comparisons are within a minute and `--strict` passes ([the report](ohr-hachaim-5787/README.md), Horizon reconstruction). It is a fit, not an exact match, and the winter solstice is not yet covered by a printed page. See [not-close.md](../../not-close.md), Independent 5787 calibration, for the unresolved work. No runtime change or release was made in this verification.
