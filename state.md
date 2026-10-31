# Project State

Where Jew 365 stands now, on one page. Last updated 2026-10-31 after preview update `1.0.21-28` (published from `54003b6`), before it preview `1.0.21-27` (from `afec520`), and before it production update `1.0.21-6` (published from `4c62f3c`, the working tree also holding the messages below My day); before it production update `1.0.21-5` (published from `1211b74`, pushed with this records commit on 2026-10-29); the EAS facts below come from the publish outputs of 2026-10-27 to 2026-10-29 and `eas update:list` of 2026-10-29, the store facts from both consoles on 2026-10-26 ([release/RELEASE_LOG.md](release/RELEASE_LOG.md)), not re-read. This page points to the documents that own the details:

- Everything open: [not-close.md](not-close.md).
- Everything in production, with its version, commit and production id: [action-log.md](action-log.md).
- Every store step and blocker: [release/RELEASE_LOG.md](release/RELEASE_LOG.md); the answers in each console: [release/](release).
- How to release: root [AGENTS.md](AGENTS.md), Release and Updates.

## TL;DR

- Installs run 1.0.21 with production update `1.0.21-6` (2026-10-30, group `5226dac2-a39e-49ca-afea-265dbdc64856`, from `4c62f3c`).
- All the work through 2026-10-29 (the 2026-10-24 batch, the app requests of 2026-10-26 and 2026-10-28, the Tracking tab, 80 tzaddikim, the sonar compass and its offer from the prayers, the bookmark sheet, the search that finds everything, the scroll-gated animations and the reader's fixed bar) is committed, pushed and live in production `1.0.21-5`; the [docs/](docs) half is live on Pages. The permissions step and card are live as JS; their native module waits for the next build ([not-close.md](not-close.md)).
- Play: closed test approved, 12 testers for 3 days on 2026-10-26, production application possible from about 2026-11-06. App Store: 1.0.21 (4) Waiting for Review since 2026-10-23, released by hand. TestFlight: live.
- A preview app ("יהודי 365 P", `com.jew365.app.preview`) exists as EAS build `c625eaa5`, a direct APK that installs beside production and listens to the `preview` channel; its code is committed in `bf8e8f4`.
- The owner's phone checks of 2026-10-26 to 2026-10-28 went through preview `1.0.21-1` to `1.0.21-12` and are in production `1.0.21-2` to `1.0.21-4`, and the checks of 2026-10-29 through preview `1.0.21-13` to `1.0.21-17` are in production `1.0.21-5` ([action-log.md](action-log.md)); production `1.0.21-4` and `1.0.21-5` themselves are not yet checked on a phone.

## App

- Identity: `Jew 365` / `יהודי 365`, Android package and iOS bundle `com.jew365.app`, EAS project `@jew-365-org/jew-365` (`681ad224-93cc-4094-81cd-f70c48087485`).
- Version: `1.0.21` in [app.json](app.json) and [package.json](package.json); `runtimeVersion` follows it (`appVersion` policy), so updates reach only 1.0.21 builds.
- `main` and `origin/main` hold `82136c0`, the commit of production `1.0.21-4`, and the records commit after it (pushed 2026-10-28).

## Over-the-air updates

| Channel | Latest update | Group id | Published | Reaches |
| --- | --- | --- | --- | --- |
| production | `1.0.21-6` the new home (the one-circle day arc, My day in three looks with its middle colours, the timeline by time, messages below My day), quiet hours and late marks, the guide's what's-new entry; published from `4c62f3c` with the working tree also holding the messages below My day; it replaced `1.0.21-5` | `5226dac2-a39e-49ca-afea-265dbdc64856` | 2026-10-30, Android and iOS | every build on the `production` channel |
| production (previous) | `1.0.21-5` the prayer compass offered from Shacharit, Mincha and Maariv, the permissions step and card (JS only: on these binaries the battery row opens the battery settings list), entrance animations that start when seen and replay on every entry, and the reader's fixed bar with Tools and a double tap, on top of `1.0.21-4`, from `1211b74`; it replaced `1.0.21-4` (`61520fca-c1f2-4fc2-82dd-e128c0f491eb`) | `f34a9229-cc35-4ab3-a199-37f42c964f13` | 2026-10-29, Android and iOS | every production 1.0.21 build |
| preview | `1.0.21-28` the time-left ring in Open now at 68 points with 13-point figures, and the check-in marking in time with no question; published from `54003b6` (merged to `main` on 2026-10-31); it replaced `1.0.21-27` (`95931d6c-e7c2-459f-8561-1d83dda86ffe`) | `6d61ba0d-284a-4fd7-bf52-fc7ac6ce145d` | 2026-10-31, Android and iOS | the preview app, build `c625eaa5` |
| preview (previous) | `1.0.21-27` a late mark in My day on home is green like a done one, with an orange "בוצע באיחור" label; published from `afec520` (pushed, merged to `main` on 2026-10-31); it replaced `1.0.21-26` (`bb747076-6b89-4277-a54e-07ff79ee2272`) | `95931d6c-e7c2-459f-8561-1d83dda86ffe` | 2026-10-30, Android and iOS | the preview app, build `c625eaa5` |
| preview (previous) | `1.0.21-26` late marks count as done everywhere, in-time shares, late counts per mitzvah, the To improve card, the 12-week late chart, the weekly report's late line and three badges; published from `898ed4a` (pushed to `main` later); it replaced `1.0.21-25` (`f0145073-9fbd-4901-8adf-d43d3a48a509`) | `bb747076-6b89-4277-a54e-07ff79ee2272` | 2026-10-30, Android and iOS | the preview app, build `c625eaa5` |
| preview (previous) | `1.0.21-25` messages below My day (read from `eas update:list` on 2026-10-30) | `f0145073-9fbd-4901-8adf-d43d3a48a509` | 2026-10-30, Android and iOS | the preview app, build `c625eaa5` |
| development | none: no channel or branch | — | — | nothing |

Rollback from production `1.0.21-6` to `1.0.21-5` is `npx eas-cli update:republish --group f34a9229-cc35-4ab3-a199-37f42c964f13 --message "Rollback to 1.0.21-5" --skip-whats-new` (a production rollback needs a message that starts with `Rollback to `); the earlier rollback from `1.0.21-5` to `1.0.21-4` was `npx eas-cli update:republish --group 61520fca-c1f2-4fc2-82dd-e128c0f491eb --message "Rollback to 1.0.21-4" --non-interactive` (never further back than `1.0.21-2`: an install that downloaded Chok LeYisrael compressed cannot be read by `1.0.21-1`); `npx eas-cli update:roll-back-to-embedded --branch preview` returns the preview app to its build's bundle. A publish to `preview` reaches only the preview app: every production build's channel is `production`. Rollback from preview `1.0.21-28` to `1.0.21-27` is `npx eas-cli update:republish --group 95931d6c-e7c2-459f-8561-1d83dda86ffe --message "Rollback to 1.0.21-27" --non-interactive`.

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

- **Over the air:** late marks counted as done with their in-time stats and badges (preview `1.0.21-26`, committed in `898ed4a` and pushed to `main`) and a late mark in My day shown green with an orange label (preview `1.0.21-27`, committed in `afec520`), the roomier time-left ring and the check-in marking in time (preview `1.0.21-28`, committed in `c52e059`), all on `main` since 2026-10-31; all wait for production `1.0.21-7`. The new home, the quiet hours and the earlier late mark are in production `1.0.21-6` ([action-log.md](action-log.md)).
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
