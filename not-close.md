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
- [ ] Redraw the logo with the bell and the open book
  - **Done:** 2026-11-02. The owner approved round 2 ("מאשר, להחליף"): the letters, the bell and the book traced from the owner's image (`design/references/2026-11-02/logo.jpg`, the tracer in `design/jew365-concepts/vector/trace/`), the ring, ticks, button and degree sign measured from it, within 2 px at 1254; ink `#002767` (preview `#670005`), the icon on white framed as the image, the Android adaptive background white, the notification colour `#002767`. Verified: `pnpm logo:build` (its ink-radius and transparency checks: adaptive 261.8 of 312.3, splash 491.2 of 491.5), `logoAssets`, `appConfig` and `AppLogo` suites (46), the full suite, `pnpm doctor`, every exported PNG looked at, and the in-app logo drawn by react-native-svg on the web build. Not checked: the launcher icons and the in-app logo on a real iPhone or Android phone.
  - **Status:** Version: Build for the icons, splash and notification colour; OTA for the in-app logo · Committed: yes, `401de53` feat(logo): the owner's logo of 2026-11-02, a bell and an open book · Pushed: yes, 2026-11-02 · Live: the in-app logo in production `1.0.21-10` (group `54b1c45d-16f8-4cc3-b2dc-7e52b7dbfab2`, 2026-11-02, from `6695bb1`); the site's logo and favicon on Pages; the icons, splash and notification colour in iOS build 1.0.21 (5) (TestFlight since 2026-11-02, in App Store review) and not yet in an Android build · Channel: production (OTA, the in-app logo); Pages; TestFlight and App Store review (build)
  - **Ships as:** a build (launcher icons, splash, monochrome layer, notification silhouette) and over the air (the in-app logo of `logo.generated.ts`).
  - **What it is:** the owner's new logo of 2026-11-02: the open stopwatch ring with a button on top, the ticks of the left half, JEW over 365°, a large orange bell at the upper right and an open book at the lower right, in place of the check and the four symbols. Redrawn in [design/jew365-concepts/vector/build.mjs](design/jew365-concepts/vector/build.mjs) and exported by `pnpm logo:build` into every asset, the red preview variant included, once the owner approves a side-by-side render; the rule in [assets/AGENTS.md](assets/AGENTS.md) that names the four symbols changes in the same edit.
  - **What it solves:** the app carries the owner's new logo everywhere it shows one.
  - **Expected result:** the owner approves the render; `pnpm logo:build` passes its ink and transparency checks; `scripts/__tests__/logoAssets.test.js` and `scripts/__tests__/appConfig.test.js` pass; the new icon shows on the emulator's launcher. The Play listing's 512 icon and the store graphics follow with the store copy.
  - **Requested:** the owner, 2026-11-02 (D4 of "Answer App Review's 2.1(a) on 1.0.21").
- [ ] Answer App Review's 2.1(a) on 1.0.21
  - **Done:** 2026-11-02. Build 1.0.21 (5) attached in place of (4), the App Review notes replaced, the owner-approved reply sent to App Review (Messages 2) and the submission resubmitted after "Update Review" on the version page. Verified: `asc review status` read `WAITING_FOR_REVIEW`, submitted 2026-11-02 11:02 UTC ([release/RELEASE_LOG.md](release/RELEASE_LOG.md), 2026-11-02).
  - **Status:** Version: App Store submission of 1.0.21 (5) · Committed: n/a (records in this pass) · Pushed: n/a · Live: in App Store review with 1.0.21 (5), resubmitted 2026-11-02, public from the App Store release · Channel: App Store review
  - **Status 2026-11-02:** TestFlight build 1.0.21 (4) expired on 2026-11-02 and build 5 is on TestFlight for both groups, so every iOS tester runs build 5, the build in review (still `WAITING_FOR_REVIEW`). The owner checked build 5 on an iPhone through TestFlight that day: "בדקתי הכל מצויין" ([release/RELEASE_LOG.md](release/RELEASE_LOG.md), 2026-11-02).
  - **Ships as:** App Store Connect: a reply to App Review and a resubmission with a new 1.0.21 build (the owner's choice, 2026-11-02).
  - **What it is:** App Review rejected 1.0.21 (4) on 2026-11-01 under Guideline 2.1(a), Information Needed: it could not reach "all or part of the app" and asks for a demo account with content, or a demonstration mode; a demo video is not enough ([release/RELEASE_LOG.md](release/RELEASE_LOG.md), 2026-11-02). The app has no account at all, so the answer explains how every part opens without one. Its steps:
    - Read Apple's attachment `Screenshot-1101-141317.png` (App Store Connect › App Review › the submission; a download, the owner's approval), which shows the screen the reviewer could not pass. Done 2026-11-02 on the owner's approval: it is the first onboarding step of build 4, in Hebrew (the app starts in Hebrew whatever the device language, `language: 'he'` in [src/stores/useUserStore.ts](src/stores/useUserStore.ts)), with the name and phone fields, Continue and "יש לי קובץ גיבוי". Both fields are optional, but nothing on the screen says so in English, and the language switch the App Review notes point to (Settings › Device and notifications › Language) is out of reach until onboarding ends. The reviewer read it as a sign-up. The English copy of the step says "Enter your details to begin" (Bugs, "The English welcome step tells the user the name and phone are required").
    - Decided by the owner, 2026-11-02 ("כן בגדול אני רוצה תיקון ובילד", then four answers): fix the step and resubmit with a new 1.0.21 build that carries every change waiting for a build, rather than answering with build 4 (whose first launch runs its own Hebrew bundle). D1: a fresh install opens in the device's language, with a Hebrew / English switch on the welcome step (task "Open a fresh install in the device's language"). D2: the name and phone fields stay, marked optional, and the English line is fixed (Bugs, "The English welcome step tells the user the name and phone are required"). D3: of the build tasks not yet made, only the store rating joins this build ("Ask for a store rating inside the app"); the arm-only direct APK, R8 and the update push stay open. D4: the owner's new logo, a bell and an open book in place of the four symbols, redrawn in the generator for every asset ("Redraw the logo with the bell and the open book"). The build is 1.0.21 with the next build number on both platforms, so `version` stays and every install keeps receiving updates.
    - Reply to App Review and update the App Review notes: no account, login or payment exists; how to reach whatever the screenshot shows, the family purity tracker included (Settings › Profile, married, then its switch; its lock uses the device's own Face ID or passcode and can be switched off).
    - Resubmit 1.0.21, with build 4, or with a new 1.0.21 build (buildNumber 5) that carries today's features in its own bundle, so the reviewer's first launch already shows what the copy names; a build of the same `version` keeps every install on over-the-air updates. The owner chooses. With either, the version is open to edits again ("You can make edits to your app version below"), so the store copy and screenshots of 2026-11-01 can go in with the resubmission, on the owner's word ([Store listings of 2026-10-26 — batch rules](#store-listings-of-2026-10-26--batch-rules)).
  - **What it solves:** 1.0.21 cannot be approved or released until the issue is answered.
  - **Expected result:** App Store Connect shows the submission back in review, then approved; `asc review status` reads `WAITING_FOR_REVIEW`, then `PENDING_DEVELOPER_RELEASE`.
  - **Requested:** App Review's message of 2026-11-01, found in the owner's status read of 2026-11-02.
  - **Status 2026-11-08:** App Review rejected 1.0.21 (5) on 2026-11-07; the follow-up is the next item ([release/RELEASE_LOG.md](release/RELEASE_LOG.md), 2026-11-08).
- [ ] Answer App Review's rejection of 1.0.21 (5): optional profile questions, Shabbat review notes, build 6
  - **Done:** 2026-11-08, the code and the notes only. Verified: [src/app/__tests__/onboarding.cta.render.test.tsx](src/app/__tests__/onboarding.cta.render.test.tsx) (Continue enabled with both answers `null`, both groups labelled optional, answers kept when given), `pnpm typecheck`, `pnpm lint`, `pnpm check:dox`, the onboarding, i18n, guide, home, design-system and search-coverage suites, and `pnpm test:tz` (6,373 tests in each of the four zones, one skipped). Not checked: the step on a phone.
  - **Status:** Version: OTA `1.0.21-17` and Build 1.0.21 (6) with a new AAB · Committed: yes, `50ece63` feat(onboarding): make gender and marital status optional · Pushed: yes, 2026-11-08 · Live: no · Channel: none
  - **Flag:** OTA for every install, and `Build` for App Review (the reviewer's first launch runs the build's own bundle).
  - **What it is:** App Review rejected 1.0.21 (5) on 2026-11-07 (review on a Saturday, iPad Air 11-inch): 5.1.1(v), gender and marital status were required (Apple's screenshot shows Continue disabled on "About you"); 2.1(a), "the app was not available at the time of review"; 2.1, "Does the app retain any information from the onboarding questions?". The owner's decisions of 2026-11-08: both questions optional, Continue always enabled ([src/app/onboarding/profile.tsx](src/app/onboarding/profile.tsx), `onboarding.genderLabel`, `onboarding.maritalStatusLabel`, `onboarding.profileBody`), home's `home.completeProfile` reworded without "New"; the Shabbat issue answered by the review notes and the reply only, the rest screen unchanged; new review notes in [release/APP_STORE_METADATA_EN.md](release/APP_STORE_METADATA_EN.md) (pick Honolulu on a Friday, Tokyo on a Saturday, never New York); a new iOS build and a new Android AAB from the same commit.
    - Commit and push, then `pnpm update:production` (`1.0.21-17`, its what's-new item is in place).
    - `pnpm build:ios:production` (buildNumber 6), upload with `asc builds upload`, attach to 1.0.21, replace the App Review notes, reply to App Review (yes, on the device only; both questions optional; what each sets), Update Review, Resubmit.
    - `pnpm build:android:production:aab`, upload to `Closed testing - Alpha`; once production access is granted, release it on the production track.
  - **What it solves:** 1.0.21 cannot be approved until 5.1.1 is fixed and the questions are answered, and a Saturday review must reach the app.
  - **Expected result:** the profile step continues with nothing chosen on iOS and Android; App Review approves 1.0.21 (6); `asc review status` reads `PENDING_DEVELOPER_RELEASE`.
  - **Requested:** App Review's message of 2026-11-07, found in the owner's status read of 2026-11-08; the owner's decisions the same day.
- [ ] Google Play production access
  - **Done:** 2026-11-08, applied. Verified: the Dashboard read "We received your application for production access", submitted 2026-11-08 10:00, usually 7 days or less; the answers are in [release/PLAY_CONSOLE_METADATA.md](release/PLAY_CONSOLE_METADATA.md), Production Access Application.
  - **Status:** Version: none (an account permission) · Committed: no (records in this pass) · Pushed: no · Live: waiting for Google's answer · Channel: Play Console
  - **What it is:** the personal developer account needs Google's approval before any production release; only the account owner, avi6190i@gmail.com (`/console/u/1/`), can apply, not the 365jew admin.
  - **What it solves:** opens the Production track for the first store release on Android.
  - **Expected result:** an email to the account owner and a Dashboard that offers a production release; then the new AAB goes to production.
  - **Requested:** the owner, 2026-11-08.
- [ ] iOS build 1.0.21 (4)
  - **Done:** 2026-10-22. Verified: build `72c51b1e` FINISHED after `052c2db2` and `1b4f562b` errored ([release/RELEASE_LOG.md](release/RELEASE_LOG.md)).
  - **Status:** Version: Build `1.0.21` (4), expected on the App Store · Committed: yes, `42e961d` fix(ios): give expo.name Latin letters so EAS finds the Xcode target; `a035ab3` feat(ios): keep the taharah fallback out of iCloud, ship iPhone only; `04500e7` fix(ios): add @sentry/cli as a direct dev dependency · Pushed: yes · Live: `72c51b1e` on TestFlight (public link); rejected by App Review on 2026-11-01 (Guideline 2.1(a), see "Answer App Review's 2.1(a) on 1.0.21"); App Store release not yet · Channel: TestFlight
  - **Flag:** `Build` (iOS).
  - **What it is:** `expo.name` in Latin letters so EAS finds the Xcode target, `@sentry/cli` as a direct dev dependency, the taharah fallback file out of iCloud, iPhone only ([app.json](app.json), [package.json](package.json)).
  - **What it solves:** the iOS builds `052c2db2` and `1b4f562b` errored before these changes.
  - **Expected result:** the App Store releases 1.0.21 (4) after review and the owner's Release, and it installs on an iPhone.
  - **Requested:** the owner, 2026-10-22 (iOS via TestFlight).
  - **Status 2026-11-02:** build 4 expired on TestFlight on 2026-11-02 (`asc builds expire`, read back `expired: true`), and build 1.0.21 (5) is on TestFlight for both groups and in App Store review. This item's result, the App Store releasing a 1.0.21 build, now comes through build 5 ("Answer App Review's 2.1(a) on 1.0.21"); the owner decides whether this item is dropped.
- [ ] Store copy names kinds of features, never counts
  - **Done:** 2026-10-25. Verified: read against the rule; the site answers 200.
  - **Status:** Version: store copy, expected with the store production release (the site part is on Pages) · Committed: yes, `1e12449` · Pushed: yes · Live: the site at https://jew-365.github.io/jew-365/; the Play and App Store listings not yet re-entered · Channel: production (Pages); consoles not yet
  - **Flag:** the store consoles; the site part ships on Pages.
  - **What it is:** the listings and the site's feature list rewritten to the owner's rule ([release/PLAY_CONSOLE_METADATA.md](release/PLAY_CONSOLE_METADATA.md), [release/APP_STORE_METADATA_HE.md](release/APP_STORE_METADATA_HE.md), [release/APP_STORE_METADATA_EN.md](release/APP_STORE_METADATA_EN.md), [docs/index.html](docs/index.html)). The copy is entered in both consoles together with "Add Chok LeYisrael to the store listings".
  - **What it solves:** the store copy follows the owner's rule of 2026-10-25 ([release/AGENTS.md](release/AGENTS.md)): kinds of features, never counts.
  - **Expected result:** both consoles show the rewritten copy after a reload, and the store production release carries it.
  - **Requested:** the owner's rule of 2026-10-25.
  - **Status 2026-11-02:** re-entered in App Store Connect (Hebrew, English (U.S.) and (U.K.)), in review with 1.0.21 (5); the Play listing not yet (held by the owner).
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
  - **Status 2026-11-01:** the copy in [release/](release) and [docs/index.html](docs/index.html) is rewritten for the features of production `1.0.21-8` (committed in `89f94d5` docs(store): store copy for 1.0.21-8, held by the owner; pushed to `main`); the console re-entry is held by the owner ([Store listings of 2026-10-26 — batch rules](#store-listings-of-2026-10-26--batch-rules)).

  - **Status 2026-11-02:** the App Store copy is entered on all three pages and in review with 1.0.21 (5); the Play listing stays held by the owner.
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
- **On hold (the owner, 2026-11-01: "לחכות עם שתיהן"):** nothing of this batch goes into either console until the owner lifts the hold. On 2026-11-02 the owner lifted the hold for the App Store ("כן שלח כולל כל הטקסטים והתיקונים והצילומים"): the copy, the subtitles, English (U.K.), the secondary category and the screenshots went in with build 1.0.21 (5), which carries the features they name. Google Play stays held ("לאנדרואיד אל תעשה לא בילד ולא כלום"). The builds the stores review predate most of the features the new copy names (iOS build 4 from `04500e7`, Play versionCode 8 from `11be1c8`; the rest reaches installs over the air, after the first launch), the App Store screenshots and new localizations are locked while 1.0.21 waits for review, and removing it from review restarts the review ([release/RELEASE_LOG.md](release/RELEASE_LOG.md), 2026-11-01). The copy in [release/](release) and the screenshots are ready.

### High — Store listings of 2026-10-26

- [ ] Set the App Store subtitle and keywords for search
  - **Done:** 2026-11-02. Verified: read back through `asc`: Hebrew subtitle `סידור, תהילים, חק לישראל`, English (U.S.) and (U.K.) `Siddur, Tehillim & Zmanim`; keywords Hebrew 93, English 99 (the owner lifted the App Store hold that day).
  - **Status:** Version: App Store Connect, with 1.0.21 · Committed: n/a · Pushed: n/a · Live: in App Store review with 1.0.21 (5), resubmitted 2026-11-02, public from the App Store release · Channel: App Store review
  - **Ships as:** a console change in App Store Connect, no build.
  - **What it is:**
    - Hebrew localization: subtitle `סידור, תהילים, חק לישראל` (24 of 30); keywords `jew,תיקון,הכללי,התיקון,חוק,תהלים,זמני הלכה,מצוות,תפילין,ברכת המזון,קריאת שמע,לוח עברי,טהרה,סליחות` (97 of 100). `jew` with the `365` of the name answers "jew 365" in Israel until the English (U.K.) localization carries the name `Jew 365` there: once that localization is saved, the Hebrew field drops `jew,` (93 of 100) in the same pass (task "Add an English (U.K.) localization on the App Store"); `חוק` and `תהלים` are the spellings people type; no word repeats one of the name or the subtitle, which Apple counts as waste.
    - English (U.S.) localization: subtitle `Siddur, Tehillim & Zmanim` (25 of 30); keywords `psalms,tehilim,sidur,chok,hok,leyisrael,leisrael,tikkun,tikun,haklali,klali,mitzvah,tefillin,jewish` (99 of 100).
    - Promotional text, which search does not read, opens with the tagline: `כל מצווה בזמנה: זמני הלכה מדויקים, תזכורות בחלון הזמן של כל מצווה, סידור בארבעה נוסחים, ואפליקציה שנחה בשבת ובחג. בלי חשבון.` (124 of 170) and `Every mitzvah in its time: accurate zmanim, reminders inside each mitzvah's window, a siddur in four nusachim, and an app that rests on Shabbat and Yom Tov. No account.` (168 of 170).
    - When: while 1.0.21 waits for review. On 2026-10-26 the name, subtitle, keyword and description fields were open in that state, and App Information says its changes go out with the next app version, which is 1.0.21. Once 1.0.21 is released, the subtitle and the keywords change only with a new version, that is a new build that raises `version` (root [AGENTS.md](AGENTS.md), Never raise `version` for a JS change).
    - The names-and-tagline rule of [release/AGENTS.md](release/AGENTS.md) changes in the same edit: the subtitles become the ones above.
  - **What it solves:** today's subtitle and keywords carry none of תהילים, חק לישראל or תיקון הכללי, and the English name is not read in Israel.
  - **Status 2026-11-01:** held by the owner (batch rules above). The fields are still open while 1.0.21 waits for review, but the Hebrew subtitle names Chok LeYisrael, which build 4 does not hold, and App Information's changes may join 1.0.21 itself.
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
  - **Done:** 2026-11-02. Verified: read back: App Information `en-GB` (name `Jew 365`, the subtitle, the English Privacy Policy URL) and its version page (the English description, promotional text, keywords, support and marketing URLs, the seven English screenshots); the Hebrew keywords dropped `jew,` in the same pass. It could be added once the rejection reopened the version.
  - **Status:** Version: App Store Connect, with 1.0.21 · Committed: n/a · Pushed: n/a · Live: in App Store review with 1.0.21 (5), resubmitted 2026-11-02, public from the App Store release · Channel: App Store review
  - **Ships as:** a console change in App Store Connect, no build.
  - **Decided:** the owner, 2026-10-26 (Q1, "מאשר"). The Israel storefront reads only the Hebrew and English (U.K.) localizations, so an English (U.K.) page puts the English name and a second keyword field in front of Israeli searches.
  - **What it is:**
    - App Information → Localizations: add English (U.K.) with the name `Jew 365`, the subtitle `Siddur, Tehillim & Zmanim` (the English (U.S.) subtitle of the task "Set the App Store subtitle and keywords for search") and the Privacy Policy URL `https://jew-365.github.io/jew-365/privacy/en/`.
    - Version page 1.0.21 → English (U.K.): the description, promotional text, support URL and marketing URL of the English (U.S.) page as they stand when this runs (the fields of [release/APP_STORE_METADATA_EN.md](release/APP_STORE_METADATA_EN.md)); keywords `psalms,tehilim,sidur,chok,hok,leyisrael,leisrael,tikkun,tikun,haklali,klali,mitzvah,tefillin,jewish` (99 of 100), the English (U.S.) set, which Israel does not read on the U.S. page; screenshots: the ones the English (U.S.) page uses ("Using Existing Assets"), replaced by the English set when the task "Make English screenshots and a screenshot of a reminder" lands.
    - In the same pass, the Hebrew keyword field drops `jew,`: the U.K. name carries it in Israel.
    - When: with the subtitle and keywords task, while 1.0.21 waits for review, because after the release the U.K. name, subtitle and keywords reach the store only with a new version. First check that App Store Connect lets a language be added in the Waiting for Review state (not checked on 2026-10-26); if it does not, stop and ask the owner whether to withdraw the submission to add it (the review starts over) or to add it with the next version.
    - Record the localization in the App Record and Version Page sections of [release/APP_STORE_METADATA_EN.md](release/APP_STORE_METADATA_EN.md), and the step in [release/RELEASE_LOG.md](release/RELEASE_LOG.md).
  - **Status 2026-11-01:** checked: App Store Connect offers no new language while 1.0.21 waits for review (the language menus list only Hebrew and English (U.S.)), so English (U.K.) joins the next version; until then the Hebrew keywords keep `jew,`.
  - **What it solves:** today no English copy or English keyword is read in Israel, and the Hebrew field spends a keyword on `jew`.
  - **Expected result:** after a reload, App Information lists English (U.K.) with the name `Jew 365` and the subtitle within 30, and its version page shows the keywords within 100; within days of the release, the iTunes Search API with `country=il` returns the app for `jew 365`, `tehillim` and `siddur`, and its rank for each is recorded.

### Medium — Store listings of 2026-10-26

- [ ] Set the App Store secondary category to Reference
  - **Done:** 2026-11-02. Verified: `asc categories set --primary LIFESTYLE --secondary REFERENCE`, read back `REFERENCE`.
  - **Status:** Version: App Store Connect · Committed: n/a · Pushed: n/a · Live: in App Store review with 1.0.21 (5), resubmitted 2026-11-02, public from the App Store release · Channel: App Store review
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
  - **Status 2026-11-01:** the Hebrew and English sets are made by the new `pnpm store:screenshots` ([scripts/store/screenshots.mjs](scripts/store/screenshots.mjs), committed in `b6dbd33` feat(store): screenshots script for both stores; pushed to `main`): seven screens each (Home, Siddur tab, Reader on Ashrei, History, Settings, a tzaddik page, the weekly report), 1206x2622 for the App Store and 1080x2160 for Play, kept in the owner's Downloads folder `jew365-store-assets-2026-11`. Left: the reminder shot, and the uploads, held by the owner (batch rules above; the App Store screenshots are locked until 1.0.21 leaves review).
  - **What it solves:** English visitors see Hebrew screens today, and no screenshot shows the reminder buttons, the app's own feature.
  - **Expected result:** after a reload, the English pages of both consoles show the English set and both languages show the reminder shot; the Screenshot Plan sections and the Store Graphics section of [release/PLAY_CONSOLE_METADATA.md](release/PLAY_CONSOLE_METADATA.md) list the new files.

  - **Status 2026-11-02:** the App Store part is live in review: seven Hebrew and seven English shots (re-rendered with the new logo) on the Hebrew, English (U.S.) and English (U.K.) pages of 1.0.21. Left: the reminder shot and Play's English set, held by the owner ("לאנדרואיד אל תעשה לא בילד ולא כלום", 2026-11-02).
### Low — Store listings of 2026-10-26

- [ ] Ask for a store rating inside the app
  - **Done:** 2026-11-02. Verified: `rating.test.ts` (11, and under `test:tz`), `storeReview.test.ts` (the delay, one ask, stamp before the sheet, unavailable, background, web, a missing native module with no throw, and no ask for a mark from a notification), `ratingStamps.store.test.ts`, `rootLayout.render.test.tsx`, a source guard against a module-scope import; not checked on a phone.
  - **Status:** Version: Build (`expo-store-review` 9.0.9), the JS over the air · Committed: yes, `cad5197` feat: welcome step in the device's language, store rating, smooth mark collapse · Pushed: yes, 2026-11-02 · Live: the JS in production `1.0.21-10` (group `54b1c45d-16f8-4cc3-b2dc-7e52b7dbfab2`, 2026-11-02, from `6695bb1`) and in preview `1.0.21-38` (group `7d350f16-2bf1-442e-ba40-6499b7fb061e`, from `cad5197`), inert on both without the module (the preview build `c625eaa5` and the installed production binaries have no `ExpoStoreReview`, so the call-time load fails quietly); the module is in iOS build 1.0.21 (5), on TestFlight and in App Store review, store production not yet, and it asks only in a build that has it · Channel: production (OTA, inert); preview; TestFlight and App Store review (build)
  - **Flag:** `Build` (`expo-store-review` is a native module), with the next build and its version decision ([state.md](state.md)).
  - **Status 2026-11-02:** joins the next 1.0.21 build (the owner's D3, "Answer App Review's 2.1(a) on 1.0.21"). `expo-store-review` 9.0.9 (the SDK 54 pin) calls `requireNativeModule('ExpoStoreReview')` when it is imported, which throws on a binary without the module, and this code also reaches the installed binaries over the air: the service loads the package only inside a try/catch at the moment it asks, never at module scope.
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
  - ~~The battery exemption stays the system settings screen, never the direct dialog.~~ Overruled by the owner on 2026-10-28: the battery row shows the system dialog that sets the app to "Unrestricted" in one tap (`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`), accepting that Google Play restricts that permission to apps whose core function Doze breaks ([Android, Doze and App Standby](https://developer.android.com/training/monitoring-device-state/doze-standby)) and may ask for a declaration or reject the build; the next build would then drop the permission and fall back to the settings list.
- **Answered by the owner, 2026-10-26** (each written into its task): past the cap the far days are thinned from the third day, with an end notice on both platforms (Q3); the history tab starts with sketches carrying a greeting, a line per number, the best streak, badges and each mitzvah's streak (Q5); the siddur tab opens with "now" open and every other group closed, on every visit (Q6); about 30 tzaddik candidates, balanced across the communities (Q7); the performance measurement starts without the phone's details; the permissions step and card wait whole for the next native build, so every row shows its real status (Q4).
- **Waiting for the owner:** nothing in this batch.
- **Done means:** both dictionaries updated, a DOX pass on every touched AGENTS.md, the guide topic and a `WHATS_NEW` item with `pnpm guide:build` for every user-visible change, `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` green, and the screen checked in the `expo-web` preview at 375 points in Hebrew and English, or on the Android emulator through [android-native-verify](.claude/skills/android-native-verify/SKILL.md) for a native path. No commit and no OTA without the user's per-action approval.

### High — App requests of 2026-10-26

- [ ] Add a permissions step to onboarding and a permissions card to Settings
  - **Flag:** `Build`, with the next native build and its version decision ([state.md](state.md)); the whole step and card ship together, with every row's real status.
  - **Decided:** the owner, 2026-10-26 (Q4, "ב. לחכות עם כל הדף לבנייה הבאה"): nothing of this task ships over the air before that build.
  - **What it is:**
    - **Native module:** a small Android-only module of the repo (a local Expo module, or Kotlin written by a config plugin like [scripts/withMitzvahNotificationAction.js](scripts/withMitzvahNotificationAction.js)) exposing `isIgnoringBatteryOptimizations()` (`PowerManager`), `openSamsungNeverSleeping()` (action `com.samsung.android.sm.ACTION_OPEN_CHECKABLE_LISTACTIVITY`, package `com.samsung.android.lool`, the integer extra `activity_type` 2, per [Samsung, app management](https://developer.samsung.com/mobile/app-management.html)), `unusedAppRestrictionsStatus()` (`PackageManagerCompat.getUnusedAppRestrictionsStatus()`) and `openUnusedAppRestrictions()` (`IntentCompat.createManageUnusedAppRestrictionsIntent()`, started for a result, per [Android, app hibernation](https://developer.android.com/topic/performance/app-hibernation)). One module covers all four, so `expo-battery`, which answers only the first, is not added. Web and iOS get a shim that reports nothing.
    - **One component:** `PermissionsList` in [src/components/](src/components), used by both screens. Each row has an icon, a title, one line on why the app needs it, a status pill (`פעיל` when granted) and, while not granted, an action button. Statuses are read on mount and again on every `AppState 'active'`, so a return from the system settings updates them.
    - **Rows:**
      1. Notifications, every platform: the status of expo-notifications; the button asks, or opens the app's settings once refused.
      2. Location, every platform: `getForegroundPermissionsAsync()`; the button asks through [src/services/LocationService.ts](src/services/LocationService.ts). Optional: it serves the GPS city and the compass.
      3. Battery, Android: the button shows the system dialog that sets the app to "Unrestricted" (`requestIgnoreBatteryOptimizations()` of the module, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` in the manifest; the owner's call, 2026-10-28), falling back to `openBatteryOptimizationSettings()` of [src/services/deviceSettings.ts](src/services/deviceSettings.ts) where a ROM lacks it; active while `isIgnoringBatteryOptimizations()` is true. Built now (2026-10-28), shipped with the next build.
      4. Samsung sleep, Android when `Platform.constants.Manufacturer` is `samsung`: explains Background usage limits → Never sleeping apps, and the button opens that list through `openSamsungNeverSleeping()` (`Linking.sendIntent` cannot: it passes every number as a double), falling back to `Linking.openSettings()`. No API reports this list, so the row shows no status; if the check on the owner's Samsung finds that "ללא הגבלה" of row 3 also takes the app off Samsung's sleeping lists, this row is dropped and row 3 names Samsung.
      5. Pause when unused, Android 11 and later: Android hibernates an app unused for a few months, resetting its permissions and stopping its alarms; the button opens `openUnusedAppRestrictions()`, and the row is active while `unusedAppRestrictionsStatus()` reports the restrictions off.
      6. Background refresh, iOS: `BackgroundTask.getStatusAsync()` (Available or Restricted); the button opens the app's settings.
    - **Onboarding:** a new step, `src/app/onboarding/permissions.tsx`, after the location step and before ready, shown on every onboarding even when everything is granted (each granted row marked active). Continue is never blocked. The location step keeps the city and the GPS button and drops its notifications card. `ONBOARDING_STEPS` becomes 7.
    - **Settings:** the device section's permission rows, the OS status row and the battery block, become this card; the settings search entries for the battery and the notification permission open it.
  - **What it solves:** the user asked for one place, in onboarding and in Settings, that shows each permission the app needs, marks what is granted, and grants the rest, the battery exemption included.
  - **Expected result:** render tests of `PermissionsList` over a mocked native module for each row granted, not granted and refused, the Samsung row only for that manufacturer, the iOS row only on iOS, the hibernation row only on Android 11 and later, and a status that updates on `AppState 'active'`; the onboarding tests take 7 dots and the new step; [routes.test.ts](src/app/__tests__/routes.test.ts), the smoke suite and the guide test cover the new route; on the emulator (a build with the module), granting each permission from the step marks its row active after the return; on the owner's Samsung, the Never sleeping apps link opens that list, and whether "ללא הגבלה" alone takes the app off it is recorded here.
  - **Done:** 2026-10-28. Verified: the gate above green; on the Android emulator (dev build from a prebuild) the `power-settings` module compiled, the card showed notifications and location as פעיל and the battery as אפשר, the battery button opened the system "Let app always run in background?" dialog, and after Allow the row turned פעיל and `dumpsys deviceidle whitelist` listed `com.jew365.app`. Not checked: the Samsung row (needs the owner's Samsung), the iOS background-refresh row, and the Play Console review of `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`.
  - **Status:** Version: OTA `1.0.21-5` for the JS, Build for the native module · Committed: yes, `1211b74` · Pushed: yes · Live: production `1.0.21-5` (group `f34a9229-cc35-4ab3-a199-37f42c964f13`, 2026-10-29, from `1211b74`); preview `1.0.21-17` (group `702c81c3-24d6-4b7f-90f2-ce829fff7f08`); the JS only, so on the shipped binary the battery row opens the battery settings list and the Samsung and pause-when-unused rows are hidden; native half (`power-settings` and `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`): not yet live, waits for the next native build · Channel: production, preview
  - **Owner's call, 2026-10-28:** ship the JS now over the air rather than wait for the build (overrides Q4 of 2026-10-26).
  - **Status 2026-11-02:** the JS has been live in production since `1.0.21-5` and is in `1.0.21-10`; the native half (the `power-settings` module and `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`) is in iOS build 1.0.21 (5), in App Store review (its iOS side reports nothing), and waits for an Android build. The item stays until that build is on Google Play's production track.

### High — Performance, App requests of 2026-10-26

The user reports that screens sometimes stick, navigation sometimes does nothing and some animations do not play. A read of the code on 2026-10-26 found no single loop but bursts that block the JS thread: at every :00 and :30, at launch, on a return to the app and after a mark. Every animation in the app is reanimated, so a blocked commit delays its start, and a tap held up past 500 ms on a home card opens the quick sheet instead of the mitzvah. The tasks below run in order; each one's numbers come from the first.

- [ ] Measure the JS-thread stalls before any change
  - **Flag:** none: measurement.
  - **What it is:** on the Android emulator, with a release-like build of the current `main` ([android-native-verify](.claude/skills/android-native-verify/SKILL.md)), record with the Hermes sampling profiler (React Native DevTools → Performance): 60 seconds idle on home, one return from the background, one mark and one undo on home, one open of Settings, one open of Shacharit and of Tehillim in the reader. Temporary `performance.now()` logs (never committed) time the home memo, the siddur tab's memos, `selichotOfferOn`, the settings search index, `computeStats`, `buildPlan` and `refreshSchedulingOnForeground`, and count `dayFeatures()` calls and zmanim cache misses per tick. The owner chose on 2026-10-26 to start without the phone's details.
  - **What it solves:** every later fix is judged against numbers, not guesses.
  - **Expected result:** a table under this item: each scenario's longest JS-thread block in ms and the top functions in it, and a target per scenario (no block over 100 ms while idle or on a tap).

### App requests of 2026-10-28 — batch rules

- **Requested:** the user, 2026-10-28, in a Claude Code session: three requests in one message — entrance animations that wait until they are on screen, the battery "Unrestricted" setting reachable from Settings and onboarding, and the prayer compass offered from the siddur.
- **Answered by the owner, 2026-10-28:** the battery row uses the direct system dialog (see the overruled decision in the 2026-10-26 batch rules); the whole permissions step and card of the 2026-10-26 task are built now, to ship with the next build; an entrance animation plays once per screen visit, the first time its part is visible; the compass's "continue to prayer" button appears the first moment the user faces the Kotel and stays.
- **Done means:** as in the 2026-10-26 batch.

### High — App requests of 2026-10-28

### Nagging levels and reminder nags, 2026-11-01 — batch rules

- **Requested:** the user, 2026-11-01, in a Claude Code session, in Hebrew: a nagging level (רמת נודניקיות) from 1 to 5 for the whole app and per mitzvah, where today's defaults are level 1 and every level up means more notifications for a mitzvah; and a nag (נודניק) on every reminder, registry and custom mitzvot alike: how many times it repeats, every how many minutes (3 or 5 were named) and whether before the reminder's time, after it or half and half; the UI, the UX and the logic all to be designed; planning and tasks only for now.
- **Answered by the owner, 2026-11-01, in two rounds:** Q9 (the level table), Q10 (a count of 1 to 5, intervals of 3, 5, 10 and 15 minutes), Q11 (a repeat's suffix "תזכורת k מתוך n"), Q12 (three states on a reminder: by the level, none, custom; "צודק, תכתוב את זה באפיון") and Q15 (mitzvah reminders only) approved; Q13 answered no, "אין שום תזכורת בסוף הזמן", with the placement rule: the user chooses a nag before or after a start reminder or a set-time reminder, a before-the-end reminder nags only before itself, and the bedtime Shema (`krias_shma_al_hamita`) only before its hour, so a level's preset follows the anchor (after a start or set-time reminder, before the others; spec 3.2.1); Q14 answered with four levels instead of five, level 4 (three repeats every 5 minutes) the top on iPhone and Android alike, "שיהיה אחיד", so nothing platform-specific is shown and the keep order of spec 3.7 stays as the silent safety net.
- **Spec:** [.claude/specs/nagging-levels.md](.claude/specs/nagging-levels.md) holds the design: the model, every rule, each surface, the data, the i18n keys, the tests and the docs. A task below names the spec section it implements; the spec is the contract, this file the queue.
- **Flag:** every task carries `OTA`: pure JavaScript, no native module, no field of [app.json](app.json), no change to the Android notification plugin; a task that turns out to need one stops and says so.
- **Decisions taken** (Claude's, cheap to reverse, the owner may overrule): a level is a preset nag applied to every reminder that has no explicit nag of its own, never a set of extra reminders at fractions of the window (spec 3.1: a "last call" on a window that ends at alot would fire at 04:30); an explicit nag beats the level, and `null` on a reminder means no nag whatever the level says; a repeat is judged by the same `reminderFires()` as its main, so it never crosses the window's end, never falls more than 180 minutes before it and never inside a holy block; repeats count from the main's final instant, after a quiet-hours move; a repeat that lands on another notification of the same mitzvah at the same instant is dropped; thinning keeps mains only; the ids are `…__<idx>[.<occurrence>]~<k>` and `parseId()` is unchanged; `SCHEDULE_FORMAT` goes to 11; "חזרה לברירת מחדל" keeps the mitzvah's level; the custom form also offers the mitzvah's level; the per-day estimate the screens print is the sum of 1 plus each reminder's repeats; the bedtime Shema's before-only rule is `BEFORE_ONLY_MITZVOT = ['krias_shma_al_hamita']` and covers every reminder of that mitzvah, a `blockExit` reminder offers `after` alone (a repeat before the exit is inside the block), and a stored placement a reminder does not allow is coerced to the first allowed one.
- **Open:** nothing; every question of the batch was answered on 2026-11-01. On the owner's word that night ("תתחיל לבצע את כל המשימות שאתה לא צריך אותי בשביל החלטה שלהם"), the logic and the surfaces were both built, the surfaces first on the spec's baseline (section 4), then, after the owner's picks of 2026-11-02 in the design study, on those picks (`7d15756`). The nagging tasks went through preview `1.0.21-37` and into production `1.0.21-10` on 2026-11-02, and moved to [action-log.md](action-log.md); what stays open is the emulator check of a nag chain, below.
- **Done means:** both dictionaries updated with every key the task adds, a DOX pass on every touched AGENTS.md, the spec section the task names implemented as written or the deviation written back into the spec, a new store field with a default, a merge repair and a reset, the preview and the plan from one function, the search finding every new setting, and `pnpm typecheck`, `pnpm lint`, `pnpm check:dox` and `pnpm test:tz` green. No OTA without the owner's per-action approval.

### Medium — Nagging levels and reminder nags

- [ ] Verify a nag chain on the emulator
  - **Flag:** none (verification).
  - **What it is:** Through [android-native-verify](.claude/skills/android-native-verify/SKILL.md), a dev or preview build of the finished work on the emulator: Mincha with an explicit nag of 3 every 3 minutes `after`, the app level at 3 for the rest; the quiet hours off, then on with "no notifications before" set a few minutes ahead of a main.
  - **What it solves:** The Jest suites cannot show the OS delivering three separate notifications, or the Kotlin mark-done service and `cancelForMitzvah()` clearing a chain's presented repeats.
  - **Expected result:** Screenshots of the tray with the main and its three repeats three minutes apart, each with both buttons; a mark-done from the first removes the other pending ones and dismisses the presented ones; under the quiet hours the main and its repeats arrive from the chosen hour on; the mitzvah screen named the same times beforehand.

### Nusach Teiman, 2026-11-02 — batch rules

- **Requested:** the user, 2026-11-02, in a Claude Code session, in Hebrew: add nusach Teiman to the siddur and to everything it is relevant for.
- **Decisions taken:** the owner's call, 2026-11-02: Baladi only, one new nusach; Shami is not added.
- **Spec:** [.claude/specs/nusach-teiman.md](.claude/specs/nusach-teiman.md), the source map.
- **Source of the missing texts:** the 1894 Tiklal, transcribed (Q16, answered 2026-11-03). The network block that held the batch earlier the same day (the cloud environment denied `www.sefaria.org` and `he.wikisource.org`, the two hosts [scripts/siddur/build.js](scripts/siddur/build.js) fetches) was lifted by the owner on 2026-11-02 (Other Open Items).
- **Done means:** the standing rule above (every siddur text ships for all nuschaot or not at all), so the nusach reaches the app only together with all its texts; every halachic choice listed under [For the rav](#for-the-rav); both dictionaries, the search, the guide and a `WHATS_NEW` item; a DOX pass; `pnpm siddur:build` twice with no change on the second run; `pnpm typecheck`, `pnpm lint`, `pnpm check:dox`, `pnpm test:tz` green.
- **Pending, 2026-11-03:** R14 and R16 under [For the rav](#for-the-rav), both on the review page; Q27 and Q28 under [For the owner](#for-the-owner); nothing of the batch after the source map is committed.

### High — Nusach Teiman

- [ ] Pin and map the Baladi source
  - **Done:** 2026-11-02, once the owner opened network access. Verified: every row of the map read live from the Wikisource API at its pinned revision and checked with `--inspect`. The map of every siddur text against its Baladi page and revision is [.claude/specs/nusach-teiman.md](.claude/specs/nusach-teiman.md), read from the Wikisource API and Sefaria's index. Sefaria has no Yemenite text. Wikisource builds 14 texts and part of Shacharit (16 of the app's 26 with the two shared texts, Ushpizin not offered); 8 texts have no Baladi source, and Shacharit lacks its ending, Hallel and Musaf (Q16).
  - **Status:** Version: none (research; an internal spec) · Committed: yes, ed0758f docs(specs): the Baladi source map of nusach Teiman, and Q16 for the owner · Pushed: yes · Live: n/a · Channel: —
  - **Flag:** none (research; the pinned source lands with the next task).
  - **What it is:** Verify the candidate source, the Hebrew Wikisource transcription of "תכלאל עם פירוש עץ חיים" (Jerusalem 1894-1898, ed. R. Avraham Alnadaf, named by HaMichlol's "תכלאל" article), or whatever Baladi pages Hebrew Wikisource holds, which [scripts/siddur/build.js](scripts/siddur/build.js) reads through the MediaWiki API it already uses. Check its license, its completeness for every text in `SIDDUR_TEXTS` and `STANDALONE_TEXTS` of [src/data/siddur.ts](src/data/siddur.ts), and a revision to pin; then map each text to its pages or headings with `--inspect`, naming every text it lacks and the source proposed for it.
  - **What it solves:** The build pins an exact revision with a credit per source ([scripts/siddur/AGENTS.md](scripts/siddur/AGENTS.md)); no Baladi source is pinned today.
  - **Expected result:** A table of every siddur text against its Baladi source page, revision and range, and the gaps, reported to the owner before any text is built.
- [ ] Transcribe the Teiman Hoshanot and Psalm 30 for Chanukah
  - **Flag:** `OTA` (bundled assets).
  - **Requested:** the owner, 2026-11-03, in chat, answering Q28: "אם יש חוסר אז כן"; recorded only, not started ("אל תבצע עוד כלום רק תכתוב את זה במשימות הפתוחות").
  - **What it is:** Two units of the 1894 Tiklal by the double-typing contract of [.claude/specs/nusach-teiman.md](.claude/specs/nusach-teiman.md) section 5: the Hoshanot of Sukkot (V2 131, and Hoshana Rabba V2 156) and Psalm 30 said on Chanukah (V1 345), pinned under `scripts/siddur/source/tiklal-1894/` and built into the Teiman `shacharit` on their days.
  - **What it solves:** A Baladi user on Chol HaMoed Sukkot, Hoshana Rabba and Chanukah reads only the print's pointer where the other nuschaot carry the text.
  - **Expected result:** Both passages in the Teiman `shacharit` on their days, dated cases in [src/data/__tests__/siddur.test.ts](src/data/__tests__/siddur.test.ts), R16 on the review page updated with `RULES_VERSION` raised, and the build, siddur suites and `pnpm test:tz` green.
- [ ] Say five nuschaot on the public site and in the store copy
  - **Flag:** `docs` for the site; the store copy waits for the owner.
  - **What it is:** [docs/index.html](docs/index.html) says "ארבעה נוסחים" / "four nusachim" in three places and [docs/testers/index.html](docs/testers/index.html) once; the store copy in [release/](release) and [release/AGENTS.md](release/AGENTS.md) say four nuschaot.
  - **What it solves:** The public pages and the listings would undersell the app once Teiman ships.
  - **Expected result:** The site says five nuschaot once the update with Teiman is in production (a push publishes the site at once, so not before); the store copy changes only when the owner lifts the hold on console edits, because the copy must match the binary under review.

### Zmanim per the Ohr HaChaim luach, 2026-11-03 — batch rules

- **Requested:** the owner, 2026-11-02, in chat, in Hebrew: "יש באג בזמנים ההלכתיים, אני רוצה שכל הזמנים יהיו לפי זמני אור החיים, בוא נאפיין ביחד"; characterized that day in a cloud session, and on 2026-11-03 the owner asked for the findings as this batch, to be carried out in a session on their own computer.
- **Spec:** [.claude/specs/ohr-hachaim-zmanim.md](.claude/specs/ohr-hachaim-zmanim.md): what the app computes today, the luach's definitions with their evidence, the Jerusalem differences (2 to 24 minutes, both ways), the target design, and section 11, the handover: everything the cloud session could not do. Read it before any task.
- **Flag:** every task is `OTA` (pure JavaScript; no native change, no `SCHEDULE_FORMAT` raise: a moved trigger changes `contentHash`).
- **Decisions taken:** the luach's definitions as listed in the spec's section 3 (seasonal minutes of the GRA day from sunrise and sunset at the city's height; alot 72, tzeit 13.5, MGA 72 seasonal, mincha gedola the larger of 30 fixed and 30 seasonal; the exit 30 minutes after sunset in Israel and 40 abroad; Rabbeinu Tam 72 seasonal); the owner, 2026-11-03: the exit and Jerusalem's candles exactly as the luach ("כמו בלוח"), family purity's doubtful span by the luach's tzeit too ("לפי הלוח"), a preview update before production ("קודם לפריויו"); technical calls: `tzeitShabbat` as a new `Zmanim` field beside `tzeitHakochavim`, chatzot halayla stays `getSolarMidnight()`, sof zman tefila stays GRA, the fixed-minute fallbacks go, no new setting.
- **Pending:** Q24 (Rabbeinu Tam) under [For the owner](#for-the-owner) and R15 under [For the rav](#for-the-rav); Q17 to Q23, Q25 and Q26 were answered on 2026-11-03 (the spec, section 13).
- **Verified so far:** the luach's printed Tel Aviv Shabbat of 2026-10-02/03 (candles 18:05, exit 18:55, Rabbeinu Tam 19:36) reproduced to the minute by the definitions, with a dependency-free calculator ([.claude/specs/ohr-hachaim-zmanim-compare.mjs](.claude/specs/ohr-hachaim-zmanim-compare.mjs)); `kosher-zmanim` itself never ran (the cloud environment reaches no npm registry).
- **Done means:** the calibration suite green against the luach's printed values within a minute; every suite that pinned minutes of the old method re-pinned; the rav page's section 1, R15 and `RULES_VERSION` raised by one (3 since R14 went on the page), the taharah page's two "7.083" lines, the three AGENTS.md, the guide topic and a `WHATS_NEW` item, `pnpm guide:build`; `pnpm typecheck`, `pnpm lint`, `pnpm check:dox`, `pnpm test:tz` green; a preview update checked on a phone against the luach before production; commits to `main`, an OTA only on the owner's per-action approval.

### High — Zmanim per the Ohr HaChaim luach

- [ ] Resolve the independent 5787 winter/summer calibration failures
  - **Flag:** `OTA` for the eventual runtime correction; this pass is research and diagnostic tooling only.
  - **Requested:** 2026-11-04, the owner supplied winter/summer photographs, confirmed the comparison was against preview and asked for every necessary and newly discovered check.
  - **What it is:** Correct the preview calculation against independent printed evidence after obtaining authoritative sunrise/horizon and rounding data; keep the diagnostic fixture as the acceptance reference.
  - **What it solves:** The preview still differs from the publisher's printed times, especially visible sunrise and Jerusalem's evening times; passing the older autumn-only suite does not establish a fix.
  - **Done — investigation only:** 2026-11-04. Preserved both original photographs, transcribed all daily values and weekly endpoints, checked candles and exits, built the reproducible comparison tool, and read the older original introduction scans. Corrected the record's description of Zemaneh Yosef as an independent reconstruction, not the publisher's official implementation. The task itself remains open: no runtime fix or release was made.
  - **Verified:** [README.md](.claude/specs/ohr-hachaim-5787/README.md), [printed.json](.claude/specs/ohr-hachaim-5787/printed.json), original photographs, [comparison.csv](.claude/specs/ohr-hachaim-5787/comparison.csv), and [check.cjs](.claude/specs/ohr-hachaim-5787/check.cjs). 63 app values exceed one minute: 41 sunrise values and 22 other Jerusalem values; summer plag differs by up to three minutes. Non-sunrise times in Tel Aviv, Haifa and Be'er Sheva are all within one minute.
  - **Verification scope:** 276 existing integration tests in each of four zones, 365 days × four cities × four device zones for consistency/cache invariants, identical printed results across those zones, date/DST transitions and saved/manual/GPS behavior, plus typecheck and lint. Passing consistency tests do not establish external accuracy for a full year.
  - **Open:** obtain the publisher's city/horizon coordinates/elevation inputs and exact rounding rules; obtain Bikurei Yosef/Chai Tables sunrise data with matching city settings and clarify reuse. The older printed introduction was read directly, but dated requests to the publisher's site failed. Another project's calculator is not official publisher code. Height-only experiments improve some values and worsen others; no candidate was applied. A city picked manually can intentionally follow GPS; the owner's actual device location was not inspected.
  - **Expected result:** correct from authoritative data, retain the independent printed fixtures, make the strict calibration pass without widening tolerances or re-pinning expected values to the code, check notification/time consumers and preview on a phone before production.
  - **Correspondence:** The owner reported sending the prepared inquiry on 2026-11-04 ("שלחתי תמייל"). Await the publisher's answer under Other Open Items, "Ohr HaChaim publisher response"; sending does not resolve the calibration failures.
  - **Status:** Version: none for the local investigation; eventual correction label unknown · Committed: yes, `b6b2379` docs(zmanim): record independent winter and summer calibration · Pushed: yes, origin/main verified 2026-11-04 · Live: no runtime correction or new release; diagnostic tooling in the repository · Channel: —

### Medium — Zmanim per the Ohr HaChaim luach

- [ ] Ship the luach's zmanim as an update and check them on a phone
  - **Flag:** `OTA`.
  - **What it is:** `pnpm update:preview`, then on the preview app against the luach: the home strip of the day, a Friday's candles and the Saturday's exit on the schedule, and a mitzvah screen's next reminder; then `pnpm update:production` with the `WHATS_NEW` entry, each on the owner's approval.
  - **What it solves:** The batch reaches installs only as an update (root [AGENTS.md](AGENTS.md), Release and Updates).
  - **Expected result:** The preview app shows the luach's values within a minute on the day checked; the production update's group id in [state.md](state.md) and the entries moved to [action-log.md](action-log.md).

### Low — Zmanim per the Ohr HaChaim luach

- [ ] Show Rabbeinu Tam on the strip and the schedule
  - **Flag:** `OTA`.
  - **What it is:** Only on a yes to Q24: a `rabbeinuTam` field (sunset + 72 seasonal minutes, abroad at most 72 fixed), a row in `ZMAN_KEYS` and a tick on the strip, labels in both dictionaries, and the search's zman items if the strip's names are searchable.
  - **What it solves:** The luach prints it beside tzeit; the app computes it nowhere (spec, section 3).
  - **Expected result:** Tel Aviv 2026-10-03 shows 19:36 within a minute; unknown until Q24 is answered.

### App requests of 2026-11-04 — batch rules

The owner's upgrade list of 2026-11-04, narrowed the same day to simple tasks that need no build ("בוא נתמקד במשימות פשוטות ומעשיות כרגע וללא בילד"). Done means as in the batch rules of 2026-10-24.

### Medium — App requests of 2026-11-04

- [ ] Question: more room for the reminder's message inside a notification's content
- [ ] Colour the end time's digits in a reminder on Android
  - **Flag:** `Build`.
  - **What it is:** with native code, the digits of the end time in the time-left line, which opens an Android body since 2026-11-05, drawn in the stage colour (styled text through a change to the notification builder of expo-notifications), and the dot dropped on Android; the iPhone keeps the dot, since its banner cannot colour text.
  - **What it solves:** the owner's pick of 2026-11-04 as asked ("לצבוע את הספרות של שעת סוף הזמן בצבע ההתראה הרלוונטי"), deferred to the next build by the owner's choice the same day.
  - **Expected result:** on an Android build, the end time in each reminder shows in green, orange or red, and the icon and app name keep their default colour.

### App requests of 2026-11-05 — batch rules

The owner's three requests of 2026-11-05 ("אני רוצה לעשות כמה שינויים"), each `OTA`. Done means as in the batch rules of 2026-10-24.

### Medium — App requests of 2026-11-05

- [ ] Decide: "my location" every 10 minutes while the app is closed
  - **Flag:** `Build`.
  - **Source:** the owner's request of 2026-11-07: "פעם ב10 דקות שהיא לא פעילה ... עדכון של המיקום של המשתמש". The half-minute update while the app is open shipped in production `1.0.21-16` ([action-log.md](action-log.md)).
  - **What it is:** a background location update. It needs the "Allow all the time" permission (`ACCESS_BACKGROUND_LOCATION`, iOS "Always"), a native build, Google Play's background-location declaration and an App Store justification, and the OS still sets the cadence (15 minutes at the least on Android).
  - **Waiting on:** the owner's decision whether to build it.

- [ ] Place every mitzvah's default reminders against its critical zone, and keep nags out of the night
  - **Flag:** `OTA`.
  - **Source:** the owner's report of 2026-11-05 with a screenshot of the bedtime Shema's timeline ("צריך לחזור שלב אחורה ולאפיין מחדש איפה לפזר התראות על כל סוג מצווה").
  - **What it is:** the characterization in [.claude/specs/reminder-placement.md](.claude/specs/reminder-placement.md): an opener and a zone opener per window, no nag between chatzot and alot, last-chance points only where acted on, the zone ending at the latest last-chance point, morning openers at netz.
  - **Expected result:** at every level, each mitzvah's nags spread across its whole critical zone (the bedtime Shema's no longer squeezed into the 24 minutes after a 23:00 reminder), and no notification of a night mitzvah between chatzot and alot.
  - **Waiting on:** the owner's decisions in sections 5 and 5a of the spec (5a: exactly one orange and one red notification per window); P3 also goes to the rav. The schema the owner reads: https://claude.ai/artifact/JyDspDEDu2jzzRsTTpJB3X

### Medium — App requests of 2026-11-08

- [ ] "זמן תו״ט" for misheyakir, and a "זמני הלכה" section in Settings that chooses which zmanim home shows
  - **Flag:** `OTA`.
  - **Source:** the owner's request of 2026-11-08: "לכתוב זמן תו"ט במקום משיכיר בזמני היום ... לפתוח עוד קטגוריה בהגדרות של זמני היום ולבחור איזה זמני היום המשתמש רוצה להציג ... הדיפולט לראות הכל ... הקטגוריה תקרא זמני הלכה".
  - **What it is:** `home.zman.misheyakir.*` reads "זמן תו״ט" ("Tallit and tefillin"); `useUserStore.hiddenZmanim` (empty by default, the last zman shown cannot be hidden, [src/utils/zmanIds.ts](src/utils/zmanIds.ts)); a collapsible Settings section `settings.halachaTimes` after Prayer with one switch per zman; home's hero leaves the hidden ones out of its strip, ticks and next zman, its sky unchanged; the search item `zmanimShown`; the guide and what's new `1.0.21-17`.
  - **Expected result:** a fresh install shows all eleven zmanim; a zman switched off leaves home's strip and circle at once and comes back when switched on.
  - **Done:** 2026-11-08, verified by `typecheck`, `lint`, `format:check`, `check:dox`, the full suite (6372 passed), `test:tz` of the hero, home, the new settings suite, the search and the smoke suites, and a web export: Settings › זמני הלכה with its switches, and home without the two zmanim hidden.
  - **Status:** Version 1.0.21 · Committed: `3ea0e48` feat(zmanim): name misheyakir זמן תו״ט, and a זמני הלכה section · Pushed: yes · Live: preview update `1.0.21-59` (group `d68a442e-a346-4f80-a923-1074be6fdc3a`, from `cca7a41`), not production · Channel: preview.

## Bugs

- [ ] Psalm 67:1 reads "לַמְנַצֵּח" without its furtive patach
  - **Found:** 2026-11-03, building the Teiman Birkat HaMazon, which reads Psalm 67 from the same source.
  - **Flag:** `OTA` (a bundled asset).
  - **What it is:** The pinned Sefaria Psalms "Tanach with Nikkud" prints Psalm 67:1 as "לַמְנַצֵּח בִּנְגִינֹת", while Psalm 4:1 has "לַמְנַצֵּחַ"; the shared `tehillim` asset carries the missing patach, and so does every text that reads that verse.
  - **What it solves:** The reader shows a misvocalized word in a psalm many say daily.
  - **Expected result:** A `patches` entry on `tanachNikkudHe` in [scripts/siddur/manifest.js](scripts/siddur/manifest.js), with its occurrence count pinned, and the printed-reading snapshot updated by name; first check whether other verses miss the same patach.

- [ ] Choosing a nusach never applies its Shema opinion
  - **Found:** 2026-11-03, adding nusach Teiman (R14.6 gives it the GRA opinion).
  - **Flag:** `OTA`; it changes product behavior, so it waits for the owner's word.
  - **What it is:** Every entry of `NUSCHAOT` in [src/data/nuschaot.ts](src/data/nuschaot.ts) carries a `defaultKsOpinion` (Chabad `MA`, the rest `GRA`), and `defaultOpinionFor()` reads it, but nothing calls that function: `setNusach()` in [src/stores/useUserStore.ts](src/stores/useUserStore.ts) sets only the nusach, so a Chabad user keeps the store's default opinion until changing it in Settings → Prayer.
  - **What it solves:** The registry promises a per-nusach default that no surface applies; the Shema deadline a Chabad user sees may not be the one the nusach implies.
  - **Expected result:** Either onboarding's nusach step (and a nusach change in Settings, unless the user chose an opinion) applies `defaultOpinionFor()`, with a test, or the field and the function are removed; the owner picks.

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
  - **Reminder:** one `clock` reminder at 23:00 on the location's clock, no reminder at the window's start (the owner's call, 2026-10-29; was 22:30); `RULES_VERSION` of the review page is 2.
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
- **R14 — Nusach Teiman Baladi.** (the batch Nusach Teiman, 2026-11-02; on the review page since 2026-11-03 as R14.1 to R14.7, `RULES_VERSION` 3; built as assumed below on 2026-11-03, not yet in production)
  - **Question:** Which value does each nusach-dependent rule take for a Baladi user?
  - **Assumption:** each with what was checked; "the Tiklal" is the 1894 Tiklal Etz Chaim scan (vol., leaf):
    - R14.1 Selichot: from the night of Rosh Chodesh Elul (the night before the morning of 1 Elul) through Erev Yom Kippur. The Tiklal, vol. 2 leaf 276: "ראוי ונכון מנהג הקדושים לומר סליחות מראש חדש אלול … המנהג הנכון הוא מראש חדש אלול". Unchecked: which night "מראש חדש" means when Rosh Chodesh has two days.
    - R14.2 Chanukah candles: from shkia, as Chabad. The Tiklal, vol. 1 leaf 341: "ואסראג אלחנוכה ענד מגיב אלשמס לא קבל ולא בעד"; Rambam, Hilchot Megillah VeChanukah 4:5 (Wikisource revision 1292389).
    - R14.3 Ushpizin: not offered, as for Chabad. The Tiklal prints none (vol. 2 leaves 122-132 and 170-171).
    - R14.4 Kiddush Levana: as Edot HaMizrach, 7 days after the molad to 15 days after it, until the rav decides. The Etz Chaim commentary (vol. 1 leaf 338) brings the first night (from the Rambam), after 3 days (the students of Rabbeinu Yonah), after 7 days (Rabbi Yosef Karo, "מהר״י קארו") and until the 16th; Rambam, Hilchot Berachot 10:16 (revision 2793236), "בחדושה", gives no days.
    - R14.5 Tefillin on Chol HaMoed: never, in Israel or abroad. Unsourced.
    - R14.6 The defaults: the Sephardi halacha line, the Sephardi haftarah in Chok LeYisrael, the `sephardi_ovadia` taharah preset as the starting point, the GRA Shema opinion. The app's own decisions.
    - R14.7 Yom Tov candle lighting: only the Shabbat blessing the Tiklal prints (vol. 1 leaf 395); a Yom Tov blessing waits for the rav to approve its wording.
    - The women's liturgy (R8): written per text, as the texts are built.
  - **Lives in:** `selichotFlags()` and the Kiddush Levana period in [src/utils/siddur.ts](src/utils/siddur.ts), the `chanukah_candles` and `ushpizin` entries of [src/data/mitzvot.ts](src/data/mitzvot.ts), `keepsCholHamoed()` in [src/utils/skipRules.ts](src/utils/skipRules.ts), `halachaRulingFor()` in [src/data/halachaLines.ts](src/data/halachaLines.ts), `HAFTARAH_VARIANT` in [src/utils/chok.ts](src/utils/chok.ts), `presetForNusach()` in [src/data/taharahPresets.ts](src/data/taharahPresets.ts), `NUSCHAOT` in [src/data/nuschaot.ts](src/data/nuschaot.ts) and the `candle_lighting` entry of [scripts/siddur/manifest.js](scripts/siddur/manifest.js).

- **R15 — The zmanim follow the Ohr HaChaim luach.**
  - **Question:** May every user, of every nusach, in Israel and abroad, be given the zmanim of לוח אור החיים (seasonal minutes of the GRA day from sunrise and sunset at the city's height: alot 72 and misheyakir 66 before sunrise, tzeit 13.5 after sunset, the MGA day 72 each side, mincha gedola the larger of 30 fixed and 30 seasonal minutes after chatzot, plag 1.25 hours before tzeit, candles 20 minutes before sunset everywhere, Shabbat out 30 minutes after sunset in Israel and 40 abroad, a fast out 20 minutes after sunset)?
  - **Assumption:** Yes, for everyone, with no setting for another method (the owner's call, 2026-11-02; the open points are Q17 to Q26 under For the owner).
  - **Lives in:** [src/services/ZmanimService.ts](src/services/ZmanimService.ts) and the heights of [src/data/cities.ts](src/data/cities.ts); item 15 and section 1 of [docs/halacha-review.html](docs/halacha-review.html) (rules version 4).

- **R16 — Nusach Teiman: the texts and how they are read.** (the batch Nusach Teiman; Q16's answer of 2026-11-03; built on 2026-11-03, not yet in production; on the review page as R16.1 to R16.9, `RULES_VERSION` 5)
  - **Question:** Are the Baladi texts right as the app builds them: the Tiklal transcriptions, the Hebrew renderings of its Judeo-Arabic instructions, and the choices made on the Wikisource pages?
  - **Assumption:** each as built on 2026-11-03; "V1 192" is volume 1, leaf 192 of the 1894 Tiklal Etz Chaim:
    - Transcription: each Tiklal unit was typed twice and every difference settled at the scan; a misprint is corrected only to the reading the same print gives on another leaf (Mincha: הֶאֵל→הָאֵל V1 192 by 105, מְחַיֶה→מְחַיֶּה 193 by 106, הָאַל→הָאֵל 193 by 107, נְדְחֵי→נִדְחֵי 194 by 111, יַרָאֶה→יֵרָאֶה 195 by V2 20, בו→בוֹ 195 by V1 233, מָגַן→מָגֵן 195 by 115); a word with no second printing stays as printed, though it reads like a misprint: "סִכָּל" (מִכָּל) in Mincha's Aneinu, "בְחֵי רָצוֹן" (בְזִבְחֵי) in Musaf, תַעָנֶה, תַּסְתַּר, תַּעְלַם, לְשַׁוְעַנוּ, הָחֹדֶשׁ, and in Nishmat "אֵלָא אָתָּה", "וּבְמִקְהְלוֹת רִבֲבוֹת" and "שֶׁנֶּאֱמָר" (the Haggadah prints Nishmat again, unvocalized), in Rachem "הָפוּי" and "שְׁלֹא יָלָדָה"; two marks broken in the print (אֲמַר V1 147, וְיִשְׂרָאֵל V1 159) read as the unit's other occurrences print them.
    - Instructions: every Judeo-Arabic instruction is replaced by an authored Hebrew note that renders it, the long ones (candle lighting's oils and wicks, the Chanukah laws) in full; the kabbalistic letters beside the Name are dropped as marks; uncertain identifications in the sights note ("אלאגדם" as מצורע, "רבאח" as קוף) are kept and four uncertain fruit names left out.
    - Psalms the print names or gives are read from the Sefaria Tanach, where the print sometimes spells plene or prints the qere (Ps 24:4, 48:15, 81:13, 93:5); Ps 29:11, 18:31 and 90:17 ("וִיהִי נוֹעַם יְהֹוָה") are typed as printed, because the print differs from the Tanach.
    - Nishmat as the Tiklal prints it (V1 281-285), ending at "מְשִׁיחֶךָ", without "מי ידמה לך", "האל בתעצומות" and "שוכן עד".
    - Mincha: no Priestly Blessing even on a fast, by the print's "ואין נשיאות כפים במנחה"; no long Avinu Malkeinu and no Aleinu, which the print does not have; Psalm 84, the Tamid, the Ketoret, Psalms 141-142, R. Chananya and Kaddish DeAtid fold under "אם יש פנאי אומרים", as the print says "כשיש שהות"; its pointers resolved with the Shacharit page's Kedushah, Modim DeRabbanan, Tachanun and Ashrei.
    - End of Shacharit: Lamnatzeach only on Tachanun days (V1 154); Kaddish Titkabel every day, Musaf days and Tisha B'Av included, since the print states no exception; "אל ארך אפים" on every Torah-reading day; a song of the day, then Psalm 25, every day; the prayer in time of plague folded under "כשיש, חס ושלום, מגפה בעיר אומרים", with its last paragraph, which the print does not mark; Kaddish DeAtid the chazzan's.
    - Hallel and Musaf: blessings only on whole-Hallel days (Chanukah, Chol HaMoed Sukkot); half Hallel without a blessing on Rosh Chodesh and Chol HaMoed Pesach, the passages printed small skipped; on Yom Ha'atzmaut Hallel folded under "יש נוהגים לומר הלל היום" without blessings, as for Edot HaMizrach; Kaddish Titkabel after Hallel on Chanukah and Chol HaMoed by the print's Rosh Chodesh rule; the Rosh Chodesh Keter from the festival Musaf's (V2 86), as the print points; Psalms 98-99 on Rosh Chodesh; no women's fold on Hallel's blessings.
    - The short texts: candle lighting's Shabbat blessing "שֶׁלַּ שַׁבָּת" as printed, and on a Yom Tov or Yom Kippur night only a note (R14.7); havdalah with no spices after a Yom Kippur on Shabbat (V2 459), "החל עלינו" folded under "במקצת מקומות אומרים לפני ההבדלה", flame only when Tisha B'Av begins at havdalah; Kiddush Levana with Psalms 121 and 150 from Sefaria where the print names them, and no timing note (R14.4); Hanerot Halalu every night under the print's "ועכשיו נהגו לומר"; Tefilat HaDerech is the print's thanks on leaving a city, which it titles "וזוהי תפלת הדרך", with the entering-city prayers folded; legumes take shehakol and rice mezonot, as printed; Hagomel not folded.
    - Me'ein Shalosh has no Rosh Chodesh or festival insert, because its Wikisource page prints the Rambam's wording with a Shabbat line only.
    - Birkat HaMazon joins two Baladi pages that differ in two places ("כִּי הוּא זָן (וּמֵזִין)" against "זָן", "בְּקָרוֹב" against "(בְּקָרוֹב)"); the body follows "בלדי 2" (Q27). Psalms 23 and 67 are said before it, as the other page's instruction says.
    - A woman's Omer blessing is not folded, unlike Edot HaMizrach (R8.4): no Baladi source was found.
    - Maariv: Kaddish DeRabbanan is the chazzan's, as the page says ("ואומר ש"צ קדיש על ישראל"); the Aleinu notes for the Ten Days ("בעשי"ת אומר כָּהֵם ולא וכו'") are shown on those days as printed; on motzaei Shabbat, on the nights the other nuschaot say Vihi Noam, a half Kaddish, Vihi Noam with Psalm 91 (91:16 twice), Ve'ata Kadosh and Kaddish Titkabel (V1 315-319), and "ויתן לך" as the print's pointer at the end of havdalah on every motzaei Shabbat but Tisha B'Av (V1 324); on Tisha B'Av night the chazzan's kinah stanza (folded for one praying alone) and Psalm 137 before Maariv, also on motzaei Shabbat, "רַחֵם" for "תשכון", Aneinu under "בתענית ציבור" as at Mincha, only Kaddish Titkabel and Aleinu after the Amidah, then the kinot and Eichah, with Vihi Noam and Ve'ata Kadosh only when the fast begins on motzaei Shabbat (V2 204-205, 221).
    - Wikisource Shacharit: the lulav after the repetition and before Hallel on Chol HaMoed Sukkot, with Shehecheyanu on the first day of taking (V2 127, 131); no tallit and no tefillin on Tisha B'Av morning, and no tefillin on Chol HaMoed, the app's rule for every nusach; Mizmor LeToda and the verses before Ashrei every day; Tachanun on the days hebcal gives; the long Avinu Malkeinu on Ten Days days with Tachanun only; the Monday and Thursday Tachanun on every such day with Tachanun, fasts included; both Aneinu on every public fast, Tisha B'Av included; the chazzan's Priestly Blessing folded for when no kohanim go up.
    - Selichot: the passages the page says only "if there is time" fold closed; "כַּת יֵשׁ לְמַעְלָה … לָמָּה לְךָ" is said every night as rendered; only the Aramaic Targum of the 13 Middot carries a minyan label, as the page marks; "לך ה׳ הצדקה" and "ה׳ אלהי הצבאות" are the Edot HaMizrach wording the page transcludes.
  - **Lives in:** the `teiman` builders in [scripts/siddur/manifest.js](scripts/siddur/manifest.js) (`teimanMincha()`, `teimanShacharit()`, `teimanNishmat()`, `teimanHallel()`, `teimanMusaf()`, `teimanBirkatHamazon()`, `teimanMaariv()`, `teimanSelichot()` and the others), with `tiklalNote()` for the renderings; the transcriptions in `scripts/siddur/source/tiklal-1894/`, which a file never changes after it is pinned, so a corrected answer is a manifest edit and a rebuild.

### For the owner

Q1 (an English (U.K.) localization) and Q2 (when the app asks for a rating) were answered by the owner on 2026-10-26 and became the tasks "Add an English (U.K.) localization on the App Store" and "Ask for a store rating inside the app". Q3 to Q7, from the app requests of 2026-10-26, were answered the same day and are written into their tasks (App requests of 2026-10-26 — batch rules). None is open.

Q8 (should a city picked by hand follow the phone too) was answered by the owner on 2026-10-31 ("כן גם היא") and became the task "Let a city picked by hand follow the phone too", in production `1.0.21-8` ([action-log.md](action-log.md)).

Q9 to Q15, the seven questions of the nagging batch, were all answered by the owner on 2026-11-01 and are written into the batch rules, its tasks and [.claude/specs/nagging-levels.md](.claude/specs/nagging-levels.md) (section 10): Q9, Q10, Q11, Q12 and Q15 approved as proposed; Q13 no, "אין שום תזכורת בסוף הזמן", with the placement rule (a start or set-time reminder nags before or after itself as the user chooses, a before-the-end reminder and the bedtime Shema only before); Q14 with four levels instead of five, level 4 the top on iPhone and Android alike. None is open.

- **Q16 — Nusach Teiman: the texts with no Baladi source.** (the batch Nusach Teiman, 2026-11-02; [.claude/specs/nusach-teiman.md](.claude/specs/nusach-teiman.md))
  - **Question:** The standing rule ships a nusach only with every text. Hebrew Wikisource builds 14 Baladi texts and part of Shacharit, and Sefaria has none. Eight have no Baladi source anywhere the build reads: candle lighting, havdalah, Kiddush Levana, the Chanukah candles, Tefilat HaDerech, the food and fragrance blessings, the blessings on sights and the mezuzah. Shacharit lacks its ending (the Monday and Thursday Tachanun, the Torah reading, Uva LeTzion, the song of the day, Aleinu) and Hallel and Musaf. How should they be filled?
  - **Options:**
    - (a) Wait for Wikisource: its Shacharit page was being written on 2026-11-02, but the rest has no date.
    - (b) A typed source: someone enters the missing texts from a printed Tiklal into Wikisource (the 1894 Tiklal Etz Chaim is in the public domain), and the build pins those pages.
    - (c) The one-line blessings (candle lighting, mezuzah, the food blessings, the Chanukah blessings) from the Rambam's own wording, which the Baladi follow, as the rav approves; the long orders still need (a) or (b).
    - (d) Ship Teiman with the texts it has and hide the others for it, as Ushpizin is hidden for Chabad; Shacharit still needs its ending first.
  - **Owner's word, 2026-11-02:** "ולך על ההמלצות שלך" (go with your recommendations), leaving for the night. The recommendation is (c) with (b): the one-line blessings from the Rambam's wording once the rav approves, and a typed source for the long orders. Until then Teiman stays staged, so nothing incomplete reaches users.
  - **Answered, 2026-11-03:** (1) "אתה תקליד עם ביקורת גבוהה שלא תעשה טעות": Claude types the missing texts; (2) "כן קח ותוסיף את זה בשאלון לאישור רב": the rav approves them on the review page; (3) "מעולה" for R14. The same morning the 1894 Tiklal Etz Chaim itself was found on archive.org (public domain, the National Library's scan), so the missing texts are transcribed from the Baladi print, not from the Rambam's wording, by the double-typing contract of [.claude/specs/nusach-teiman.md](.claude/specs/nusach-teiman.md) section 5, and the rav reviews the transcription (R16; this line named R15 before the zmanim batch took that number).
  - **Assumption:** As answered: the texts with no Baladi page are transcribed from the 1894 Tiklal, the Wikisource pages keep the texts they already build, and the rav reviews both (R16). Built on 2026-11-03; what the print does not give is Q28.
  - **Lives in:** `tiklalSources()` in [scripts/siddur/manifest.js](scripts/siddur/manifest.js) and the pinned files in `scripts/siddur/source/tiklal-1894/`.

Q17 to Q26 are the points of the batch "Zmanim per the Ohr HaChaim luach, 2026-11-03" ([.claude/specs/ohr-hachaim-zmanim.md](.claude/specs/ohr-hachaim-zmanim.md), sections 10 and 13). All but Q24 were answered on 2026-11-03.

- **Q17 — Sunrise and sunset at the city's height.**
  - **Question:** Take sunrise and sunset at the city's height, as the luach does (Jerusalem's sunset 4 to 5 minutes after the sea-level one), and give a GPS fix far from every city a height of 0?
  - **Assumption:** Yes to both.
  - **Lives in:** `buildCalendar()` in [src/services/ZmanimService.ts](src/services/ZmanimService.ts) and `elevation` in [src/data/cities.ts](src/data/cities.ts).
  - **What it affects:** Every zman, candle lighting, the exit, the Hebrew date's turn.
  - **Answered, 2026-11-03:** Yes, settled by the printed page: its sunset is the city's, 2 to 5 minutes after sea level; the four printed cities carry fitted heights (spec section 13), a far fix 0.
- **Q18 — The luach's visible sunrise is out of reach.**
  - **Question:** The luach prints the visible sunrise of the Bechoray Yosef tables, which depend on the hills around each city and cannot be reproduced; the app would use the astronomical sunrise at the city's height, a few minutes before the printed one in Jerusalem. Acceptable?
  - **Assumption:** Yes.
  - **Lives in:** the same `buildCalendar()`.
  - **What it affects:** The start of shacharit and the Shema, and the GRA times by a minute or two.
  - **Answered, 2026-11-03:** The sea-level sunrise stands in for the visible one, as before and as the official implementation (royzmanim.com) does; it is within a minute of the printed one in Jerusalem and Haifa and 3 to 5 minutes earlier in Tel Aviv and Be'er Sheva.
- **Q19 — The exit's margin.**
  - **Question:** The luach ends Shabbat and Yom Tov 30 minutes after sunset in Israel and 40 abroad. Show and use that time exactly, or keep the 10-minute margin of 2026-10-10 on top of it (40 and 50)?
  - **Assumption:** The luach's time exactly, the margin dropped (`HOLY_BLOCK_EXIT_MIN` 0).
  - **Lives in:** `holyBlockExit()` in [src/services/ZmanimService.ts](src/services/ZmanimService.ts).
  - **What it affects:** The Shabbat screen, havdalah, the pre-block notice's exit line, the check-in nudges, every night window of a block's last day.
  - **Answered, 2026-11-03:** The owner, 2026-11-03: "כמו בלוח": the luach's time exactly, the margin dropped.
- **Q20 — Candle lighting minutes per city.**
  - **Question:** What does the luach print for each city of `CITIES`? Known customs: Jerusalem 40, Haifa 30, most Israeli cities 20, and 18 for a city abroad the luach does not print; today the app uses 18 in Israel outside Jerusalem and 20 abroad.
  - **Assumption:** Jerusalem 40, Haifa 30, every other Israeli city 20, abroad 18.
  - **Lives in:** `candleLightingMinutes()` in [src/services/ZmanimService.ts](src/services/ZmanimService.ts) and `candleLightingMinutes` on the entries of [src/data/cities.ts](src/data/cities.ts).
  - **What it affects:** The block's start, the `candle_lighting` window, the pre-block notice.
  - **Answered, 2026-11-03:** The owner, 2026-11-03, on Jerusalem: "כמו בלוח": 20 minutes, the luach's main line (it prints 40 beside it for those who keep it). The printed page lights every city at 20, Haifa included.
- **Q21 — The Shema time's default and the schedule's row.**
  - **Question:** Keep the GRA / MGA choice in Settings; which is the default for a new install (the luach prints both; Rav Ovadia holds MGA lechatchila), and should the schedule show both rows as the luach does, or the chosen one?
  - **Assumption:** The choice stays, the default stays GRA for every install, and the schedule's row follows the setting.
  - **Lives in:** `halachicOpinions.ksSofZman` in [src/stores/useUserStore.ts](src/stores/useUserStore.ts) and `ZMAN_KEYS` in [src/utils/buildDayTimeline.ts](src/utils/buildDayTimeline.ts).
  - **What it affects:** The Shema window's end, the strip, the schedule.
  - **Answered, 2026-11-03:** Taken with the assumption, shown to the owner on 2026-11-03: the setting and its GRA default stay, and the schedule shows both rows as the luach does.
- **Q22 — Plag hamincha.**
  - **Question:** Plag 1.25 seasonal hours before tzeit, as Yalkut Yosef and the luach have it (12 to 20 minutes later than today), rather than before sunset (the Halacha Berurah)?
  - **Assumption:** Before tzeit.
  - **Lives in:** `plagHaMincha` in [src/services/ZmanimService.ts](src/services/ZmanimService.ts).
  - **What it affects:** The Chanukah candles on the erev of a holy block, the strip, the schedule.
  - **Answered, 2026-11-03:** Before tzeit, settled by the printed page (the sunset-based plag misses it by 14 minutes).
- **Q23 — Scope.**
  - **Question:** The luach for every user, every nusach (Ashkenaz, Sefard and Chabad included), in Israel and abroad, with no setting for another method?
  - **Assumption:** Yes.
  - **Lives in:** [src/services/ZmanimService.ts](src/services/ZmanimService.ts), the one method.
  - **What it affects:** Every user.
  - **Answered, 2026-11-03:** Yes, the owner's request of 2026-11-02 ("שכל הזמנים יהיו לפי זמני אור החיים").
- **Q24 — Rabbeinu Tam.**
  - **Question:** Show Rabbeinu Tam (72 seasonal minutes after sunset) on the home strip and the schedule, as the luach prints it beside tzeit?
  - **Assumption:** Not shown; the Low task waits.
  - **Lives in:** not built yet: task "Show Rabbeinu Tam on the strip and the schedule".
  - **What it affects:** The strip and the schedule only; no window reads it.
- **Q25 — Misheyakir.**
  - **Question:** The luach's "טלית ותפילין" is alot plus 6 seasonal minutes (66 before sunrise)? KosherKotlin's set of the luach also carries a 60-minute variant.
  - **Assumption:** 66.
  - **Lives in:** `misheyakir` in [src/services/ZmanimService.ts](src/services/ZmanimService.ts).
  - **What it affects:** The tefillin window's start and its first reminder.
  - **Answered, 2026-11-03:** 66, settled by the printed page's tallit time (60 misses it by 5 to 7 minutes).
- **Q26 — The calibration material.**
  - **Question:** The printed pages of the luach (or the values of the לוח המאור app) for Jerusalem and one more city, a winter day and a summer day, every zman of the day and a Shabbat's candles and exit; the owner's own bug case (the zman, the date and city, the luach's value); what the luach uses its 20 fixed minutes after sunset for, and when a fast ends by it.
  - **Assumption:** Until they arrive, the calibration suite holds only the Tel Aviv Shabbat of 2026-10-02/03 and the fast's end stays at tzeit.
  - **Lives in:** not built yet: task "Pin the luach's printed zmanim in a calibration suite".
  - **What it affects:** The proof of every task of the batch.
  - **Answered, 2026-11-03:** Partly: the older printed page became the existing calibration suite; a fast ends 20 fixed minutes after sunset according to the older introduction and the independent reconstruction, not official publisher code.
  - **Material supplied, 2026-11-04:** The owner supplied 5787 pages 21 and 95 (2026-10-25 to 2026-10-31 and 2027-06-06 to 2027-06-12), all four printed cities, daily/weekly times, candles and exit. Both photographs and their full transcription are preserved in [.claude/specs/ohr-hachaim-5787/](.claude/specs/ohr-hachaim-5787), committed in `b6b2379` and pushed to origin/main on 2026-11-04. The preview comparison still fails; do not request these two weeks again. Publisher reference inputs and the owner's exact installed version/GPS coordinates are still unknown; these are distinct from the now-supplied calibration material.

Q27 and Q28 are the batch "Nusach Teiman, 2026-11-02", found while building its texts on 2026-11-03.

- **Q27 — Nusach Teiman: which Baladi witness rules where they differ.**
  - **Question:** The 1894 Tiklal and the Hebrew Wikisource Baladi pages differ in words. Me'ein Shalosh (built from Wikisource): the Tiklal prints "וְהִנְחַלְתָּ אֶת אֲבוֹתֵינוּ" for "לַאֲבֹתֵינוּ", "עָלֵינוּ וְעַל יִשְׂרָאֵל" for "עַל יִשְׂרָאֵל", "וְנֹאכַל מִפִּרְיָהּ וְנִשְׂבַּע מִטּוּבָהּ" and "כִּי אֵל טוֹב וּמֵטִיב אַתָּה" as said text where the page has them in parentheses, and adds "וְעַל תְּנוּבַת הַשָּׂדֶה". The Amidah: Mincha (from the Tiklal) reads "אַתָּה גִּבּוֹר לְעוֹלָם אֲדֹנָי" for "יְיָ", and differs from the Wikisource Shacharit and Maariv in Retzeh's "בְּאַהֲבָה", the Ten Days "אֵל חָי" and "לְחַיִּים טוֹבִים" and Yaaleh Veyavo's "לְפָנֶיךָ", "לִבְרָכָה" and "רַחוּם וְחַנּוּן". Birkat HaMazon's two Wikisource pages differ too ("(וּמֵזִין)", "(בְּקָרוֹב)"). Should one witness rule every text, so one user reads one wording at every service?
  - **Assumption:** Each text follows the source it is built from, the Wikisource page where one exists and the Tiklal elsewhere, and Birkat HaMazon follows "בלדי 2".
  - **Lives in:** the source each `teiman` spec names in [scripts/siddur/manifest.js](scripts/siddur/manifest.js) (`baladiSources()` or `tiklalSources()`).
  - **What it affects:** The wording of Me'ein Shalosh, Birkat HaMazon and the Amidah; today a Baladi user reads two Amidah wordings, one at Mincha and another at Shacharit and Maariv.
  - **Why it is not a structural change:** Both witnesses are pinned, so a switch is a manifest edit and a rebuild.
  - **Answered, 2026-11-03:** the owner chose "כל טקסט נשאר לפי המקור שממנו נבנה (כך היום)": each text follows the source it is built from, as the Assumption says; nothing changes.

- **Q28 — Nusach Teiman: what the print does not give.**
  - **Question:** The Tiklal prints only instructions for the weekday Torah reading (no oleh blessings, no Mi Sheberach, no blessing for the government), for the Chanukah and Chol HaMoed readings, and for "ויתן לך" after havdalah ("ויתן לך האלהים … ופסוקים אחרים כמו שנהגו", V1 324, no list anywhere in either volume). The Hoshanot (V2 131) and Psalm 30 on Chanukah (V1 345) are printed but not yet transcribed. Should the app fill the first group from another Baladi source the rav approves, from the Edot HaMizrach texts, or leave the instructions, and should the second group be transcribed now?
  - **Assumption:** The instructions stay as printed and nothing is borrowed; the Hoshanot and Psalm 30 wait for the owner's word, since the app is closed on the Yom Tov days and only Chol HaMoed and Chanukah read them.
  - **Lives in:** `teimanShacharit()` and `teimanHavdalah()` in [scripts/siddur/manifest.js](scripts/siddur/manifest.js).
  - **What it affects:** A Baladi user called to the Torah, the Sukkot and Chanukah mornings, and motzaei Shabbat.
  - **Why it is not a structural change:** A filled passage is one more pinned source or transcription unit and a spec in the same builder.
  - **Partly answered, 2026-11-03:** on transcribing the Hoshanot and Psalm 30, "אם יש חוסר אז כן": transcribe them, the task "Transcribe the Teiman Hoshanot and Psalm 30 for Chanukah". On the passages the print gives only as an instruction (the oleh's blessings, Mi Sheberach and the blessing for the government, the Chanukah and Chol HaMoed readings, "ויתן לך"), given those examples, the owner chose "או להשאיר רק את ההוראה כמו היום": the instruction stays as printed and nothing is borrowed, as the Assumption says.

## Other Open Items

- **Ohr HaChaim publisher response.** Await a reply to the inquiry the owner reported sending on 2026-11-04. Intended recipient from this conversation: `aodarshan@gmail.com` (letters **ao**, then **darshan**); spelling rechecked visually on the enlarged original introduction image and with two OCR modes. [Original printed contact source](https://raw.githubusercontent.com/Zemaneh-Yosef/royzmanimwebsite/main/assets/images/sources/intro3.png). The source is an older edition; no independent current publication or live mailbox confirmation was found. Actual sent-message headers, receipt, delivery and any reply are **unknown**; the agent neither sent a message nor accessed the owner's inbox.
  - **Inquiry prepared:** subject "בירור שיטת החישוב וקבלת נתוני זמנים מלוח אור החיים". Asked for (1) coordinates, elevations and sunrise/sunset horizons for all four cities, (2) exact Bikurei Yosef sunrise tables/settings and whether a separate astronomical sunrise drives seasonal hours, (3) per-time rounding including Jerusalem quarter-minutes, and (4) an annual data file/API plus access, licensing and credit terms. The owner received a complete Hebrew email ready to copy.
  - **Next actor:** the owner supplies the reply when received; then the implementing agent checks the response against the preserved printed fixtures, corrects the calculation, verifies all time/reminder consumers and previews it on a phone. No reminder or monitoring automation was created. No answer, delivery or agreement is inferred from the sent-mail report.
  - **Repository evidence:** [Report and reproduction](.claude/specs/ohr-hachaim-5787/README.md), [printed fixtures](.claude/specs/ohr-hachaim-5787/printed.json), [comparison CSV](.claude/specs/ohr-hachaim-5787/comparison.csv), [checker](.claude/specs/ohr-hachaim-5787/check.cjs), [source digests](.claude/specs/ohr-hachaim-5787/sources.json), [winter photograph](.claude/specs/ohr-hachaim-5787/winter.jpg) and [summer photograph](.claude/specs/ohr-hachaim-5787/summer.jpg) are committed in `b6b2379` and pushed to origin/main (verified 2026-11-04). The same commit carries the spec/agent-context corrections and record updates. No runtime TypeScript, dependency, lockfile, version, build or update was changed. A process check during this conversation found no remaining test/build/publish process.

- **The full siddur build no longer reproduces the shipped assets from today's Sefaria.** Found 2026-11-02, in a cloud session with an empty `scripts/siddur/.cache/`: `node scripts/siddur/build.js` stops at `edot_hamizrach/shacharit` (the edit "יש אומרים תפילת רב מגמרה ברכות ט"ז ע"ב…" matched 0x), because Sefaria corrected text inside a pinned version title after the assets were built, and the cache that built them lives only on the owner's machine. Rebuilding everything would change shipped texts unreviewed, so the session builds with `--nusach teiman`, which keeps every other output byte-identical. The check: a full build from an empty cache runs green with `git status` clean, after the manifest is brought up to the current Sefaria text and each change is reviewed.
- **Network access for the siddur sources in the cloud environment.** Found 2026-11-02, starting the nusach Teiman batch: the session's proxy refused `www.sefaria.org` and `he.wikisource.org` (403 on CONNECT), and the build cache `scripts/siddur/.cache/` is gitignored, so `pnpm siddur:build` cannot run there for any nusach. The owner adds both hosts under Allowed domains in the environment's network settings; the check is that `curl -sI https://www.sefaria.org/` and `curl -sI https://he.wikisource.org/` answer from the session. Found again on 2026-11-02, in the session of the Ohr HaChaim zmanim batch: the same environment resolves no address for `registry.npmjs.org` (`ENOTFOUND`, so `pnpm install` fails and no typecheck, lint or test can run there) nor for `github.com`, `maor.orhachaim.org`, `calendar.2net.co.il`, `skyview2020.co.il` and `blog.calj.net` (the luach's sources); the owner continues that batch on their own computer ([.claude/specs/ohr-hachaim-zmanim.md](.claude/specs/ohr-hachaim-zmanim.md), section 11). **Done:** 2026-11-02, the owner opened both hosts; from the session `curl` answered 200 from the Wikisource API and Sefaria's `/api/index/Psalms`. Wikisource rate-limits the shared address (HTTP 429 with `retry-after`), so a fetch waits and retries.
- **Check production `1.0.21-9` on a phone.** Found 2026-11-01, when it was published: the completion animation on home (the green check and sparks, the ring filling green, "בוצע ב-" and the card closing) and the icons of rounds 7 and 8 (the Kriat Shema sun, the dawn window, the Ushpizin table, the meals plate and every siddur text's own icon, the rings for Sheva Berachot among them) were checked only on the web build. The owner saw the Rubik font and pack ב on the preview app (`1.0.21-32`: "everything looks great, but the siddur and prayer icon do not look good"), whose siddur and prayer icons were then redrawn. The check: open home, the siddur tab's groups and the library in the production app (Settings shows `1.0.21-9`), mark an open mitzvah, and read the launches with `npx eas-cli update:insights c81e2ade-932f-4a0b-ab3a-b5fad0c22fa8`. On 2026-11-02 the owner checked build 1.0.21 (5) on an iPhone through TestFlight ("בדקתי הכל מצויין") and the Android preview app on `1.0.21-38` ("בדקתי עובד מצויין"); both run code from after `d2fc443`, the commit of `1.0.21-9`, so they cover its content, but neither is the production app. Production is now `1.0.21-10`, which carries everything of `1.0.21-9` (Settings shows `1.0.21-10`): the owner decides whether this item closes.

- **The design skills have not run here, and `webapp-designer` describes an older `design-taste-frontend`.** Found 2026-10-30, while adding them (the task Add the web designer skills and the project manager skill to the repo).
  - Nothing third-party was executed: the session's auto mode refused to run the downloaded scripts. `design-taste-frontend`'s `lint.mjs`, `draw.mjs` and `inspect.mjs` and `impeccable`'s launcher (it downloads engine 0.1.18 from the `pbakaus/impeccable` releases and checks it against `engine-checksums.txt`) have never run on this repo. They get their first run in a design task, or on the owner's word: `lint.mjs` on a sample page and `sh .claude/skills/impeccable/scripts/impeccable engine-probe`.
  - [webapp-designer](.claude/skills/webapp-designer/SKILL.md) was written against the earlier dial-driven `design-taste-frontend` (DESIGN_VARIANCE, MOTION_INTENSITY, a final pre-flight, GSAP skeletons, landing pages only). The published 2.1.5 replaces it with an inventory, a drawn direction, a lint-and-inspect gate and a look-and-fix loop, and also covers app screens. The earlier file is still published as `design-taste-frontend-v2-experimental` (`Leonxlnx/taste-skill-classics`). The owner chooses: keep 2.1.5 and reword the orchestrator's pre-flight and dial lines, or vendor the earlier file under the name the orchestrator expects.

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
