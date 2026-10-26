# Project State

Where Jew 365 stands now, on one page. Last updated 2026-10-26 at commit `aba8897` plus the uncommitted work of 2026-10-25 and 2026-10-26, after the preview update `1.0.21-6`; the EAS and Pages facts below were read that day (`eas update:list`, `eas branch:list`, `eas channel:list`, `eas build:list`, `curl`), the store facts were read from both consoles the same day ([release/RELEASE_LOG.md](release/RELEASE_LOG.md), 2026-10-26). This page points to the documents that own the details:

- Everything open: [not-close.md](not-close.md).
- Everything done, with its version, commit and where it is live: [action-log.md](action-log.md).
- Every store step and blocker: [release/RELEASE_LOG.md](release/RELEASE_LOG.md); the answers in each console: [release/](release).
- How to release: root [AGENTS.md](AGENTS.md), Release and Updates.

## TL;DR

- Installs run 1.0.21 with production update `1.0.21-1`.
- The 2026-10-24 batch is committed and pushed (`aba8897`) and not live; its [docs/](docs) half is live on Pages. It ships as production update `1.0.21-2` once the user approves the OTA.
- Play: closed test approved, 12 testers for 3 days on 2026-10-26, production application possible from about 2026-11-06. App Store: 1.0.21 (4) Waiting for Review since 2026-10-23, released by hand. TestFlight: live.
- A preview app ("יהודי 365 P", `com.jew365.app.preview`) exists as EAS build `c625eaa5`, a direct APK that installs beside production and listens to the `preview` channel. Its code is not committed yet.
- The owner's phone check of 2026-10-26 added eight changes, a page for every tzaddik of the hilulot list and a display size setting, all JS, all uncommitted, gate green on 2026-10-26 ([action-log.md](action-log.md)). Everything, the batch included, is live on the `preview` channel as `1.0.21-1` (2026-10-26); production is still `1.0.21-1` of 2026-10-23.

## App

- Identity: `Jew 365` / `יהודי 365`, Android package and iOS bundle `com.jew365.app`, EAS project `@jew-365-org/jew-365` (`681ad224-93cc-4094-81cd-f70c48087485`).
- Version: `1.0.21` in [app.json](app.json) and [package.json](package.json); `runtimeVersion` follows it (`appVersion` policy), so updates reach only 1.0.21 builds.
- `main` and `origin/main` are at `aba8897` (2026-10-25).

## Over-the-air updates

| Channel | Latest update | Group id | Published | Reaches |
| --- | --- | --- | --- | --- |
| production | `1.0.21-1` Chok LeYisrael as a downloadable add-on | `59a089c2-7147-415b-b22c-6dc970f39eba` | 2026-10-23, Android and iOS | every production 1.0.21 build |
| preview | `1.0.21-6` the 2026-10-24 batch, the phone-check changes, the tzaddik pages, the display size and the follow-ups of 2026-10-26 (Chok picker by kind, no Chok subtitle, the mitzvah active row, the rounded and padded sheet selection, the full-width section picker, today's text for a prayer whose time has passed, the two Chok browsing fixes of the review round), from the uncommitted tree on `aba8897`; it replaced `1.0.21-5` (`ee1f67ce-2bf7-49a8-8e9c-e0d4477b1465`) | `cbfb5ef7-6cc7-4ed9-a4c7-f908bd65a280` | 2026-10-26, Android and iOS | the preview app, build `c625eaa5` |
| development | none: no channel or branch | — | — | nothing |

Rollback from production `1.0.21-1` is `npx eas-cli update:roll-back-to-embedded` (it is the first update on runtime 1.0.21); the same command with `--branch preview` returns the preview app to its build's bundle. A publish to `preview` reaches only the preview app: every production build's channel is `production`. Rollback from preview `1.0.21-6` to `1.0.21-5` is `npx eas-cli update:republish --group ee1f67ce-2bf7-49a8-8e9c-e0d4477b1465 --message "Rollback to 1.0.21-5" --non-interactive`.

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

## Committed, not live

- **The 2026-10-24 batch** (`1e12449`, `0ddc971`, `196471c`, `c3227e0`, `aba8897`, pushed 2026-10-25): every OTA task of the batch, the bugs B1 to B21 and the later fixes, listed one by one in [action-log.md](action-log.md). Expected label `1.0.21-2` (its `WHATS_NEW` entry exists in [src/data/guide.ts](src/data/guide.ts)). The user is choosing between production and preview.
- **Release precondition met** (checked 2026-10-25): the live Chok manifest has `gz` and `gzipBytes`, the `.gz` files answer `application/gzip` with no `Content-Encoding`, and the Selichot manifest, the guide pages and `halacha-review.html` answer 200.
- **Not committed:** the preview variant, the Hebrew Android app name, the preview identity of preview updates, the renamed build commands and the emulator skill changes (2026-10-25), and everything of 2026-10-26: the eight phone-check changes with their review fixes, the tzaddik pages and the display size ([action-log.md](action-log.md)). All of it ships in the same OTA as the batch, expected `1.0.21-2`, whose `WHATS_NEW` entry now names it.
- **Waits for the next native build:** the Selichot space saving (about 5.5 MB), the fresh-install stamps in the embedded bundle, the Hebrew Android app name in production, and the Build tasks (arm-only direct APK, R8). A build that raises `version` cuts installs off from updates until they install it, so it also needs a version decision.

## Next steps

1. The owner approves or changes the choices taken on 2026-10-26 (the D1–D8 of the Requests of 2026-10-26 in [not-close.md](not-close.md)) and reviews the tzaddik content (Other Open Items there).
2. The user decides the OTA of the batch: `pnpm update:preview` reaches only the preview app, `pnpm update:production` every user (through the ship skill); then [action-log.md](action-log.md) and this page get the label and group id.
3. The user approves the commit and push of all uncommitted work (2026-10-25 and 2026-10-26), and installs `jew365-preview-1.0.21-1.apk` on a phone.
4. Keep 12 or more testers opted in until about 2026-11-06, then apply for production in the Play Console.
5. Watch the App Store review; after approval, the TestFlight checks on an iPhone, then the owner's Release. The EU trader documents are the owner's.
6. Re-enter the store copy in both consoles and send the rav the review page link ([not-close.md](not-close.md)).
7. The next native build when the user asks: the arm-only direct APK and R8 ([not-close.md](not-close.md)).
8. The cleanup of [not-close.md](not-close.md), moving the closed batch items to [action-log.md](action-log.md), waits for the user's word.
