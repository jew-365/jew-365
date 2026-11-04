# Independent Ohr HaChaim calibration — 2026-11-04

Checked app source at `db08066` (same zmanim code as `2ae19ce`). The owner explicitly compared **preview**, not production. This investigation changes no runtime calculation and publishes nothing.

## Evidence and reproduction

- [winter.jpg](winter.jpg): 5787 page 21, 2026-10-25 through 2026-10-31, already winter time.
- [summer.jpg](summer.jpg): 5787 page 95, 2027-06-06 through 2027-06-12, summer time.
- [printed.json](printed.json): manual transcription of all seven daily rows for every day/city; first/last daily values of each weekly range; every candle-lighting, Shabbat exit and Rabbeinu Tam value on both pages. City order is Jerusalem, Tel Aviv, Haifa, Be'er Sheva. A decimal is a fraction of a minute: `05:48.75` means 05:48:45. Weekly boxes run from Sunday to Saturday; the summer box omits the repeated hour on the second value. Jerusalem candles use the main 20-minute line; the alternative 40-minute line is 20 minutes earlier. Original photographs allow independent review of the transcription.
- [sources.json](sources.json): photograph and introduction-image SHA-256 digests and source URLs.
- [check.cjs](check.cjs): loads the actual TypeScript service and city registry with the installed TypeScript compiler, without Expo/native mocks. No dependency install or network call is required.
- [comparison.csv](comparison.csv): 500 baseline comparisons (492 actual app values and 8 **formula-only** Rabbeinu Tam values; the app currently exposes no Rabbeinu Tam time). Signed delta is app minus printed, in minutes. These are **not** 500 passing tests.

From the repository root:

```sh
node .claude/specs/ohr-hachaim-5787/check.cjs --out=/tmp/ohr-check
node .claude/specs/ohr-hachaim-5787/check.cjs --strict
```

Normal mode reports all discrepancies and fails on broken fixture structure, date offsets, ordering, or cache isolation. `--strict` also exits 1 when any printed comparison differs by more than one minute; **it is expected to fail on current HEAD**. Do not widen that threshold or re-pin printed values to make current code green. `--candidate-heights=800,60,390,260` runs a labeled experiment in memory, never modifying city data; these heights are not established publisher inputs.

## Results

492 app comparisons: **429 within one minute, 63 outside**. Breakdown below; fractions count as differences from the exact printed quarter/half-minute, not from a rounded substitute.

| Time              | Comparisons | Exact | Within 1 minute | App minus print, minutes |
| ----------------- | ----------: | ----: | --------------: | ------------------------ |
| Dawn              |          56 |    48 |              56 | -1 to 0                  |
| Visible sunrise   |          56 |     1 |              15 | -6 to +2                 |
| Sunset            |          56 |    26 |              50 | 0 to +2                  |
| Weekday nightfall |          56 |    31 |              44 | 0 to +2                  |
| Shema MGA         |          56 |    50 |              56 | -1 to +1                 |
| Shema GRA         |          56 |    52 |              56 | -1 to +1                 |
| Prayer GRA        |          56 |    53 |              56 | -1 to +1                 |
| Tallit/tefillin   |          16 |    14 |              16 | -1 to 0                  |
| Midday            |          16 |    14 |              16 | -1 to +1                 |
| Mincha gedola     |          16 |    15 |              16 | -1 to 0                  |
| Mincha ketana     |          16 |    16 |              16 | 0                        |
| Plag              |          16 |     7 |              14 | -1 to +3                 |
| Candles           |          12 |     6 |              11 | 0 to +2                  |
| Shabbat exit      |           8 |     6 |               7 | 0 to +2                  |

The eight formula-only Rabbeinu Tam values are all within one minute (five exact). They do not establish a working app feature.

Each city has 123 app comparisons. Jerusalem has 28 discrepancies over one minute: six sunrises and **22 other values**. Tel Aviv has 14, Haifa seven and Be'er Sheva 14, all sunrise values; all other comparisons for those three cities are within one minute. Summer Jerusalem plag is 18:35 versus 18:33 on June 6, and 18:38 versus 18:35 on June 12.

## Primary-source findings

Read the original printed introduction scans [page 1](https://raw.githubusercontent.com/Zemaneh-Yosef/royzmanimwebsite/main/assets/images/sources/intro1.png), [page 2](https://raw.githubusercontent.com/Zemaneh-Yosef/royzmanimwebsite/main/assets/images/sources/intro2.png), and [page 3](https://raw.githubusercontent.com/Zemaneh-Yosef/royzmanimwebsite/main/assets/images/sources/intro3.png). These are older scans preserved by Zemaneh Yosef; their applicability to every detail of the 5787 edition remains unconfirmed.

- Four city horizons represent broader geographic regions, rather than each reader's exact GPS point. This matters when matching the printed page.
- Dawn is 72 seasonal minutes before astronomical sunrise; the GRA day is astronomical sunrise to sunset. Tallit/tefillin is six seasonal minutes after dawn. MGA uses dawn to Rabbeinu Tam; GRA Shema/prayer use three/four seasonal hours from astronomical sunrise.
- The displayed netz is supplied by **Bikurei Yosef**, with the relevant city horizon. It is not the sea-level approximation in our code. Its terrain/location choice must not be substituted into all the seasonal calculations indiscriminately.
- Sunset uses the highest place in the city. The introduction discusses refraction/atmospheric uncertainty of up to roughly one or two minutes. This explains why a printed calendar is not an observed sunset guarantee; it does **not** establish a correction for any particular date or authorize changing comparison tolerances.
- Nightfall is 13.5 seasonal minutes after sunset. Candles are 20 fixed minutes before sunset, with the Jerusalem 40-minute alternative. Shabbat exit is 30 fixed minutes after sunset; Rabbeinu Tam is 72 seasonal minutes.
- The publisher's introduction does not establish the blanket whole-minute directional rounding rule we borrowed from another project's display configuration. Jerusalem sunrise and sunset actually contain quarter-minute precision. Preserve internal seconds and verify each display rule against the publisher before claiming an exact match.
- The introduction identifies Rabbi Asher Darshan as the author of the calculation software. No publisher coordinates, elevation table or original algorithm was obtained.

[Chai Tables' own introduction](https://chaitables.com/webpub/byintro.htm), available through the search index, distinguishes elevated astronomical, sea-level and visible events and explains the date-dependent terrain horizon. A constant sunrise offset cannot reproduce that model.

[Zemaneh Yosef's FAQ](https://royzmanim.com/FAQ), [Android source documentation](https://github.com/Zemaneh-Yosef/RabbiOvadiahYosefCalendarAndroidApp), and [calculator source](https://github.com/Zemaneh-Yosef/royzmanimwebsite/blob/main/assets/js/ROYZmanim.js) are useful independent implementations, **not the publisher's official code**. Their fallback to sea-level netz is not evidence that this is what the printed luach uses. Their Israel/outside-Israel modes and optional modern atmospheric/terrain features also cannot be assumed to match the publisher's configuration.

The publisher's [site](https://maor.orhachaim.org/) and its [Jerusalem widget](https://maor.orhachaim.org/פיתוח-ווידגט-דום-דיגיטל/?cal_city=IL-Jerusalem) expose indexed data, city selection and calendar parameters (`cal_city`, `cal_he`, `cal_day`, `cal_month`, `cal_year`). A dated query could not be read: direct page requests timed out or were unavailable. No historical API, downloadable year table, redistribution permission or live match to the two photographs was verified. Do not use undated search snippets as historical fixtures.

## Additional checks and experiments

- Current service, Hebrew dates, city refresh, location-follow, timeline, day-screen render, app-day, check-in, weekly report and notification notice suites: **13 suites, 276 tests per zone**, passing in UTC, Jerusalem, Los Angeles and Kiritimati (1,104 test executions). The initial focused run was seven suites/130 tests per zone; the broader run includes those tests and should not be counted as additional unique tests.
- 365 days × four city presets: 1,460 city-days per process checked for ordering of daytime events, cloned/cache-isolated Dates and valid sunrise/sunset results. Repeated in all four device timezones: 5,840 city-day executions. This validates consistency, **not accuracy against a year of printed data**.
- All 500 comparisons have identical result digest in each device zone: `85e8cb3f4ae9b9902d2f41fdbdfe86050a42e147345c7d51fbcc9d83156d1554`. UTC offsets are explicitly checked around the 2026-10-25 winter and 2027-03-26 summer transitions. No one-hour DST error was reproduced.
- Hebrew dates independently checked: October 25/31 = 14/20 Cheshvan 5787, June 6/12 = 1/7 Sivan 5787. These are not the week containing November 4.
- Manual saved-city hydration replaces obsolete elevation/candle overrides with current city data. A GPS location retains its exact coordinates and only takes the fitted city height within 10 km. It can still carry the city name outside that radius (the resolver associates a city within 25 km), so a city label alone does not prove a printed-city calculation.
- On launch/foreground, `followDeviceLocation()` intentionally moves a manually selected city to GPS after a move of at least 1 km, when permission exists. The existing location-follow tests pass. This is intentional product behavior, not proof of a defect, and the owner's actual saved coordinates/phone were not available.
- Schedule and day-screen source use `clockOf(..., location.tz)`; their shared date conversion is location noon. The integration suites exercise the location calendar and date crossings. This was not a physical-device inspection of the preview installation.
- Changing only height was tested as an experiment over 0–1500 m in 10 m increments. The six non-visible daily rows across the existing autumn 2020 page plus both new pages can be brought within one minute (e.g. Jerusalem 800 m, Tel Aviv 60 m, Haifa 390 m, Be'er Sheva 260 m). But **including the weekly/candle/exit constraints leaves no tested Jerusalem height with every new-page value within one minute**. Best grid point for those new-page constraints is 810 m, with one remaining two-minute discrepancy; current 1150 m has 22 non-sunrise discrepancies. This finite search is not a proof over all real-valued heights or other coordinates, and the selected heights are **not** publisher data.
- The 800/60/390/260 candidate improves sunset/nightfall but creates a two-minute tallit/tefillin discrepancy and leaves a two-minute plag discrepancy in Jerusalem; sunrise is unchanged. This is why no city height was patched on this evidence.
- TypeScript and repository ESLint pass. The pnpm wrapper initially attempted an automatic install and failed on its home-directory store; the installed tools were then run directly without changing dependencies or lockfiles.

## Remaining implementation requirements

1. Obtain Bikurei Yosef/Chai Tables data **with the exact city/horizon settings of the publisher**, or an authoritative table from the publisher, and clarify access/reuse. A generic table at arbitrary GPS coordinates is not enough to claim printed-city equality.
2. Obtain the publisher's reference coordinates, morning/evening horizon/elevation inputs and rounding rules. Reconcile the Jerusalem morning/evening/weekly discrepancies together; do not optimize a single line or season.
3. Extend independent printed calibration beyond these two weeks, including winter/summer extremes and transition dates, once the reference data are available. These two weeks cover 14 calendar days, not a full year of external accuracy.
4. Once a justified runtime fix exists, promote these printed cases into normal regression tests, check all time consumers/reminders, then validate preview on a phone before production.

No external messages were sent. No runtime fix, preview publish, production publish or native build was performed. Device-specific reproduction and the unavailable publisher data remain explicit open work in [not-close.md](../../../not-close.md).
