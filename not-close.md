# Not Closed

Every open item of the project in one place: tasks, bugs, open questions, and other open items (reviews, external dependencies, unverified paths, cleanup). Add new open work here, never in a separate tasks, bugs or questions file, and delete an item in the change that closes it. Closed work lives in git history; the closed findings of the 2026-08-09 failure-point audit stay in [AUDIT.md](AUDIT.md).

Standing rules: no commit or OTA without per-action approval; every siddur text ships for all four nuschaot or not at all; English under a Hebrew segment is the pinned source's translation of exactly that segment ([scripts/siddur/AGENTS.md](scripts/siddur/AGENTS.md), Local Contracts).

## Tasks

### Requests of 2026-10-24 — batch rules

The user's batch of fifteen requests, all decisions taken in the session of 2026-10-24. An executor takes these tasks as written; every product call is already made here.

- **Flag:** every task carries one. `OTA` ships in a numbered over-the-air update (`pnpm update:production`, only with the user's approval); `Build` needs a new native build. A task flagged `OTA` must not add a native module or touch [app.json](app.json) native fields; if it turns out to need one, stop and flag it.
- **Halachic choices:** each zman, window or liturgical rule below is implemented as written and also listed under [Open Questions → For the rav](#for-the-rav) by its `R` number. A rav's answer comes back as a change to that one rule.
- **At least one reminder:** a mitzvah that is switched on always has at least one reminder (task "Require at least one reminder"). Every new switch in this batch follows it.
- **New mitzvot are on by default**, except the ids in `MENS_MITZVOT` ([src/stores/taharahOptIn.ts](src/stores/taharahOptIn.ts)) for a user whose gender is `female`.
- **Gender changes are automatic:** `chooseGender()` is the one place a gender change fans out (mitzvot defaults, palette, taharah role, and from this batch the siddur voice).
- **Declined on 2026-10-24:** offering Tehillim as a download (0.4 MB, not worth the step), and installing only the user's nusach (it would make the first launch depend on the network).
- **Done means:** both dictionaries updated, a DOX pass on every touched AGENTS.md, once the user guide exists its topic and a `WHATS_NEW` item updated and `pnpm guide:build` run, and `pnpm typecheck`, `pnpm lint`, `pnpm check:dox`, `pnpm test:tz` green. No commit and no OTA without the user's per-action approval.

### High — Requests of 2026-10-24

- [ ] Add Kiddush Levana as a monthly mitzvah
  - **Flag:** `OTA`.
  - **What it is:** A registry entry `kiddush_levana`:
    - he "קידוש לבנה", en "Kiddush Levana";
    - icon `moon`, `category: 'seasonal'`, `group: 'other'`, `timeType: 'monthly-window'`, all nuschaot;
    - linked to the standalone text `kiddush_levana`;
    - in `MENS_MITZVOT`.
    - **The period (R1):** computed from the molad, through `@hebcal/core`'s `Molad` for the Hebrew month:
      - it starts 3 days after the molad for Ashkenaz, and 7 days after it for Sefard, Edot HaMizrach and Chabad;
      - it ends 14 days 18 hours 22 minutes after the molad for Ashkenaz, Sefard and Chabad, and 15 days after it for Edot HaMizrach;
      - in Tishrei it starts no earlier than the exit of Yom Kippur, and in Av no earlier than the night after Tisha B'Av.
    - **One multi-day window per month:**
      - It belongs to the day of the first night it can be said: nightfall on or after the period start that is not a Shabbat or Yom Tov night. It is keyed on that day, and every other day returns `null`.
      - It runs from that nightfall to the period end.
      - Shabbat and Yom Tov nights inside it are quiet as usual.
    - **Engine support for a window longer than a day.** Add `multiDay?: { maxDays: number }` to `Mitzvah` (16 here), and honour it in:
      - `appDayWindow()` / `currentOrNextWindow()` ([buildDayTimeline.ts](src/utils/buildDayTimeline.ts)), which look back up to `maxDays` for a window still open, so home shows it every night of the period until done;
      - `planMitzvot()`, which plans the triggers of a window that started up to `maxDays` back;
      - `judgeDay()` ([historyStats.ts](src/utils/historyStats.ts)), where the item is open until `window.end`, done when marked, and missed after the period ends unmarked;
      - the check-in, which skips a multi-day window whose end is after the block.
    - **A new reminder anchor `blockExit`:** it fires `offsetMin` minutes after the exit of every holy block that ends inside the window. The editor offers it only for a `multiDay` mitzvah, labelled `reminder.anchor.blockExit` "במוצאי שבת וחג".
    - **Default reminders:** `start/0` (the first night) and `blockExit/15` (motzaei Shabbat within the period), each with three `bodyVariants`.
    - Retire the plain `kiddushLevana` day-3-to-15 flag in [src/utils/siddur.ts](src/utils/siddur.ts) in favour of the same period function, so the siddur tab and the mitzvah agree on which nights are open. The function lives in one home: `kiddushLevanaPeriod(hebrewMonth, nusach)` in [src/utils/siddur.ts](src/utils/siddur.ts).
  - **What it solves:** Kiddush Levana in its time, with reminders, as one monthly mitzvah instead of a nightly one.
  - **Expected result:**
    - Period tests against published molad times for three months, per nusach, including Tishrei and Av.
    - On a pinned month, home shows it from the first night through the period end until it is marked.
    - Marking it on the fifth night files it under the first night's key, clears it from home and cancels its later reminders.
    - History shows one item for the month, done or missed.
    - No reminder inside a Shabbat, and one at block exit + 15.
    - The siddur tab greys the text outside the period.
    - Root [AGENTS.md](AGENTS.md) documents `multiDay` and `blockExit`.

- [ ] Add Selichot as a seasonal mitzvah
  - **Flag:** `OTA`.
  - **What it is:** A registry entry `selichot`:
    - he "סליחות", en "Selichot";
    - icon `shofar`, `category: 'seasonal'`, `group: 'seasonal'`, `timeType: 'annual-seasonal'`, all nuschaot;
    - linked to the standalone text `selichot`.
    - **Window (R2):** on each day of the user's nusach season, the same flags the siddur tab uses (`selichotFlags()` in [src/utils/siddur.ts](src/utils/siddur.ts): Edot HaMizrach from 2 Elul, the others from leil Selichot, both through 9 Tishrei, none on Shabbat, Yom Tov or Yom Kippur), it runs from `chatzotLayla` to the next morning's `sofZmanTfilaGra`. That is the existing `MIDNIGHT_TO_MORNING_PRAYER` hours, keyed on the civil day whose night it opens.
    - **One default reminder:** `start/0` at chatzot halayla (the user's call), with three `bodyVariants`, editable like every reminder.
  - **What it solves:** Selichot reminders through the season, by nusach.
  - **Expected result:**
    - Window tests per nusach for the first and last day of the season and for a Shabbat in between (no window).
    - The reminder schedules at chatzot.
    - The siddur tab and the mitzvah agree on the days.

- [ ] Add Chanukah candles as a seasonal mitzvah
  - **Flag:** `OTA`.
  - **What it is:** A registry entry `chanukah_candles`:
    - he "נרות חנוכה", en "Chanukah candles";
    - icon `chanukiah`, `category: 'seasonal'`, `group: 'seasonal'`, `timeType: 'annual-seasonal'`, all nuschaot;
    - linked to the standalone text `chanukah_candles`.
    - **Window per night (R4),** for each of the eight nights (the evenings that open 25 Kislev through 2 Tevet):
      - a weekday starts at nightfall (tzeit) for Ashkenaz, Sefard and Edot HaMizrach, and at shkia for Chabad;
      - Friday runs from `plagHaMincha` to the Shabbat candle lighting time;
      - motzaei Shabbat starts at the block exit;
      - every night ends at the next alot;
      - a night is keyed on the civil day whose evening it is.
    - **Default reminder:** `start/0`, with three `bodyVariants` that name the night ("הנר ה־%{n}"). The body carries the night's count through a new optional `bodyParams(ctx)` on `Mitzvah`, which the planner fills when building the body.
  - **What it solves:** Chanukah candle reminders, with the Friday and motzaei Shabbat timing right.
  - **Expected result:**
    - Window tests for a weekday night, a Friday (ends at candle lighting, before the block) and a motzaei Shabbat (starts at the exit) in Jerusalem and abroad, under `pnpm test:tz`.
    - Each reminder's body names the right night.
    - No window outside Chanukah.

- [ ] Add Ushpizin as a seasonal mitzvah with its text
  - **Flag:** `OTA` — the text is a bundled asset.
  - **What it is:**
    - (1) **Text:** a new standalone text `ushpizin` in the occasions group, he "אושפיזין", en "Ushpizin", available on the nights of Sukkot (a new day flag `sukkotNight` for 15–21 Tishrei nights). It is built by `pnpm siddur:build` from pinned sources already cached in [scripts/siddur/.cache/](scripts/siddur/.cache):
      - Ashkenaz: the `Ushpizin` section of the Metsudah or Torat Emet Ashkenaz source;
      - Sefard: "Prayer Upon Entering Sukkah" in `toratEmetSefardHe.json`, which carries "תיבו תיבו אושפיזין";
      - Edot HaMizrach: "סדר שבעה אושפיזין" in `edotHe.json`;
      - English: the pinned translations where they exist, Hebrew only otherwise, per the siddur contract.
      - Each night's ushpiz paragraph is conditioned on its night (flags `ushpizinNight1..7`).
    - (2) **Chabad:** Chabad custom is not to recite the "עולו אושפיזין" formula (R5). So the mitzvah's `nuschaotSupported` excludes `chabad`, and the text is not shipped for Chabad. This is a deliberate exception to "every text ships for all four nuschaot". Record it in the test that enforces that rule as a named allowlist entry (`ushpizin: ['chabad']`) and in [scripts/siddur/AGENTS.md](scripts/siddur/AGENTS.md). If the rav answers that Chabad does say it, the exception is removed and a Chabad source is added.
    - (3) **Mitzvah:**
      - registry entry `ushpizin`: icon `sukkah`, `category: 'seasonal'`, `group: 'seasonal'`, `timeType: 'annual-seasonal'`, linked to the text;
      - window per night: nightfall → next alot on the seven nights;
      - default reminder `start/0`, whose body names that night's ushpiz (Avraham, Yitzchak, Yaakov, Moshe, Aharon, Yosef, David, in that order; R5), with three `bodyVariants` through `bodyParams`.
    - (4) **Nights inside a holy block** (Yom Tov, and Shabbat of chol hamoed):
      - no reminder fires;
      - the pre-block notice ([planners/holyBlock.ts](src/services/notifications/planners/holyBlock.ts)) gets one line per such night while the mitzvah is on: `holyBlock.notice.ushpizinTonight` "הלילה אושפיזין: %{name}", or `ushpizinOn` with the weekday;
      - after the block, the check-in lists each of those nights as done or not, through the existing check-in.
  - **What it solves:** The Ushpizin invitation each night of Sukkot, with the night's guest named, and its tracking on Shabbat and Yom Tov.
  - **Expected result:**
    - [siddur.test.ts](src/data/__tests__/siddur.test.ts) dated cases for nights 1 and 7 in three nuschaot.
    - A Chabad user sees neither the text nor the mitzvah.
    - The planner schedules chol hamoed nights with the right name, and puts the Yom Tov nights' lines in the pre-block notice.
    - The check-in after the first Yom Tov lists the Yom Tov nights.
    - [scripts/siddur/AGENTS.md](scripts/siddur/AGENTS.md) records the sources and the Chabad exception.

### Medium — Requests of 2026-10-24

- [ ] Ask which mitzvot to track during onboarding
  - **Flag:** `OTA`.
  - **What it is:**
    - **New step:** a new onboarding route `src/app/onboarding/mitzvot.tsx`, between nusach and location. In [nusach.tsx](src/app/onboarding/nusach.tsx), Continue pushes `/onboarding/mitzvot`, and the new step's Continue pushes `/onboarding/location`. It comes after profile and nusach, so the list is already filtered by nusach and shows the gender defaults (`MENS_MITZVOT` off for a woman).
    - **Copy:** title `onboarding.mitzvot.title` "אילו מצוות לעקוב?" / "Which mitzvot to track?"; hint `onboarding.mitzvot.hint` "אפשר לשנות את זה בכל עת במסך המצוות" / "You can change this any time in the mitzvot screen".
    - **The list:** a shared component `MitzvahLibraryList` in [src/components/](src/components), extracted from [src/app/mitzvot.tsx](src/app/mitzvot.tsx) so both screens render the same grouped sections, switches, hilulot and Rosh Chodesh rows, and the at-least-one-reminder rule.
      - Onboarding passes `showMine={false}` and shows no floating add button.
      - The library screen keeps both.
    - **Layout and dots:** the step uses the same layout, `OnboardingDots` and Continue `Button` as its siblings, and the dot count grows by one.
    - **Ready step:** [ready.tsx](src/app/onboarding/ready.tsx) keeps its "edit mitzvot" link.
    - **Existing users:** they are onboarded already, so they never see the step.
  - **What it solves:** A new user chooses what to track the first time they open the app.
  - **Expected result:**
    - [routes.test.ts](src/app/__tests__/routes.test.ts) and [screens.smoke.render.test.tsx](src/app/__tests__/screens.smoke.render.test.tsx) gain the route.
    - An onboarding render test: the step lists the groups, a toggle changes `useMitzvotStore`, and Continue goes to location.
    - The library's render test still passes on the extracted component.
    - [src/app/onboarding/AGENTS.md](src/app/onboarding/AGENTS.md) lists the step.

- [ ] Build the direct APK for phone processors only
  - **Flag:** `Build`.
  - **What it is:**
    - **Why it is big:** the direct-install APK (`production-apk` in [eas.json](eas.json)) is universal: `jew365-1.0.21-9.apk` is 125 MB, of which 93 MB is native code for four ABIs. `x86` (26.5 MB) and `x86_64` (25.8 MB) serve emulators only.
    - **Change:** the `production-apk` profile builds with `"gradleCommand": ":app:assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a"` in place of `"buildType": "apk"`. That keeps 32-bit ARM for older phones.
    - **Unchanged:** the Play AAB (`production`), because Play already sends each phone only its own ABI.
    - **Docs:** the profile list in root [AGENTS.md](AGENTS.md) (Commands) says so.
  - **What it solves:** The direct APK the user shares weighs about 52 MB less.
  - **Expected result:**
    - The next `pnpm build:android:production-apk` produces an APK with no `lib/x86*` entries (`unzip -l`) and about 73 MB in size.
    - It installs and runs on the emulator (arm64 image) through [android-native-verify](.claude/skills/android-native-verify/SKILL.md).
    - Its size is logged in [release/RELEASE_LOG.md](release/RELEASE_LOG.md).

- [ ] Shrink release builds with R8
  - **Flag:** `Build`.
  - **What it is:**
    - **Why:** the APK carries 47 MB of unshrunk `classes*.dex`.
    - **Change:** add the config plugin `expo-build-properties` (at the version `npx expo install` picks for SDK 54) to [app.json](app.json) with `android.enableMinifyInReleaseBuilds: true` and `android.enableShrinkResourcesInReleaseBuilds: true`. This is the SDK 54 name; check the plugin's docs for the exact keys at that version.
    - **Keep rules:** add them in `android.extraProguardRules` for anything R8 breaks. Candidates: MMKV, expo-notifications' task classes, expo-background-task, the Kotlin service written by [withMitzvahNotificationAction.js](scripts/withMitzvahNotificationAction.js), Sentry.
    - **Mapping file:** keep each build's `mapping.txt` (an EAS build artifact), so a future Sentry upload can de-obfuscate.
  - **What it solves:** Smaller downloads from Play and as a direct APK.
  - **Expected result:** A release build verified on the emulator through every native path:
    - a notification at its time, with both actions (mark done and open text) while the app is killed;
    - the hourly background task;
    - MMKV state across a restart;
    - the taharah lock (biometric and secure store);
    - location;
    - share and pick of a backup file;
    - the Chok download.

    The dex size before and after is logged in [release/RELEASE_LOG.md](release/RELEASE_LOG.md). Any keep rule added is commented with the crash it fixed.

- [ ] Add the siddur voice setting that follows gender
  - **Flag:** `OTA`.
  - **What it is:**
    - **The field:** `useUserStore` gains `siddurVoice: 'male' | 'female' | null`, default `null`, which keeps today's text.
    - **Following gender:** `chooseGender()` sets `siddurVoice` to the new gender on every gender change, overwriting any manual choice.
    - **Settings:** in the Prayer section, `ChipRow` "נוסח הסידור" (`settings.siddurVoice`) with `settings.siddurVoice.male` "גבר" and `.female` "אישה", anchor `siddurVoice`, plus a settings-search item.
    - **The reader:** [src/app/siddur/[id].tsx](<src/app/siddur/[id].tsx>) passes the voice into `resolveSiddurText()` through a new `forVoice()` step beside `forMaritalStatus()`.
    - **The asset mechanism:**
      - `PassageLabel` gains `voice?: 'male' | 'female'`, which shows a passage only to that voice. A null voice shows both, folded as today.
      - `Run` gains `voice?` for inline alternatives such as מוֹדֶה / מוֹדָה.
      - [scripts/siddur/build.js](scripts/siddur/build.js) and the tests guard the new flag exactly as they guard `marriedOnly`.
  - **What it solves:** A woman reads the siddur in her own voice, and the gender in Settings drives it.
  - **Expected result:**
    - Store tests: a gender change sets the voice; a manual change sticks until the next gender change.
    - A settings render test shows the chips.
    - Siddur tests show that a `voice: 'female'` passage shows only for `female`, and that a null voice keeps today's resolved text byte for byte.
    - [scripts/siddur/AGENTS.md](scripts/siddur/AGENTS.md) documents the flag.

- [ ] Apply the women's liturgy in every siddur text
  - **Flag:** `OTA` — bundled assets rebuilt by `pnpm siddur:build`.
  - **What it is:** Through the voice mechanism above, and by manifest patches in [scripts/siddur/manifest.js](scripts/siddur/manifest.js), each with a source note:
    - (1) **Modeh Ani and Elokai Neshama** in all four nuschaot: `female` reads מוֹדָה for מוֹדֶה. In Edot HaMizrach the inline note "האשה אומרת: מודה" is resolved by voice.
    - (2) **Birchot hashachar**, in `birchot_hashachar` and `shacharit`, all four nuschaot. For `female`:
      - "שלא עשני אשה" is hidden;
      - "שעשני כרצונו" is shown open: with shem umalchut in Ashkenaz and Sefard (the existing segment, its `WHEN_SAID.women` fold dropped for `female`), without shem umalchut in Edot HaMizrach (the existing segment), and in Chabad a new segment with shem umalchut, as a manifest patch noted as the Chabad women's text (R8);
      - Edot HaMizrach's "גוי / גויה" and "עבד / שפחה" read the feminine word;
      - the other nuschaot keep "גוי" and "עבד" (R8).
      - For `male`, "שעשני כרצונו" is hidden in all four.
    - (3) **Tallit and tefillin:** for `female`, Shacharit's tallit-and-tefillin station is hidden entirely; the `tefillin` text's tallit-katan and tefillin blessings and kavanot (Rabbeinu Tam included) are hidden; and the siddur tab does not list the `tefillin` text.
    - (4) **Feminine first-person forms** for `female`, with correct nikud:
      - הריני / הנני מוּכָן וּמְזֻמָּן → מוּכָנָה וּמְזֻמֶּנֶת: Omer in `sefirat_haomer` and `maariv`, Edot shacharit, Sefard chanukah_candles;
      - הנני מְכַוֵּן → מְכַוֶּנֶת: Sefard chanukah_candles;
      - הריני מְקַבֵּל → מְקַבֶּלֶת: the Shacharit "מה טובו" and "פרשת העקדה" kabbalah lines, and the bedtime Shema in Edot HaMizrach and Chabad;
      - הריני מוֹחֵל → מוֹחֶלֶת: the bedtime Shema, all four;
      - הריני מְזַמֵּן / מְקַשֵּׁר → מְזַמֶּנֶת / מְקַשֶּׁרֶת: Tikkun HaKlali, Edot shacharit;
      - הריני בָּא → בָּאָה: Edot birchot_hanehenin and mezuzah.
      - Verses (e.g. "עבדך בן אמתך") never change.
    - (5) **Edot HaMizrach candle lighting** is written in a woman's voice. For `male` it reads הריני נוֹתֵן and "על אשתי"; `female` and null keep it as is.
    - (6) **Birkat HaMazon Harachaman** "(ואת אשתי / בעלי ואת זרעי)" in Ashkenaz and Sefard: a married `male` reads "ואת אשתי", a married `female` "ואת בעלי", and a single user neither.
    - (7) **Edot HaMizrach, `female`:**
      - Sefirat HaOmer shows the note "נשים סופרות בלי ברכה" and folds the blessing (R8);
      - Hallel shows the note "נשים אומרות בלי ברכה" and folds its opening and closing blessings (R8).
    - (8) **Unchanged:** Birkat HaMazon's "ועל בריתך שחתמת בבשרנו ועל תורתך שלמדתנו" stays as printed (R8).
    - (9) **English:** follows its pinned translation. Where a segment is hidden its English is hidden with it, and where the Hebrew changes form the English stays (it is gender-neutral).
  - **What it solves:** The research the user asked for: every place in the app's texts that differs for a woman, applied in one pass.
  - **Expected result:**
    - [siddur.test.ts](src/data/__tests__/siddur.test.ts) has a dated case per item above, per nusach, for `female`, `male` and null.
    - Null output is identical to today's.
    - The `tefillin` text is absent from the siddur tab for `female`.
    - `pnpm siddur:build` is clean.
    - [scripts/siddur/AGENTS.md](scripts/siddur/AGENTS.md) lists the voice patches and adds the R8 items to its halachic review list.

- [ ] Search mitzvot and siddur texts from Settings
  - **Flag:** `OTA`.
  - **What it is:** [settingsSearch.ts](src/utils/settingsSearch.ts) indexes 26 settings items today.
    - **New result kinds:**
      - every mitzvah the user's nusach supports, static and custom, opening `/mitzvah/[id]`, caption `settings.search.kind.mitzvah` "מצווה";
      - every siddur text, the mitzvah texts and the `STANDALONE_TEXTS` (Chok LeYisrael only once installed), opening `/siddur/[id]`, caption `settings.search.kind.siddur` "סידור";
      - every chapter or station of a text, opening `/siddur/[id]?section=<title>`, caption "סידור · %{text}".
    - **Chapter index:** `pnpm siddur:build` writes a new generated file `src/data/siddurChapters.generated.ts` (text id → nusach → chapter titles, he and en), so the search never loads an asset.
    - **Type changes:** the item type takes a literal `title: { he, en }` beside `titleKey`, and a `href` of `{ pathname, params }` beside `route`. `chooseResult()` pushes it.
    - **Reader:** it accepts `section` and runs its existing `jumpTo` on open.
    - **Ranking:** the existing score. Ties order settings, mitzvot, texts, then chapters. `SETTINGS_SEARCH_LIMIT` goes from 8 to 12.
    - **Mitzvah icons:** results use `iconFor()`, and texts their group icon.
  - **What it solves:** Typing a mitzvah or prayer name in the search finds it.
  - **Expected result:**
    - [settingsSearch.test.ts](src/utils/__tests__/settingsSearch.test.ts): "ערבית" finds the maariv mitzvah and text; "אשרי" finds the Shacharit and Mincha stations; a custom mitzvah's name finds it; the other keyboard layout and typos work for these too; Chok is absent before install.
    - [settings.search.render.test.tsx](src/app/__tests__/settings.search.render.test.tsx) opens a mitzvah, a text and a chapter (the reader lands on that section).

- [ ] Add bookmarks and the last reading position to the siddur reader
  - **Flag:** `OTA`.
  - **What it is:**
    - (1) **Stable segment keys:** [scripts/siddur/build.js](scripts/siddur/build.js) writes `key` on every `SiddurSegment`, a short hash of source id, source path and source segment index. The key survives day-dependent drops and rebuilds that keep the source. Chok sections get `parasha:day:heading` keys in [src/utils/chok.ts](src/utils/chok.ts).
    - (2) **Store:** a new store `useSiddurBookmarksStore` (`siddur-bookmarks-store`, MMKV, in `STORES` of [BackupService.ts](src/services/BackupService.ts), reset by [AppResetService.ts](src/services/AppResetService.ts)) holds:
      - `bookmarks: { id; textId; nusach; sectionTitle; segmentKey; label; createdAt }[]`, where `label` is the section title plus the segment's first three words;
      - `lastPositions: Record<textId, { nusach; sectionTitle; segmentKey; appDay: 'YYYY-MM-DD'; savedAt }>`.
    - (3) **Saving the last position:** the reader saves it 1 s after scrolling stops and on blur or background. Its anchor is the top visible segment, tracked by measuring each segment's `onLayout` inside its section item.
    - (4) **Toolbar:** a bookmark button that adds a bookmark at the current segment, with a toast "נוספה סימנייה", and a "סימניות" button that opens a `BottomSheet`:
      - its first row is always "המקום האחרון" (the place the user asked for, present whenever a last position exists for this text);
      - then this text's bookmarks, newest first, each with a delete action;
      - tapping a row jumps there: `scrollToIndex` to the section, then `scrollToOffset` by the segment's measured offset; when the key is gone, it falls back to the section top.
    - (5) **Resume banner:** opening a text with a last position shows a `Banner` "להמשיך מהמקום שבו עצרת?" with "המשך" and "מההתחלה":
      - for the daily texts (the mitzvah texts in `SIDDUR_TEXTS`), only when `appDay` equals today's app day;
      - for every other text (Tehillim, Tikkun HaKlali, Chok LeYisrael, the standalone texts), always.
      - Opening with a `section` param (search) skips the banner.
  - **What it solves:** Jumping straight to a chosen place in Tehillim, a prayer, Tikkun HaKlali or any text, and returning to where the user stopped.
  - **Expected result:**
    - Reader render tests: add a bookmark, list it, jump to it, delete it.
    - "המקום האחרון" appears after scrolling and returns to that segment.
    - The banner shows for Tehillim the next day but not for Shacharit the next day.
    - A key missing after a day change falls back to the section top.
    - The store is in the backup file.
    - A build test asserts every segment of every asset has a unique `key` within its text.
    - [src/app/AGENTS.md](src/app/AGENTS.md), [src/stores/AGENTS.md](src/stores/AGENTS.md) and [scripts/siddur/AGENTS.md](scripts/siddur/AGENTS.md) are updated.

- [ ] Add a user guide that stays current with every change
  - **Flag:** `OTA` — bundled content; the web copy ships with a push to `main`.
  - **What it is:**
    - (1) **One source:** `src/data/guide.ts`, an ordered list of topics. Each topic has `{ id, title: {he, en}, body: {he, en}[] (paragraphs), routes: string[], action?: { label: {he, en}, href } }`. `routes` names the screens it explains (e.g. `/mitzvot`, `/siddur/[id]`), and `action` adds an "open" button that takes the user there.
      - **Topics, in this order:**
        - getting started;
        - home and marking a mitzvah;
        - reminders and the reminder editor;
        - the mitzvot library and custom mitzvot;
        - Shabbat and Yom Tov (the quiet block and the check-in);
        - the siddur, with prayer mode, folds, auto-scroll, bookmarks and the last position;
        - Tehillim and Tikkun HaKlali;
        - Chok LeYisrael and its download;
        - history, the streak and the weekly report;
        - the schedule;
        - Rosh Chodesh and hilulot;
        - taharah, shown only when `taharahOffered()` holds;
        - settings: search, backup, restore and reset;
        - updates;
        - about and contact.
      - **Derived content:** lists that change with the app are read from their own homes at render, so they can never go stale: the mitzvot by group from `MITZVOT`, the siddur texts from `STANDALONE_TEXTS`, and the palettes from `THEME_NAMES`.
    - (2) **What's new:** `src/data/guide.ts` also exports `WHATS_NEW: { label: '<version>-<n>', date, items: {he, en}[] }[]`, newest first. The guide screen shows the latest three entries at its top.
    - (3) **The screen:** a new stack route `src/app/guide.tsx`, using `ScreenHeader`, with a `SettingsSection`-style collapsible `Card` per topic and the action as a `Button`. It opens from:
      - a More tab row "מדריך למשתמש" / "User guide" (icon `siddur`, or a new `guide` icon);
      - a link row in Settings › About and contact;
      - a settings-search route item.
    - (4) **Web copy:** `pnpm guide:build` (a new script under [scripts/](scripts)) renders the same source into `docs/guide/index.html` (Hebrew) and `docs/guide/en/index.html` (English), in the style of [docs/index.html](docs/index.html). The support page links to it. Add the pair to `mirrors` in [.claude/done-gate.json](.claude/done-gate.json).
    - (5) **Keeping it current, enforced rather than remembered:**
      - (a) [scripts/publish-update.js](scripts/publish-update.js) refuses to publish a production update unless `WHATS_NEW` has an entry whose label is the `<version>-<n>` it is about to publish. The message names the missing label. `--skip-whats-new` is allowed only for a rollback republish.
      - (b) A Jest test `guide.test.ts` fails when any screen file under [src/app/](src/app) (excluding layouts, redirects and onboarding) is named by no topic's `routes`. A new screen therefore cannot ship undocumented.
      - (c) The test also checks that every topic has non-empty Hebrew and English text and a unique id, and that `docs/guide/` matches what `pnpm guide:build` produces now (a stale web copy fails).
      - (d) Root [AGENTS.md](AGENTS.md) Common Change Checklist gains "User-visible change: update its topic in `src/data/guide.ts`, add the `WHATS_NEW` item, run `pnpm guide:build`". The batch rules above gain the same line under "Done means".
  - **What it solves:** Users get one place that explains every feature, and it cannot fall behind the app.
  - **Expected result:**
    - The guide opens from the More tab, from Settings and from search, in Hebrew and English.
    - Its mitzvot list matches the library.
    - The live page is at `https://jew-365.github.io/jew-365/guide/`.
    - `pnpm update:production` without a `WHATS_NEW` entry stops with a clear message.
    - Adding a dummy route without a topic fails `guide.test.ts`.
    - [routes.test.ts](src/app/__tests__/routes.test.ts) and [screens.smoke.render.test.tsx](src/app/__tests__/screens.smoke.render.test.tsx) gain `/guide`.
    - [docs/AGENTS.md](docs/AGENTS.md) lists the pages.

### Low — Requests of 2026-10-24

- [ ] Move Selichot out of the bundle into a downloadable add-on per nusach
  - **Flag:** `OTA` for the behaviour. The space comes back only with the next `Build`, because a binary keeps the assets it was built with until it is replaced.
  - **When:** after the direct-APK, R8 and Chok-compression tasks, and after the Selichot mitzvah task.
  - **What it is:**
    - **Why:** the four `selichot.siddur` assets are 5.5 MB of the 10 MB siddur (Ashkenaz 2.4, Chabad 1.6, Sefard 1.4, Edot HaMizrach 0.16), and they are read about 40 days a year.
    - (1) **Shared add-on code:** extract what [ChokContentService.ts](src/services/ChokContentService.ts), [chokFiles.ts](src/services/chokFiles.ts), [useChokStore.ts](src/stores/useChokStore.ts) and [ChokAddonCard.tsx](src/components/ChokAddonCard.tsx) do generically into one shared add-on core under `src/services/addons/`, plus a shared `AddonCard`, used by both add-ons:
      - manifest fetch, hash-verified download of `.gz` files, install and delete;
      - the launch reconcile and the version check;
      - the card itself.

      No second copy of the download code.
    - (2) **Build:** `pnpm siddur:build` writes the Selichot of each nusach to `docs/selichot/<nusach>.<hash>.siddur.gz` with a `docs/selichot/manifest.json`, and leaves them out of `assets/siddur` and `siddurAssets.generated.ts`.
    - (3) **The app:**
      - The `selichot` standalone text and mitzvah need the user's nusach file. Until it is installed, the mitzvah's window is `null` (as Chok's is), and the siddur tab row, the mitzvah screen and the More tab offer the download of that nusach only.
      - A nusach change offers the new nusach's file and deletes the old one after the new one installs.
      - From 7 days before the user's season starts (the same `selichotFlags()` dates), home shows a `Banner` "הסליחות מתחילות ב־%{date} · להוריד את הנוסח?" with a download button, until it is installed or dismissed for that season.
    - (4) **Store:** a new device-only store `useSelichotStore`, out of the backup file like `useChokStore`.
  - **What it solves:** The app stops carrying four nuschaot of Selichot for a text read a few weeks a year.
  - **Expected result:**
    - The bundle has no `selichot.siddur`, and the next build's APK and iOS app are about 5.5 MB smaller.
    - Tests for the shared core run against both add-ons.
    - Selichot appears and reads offline once downloaded, and is offered before the season.
    - The Chok add-on behaves exactly as before.
    - [scripts/siddur/AGENTS.md](scripts/siddur/AGENTS.md), [docs/AGENTS.md](docs/AGENTS.md) and [src/services/AGENTS.md](src/services/AGENTS.md) are updated.

- [ ] Push an update notice to closed apps (not urgent)
  - **Flag:** `Build`.
  - **Decision of 2026-10-24:** keep today's notice for now and move to push only when the user base calls for it. Today the hourly background task (`jew-365-daily-rebuild`) downloads a new update and presents a local `update:<id>` notification (`notifyIfUpdateReady()` in [NotificationScheduler.ts](src/services/NotificationScheduler.ts)). The OS decides when that task runs: within hours on Android, possibly days on iOS, and never after the user swipes the app away on iOS.
  - **What it is:** When the user asks to start:
    - **Native side:** add `@react-native-firebase/app` and `@react-native-firebase/messaging`, with Firebase config files for both platforms (APNs key in Firebase for iOS).
    - **Subscribing:** each install subscribes to the topic `updates-<runtimeVersion>` on launch, so no device token is stored anywhere.
    - **Sending:** [scripts/publish-update.js](scripts/publish-update.js) sends one FCM message to that topic after a production publish. It uses a service-account key held as a local env var, never in the repo.
    - **Receiving:** the message is data-only. The app downloads the update and presents the existing local notice, so the wording, the holy-block silence and the tap behaviour stay in one place.
    - **Privacy:** update the privacy policy and both stores' data-safety answers (the FCM instance id leaves the device) in [docs/](docs) and [release/](release).
  - **What it solves:** Users with the app closed hear about an update within minutes.
  - **Expected result:**
    - A test publish reaches a killed Android app and a swiped-away iPhone within 5 minutes, showing the same notice.
    - Nothing is sent during Shabbat or Yom Tov.
    - The policy and the store forms are updated.

- [ ] Publish the rav questions as a review page
  - **Flag:** no app release — a push to `main` publishes it on GitHub Pages.
  - **What it is:** `docs/halacha-review.html`, on the model of [docs/taharah-review.html](docs/taharah-review.html) (noindex, the same Formspree answer form with נכון / לא נכון and a note per item). It lists R1–R9 of [For the rav](#for-the-rav) with each rule as implemented and its source.
  - **What it solves:** The rav answers the batch's halachic choices in one place, as with the taharah rules.
  - **Expected result:** The page is live at `https://jew-365.github.io/jew-365/halacha-review.html` and listed in [docs/AGENTS.md](docs/AGENTS.md). Each answer comes back as a change to its one rule.

### High — Chok LeYisrael

Chok LeYisrael shipped as a downloadable add-on on 2026-10-23 (production update 1.0.21-1, content version 2): the text comes from the Torat Emet database (CC BY-NC-SA 2.5, the user's call on 2026-10-23), [scripts/chok/](scripts/chok) builds it from the committed source into [docs/chok/](docs/chok), and the app downloads it from GitHub Pages on request, from the mitzvah's screen or the More tab. Its decisions live in [scripts/chok/AGENTS.md](scripts/chok/AGENTS.md), [src/utils/AGENTS.md](src/utils/AGENTS.md) and [src/services/AGENTS.md](src/services/AGENTS.md).

Standing constraint: the app stays non-commercial (no ads, no paid tier) while it carries this text.

- [ ] Add Chok LeYisrael to the store listings
  - **What it is:** Once the add-on is live, mention it in the feature lists of [release/](release) (Hebrew and English, Play and App Store) and re-enter the copy in both consoles, with a [release/RELEASE_LOG.md](release/RELEASE_LOG.md) entry. The same pass brings in the mitzvot the 2026-10-24 batch added (bedtime Shema, Kiddush Levana, Selichot, Chanukah candles, Ushpizin) and the batch's other user-visible features: the listings and [docs/index.html](docs/index.html) still say "תשע מצוות תלויות זמן".
  - **What it solves:** The listings describe what the app does.
  - **Expected result:** Both consoles carry the new copy.
  - **Status 2026-10-25:** the copy in [release/](release) and [docs/index.html](docs/index.html) is rewritten to name kinds of features, so the batch's additions are covered; left: re-enter it in both consoles (the owner's approval) and a [RELEASE_LOG](release/RELEASE_LOG.md) entry.

- [ ] Restore Chok LeYisrael's learning-day window and let ליל שישי count for Thursday or Friday
  - **Flag:** `OTA`.
  - **What it is:** The user's call on 2026-10-25, replacing the same day's sunrise-to-sunset change (already merged in the working tree):
    - (1) **Window:** `CHOK_LEYISRAEL.computeWindow` in [src/data/mitzvot.ts](src/data/mitzvot.ts) goes back to the learning day: from alot to the next day's alot, or to candle lighting when a holy block opens that evening, `null` on Shabbat, Yom Tov, the Friday of a Vezot Haberakhah week and until the add-on is installed, exactly as before the sunrise-to-sunset change. Restore the tests and docs that change pinned (root [AGENTS.md](AGENTS.md) Mitzvah Data Model, [src/data/AGENTS.md](src/data/AGENTS.md), [src/utils/AGENTS.md](src/utils/AGENTS.md), [src/services/notifications/AGENTS.md](src/services/notifications/AGENTS.md)), keeping what the other tasks of the batch added since. The "פתח נוסח" of the Chok LeYisrael mitzvah opens the reader on its own learning day (no `date`), from the mitzvah screen and from home's card alike, so on Thursday night it opens ליל שישי.
    - (2) **ליל שישי can be marked:** today the ליל שישי portion has no "סיימתי" (`chokDoneDay()` in [src/utils/chok.ts](src/utils/chok.ts) returns `null` for `thuNight`). It gets one, and its mark files under the day the user learns it for: a new `useUserStore.chokThuNightDay: 'thu' | 'fri' | null`, `null` until the first "סיימתי" on ליל שישי, which opens a [BottomSheet](src/components/BottomSheet.tsx) asking `chok.thuNight.ask` "לאיזה יום לרשום את ליל שישי?" / "Which day does ליל שישי count for?" with `chok.thuNight.thu` "יום חמישי" / "Thursday" and `chok.thuNight.fri` "יום שישי" / "Friday"; the answer is saved and the mark filed. The same choice is a `ChipRow` in Settings → Prayer → reading (`settings.chokThuNightDay` "ליל שישי נרשם ל־", anchor and search item, the way `chokDoubleChoice` is offered). With `thu`, ליל שישי marks Thursday (as the Thursday portion does); with `fri`, it marks Friday ahead of Friday's window, so Friday's reminders are dropped as for any completed day. The Thursday and Friday portions themselves keep their own "סיימתי". The choice is in the backup file with the rest of the user store and reset with it.
  - **What it solves:** Chok LeYisrael tracks the learning day as before, and a user who learns ליל שישי on Thursday night gets it counted for the day they learn it for.
  - **Expected result:** Window tests under `pnpm test:tz` (Jerusalem and Los Angeles): a weekday runs alot to the next alot, a Friday alot to candle lighting, Shabbat none. Reader render tests: on Thursday 21:00 the reader opens ליל שישי with "סיימתי"; the first press asks the day; with "יום חמישי" the mark files under Thursday's key, with "יום שישי" under Friday's and no Friday reminder is planned; the second press asks nothing; changing the Settings chips changes where the next mark goes. Home's card "פתח נוסח" on Thursday night opens ליל שישי. The emulator check is the orchestrator's.

- [ ] Ask to turn on Chok LeYisrael right after its download
  - **Flag:** `OTA`.
  - **What it is:** The user's call on 2026-10-25: when a download of the Chok LeYisrael add-on ends in an install and the `chok_leyisrael` mitzvah is off, a [ConfirmDialog](src/components/ConfirmDialog.tsx) asks whether to turn it on. Title `chok.enablePrompt.title` "חק לישראל הותקן" / "Chok LeYisrael is installed"; body `chok.enablePrompt.body` "האם להפעיל התראות ומעקב אחרי המצווה?" / "Turn on reminders and tracking for this mitzvah?"; confirm `common.yes` "כן" / "Yes" (reuse the key if it exists, else add it); cancel `common.no` "לא" / "No". "כן" switches the mitzvah on through the store's guarded path (`setEnabled` / `canEnable` in [useMitzvotStore.ts](src/stores/useMitzvotStore.ts)), so it gets its default 09:00 reminder and `enabledAt` now; "לא" only closes. The dialog shows wherever the download was started (the mitzvah screen's add-on card, the More tab's Chok row, the library row if it starts one), even when the user moved to another screen meanwhile, so the prompt lives in one home: a pending flag the download action raises in [useChokStore.ts](src/stores/useChokStore.ts) (memory only, not persisted) and one prompt component mounted once by the root layout. It is not shown after a content-update download, after a download that fails, or when the mitzvah is already on.
  - **What it solves:** A user who downloads the text is offered tracking at once, instead of finding the switch.
  - **Expected result:** Render tests: a finished first download with the mitzvah off shows the dialog; "כן" turns it on with its default reminder and `enabledAt`; "לא" leaves it off and the dialog does not come back; no dialog after an update download, a failed download, or with the mitzvah already on; the dialog appears when the download finishes after navigating away. On the Android emulator: download from the More tab, answer "כן", the mitzvah screen shows it on with the 09:00 reminder scheduled.

### Medium — Chok LeYisrael source defects

- [ ] Decide on the Torat Emet text defects
  - **What it is:** The 2026-10-23 cross-check against the old raktora text found defects in Torat Emet itself: the Onkelos of Numbers 26:22 and 31:44 lacks "וַחֲמֵשׁ מְאָה", two words are run together in Numbers 2:12 (צוּרִישַׁדָּֽי) and 7:54 (פְּדָהצֽוּר), the Onkelos of Leviticus 4:5 reads וְיִםַב for וְיִסַב, and spacing glitches remain in the Onkelos of Leviticus 4:7 and 4:34. The build fixes markup by rule only, never text. Options: report them to Torat Emet, or add a reviewed text-patch list to the build.
  - **What it solves:** A reader of those verses sees the correct text.
  - **Expected result:** The user's decision, and either a sent report or a patch list with tests.

### Low — Chok LeYisrael follow-ups

- [ ] Watch for an App Review note on the add-on's storage
  - **What it is:** The add-on keeps about 5 MB of re-downloadable text in the app's Documents folder (stored gzipped since the 2026-10-24 batch; an install made before it holds 18.6 MB until the next content version), which rides the iCloud device backup; Apple's storage guidelines prefer such data outside it, and expo-file-system 19 has no exclude-from-backup flag. If App Review objects, move it to `Paths.cache` (the launch reconcile already turns a purge into "download again").
  - **What it solves:** Keeps the iOS submission from stalling on storage.
  - **Expected result:** Either no objection, or the folder moved in one change.

## Bugs

- [ ] Apply the gender defaults in a headless launch too
  - **Flag:** `OTA`.
  - **What it is:** Found by the phase-2 verifier on 2026-10-25. `applyGenderDefaultsToNew()` ([taharahOptIn.ts](src/stores/taharahOptIn.ts)) switches off, for a user whose gender is `female`, the ids in `MENS_MITZVOT` that the mitzvot store's hydrate just added (`addedOnHydrate`). Only the root layout calls it. On Android the first start after an OTA can be a headless background task (the hourly rebuild or a notification action), which loads [index.js](index.js) and [NotificationScheduler.ts](src/services/NotificationScheduler.ts) but never the layout, so a newly registered men's mitzvah (Kiddush Levana) is on in memory, gets scheduled for a woman, and, when the persisted payload's version differs, is persisted on, so the next foreground hydrate no longer counts it as added. Change: call it from a module loaded on every launch, after both the user store and the mitzvot store have hydrated (MMKV hydrates synchronously; confirm), once per process; the layout call stays harmless or goes.
  - **What it solves:** A woman never gets a men's mitzvah switched on by an update, whichever way the app starts.
  - **Expected result:** A test that loads the scheduler module the way a headless launch does (no layout) with a saved female profile and a mitzvot map lacking a men's default-on id leaves that id off and schedules nothing for it; the foreground path still passes.

- [ ] Word Rosh Chodesh and hilula notices by when they actually fire
  - **Flag:** `OTA`.
  - **What it is:** Found by the phase-2 verifier on 2026-10-25. Each notice kind's time is now configurable ("Make every Rosh Chodesh and hilula notice configurable"), but its text still assumes the default time: a Rosh Chodesh `before` notice set to 1 day at 20:00 fires after the month has begun at shkia and still says "מחר"; a hilula `evening` notice set to 22:00 fires after the date opened and still says it "enters tonight at sunset"; a one-day Rosh Chodesh `day` notice at 23:00 is fine. Change: [planners/roshChodesh.ts](src/services/notifications/planners/roshChodesh.ts) and [planners/hilulot.ts](src/services/notifications/planners/hilulot.ts) choose each notice's body from where its trigger falls against the event: before the opening shkia, the coming wording (tomorrow, tonight, on a weekday); at or after it, the present wording ("היום ראש חודש …", "הלילה ההילולא של …"); add the keys both dictionaries need. Also fix the English date phrase "begins Tuesday, Oct 13 evening" to read "begins on the evening of Tuesday, Oct 13", and make root [AGENTS.md](AGENTS.md) (Notification Engine) say that `roshChodeshOn` carries the date when the month enters seven or more days after the erev.
  - **What it solves:** A notice never tells the user something that is already past.
  - **Expected result:** Planner tests for each kind at a time before and after its event's opening, in Hebrew and English, under `pnpm test:tz`.

- [ ] Keep an ended streak's count on a save that does not change it
  - **Flag:** `OTA`.
  - **What it is:** Found by the phase-2 verifier on 2026-10-25. Saving the custom form on an ended `streak` mitzvah restarts the streak from today even when only the name, hours or reminders changed. The rule ("Add schedule modes to the custom mitzvah model", now shipped) is that a streak's count restarts only when `days` or the mode changes; editing anything else keeps the schedule entry as it is. Change [src/app/custom-mitzvah.tsx](src/app/custom-mitzvah.tsx) and its helper so a save appends a new schedule entry only when the schedule itself changed; an ended streak saved unchanged stays ended (and off), and the form's summary line says so.
  - **What it solves:** A rename never silently restarts a finished streak.
  - **Expected result:** Render tests: an ended streak renamed stays ended with its old dates; changing its `days` restarts it from today; a running streak renamed keeps its start.

- [ ] A custom mitzvah whose hours lie between midnight and alot is counted on two different days
  - **Flag:** `OTA`.
  - **What it is:** Found on the Android emulator on 2026-10-25. The custom adapter puts a custom mitzvah's hours on the civil date it is asked for ([customMitzvotAdapter.ts](src/data/customMitzvotAdapter.ts)), so hours of 03:29–03:31 asked for Sunday give a window early on Sunday, before Sunday's alot. The app's day turns at alot (the night belongs to the evening before, the user's call of 2026-10-12), so that window shows on Saturday's home and its mark is filed under `2026-10-25`, while the day view and history read `2026-10-25` as Sunday's: Saturday's day view lists it "לא בוצע", Sunday's lists it done, and Sunday's home counts it as still to come (it shows Monday's 03:29 window). Change: for app day D, a custom mitzvah whose window would start before alot of its civil date takes its hours on civil date D + 1 and is keyed under D, so a night window always belongs to the evening before and every surface reads one day for it; `activeDays` and schedules apply to D.
  - **What it solves:** A night custom mitzvah is done or missed on one day everywhere: home, the day view, history, the streak and its notifications.
  - **Expected result:** A test with hours 03:29–03:31 in Jerusalem, at an instant before and after alot, shows the same day key on home, the day view, `computeStats()` and the planner's ids, under `pnpm test:tz`; a mark between midnight and alot counts for the previous day in history.

- [ ] Typing a time by hand inside a bottom sheet does nothing on Android
  - **Flag:** `OTA`.
  - **What it is:** Found on the Android emulator on 2026-10-25, older than the 2026-10-24 batch. In the manual-entry box of [TimeField.tsx](src/components/TimeField.tsx) inside a [BottomSheet](src/components/BottomSheet.tsx), neither typing nor backspace changes the time (the IME is connected; the wheels work). It hits the Rosh Chodesh and hilula notice sheets and the custom form's start and end times. The same field outside a sheet, and every field on web, types normally.
  - **What it solves:** A time can be typed, not only scrolled, in every sheet.
  - **Expected result:** On the emulator, typing 21:15 into the notice sheet and the custom form's start time saves 21:15; a render test pins whatever caused it (for example a controlled value reset or a responder that steals the touch).

- [ ] A mitzvah added today reads 0% in history
  - **Flag:** `OTA`.
  - **What it is:** Found on 2026-10-25. History's per-mitzvah row shows "0%" with an empty bar for a mitzvah switched on (by hand or by an update) today, while its only item is still open. Nothing is counted as missed, but the row reads like a failure. Change: a row with no decided item shows no percent and no bar, and a caption that it is new (an i18n key in both dictionaries), in [history.tsx](<src/app/(tabs)/history.tsx>) through the existing stats.
  - **What it solves:** A new mitzvah does not look failed on its first day.
  - **Expected result:** A render test on a pinned day: a mitzvah enabled today shows the caption and no 0%; the next day, after one done and one missed, it shows 50%.

- [ ] Schedule a mitzvah that an update switches on, without relying on a format raise
  - **Flag:** `OTA`.
  - **What it is:** Found on 2026-10-25. A new default-on mitzvah reaches an install through the mitzvot store's hydrate `merge` (`addedOnHydrate`), which runs before the scheduler subscribes to the store, so its reminders exist only because the same update raises `SCHEDULE_FORMAT`. A later default-on mitzvah shipped without a raise gets no reminders until the nightly rebuild. Change: `refreshSchedulingOnForeground()` in [NotificationScheduler.ts](src/services/NotificationScheduler.ts) also rebuilds once when the hydrate added any id.
  - **What it solves:** Every newly added mitzvah is scheduled on the first foreground after the update.
  - **Expected result:** A scheduler test: a hydrate that adds an id, with the stored format already current, leads to one rebuild that schedules it.

- [ ] The calendar range shading is barely visible
  - **Flag:** `OTA`.
  - **What it is:** Found on 2026-10-25. [CalendarRangePicker.tsx](src/components/CalendarRangePicker.tsx) shades the days inside a range with `goldWash` (0.04 alpha on the gold palette), which barely shows on the sheet. Use `goldWashStrong` there, and check every palette.
  - **What it solves:** The chosen range is visible.
  - **Expected result:** Web screenshots of a picked range in all six palettes.

- [ ] Keep a typed reminder label on Chanukah candles
  - **Flag:** `OTA`.
  - **What it is:** Found by the phase-3 verifier on 2026-10-25. For a mitzvah with `bodyKey` and `bodyParams` (Chanukah candles, and Ushpizin once it lands), `bodyForReminder()` in [planners/mitzvot.ts](src/services/notifications/planners/mitzvot.ts) replaces a Hebrew reminder text that has no placeholder with the keyed line ("זמן נרות חנוכה: הנר ה־N"), so a label the user typed on an added reminder is lost. Change: the keyed line stands in only for the registry's own default label and variants; a label the user typed is sent as typed (its `%{n}` filled when present).
  - **What it solves:** A reminder says what the user wrote.
  - **Expected result:** Planner tests: the default reminder names the night; an added reminder labelled "להכין חנוכייה" sends exactly that; one labelled "נר %{n}" sends the night's number.

- [ ] Open the Chanukah text in the siddur tab from the mitzvah's own start
  - **Flag:** `OTA`.
  - **What it is:** Found by the phase-3 verifier on 2026-10-25. The siddur tab's now card lists the Chanukah candle-lighting text only from nightfall (`TONIGHT_TO_DAWN` in [src/data/siddur.ts](src/data/siddur.ts)), while the mitzvah's window starts earlier on Friday (plag hamincha) and for Chabad (shkia). The batch rule is that the siddur tab and the mitzvah agree. Change: the text's hours read the mitzvah's window for that night (one home), so the now card shows it whenever the mitzvah is open.
  - **What it solves:** On Friday afternoon and for Chabad at shkia, the text is in the now card when the reminder fires.
  - **Expected result:** Tests on a Chanukah Friday at plag + 10 min and a Chabad weekday at shkia + 5 min: the now card lists the text; at 13:00 it does not.

- [ ] Show a night custom text's Hebrew date by the night, not the evening's day
  - **Flag:** `OTA`.
  - **What it is:** Found by the phase-3 verifier on 2026-10-25. Since a custom mitzvah whose hours lie between midnight and alot belongs to the evening before (fixed in the same batch), the reader opened from its notification or mitzvah screen at night shows the Hebrew date of that evening's daytime (9 Sivan at 00:45 on the night of 10 Sivan). Change: the reader takes the Hebrew date of the instant it shows a night window for (sunset turns the date), through the existing Hebrew date helpers.
  - **What it solves:** The header names the right Hebrew date at night.
  - **Expected result:** A reader render test at 00:45 on a night custom window shows the night's Hebrew date.

- [ ] Show a number pad for minutes and offsets on Android
  - **Flag:** `OTA`.
  - **What it is:** Found on 2026-10-25. The reminder editor's offset field ([ReminderEditor.tsx](src/components/ReminderEditor.tsx)) and a field of the taharah log ([src/app/taharah/log.tsx](src/app/taharah/log.tsx)) use `keyboardType="numbers-and-punctuation"`, which exists only on iOS, so Android shows a letter keyboard. Change: on Android use `numeric` (it keeps the minus key, which negative offsets need), iOS unchanged.
  - **What it solves:** Typing minutes on Android opens the number pad.
  - **Expected result:** Render tests pin the keyboard type per platform; on the emulator the offset field opens the number pad and a −60 offset saves.

- [ ] Grey Kiddush Levana in Settings search after its period ends
  - **Flag:** `OTA`.
  - **What it is:** Found on 2026-10-25. [settingsSearch.ts](src/utils/settingsSearch.ts) decides whether a standalone text is open with `hasStandaloneText()` alone, so between the end of the Kiddush Levana period and alot the search shows the text as open while the siddur tab greys it and the reader refuses it. Change: the search uses `standalonePeriodEnded()` ([src/data/siddur.ts](src/data/siddur.ts)) the same way the siddur tab and the reader do.
  - **What it solves:** The three surfaces agree on when the text can be opened.
  - **Expected result:** A settingsSearch test at 04:00 on the last night of a period (Ashkenaz, Jerusalem) shows the text closed with its caption; at 03:00 it is open.

- [ ] Stamp the default mitzvot of a fresh install with its first launch
  - **Flag:** `OTA`.
  - **What it is:** Found on the Android emulator on 2026-10-25 (older than the 2026-10-24 batch). A fresh install's five original default-on mitzvot carry no `enabledAt`, and `wasEnabledBy()` ([checkIn.ts](src/utils/checkIn.ts)) reads a missing value as "always enabled", so a user who installs on a Sunday is sent straight to "מה עשית בשבת?" for the Shabbat before the install, and history can count days before it. Change: the mitzvot store stamps `enabledAt` with the first launch on every default-on id of a fresh install (no persisted map), in the one place the hydrate already stamps ids it adds ([useMitzvotStore.ts](src/stores/useMitzvotStore.ts)); an existing install's saved map is untouched.
  - **What it solves:** A new user is never asked about days before the app existed on the phone.
  - **Expected result:** A store test: a fresh hydrate stamps all default-on ids with now; a saved map without `enabledAt` keeps it missing. A check-in test: a fresh install on Sunday after Shabbat has no check-in for that Shabbat.

- [ ] Withdraw reminders of a day that has ended
  - **Flag:** `OTA`.
  - **What it is:** Found on the Android emulator on 2026-10-25. A presented reminder of a window that closed unmarked stays in the tray for good, and Android caps an app at about 50 notifications in the tray: after a few days of unmarked reminders, new reminders are dropped with no sign ("Package has already posted or enqueued 51 notifications"). Change: on every foreground and every background rebuild, the scheduler dismisses presented mitzvah reminders whose window's app day has ended (its `dateKey` day is over by the alot that ends it, `appDayEnd()`); a mark-done from the tray before that keeps working as today. Non-mitzvah notices (update, check-in, report, hilula, Rosh Chodesh, taharah) keep their own rules.
  - **What it solves:** The tray never fills up with stale reminders, so new ones always arrive.
  - **Expected result:** A scheduler test with presented reminders of yesterday and today: after a foreground refresh past yesterday's app day end, yesterday's are dismissed and today's stay. Documented in [src/services/notifications/AGENTS.md](src/services/notifications/AGENTS.md).

- [ ] Keep the bookmark's delete button outside its row's button
  - **Flag:** `OTA`.
  - **What it is:** Found on 2026-10-25. In the reader's bookmarks sheet, each row's delete control is a pressable nested inside the row's pressable: on web React warns that a `<button>` sits inside a `<button>`, and on iOS VoiceOver the nested button may not be reachable (the row takes its label). Change: the row and its delete control are siblings in one row container (the shared `ListRow` trailing slot, if it fits), each with its own role and label.
  - **What it solves:** Screen readers reach the delete button, and the web build has no invalid nesting.
  - **Expected result:** A reader render test finds the row and its delete button as separate buttons with their own labels; the web console warning is gone.

- [ ] Close the custom mitzvah form after save even when it was opened by a link
  - **Flag:** `OTA`.
  - **What it is:** Found on 2026-10-25. [custom-mitzvah.tsx](src/app/custom-mitzvah.tsx) calls `router.back()` after save without `canGoBack()`, so a form opened by a deep link (or as the first screen) stays open and the router logs "GO_BACK was not handled". Change: go back when possible, else replace to the library (`/mitzvot`).
  - **What it solves:** Saving always leaves the form.
  - **Expected result:** A render test with `canGoBack()` false: saving replaces to `/mitzvot`.

- [ ] Name the right Chanukah night in the reader's header
  - **Flag:** `OTA`.
  - **What it is:** Found on the Android emulator on 2026-10-25 (the same line exists before the 2026-10-24 batch). The reader's header takes the holiday line from `getHolidays()` for the night's Hebrew day ([src/app/siddur/[id].tsx](<src/app/siddur/[id].tsx>)), and hebcal labels each Chanukah day by the candles lit at its end, so on the first night (Friday 2026-12-04, the eve of 25 Kislev) the header says "חֲנוּכָּה: ב׳ נֵרוֹת" while the reminder says "הנר ה־1". Change: the header names the candles of the evening the text is read for (the civil day whose evening it is, the same night count `bodyParams` gives the reminder), one home for the count.
  - **What it solves:** The header and the reminder agree on the night.
  - **Expected result:** A reader render test on the evening of 2026-12-04 and of 2026-12-07 names the 1st and the 4th candle.

- [ ] Refuse a malformed reminder offset instead of saving zero
  - **Flag:** `OTA`.
  - **What it is:** Found on the Android emulator on 2026-10-25. [ReminderEditor.tsx](src/components/ReminderEditor.tsx) reads the offset with `Number(x) || 0`, so a typo such as "-60-600" saves silently as +0. Change: a value that is not a whole number shows the existing range error (or a new `reminder.errors.offsetInvalid` in both dictionaries) and does not save.
  - **What it solves:** A typo never turns into a reminder at the window's start.
  - **Expected result:** A render test: "-60-600" shows the error and saves nothing; "-60" saves −60.

- [ ] Keep a list row's switch reachable by screen readers
  - **Flag:** `OTA`.
  - **What it is:** Found in review on 2026-10-25. [ListRow.tsx](src/components/ListRow.tsx) draws its `trailing` element inside its own `Pressable`, which is accessible by default and so takes the whole row as one element. The mitzvah switches of [MitzvahLibraryList.tsx](src/components/MitzvahLibraryList.tsx), the notice switches of [NoticeSettingsCard.tsx](src/components/NoticeSettingsCard.tsx) and the master switches of [hilulot.tsx](src/app/hilulot.tsx) and [rosh-chodesh.tsx](src/app/rosh-chodesh.tsx) sit there, so iOS VoiceOver may never reach them, and on web a form control sits inside a `<button>`. Change: when `trailing` is given, the row is a plain container holding the pressable part (icon, title, caption) and the trailing element as siblings, each its own accessible element; a row without `trailing` keeps today's single `Pressable`. The web click guard (`keepClickOffRow`) goes away with the nesting.
  - **What it solves:** Every switch in a list row is reachable and named for VoiceOver and TalkBack, and the web build holds no control inside a button.
  - **Expected result:** A `ListRow` render test: with an `onPress` and a `Switch` as `trailing`, the row button and the switch are separate accessible elements, pressing the switch does not call `onPress`, and pressing the row does not toggle the switch; without `trailing` the row is one button as today. The library, notice-settings, hilulot and Rosh Chodesh suites stay green. A VoiceOver pass on TestFlight is the owner's.

- [ ] Make the Chok LeYisrael enable-prompt case of the download suite deterministic
  - **Flag:** `OTA` (test only).
  - **What it is:** Found on 2026-10-25: the `ChokEnablePrompt` case of [ChokContentService.test.ts](src/services/__tests__/ChokContentService.test.ts) failed once in a full parallel `pnpm test` run and passed alone and on the re-run. Find what it waits on (a timer, a store subscription or a promise not awaited) and make it wait for the state it asserts. Run it after the Selichot add-on task, which moves that download code into the shared add-on core.
  - **What it solves:** The gate never fails at random on that case.
  - **Expected result:** The suite passes 20 runs in a row under `pnpm test -- --runInBand` and under the default parallel run.

## Open Questions

### For the rav

Every halachic rule and zman of the 2026-10-24 batch, implemented as written until a rav answers (the user's call, 2026-10-24). The task "Publish the rav questions as a review page" puts them on a page with an answer form. Each answer changes one rule.

- **R1 — Kiddush Levana period.**
  - **Question:** When does Kiddush Levana start and end?
  - **Assumption:** It starts 3 days after the molad (Ashkenaz) or 7 days after it (Sefard, Edot HaMizrach, Chabad). It ends 14 days 18 h 22 m after the molad (Ashkenaz, Sefard, Chabad) or 15 days after it (Edot HaMizrach). Said at night, not on Shabbat or Yom Tov nights (the app keeps one window from the first such night to the period's end, so the mitzvah stays on home by day too until it is marked, and its reminders fire only at nightfall and after a holy block's exit). In Tishrei after Yom Kippur, in Av after Tisha B'Av. Women do not say it.
  - **Lives in:** `kiddushLevanaPeriod()` in [src/utils/siddur.ts](src/utils/siddur.ts).
- **R2 — Selichot.**
  - **Question:** Are the seasons and the hours right?
  - **Assumption:** Edot HaMizrach from 2 Elul; the other nuschaot from leil Selichot (at least four days before Rosh Hashana); all through 9 Tishrei, not on Shabbat or Yom Tov. Said from chatzot halayla to sof zman tefila.
  - **Lives in:** `selichotFlags()` in [src/utils/siddur.ts](src/utils/siddur.ts) and `MIDNIGHT_TO_MORNING_PRAYER` in [src/data/siddur.ts](src/data/siddur.ts).
- **R3 — Bedtime Shema.**
  - **Question:** What is its window?
  - **Assumption:** From tzeit to alot, ideally before chatzot halayla.
  - **Lives in:** the `krias_shma_al_hamita` entry in [src/data/mitzvot.ts](src/data/mitzvot.ts).
- **R4 — Chanukah candles.**
  - **Question:** When are the candles lit each night?
  - **Assumption:** A weekday from tzeit (Ashkenaz, Sefard, Edot HaMizrach) or from shkia (Chabad), until alot. Friday from plag hamincha to the Shabbat candle lighting. Motzaei Shabbat from the block exit (tzeit + 10 min).
  - **Lives in:** the `chanukah_candles` entry.
- **R5 — Ushpizin.**
  - **Question:** Which nights, which guest each night, and does Chabad say it?
  - **Assumption:** Each of the seven nights of Sukkot, before entering the sukkah, from tzeit to alot. The order is Avraham, Yitzchak, Yaakov, Moshe, Aharon, Yosef, David. Chabad custom does not recite the "עולו אושפיזין" formula, so Chabad is not offered it.
  - **Lives in:** the `ushpizin` entry and its manifest entry.
- **R6 — Maariv.**
  - **Question:** Until when may Maariv be prayed?
  - **Assumption:** From tzeit until alot, ideally before chatzot.
  - **Lives in:** maariv's `computeWindow`.
- **R7 — Birchot hashachar.**
  - **Question:** Until when may birchot hashachar be said?
  - **Assumption:** From alot until chatzot hayom (it was sof zman Shema).
  - **Lives in:** birchot_hashachar's `computeWindow`.
- **R8 — Women's liturgy.**
  - **Question:** What does a woman say differently?
  - **Assumption:**
    - "שעשני כרצונו": with shem umalchut in Ashkenaz, Sefard and Chabad; without it in Edot HaMizrach.
    - "גויה / שפחה" in Edot HaMizrach only; "גוי / עבד" elsewhere.
    - The feminine forms of הריני מוכנה, מקבלת, מוחלת, מזמנת, מקשרת, באה, מכוונת.
    - Edot HaMizrach women count the Omer and say Hallel without a blessing.
    - "ועל בריתך… ועל תורתך" in Birkat HaMazon is unchanged.
    - Tallit and tefillin blessings are not shown to women.
  - **Lives in:** the voice patches in [scripts/siddur/manifest.js](scripts/siddur/manifest.js).
- **R9 — Edot HaMizrach candle lighting for a man.**
  - **Question:** What does a man read when he lights?
  - **Assumption:** He reads the woman-voiced text in the masculine: הריני נותן, "על אשתי".
  - **Lives in:** the same voice patches.
- **R10 — Ushpizin text and who is offered it.**
  - **Question:** Are the text, its hours and its audience right?
  - **Assumption:**
    - An evening text, from the afternoon before each night through that night, so a day meal of day N shows night N+1's guest and Hoshana Rabba day has it closed (Daat and Torat Emet print "ובכל יום קודם סעודתו").
    - In the Yehi Ratzon "לְעַבְדֶּךָ (פב"פ) אֲמָתֶךָ" names the mother; a woman reads "שֶׁאֲנִי מְקַיֵּם" and "לְעַבְדֶּךָ" as printed.
    - Women are offered it, on by default.
    - Sefard is Torat Emet, Hebrew only, without the "עולו אושפיזין … ליעול" passage that Metsudah Shabbat and Edot HaMizrach print; the prayers on leaving the sukkah and Edot's Zohar for the sukkah meal are left out.
    - The Ashkenaz and Sefard texts say "תיבו אושפיזין", not "עולו", so R5's reason for leaving Chabad out wants checking against the Chabad custom itself.
  - **Lives in:** `ushpizin` in `STANDALONE_TEXTS` ([src/data/siddur.ts](src/data/siddur.ts)), `ashkenazUshpizin()`, `sefardUshpizin()` and `edotUshpizin()` in [scripts/siddur/manifest.js](scripts/siddur/manifest.js), and `MENS_MITZVOT` in [src/stores/taharahOptIn.ts](src/stores/taharahOptIn.ts).

## Other Open Items

- **Release order for the 2026-10-24 batch.** Push `docs/` to `main` and confirm it is live before the OTA: the new bundle refuses a Chok manifest without `gz` (`curl -s https://jew-365.github.io/jew-365/chok/manifest.json` must show `gz` and `gzipBytes`, and `curl -sI` on one `.json.gz` must show `application/gzip` with no `Content-Encoding`), and the "Delete your data" link opens the privacy policy, whose Settings path changed with the batch. The About and contact store row opens the Play and App Store pages, which answer 404 until the app is public.

- **A fresh install's first session runs the build's own bundle.** The fix that stamps a fresh install's default mitzvot with its first launch (so a new user is never asked about the Shabbat before the install) is in the JavaScript bundle, but `updates` in [app.json](app.json) sets no `fallbackToCacheTimeout`, so a new install of build 1.0.21 first launches the bundle embedded in the build, which stamps nothing, and a user who onboards in that first session keeps an unstamped map. The fix reaches every new user only once a native build carries it. Until then, a user installing on a Sunday may still see the check-in for the Shabbat before the install. The emulator check of that fix runs a dev-client bundle from Metro, not the EAS APK plus an update.

- **Send the rav the review page.** After the push to `main` publishes [docs/halacha-review.html](docs/halacha-review.html), confirm `curl -sI https://jew-365.github.io/jew-365/halacha-review.html` answers 200, then send the rav its link (the owner's step; no real submit was tried, because a submit emails 365jew through Formspree `xwlvgagp`). Each answer that is not "נכון" becomes a change to that one rule and a new `RULES_VERSION`.

- **Every project account moves to 365jew@gmail.com** (the user's call, 2026-10-20). Done in the repo: `CONTACT_EMAIL` in [ContactService.ts](src/services/ContactService.ts), the support page, both privacy policies and the taharah review page; `CONTACT_FORM_ID` is the new Formspree form `mrpevdbk` on 365jew; this repo's local `git config user.email`; `owner` in [app.json](app.json) is `jew-365-org`; `credentials.json`, `credentials/` and `*.keystore` gitignored; `origin` and every Pages URL moved to the GitHub organization `jew-365` (`https://jew-365.github.io/jew-365/`, all four pages answer 200; the old address is dead). The 88 earlier commits keep avi6190i@gmail.com (no history rewrite, the user's call). Done by the user: the Formspree account and form on 365jew, and the old form `xyekordk` retargeted to 365jew as a linked email (kept alive until no install of the previous app remains, because its update 1.0.19-2 posts to it); the GitHub organization `jew-365` with 365jew as its email, 365jew verified on the personal account, `jew-365` transferred to it; 2-Step Verification, a passkey, a verified recovery email and offline backup codes on 365jew; the Expo user `jew-365` on 365jew, Owner of the organization `jew-365-org`, which owns the project now (`@jew-365-org/jew-365`, same project ID, so updates still reach build 1.0.20, which moved with it), its stored keystore read again after the move with the same SHA-256, `avraham-sason` removed from the organization and 2FA on the Expo user `jew-365`; 365jew an admin of the Play Console, which stays owned by avi6190i (the user's call: moving the ownership would repeat the identity verification); a backup of the Android keystore from `eas credentials -p android`, encrypted into `jew365-keystore.tar.gz.enc` (AES-256-CBC, PBKDF2 600000 iterations, SHA-256; the plain folder deleted only after a decrypted copy matched it) and uploaded to the Google Drive of 365jew, its passphrase kept outside that account; the key's SHA-256 is `DC:62:0E:28:E9:67:30:98:E8:90:88:B7:09:FB:6D:B8:F9:C0:B1:E6:80:D9:52:60:3B:A8:9C:F4:3B:AE:00:B4`; 365jew as the contact email of the Play store listing and the owner of the testers group (2026-10-20). Left for the user: `com.jew365.app` registered in the Play Console with the SHA-256 above for Android developer verification, which from 2027 covers the direct APK too; Sentry and the Apple Developer account opened on 365jew; the empty `@avraham-sason/jew-360` Expo project deleted.
- **iOS 1.0.21 is in App Store review, manual release.** EAS build `72c51b1e` (buildNumber 4) was submitted on 2026-10-23 with every App Store Connect page filled ([release/APP_STORE_METADATA_EN.md](release/APP_STORE_METADATA_EN.md), [release/RELEASE_LOG.md](release/RELEASE_LOG.md)); after approval it waits for the owner's Release. Before releasing: the TestFlight checks on a real iPhone (public link https://testflight.apple.com/join/cZeSqPzG, live since the Beta App Review passed on 2026-10-23). Still open: the EU trader status. Trader chosen, email and phone verified; the identification documents (no Hebrew accepted) wait for the owner's passport, and until they are in, the app is not offered in the EU storefronts. iOS builds and submissions run as `npx eas-cli@latest …`, because the project's eas-cli failed the Apple login.
- **Moving the previous app's users.** The previous app is a different package, so its installs get nothing from this project. Each user exports a backup file in Settings there (only the previous app's 1.0.19 build can export), installs this app, restores the file on the welcome step, checks the data, and uninstalls the previous app: while both are installed, both send reminders. The taharah data does not move, by design. The previous EAS project stays until no install depends on it; deleting it on expo.dev is the user's step.
- **Families policy for the 13-15 audience.** Play's target audience is 13-15, 16-17 and 18+ (the user's call, 2026-10-20, because tefillin start at 13), so wherever 13-15 count as children (parts of the EU under GDPR) the Families policy applies: content fit for children and COPPA / GDPR rules for any data a child sends. The Contact us form sends a name and phone number through Formspree; before production, either confirm that flow complies or add a neutral age question before the form, and keep Sentry free of personal data. The 18+ alone answer removed the Families notice, which the user weighed and declined.
- **Google Play closed test, then production** (the user's call, 2026-10-20: upload now, with the icon and UI redesign arriving during the test). The Play Console stays owned by avi6190i, so it is a personal account and needs a closed test with at least 12 testers opted in for 14 days in a row before production; a new build does not restart the count, dropping under 12 testers does. Play App Signing uses the EAS keystore itself, so a direct APK and a Play install are signed alike and replace each other: Play had generated its own key (SHA-256 `47:2D:E3:57…`) when the app was created, and on 2026-10-21, before any release, it was replaced through PEPK by the EAS key `DC:62…00:B4`, which is also the upload key. EAS build `3753424b` (1.0.20, versionCode 3, the old icon) was never uploaded: on 2026-10-21 the user chose to ship the redesign first, so the first AAB is EAS build `cc56fee1` (1.0.21, versionCode 8) from a clean worktree of `11be1c8`, with the APK `d54afeab` (versionCode 9) beside it for direct installs. Never uploaded: the 1.0.20 pair (`a0d84bad`, `811bbbb9`), which cropped the launcher icon, and the first 1.0.21 pair (`0b2ddd8f`, `e2682ebc`), whose icon lacked the four symbols. Done on 2026-10-20: the app `com.jew365.app` in the Play Console, all ten App content declarations, the Hebrew default listing with its English translation, temporary store graphics, and the track `Closed testing - Alpha` with the testers group, all countries and the feedback address; every answer is recorded in [release/PLAY_CONSOLE_METADATA.md](release/PLAY_CONSOLE_METADATA.md). Done on 2026-10-21: the redesigned store graphics, the privacy policy with its `#delete` section pushed, and the signing key. Done on 2026-10-22: the AAB uploaded with its release notes, the store listing saved past draft, the exact-alarm declaration (Calendar), the AI asset labels, and all sixteen changes sent for Google's review; Google approved it the same night, and the release is available to the testers group. Left: the invitation to 15 to 20 testers so at least 12 stay opted in for 14 days in a row (2 opted in on 2026-10-22, the owner's own account among them), then the production application from the Dashboard. Then the App Store name and listing at the first iOS submission, from [release/](release), with the support and privacy URLs under `https://jew-365.github.io/jew-365/`.
- **The redesign's native half ships in 1.0.21.** The palettes, screens and in-app logo of the redesign (2026-10-21) can ship over the air, but the launcher icon (`icon.png`, `adaptive-icon.png`, the Android 13 monochrome layer `adaptive-monochrome.png`), the notification icon and its colour `#012B97` (the logo's dark blue, the owner's call, 2026-10-22), and the splash (the `expo-splash-screen` plugin with a light and a dark image) are native. The first build with them, 1.0.20 (AAB `a0d84bad`, APK `811bbbb9`), showed the launcher icon cropped on the user's Samsung phone: the mark filled the whole 66/108 safe circle and the launcher cut its crown, check and bell. [scripts/logo/export.mjs](scripts/logo/export.mjs) now draws it to a 0.255-width radius, and that build was never uploaded; the next one raises `version` to 1.0.21 (the user's call, 2026-10-21), so installs of 1.0.20 get no updates until they install it. Verified on the Android emulator (debug build): launcher icon, light and dark splash, the in-app SVG logo's gradient and outline mask. Unverified: the 1.0.21 icon on a real launcher, iOS (no iOS build exists), and Android 13 themed icons.
- **No Sentry account yet** (the user's call, 2026-10-09), so crash reporting stays off: `organization` and `project` of the `@sentry/react-native/expo` entry in [app.json](app.json) are placeholders, no `EXPO_PUBLIC_SENTRY_DSN` is set, and every profile in [eas.json](eas.json) sets `SENTRY_DISABLE_AUTO_UPLOAD`. To close: open the account, set the DSN (Metro inlines it, so it ships over the air), add `SENTRY_AUTH_TOKEN` as an EAS secret, fill `organization` / `project` (native config, so the next build), and drop the two production `env` lines.
- **Rav review of the taharah rules.** [docs/taharah-review.html](docs/taharah-review.html) holds 14 "לאימות" items awaiting a rav's answers, now as an answer form (נכון / לא נכון and a note per item) that emails the answers to 365jew@gmail.com through Formspree; send the rav the page link: https://jew-365.github.io/jew-365/taharah-review.html. The rule table ships as initial. Each correction comes back as one preset edit in [src/data/taharahPresets.ts](src/data/taharahPresets.ts) that raises `TAHARAH_RULES_VERSION` and edits the same cell of the page.
- **Halachic review of the siddur texts.** The open items are listed in [scripts/siddur/AGENTS.md](scripts/siddur/AGENTS.md) (Work Guidance): meals, bedtime Shema, sights and food, Kiddush Levana, Sheva Berachot, Chanukah, Tehillim's Yehi Ratzon placement, and Shacharit's tallit and tefillin section.
- **Taharah device checks are not recorded.** The biometric lock, the `expo-secure-store` key and the headless `MARK_DONE` of a bedika were built and tested in Jest only (2026-10-08); no device run is recorded since.
- **Merged local branches.** Seven local branches are fully merged into `main`. Five are checked out nowhere and wait only for the user to run `git branch -d fix/audit-remediation hok-leisrael master reduce-apk-size refactor` (the agent's own run was refused by the auto-mode classifier on 2026-10-12; `fix/audit-remediation` stays on `origin`). The other two, `claude/adoring-agnesi-250cfe` and `claude/magical-wozniak-a1d944`, are checked out in clean worktrees under [.claude/](.claude) that belong to two inactive desktop sessions ("Fix vacuous scheduler test 6.6", "Fix the no-op timezone test matrix…"): archive or delete those sessions, let Settings › Storage clean up their worktrees, then delete the two branches.
