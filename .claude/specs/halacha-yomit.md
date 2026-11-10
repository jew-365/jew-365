# Spec: daily halacha and the halachot before a festival

Status: characterized with the owner on 2026-11-10 in a cloud session (three rounds of answers, quoted below). Planning only: the owner's word of 2026-11-10, "כרגע אל תבצע את התוכנית רק תבנה אותה מקצה לקצה". Nothing is built. The tasks are the batch "Daily halacha and festival halachot, 2026-11-10" in [not-close.md](../../not-close.md); this file is the contract, that file the queue.

## 1. The request

The owner, 2026-11-10: "אני רוצה להוסיף עוד שני מצוות שקשורות להלכות: 1 הלכות יומיות לפי מה שנהוג (תעשה מחקר) 2 הלכות של 30 יום לפני החג לפי מה שנהוג".

Two learning mitzvot, both off by default, both reading a downloadable add-on, built on the pattern of Chok LeYisrael and Shnayim Mikra:

- `halacha_yomit`: a daily halacha portion, from the book that fits the user's nusach.
- `hilchot_hachag`: the halachot of the coming festival, in the days before it, from the same book.

## 2. Research

### 2.1 Daily halacha orders in use

| Order | Portion | Cycle | Text |
|---|---|---|---|
| Kitzur Shulchan Aruch Yomi | a few se'ifim | one year | public domain |
| Halacha Yomit (the 5714 enterprise) | 3 se'ifim of Shulchan Aruch Orach Chaim | about 4.5 years | public domain |
| Daf HaYomi B'Halacha (Dirshu) | Mishnah Berurah | about 7 years (from memory, not verified) | public domain |
| Rambam Yomi (the Lubavitcher Rebbe's takana) | 3 chapters, 1 chapter, or Sefer HaMitzvot | 1 or 3 years | public domain |
| Ben Ish Chai | the halachot of the week's parasha | 2 years | public domain |
| Yalkut Yosef, Rav Ovadia's Halacha Yomit, Peninei Halakha, Shulchan Aruch HaMekutzar (Rav Ratzabi) | — | — | in copyright; written permission needed |

No single enterprise offers one official order per eda. Each eda has its accepted book, so the app maps a book to each nusach (section 3).

Sources read on 2026-11-10: the Yeshiva.org.il wiki pages "הלכה יומית" and "שלושים יום קודם החג שואלים ודורשים בהלכות החג", HaMichlol "הדף היומי בהלכה", "קביעותא" and "בן איש חי (ספר)", and the Sefaria API (2.3).

### 2.2 Thirty days before a festival

- Source: "שואלין ודורשין בהלכות הפסח קודם הפסח שלושים יום" (Pesachim 6a; Shulchan Aruch OC 429:1).
- Pesach: agreed by all, from Purim.
- Shavuot and Sukkot: disputed. The Bach extends the thirty days to them (from 5 Iyar and 14 Elul); the Beit Yosef holds that close to and on the festival is enough.
- Chanukah and Purim: no thirty days (Tzitz Eliezer 17:1 as cited on the wiki), but their laws are taught on the days themselves.
- "הלכות חג בחג" (learning on the festival itself) cannot be served: the app is closed on Yom Tov.

### 2.3 What Sefaria holds (read from its API, 2026-11-10)

| Book | Hebrew version to pin | Licence | English versions with a usable licence |
|---|---|---|---|
| Kitzur Shulchan Arukh (221 simanim, 2765 se'ifim) | Torat Emet 357 | Public Domain | Metsudah 1996, trans. Avrohom Davis (CC-BY); Sefaria Community Translation (CC0) |
| Ben Ish Hai (Halachot 1st Year: 52 nodes; 2nd Year: 47 nodes) | Ben Ish Hai -- Wikisource, or Jerusalem 1898 | Public Domain | Sefaria Community Translation (CC0); Wikisource (CC-BY-SA) |
| Mishneh Torah | Torat Emet 363 | Public Domain | Sefaria Edition, trans. Francis Nataf 2019 (CC-BY); Community (CC0); Touger, Moznaim (CC-BY-NC) |

- English coverage, measured by the build on 2026-11-10 (the share of Hebrew segments the best accepted version translates, per book for the Rambam): Kitzur Shulchan Aruch 99.0% (Metsudah, trans. Avrohom Davis, CC-BY; the CC0 community translation covers less); Ben Ish Chai 3.8% (CC0 community); Mishneh Torah 27.5% (CC0 community and the public-domain Hyamson and Glazer, per book). Only the Kitzur ships English (5.4).
- Sefaria's calendar API (`/api/calendars`) gives "Daily Rambam" (one chapter): on 2026-11-10 it read "Forbidden Intercourse 22". It gives no Kitzur Shulchan Aruch Yomi and no Ben Ish Chai schedule.

## 3. Tracks

The owner approved the table on 2026-11-10 ("מאשר את הטבלה ואני רוצה שינתן למשתמש אפשרות להחליף, לחב"ד רמב"ם יומי"); Rambam is one chapter a day (the owner's pick, the same day).

| Track id | Book | Default for nusach | Schedule |
|---|---|---|---|
| `kitzur` | Kitzur Shulchan Aruch | `ashkenaz`, `sefard` | the yearly luach in use, by Hebrew date (6.1) |
| `ben_ish_chai` | Ben Ish Chai, halachot only | `edot_hamizrach` | the week's parasha, divided over the week's days (6.2) |
| `rambam` | Mishneh Torah | `chabad`, `teiman` | one chapter a day, the public cycle (6.3) |

- `defaultHalachaTrack(nusach)` is the one place the mapping lives, a `Record<Nusach, HalachaTrack>`, so a new nusach fails `pnpm typecheck` until it has a track.
- `useUserStore.halachaTrack` is `HalachaTrack | null`; `null` means the nusach's default, so a later change of nusach moves a user who never chose. Settings → Prayer offers the three tracks through `OptionSelect`. One choice serves both mitzvot.
- The mapping of a book to a nusach is a halachic decision and goes to the rav (R17.1).

## 4. Decisions

The owner's, 2026-11-10:

| # | Decision | The owner's answer |
|---|---|---|
| D1 | The schedule is fixed by the date: everyone learns the same portion on the same day, and a user who switches the mitzvah on mid-cycle joins today's portion. | "לוח קבוע לפי התאריך" |
| D2 | Shabbat and Yom Tov: the portion can be made up the next day, or marked as learned. | "אפשרות להשלמה מחר או סימון כבוצע" |
| D3 | Festivals: Pesach, Shavuot, Sukkot; Rosh Hashanah and Yom Kippur; Chanukah and Purim; Tisha B'Av and the fasts. | all four options chosen |
| D4 | The two mitzvot run side by side; each has its own switch. | "שתיהן במקביל" |
| D5 | English: a translation only where one exists under a licence the app may use; otherwise the Hebrew text. | "תרגום אם יש חופשי" |
| D6 | One release: both mitzvot with all three tracks. | "הכול יחד" |
| D7 | The rav answers before production: preview first, then the review page, then production. | "לפני production" |

Claude's, cheap to reverse, the owner may overrule:

- **D8, where they show:** like Chok LeYisrael: the library, the mitzvah screen, the More tab and the siddur tab's learning group. Q10 of the first round was not asked again.
- **D9, a window on every day:** unlike Chok LeYisrael, neither mitzvah has `skipOn`. A fixed public schedule has a portion on Shabbat too, and the app already treats Shabbat as an ordinary day for history: no notification fires inside a holy block, the block's check-in asks about the portion, and the reader offers a make-up fold afterwards. This is D2 with no new mechanism.
- **D10, one add-on, a file set per track:** the user downloads only the chosen track (and its English, when the app is in English and the track has one). Switching track offers that track's download; a mitzvah's window is `null` until its track is installed.
- **D11, periods** (section 7.1): thirty days for the three regalim; Rosh Hashanah from Rosh Chodesh Elul; Yom Kippur in the Ten Days; Chanukah and Purim fourteen days; Tisha B'Av from 17 Tammuz; each minor fast three days. To the rav as R17.4.
- **D12, overlapping periods:** a day inside two periods (Elul: Rosh Hashanah and Sukkot; before Purim: Purim, then Pesach starts on Purim itself) carries both portions in one reading, the nearer festival first.
- **D13, a period ends on the erev:** the last portion is the day before the festival (or the fast). Chanukah's and Purim's laws "on the day" are not added (R17.5).
- **D14, default reminders:** `halacha_yomit` a `clock` reminder at 08:00, `hilchot_hachag` at 19:00, apart from Chok LeYisrael's 09:00 and Shnayim Mikra's 20:00. `PERFORM_MIN` 10 for each; the smart nag's zone as Chok LeYisrael's (shkia to chatzot).
- **D15, icon:** both reuse the `chok` book icon, as Shnayim Mikra does. A drawing of their own would be a design-lab study.
- **D16, registry place:** both sit in `MITZVOT` right before `shnayim_mikra`, `group: 'other'`, `category: 'learning'`, `nuschaotSupported: ALL_NUSCHAOT`.

## 5. Content: the add-on

### 5.1 Build

`pnpm halacha:build` runs `scripts/halacha/build.js`, on the pattern of [scripts/shnayim/build.js](../../scripts/shnayim/build.js): it fetches the pinned Sefaria versions of 2.3, cleans them, and writes [docs/](../../docs)`halacha/`. A push to `main` publishes it on GitHub Pages. No file there is ever hand-edited.

### 5.2 Layout

As built on 2026-11-10 (a deviation from the single manifest first planned: each track is its own add-on on the shared core, which takes one manifest of `format`, `version`, `gzipBytes` and `gz`):

```
docs/halacha/<track>/manifest.json
docs/halacha/<track>/<unit>.<sha8>.json.gz        Hebrew
docs/halacha/<track>/en/manifest.json             English, only for a track that has it
docs/halacha/<track>/en/<unit>.<sha8>.json.gz
```

- A unit is a file a portion reads from: a block of ten simanim for `kitzur` (`simanim-101-110`), one book of the Mishneh Torah for `rambam` (88, the introduction's four included), one parasha of one year for `ben_ish_chai` (`y1-tzav`). A portion may span two units; it is written as its `pieces`, `{ u, from, to }` (inclusive indexes into the unit's segments), with a `label` (`{ he, en }`) the planner can show without opening a file.
- A track's `manifest.json`: `format` (1), `version`, `track`, `book`, `credit` (`{ he, en }`, the version titles and licences of 2.3 and the schedule's source), `credits`, `gzipBytes`, `gz`, `units` (unit → its Hebrew and English title and segment `count`), `schedule` (6), `festivals` (7.2) and `english` (the measured share and whether the track ships it). The English manifest has `format`, `version`, `track`, `credit`, `credits`, `gzipBytes` and `gz`; each English unit file holds `en`, a string or `null` per Hebrew segment, in order.
- A unit file: `{ track, unit, title, credits, sections }`, each section a `ref`, a `title` (`{ he, en }`) and its segments. A segment is one se'if (Kitzur), one halacha (Ben Ish Chai, Rambam), with a stable `key` (`kitzur:<siman>:<se'if>`, `rambam:<book>:<chapter>:<halacha>`, `ben_ish_chai:<year>:<node>:<n>`) and its Hebrew runs, its number first as a note run.
### 5.3 Credits and licences

Every credit line is shown wherever the text is shown, through the existing `ChokLicenseNotice` pattern. CC-BY versions name the translator and publisher; a CC-BY-SA or CC-BY-NC version is used only if the build's licence check accepts it and the notice states it. Preference order for English: CC0, then CC-BY, then nothing.

### 5.4 Build checks

`scripts/halacha/__tests__/build.test.js` fails on: a se'if or halacha missing or twice, a unit whose hash does not match its manifest entry, a schedule day that points outside the text, a festival unit with no segments, and an English version that covers less than the threshold of its track (the threshold is 90% of a track's segments, `ENGLISH_THRESHOLD` in `scripts/halacha/tracks.js`; below it the track ships Hebrew only and the test pins which tracks ship English: the Kitzur alone). As built, the test checks instead that the Rambam cycle reads the text in book order and each halacha at most once, and pins the twelve halachot the calendar leaves out (Wikisource's Negative Mitzvot 366-370 and the Order of Prayer's fifth chapter); a Mishneh Torah address every Hebrew version leaves empty is listed in `RAMBAM_EMPTY` (Torah Study 7:8), and any other empty halacha fails the build.

## 6. Schedules

A schedule answers one question: which segments are the portion of a location day. It is data in the manifest, read by one pure function, `halachaPortion(day, track, inIsrael)` in `src/utils/halacha.ts`, which returns `{ label: { he, en }, unit, from, to } | null`. The day is the location date the window was computed for.

### 6.1 `kitzur`

- The yearly luach in use, keyed by Hebrew month and day, with its own rule for a leap year and for the short and long Cheshvan and Kislev.
- **Source (established 2026-11-10):** the Kitzur Shulchan Aruch Yomi luach of `@hebcal/learning` 6.13.1 (`kitzurShulchanAruch`, BSD-2-Clause, `dist/esm/kitzurSa.json.js`), transcribed to [scripts/halacha/schedules/kitzur.json](../../scripts/halacha/schedules/kitzur.json) with Hebcal's licence. Its notes name the Hebrew Blum edition and an Adar II track suggested by Rav Chaim Kanievsky; Hebcal names no printed luach, so the publisher behind it stays unknown. Q29 is therefore not asked.
- **Corrections:** checked against Sefaria's text (221 simanim, 2765 se'ifim), the published table reads 133:16, 98:23-32, 100:4 and siman 106 on no day and 6:4-11, 28:10, 32:16-18, 80:17 and siman 104 on two; 16 entries are typos ("1234:3", "80:267", "11:1"). Each entry used is listed with the published value and the reason under `corrections` in the schedule file; with them every se'if is read exactly once in a year, which the build test checks.
- **Rules the app applies** (the file's `rules`): a common year reads month by month. A leap year reads in Adar I the luach's review of the laws of blessings and prayer (Hebcal's Adar II option B, its typos corrected) and nothing on 30 Adar I, and in Adar II the luach's Adar, so Purim's and Pesach's simanim stay before their festivals. Hebcal reads Adar in Adar I and the option in Adar II, and the luach's own note suggests starting the option on 23 Adar I; the app's choice goes to the rav as R17.8. Option A (the laws that depend on the Land, from the back of the Blum edition) is not in Sefaria's text and is not used. A short Kislev reads days 29 and 30 together on the 29th; a long Cheshvan reads nothing on the 30th; 15 Elul (the luach's "Klalim", which Sefaria's text does not hold) reads nothing. A day that reads nothing has no window.

### 6.2 `ben_ish_chai`

- The parasha is the one the week reads, by the rule Chok LeYisrael already uses (`chokPortionOn()` in [src/utils/chok.ts](../../src/utils/chok.ts): a double week, Israel and abroad, and a week whose Shabbat is Yom Tov).
- The parasha's numbered halachot are divided evenly over the week's seven days, Sunday to Shabbat, in order; a double week divides both parashiyot's halachot together.
- **Q30, the owner's call of 2026-11-10** ("אופציה א וגם אפשרות לשנות בהגדרות"): the two years alternate by the Hebrew year of the week's Shabbat, an odd year reading the first year (5787 the first); Settings lets the user swap them (`useUserStore.benIshChaiYearSwapped`). A week whose parasha the second year lacks reads the first year's.
- The drashot are not included.
- **As built (2026-11-10):** the text is Sefaria's "Ben Ish Hai -- Wikisource" (labelled Public Domain): its "Ben Ish Chai, Jerusalem, 1898" version has the node shape but empty halachot. 98 units, 2001 halachot. The manifest maps each of the 54 parashiyot to its unit per year: the first year has all 54 (its Tazria-Metzora, Achrei Mot-Kedoshim and Behar-Bechukotai are one node each, serving both parashiyot), the second has none for Bamidbar, Devarim, Nitzavim, Vayeilech, Ha'azinu and Vezot Haberakhah. The second year's Vayeshev is only the author's note "בפרשה זו לא כתבתי הלכות בשנה שניה יען כי לדרוש בפרשה זו בהלכות חנוכה בכל שנה ושנה", so that week reads the first year's Chanukah node, as he says.

### 6.3 `rambam`

- One chapter a day, every day, the public cycle.
- The build reads Sefaria's "Daily Rambam" calendar for every day of one full cycle and writes the cycle to [scripts/halacha/schedules/rambam.json](../../scripts/halacha/schedules/rambam.json) with its anchor date; the app computes any day from the anchor and the cycle length. The suite pins 2026-11-10 = Hilchot Issurei Biah 22 and the days around a cycle's end.
- **As built (2026-11-10):** the cycle is 1017 days from 2026-02-03 (Transmission of the Oral Law 1-21); its first twelve days read the introduction (the Oral Law's transmission, the positive and negative mitzvot, the Overview of the contents) and its last Kings and Wars 12. The Hebrew is Torat Emet 363 for every book that has it and Wikisource (CC-BY-SA, stated in the credit) for the rest, the introduction included. No text comes from Mechon Mamre (its terms forbid publishing, 2026-11-10), even under the other titles Sefaria serves it by.

### 6.4 Days that need the rav

Tisha B'Av (Torah study is limited to its own topics) and a mourner's days are not handled: the portion shows as on any day (R17.6).

## 7. `hilchot_hachag`

### 7.1 Periods (D11)

| Festival key | First day of learning | Last day | Days |
|---|---|---|---|
| `pesach` | 14 Adar (Adar II in a leap year) | 14 Nisan | 30 |
| `shavuot` | 5 Iyar | 5 Sivan | 30 |
| `sukkot` | 14 Elul | 14 Tishrei | 30 |
| `rosh_hashanah` | 1 Elul | 29 Elul | 29 |
| `yom_kippur` | 3 Tishrei | 9 Tishrei | 7 |
| `chanukah` | 14 days before 25 Kislev | 24 Kislev | 14 |
| `purim` | 14 days before 14 Adar (Adar II in a leap year) | 13 Adar | 14 |
| `tisha_bav` | 17 Tammuz | 8 Av | 21 |
| `tzom_gedaliah`, `asara_betevet`, `taanit_esther`, `shiva_asar_betammuz` | 3 days before | the day before | 3 |

- A fast deferred from Shabbat moves its period with it; hebcal gives the observed day.
- Purim is 14 Adar everywhere; Shushan Purim gets no period of its own.
- `festivalPeriodsOn(day)` in `src/utils/halacha.ts` returns the periods a day is in, nearest festival first, each with the day's index and the days left. As built it takes no `inIsrael`: no festival of the table falls on a different day in Israel and abroad.

### 7.2 Content per track

The build cuts each festival's material into as many portions as its period has days, evenly by segment count, in the book's order; material with fewer segments than its period has days gives one segment a day and starts the period that many days before the festival (Ben Ish Chai's Rosh Hashanah: 25 halachot from 5 Elul). Confirmed against the siman titles and the halachot themselves on 2026-11-10:

| Festival | `kitzur` (simanim) | `rambam` | `ben_ish_chai` (1st year) |
|---|---|---|---|
| Pesach | 107–119 | Leavened and Unleavened Bread | Tzav (58) |
| Shavuot | 98–103 (Yom Tov) | Rest on a Holiday | Bamidbar (30, the laws of Yom Tov) |
| Sukkot | 134–138 | Shofar, Sukkah and Lulav 4–8 | Ha'azinu and Vezot Haberakhah (33) |
| Rosh Hashanah | 128–130 | Shofar, Sukkah and Lulav 1–3, Repentance | Nitzavim (25) |
| Yom Kippur | 131–133 | Rest on the Tenth of Tishrei | Vayeilech (27) |
| Chanukah | 139 | Scroll of Esther and Hanukkah 3–4 | the Chanukah node (28) |
| Purim | 140–142 | Scroll of Esther and Hanukkah 1–2 | Tetzaveh 24–46 (23; 1–23 are the Priestly Blessing) |
| Tisha B'Av | 122–126 | Fasts 5 | Devarim (28) |
| The four minor fasts | 121 | Fasts 1–4 | — |

Corrections to the first table: Shavuot drops Kitzur 120 (the Omer, read before the period opens); Tisha B'Av takes 122–126 and the minor fasts 121, and 127 (a private fast) is left out. **Gap reported to the owner:** Ben Ish Chai has no halachot of the minor fasts, so `hilchot_hachag` has no window on those days for that track; no other book fills it (the owner's condition of 2026-11-10).

### 7.3 Window and reminder

- `computeWindow`: `null` unless the track is installed and `festivalPeriodsOn()` returns a period the track covers; otherwise alot to the next alot.
- `timeType: 'annual-seasonal'`, no `multiDay`: each day is its own window, so a missed day is a miss like any other mitzvah's.
- `bodyParams` gives `chag` (a `{ he, en }` pair) and `days` (the days left to the festival); `bodyKey` is `notifications.hilchotHachag.body`. In an overlap it names the nearer festival.

## 8. `halacha_yomit`

- `computeWindow`: `null` unless the track is installed; otherwise alot to the next alot, every day (D9).
- `timeType: 'range-within-day'`; `bodyParams` gives `portion` (the day's label, for example "קיצור שולחן ערוך, סימן י״ב"); `bodyKey` is `notifications.halachaYomit.body`.
- A change of track changes the label and the text from that day on; marks are keyed by mitzvah and day, so history is untouched.

## 9. The reader

Both open in the nusach reader, [src/app/siddur/[id].tsx](../../src/app/siddur/%5Bid%5D.tsx), as Chok LeYisrael and Shnayim Mikra do:

- Opened with no date, it shows the portion of the moment (the app's day, `appDay()`); with a `date`, that day's.
- "סיימתי" while the mitzvah is on, filed under the window's day; a closed window asks when it was learned (the late-mark dialog), as everywhere.
- A closed make-up fold for each of the last seven days that has a portion and no mark, the newest first (D2). `hilchot_hachag` folds only days of the current period.
- A day row to browse other days of the cycle or the period, read only.
- The credit and licence notice under the text; the English text when the app is in English and the track has one, else the Hebrew with the existing language note.
- Bookmarks and the last reading position work through `useSiddurBookmarksStore` with a `null` nusach key, as for Chok LeYisrael.

The existing `LearningProgram` is keyed by parasha and week slot (`ChokSlot` has no Shabbat). The implementation either adapts a week of portions into a `ChokAsset` with a Shabbat slot added, or gives the reader a date-keyed program; the choice is the implementer's, the behaviour above is the contract, and the Chok and Shnayim reader suites must stay green unchanged. As built (2026-11-10): a date-keyed path beside the Chok program. `halachaReadingsOn()` and `halachaMakeUpDays()` in `src/data/halachaContent.ts` give a day's portions and the make-up days, `halachaText()` in `src/utils/halachaText.ts` builds the text, and the day row is the shared `DayStepper`. No language note existed, so an English reader of a Hebrew-only track sees a banner (`halacha.englishMissing`).

## 10. App wiring

| Area | Change |
|---|---|
| Types | `HalachaTrack`, the asset and manifest types in `src/types/halacha.ts`; both ids in the mitzvah registry |
| Data | `src/data/halacha.ts`: ids, `hasHalachaContent(track)`, `halachaAsset()`, `defaultHalachaTrack()`, `effectiveHalachaTrack()` |
| Logic | `src/utils/halacha.ts`: `halachaPortion()`, `festivalPeriodsOn()`, `festivalPortion()` |
| Store | `useHalachaStore` (as built: `HALACHA_STORES`, one store per pack, `halacha-<pack>-store`, so the shared add-on core drives each as it drives Chok LeYisrael's): the install, the latest version seen, when it was checked; device-only, out of the backup file, its `merge` dropping an install whose files are gone. A Hebrew install keeps its schedule in `schedule.json` beside its units, read by `halachaScheduleOf()` |
| User store | `halachaTrack`, `null` by default, reset to `null`; no `STORE_VERSION` bump (a new optional field) |
| Service | `src/services/HalachaContentService.ts` on the shared core in [src/services/addons/](../../src/services/addons) |
| Mitzvot | `HALACHA_YOMIT` and `HILCHOT_HACHAG` in [src/data/mitzvot.ts](../../src/data/mitzvot.ts); `MITZVAH_STANDALONE_TEXT` is not used (they read the add-on) |
| Nagging | `PERFORM_MIN`, `NAG_ZONE_KIND` and `nag.verb.<id>` for both ids in [src/utils/nagging.ts](../../src/utils/nagging.ts) |
| Notifications | no new kind, category or id shape; `SCHEDULE_FORMAT` unchanged (two off-by-default mitzvot add no pending notification to an existing install) |
| UI | the add-on card on both mitzvah screens (`AddonCard`), the More tab rows, the siddur tab's learning group, the track select in Settings → Prayer. As built (2026-11-10): `HalachaAddonCard` (with the Kitzur's English card in English), the two rows from `useLearningRows()`, and the book as a `ChipRow` like the nusach chips above it, not an `OptionSelect` (three short names, as the section's other choices), with the Ben Ish Chai year swap under it while that track is chosen |
| Enable prompt | after a download, the offer to switch the mitzvah on, as `ChokEnablePrompt` does |
| i18n | both dictionaries: names, reminder labels and variants, body keys, the track names, the festival names, the settings labels, the notices |
| Search | `SETTINGS_SEARCH_ITEMS` (`halachaTrack`), the two mitzvot (automatic through the registry), a content item per festival and per track book with the words people type (הלכה יומית, קיצור, קצש"ע, בן איש חי, רמב"ם, הלכות פסח …); the deep pass as it treats Chok LeYisrael. As built (2026-11-10): the books and the festivals are words of the two mitzvah items and of `halachaTrack` (`MITZVAH_TERMS`), so "הלכות פסח" opens the festival halachot's screen first, not separate items |
| Guide | a topic for each mitzvah in [src/data/guide.ts](../../src/data/guide.ts), a `WHATS_NEW` item under the next production label, `pnpm guide:build`. As built (2026-11-10): one topic, `halacha`, for both, as `chok` covers Chok LeYisrael and Shnayim Mikra, and the item under `1.0.21-18` |
| Rav page | R17 on [docs/halacha-review.html](../../docs/halacha-review.html), `RULES_VERSION` raised by one |
| Reset and backup | `AppResetService.reset()` clears the store and the files; `halacha-store` stays out of `STORES` in the backup service and out of the Android backup whitelist |
| DOX | the root AGENTS.md (commands, release notes for the add-on, the mitzvah model, stores, tests), [src/data/AGENTS.md](../../src/data/AGENTS.md), [src/services/AGENTS.md](../../src/services/AGENTS.md), [src/stores/AGENTS.md](../../src/stores/AGENTS.md), [docs/AGENTS.md](../../docs/AGENTS.md), a new `scripts/halacha/AGENTS.md` |

Everything ships as an over-the-air update plus the Pages content: no native module, no [app.json](../../app.json) field, no version raise.

## 11. Tests

Every dated fixture is an `at(location, …)` instant; every suite below also runs under `pnpm test:tz`.

- `src/utils/__tests__/halacha.test.ts`: `halachaPortion()` per track on pinned days (a plain day, Shabbat, a leap-year Adar, a cycle's last and first day, a double parasha, Israel against abroad); `festivalPeriodsOn()` for each festival's first and last day in 5787 and 5788, the leap-year Purim and Pesach, a deferred fast, both overlaps; the even division of a festival unit.
- `src/data/__tests__/halachaMitzvot.test.ts`: both registry entries; the windows with and without the add-on and with another track installed; home, history and the streak; the check-in after a Shabbat and after a two-day Yom Tov; the plan's reminders with `portion`, `chag` and `days` in Hebrew and English; nothing inside a block; the default track per nusach and the user's override.
- `src/services/__tests__/HalachaContentService.test.ts` and the shared [addonContent.test.ts](../../src/services/__tests__/addonContent.test.ts): download, verify, update offer, a removed file, a track switch.
- `src/app/__tests__/halachaReader.render.test.tsx`: the portion of the moment, "סיימתי", the make-up folds, the day row, an overlap day's two portions, the credit notice, English with and without a translation.
- Existing suites extended: the settings search and `searchCoverage`, the settings sections (the track select), the siddur catalog's learning group, the More tab, the library, the guide, the smoke render of every screen, the reset and backup suites, the user-store defaults.

## 12. Release order

1. `pnpm halacha:build`, commit `docs/halacha/`, push to `main`, confirm `https://jew-365.github.io/jew-365/halacha/manifest.json` answers 200.
2. `pnpm update:preview`, then a check on a phone: each track downloads, opens on today's portion, and reminds.
3. The rav's answers to R17 through the review page; each answer that is not "נכון" becomes a change and a new `RULES_VERSION`.
4. `pnpm update:production` with the guide's `WHATS_NEW` entry, on the owner's word.

## 13. Open questions

For the owner (in [not-close.md](../../not-close.md)): Q29 (not needed: the luach was found), Q30 (answered 2026-11-10: the years alternate by the Hebrew year, swappable), Q31 (permission for Yalkut Yosef and Shulchan Aruch HaMekutzar as later tracks).

For the rav, R17:

- R17.1 The book per nusach (section 3), Rambam for Chabad and for Teiman included.
- R17.2 The Ben Ish Chai division: a parasha's halachot spread over the week, and the years alternating by the Hebrew year (Q30).
- R17.3 The Shabbat and Yom Tov portion learned or made up afterwards (D2, D9).
- R17.4 The periods of section 7.1, the thirty days for Shavuot and Sukkot and the shorter ones.
- R17.5 No portion on the festival itself, Chanukah and Purim included (D13).
- R17.6 Tisha B'Av and the daily portion (6.4).
- R17.7 The festival units per book (7.2), confirmed against the texts on 2026-11-10.
- R17.8 The Kitzur luach's leap-year rule and the days that read nothing (6.1).

## 14. Risks

- **Scope:** one release of two mitzvot and three books; users see nothing until the last part and the rav's answers are in.
- **Ben Ish Chai and the festivals:** it may not cover every festival at the depth of the other two books (7.2).
- **Rambam as a daily halacha:** a chapter is long and includes laws not practised today; it differs in kind from the Kitzur. The track select lets a user move.
- **Add-on size (measured 2026-11-10, gzipped, what the app downloads and keeps):** Kitzur Shulchan Aruch 0.60 MB and its English 0.54 MB, Ben Ish Chai 0.63 MB, Mishneh Torah 2.43 MB (Hebrew only). Shnayim Mikra is 1.2 MB and Chok LeYisrael 4.8 MB gzipped for comparison.
- **Unverified facts:** the printed source behind Hebcal's Kitzur luach (6.1) and Dirshu's cycle length (2.1). The festival ranges (7.2) and the English coverage (2.3) were checked against the texts on 2026-11-10.
- **Licences:** twelve books of the Rambam track are built from Wikisource's Hebrew (CC-BY-SA), the first version that holds every chapter: Sefaria has no Torat Emet text for Blessings, Circumcision, Fringes, Prayer and the Priestly Blessing, Reading the Shema, Tefillin, Mezuzah and the Torah Scroll and the Order of Prayer, nor any other version of the Transmission of the Oral Law, the Positive and Negative Mitzvot and the Overview; Torat Emet's Leavened and Unleavened Bread lacks chapter 9 (the Haggadah). The other 76 books are Torat Emet's. A version from Mechon Mamre is refused whatever its title (`BANNED_SOURCE`, 2026-11-10: its terms allow private study only, and Sefaria serves its text as both "Mechon-mamre Mishneh Torah" and "Mishneh Torah"); the Positive Mitzvot came from it until then, in version 1 of the published track. Every unit file names its own version and licence, and the manifest's credit names both. The app already ships Chok LeYisrael under CC BY-NC-SA with its notice; these files follow the same practice, published under CC-BY-SA with the credit shown wherever the text is.

## 15. The laws of lashon hara (the owner's request of 2026-11-10, as built)

- **Mitzvah:** `lashon_hara`, "הלכות לשון הרע" / "Laws of Lashon Hara", a `learning` mitzvah of every nusach in the library's other group, right after `hilchot_hachag`, off by default, `skipOn: []` (Shabbat and Yom Tov as for D9). Its window is alot to the next alot on every day the luach gives a portion (every day), `null` until the book is installed. One `clock` reminder at 13:00 (apart from the daily halacha's 08:00), three `bodyVariants` with `%{portion}`; `PERFORM_MIN` 5, the `learning` nag zone, the verb `ללמוד`.
- **Book:** Sefer Chofetz Chaim, whatever the user's track (`halachaBookOf()`): a fourth book of the halacha add-on, `chafetz_chaim`, with its own pack, store, download, enable prompt (which turns on `lashon_hara` only) and English pack, `chafetz_chaim_en`. Hebrew: Sefaria's "Chofetz Chaim", Wikisource's transcription, CC-BY-SA. English: Shraga Silverstein's translation, CC-BY, 96.2% of the segments (read 2026-11-10). Gzipped: 0.16 MB Hebrew, 0.11 MB English. Not included: the Be'er Mayim Chaim (its letter markers are dropped) and the responsa printed at the end of the book, which the luach never reads.
- **Schedule:** the daily Chofetz Chaim luach of `@hebcal/learning` 6.13.1 (BSD), three cycles a year, one table for a common year and one for a leap year (the cycles start 1 Tishrei, 1 Sh'vat and 1 Sivan in a common year; 1 Tishrei, 11 Sh'vat and 20 Iyyar in a leap year), transcribed to [scripts/halacha/schedules/chafetz_chaim.json](../../scripts/halacha/schedules/chafetz_chaim.json). The 29th of a short Cheshvan or Kislev reads the 30th's entry too. The build test pins that each third of a year reads every segment exactly once, in a common and a leap year.
- **Not done (an option for later):** the Be'er Mayim Chaim. Sefer Shemirat HaLashon was built after it (section 16).

## 16. Shemirat HaLashon (the owner's approval of 2026-11-10, as built)

- **Mitzvah:** `shemirat_halashon`, "שמירת הלשון" / "Shemirat HaLashon", the same kind as `lashon_hara` (section 15), right after it, from one factory (`ownBookMitzvah()`): every nusach, the other group, off by default, `skipOn: []`, a window from alot to the next alot every day, `null` until its book is installed. One `clock` reminder at 20:30, three `bodyVariants` with `%{portion}`; `PERFORM_MIN` 5, the `learning` nag zone, its own verb.
- **Book:** Sefer Shemirat HaLashon, a fifth book of the halacha add-on, `shemirat_halashon`, with its own pack, store, download, enable prompt (which turns on `shemirat_halashon` only) and English pack. `OWN_BOOK` in [src/data/halacha.ts](../../src/data/halacha.ts) maps each mitzvah of a book of its own to its book. Hebrew: Sefaria's "Shemirat HaLashon -- Torat Emet 370", the Torat Emet database's text, credited under CC BY-NC-SA 2.5 with no commercial use (the owner's choice: no free Hebrew exists; the permission request of [release/licence-requests.md](../../release/licence-requests.md), section 2, names it). English: Shraga Silverstein's translation, CC-BY, 91.9% of the segments. 7 units (the introduction, the three gates of Book I, its epilogue, Book II's chapters and its epilogue), 917 segments, 0.32 MB Hebrew and 0.24 MB English gzipped. Each gloss of the author is a segment of its own after its paragraph (`…*`), since the luach reads some glosses alone.
- **Schedule:** the daily Shemirat HaLashon luach of `@hebcal/learning` 6.13.1 (BSD), one cycle a year, a common and a leap table, transcribed to [scripts/halacha/schedules/shemirat_halashon.json](../../scripts/halacha/schedules/shemirat_halashon.json) with six corrections (two overlaps, two gaps, and Elul 29 extended to the paragraphs and the prayer Torat Emet adds after the epilogue). The build test pins that each table reads every segment exactly once, in book order. The 29th of a short Cheshvan or Kislev reads the 30th's entry too.
