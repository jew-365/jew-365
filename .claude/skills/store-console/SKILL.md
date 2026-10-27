---
name: store-console
description: "Read store status and act on Google Play Console and App Store Connect for Jew 365: command line first (asc for Apple, scripts/store/play.mjs for Play), the browser only for what the APIs lack (forms, declarations, graphics, the Play dashboard), and record every answer in the release docs. Use for: מה המצב בחנויות, סטטוס בדיקה של אפל, בודקים בטסטפלייט, מה יש בטרק הסגור, ביקורות, תמלא בקונסול, תמלא את הטפסים בפליי קונסול, תעלה את הצילומים לקונסול, תעדכן את הלישטינג, store status, review state, TestFlight, Play tracks, testers, reviews, store listing, data safety, content rating. Not for building the AAB or IPA and not for publishing OTA updates."
---

# store-console

Reads and acts on the store consoles for `com.jew365.app`, through the command line where an API covers the task and a real browser where it does not, with the user's approval at the gates. The record of every answer lives in the repo: [PLAY_CONSOLE_METADATA.md](../../../release/PLAY_CONSOLE_METADATA.md) for Google Play, [APP_STORE_METADATA_EN.md](../../../release/APP_STORE_METADATA_EN.md) and [APP_STORE_METADATA_HE.md](../../../release/APP_STORE_METADATA_HE.md) for the App Store, [RELEASE_LOG.md](../../../release/RELEASE_LOG.md) for the chronological steps. Read [release/AGENTS.md](../../../release/AGENTS.md) first: it holds the rules every answer must match (no claim of "no server" or "offline only", the Data safety and App Privacy facts, the age-rating facts, field limits).

## 0. Command line first

Both stores have an API, and a read through it needs no browser, no sign-in and no visible Chrome window. Use it for every status read; open the browser only for what section 0.3 lists.

### 0.1 App Store Connect: `asc`

- [asc](https://github.com/rorkai/App-Store-Connect-CLI) (MIT), installed with `winget install --id Rorkai.ASC --exact`, telemetry switched off (`asc telemetry status` must say `enabled: false`). If `asc` is not on `PATH`, call `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Rorkai.ASC_Microsoft.Winget.Source_8wekyb3d8bbwe\asc.exe`.
- Auth: a team API key with the App Manager role, profile `jew365`, Key ID `K7387D5H36`, stored by `asc auth login` in the Windows Credential Manager. The `.p8` lives in `C:\Users\avrah\.store-keys\`, which agents may not read. Only the owner creates, rotates or registers a key; `asc auth status` shows which profile is in use without the key.
- App id `6825802248`. Reads:
  - `asc status --app 6825802248 --output table` - one-screen overview: review state, latest build, TestFlight, next action.
  - `asc review status --app 6825802248` - the version's review state and the latest submission.
  - `asc versions list --app 6825802248 --output table`
  - `asc builds list --app 6825802248 --output table` - builds with processing state and expiry.
  - `asc testflight groups list --app 6825802248 --output table` and `asc testflight testers list --app 6825802248 --output table` - groups, public link, each tester's state (mask the emails when quoting them).
  - `asc reviews list --app 6825802248 --output table` - customer reviews.
  - `asc search "<what you want to do>"` finds any other command; `--help` on any command shows its flags.

### 0.2 Google Play: `scripts/store/play.mjs`

- [../../../scripts/store/play.mjs](../../../scripts/store/play.mjs), plain Node, the Android Publisher API with a service account (`play-cli` in the owner's Google Cloud project `jew365-store`, invited in Play Console › Users and permissions with View app information, Manage testing tracks and edit tester lists, Release to testing tracks, Reply to reviews; no production release permission until production access is granted). Its JSON key is `C:\Users\avrah\.store-keys\play-service-account.json`, read by the script itself; never name it in a command, never read it.
- Reads (each opens a Play edit and deletes it): `node scripts/store/play.mjs tracks`, `track alpha`, `testers alpha`, `listing iw-IL`, `details`, `bundles`, `reviews`. The closed test is the `alpha` track; the API returns only the last 7 days of text reviews.
- `node scripts/store/play.mjs --help` lists the write commands. Every one is a dry run that Play validates and discards; only `--commit` applies it.

### 0.3 What stays in the browser (sections 1 to 6)

The Play Dashboard and its tester count toward production access, Publishing overview, Statistics, Crashes and ANRs, testing feedback, every App content declaration (Data safety, content rating, target audience), graphics, and anything `asc` or `play.mjs` cannot reach. Prefer the command when both can do it.

### 0.4 Writes need the owner's yes, every time

A read runs without asking. Every state-changing command - an upload, a release or promotion, a rollout change, `testers-set`, a review reply, a metadata or screenshot change, a submission or its cancellation, any `asc` command that creates, updates, deletes or submits - needs the owner's explicit yes in chat for that exact command, after showing them the command and, for `play.mjs`, the dry run's output. A yes covers that one command only. Log each write in [RELEASE_LOG.md](../../../release/RELEASE_LOG.md).

## 1. Before touching the console

1. Read the release docs above and `AGENTS.md` "Release and Updates". The answers come from those files and from the shipped code, `app.json` and the published privacy policy, never from memory. Cross-check each permission and data claim against them before typing.
2. Ask the user to do the account part, once per session:
   - open the console in Chrome and switch to the project's account, `365jew@gmail.com` (Play Console: admin access on the developer account that avi6190i owns; App Store Connect: the Apple Developer account, which must exist first);
   - keep that Chrome window visible and uncovered: Chrome stops painting a covered window, screenshots then time out and Material dropdowns misbehave. DOM reads and ref clicks still work, but verification needs paint.
3. List the screens you will fill and every value you will enter, in Hebrew, and get one go-ahead for the batch. Decisions that are the user's (target audience, exact-alarm category, AI asset labels, what a Data safety row declares) are asked, not guessed; record them afterwards as "the user's call, <date>".

## 2. Which browser

- Use Claude in Chrome (`mcp__claude-in-chrome__*`; load its tools with ToolSearch in one call: tabs_context_mcp, navigate, computer, read_page, find, form_input, file_upload, upload_image, get_page_text, tabs_create_mcp) for every logged-in console and for every file upload. It is the user's own signed-in Chrome.
- Two Chromes may be connected, one signed in to the work account. Before the first console page, `list_connected_browsers` and pick the one whose Google account is 365jew (check the account button on the page); never type a password into a sign-in page.
- The built-in browser has no file upload, so graphics and every other file go through Chrome. It can fill the forms when the user signs in there (Play Console was filled that way as 365jew on 2026-10-20), but prefer Chrome for consoles: it is already signed in.
- Uploads read only files inside the session folders and cap at 10 MB. Copy graphics to the session scratchpad first. An AAB is above the cap: the user uploads every AAB, you do the rest of the release.
- Play Console URL shape: `https://play.google.com/console/u/0/developers/6395219355356380365/app/4975091190006669419/<page>` (developer id and app id of `com.jew365.app`).

## 3. How to click and type

- Click by element reference from `find` or `read_page`, never by coordinates. Play Console dialogs scroll between actions and a coordinate click lands on the next checkbox (it ticked wrong boxes once). Re-run `find` after each dialog opens or scrolls.
- A checkbox whose accessible name says nothing (App Store Connect's country list names each one "on") can get the wrong reference from `find`: on 2026-10-26 the reference returned for China mainland unticked Fiji. After every such click, zoom on the row and check the dialog's count; if the reference missed, scroll the dialog still, take a screenshot and click by the coordinates it shows.
- Take a screenshot before every Save, Next, Submit and Confirm, and compare it with the value list. Do not click the control until the screenshot shows the right state.
- Enter text with `form_input` on the field's ref, Hebrew included; it handles long Hebrew text and the character counters update. Verify the counter against the limits: Play short description 80, full description 4000; Apple subtitle 30, promotional text 170, keywords 100 with no space after the commas, description 4000.
- Material dropdowns and radio groups: click the ref, then re-read the page to confirm the selected value, not only the screenshot.
- Language fields: Play's default listing language is Hebrew (`iw-IL`, the code Play lists for Hebrew, also in release-note tags `<iw-IL>...</iw-IL>`), English (`en-US`) is a translation. Both descriptions name both app names so either search finds the app.
- After Save, reload the page and read the saved values back. A listing saved only as a draft is not published: use Next, then Save, then check the Publishing overview.

## 4. Stop and hand over to the user

Never do these yourself; tell the user exactly which button and why, then continue after they say it is done:

- CAPTCHAs and bot checks (Google Groups for the testers group asked for one);
- payment, identity verification, 2-step prompts, signing in, password or code entry, accepting terms and agreements;
- uploading the AAB, the PEPK key zip, and anything above 10 MB;
- a deletion or a change of app signing key or ownership: ask in chat, wait for a clear yes in that message, then act. The classifier can block the click until the user has approved in chat.

Submit for review (Play "Send changes for review", "Start rollout", App Store "Submit for Review") only after an explicit yes from the user to that exact action, in that turn, with the summary of what goes out. A yes to filling forms is not a yes to submitting.

## 5. Typical order (Google Play, first release)

1. App content declarations: privacy policy URL (`https://jew-365.github.io/jew-365/privacy/`), ads, app access / sign-in instructions, content rating questionnaire, target audience, Data safety, advertising ID, government, financial, health. Answer from [release/AGENTS.md](../../../release/AGENTS.md) and the recorded answers.
2. Store listing: default language, name, short and full description, category, contact details, graphics (icon 512, feature graphic 1024x500, phone screenshots in the order home, siddur, reader, history, settings), the AI-asset declaration.
3. Closed test track: countries, testers group, feedback email, release notes in both language tags.
4. Dashboard: clear every error and warning it lists, the exact-alarm declaration included.
5. Send for review: only with the explicit yes of section 4.

App Store Connect follows the same discipline with its own pages: app information, pricing, App Privacy (Crash Data and Contact Info answers per [release/AGENTS.md](../../../release/AGENTS.md)), age rating (computed by Apple from the questionnaire, never submit `4+`), version page with the Hebrew and English copy from the two App Store files, screenshots, build selection, and TestFlight testers. The first iOS install goes through TestFlight on the user's wife's iPhone; the user runs `pnpm build:ios:production` and `pnpm submit:ios` from a real terminal (interactive Apple login).

## 6. Record every answer (same pass)

After each console step, before the next one:

1. Write the exact answers into the owning file: Play answers into [PLAY_CONSOLE_METADATA.md](../../../release/PLAY_CONSOLE_METADATA.md) (listing copy, Data safety, App content, content rating, graphics in use, closed test); App Store answers into [APP_STORE_METADATA_EN.md](../../../release/APP_STORE_METADATA_EN.md) (and the Hebrew file for Hebrew copy), creating a missing section in the matching file rather than a new file. The next round copies them, so write the value that was submitted, not a summary.
2. Add the step to [RELEASE_LOG.md](../../../release/RELEASE_LOG.md): what was done, what it produced, every blocker and how it was cleared (the owner's rule).
3. If an answer changed a fact the docs state elsewhere (a feature, a data flow, a permission), fix those docs in the same pass and run `pnpm check:dox`.
4. Leave the edits uncommitted; committing is the user's call.

## 7. Report

Hebrew, short: which pages were filled and saved, which were left for the user and why, the values the user decided, what the console flagged (errors, warnings), and the next gate (usually "ready to send for review, say yes"). Mention a step you could not verify.
