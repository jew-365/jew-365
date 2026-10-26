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
    - Hebrew localization: subtitle `סידור, תהילים, חק לישראל` (24 of 30); keywords `jew,תיקון,הכללי,התיקון,חוק,תהלים,זמני הלכה,מצוות,תפילין,ברכת המזון,קריאת שמע,לוח עברי,טהרה,סליחות` (97 of 100). `jew` with the `365` of the name answers "jew 365" in Israel without an English (U.K.) localization (Q1); `חוק` and `תהלים` are the spellings people type; no word repeats one of the name or the subtitle, which Apple counts as waste.
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
    - An English set in the order of the Hebrew one (Home, Siddur tab, Reader, History, Settings): 1206x2622 for the English (U.S.) App Store page and 1080x1920 for the Play English translation, made the way the Hebrew set was (Screenshot Plan in [release/APP_STORE_METADATA_EN.md](release/APP_STORE_METADATA_EN.md)).
    - One screenshot per language of a mitzvah reminder in the notification shade with its two buttons ("עשיתי" / "פתח נוסח", "Done" / "Open text"), taken on the Android emulator ([android-native-verify](.claude/skills/android-native-verify/SKILL.md)), since the web build shows no notification; it goes second in each set.
    - Uploads go through Chrome, each file under 10 MB.
  - **What it solves:** English visitors see Hebrew screens today, and no screenshot shows the reminder buttons, the app's own feature.
  - **Expected result:** after a reload, the English pages of both consoles show the English set and both languages show the reminder shot; the Screenshot Plan sections and the Store Graphics section of [release/PLAY_CONSOLE_METADATA.md](release/PLAY_CONSOLE_METADATA.md) list the new files.

### Low — Store listings of 2026-10-26

- [ ] Ask for a store rating inside the app
  - **Ships as:** a native build (`expo-store-review` is a native module), with the next build and its version decision ([state.md](state.md)).
  - **What it is:** the app asks the OS for its rating prompt (`StoreReview.requestReview()`) at the moment Q2 settles, never on the first launch and never inside a holy block (`quietBlockAt()` in [src/utils/skipRules.ts](src/utils/skipRules.ts)); the OS caps how often the prompt shows.
  - **What it solves:** ratings and downloads decide the rank for תהילים and סידור, where over 30 apps compete.
  - **Expected result:** a test that the request runs once at the chosen moment and never on the first launch or inside a holy block; on a device, the store's rating sheet opens from a store-installed build.

## Bugs

- [ ] A Hebrew Android phone shows the app's English name
  - **Done:** 2026-10-25. Verified: [scripts/__tests__/androidLegacyHebrewLocale.test.js](scripts/__tests__/androidLegacyHebrewLocale.test.js) (the file equals Expo's `values-b+he`), prebuild of both variants, `aapt2 compile` of `values-b+iw`, and `application-label-iw:'יהודי 365 P'` in build `c625eaa5`. Not checked: a phone set to Hebrew (the emulator went into a boot loop when its language was switched to Hebrew).
  - **Status:** Version: Build, expected with the next store production build · Committed: yes, `bf8e8f4` `9edff4b` `cdde147` `d2c206e` `c1989c4` · Pushed: yes · Live: preview build `c625eaa5` only; production builds `cc56fee1` (Play) and `d54afeab` (direct APK) still show the English name · Channel: preview
  - **Flag:** `Build`.
  - **Found:** the emulator side-by-side check, 2026-10-25 (launcher, Settings and a system dialog in Hebrew showed "Jew 365" and "Jew 365 P").
  - **What it is:** Expo writes `locales.he` to `values-b+he`, which Android never reads for Hebrew (it resolves `iw`); [scripts/withAndroidLegacyHebrewLocale.js](scripts/withAndroidLegacyHebrewLocale.js) writes the same strings to `values-b+iw`, Android only.
  - **What it solves:** a Hebrew Android phone shows "Jew 365" instead of `יהודי 365` on the launcher, in Settings and in system dialogs.
  - **Expected result:** a phone set to Hebrew shows `יהודי 365 P` for the preview build, and the store production build shows `יהודי 365`.

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

### For the owner

- **Q1 — An English (U.K.) localization on the App Store**
  - **Question:** add an English (U.K.) localization (name `Jew 365`, the English subtitle and a keyword field of its own), so the Israel storefront, which reads English (U.K.) and Hebrew only, reads English copy and a second 100-character keyword field?
  - **Assumption:** none is added; `jew` in the Hebrew keywords answers "jew 365" in Israel, and the English (U.S.) copy is read only in storefronts that list English (U.S.).
  - **Lives in:** the App Store Connect localizations; not built yet: task "Set the App Store subtitle and keywords for search". Whether a language can be added while 1.0.21 waits for review is not checked.
  - **What it affects:** English searches on the Israel storefront and the room for keywords there; which page an Israeli device set to English shows is not checked.
- **Q2 — When the app asks for a store rating**
  - **Question:** at which moment does the app ask for a store rating?
  - **Assumption:** right after a mark, on the seventh day that has at least one mark, never on the first launch or inside a holy block.
  - **Lives in:** not built yet: task "Ask for a store rating inside the app".
  - **What it affects:** every user once, and the ratings that rank the app.

## Other Open Items

- **Approve the tzaddik page choices D1–D4.** The pages are in production since `1.0.21-2` ([action-log.md](action-log.md), 2026-10-26); the choices taken while building them wait for the owner, who approves or changes each:
  - D1: Hebrew and English, like the rest of the app.
  - D2: The content is researched by agents with web search. Every fact rests on two independent sources, kept per entry in a `sources` list that the app does not show. Stories are only ones told in published sources, retold in the app's own words. An adversarial fact-check runs before the content lands, and the content waits for the owner's (or a rav's) review under Other Open Items.
  - D3: Waze opens with the grave's coordinates (`https://waze.com/ul?ll=<lat>,<lng>&navigate=yes`) only when the burial place is known, visitors can reach it, and two sources agree on the spot, in Israel or abroad. Otherwise the page says why there is no link (unknown, disputed or closed to visitors).
  - D4: A notice that names two or more tzaddikim opens one page with a switch between them (a `SegmentedControl` of their names), on the first one named.
- **Approve the display size choices D5–D8.** The setting is in production since `1.0.21-2` ([action-log.md](action-log.md), 2026-10-26); the choices taken while building it wait for the owner, who approves or changes each:
  - D5: Seven steps: 80%, 85%, 90%, 95%, 100% (today's size, the default), 110% and 120%. They are chosen in Settings → Display with a − / + stepper and a live sample.
  - D6: The siddur reader's text scales with the app, and its A+ / A− still works relative to that. The phone's own font size keeps applying on top, as today, so accessibility settings still work.
  - D7: Sizes are read once at launch, because every screen builds its styles at load. A change therefore asks once and then reloads the app (about a second). The same reload already happens when the language changes direction.
  - D8: This session, after the hilula pages. A separate session would start from the last commit, without the 140 files of uncommitted work, and would collide with them.
- **Review the content of the 57 tzaddik pages** ([src/data/hilulaPages.ts](src/data/hilulaPages.ts)). Agents researched it and an adversarial pass fact-checked it on 2026-10-26: 124 corrections and 45 doubts. The points that need the owner or a rav:
  - King David's link goes to the traditional site on Mount Zion, which historians do not take as the real grave.
  - Kever Rachel and Nabi Samwil are reached through secured routes.
  - Akiva Eiger's stone stands at an assumed spot (the original was destroyed in WWII).
  - The graves in Ukraine, Belarus and Russia are linked though travel warnings apply.
  - Waze links point to the cemetery for nine graves with no pinned point: Maran Yosef Karo, Rabbi Meir Shapiro, Rav Moshe Feinstein, Rav Shlomo Zalman Auerbach, Rav Elyashiv, Rav Kook, the Chazon Ish, the Steipler and Rav Chaim Kanievsky. For four more, the Rashash, the Vilna Gaon, Rav Shach and the Satmar Rebbe, the link uses a single map source.
  - The Satmar Rebbe's works leave out Vayoel Moshe (a polemic, under the no-politics rule).
  - Some stories and lessons rest on one source (Rabbi Chaim Pinto's two cups, Rebbe Levi Yitzchak's etrog, the Kotzker's saying on peace, Rav Chaim Kanievsky's 1948 hilltop).

  The full research output, with every correction and doubt, sits outside the repo, in a temp folder that may be cleaned: `C:/Users/avrah/AppData/Local/Temp/claude/C--work-personal-Kosher-Jew/4bcf610a-2199-4f3d-808c-6e673c399e36/scratchpad/hilula-content-research-2026-10-26.json`. Until the review, the content ships as written.

- **Release order for the 2026-10-24 batch.** Push `docs/` to `main` and confirm it is live before the OTA: the new bundle refuses a Chok manifest without `gz` (`curl -s https://jew-365.github.io/jew-365/chok/manifest.json` must show `gz` and `gzipBytes`, and `curl -sI` on one `.json.gz` must show `application/gzip` with no `Content-Encoding`), and the "Delete your data" link opens the privacy policy, whose Settings path changed with the batch. The About and contact store row opens the Play and App Store pages, which answer 404 until the app is public.

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
