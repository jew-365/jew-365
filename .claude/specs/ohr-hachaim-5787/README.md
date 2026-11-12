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

## Horizon reconstruction without the publisher — 2026-11-12

The owner's target, 2026-11-12: within one minute of the print is enough ("עד דקה מספיק טוב בשבילי"). The results table above is the baseline of 2026-11-04; this section is the correction, built into the app the same day, and after it [check.cjs](check.cjs) `--strict` passes: **0 of 492 app comparisons outside one minute** (56 of 56 sunrises, 36 of them exact). The comparisons give one digest, `845ac27c…`, in UTC, Jerusalem, Los Angeles and Kiritimati; the checker now also resolves the relative imports of the app's modules (it could not load `zoneOffsetCache` since 2026-11-06).

- **The model** ([horizon/](horizon)): the public SRTM 1-arc-second terrain ([fetch-dem.sh](horizon/fetch-dem.sh), eleven tiles, 273 MiB, gitignored); the apparent horizon angle per azimuth out to 160 km with terrestrial refraction `k = 0.13` on an effective Earth radius ([horizon.cjs](horizon/horizon.cjs)); the sun by the NOAA / Meeus formulas with Saemundsson's refraction of the true altitude ([sun.cjs](horizon/sun.cjs)); visible sunrise when the upper limb clears the terrain, from an observer 2 m above the ground. Only the observer point is fitted. A missing tile east of 34°E stops the run: a flattened horizon once passed silently. Bennett's formula, fed the geometric altitude, was the first version and set sunrise about a minute early on a flat horizon; [visibleSunrise.test.ts](../../../src/utils/__tests__/visibleSunrise.test.ts) now pins the model to kosher-zmanim's sea-level sunrise within 30 seconds.
- **A held-out page:** the 5781 page already in the suite ([page-5781-27.jpg](horizon/page-5781-27.jpg), the original of the transcription there) prints the visible sunrise too, at sun azimuths 92–97°, which neither 5787 page covers; its row is transcribed in [holdout-5781.json](horizon/holdout-5781.json). Fitted on the 5787 pages alone, Jerusalem's best point predicted all seven 5781 sunrises within 0.33 minutes and Tel Aviv's within 0.62 ([fit.cjs](horizon/fit.cjs)); 26 of the 29 Jerusalem points that fit 5787 also kept the holdout. Be'er Sheva's and Haifa's best 5787 points did not (2.1 and 1.1 minutes), so the final points are fitted on all 21 days (`fit.cjs --all`).
- **The points** ([profiles.cjs](horizon/profiles.cjs), written to [horizonProfiles.ts](../../../src/data/horizonProfiles.ts)), each the best on all 21 printed sunrises, chosen inside a cluster of neighbours that agree on the winter solstice rather than at an isolated best: Jerusalem 31.8253, 35.2317 (largest error 0.42 minutes); Tel Aviv 32.0913, 34.8358, in Bnei Brak (0.54); Haifa 32.7690, 35.0180, on the Carmel (0.91, found on a 0.001° grid; the Carmel's horizon changes within a hundred metres); Be'er Sheva 31.2368, 34.7913 (0.65). The app rounds this sunrise to the nearest minute, as the luach prints it (Jerusalem in quarter minutes); rounding up added up to a minute and broke 2026-10-29 in Jerusalem.
- **Jerusalem's evening:** its 22 remaining discrepancies (shkia, tzeit, plag, candles, exit, 1.5 to 3 minutes late) are one cause: the 1150 m fitted to the 5781 page was too high for the sunset. With a separate sunset height, every printed Jerusalem value of the three pages (165) is within a minute after the app's own rounding for sunrise heights 820–1300 m and sunset heights 730–760 m ([evening.cjs](evening.cjs)); the app keeps 1150 m for the sunrise and takes 745 m, the band's middle, for the sunset (`sunsetElevation` in [cities.ts](../../../src/data/cities.ts)), as the introduction says the sunset is taken from the highest place in the city.
- **Still open:** no printed page covers the winter solstice. Points that fit all 21 days still disagree there (Jerusalem's fitting points from 6:33 to 6:41 on 2026-12-21, the chosen cluster at 6:33.4; Tel Aviv's from 6:42.5 to 6:51, the cluster at 6:43.6; Be'er Sheva's 6:37.5 to 6:41). The owner was asked for pages: the week of the winter solstice first, then mid-January or early February, mid-March, mid-April, mid-August and mid-September. Each is transcribed into [printed.json](printed.json), the fit rerun, and a point kept only if pages it was not fitted to stay within a minute.

## Remaining implementation requirements

1. Done to the owner's one-minute bar on 2026-11-12 by the horizon reconstruction above; the publisher's own settings would still replace the fitted points. Open: printed pages at the winter solstice and the other seasons.
2. Jerusalem's evening values were reconciled together with its morning and weekly ones on 2026-11-12 (the sunset height above); the publisher's coordinates, heights and rounding rules would still replace the fitted ones.
3. Extend the printed calibration to the winter and summer extremes and the DST transition dates as pages arrive; three printed weeks are not a full year of external accuracy.
4. Done on 2026-11-12: the printed sunrises are regression tests in [ZmanimService.ohrHachaim.test.ts](../../../src/services/__tests__/ZmanimService.ohrHachaim.test.ts), the suites that pinned minutes of the old values re-pinned, `pnpm test:tz` run. Left: the check on a phone with the preview app before production.

No external messages were sent. No preview publish, production publish or native build was performed. The winter pages and the phone check remain open work in [not-close.md](../../../not-close.md).
