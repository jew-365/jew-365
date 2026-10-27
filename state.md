# Project State

Where Jew 365 stands now, on one page. Last updated 2026-10-26 at commit `d4c250e`, after production update `1.0.21-2` (built from `c1989c4`, pushed, CI green) and the move of the records to the production rule (action-log.md holds only work in production; finished work waits in not-close.md with its stage); the EAS and Pages facts below were read that day (`eas update:list`, `eas branch:list`, `eas channel:list`, `eas build:list`, `curl`), the store facts were read from both consoles the same day ([release/RELEASE_LOG.md](release/RELEASE_LOG.md), 2026-10-26). This page points to the documents that own the details:

- Everything open: [not-close.md](not-close.md).
- Everything in production, with its version, commit and production id: [action-log.md](action-log.md).
- Every store step and blocker: [release/RELEASE_LOG.md](release/RELEASE_LOG.md); the answers in each console: [release/](release).
- How to release: root [AGENTS.md](AGENTS.md), Release and Updates.

## TL;DR

- Installs run 1.0.21 with production update `1.0.21-2` (2026-10-26, group `7f18981c-709b-475b-a0ce-19ae67b87c94`, from `c1989c4`).
- The 2026-10-24 batch and all the work of 2026-10-25 and 2026-10-26 are committed, pushed and live in production `1.0.21-2`; the [docs/](docs) half is live on Pages.
- Play: closed test approved, 12 testers for 3 days on 2026-10-26, production application possible from about 2026-11-06. App Store: 1.0.21 (4) Waiting for Review since 2026-10-23, released by hand. TestFlight: live.
- A preview app ("יהודי 365 P", `com.jew365.app.preview`) exists as EAS build `c625eaa5`, a direct APK that installs beside production and listens to the `preview` channel; its code is committed in `bf8e8f4`.
- The owner's phone check of 2026-10-26 (eight changes, the tzaddik pages, the display size, the follow-ups and two review fixes) went through preview `1.0.21-1` to `1.0.21-6` and is in production `1.0.21-2` ([action-log.md](action-log.md)).

## App

- Identity: `Jew 365` / `יהודי 365`, Android package and iOS bundle `com.jew365.app`, EAS project `@jew-365-org/jew-365` (`681ad224-93cc-4094-81cd-f70c48087485`).
- Version: `1.0.21` in [app.json](app.json) and [package.json](package.json); `runtimeVersion` follows it (`appVersion` policy), so updates reach only 1.0.21 builds.
- `main` and `origin/main` are at `d4c250e` (2026-10-26, CI green); both hold `c1989c4`, the commit of production `1.0.21-2`.

## Over-the-air updates

| Channel | Latest update | Group id | Published | Reaches |
| --- | --- | --- | --- | --- |
| production | `1.0.21-2` the 2026-10-24 batch and the work of 2026-10-25 and 2026-10-26 (preview app code, phone-check changes, tzaddik pages, display size), from `c1989c4`; it replaced `1.0.21-1` (`59a089c2-7147-415b-b22c-6dc970f39eba`) | `7f18981c-709b-475b-a0ce-19ae67b87c94` | 2026-10-26, Android and iOS | every production 1.0.21 build |
| preview | `1.0.21-8` the fixes from the owner's check of `1.0.21-7` (the reader's controls scroll away with the text and never leave an empty band, the siddur groups name what they hold, the Tracking tab's switcher works after a scroll) and the sonar prayer compass (D2), on top of `1.0.21-7`'s app requests of 2026-10-26, Tracking tab and 80 tzaddikim, from `0f82e5a`; it replaced `1.0.21-7` (`96417556-53dc-4220-ad9a-de5ce660623f`) | `d4707151-cf09-4216-b688-7c19b3ed8345` | 2026-10-27, Android and iOS | the preview app, build `c625eaa5` |
| development | none: no channel or branch | — | — | nothing |

Rollback from production `1.0.21-2` to `1.0.21-1` is `npx eas-cli update:republish --group 59a089c2-7147-415b-b22c-6dc970f39eba --message "Rollback to 1.0.21-1" --non-interactive` (an install that downloaded Chok LeYisrael under `1.0.21-2` keeps it compressed, which `1.0.21-1` cannot read: its reader shows the retry state until the add-on is deleted and downloaded again); `npx eas-cli update:roll-back-to-embedded --branch preview` returns the preview app to its build's bundle. A publish to `preview` reaches only the preview app: every production build's channel is `production`. Rollback from preview `1.0.21-8` to `1.0.21-7` is `npx eas-cli update:republish --group 96417556-53dc-4220-ad9a-de5ce660623f --message "Rollback to 1.0.21-7" --non-interactive`.

## Builds and stores

| Platform | Build | Version | Where | Status |
| --- | --- | --- | --- | --- |
| Android AAB | `cc56fee1` | 1.0.21, versionCode 8 | Google Play, `Closed testing - Alpha` | release `8 (1.0.21)` approved 2026-10-22, available to the testers group |
| Android APK | `d54afeab` | 1.0.21, versionCode 9 | direct install (`jew365-1.0.21-9.apk`) | universal, 125 MB; signed with the Play key, so it replaces a Play install and the reverse |
| iOS | `72c51b1e` | 1.0.21, buildNumber 4 | TestFlight and App Store Connect | TestFlight testing (public link); App Store: Waiting for Review on 2026-10-26 (submitted 2026-10-23), manual release |
| Android APK, preview app | `c625eaa5` | 1.0.21, versionCode 1 of `com.jew365.app.preview` | direct install (`jew365-preview-1.0.21-1.apk`), channel `preview` | built 2026-10-25 from the uncommitted working tree, its own keystore; installed on the emulator only |

Every other EAS build is superseded, and no other AAB was uploaded to Play ([action-log.md](action-log.md), 2026-10-19 to 2026-10-22).

- **Google Play:** a personal developer account, so production needs 12 testers opted in for 14 days in a row. On 2026-10-26 the Dashboard showed 12 testers for 3 days: Apply for production opens at the earliest around 2026-11-06, as long as the count never drops under 12.
- **App Store:** after approval the version waits for the owner's Release; the TestFlight checks on a real iPhone come first. The EU trader status waits for the owner's identification documents; until then the app is not offered in EU storefronts. China mainland is out of the availability since 2026-10-26 (a permit for religious content), so the app goes to 174 storefronts.
- **Direct APK:** `d54afeab` is the current file; the arm-only APK that drops about 52 MB is a Build task in [not-close.md](not-close.md).

## Not in production yet

- **Over the air:** `0f82e5a` (the app requests of 2026-10-26, the Tracking tab, 80 tzaddikim, the sonar compass and the fixes from the check of `1.0.21-7`) is on the `preview` channel as `1.0.21-8`, not yet in production; production runs `1.0.21-2` (`c1989c4`).
- **Waits for the store production release** (finished, committed and pushed; [not-close.md](not-close.md), High — the 1.0.21 store release, and Bugs): the Jew 365 identity, the native half of the redesign, the four-symbol icons, the iOS build fixes, the store copy, the no-promise copy, the China mainland availability, and the Hebrew Android app name.
- **Waits for the next native build:** the Selichot space saving (about 5.5 MB), the fresh-install stamps in the embedded bundle, the Hebrew Android app name in production, and the Build tasks (arm-only direct APK, R8). A build that raises `version` cuts installs off from updates until they install it, so it also needs a version decision.

## Next steps

1. The app requests of 2026-10-26, the Tracking tab, the 23 new tzaddikim, the sonar compass and the fixes from the owner's check of `1.0.21-7` are committed (`0f82e5a`), pushed and live on the `preview` channel as `1.0.21-8` (2026-10-27): check them on the preview app, then a production update `1.0.21-3` when the owner approves. Earlier status: the thirteen OTA tasks are built and reviewed in the working tree, uncommitted, with `typecheck`, `lint`, `check:dox` and `test:tz` green on 2026-10-26 and the `1.0.21-3` user guide entry written; they wait for the emulator checks their Done lines name, the owner's commit approval and a production update. The history redesign waits for the owner's pick of the sketches, the extra tzaddikim for the owner's pick of the candidates, and the performance measurement on the emulator is still to run ([not-close.md](not-close.md)).
2. The owner, or a rav, reviews the tzaddik content (Other Open Items in [not-close.md](not-close.md)); the choices of the tzaddik pages and the display size (D1–D8) were approved on 2026-10-26 ([action-log.md](action-log.md)).
3. Check production `1.0.21-2` on a phone with the production app (Settings shows `1.0.21-2`), and its launches with `npx eas-cli update:insights 7f18981c-709b-475b-a0ce-19ae67b87c94`.
4. Keep 12 or more testers opted in until about 2026-11-06, then apply for production in the Play Console.
5. Watch the App Store review; after approval, the TestFlight checks on an iPhone, then the owner's Release. The EU trader documents are the owner's.
6. Enter the App Store subtitle and keywords and the English (U.K.) localization while 1.0.21 waits for review, then re-enter the store copy in both consoles with the Play short description before the production application, and send the rav the review page link ([not-close.md](not-close.md), Store listings of 2026-10-26).
7. The next native build when the user asks: the arm-only direct APK, R8, the store rating prompt and the permissions step of the app requests of 2026-10-26 ([not-close.md](not-close.md)).
