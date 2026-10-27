# Not Closed

Every open item of the project in one place: tasks, bugs, open questions, and other open items (reviews, external dependencies, unverified paths, cleanup). Add new open work here, never in a separate tasks, bugs or questions file. The change that closes an item moves it to [action-log.md](action-log.md), the record of everything done with its version, commits and where it is live (root [AGENTS.md](AGENTS.md), Project records); the closed findings of the 2026-08-09 failure-point audit stay in [AUDIT.md](AUDIT.md). Where the project stands now is [state.md](state.md).

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

### Medium — Requests of 2026-10-24

- [ ] Build the direct APK for phone processors only
  - **Flag:** `Build`.
  - **What it is:**
    - **Why it is big:** the direct-install APK (`production-apk` in [eas.json](eas.json)) is universal: `jew365-1.0.21-9.apk` is 125 MB, of which 93 MB is native code for four ABIs. `x86` (26.5 MB) and `x86_64` (25.8 MB) serve emulators only.
    - **Change:** the `production-apk` profile builds with `"gradleCommand": ":app:assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a"` in place of `"buildType": "apk"`. That keeps 32-bit ARM for older phones.
    - **Unchanged:** the Play AAB (`production`), because Play already sends each phone only its own ABI.
    - **Docs:** the profile list in root [AGENTS.md](AGENTS.md) (Commands) says so.
  - **What it solves:** The direct APK the user shares weighs about 52 MB less.
  - **Expected result:**
    - The next `pnpm build:android:production:apk` produces an APK with no `lib/x86*` entries (`unzip -l`) and about 73 MB in size.
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

### Low — Requests of 2026-10-24

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

### High — the 1.0.21 store release

Finished, committed and pushed, and native or store-side: each reaches users only with the store production release of 1.0.21, on Google Play's production track (the application opens around 2026-11-06, after 14 days of 12 testers) or on the App Store after review and the owner's Release. They moved back from action-log.md on 2026-10-26, when the log began to hold only work in production ([AGENTS.md](AGENTS.md), Project records). Their What it solves and Expected result were written from the log entries that day, `unknown` where an entry gave no basis; the priority is provisional, the owner's to confirm.

- [ ] Move the app to the Jew 365 identity as a new app
  - **Done:** 2026-10-19. Verified: unknown beyond the build.
  - **Status:** Version: Build, expected on the store production tracks · Committed: yes, `8f5e419` feat: rename the app to Jew 360; `2a7b721` feat!: move the app to the Jew 365 identity · Pushed: yes · Live: APK `5d9a512f` (1.0.20, versionCode 2), direct install; the 1.0.21 builds on Play closed testing and TestFlight; store production not yet · Channel: closed testing
  - **Flag:** `Build`.
  - **What it is:** `com.jew365.app`, scheme `jew365`, a new EAS project; the previous app's backup file restores here ([app.json](app.json), [src/services/BackupService.ts](src/services/BackupService.ts)).
  - **What it solves:** unknown (the log entry names no reason).
  - **Expected result:** the store production release installs `com.jew365.app` as Jew 365 / יהודי 365, and a backup file of the previous app restores in it.
  - **Requested:** the user, 2026-10-19 (after `8f5e419` named it Jew 360 the same day).
- [ ] The redesign: warm palette, premium UI, the Jew 365 logo; Expo SDK 54 patches
  - **Done:** 2026-10-21. Verified: typecheck, lint, DOX and 2,710 tests in four zones; the Android emulator (debug build): the launcher icon, the light and dark splash, the in-app SVG logo's gradient and outline mask. Not checked: the 1.0.21 icon on a real launcher, iOS, and Android 13 themed icons.
  - **Status:** Version: Build, expected on the store production tracks (the JS half ships over the air) · Committed: yes, `73c50ad` feat: redesign with the warm palette, premium UI and the Jew 365 logo; `a10e790` chore(deps): Expo SDK 54 patch upgrades; merged in `93f2af4` · Pushed: yes · Live: the JS half in production `1.0.21-2` (group `7f18981c-709b-475b-a0ce-19ae67b87c94`, from `c1989c4`); the native half in the 1.0.21 builds on Play closed testing and TestFlight, store production not yet · Channel: production (OTA); closed testing (build)
  - **Flag:** `Build` for the native half; the palettes, screens and in-app logo ship over the air.
  - **What it is:** the warm palette, premium UI and the Jew 365 logo ([src/theme/colors.ts](src/theme/colors.ts), [design/references/2026-10-21/](design/references/2026-10-21)). The launcher icon (`icon.png`, `adaptive-icon.png`, the Android 13 monochrome layer `adaptive-monochrome.png`), the notification icon and its colour `#012B97` (the owner's call, 2026-10-22), and the splash (the `expo-splash-screen` plugin with a light and a dark image) are native. Build 1.0.20 showed the launcher icon cropped on the user's Samsung phone; [scripts/logo/export.mjs](scripts/logo/export.mjs) now draws it to a 0.255-width radius, and that build was never uploaded.
  - **What it solves:** unknown (the log entry names no reason).
  - **Expected result:** the store production builds show the redesigned launcher icon whole on a Samsung launcher, the light and dark splash, and the notification colour `#012B97`.
  - **Requested:** the owner, 2026-10-21.
- [ ] The four symbols in every icon; the blue notification colour
  - **Done:** 2026-10-22. Verified: the APK checked for the symbols and the colour; the owner installed and approved it.
  - **Status:** Version: Build, expected on the store production tracks · Committed: yes, `11be1c8` feat(logo): the four symbols in every icon; blue notification colour; `3a7b177` fix(android): keep the launcher icon clear of Samsung's mask; 1.0.21 · Pushed: yes · Live: AAB `cc56fee1` on Play `Closed testing - Alpha` (release `8 (1.0.21)`, approved 2026-10-22); APK `d54afeab` for direct installs; store production not yet · Channel: closed testing
  - **Flag:** `Build`.
  - **What it is:** the four symbols in every icon and the blue notification colour ([scripts/logo/export.mjs](scripts/logo/export.mjs), [assets/](assets)), with the Samsung mask fix of `3a7b177`, whose own builds were never uploaded.
  - **What it solves:** the icon follows the owner's rule of 2026-10-22.
  - **Expected result:** the store production builds show the four symbols in the launcher icon and the blue notification colour.
  - **Requested:** the owner's rule, 2026-10-22.
- [ ] iOS build 1.0.21 (4)
  - **Done:** 2026-10-22. Verified: build `72c51b1e` FINISHED after `052c2db2` and `1b4f562b` errored ([release/RELEASE_LOG.md](release/RELEASE_LOG.md)).
  - **Status:** Version: Build `1.0.21` (4), expected on the App Store · Committed: yes, `42e961d` fix(ios): give expo.name Latin letters so EAS finds the Xcode target; `a035ab3` feat(ios): keep the taharah fallback out of iCloud, ship iPhone only; `04500e7` fix(ios): add @sentry/cli as a direct dev dependency · Pushed: yes · Live: `72c51b1e` on TestFlight (public link), in App Store review since 2026-10-23; App Store release not yet · Channel: TestFlight
  - **Flag:** `Build` (iOS).
  - **What it is:** `expo.name` in Latin letters so EAS finds the Xcode target, `@sentry/cli` as a direct dev dependency, the taharah fallback file out of iCloud, iPhone only ([app.json](app.json), [package.json](package.json)).
  - **What it solves:** the iOS builds `052c2db2` and `1b4f562b` errored before these changes.
  - **Expected result:** the App Store releases 1.0.21 (4) after review and the owner's Release, and it installs on an iPhone.
  - **Requested:** the owner, 2026-10-22 (iOS via TestFlight).
- [ ] Store copy names kinds of features, never counts
  - **Done:** 2026-10-25. Verified: read against the rule; the site answers 200.
  - **Status:** Version: store copy, expected with the store production release (the site part is on Pages) · Committed: yes, `1e12449` · Pushed: yes · Live: the site at https://jew-365.github.io/jew-365/; the Play and App Store listings not yet re-entered · Channel: production (Pages); consoles not yet
  - **Flag:** the store consoles; the site part ships on Pages.
  - **What it is:** the listings and the site's feature list rewritten to the owner's rule ([release/PLAY_CONSOLE_METADATA.md](release/PLAY_CONSOLE_METADATA.md), [release/APP_STORE_METADATA_HE.md](release/APP_STORE_METADATA_HE.md), [release/APP_STORE_METADATA_EN.md](release/APP_STORE_METADATA_EN.md), [docs/index.html](docs/index.html)). The copy is entered in both consoles together with "Add Chok LeYisrael to the store listings".
  - **What it solves:** the store copy follows the owner's rule of 2026-10-25 ([release/AGENTS.md](release/AGENTS.md)): kinds of features, never counts.
  - **Expected result:** both consoles show the rewritten copy after a reload, and the store production release carries it.
  - **Requested:** the owner's rule of 2026-10-25.
- [ ] No promise of no server, no database or offline only, anywhere
  - **Done:** 2026-10-21. Verified: the Play descriptions edited to match.
  - **Status:** Version: store copy and the 1.0.21 builds, expected with the store production release (the site part is on Pages) · Committed: yes, `dcf802a` docs: drop every promise of no server, no database or offline only · Pushed: yes · Live: the site; both listings, public only from the store production release, not yet · Channel: production (Pages); closed testing (listings)
  - **Flag:** the store consoles and `Build`; the site part ships on Pages.
  - **What it is:** every promise of no server, no database or offline only dropped from the site, the listings and the 1.0.21 builds ([release/RELEASE_LOG.md](release/RELEASE_LOG.md), 2026-10-21).
  - **What it solves:** unknown (the log entry names no reason).
  - **Expected result:** the listings and the builds of the store production release hold no such promise; the site already holds none.
  - **Requested:** the owner, 2026-10-21.
- [ ] China mainland removed from the App Store availability
  - **Done:** 2026-10-26. Verified: App Store Connect after a reload: Availability (174 Countries or Regions), China mainland Not Available, Hong Kong, Macau and Taiwan Available on App Release.
  - **Status:** Version: App Store availability, expected with the App Store release of 1.0.21 · Committed: n/a (its records are in `c1989c4`) · Pushed: n/a · Live: saved in App Store Connect on 2026-10-26; in effect from the App Store release, not yet · Channel: App Store review
  - **Flag:** App Store Connect.
  - **What it is:** the App Store availability set to 174 countries or regions, every storefront but China mainland ([release/APP_STORE_METADATA_EN.md](release/APP_STORE_METADATA_EN.md)).
  - **What it solves:** China mainland's law requires a permit for apps with religious content.
  - **Expected result:** after the App Store release the app is offered in 174 storefronts and not in China mainland.
  - **Requested:** the owner, 2026-10-26, in a Claude Code session.

### High — Chok LeYisrael

Chok LeYisrael shipped as a downloadable add-on on 2026-10-23 (production update 1.0.21-1, content version 2): the text comes from the Torat Emet database (CC BY-NC-SA 2.5, the user's call on 2026-10-23), [scripts/chok/](scripts/chok) builds it from the committed source into [docs/chok/](docs/chok), and the app downloads it from GitHub Pages on request, from the mitzvah's screen or the More tab. Its decisions live in [scripts/chok/AGENTS.md](scripts/chok/AGENTS.md), [src/utils/AGENTS.md](src/utils/AGENTS.md) and [src/services/AGENTS.md](src/services/AGENTS.md).

Standing constraint: the app stays non-commercial (no ads, no paid tier) while it carries this text.

- [ ] Add Chok LeYisrael to the store listings
  - **What it is:** Once the add-on is live, mention it in the feature lists of [release/](release) (Hebrew and English, Play and App Store) and re-enter the copy in both consoles, with a [release/RELEASE_LOG.md](release/RELEASE_LOG.md) entry. The same pass brings in the mitzvot the 2026-10-24 batch added (bedtime Shema, Kiddush Levana, Selichot, Chanukah candles, Ushpizin) and the batch's other user-visible features: the listings and [docs/index.html](docs/index.html) still say "תשע מצוות תלויות זמן".
  - **What it solves:** The listings describe what the app does.
  - **Expected result:** Both consoles carry the new copy.
  - **Status 2026-10-25:** the copy in [release/](release) and [docs/index.html](docs/index.html) is rewritten to name kinds of features, so the batch's additions are covered; left: re-enter it in both consoles (the owner's approval) and a [RELEASE_LOG](release/RELEASE_LOG.md) entry.
  - **Status 2026-10-26:** the description submitted with App Store 1.0.21 still reads "תשע מצוות תלויות זמן" (read in App Store Connect). The re-entry also takes the copy of the task "Add the search terms to the Play listing and the store copy", so each console is filled once.

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

### Store listings of 2026-10-26 — batch rules

- **Requested:** the user, 2026-10-26, in a Claude Code session, after a status read of both consoles: anyone who searches יהודי 365 or Jew 365 reaches the app, and so does anyone who searches תהילים, סידור, חק לישראל or תיקון הכללי, in Hebrew and in English; the improvements listed the same day went in as tasks ("תכתוב משימות ב not-close").
- **How search reads a listing (checked 2026-10-26):** App Store search reads the name, the subtitle, the keyword field and the categories, never the description or the promotional text ([Apple, App Store search](https://developer.apple.com/app-store/search/)). Each localization is read only in the storefronts that list its language, and Israel lists English (U.K.) and Hebrew ([Apple, App Store localizations](https://developer.apple.com/help/app-store-connect/reference/app-store-localizations/)), so today's English (U.S.) copy is not read in Israel. Google Play reads the title, the short description and the full description, and forbids repeated or unrelated keywords ([Play metadata policy](https://support.google.com/googleplay/android-developer/answer/9898842)).
- **Competition (iTunes Search API with `country=il`, and Play web search with `gl=IL`, 2026-10-26):** חק לישראל: the App Store leader has 8 ratings; on Play one strong app (over 50K installs), then unrelated results. תיקון הכללי: the App Store leader has 210 ratings; four or five dedicated apps on Play. תהילים and סידור: over 30 Play apps carry the word in their title, and the App Store leaders have 130 to 170 ratings (Neshama 2.7K). Jew 365: no result yet, the app is not released.
- **Decisions taken:** the store name stays `יהודי 365` / `Jew 365` (the owner, 2026-10-26). The subtitle's content was left to Claude (the owner, 2026-10-26: "תכניס מה שהכי חזק והכי צריך"): the two most searched terms the owner named and the least contested one, `סידור, תהילים, חק לישראל`, since the subtitle weighs most after the name and the low-competition terms rank from the keyword field; the tagline moves to the promotional text.
- **Declined:** renaming the app in the stores to carry keywords (the owner, 2026-10-26: "לא רוצה לשנות שם").
- **Done means:** the value saved in the console and read back after a reload, recorded in [release/APP_STORE_METADATA_HE.md](release/APP_STORE_METADATA_HE.md), [release/APP_STORE_METADATA_EN.md](release/APP_STORE_METADATA_EN.md) or [release/PLAY_CONSOLE_METADATA.md](release/PLAY_CONSOLE_METADATA.md), and in [release/RELEASE_LOG.md](release/RELEASE_LOG.md), in the same pass ([store-console skill](.claude/skills/store-console/SKILL.md)); each console step runs only after the owner's go-ahead for it.

### High — Store listings of 2026-10-26

- [ ] Set the App Store subtitle and keywords for search
  - **Ships as:** a console change in App Store Connect, no build.
  - **What it is:**
    - Hebrew localization: subtitle `סידור, תהילים, חק לישראל` (24 of 30); keywords `jew,תיקון,הכללי,התיקון,חוק,תהלים,זמני הלכה,מצוות,תפילין,ברכת המזון,קריאת שמע,לוח עברי,טהרה,סליחות` (97 of 100). `jew` with the `365` of the name answers "jew 365" in Israel until the English (U.K.) localization carries the name `Jew 365` there: once that localization is saved, the Hebrew field drops `jew,` (93 of 100) in the same pass (task "Add an English (U.K.) localization on the App Store"); `חוק` and `תהלים` are the spellings people type; no word repeats one of the name or the subtitle, which Apple counts as waste.
    - English (U.S.) localization: subtitle `Siddur, Tehillim & Zmanim` (25 of 30); keywords `psalms,tehilim,sidur,chok,hok,leyisrael,leisrael,tikkun,tikun,haklali,klali,mitzvah,tefillin,jewish` (99 of 100).
    - Promotional text, which search does not read, opens with the tagline: `כל מצווה בזמנה: זמני הלכה מדויקים, תזכורות בחלון הזמן של כל מצווה, סידור בארבעה נוסחים, ואפליקציה שנחה בשבת ובחג. בלי חשבון.` (124 of 170) and `Every mitzvah in its time: accurate zmanim, reminders inside each mitzvah's window, a siddur in four nusachim, and an app that rests on Shabbat and Yom Tov. No account.` (168 of 170).
    - When: while 1.0.21 waits for review. On 2026-10-26 the name, subtitle, keyword and description fields were open in that state, and App Information says its changes go out with the next app version, which is 1.0.21. Once 1.0.21 is released, the subtitle and the keywords change only with a new version, that is a new build that raises `version` (root [AGENTS.md](AGENTS.md), Never raise `version` for a JS change).
    - The names-and-tagline rule of [release/AGENTS.md](release/AGENTS.md) changes in the same edit: the subtitles become the ones above.
  - **What it solves:** today's subtitle and keywords carry none of תהילים, חק לישראל or תיקון הכללי, and the English name is not read in Israel.
  - **Expected result:** after a reload, App Store Connect shows each value with its counter within the limit; within days of the release, the iTunes Search API (`https://itunes.apple.com/search?country=il&entity=software&term=<term>`) returns the app for `jew 365`, `יהודי 365`, `חק לישראל` and `תיקון הכללי`, and its rank for `תהילים` and `סידור` is recorded.

- [ ] Add the search terms to the Play listing and the store copy
  - **Ships as:** a console change in the Play Console (Google reviews a listing change), no build.
  - **What it is:**
    - Play short description: Hebrew `סידור, תהילים, חק לישראל, תיקון הכללי וזמני הלכה: כל מצווה בזמנה` (64 of 80), English `Siddur, Tehillim, Chok LeYisrael, Tikkun HaKlali and reminders for every mitzvah` (80 of 80). The title stays `יהודי 365` / `Jew 365`.
    - The full descriptions of both stores, Hebrew and English, in [release/PLAY_CONSOLE_METADATA.md](release/PLAY_CONSOLE_METADATA.md) and both App Store files: התיקון הכללי joins the examples of the siddur paragraph (`Tikkun HaKlali` in English), and the Chok LeYisrael heading names the other spelling once: `חק לישראל (חוק לישראל)`, `Chok LeYisrael (Hok LeIsrael)`. Each term appears once, as the Play policy asks, and the copy rules of [release/AGENTS.md](release/AGENTS.md) hold (kinds of features with examples, no counts). Play reads the full description; the App Store shows it to the reader only.
    - Before the production application on Play (about 2026-11-06), so the first public listing carries them.
  - **What it solves:** today no listing names תיקון הכללי or the spelling חוק לישראל, and the Play short description names none of the four terms.
  - **Expected result:** the Play listing, reloaded, shows both short descriptions within 80 and the full descriptions with each term once; the copy files match what the consoles show. The console re-entry runs with the task "Add Chok LeYisrael to the store listings", so each console is filled once.

- [ ] Add an English (U.K.) localization on the App Store
  - **Ships as:** a console change in App Store Connect, no build.
  - **Decided:** the owner, 2026-10-26 (Q1, "מאשר"). The Israel storefront reads only the Hebrew and English (U.K.) localizations, so an English (U.K.) page puts the English name and a second keyword field in front of Israeli searches.
  - **What it is:**
    - App Information → Localizations: add English (U.K.) with the name `Jew 365`, the subtitle `Siddur, Tehillim & Zmanim` (the English (U.S.) subtitle of the task "Set the App Store subtitle and keywords for search") and the Privacy Policy URL `https://jew-365.github.io/jew-365/privacy/en/`.
    - Version page 1.0.21 → English (U.K.): the description, promotional text, support URL and marketing URL of the English (U.S.) page as they stand when this runs (the fields of [release/APP_STORE_METADATA_EN.md](release/APP_STORE_METADATA_EN.md)); keywords `psalms,tehilim,sidur,chok,hok,leyisrael,leisrael,tikkun,tikun,haklali,klali,mitzvah,tefillin,jewish` (99 of 100), the English (U.S.) set, which Israel does not read on the U.S. page; screenshots: the ones the English (U.S.) page uses ("Using Existing Assets"), replaced by the English set when the task "Make English screenshots and a screenshot of a reminder" lands.
    - In the same pass, the Hebrew keyword field drops `jew,`: the U.K. name carries it in Israel.
    - When: with the subtitle and keywords task, while 1.0.21 waits for review, because after the release the U.K. name, subtitle and keywords reach the store only with a new version. First check that App Store Connect lets a language be added in the Waiting for Review state (not checked on 2026-10-26); if it does not, stop and ask the owner whether to withdraw the submission to add it (the review starts over) or to add it with the next version.
    - Record the localization in the App Record and Version Page sections of [release/APP_STORE_METADATA_EN.md](release/APP_STORE_METADATA_EN.md), and the step in [release/RELEASE_LOG.md](release/RELEASE_LOG.md).
  - **What it solves:** today no English copy or English keyword is read in Israel, and the Hebrew field spends a keyword on `jew`.
  - **Expected result:** after a reload, App Information lists English (U.K.) with the name `Jew 365` and the subtitle within 30, and its version page shows the keywords within 100; within days of the release, the iTunes Search API with `country=il` returns the app for `jew 365`, `tehillim` and `siddur`, and its rank for each is recorded.

### Medium — Store listings of 2026-10-26

- [ ] Set the App Store secondary category to Reference
  - **Ships as:** a console change in App Store Connect, no build.
  - **What it is:** App Information → Category → Secondary: Reference; the primary stays Lifestyle. Apple's search reads both categories.
  - **What it solves:** the secondary category is empty, and Reference fits a siddur and a halachic-times tool.
  - **Expected result:** App Information shows Lifestyle and Reference after a reload, and the App Information line of [release/APP_STORE_METADATA_EN.md](release/APP_STORE_METADATA_EN.md) says so.

- [ ] Choose the Play tags
  - **Ships as:** a console change in the Play Console, no build.
  - **What it is:** Store presence → Store settings → Tags: read what is set (nothing is recorded), and choose up to five of Play's own tags that describe a siddur, Tehillim and halachic times, shown to the owner before saving.
  - **What it solves:** tags place the app among similar apps on Play, and none is recorded today.
  - **Expected result:** Store settings shows the tags after a reload, and [release/PLAY_CONSOLE_METADATA.md](release/PLAY_CONSOLE_METADATA.md) lists them.

- [ ] Make English screenshots and a screenshot of a reminder
  - **Ships as:** a console change in both consoles, no build.
  - **What it is:**
    - An English set in the order of the Hebrew one (Home, Siddur tab, Reader, History, Settings): 1206x2622 for the English (U.S.) and English (U.K.) App Store pages and 1080x1920 for the Play English translation, made the way the Hebrew set was (Screenshot Plan in [release/APP_STORE_METADATA_EN.md](release/APP_STORE_METADATA_EN.md)).
    - One screenshot per language of a mitzvah reminder in the notification shade with its two buttons ("עשיתי" / "פתח נוסח", "Done" / "Open text"), taken on the Android emulator ([android-native-verify](.claude/skills/android-native-verify/SKILL.md)), since the web build shows no notification; it goes second in each set.
    - Uploads go through Chrome, each file under 10 MB.
  - **What it solves:** English visitors see Hebrew screens today, and no screenshot shows the reminder buttons, the app's own feature.
  - **Expected result:** after a reload, the English pages of both consoles show the English set and both languages show the reminder shot; the Screenshot Plan sections and the Store Graphics section of [release/PLAY_CONSOLE_METADATA.md](release/PLAY_CONSOLE_METADATA.md) list the new files.

### Low — Store listings of 2026-10-26

- [ ] Ask for a store rating inside the app
  - **Flag:** `Build` (`expo-store-review` is a native module), with the next build and its version decision ([state.md](state.md)).
  - **Decided:** the owner, 2026-10-26 (Q2, "מאשר את ההצעה שלך"): the app asks right after a mark made in the app, on the seventh app day that holds a mark; never for a mark from a notification, on the install's first app day, or inside a holy block. It asks once per install; the OS decides whether the sheet shows (Apple at most three times a year).
  - **What it is:**
    - Dependency: `npx expo install expo-store-review`, the version Expo SDK 54 pins.
    - Rule: `shouldAskForRating({ completions, askedAt, firstOpenedAt, now, location, appActive })` in a new `src/utils/rating.ts`, true only when every condition holds: `askedAt` is null; `appActive`; `quietBlockAt(now, location)` ([src/utils/skipRules.ts](src/utils/skipRules.ts)) is null; `firstOpenedAt` is set and `appDayKey(firstOpenedAt)` differs from `appDayKey(now)` ([src/utils/locationDay.ts](src/utils/locationDay.ts)); and `completions` holds at least `RATING_MARKED_DAYS` (7) day keys with at least one mark (a day with only a skip does not count).
    - Store: `ratingAskedAt` and `firstOpenedAt` in `useUserStore` ([src/stores/useUserStore.ts](src/stores/useUserStore.ts)), `number | null`, null by default and after a reset; optional fields, so no `STORE_VERSION` raise. Both ride the backup file with the user store, so a restored install is not a new user. The root layout sets `firstOpenedAt` at its first mount that finds it null, an existing install included, so an existing user can be asked from the day after the build is installed.
    - Service: `watchForRatingMoment(): () => void` in a new `src/services/storeReview.ts` subscribes to `useCompletionsStore`. When the number of marks grows it waits `RATING_DELAY_MS` (1,500 ms, so the card's stamp plays first), evaluates the rule with `appActive` from `AppState.currentState === 'active'` and the user's location, and when it holds and `StoreReview.isAvailableAsync()` resolves true, stamps `ratingAskedAt` and then calls `StoreReview.requestReview()`. Unavailable stamps nothing. It never throws (a failure is logged with `console.warn`) and does nothing on web.
    - The root layout ([src/app/_layout.tsx](src/app/_layout.tsx)) starts it after onboarding, beside `initNotificationHandlers()`, and runs its teardown on unmount. A `MARK_DONE` from a notification runs headless or with the app in the background, so `AppState` keeps it out.
    - Docs: the two fields in the root [AGENTS.md](AGENTS.md) (State and Persistence), the service in [src/services/AGENTS.md](src/services/AGENTS.md), the rule in [src/utils/AGENTS.md](src/utils/AGENTS.md).
  - **What it solves:** ratings and downloads decide the rank for תהילים and סידור, where over 30 apps compete.
  - **Expected result:**
    - `src/utils/__tests__/rating.test.ts`, also under `pnpm test:tz`: false at six marked days and true at the seventh; false once `askedAt` is set; false while not active; false inside a holy block (`at(Jerusalem, …)` on a Shabbat afternoon); false on the app day of `firstOpenedAt` and while it is null; a day with only a skip does not count.
    - `src/services/__tests__/storeReview.test.ts`, over a mocked `expo-store-review`: a mark while active on the seventh marked day calls `requestReview` once after the delay and stamps `ratingAskedAt`; a later mark calls nothing; `isAvailableAsync` false calls nothing and stamps nothing; a mark while `AppState` is `background` calls nothing; the teardown unsubscribes.
    - On a device: on Android, an install from Play's internal test track or internal app sharing shows the sheet after that mark; on iOS a development build always shows it and TestFlight never does (Apple's rule), so the iPhone check runs on a development build.
    - The gate passes: `typecheck`, `lint`, `check:dox`, `test:tz`.

### App requests of 2026-10-26 — batch rules

- **Requested:** the user, 2026-10-26, in a Claude Code session: thirteen requests in one message, with a screenshot of the Mincha reader whose controls fill the top quarter of the screen.
- **Flag:** as in the 2026-10-24 batch, every task carries `OTA` or `Build`, and an `OTA` task adds no native module and touches no native field of [app.json](app.json). Read from [pnpm-lock.yaml](pnpm-lock.yaml) on 2026-10-26: `expo-location` 19.0.8 (with `watchHeadingAsync`), `expo-haptics` 15.0.8, `react-native-reanimated` 4.1.7 and `expo-background-task` 1.0.10 are in the shipped binary; `expo-sensors`, `expo-battery`, `expo-intent-launcher` and `expo-device` are not in the lockfile at all, so any of them means a build.
- **Decisions taken** (Claude's, cheap to reverse, the owner may overrule):
  - The collapsing controls cover the siddur reader, every text and Chok LeYisrael included: no other screen has a control block (the hilula page, the guide and the report have none).
  - The compass points at the Kotel, as asked; whether it should point at the Kodesh HaKodashim is R11 for the rav.
  - The battery exemption stays the system settings screen, never the direct dialog: `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` is restricted by Google Play to apps whose core function Doze breaks ([Android, Doze and App Standby](https://developer.android.com/training/monitoring-device-state/doze-standby)), and the app's exact alarms already fire in Doze ([src/services/AGENTS.md](src/services/AGENTS.md)).
- **Answered by the owner, 2026-10-26** (each written into its task): past the cap the far days are thinned from the third day, with an end notice on both platforms (Q3); the history tab starts with sketches carrying a greeting, a line per number, the best streak, badges and each mitzvah's streak (Q5); the siddur tab opens with "now" open and every other group closed, on every visit (Q6); about 30 tzaddik candidates, balanced across the communities (Q7); the performance measurement starts without the phone's details; the permissions step and card wait whole for the next native build, so every row shows its real status (Q4).
- **Waiting for the owner:** nothing in this batch.
- **Done means:** both dictionaries updated, a DOX pass on every touched AGENTS.md, the guide topic and a `WHATS_NEW` item with `pnpm guide:build` for every user-visible change, `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` green, and the screen checked in the `expo-web` preview at 375 points in Hebrew and English, or on the Android emulator through [android-native-verify](.claude/skills/android-native-verify/SKILL.md) for a native path. No commit and no OTA without the user's per-action approval.

### High — App requests of 2026-10-26

- [ ] Plan reminders as far ahead as the pending cap allows
  - **Flag:** `OTA`.
  - **What it is:**
    - **Cause (read 2026-10-26):** `horizonDays()` in [src/services/notifications/planners/horizon.ts](src/services/notifications/planners/horizon.ts) plans today and tomorrow, stretched only through a holy block. A default man has about 12 reminders on a weekday and a woman about 9, so a rebuild leaves about 24 pending while the cap is 60. Nothing plans further except a launch, a return to the foreground and the hourly `jew-365-daily-rebuild` task, and the OS may not run that task: iOS never runs it for an app the user swiped away, and Samsung puts an app unused for about 3 days to sleep, restricting its jobs and alarms ([Samsung, app management](https://developer.samsung.com/mobile/app-management.html)). So reminders stop one or two days after the last open, three or four after a Thursday or Friday open.
    - **Change:** the horizon keeps adding whole days, with the holy-block rule as it is, until the plan's candidates reach the platform cap or `HORIZON_MAX_DAYS` (30) days. The cap still drops the furthest triggers first. The check-in, weekly report, hilula, Rosh Chodesh and taharah planners take the longer horizon as they are. What happens past the cap is the task "Thin the far days and warn before the reminders run out".
    - **Cost:** time `buildPlan()` for a 30-day horizon on the emulator and write the number into this item's Done line; if it passes 300 ms, the plan for days beyond the second runs after the first two are scheduled.
    - **Docs:** the horizon lines of the root [AGENTS.md](AGENTS.md) (Notification Engine), [src/services/AGENTS.md](src/services/AGENTS.md) and [src/services/notifications/AGENTS.md](src/services/notifications/AGENTS.md).
  - **What it solves:** the user's report that a user who does not open the app for a few days stops getting reminders.
  - **Expected result:** plan tests with `now` pinned on a Sunday at `at(Jerusalem, …)`: a man's default set fills the 60 iOS slots and reaches about the fifth day; with the Android cap of the next task it reaches 30 days; a holy block inside the horizon stays silent; the scheduler suites pass under `pnpm test:tz`.
  - **Done:** 2026-10-26. Verified: [horizon.test.ts](src/services/notifications/__tests__/horizon.test.ts) (30 days on Android, 60 slots on iOS, nothing inside Shabbat) and the scheduler suites; `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` green on 2026-10-26, after an independent adversarial review whose findings were fixed. `buildPlan()` for 30 days took 99-276 ms in Node (Android, 346 candidates), under the 300 ms rule, so the two-step fallback was not built. Emulator (AVD test_phone, dev bundle, 2026-10-27): after one open, `dumpsys alarm` lists 335 alarms, 27.10 to 25.11 (30 days), equal to the stored requests. Not checked: the plan time on a release (Hermes) build.
  - **Status:** Version: OTA, expected with the next production update `1.0.21-3` · Committed: no · Pushed: no · Live: no · Channel: none

- [ ] Raise the Android pending cap and schedule only the difference
  - **Flag:** `OTA`.
  - **What it is:**
    - Android's cap goes from `PENDING_LIMIT` (60) to 400 in [src/services/notifications/ids.ts](src/services/notifications/ids.ts). Android refuses more than 500 alarms per app (`max_alarms_per_uid`), every notification expo-notifications schedules is one alarm, and WorkManager and the update notice need a few more. iOS keeps `IOS_MAX - IOS_HEADROOM` (60); the web shim stays as it is.
    - `rebuild()` stops cancelling everything. It reads the pending notifications once (`getAllScheduledNotificationsAsync()`), cancels the ids the new plan lacks or whose content changed, and schedules only the new and the changed ones. Each candidate carries a content hash in `data` (title, body, trigger, category, channel), so a language or wording change counts as a change. `SCHEDULE_FORMAT` and its stamp keep their meaning: a stale stamp still means a full rebuild.
    - Time a rebuild after one mark on the emulator before and after the change, and write both numbers into this item's Done line.
  - **What it solves:** 400 reminders cover about a month for a default user on Android, and scheduling only the difference keeps a mark or a setting change from re-sending hundreds of alarms on the JS thread.
  - **Expected result:** tests of the plan and of [src/services/notifications/os.ts](src/services/notifications/os.ts): an unchanged plan schedules and cancels nothing; one changed reminder cancels and schedules exactly that id; a language change reschedules everything; an Android plan holds at most 400. On the emulator, `adb shell dumpsys alarm` lists the app's alarms after a rebuild, and a reminder three weeks ahead is pending.
  - **Done:** 2026-10-26. Verified: the "a rebuild schedules only the difference" and "on Android" cases of [NotificationScheduler.test.ts](src/services/__tests__/NotificationScheduler.test.ts) (an unchanged plan schedules nothing, one changed reminder only that id, a language change everything, and the first rebuild of a process and the daily rebuild replace everything, since a force-stop removes the alarms but keeps expo's stored requests); `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` green on 2026-10-26, after an independent adversarial review whose findings were fixed. Emulator (2026-10-27): a mark left the stored requests untouched (an unchanged plan schedules nothing; about 0.66 s of JS CPU for the mark, dev bundle); after `am force-stop` the alarms went from 335 to 0 and came back to 335 within about 11 s of reopening. An unmark that is the first rebuild of a process replaces everything (about 1.6-2.4 s of JS CPU in the dev bundle), by design.
  - **Status:** Version: OTA, expected with the next production update `1.0.21-3` · Committed: no · Pushed: no · Live: no · Channel: none

- [ ] Thin the far days and warn before the reminders run out
  - **Flag:** `OTA`.
  - **Decided:** the owner, 2026-10-26 (Q3, "מאשר: דילול מהיום השלישי, והודעת סיום בשתי המערכות").
  - **What it is:**
    - **Thinning:** when the full plan holds more candidates than the platform cap, every horizon day from the third on keeps one trigger per mitzvah window: the latest one at or before the window's end (a `followUp` and a `blockExit` trigger are dropped there). Today and tomorrow keep every reminder. On iOS (60 slots) this reaches about 8 to 9 days for a man's default set; on Android (400) it acts only when 30 full days do not fit. The check-in, weekly report, hilula, Rosh Chodesh and taharah notices are never thinned.
    - **End notice:** one notification on the last fully planned day, at 20:00 on the location's clock, or at the exit of a holy block that covers that hour, with the title `notifications.horizonEnd.title` ("התזכורות עומדות להיגמר") and the body `notifications.horizonEnd.body` ("כדי שהתזכורות ימשיכו, פתחו את האפליקציה"). Every rebuild moves it, so it fires only if the app stays closed until then. It takes one slot of the cap.
    - **Shape** (root [AGENTS.md](AGENTS.md), New notification not tied to a mitzvah): id `horizonEnd:<YYYY-MM-DD>` (no `__`), `data.kind = 'horizonEnd'`, no category, the `system` channel, the kind in `PendingNotificationMeta` ([src/services/notifications/ids.ts](src/services/notifications/ids.ts) and the web shim), a planner candidate, and a tap that opens home in [src/services/notificationResponseHandler.ts](src/services/notificationResponseHandler.ts) (the open itself rebuilds).
    - **Docs:** the notification kinds in the root [AGENTS.md](AGENTS.md), the channel table of [src/services/AGENTS.md](src/services/AGENTS.md), [src/services/notifications/AGENTS.md](src/services/notifications/AGENTS.md), and the user guide's notifications topic.
  - **What it solves:** an iPhone user who does not open the app keeps a reminder for each mitzvah for about a week and a half instead of five days, and on both platforms the user hears before the reminders stop instead of finding out from their absence.
  - **Expected result:** plan tests at `at(Jerusalem, …)` on a Sunday: iOS keeps every reminder on days one and two and one per window from day three, about 8 to 9 days for a man; a plan that fits the cap is not thinned; the end notice lands at 20:00 of the last full day, and at a block's exit when that hour is inside the block; a response test: a tap opens home; on the emulator the notice is pending at the end of the plan.
  - **Done:** 2026-10-26. Verified: [horizon.test.ts](src/services/notifications/__tests__/horizon.test.ts) (iOS keeps days one and two whole and one trigger per window after them, the Sunday after a Friday open kept whole, a follow-up-only window keeps one trigger, the end notice at 20:00, at a block's exit, and at the last kept trigger when 20:00 has passed) and the tap-to-home case of [notificationResponseHandler.test.ts](src/services/__tests__/notificationResponseHandler.test.ts); `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` green on 2026-10-26, after an independent adversarial review whose findings were fixed. Emulator (2026-10-27): `horizonEnd:2026-11-25` pending at 20:00 Jerusalem on the last planned day.
  - **Status:** Version: OTA, expected with the next production update `1.0.21-3` · Committed: no · Pushed: no · Live: no · Channel: none

- [ ] Add a permissions step to onboarding and a permissions card to Settings
  - **Flag:** `Build`, with the next native build and its version decision ([state.md](state.md)); the whole step and card ship together, with every row's real status.
  - **Decided:** the owner, 2026-10-26 (Q4, "ב. לחכות עם כל הדף לבנייה הבאה"): nothing of this task ships over the air before that build.
  - **What it is:**
    - **Native module:** a small Android-only module of the repo (a local Expo module, or Kotlin written by a config plugin like [scripts/withMitzvahNotificationAction.js](scripts/withMitzvahNotificationAction.js)) exposing `isIgnoringBatteryOptimizations()` (`PowerManager`), `openSamsungNeverSleeping()` (action `com.samsung.android.sm.ACTION_OPEN_CHECKABLE_LISTACTIVITY`, package `com.samsung.android.lool`, the integer extra `activity_type` 2, per [Samsung, app management](https://developer.samsung.com/mobile/app-management.html)), `unusedAppRestrictionsStatus()` (`PackageManagerCompat.getUnusedAppRestrictionsStatus()`) and `openUnusedAppRestrictions()` (`IntentCompat.createManageUnusedAppRestrictionsIntent()`, started for a result, per [Android, app hibernation](https://developer.android.com/topic/performance/app-hibernation)). One module covers all four, so `expo-battery`, which answers only the first, is not added. Web and iOS get a shim that reports nothing.
    - **One component:** `PermissionsList` in [src/components/](src/components), used by both screens. Each row has an icon, a title, one line on why the app needs it, a status pill (`פעיל` when granted) and, while not granted, an action button. Statuses are read on mount and again on every `AppState 'active'`, so a return from the system settings updates them.
    - **Rows:**
      1. Notifications, every platform: the status of expo-notifications; the button asks, or opens the app's settings once refused.
      2. Location, every platform: `getForegroundPermissionsAsync()`; the button asks through [src/services/LocationService.ts](src/services/LocationService.ts). Optional: it serves the GPS city and the compass.
      3. Battery, Android: the button opens `openBatteryOptimizationSettings()` of [src/services/deviceSettings.ts](src/services/deviceSettings.ts), with the line "בחרו 'ללא הגבלה'"; active while `isIgnoringBatteryOptimizations()` is true.
      4. Samsung sleep, Android when `Platform.constants.Manufacturer` is `samsung`: explains Background usage limits → Never sleeping apps, and the button opens that list through `openSamsungNeverSleeping()` (`Linking.sendIntent` cannot: it passes every number as a double), falling back to `Linking.openSettings()`. No API reports this list, so the row shows no status; if the check on the owner's Samsung finds that "ללא הגבלה" of row 3 also takes the app off Samsung's sleeping lists, this row is dropped and row 3 names Samsung.
      5. Pause when unused, Android 11 and later: Android hibernates an app unused for a few months, resetting its permissions and stopping its alarms; the button opens `openUnusedAppRestrictions()`, and the row is active while `unusedAppRestrictionsStatus()` reports the restrictions off.
      6. Background refresh, iOS: `BackgroundTask.getStatusAsync()` (Available or Restricted); the button opens the app's settings.
    - **Onboarding:** a new step, `src/app/onboarding/permissions.tsx`, after the location step and before ready, shown on every onboarding even when everything is granted (each granted row marked active). Continue is never blocked. The location step keeps the city and the GPS button and drops its notifications card. `ONBOARDING_STEPS` becomes 7.
    - **Settings:** the device section's permission rows, the OS status row and the battery block, become this card; the settings search entries for the battery and the notification permission open it.
  - **What it solves:** the user asked for one place, in onboarding and in Settings, that shows each permission the app needs, marks what is granted, and grants the rest, the battery exemption included.
  - **Expected result:** render tests of `PermissionsList` over a mocked native module for each row granted, not granted and refused, the Samsung row only for that manufacturer, the iOS row only on iOS, the hibernation row only on Android 11 and later, and a status that updates on `AppState 'active'`; the onboarding tests take 7 dots and the new step; [routes.test.ts](src/app/__tests__/routes.test.ts), the smoke suite and the guide test cover the new route; on the emulator (a build with the module), granting each permission from the step marks its row active after the return; on the owner's Samsung, the Never sleeping apps link opens that list, and whether "ללא הגבלה" alone takes the app off it is recorded here.

### High — Performance, App requests of 2026-10-26

The user reports that screens sometimes stick, navigation sometimes does nothing and some animations do not play. A read of the code on 2026-10-26 found no single loop but bursts that block the JS thread: at every :00 and :30, at launch, on a return to the app and after a mark. Every animation in the app is reanimated, so a blocked commit delays its start, and a tap held up past 500 ms on a home card opens the quick sheet instead of the mitzvah. The tasks below run in order; each one's numbers come from the first.

- [ ] Measure the JS-thread stalls before any change
  - **Flag:** none: measurement.
  - **What it is:** on the Android emulator, with a release-like build of the current `main` ([android-native-verify](.claude/skills/android-native-verify/SKILL.md)), record with the Hermes sampling profiler (React Native DevTools → Performance): 60 seconds idle on home, one return from the background, one mark and one undo on home, one open of Settings, one open of Shacharit and of Tehillim in the reader. Temporary `performance.now()` logs (never committed) time the home memo, the siddur tab's memos, `selichotOfferOn`, the settings search index, `computeStats`, `buildPlan` and `refreshSchedulingOnForeground`, and count `dayFeatures()` calls and zmanim cache misses per tick. The owner chose on 2026-10-26 to start without the phone's details.
  - **What it solves:** every later fix is judged against numbers, not guesses.
  - **Expected result:** a table under this item: each scenario's longest JS-thread block in ms and the top functions in it, and a target per scenario (no block over 100 ms while idle or on a tap).

- [ ] Tick the clock only on the screen in front
  - **Flag:** `OTA`.
  - **What it is:** `useNow()` ([src/hooks/useNow.ts](src/hooks/useNow.ts)) ticks every 30 s in home, the siddur tab, the More tab and the reader at once, and the tab navigator keeps all five tabs mounted (`lazy: false`, `detachInactiveScreens={false}` in [src/app/(tabs)/_layout.tsx](<src/app/(tabs)/_layout.tsx>)), so each tick recomputes home's windows (about 100 `dayWindow`s, 18 of them for Kiddush Levana) and the siddur tab's (`currentOrNextWindow()` up to 11 days for each text) behind the visible screen. The hook stops ticking while its screen is not focused (`useIsFocused()`) and ticks once on focus. `freezeOnBlur` stays off, as [src/app/AGENTS.md](src/app/AGENTS.md) requires. The siddur tab's `dayKey` and `standaloneTextDay()` calls move into a memo. A list row that receives the same props skips its render (`React.memo` on the row components of home and the siddur tab).
  - **What it solves:** the stall at every half minute, whichever tab is open.
  - **Expected result:** a hook test: no tick while unfocused, one on focus; the measurement repeated: no block over 100 ms at :00 or :30 idle on any tab; the tabs suite ([tabsLayout.render.test.tsx](src/app/__tests__/tabsLayout.render.test.tsx)) unchanged.
  - **Done:** 2026-10-26. Verified: [useNow.render.test.tsx](src/hooks/__tests__/useNow.render.test.tsx) (no tick while unfocused, one on focus) and the unchanged tabs suite. The siddur tab's rows are a `React.memo` `CatalogRow`; home's cards are not memoized (their inline props would defeat it) and its stamp state stays in home, out of the day memo, so a mark runs the memo once ([home.mark.render.test.tsx](src/app/__tests__/home.mark.render.test.tsx)); `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` green on 2026-10-26, after an independent adversarial review whose findings were fixed. Emulator (2026-10-27, dev bundle, JS CPU sampled every 250 ms): home spends about 0.2-0.44 s at :00 and :30 and nothing between; a tab in the background does not tick. Not checked: frame stalls (no frame-timing source on the emulator) and a release build.
  - **Status:** Version: OTA, expected with the next production update `1.0.21-3` · Committed: no · Pushed: no · Live: no · Channel: none

- [ ] Cache the calendar math under every screen
  - **Flag:** `OTA`.
  - **What it is:**
    - `dayFeatures()` ([src/utils/siddur.ts](src/utils/siddur.ts)) runs up to eight hebcal calendar calls and four Kiddush Levana checks (each with a Luxon zone conversion and a zmanim read) on every call, with no cache, and the home cards, the siddur tab, Selichot's window, the plan and the settings search call it. Memoize it by Hebrew day and place (`inIsrael`, Jerusalem, the location), with a bounded map.
    - The zmanim cache ([src/services/ZmanimService.ts](src/services/ZmanimService.ts)) is first-in-first-out at 90 entries, and one launch reads more than 90 dates (home's Selichot offer about 40, history 31, Kiddush Levana 18, the siddur tab 9), so today's own entries are evicted and rebuilt. It becomes least-recently-used at 400 entries, and a hit skips the Luxon `setZone`/`toISODate` key work through a per-location key cache.
  - **What it solves:** the cost of each window, which every burst above multiplies.
  - **Expected result:** tests: a second `dayFeatures()` for the same day and place returns the cached value and calls hebcal no more; a cached zmanim entry read last survives 400 newer ones; `pnpm test:tz` passes (the caches must key on the location's day, never the device's); the measurement shows the tick, launch and mark scenarios faster, with numbers.
  - **Done:** 2026-10-26. Verified: [dayFeatures.cache.test.ts](src/utils/__tests__/dayFeatures.cache.test.ts) and [ZmanimService.cache.test.ts](src/services/__tests__/ZmanimService.cache.test.ts) in four zones; the review checked the 15-minute day buckets against all 418 IANA zones from 2024 to 2028. In Node, 40 days of `dayFeatures()` fell from 117-125 ms to 0-1 ms on a repeat, and 120 repeated zmanim reads from 109-202 ms to 0-1 ms; `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` green on 2026-10-26, after an independent adversarial review whose findings were fixed. Not checked: the emulator measurement.
  - **Status:** Version: OTA, expected with the next production update `1.0.21-3` · Committed: no · Pushed: no · Live: no · Channel: none

- [ ] Spread out the work at launch, on return and on a mark
  - **Flag:** `OTA`.
  - **What it is:**
    - **Settings:** the search index is rebuilt on every focus of the tab (`setSearchNow` in [src/app/(tabs)/settings.tsx](<src/app/(tabs)/settings.tsx>)) while the tab fades in. It is built on the first keystroke of a search and reused until the app day or its inputs change.
    - **Return to the app:** home's `AppState` handler, the root layout and the scheduler refresh all run on the same frame; the refresh and the tray clean-up move behind `InteractionManager.runAfterInteractions()`, after the first frame the user sees.
    - **A mark:** the home memo recomputes three times (the completion, the stamp's start, its end 1.3 s later); the stamp state moves into `MitzvahCard` so only the card re-renders, and the scheduler's queued `cancelForMitzvah()` / `settleCheckIn()` run after interactions. History's `computeStats()` runs only while its tab is focused, and once per change of completions.
  - **What it solves:** the stalls the user hits right after opening the app or tapping done, when animations and taps are lost.
  - **Expected result:** render tests: one home memo run per mark; the settings index built once across two focuses on the same day; the measurement: a mark and a return to the app block the thread under 100 ms, and a home card tap opens the mitzvah within 500 ms in 20 of 20 tries on the emulator.
  - **Done:** 2026-10-26. Verified: [settings.searchIndex.render.test.tsx](src/app/__tests__/settings.searchIndex.render.test.tsx) (no index before typing, one per visit, a rebuild when the Hebrew day turns), [history.focus.render.test.tsx](src/app/__tests__/history.focus.render.test.tsx), [afterPaint.test.ts](src/utils/__tests__/afterPaint.test.ts) and the root layout and store suites. The deferrals use `afterPaint()` ([src/utils/afterPaint.ts](src/utils/afterPaint.ts)), because `InteractionManager` is a microtask stub on React Native 0.81; history, the schedule and the taharah calendar moved to it too; `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` green on 2026-10-26, after an independent adversarial review whose findings were fixed. Emulator (2026-10-27, dev bundle, software GPU): a home card tap reached the mitzvah screen 20 of 20, drawn about 0.7-1.1 s after the adb command (adb start-up included); later tries slowed with the emulator itself (swap, iowait), not the app. Not checked: a release build on a phone.
  - **Status:** Version: OTA, expected with the next production update `1.0.21-3` · Committed: no · Pushed: no · Live: no · Channel: none

- [ ] Open long texts in the reader without a stall
  - **Flag:** `OTA`.
  - **What it is:** opening the reader parses its whole asset synchronously (`JSON.parse` in [src/services/SiddurService.ts](src/services/SiddurService.ts), up to 668 KB for Edot HaMizrach's Shacharit and 458 KB for Tehillim) and resolves it by voice and marital status in one pass; a picker jump renders every section at once (`windowSize` Infinity in [src/app/siddur/[id].tsx](<src/app/siddur/[id].tsx>), 178 sections for Tehillim); and the header calls `getHolidays()` on every render. The screen shows its header first and the text after the parse (behind `InteractionManager`), the resolved text is cached per text, nusach, day, voice and status, a jump renders the target section and its neighbours only (the jump math of [src/app/siddur/AGENTS.md](src/app/siddur/AGENTS.md) kept), and the header's holidays go into a memo by day.
  - **What it solves:** the reader's open and its section jumps stick on long texts.
  - **Expected result:** the reader suite passes (jumps, bookmarks, the resume offer); the measurement: opening Tehillim and Edot HaMizrach's Shacharit shows the header within 100 ms and the text within 500 ms on the emulator, and a jump to Tehillim's last chapter lands on it.
  - **Done:** 2026-10-26. Verified: the reader suites ([siddurReader.render.test.tsx](src/app/__tests__/siddurReader.render.test.tsx), [chokReader.render.test.tsx](src/app/__tests__/chokReader.render.test.tsx)). The header paints first and the text loads after `afterPaint()`, the resolved text is cached per text, day, voice and status, the header's holidays are memoized, and a far jump renders up to the target and two neighbours; a jump still renders every section before the target, because `scrollToIndex` needs them measured without `getItemLayout`; `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` green on 2026-10-26, after an independent adversarial review whose findings were fixed. Emulator (2026-10-27, dev bundle): the header shows about 1.1-1.6 s after the deep link and the text about 1.0-1.6 s later (Shacharit, Tehillim, Edot HaMizrach Shacharit; 3.9 s on a cold first open). Not checked: the jump to Tehillim's last chapter and a release build.
  - **Status:** Version: OTA, expected with the next production update `1.0.21-3` · Committed: no · Pushed: no · Live: no · Channel: none

### Medium — App requests of 2026-10-26

- [ ] Collapse the reader's controls while the user reads
  - **Flag:** `OTA`.
  - **What it is:**
    - **Behaviour:** the reader ([src/app/siddur/[id].tsx](<src/app/siddur/[id].tsx>)) opens as today, every control showing. A scroll down past a small threshold (about 12 points) folds everything above the text (the actions, the subtitle, the Chok LeYisrael rows, the picker row, the toolbar, the notices) into one compact bar: the back pill and the text's name on one line. A scroll up from any point unfolds it all; so does a tap on the compact bar. Within the height of the full block from the top it stays unfolded. Auto-scroll folds it like a scroll down; a jump to a section or a bookmark leaves it as it is.
    - **Mechanics:** the direction is read in the reader's one `useAnimatedScrollHandler` (`useAutoScroll`), since reanimated overrides a plain scroll prop ([src/app/siddur/AGENTS.md](src/app/siddur/AGENTS.md)). The fold animates on the UI thread with reanimated. The text must not jump when the bar folds: the header overlays the list, which keeps a top padding equal to the full header, or the spec proves another way. The last reading position, the resume offer, bookmarks (`placeAt()` in [src/utils/siddur.ts](src/utils/siddur.ts) and `LIST_PADDING`) and the auto-scroll's end must stay correct in both states.
    - **Docs:** the reader's contract in [src/app/siddur/AGENTS.md](src/app/siddur/AGENTS.md) ("Every reading control sits in the header's body…") and `ScreenHeader` in [src/components/AGENTS.md](src/components/AGENTS.md).
  - **What it solves:** the controls take a quarter of the screen for the whole reading (the user's screenshot of Mincha); folded, the text gets about 90% of it.
  - **Expected result:** [siddurReader.render.test.tsx](src/app/__tests__/siddurReader.render.test.tsx) cases: a scroll down folds to the bar with the name and back, a scroll up and a tap unfold, near the top it stays open, a bookmark saved folded and opened unfolded lands on the same segment, and the resume offer still shows; on the emulator, Shacharit and a Chok LeYisrael day folded and unfolded with no jump of the text, with auto-scroll on and off.
  - **Done:** 2026-10-26. Verified: the "folds its controls while the user reads" cases of [siddurReader.render.test.tsx](src/app/__tests__/siddurReader.render.test.tsx) (fold, unfold by scroll and tap, open near the top, no unfold on the bounce at the end, a jump keeps the state, the last place saved folded and unfolded names one segment, a header height change keeps the text in place, the overlay inside the safe area) and [ScreenHeader.render.test.tsx](src/components/__tests__/ScreenHeader.render.test.tsx); `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` green on 2026-10-26, after an independent adversarial review whose findings were fixed. Emulator (2026-10-27): Shacharit and Tehillim folded and unfolded with the text moving exactly with the finger (175 px per 200 px drag, no jump), the compact bar below the status bar, auto-scroll folding and a bar tap unfolding. Not checked: a Chok LeYisrael day (the add-on was not installed) and an iPhone with a notch.
  - **Status:** Version: OTA, expected with the next production update `1.0.21-3` · Committed: no · Pushed: no · Live: no · Channel: none

- [ ] Put the meals group right under "now" in the siddur tab
  - **Flag:** `OTA`.
  - **What it is:** the siddur tab ([src/app/(tabs)/siddur.tsx](<src/app/(tabs)/siddur.tsx>)) draws now, meals, prayers, the mitzvot group, general, then festivals and celebrations. Today meals comes after the mitzvot group, through `SIDDUR_GROUPS` in [src/data/siddur.ts](src/data/siddur.ts). The order is updated where [src/app/(tabs)/AGENTS.md](<src/app/(tabs)/AGENTS.md>) and the root [AGENTS.md](AGENTS.md) describe the tab.
  - **What it solves:** the user's order: the meal blessings are reached right after what is open now.
  - **Expected result:** a render test of the tab reads the group labels in that order, with and without a "now" group.
  - **Done:** 2026-10-26. Verified: the "the groups" cases of [siddur.catalog.render.test.tsx](src/app/__tests__/siddur.catalog.render.test.tsx) read the six headers in order, with and without "now"; `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` green on 2026-10-26, after an independent adversarial review whose findings were fixed.
  - **Status:** Version: OTA, expected with the next production update `1.0.21-3` · Committed: no · Pushed: no · Live: no · Channel: none

- [ ] Let each siddur tab group open and close
  - **Flag:** `OTA`.
  - **What it is:** every group of the siddur tab becomes a `SettingsSection` with `collapsible`, as Settings and the guide do ([src/components/SettingsSection.tsx](src/components/SettingsSection.tsx)): the screen owns an open set, a header tap toggles its group, several may be open at once, children mount only while open. On every visit the set is reset by `useFocusEffect`, as in Settings: "now" starts open, every other group closed (the owner, 2026-10-26, Q6). The tab's description in [src/app/(tabs)/AGENTS.md](<src/app/(tabs)/AGENTS.md>) says so.
  - **What it solves:** the user opens the siddur and sees every group at once, so the wanted text is one tap into its group.
  - **Expected result:** render tests: on open every group header shows and the closed ones hold no rows; a tap opens and closes a group; two groups open together; after a group is opened and the tab left and focused again, "now" is open and every other group closed; the smoke suite stays green.
  - **Done:** 2026-10-26. Verified: [siddur.catalog.render.test.tsx](src/app/__tests__/siddur.catalog.render.test.tsx) (only "now" open on arrival, closed groups build no rows, a tap opens and closes, two groups open together, the groups kept when the reader is closed and reset when the user comes from another tab, without a remount). The reset follows a tab change rather than every focus, so the way back from a text keeps its group open (Claude's reading of Q6, cheap to flip); `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` green on 2026-10-26, after an independent adversarial review whose findings were fixed.
  - **Status:** Version: OTA, expected with the next production update `1.0.21-3` · Committed: no · Pushed: no · Live: no · Channel: none

- [ ] Find tzaddikim in the settings search
  - **Flag:** `OTA`.
  - **What it is:**
    - A content kind `hilula` in `settingsContentItems()` ([src/utils/settingsSearch.ts](src/utils/settingsSearch.ts)): one item per entry of `HILULOT` ([src/data/hilulot.ts](src/data/hilulot.ts)), id `hilula:<id>`, title the Hebrew and English names, href `/hilula/[id]` with `id`, icon `hilula`, and the hilula's date (`hilulaDateLabel()`) as the result's caption. It is indexed whether the hilula notices are on or off.
    - Aliases: an optional `aliases: { he: string[]; en: string[] }` on `Hilula` for the names people type that the registry name lacks (`רשב"י`, `בבא סאלי`, `חפץ חיים`, `רבי נחמן`, `Ari`, `Rambam`, …), filled for the entries that have them, each checked against the tzaddik's page.
    - The kind joins the `kind` and href unions, `KIND_RANK` (after `chapter`), the key `settings.search.kind.hilula` in both dictionaries, and the href test of [settingsSearch.test.ts](src/utils/__tests__/settingsSearch.test.ts).
  - **What it solves:** the search finds a tzaddik of the hilulot list and opens his page.
  - **Expected result:** search tests: `בבא סאלי`, `רשבי`, `baal shem tov` and a typo of one name each return that tzaddik's item; a press and a submit open `/hilula/[id]`; `הילולות` still returns the hilulot setting first; [settings.search.render.test.tsx](src/app/__tests__/settings.search.render.test.tsx) shows the item with its date caption.
  - **Done:** 2026-10-26. Verified: [settingsSearch.test.ts](src/utils/__tests__/settingsSearch.test.ts) (eleven names and a typo each find their tzaddik first, `הילולות` still finds the setting) and [settings.search.render.test.tsx](src/app/__tests__/settings.search.render.test.tsx) (the date caption, a press and a submit open the page). 26 entries carry aliases, each checked against the tzaddik's page; `רש״י` now finds Rashi's page before the Chok LeYisrael commentary setting, an exact title match; `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` green on 2026-10-26, after an independent adversarial review whose findings were fixed.
  - **Status:** Version: OTA, expected with the next production update `1.0.21-3` · Committed: no · Pushed: no · Live: no · Channel: none

- [ ] Add the hilulot row to the More tab
  - **Flag:** `OTA`.
  - **What it is:** a `ListRow` in the More tab's card ([src/app/(tabs)/more.tsx](<src/app/(tabs)/more.tsx>)) after Tehillim, icon `hilula`, title `hilulot.title`, opening `/hilulot` (the switch, the notice kinds and the coming hilulot). The row list in [src/app/(tabs)/AGENTS.md](<src/app/(tabs)/AGENTS.md>) and its suite `more.render.test.tsx` gain it.
  - **What it solves:** the hilula notice settings are reachable from the navigation hub, not only from the mitzvot library.
  - **Expected result:** `more.render.test.tsx` finds the row in its place and a press pushes `/hilulot`.
  - **Done:** 2026-10-26. Verified: [more.render.test.tsx](src/app/__tests__/more.render.test.tsx) (the row after Tehillim pushes `/hilulot`); `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` green on 2026-10-26, after an independent adversarial review whose findings were fixed.
  - **Status:** Version: OTA, expected with the next production update `1.0.21-3` · Committed: no · Pushed: no · Live: no · Channel: none

- [ ] Add a prayer compass to the More tab
  - **Flag:** `OTA`: `watchHeadingAsync` of the installed `expo-location` gives the heading, and the location permissions are already declared.
  - **What it is:**
    - **Route:** `src/app/compass.tsx`, a stack screen with `ScreenHeader`, opened from a More tab row after the hilulot row (icon `compass`, a new name in `ICON_NAMES` of [src/components/MitzvahIcon.tsx](src/components/MitzvahIcon.tsx)).
    - **Math:** a pure `src/utils/compass.ts`: `KOTEL = { lat: 31.7767, lng: 35.2345 }`, the initial great-circle bearing and the distance from a point to it, and the angle to draw (`bearing - heading`, normalized to 0-360).
    - **Where the user is:** with location permission, one GPS fix when the screen opens (no tracking) through [src/services/LocationService.ts](src/services/LocationService.ts); otherwise the saved location, with a line naming its city (for example "לפי ירושלים") and the location permission button.
    - **Heading:** `watchHeadingAsync`, subscribed while the screen is focused and removed on blur; `trueHeading` when it is not -1, else `magHeading` with a line that the reading is less exact without the location permission. Accuracy 0 or 1 shows a calibration hint (a figure-eight motion).
    - **Screen:** a dial that turns with the device, north marked, an arrow to the Kotel, the bearing in degrees and the distance in km, and a light haptic (`expo-haptics`) once the device faces within 5° of it. Web and a device with no heading sensor show a notice instead.
  - **What it solves:** the user asked for a compass that shows north and, always, the direction of the Kotel from where the user stands and faces.
  - **Expected result:** `compass.test.ts`: bearings from Tel Aviv (32.0853, 34.7818: 128.7°), New York (40.7128, -74.006: 54.1°) and Jerusalem's city centre (31.7833, 35.2167: 113.6°) within 0.5°, checked against an online great-circle calculator, the wrap at 0/360, the distance within 1%; render tests over a mocked heading: the arrow angle, the true/magnetic line, the calibration hint, the web notice; on the emulator, the screen with its virtual sensors; the More test, routes, smoke and guide tests cover it; R11 logged.
  - **Done:** 2026-10-26. Verified: [compass.test.ts](src/utils/__tests__/compass.test.ts) (Tel Aviv 128.65°, New York 54.06°, Jerusalem's centre 113.56°, re-checked independently, the wrap and the distances), [compass.render.test.tsx](src/app/__tests__/compass.render.test.tsx) (the arrow, true and magnetic heading, calibration, the haptic with its 10° re-arm, the permission flow, waiting for the sensor, web) and the More, routes, smoke and guide suites; R11 logged; `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` green on 2026-10-26, after an independent adversarial review whose findings were fixed. Emulator (2026-10-27): the permission flow (notice, button, system prompt, waiting line) and the heading from the virtual magnetometer (four headings 90° apart turned the arrow 90° each) work; the emulator's true-north correction used its own default fix, so the arrow sat 14° off a pure magnetic calculation, and a `geo fix` never reached the screen. Not checked: a real phone (on iOS the true heading may need location updates running).
  - **Status:** Version: OTA, expected with the next production update `1.0.21-3` · Committed: no · Pushed: no · Live: no · Channel: none

- [ ] Sketch two directions for the history tab
  - **Flag:** none: design, for the owner's pick.
  - **Decided:** the owner, 2026-10-26 (Q5, "מאשר: סקיצות קודם, עם סעיפים 1 עד 5").
  - **What it is:**
    - **Today:** the tab ([src/app/(tabs)/history.tsx](<src/app/(tabs)/history.tsx>)) shows a ring with the current streak and "עוד N ימים ליעד M" (the goals 7, 30, 100, 365 of [src/utils/streakGoal.ts](src/utils/streakGoal.ts)), a grid of the last 30 days, each mitzvah's percent over them and yesterday's misses. No word says what a streak counts (a day with at least one mark; a day with misses and no mark breaks it) or what a percent means. Nothing computes a best streak, a total or an achievement ([src/utils/historyStats.ts](src/utils/historyStats.ts)).
    - **Content of both sketches:** (1) a greeting by first name, the first word of `profileName`, with a neutral greeting when it is empty; (2) a line under each number saying what it counts; (3) the best streak ever; (4) badges at milestones, kept once earned: a 7, 30, 100 and 365-day streak, a first full week, a full month, 100 marks of one mitzvah (the set is settled at the review); (5) each mitzvah's own streak beside its percent.
    - **How:** two directions that differ in layout and emphasis, drawn in the app's own components and palette under the commitments of [PRODUCT.md](PRODUCT.md), shown in the `expo-web` preview in Hebrew at 375 points, light and dark, with realistic fixture data (a 12-day streak, a best of 31, three badges). Screenshots of both go to the owner.
  - **What it solves:** the user finds the statistics, the streak and the achievements unclear and impersonal.
  - **Expected result:** the owner picks one direction, or a mix, and the badge set; the pick is written into the task "Build the chosen history design".
  - **Done:** 2026-10-27. Verified: the owner picked direction C and then the three-tab design E with its changes, after rounds 1 to 4 in [design/history-sketches/](design/history-sketches/README.md) (screenshots, then a live animated prototype in the web build); every pick is in the Decided line of "Build the chosen history design".
  - **Status:** Version: design only, nothing ships · Committed: no · Pushed: no · Live: no · Channel: none

- [ ] Build the chosen history design
  - **Flag:** `OTA`.
  - **Decided:** the owner, 2026-10-26 and 2026-10-27, over the sketches of [design/history-sketches/](design/history-sketches/README.md) (round 3, E): the tab has three tabs, סיכום | מגמות | הישגים, under a hero (landscape, greeting, streak ring) that stays above all three, with the switcher sticky once the hero scrolls away; סיכום is direction C (daily, weekly and monthly rings, monthly = the last 30 days) with the best-streak card and the badges moved to הישגים and one link row left in their place; מגמות holds the 12-week chart, the weekday chart (Sunday to Friday compared, Shabbat and Yom Tov in a separate row outside the comparison), each mitzvah's trend and the weekly reports list (the Reports pill goes), one insight line under every chart; charts run right to left like the grid and bars; badges as below with "שבוע מלא" = Sunday to Shabbat and a new "1,000 סימונים" badge; earned badges and lifetime records persist on the device, ride the backup file and are cleared by the reset. Each mitzvah's trend shows the two percents themselves ("71% ← 83%"), with no change figure; the reports list shows 6 weeks and a "שבועות קודמים" row (the owner, 2026-10-27). Rings, bars and tab changes animate and replay on every tab change (the owner, 2026-10-27), honouring reduced motion; sections below the fold animate when scrolled into view. The calendar of סיכום shows the current Hebrew month (weekday columns, Hebrew day with the civil date under it, arrows to earlier months), every past day opens a sheet of that day's mitzvot and their states, and a partly done day is a lighter shade by its share (three steps) than a fully done one; the "חודשי" ring counts the same current Hebrew month (the owner, 2026-10-27). The tab is named "מעקב" ("Tracking") in the tab bar and its title instead of "היסטוריה" (the owner, 2026-10-27; nav.history, history.title, custom.surface.history, the guide). The live prototype of all this is `src/app/prototype-history.tsx` (temporary: deleted before the batch is committed), recorded in [design/history-sketches/](design/history-sketches/README.md).
  - **What it is:** the tab per the sketch the owner picks, with items 1 to 5 above. The data it needs:
    - **Best streak:** the store keeps per-mitzvah detail for 400 days (`RETENTION_DAYS` in [src/stores/useCompletionsStore.ts](src/stores/useCompletionsStore.ts)), so a best streak cannot be recomputed after pruning. A persisted `bestStreak: { days, endedOn }` in the completions store keeps the maximum, raised whenever the current streak passes it, and seeded at the first hydrate from `computeStreak()` over the kept history.
    - **Badges:** a persisted `badges: Record<BadgeId, number>` (the time each was earned) in the completions store, filled by a pure `earnedBadges()` in a new `src/utils/badges.ts`; an earned badge is never taken away by a later unmark.
    - Both fields are optional (no `STORE_VERSION` raise), ride the backup file with the store, and are cleared by the reset.
    - **Per-mitzvah streak:** a pure helper beside `computeStats()`, by the same day rules as `computeStreak()`.
  - **What it solves:** the same request; the sketch fixes the layout first.
  - **Expected result:** `badges.test.ts` and best-streak tests (raised, kept after the history is pruned, seeded from the kept days, unchanged by an unmark), also under `pnpm test:tz`; [history.render.test.tsx](src/app/__tests__/history.render.test.tsx) pins the greeting, each explaining line, the best streak, the badges and the per-mitzvah streak; the backup and reset suites cover the two fields.
  - **Done:** 2026-10-27. Built from the closed spec [design/history-sketches/SPEC-build.md](design/history-sketches/SPEC-build.md) by three executors (data, shared components, screen), each lane reviewed independently and its findings fixed (among them: a week that a Sunday Yom Tov closes, the week finishing at the closing block's exit, the oldest calendar month at the retention edge, records of streaks older than 400 days, the screen going stale across alot, the calendar entrance after month travel). Verified: [historyTrends.test.ts](src/utils/__tests__/historyTrends.test.ts), [badges.test.ts](src/utils/__tests__/badges.test.ts), [achievements.test.ts](src/stores/__tests__/achievements.test.ts), [history.render.test.tsx](src/app/__tests__/history.render.test.tsx) (25 cases), [history.focus.render.test.tsx](src/app/__tests__/history.focus.render.test.tsx), the StreakRing, SegmentedControl, ProgressBar and colour-math suites, the backup and reset suites; `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` (4956 tests in each zone) green on 2026-10-27; screenshots of the real screen in [design/history-sketches/](design/history-sketches/README.md) (`build-*.png`). The first-open fold of about 400 days is not split across frames (165 ms in Node). Emulator (AVD test_phone, debug build, 2026-10-27, a restored backup of 59 days): the indicator, bars, calendar and charts follow RTL in Hebrew and LTR in English; tab replay, the sticky switcher, the day sheet to /mitzvah, the month arrows and the report rows work; after a resume past alot the rings and calendar moved to the new day with no tab switch; the first open folded the history in about 3.4 s of JS CPU (debug). Fixed after it: the selected week label wrapped, a tab return remounted the body in the focus frame (now after the paint), the header date now turns at sunset like home, and the root SafeAreaProvider takes initialWindowMetrics. Not checked: a release build on a phone.
  - **Status:** Version: OTA, expected with the next production update `1.0.21-3` · Committed: no · Pushed: no · Live: no · Channel: none

### Low — App requests of 2026-10-26

- [ ] Research more tzaddikim for the hilulot list
  - **Flag:** none: research, then a later task per the owner's picks.
  - **What it is:** a list of candidates beyond the 57 of [src/data/hilulot.ts](src/data/hilulot.ts), each with the Hebrew date of passing from two independent sources, the grave and whether visitors can reach it, the community, and the sign that people mark the date (a gathering at the grave, a known hilula). Scope (the owner, 2026-10-26, Q7): about 30 candidates, balanced across Sephardi and Mizrachi, Chassidic, Lithuanian and the gedolim of the last generations in Israel, only ones whose date people mark at the grave. The owner picks; each pick then becomes an entry with a full page in [src/data/hilulaPages.ts](src/data/hilulaPages.ts), researched and fact-checked like the 57.
  - **What it solves:** the user asked which more tzaddikim can be added.
  - **Expected result:** the list, under this item or in a file committed with it, with every date's two sources, handed to the owner for a pick.
  - **Picks:** 2026-10-27: 29 candidates in [design/hilula-candidates-2026-10-26.md](design/hilula-candidates-2026-10-26.md); 15 have strong evidence of a gathering at the grave (the file's summary says 18, a miscount of its own tables). The owner chose all 15, then the three medium candidates (Baba Meir, Rabbi Amram ben Diwan, whose pilgrimage is on Lag BaOmer, and Rav Wosner, whose date is always Pesach), then a looser bar for Lithuanian gedolim, who rarely have a gathering at the grave ("yahrzeit widely marked"), adding the Maharil Diskin, Rabbi Isser Zalman Meltzer, Rabbi Chaim of Brisk, the Brisker Rav and Rav Gershon Edelstein: 23 in all, built in the task "Add the 23 picked tzaddikim to the hilulot list".
  - **Done:** 2026-10-27, the research and the pick of 15. Verified: each date has two sources in the candidates file.
  - **Status:** Version 1.0.21 · Committed: no · Pushed: no · Live: no · Channel: none

- [ ] Add the 23 picked tzaddikim to the hilulot list
  - **Flag:** OTA: data and text only.
  - **What it is:** 23 entries in `HILULOT` ([src/data/hilulot.ts](src/data/hilulot.ts)), each by its year of death, with search `aliases`, and a full page in [src/data/hilulaPages.ts](src/data/hilulaPages.ts): Rabbi Chaim Chouri, Rabbi Yehuda Tzadka, Rav Ben Zion Abba Shaul, the Pri HaAretz of Vitebsk, Rabbi Avraham of Kalisk, Reb Shayele of Kerestir, the Divrei Chaim of Sanz, the Bnei Yissaschar, Rabbi Aharon of Belz, the Klausenberger Rebbe, the Yismach Moshe, the Ramchal, Rav Kaduri, Rav Shteinman, Rav Tzvi Yehuda Kook, Baba Meir, Rabbi Amram ben Diwan, Rav Wosner, the Maharil Diskin, Rabbi Isser Zalman Meltzer, Rabbi Chaim of Brisk, the Brisker Rav and Rav Gershon Edelstein. Agents researched the pages and other agents fact-checked them (53 corrections). Amram ben Diwan's page says his pilgrimage is on Lag BaOmer, and Rav Wosner's that his day is always Yom Tov. Rav Shteinman's and Rav Edelstein's graves share Rav Shach's Ponevezh cemetery point. The Ramchal links to Tiberias, where the gatherings are, and names Kfar Yasif; his year stays unset. R12 and R13 went to the rav.
  - **What it solves:** the owner's pick of 2026-10-27.
  - **Expected result:** the hilulot screen, the notices and the settings search include them; every page passes the guard of [hilulaPages.test.ts](src/data/__tests__/hilulaPages.test.ts); `WHATS_NEW` `1.0.21-3` names them.
  - **Done:** 2026-10-27. Verified: `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` on the hilulot, hilula pages, hilula and hilulot screens, settings search and guide suites. Not checked on a device.
  - **Status:** Version 1.0.21 · Committed: no · Pushed: no · Live: no · Channel: none

## Bugs

- [ ] A Hebrew Android phone shows the app's English name
  - **Done:** 2026-10-25. Verified: [scripts/__tests__/androidLegacyHebrewLocale.test.js](scripts/__tests__/androidLegacyHebrewLocale.test.js) (the file equals Expo's `values-b+he`), prebuild of both variants, `aapt2 compile` of `values-b+iw`, and `application-label-iw:'יהודי 365 P'` in build `c625eaa5`. Not checked: a phone set to Hebrew (the emulator went into a boot loop when its language was switched to Hebrew).
  - **Status:** Version: Build, expected with the next store production build · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview build `c625eaa5` only; production builds `cc56fee1` (Play) and `d54afeab` (direct APK) still show the English name · Channel: preview
  - **Flag:** `Build`.
  - **Found:** the emulator side-by-side check, 2026-10-25 (launcher, Settings and a system dialog in Hebrew showed "Jew 365" and "Jew 365 P").
  - **What it is:** Expo writes `locales.he` to `values-b+he`, which Android never reads for Hebrew (it resolves `iw`); [scripts/withAndroidLegacyHebrewLocale.js](scripts/withAndroidLegacyHebrewLocale.js) writes the same strings to `values-b+iw`, Android only.
  - **What it solves:** a Hebrew Android phone shows "Jew 365" instead of `יהודי 365` on the launcher, in Settings and in system dialogs.
  - **Expected result:** a phone set to Hebrew shows `יהודי 365 P` for the preview build, and the store production build shows `יהודי 365`.

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

- **R11 — The prayer compass's target.**
  - **Question:** Should a prayer compass point at the Kotel, or at the place of the Kodesh HaKodashim on the Temple Mount?
  - **Assumption:** The Kotel (31.7767, 35.2345), as the owner asked. Far from Jerusalem the two differ by a fraction of a degree; inside the Old City by much more.
  - **Lives in:** `KOTEL` in [src/utils/compass.ts](src/utils/compass.ts); the screen and the bearing read it there only, so flipping it changes one constant.

- **R12 — Rav Tzvi Yehuda Kook's hilula in a leap year.**
  - **Question:** He died on 14 Adar 5742, a year with one Adar. In a leap year, is his hilula in Adar I or Adar II?
  - **Assumption:** The app's one rule for a plain Adar date: Adar II in Israel, Adar I abroad (the Mishna Berura's custom for 7 Adar). Merkaz HaRav marked it on 14 Adar I in the leap year 5782 (https://www.inn.co.il/news/539279), so Israel users may get the notice a month after the yeshiva's azkara.
  - **Lives in:** `hilulaDayIn()` in [src/data/hilulot.ts](src/data/hilulot.ts) and the `tzvi_yehuda_kook` entry of `HILULOT`; an Adar I answer for him alone needs a per-entry override there.
- **R13 — Rav Yitzchak Kaduri's date.**
  - **Question:** Is his hilula on 29 Tevet or 28 Tevet?
  - **Assumption:** 29 Tevet: he died after nightfall on motzaei Shabbat, 28 January 2006, already 29 Tevet 5766 (Hebrew Wikipedia, Chabad.org, Kikar HaShabbat). JDN and a breslev.com listing give 28 Tevet.
  - **Lives in:** the `yitzchak_kaduri` entry of `HILULOT` in [src/data/hilulot.ts](src/data/hilulot.ts) and the date in his page in [src/data/hilulaPages.ts](src/data/hilulaPages.ts).

### For the owner

Q1 (an English (U.K.) localization) and Q2 (when the app asks for a rating) were answered by the owner on 2026-10-26 and became the tasks "Add an English (U.K.) localization on the App Store" and "Ask for a store rating inside the app". Q3 to Q7, from the app requests of 2026-10-26, were answered the same day and are written into their tasks (App requests of 2026-10-26 — batch rules). None is open.

## Other Open Items

- **Review the content of the 57 tzaddik pages** ([src/data/hilulaPages.ts](src/data/hilulaPages.ts)). Agents researched it and an adversarial pass fact-checked it on 2026-10-26: 124 corrections and 45 doubts. The points that need the owner or a rav:
  - King David's link goes to the traditional site on Mount Zion, which historians do not take as the real grave.
  - Kever Rachel and Nabi Samwil are reached through secured routes.
  - Akiva Eiger's stone stands at an assumed spot (the original was destroyed in WWII).
  - The graves in Ukraine, Belarus and Russia are linked though travel warnings apply.
  - Waze links point to the cemetery for nine graves with no pinned point: Maran Yosef Karo, Rabbi Meir Shapiro, Rav Moshe Feinstein, Rav Shlomo Zalman Auerbach, Rav Elyashiv, Rav Kook, the Chazon Ish, the Steipler and Rav Chaim Kanievsky. For four more, the Rashash, the Vilna Gaon, Rav Shach and the Satmar Rebbe, the link uses a single map source.
  - The Satmar Rebbe's works leave out Vayoel Moshe (a polemic, under the no-politics rule).
  - Some stories and lessons rest on one source (Rabbi Chaim Pinto's two cups, Rebbe Levi Yitzchak's etrog, the Kotzker's saying on peace, Rav Chaim Kanievsky's 1948 hilltop).

  The full research output, with every correction and doubt, sits outside the repo, in a temp folder that may be cleaned: `C:/Users/avrah/AppData/Local/Temp/claude/C--work-personal-Kosher-Jew/4bcf610a-2199-4f3d-808c-6e673c399e36/scratchpad/hilula-content-research-2026-10-26.json`. Until the review, the content ships as written.

- **Review the content of the 23 tzaddik pages added on 2026-10-27** ([src/data/hilulaPages.ts](src/data/hilulaPages.ts)), as for the 57. The points that need the owner or a rav:
  - Single-source stories or lessons: Chouri's blankets and open home, Tzadka's exam at seventy, Abba Shaul's Rashi story, Kaduri's ink lesson and the Porat Yosef manuscripts, Belz's two stories, the Klausenberger's syringe, the Yismach Moshe's two (Sefer HaHasidut), Kerestir's deathbed meal (tradition only) and his borrowing-for-charity lesson, Baba Meir's humility lesson and Rabat exam, Amram ben Diwan's cloak, both of Rav Wosner's stories and lessons, Diskin's windows and orphans (the orphanage's own account), both of Meltzer's lessons, Reb Chaim's two stories, the Brisker Rav's fish story and his "read from the book" lesson. Rav Wosner's grave visit on erev Rosh Chodesh Nisan rests on one year's report (5782).
  - Works resting on thin records: Kaduri's Kedushat Yitzchak, Belz's Leket Imrei Kodesh (collected by Aharon Ringel); Baba Meir's Yagel Yaakov, Diskin's Chullin notes and the Brisker Rav's books rest on Hebrew Wikipedia alone; Reb Shayele of Kerestir and Rabbi Amram ben Diwan left no book, so their pages show no works.
  - Graves: the Ramchal's grave is disputed (Tiberias, linked, or Kfar Yasif); the Bnei Yissaschar's ohel is placed in Dynów's old cemetery (ESJF, JewishGen's survey, the Yizkor book) though one JewishGen line says the new one; fourteen graves link to a cemetery search with no pinned point (Chouri, the Pri HaAretz, Kalisk, Tzadka, Abba Shaul, Belz, the Klausenberger, Kaduri, Rav Tzvi Yehuda, Baba Meir, Rav Wosner, Diskin, Meltzer, the Brisker Rav), and Rav Shteinman's and Rav Edelstein's pin is Rav Shach's point in the Ponevezh cemetery, not their graves; Rabbi Amram ben Diwan's grave in Morocco links to an untested Latin Waze search, and Rabbi Chaim of Brisk's pin is the Okopowa cemetery's gate (his ohel, shared with the Netziv, is in section 49 per one Commons file).

  The research and fact-check files sit outside the repo, in a temp folder that may be cleaned: `C:/Users/avrah/AppData/Local/Temp/claude/C--work-personal-Kosher-Jew/5f5c1178-a3f3-499a-a000-5109322020d4/scratchpad/pages/` (`<id>.notes.json`, `<id>.factcheck.json`).

- **The About and contact store row answers 404 until the app is public.** The row opens the Play page (`https://play.google.com/store/apps/details?id=com.jew365.app`) and the App Store page (`https://apps.apple.com/app/id6825802248`) named in [src/services/ContactService.ts](src/services/ContactService.ts); both answered 404 on 2026-10-26. It closes when each page answers 200 after that store's public release. The release order of the 2026-10-24 batch is settled: on 2026-10-26, after production `1.0.21-2`, the live Chok manifest carried `gz` and `gzipBytes`, a `.json.gz` file answered `application/gzip` with no `Content-Encoding`, and both privacy pages on Pages matched their committed copies, `#delete` anchor included.

- **A fresh install's first session runs the build's own bundle.** The fix that stamps a fresh install's default mitzvot with its first launch (so a new user is never asked about the Shabbat before the install) is in the JavaScript bundle, but `updates` in [app.json](app.json) sets no `fallbackToCacheTimeout`, so a new install of build 1.0.21 first launches the bundle embedded in the build, which stamps nothing, and a user who onboards in that first session keeps an unstamped map. The fix reaches every new user only once a native build carries it. Until then, a user installing on a Sunday may still see the check-in for the Shabbat before the install. The emulator check of that fix runs a dev-client bundle from Metro, not the EAS APK plus an update.

- **Send the rav the review page.** After the push to `main` publishes [docs/halacha-review.html](docs/halacha-review.html), confirm `curl -sI https://jew-365.github.io/jew-365/halacha-review.html` answers 200, then send the rav its link (the owner's step; no real submit was tried, because a submit emails 365jew through Formspree `xwlvgagp`). Each answer that is not "נכון" becomes a change to that one rule and a new `RULES_VERSION`.

- **Every project account moves to 365jew@gmail.com** (the user's call, 2026-10-20). Done in the repo: `CONTACT_EMAIL` in [ContactService.ts](src/services/ContactService.ts), the support page, both privacy policies and the taharah review page; `CONTACT_FORM_ID` is the new Formspree form `mrpevdbk` on 365jew; this repo's local `git config user.email`; `owner` in [app.json](app.json) is `jew-365-org`; `credentials.json`, `credentials/` and `*.keystore` gitignored; `origin` and every Pages URL moved to the GitHub organization `jew-365` (`https://jew-365.github.io/jew-365/`, all four pages answer 200; the old address is dead). The 88 earlier commits keep avi6190i@gmail.com (no history rewrite, the user's call). Done by the user: the Formspree account and form on 365jew, and the old form `xyekordk` retargeted to 365jew as a linked email (kept alive until no install of the previous app remains, because its update 1.0.19-2 posts to it); the GitHub organization `jew-365` with 365jew as its email, 365jew verified on the personal account, `jew-365` transferred to it; 2-Step Verification, a passkey, a verified recovery email and offline backup codes on 365jew; the Expo user `jew-365` on 365jew, Owner of the organization `jew-365-org`, which owns the project now (`@jew-365-org/jew-365`, same project ID, so updates still reach build 1.0.20, which moved with it), its stored keystore read again after the move with the same SHA-256, `avraham-sason` removed from the organization and 2FA on the Expo user `jew-365`; 365jew an admin of the Play Console, which stays owned by avi6190i (the user's call: moving the ownership would repeat the identity verification); a backup of the Android keystore from `eas credentials -p android`, encrypted into `jew365-keystore.tar.gz.enc` (AES-256-CBC, PBKDF2 600000 iterations, SHA-256; the plain folder deleted only after a decrypted copy matched it) and uploaded to the Google Drive of 365jew, its passphrase kept outside that account; the key's SHA-256 is `DC:62:0E:28:E9:67:30:98:E8:90:88:B7:09:FB:6D:B8:F9:C0:B1:E6:80:D9:52:60:3B:A8:9C:F4:3B:AE:00:B4`; 365jew as the contact email of the Play store listing and the owner of the testers group (2026-10-20). Left for the user: `com.jew365.app` registered in the Play Console with the SHA-256 above for Android developer verification, which from 2027 covers the direct APK too; Sentry and the Apple Developer account opened on 365jew; the empty `@avraham-sason/jew-360` Expo project deleted.
- **iOS 1.0.21 is in App Store review, manual release.** EAS build `72c51b1e` (buildNumber 4) was submitted on 2026-10-23 with every App Store Connect page filled ([release/APP_STORE_METADATA_EN.md](release/APP_STORE_METADATA_EN.md), [release/RELEASE_LOG.md](release/RELEASE_LOG.md)); after approval it waits for the owner's Release. Before releasing: the TestFlight checks on a real iPhone (public link https://testflight.apple.com/join/cZeSqPzG, live since the Beta App Review passed on 2026-10-23). Still open: the EU trader status. Trader chosen, email and phone verified; the identification documents (no Hebrew accepted) wait for the owner's passport, and until they are in, the app is not offered in the EU storefronts. iOS builds and submissions run as `npx eas-cli@latest …`, because the project's eas-cli failed the Apple login.
- **iOS preview build.** The preview variant ("Jew 365 P", `com.jew365.app.preview`, the red icon; root [AGENTS.md](AGENTS.md), Release and Updates) is wired for iOS (the `preview-ios` profile of [eas.json](eas.json), `pnpm build:ios:preview`), but no Apple step has been taken. The owner's steps: register the iPhone with `npx eas-cli device:create` (EAS prints a link to open on the phone), then run `pnpm build:ios:preview` once and answer its credentials prompts for the new bundle id (Apple account sign-in, the distribution certificate and an ad hoc provisioning profile that includes the registered iPhone). Install the build from its page on expo.dev. The Android side is done: build `c625eaa5` ([action-log.md](action-log.md)).
- **Moving the previous app's users.** The previous app is a different package, so its installs get nothing from this project. Each user exports a backup file in Settings there (only the previous app's 1.0.19 build can export), installs this app, restores the file on the welcome step, checks the data, and uninstalls the previous app: while both are installed, both send reminders. The taharah data does not move, by design. The previous EAS project stays until no install depends on it; deleting it on expo.dev is the user's step.
- **Families policy for the 13-15 audience.** Play's target audience is 13-15, 16-17 and 18+ (the user's call, 2026-10-20, because tefillin start at 13), so wherever 13-15 count as children (parts of the EU under GDPR) the Families policy applies: content fit for children and COPPA / GDPR rules for any data a child sends. The Contact us form sends a name and phone number through Formspree; before production, either confirm that flow complies or add a neutral age question before the form, and keep Sentry free of personal data. The 18+ alone answer removed the Families notice, which the user weighed and declined.
- **Google Play closed test, then production** (the user's call, 2026-10-20: upload now, with the icon and UI redesign arriving during the test). The Play Console stays owned by avi6190i, so it is a personal account and needs a closed test with at least 12 testers opted in for 14 days in a row before production; a new build does not restart the count, dropping under 12 testers does. Play App Signing uses the EAS keystore itself, so a direct APK and a Play install are signed alike and replace each other: Play had generated its own key (SHA-256 `47:2D:E3:57…`) when the app was created, and on 2026-10-21, before any release, it was replaced through PEPK by the EAS key `DC:62…00:B4`, which is also the upload key. EAS build `3753424b` (1.0.20, versionCode 3, the old icon) was never uploaded: on 2026-10-21 the user chose to ship the redesign first, so the first AAB is EAS build `cc56fee1` (1.0.21, versionCode 8) from a clean worktree of `11be1c8`, with the APK `d54afeab` (versionCode 9) beside it for direct installs. Never uploaded: the 1.0.20 pair (`a0d84bad`, `811bbbb9`), which cropped the launcher icon, and the first 1.0.21 pair (`0b2ddd8f`, `e2682ebc`), whose icon lacked the four symbols. Done on 2026-10-20: the app `com.jew365.app` in the Play Console, all ten App content declarations, the Hebrew default listing with its English translation, temporary store graphics, and the track `Closed testing - Alpha` with the testers group, all countries and the feedback address; every answer is recorded in [release/PLAY_CONSOLE_METADATA.md](release/PLAY_CONSOLE_METADATA.md). Done on 2026-10-21: the redesigned store graphics, the privacy policy with its `#delete` section pushed, and the signing key. Done on 2026-10-22: the AAB uploaded with its release notes, the store listing saved past draft, the exact-alarm declaration (Calendar), the AI asset labels, and all sixteen changes sent for Google's review; Google approved it the same night, and the release is available to the testers group. Left: the invitation to 15 to 20 testers so at least 12 stay opted in for 14 days in a row (2 opted in on 2026-10-22, the owner's own account among them), then the production application from the Dashboard. Then the App Store name and listing at the first iOS submission, from [release/](release), with the support and privacy URLs under `https://jew-365.github.io/jew-365/`.
- **No Sentry account yet** (the user's call, 2026-10-09), so crash reporting stays off: `organization` and `project` of the `@sentry/react-native/expo` entry in [app.json](app.json) are placeholders, no `EXPO_PUBLIC_SENTRY_DSN` is set, and every profile in [eas.json](eas.json) sets `SENTRY_DISABLE_AUTO_UPLOAD`. To close: open the account, set the DSN (Metro inlines it, so it ships over the air), add `SENTRY_AUTH_TOKEN` as an EAS secret, fill `organization` / `project` (native config, so the next build), and drop the two production `env` lines.
- **Rav review of the taharah rules.** [docs/taharah-review.html](docs/taharah-review.html) holds 14 "לאימות" items awaiting a rav's answers, now as an answer form (נכון / לא נכון and a note per item) that emails the answers to 365jew@gmail.com through Formspree; send the rav the page link: https://jew-365.github.io/jew-365/taharah-review.html. The rule table ships as initial. Each correction comes back as one preset edit in [src/data/taharahPresets.ts](src/data/taharahPresets.ts) that raises `TAHARAH_RULES_VERSION` and edits the same cell of the page.
- **Halachic review of the siddur texts.** The open items are listed in [scripts/siddur/AGENTS.md](scripts/siddur/AGENTS.md) (Work Guidance): meals, bedtime Shema, sights and food, Kiddush Levana, Sheva Berachot, Chanukah, Tehillim's Yehi Ratzon placement, and Shacharit's tallit and tefillin section.
- **Taharah device checks are not recorded.** The biometric lock, the `expo-secure-store` key and the headless `MARK_DONE` of a bedika were built and tested in Jest only (2026-10-08); no device run is recorded since.
- **Merged local branches.** Seven local branches are fully merged into `main`. Five are checked out nowhere and wait only for the user to run `git branch -d fix/audit-remediation hok-leisrael master reduce-apk-size refactor` (the agent's own run was refused by the auto-mode classifier on 2026-10-12; `fix/audit-remediation` stays on `origin`). The other two, `claude/adoring-agnesi-250cfe` and `claude/magical-wozniak-a1d944`, are checked out in clean worktrees under [.claude/](.claude) that belong to two inactive desktop sessions ("Fix vacuous scheduler test 6.6", "Fix the no-op timezone test matrix…"): archive or delete those sessions, let Settings › Storage clean up their worktrees, then delete the two branches.
