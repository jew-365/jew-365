# Project State

Where Jew 365 stands now, on one page. Last updated 2026-10-28 at commit `82136c0`, after production update `1.0.21-4` (built from `82136c0`, pushed with this records commit on 2026-10-28); the EAS facts below come from the publish outputs of 2026-10-27 and 2026-10-28 and the earlier reads of 2026-10-26 (`eas update:list`, `eas branch:list`, `eas channel:list`, `eas build:list`, `curl`), the store facts from both consoles on 2026-10-26 ([release/RELEASE_LOG.md](release/RELEASE_LOG.md)), not re-read. This page points to the documents that own the details:

- Everything open: [not-close.md](not-close.md).
- Everything in production, with its version, commit and production id: [action-log.md](action-log.md).
- Every store step and blocker: [release/RELEASE_LOG.md](release/RELEASE_LOG.md); the answers in each console: [release/](release).
- How to release: root [AGENTS.md](AGENTS.md), Release and Updates.

## TL;DR

- Installs run 1.0.21 with production update `1.0.21-4` (2026-10-28, group `61520fca-c1f2-4fc2-82dd-e128c0f491eb`, from `82136c0`).
- All the work through 2026-10-27 (the 2026-10-24 batch, the app requests of 2026-10-26, the Tracking tab, 80 tzaddikim, the sonar compass, the bookmark sheet, the More search, the preview fixes and the search that finds everything) is committed, pushed and live in production `1.0.21-4`; the [docs/](docs) half is live on Pages.
- Play: closed test approved, 12 testers for 3 days on 2026-10-26, production application possible from about 2026-11-06. App Store: 1.0.21 (4) Waiting for Review since 2026-10-23, released by hand. TestFlight: live.
- A preview app ("יהודי 365 P", `com.jew365.app.preview`) exists as EAS build `c625eaa5`, a direct APK that installs beside production and listens to the `preview` channel; its code is committed in `bf8e8f4`.
- The owner's phone checks of 2026-10-26 to 2026-10-28 went through preview `1.0.21-1` to `1.0.21-12` and are in production `1.0.21-2` to `1.0.21-4` ([action-log.md](action-log.md)); `1.0.21-4` itself is not yet checked on a phone.

## App

- Identity: `Jew 365` / `יהודי 365`, Android package and iOS bundle `com.jew365.app`, EAS project `@jew-365-org/jew-365` (`681ad224-93cc-4094-81cd-f70c48087485`).
- Version: `1.0.21` in [app.json](app.json) and [package.json](package.json); `runtimeVersion` follows it (`appVersion` policy), so updates reach only 1.0.21 builds.
- `main` and `origin/main` hold `82136c0`, the commit of production `1.0.21-4`, and the records commit after it (pushed 2026-10-28).

## Over-the-air updates

| Channel | Latest update | Group id | Published | Reaches |
| --- | --- | --- | --- | --- |
| production | `1.0.21-4` the search that finds everything (screens, categories, stats, badges, guide, rabbis, siddur passages; close results first), on top of `1.0.21-3`, from `82136c0`; it replaced `1.0.21-3` (`4ac9d837-5dc2-47d4-95cd-f95e913e9cd0`) | `61520fca-c1f2-4fc2-82dd-e128c0f491eb` | 2026-10-28, Android and iOS | every production 1.0.21 build |
| preview | `1.0.21-12` the search that finds everything (screens, categories, stats, badges, guide, rabbis, siddur passages; close results first), on top of `1.0.21-11` and everything before it, from `d5b7fdc`; it replaced `1.0.21-11` (`8f70dfd2-97dd-42ed-a1f6-630d38fc2d5c`) | `06457b91-6051-47a6-b1ee-b1a62a24fe48` | 2026-10-27, Android and iOS | the preview app, build `c625eaa5` |
| development | none: no channel or branch | — | — | nothing |

Rollback from production `1.0.21-4` to `1.0.21-3` is `npx eas-cli update:republish --group 4ac9d837-5dc2-47d4-95cd-f95e913e9cd0 --message "Rollback to 1.0.21-3" --non-interactive` (never further back than `1.0.21-2`: an install that downloaded Chok LeYisrael compressed cannot be read by `1.0.21-1`); `npx eas-cli update:roll-back-to-embedded --branch preview` returns the preview app to its build's bundle. A publish to `preview` reaches only the preview app: every production build's channel is `production`. Rollback from preview `1.0.21-12` to `1.0.21-11` is `npx eas-cli update:republish --group 8f70dfd2-97dd-42ed-a1f6-630d38fc2d5c --message "Rollback to 1.0.21-11" --non-interactive`.

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

- **Over the air:** nothing: production `1.0.21-4` runs the same app code as preview `1.0.21-12`.
- **Waits for the store production release** (finished, committed and pushed; [not-close.md](not-close.md), High — the 1.0.21 store release, and Bugs): the Jew 365 identity, the native half of the redesign, the four-symbol icons, the iOS build fixes, the store copy, the no-promise copy, the China mainland availability, and the Hebrew Android app name.
- **Waits for the next native build:** the Selichot space saving (about 5.5 MB), the fresh-install stamps in the embedded bundle, the Hebrew Android app name in production, and the Build tasks (arm-only direct APK, R8). A build that raises `version` cuts installs off from updates until they install it, so it also needs a version decision.

## Design

- The design lab ([design/lab/](design/lab), 2026-10-28) is where every design request is built and published as Artifacts ([design/lab/AGENTS.md](design/lab/AGENTS.md)). It is committed in `d7f98b7` and pushed ([not-close.md](not-close.md), Other Open Items).
- The home screen study ([design/lab/studies/2026-10-27-home/](design/lab/studies/2026-10-27-home)) holds ten live directions on real data and waits for the owner's pick. Its canvas is https://claude.ai/artifact/UxdjEwamEp3YUTpkUTfxRn and its gallery https://claude.ai/artifact/KNs1VuDX7J6LWXNxfZQPhT, shared by link. Both sit in the Akeyless claude.ai account.

## Next steps

0. The owner picks a home screen direction from the gallery (up to three, ranked); then the open product decisions in the study's AGENTS.md come first, and the implementation ships over the air.

1. Check production `1.0.21-4` on a phone with the production app (Settings shows `1.0.21-4`), and its launches with `npx eas-cli update:insights 61520fca-c1f2-4fc2-82dd-e128c0f491eb`. The owner's pick of a home screen direction waits in the design lab. Still open in [not-close.md](not-close.md): the history sketches' follow-up, the permissions step (next build) and the performance measurement on the emulator.
2. The owner, or a rav, reviews the tzaddik content (Other Open Items in [not-close.md](not-close.md)); the choices of the tzaddik pages and the display size (D1–D8) were approved on 2026-10-26 ([action-log.md](action-log.md)).
3. The compass on the owner's phone and on iOS, which no check reached yet ([action-log.md](action-log.md), 2026-10-27).
4. Keep 12 or more testers opted in until about 2026-11-06, then apply for production in the Play Console.
5. Watch the App Store review; after approval, the TestFlight checks on an iPhone, then the owner's Release. The EU trader documents are the owner's.
6. Enter the App Store subtitle and keywords and the English (U.K.) localization while 1.0.21 waits for review, then re-enter the store copy in both consoles with the Play short description before the production application, and send the rav the review page link ([not-close.md](not-close.md), Store listings of 2026-10-26).
7. The next native build when the user asks: the arm-only direct APK, R8, the store rating prompt and the permissions step of the app requests of 2026-10-26 ([not-close.md](not-close.md)).
