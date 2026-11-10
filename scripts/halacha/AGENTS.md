# AGENTS.md

## Purpose

- Own the build of the halacha add-on in [../../docs/halacha/](../../docs/halacha): the text of the three daily-halacha tracks (Kitzur Shulchan Aruch, Ben Ish Chai, Mishneh Torah) from pinned Sefaria versions, cut into units, with the daily schedule and the festival portions each track's two mitzvot read ([../../.claude/specs/halacha-yomit.md](../../.claude/specs/halacha-yomit.md), sections 5 to 7).

## Ownership

- [tracks.js](tracks.js) is the one place for what the build reads and how it cuts it: `TRACKS`, each track's `BOOK` name, the pinned Hebrew versions (`KITZUR.he`, `BEN_ISH_CHAI.he`, the per-book preference `RAMBAM_HE`: a book takes the first of them that holds all its chapters, so twelve books come from Wikisource), the Mishneh Torah addresses every version leaves empty (`RAMBAM_EMPTY`), the English licences accepted (`ENGLISH_LICENCES`, CC0 then Public Domain then CC-BY) and `ENGLISH_THRESHOLD` (0.9), the festivals with their period lengths (`FESTIVALS`), each track's festival material (`FESTIVAL_MATERIAL`), and the Ben Ish Chai node of each parasha per year (`BIH_NODE`) with the node the build skips (`BEN_ISH_CHAI.skip`).
- [schedules/kitzur.json](schedules/kitzur.json) is the Kitzur Shulchan Aruch Yomi luach, one entry per day of each Hebrew month, transcribed from `@hebcal/learning` 6.13.1 under its BSD licence (kept in the file), with `corrections` (each broken entry, its published value, the value used and why) and the `rules` the app applies for a leap year, a short Kislev, a long Cheshvan and 15 Elul. A change to an entry adds a correction.
- [schedules/rambam.json](schedules/rambam.json) is one cycle of the Daily Rambam, one chapter a day: 1017 Sefaria calendar references from its first day, `anchor` 2026-02-03. `node scripts/halacha/build.js --rambam-cycle <first day>` rewrites it from Sefaria's `/api/calendars` and fails unless that day reads Transmission of the Oral Law 1-21, the cycle repeats after 1017 days and no day repeats inside it.
- [build.js](build.js) (`pnpm halacha:build`, or `pnpm halacha:build <track>` for one):
  - Downloads into a gitignored cache folder beside it every index, version list and version it reads, waiting out Sefaria's rate limit (`retry-after`, eight attempts, a 60-second timeout per request).
  - Cleans the Hebrew into the reader's runs (`runsOf()`): `<br>` splits paragraphs, `<b>` is bold, `<small>` a note, and for the Kitzur and the Rambam every parenthesis (their references) a note. Each segment opens with its number as a note run, and has a stable `key`: `kitzur:<siman>:<se'if>`, `rambam:<book slug>:<chapter>:<halacha>` (`rambam:<book slug>:<n>` in the introduction's one-level books) or `ben_ish_chai:<year>:<node slug>:<n>`.
  - Units: the Kitzur in blocks of ten simanim (`simanim-001-010`), each siman a section; the Rambam a unit per book of the cycle (88, the introduction's four included), each chapter a section; Ben Ish Chai a unit per year and node (`y1-bereshit`), its halachot only, without the drashot.
  - A portion is a run of segments in book order, written as its `pieces` (`{ u, from, to }`, inclusive indexes into a unit's segments) with a `label` in Hebrew and English (`portionOf()`, `LABEL`). The manifest's `schedule`: for the Kitzur, `kind: 'hebrew'`, a portion or `null` per day of each month and the `leapReview` list; for the Rambam, `kind: 'cycle'`, the `anchor` and the 1017 `days`; for Ben Ish Chai, `kind: 'parasha'`, each of the 54 parashiyot's unit per year (`1`, and `2` where the second year has one), divided over the week by the app.
  - `festivals`: each festival of the track's material divided evenly, in order, into one portion per day of its period (`divide()`); material with fewer segments than the period has days gives one segment a day, and the app starts that period later. A festival the track lacks is absent.
  - English: per track (per book for the Rambam) the accepted version that translates the most segments, by the segment's address. A track whose share reaches `ENGLISH_THRESHOLD` gets an `en/` folder: one file per unit holding `en`, a string or `null` aligned with the unit's segments, and its own manifest. The Hebrew manifest records the share under `english`.
  - Writes per track `<track>/<unit>.<sha8>.json.gz` (`fflate`, level 9, `mtime: 0`; `{ track, unit, title, credits, sections }`, a Rambam unit crediting its own book's version) and the manifest last: `format`, `version`, `track`, `book`, `credit` (`{ he, en }`), `credits`, `gzipBytes`, `gz` (unit → `path`, `sha256`, `bytes`), `units` (unit → `he`, `en`, `count`), `schedule`, `festivals` and `english`. `version` rises only when the manifest's content changes. Files no manifest names are deleted.
- Tests live in [__tests__/](__tests__/): [build.test.js](__tests__/build.test.js) checks the cleanup and the pure helpers, both schedule files, and the published add-on against its manifests (every byte and hash, every segment once with Hebrew text, the Kitzur luach reading each se'if once a year, the Rambam cycle reading the book in order and each halacha at most once, with the twelve it leaves out pinned, each Rambam unit's credit, every parasha's Ben Ish Chai unit, a non-empty portion for each day of each festival a track covers, the minor fasts Ben Ish Chai lacks, and which tracks ship English).

## Local Contracts

- Every output in [../../docs/halacha/](../../docs/halacha) is generated and never hand-edited; a push to `main` publishes it on GitHub Pages. Names are content-addressed, so a cached manifest never points at a changed file.
- A defect in a source fails the build or is a correction in the schedule file, never a silent skip.
- The texts are in the public domain as Sefaria labels them, except the twelve Rambam books built from Wikisource's CC-BY-SA text, published under that licence; every credit names its version and licence; the English translation of the Kitzur is CC-BY (Metsudah, trans. Avrohom Davis) and is shown with that credit.
- Changing a festival's material, a period length or the Ben Ish Chai map is a halachic decision listed for the rav (R17 in [../../not-close.md](../../not-close.md)); change [../../docs/halacha-review.html](../../docs/halacha-review.html) with it.

## Work Guidance

- Sefaria rate-limits the shared address of a cloud session; a first build downloads a few hundred files and can take several minutes. Rerun after a failure: the cache keeps what arrived.

## Verification

- `pnpm test -- scripts/halacha` after any change here or a rebuild.
- `pnpm halacha:build` passes, and a second run prints `wrote 0 files` for every track.

## Child DOX Index

- No child AGENTS.md files.
