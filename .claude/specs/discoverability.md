# Jew 365: discoverability and ease-of-use program

Status: reviewed and planned on 2026-11-13, and approved by the owner the same day in the planning session. Its tasks are recorded in [not-close.md](../../not-close.md) as the batch "Discoverability and ease of use, 2026-11-13", and its six open decisions as Q32 to Q37 there. This file is the contract they implement; a task's deviation is written back here.

Working title: "the whole app, without opening Settings".

## Context

The owner's problem (2026-11-13): the app is rich and good-looking, but a user cannot see or understand its power and ends up missing most of what it offers. The goal: even the laziest, least technical user realizes most of the app's potential without digging into Settings.

A review of the code (the nine onboarding steps, the five tabs, every stack screen, the defaults, the notification permission flow, the guide and the search) found that the value is real, but:

1. it can silently never start (no reminders at all);
2. much of it is switched off by default and sits three to six taps away, inside Settings or an unlabelled list;
3. nothing offers a capability at the moment it matters.

No record, spec or design study covers this topic yet.

**Owner's decisions of 2026-11-13** (asked during planning):

- **Onboarding:** a short mandatory path with bundles; the detailed lists become optional.
- **Discovery:** a suggestion card in home's Messages, a tip inside the weekly notification, an "all capabilities" screen opened from the More tab, and suggestions inside the More tab.
- **Defaults:** broader defaults for new users (Sefirat HaOmer, candle lighting, havdalah, Rosh Chodesh notices, quiet hours at night), and bundles as well.
- **Navigation:** the More tab reorganized into a capabilities hub; search and an add-mitzvah shortcut on home.

## What the review found

| # | Finding | Evidence |
|---|---|---|
| F1 | **Reminders can silently never start.** The notification permission is asked only if the user taps its row. "Continue" skips it, and home's banner then opens the phone's settings even when the app could still ask. | `requestNotificationPermissions()` is called only from `src/components/PermissionsList.tsx:158`, `src/app/(tabs)/settings.tsx:435` and the backup restore; `pickBanner()` in `src/app/(tabs)/home.tsx` |
| F2 | **Setup asks a lot and shows nothing.** Nine steps, 11 to 13 taps, two expert lists (every mitzvah, the carousel's times). The last step lists names. The siddur, tracking, learning programs, Shabbat mode, search and guide are never mentioned. | `src/app/onboarding/*`, `ONBOARDING_STEPS` |
| F3 | **Much of the value is off and far.** Off by default: Birchot HaShachar, candle lighting, havdalah, the Omer, six learning programs (each behind a download), Rosh Chodesh and hilulot notices, quiet hours. Turning one on takes 3 to 6 taps through Settings or More. | `DEFAULT_ON_MITZVOT`, `useUserStore` defaults |
| F4 | **There is no map of the app.** The library that switches mitzvot on is a row inside Settings, named "המצוות שלי" like the personal-mitzvot group inside it. More is one flat card of 14 rows, and Rosh Chodesh is missing from it. Home links to neither and has no search. | `src/app/(tabs)/more.tsx`, `settings.tsx:476`, `home.tsx` |
| F5 | **Nothing is offered at the right moment.** The Selichot banner is the only contextual offer. The guide (16 long topics) and "what's new" are reached only from the last row of More. There are no first-use hints. | `selichotOfferOn()`, `src/data/guide.ts` |
| F6 | **Key actions hide behind gestures.** Skip-today is long-press only; a long press stars a time; an unlabelled "⋯" customizes the home card; the "drag the sun" hint returns on every launch. | `home.tsx:931`, `HomeTimes.tsx`, `DayArcHero.tsx:154` |
| F7 | **Progress is invisible outside Tracking.** A streak goal or a badge is reached silently. | `src/utils/streakGoal.ts`, `src/utils/badges.ts` |
| F8 | **Words do not explain.** Library captions say only "בוקר" or "שבועית"; the search box says "search in Settings" though it searches the whole app; the personal-mitzvah form has ten fields. | `library.category.*`, `settings.search`, `src/app/custom-mitzvah.tsx` |
| F9 | **The project is blind to usage.** No analytics, and crash reporting is off. | `package.json`, not-close.md |

## Goals, measures and non-goals

- **G1:** no user finishes setup without deciding about notifications (allow, or an explicit "not now").
- **G2:** setup is 6 screens and about 8 taps, and ends on a live preview of today and a sample reminder.
- **G3:** every capability is reachable from home in 2 taps, and can be switched on in 1 to 2 taps from wherever it is offered, without opening Settings.
- **G4:** in the first weeks each relevant capability is offered once; never more than one offer at a time on home; never on Shabbat or Yom Tov.
- **G5:** measured by a scripted usability test with the closed testers (8 tasks, before and after): success of 90% or more, median taps down by half.

Non-goals: no account and no analytics upload (the privacy promise stays); no change to the look (palettes, hero, cards, type); no halachic rule change; no power feature removed; nothing new that arrives unasked (the only new notification is the sample the user asks for).

## What reaches whom, and when

- An over-the-air update reaches every existing install at once, and a new install only from its **second** launch: the first launch runs the bundle embedded in the store binary (`updates` in `app.json` sets no `fallbackToCacheTimeout`).
- So the whole first session of a new user, setup included, is the binary's. **The first-run work (A2 to A5) reaches new users only with the next native build.** The stores are about to release the build of 2026-11-08, so every new user gets today's setup until then.
- Everything else here (home, the hub, the offers, the report) is effective over the air, and A1 and A6 cover the gap for users who ran the old setup.

## The improvements

Each item: the change, what it fixes, what the user gains, and how (what is reused). Tags: priority (P0 to P2), size (S half a day, M 1 to 2 days, L 3 to 5 days), and "study" when a design-lab study comes first.

### A. First run: a few choices and you are set (F1, F2, F3)

**A1. Ask for notifications at the right moment** · P0 · S

- **Change:** the notification step's main button becomes "allow and continue" and opens the system prompt; the only way past without allowing is an explicit "not now". After setup, a user who was never asked is asked once on home. The "no permission" banner asks inside the app while the system can still be asked, and opens the phone's settings only when it is blocked.
- **Fixes:** F1.
- **User gain:** the core promise, a reminder in time, works for everyone who taps the obvious button. Today a user who taps "Continue" gets a silent app.
- **How:** one helper `askForNotifications()` in `src/services/NotificationScheduler.ts` over `notificationPermissionState()` and `requestNotificationPermissions()`, which also rebuilds the schedule on a grant (the request alone never does); `src/app/onboarding/permissions.tsx`; `PermissionsList.tsx` reports its statuses so a refusal on the row is not followed by a second prompt; `pickBanner()` in `home.tsx`; the web shim.
- **Deviation (2026-11-13):** App Review rejected 1.0.21 (6) on 2026-11-12 under guideline 5.1.1(iv): a button that leads to a system permission prompt may not say "Allow", "Enable" or "Grant"; Apple asks for "Continue" or "Next". So the main button reads Continue (the step's body says Continue asks for the notification permission) and the home banner's copy says "tap to continue", not "allow and continue" or "enable". The behaviour is as above. Every later item (G1's battery offer, A5's sample, the short setup) follows the same rule.

**A2. Short setup path** · P0 · L · study

- **Change:** six screens: welcome (language, optional name and gender, "I have a backup"), nusach, location, "what matters to you" (A3), notifications (A1, with the night quiet hours shown and editable, and the battery row on Android), ready (A5).
- **Where today's steps go:** the marital status and the taharah offer move to an offer after setup (C2); the full mitzvot list and the carousel's times stay one tap away as "detailed choice", and in Settings as today; the accuracy notice stays in setup as a card on the ready screen with the full text one tap away; the phone number moves to Settings.
- **Fixes:** F2.
- **User gain:** setup drops from 11 to 13 taps to about 8. Each screen asks one plain question, and nothing a beginner cannot answer stands in the way.
- **How:** `src/app/onboarding/*`, `ONBOARDING_STEPS`, the routes and smoke suites, the guide's "start" topic. Gender stays as one optional tap (`chooseGender()`), because it sets real defaults: tefillin, Kiddush Levana, the siddur voice, the palette.

**A3. Bundles ("חבילות")** · P0 · M · same study

- **Change:** about five goal cards, each switching a whole group on with one tap: prayers and daily times; Shabbat and festivals (candle lighting, havdalah, the Omer and the seasonal ones); the calendar (Rosh Chodesh, hilulot); daily learning (choose programs); morning blessings. The same bundles appear later on the capabilities screen (C4).
- **Fixes:** F2, F3.
- **User gain:** the user chooses by goal ("I want daily learning") and never needs to know about reminders, anchors or downloads.
- **How:** new `src/data/bundles.ts` (ids of mitzvot, notice topics and add-ons). A bundle is "on" when every member the nusach and gender offer is on; a tap goes through `setMitzvahEnabled()` and `setNoticesEnabled()` of `useNeedsReminderDialog`. Learning choices are saved as "wanted" and offered first on home after setup, since a download needs its size confirmation and routes outside onboarding.

**A4. Broader defaults for new users, visible in setup** · P0 · S

- **Change:** the recommended bundles arrive ticked: Shabbat and festivals, Rosh Chodesh notices, and quiet hours at night on the notification screen. "Continue" applies them. `DEFAULT_ON_MITZVOT` and the stored defaults do not change, so an existing install keeps exactly what it has.
- **Fixes:** F3.
- **User gain:** a user who only taps "Continue" is still reminded of the Omer, candle lighting, havdalah and Rosh Chodesh and is not woken at night, and saw what was switched on.
- **How:** the ticked state of A3's bundles; `setQuietBefore()` and `setQuietAfter()` on the notification screen. Open decisions 2 and 3 settle the quiet bounds and the gender rule first.

**A5. The ready screen shows today and sends a sample reminder** · P0 · M · same study

- **Change:** instead of a list of names: "the rest of your day", with the real windows, times and next reminder, and a button "send me a sample reminder" that delivers a real-looking notification with its buttons. On the iPhone the text says the buttons appear on a long press.
- **Fixes:** F2, F1.
- **User gain:** the "aha" comes before the first real reminder. The user sees the app already knows their times, learns the notification, text, mark path by doing it once, and finds out at once if the phone blocks notifications.
- **How:** per enabled mitzvah `appDayWindow()`, `clockRange()` and `nextReminderAt()`, falling back to the names list when there is no row (a holy block, a polar day). `presentSampleReminder()` in the scheduler facade and the web shim, after `previewNotificationSound()`: id `sample`, `data.kind = 'sample'`, its own category carrying the "done" action, never a real window's id, never inside a holy block; `markDoneFromNotificationData()` and the tap router ignore it. Also offered in Settings › Device.

**A6. Catch-up for installs that never saw the new setup** · P1 · S (on top of C4)

- **Change:** once, as the first offer on home after the update: "choose what matters to you", which opens the capabilities screen on its bundles with the recommended ones ticked. Nothing changes until the user confirms.
- **Fixes:** F3, for every existing user and for new users who ran the old binary's setup.
- **User gain:** existing users get the new setup's benefit in two taps, without redoing setup.
- **How:** one entry in the offers (C2) that opens `/capabilities`.

### B. Home as the hub (F4, F6)

**B1. Search from home** · P1 · S · study (the hero's top row)

- **Change:** a search control on home opens the app-wide search with the keyboard up.
- **User gain:** "type what you want" is the fastest path for a lazy user, one tap from the first screen. The store listing already promises a search that finds everything.
- **How:** navigate to the hub tab with a `search` param; `more.tsx` already reads an `open` param, and `SettingsSearchBox` gains a ref to focus after paint. No new route.

**B2. "All mitzvot" under My day** · P1 · S · same study (placement)

- **Change:** a row under My day opens the library, where mitzvot are switched on and a personal one is added.
- **User gain:** the place to add a mitzvah sits beside the list of today's mitzvot, not inside Settings.
- **How:** `router.push('/mitzvot')` from `home.tsx`, a `ListRow`.

**B3. "Skip today" in plain sight** · P0 · S

- **Change:** the mitzvah screen's "today's mark" card gains "skip today" beside "mark as done". The long press on home keeps working.
- **User gain:** skipping a mitzvah for a day (travel, illness) stops being a secret, so fewer days read as "missed" for no reason.
- **How:** the today card of `src/app/mitzvah/[id].tsx` with the completions store's `markSkipped()`; home's cards, which are the owner's picks, stay as they are.

**B4. Hints that learn** · P0 · S

- **Change:** "drag the sun" disappears for good once the user has dragged.
- **User gain:** a hint teaches once and then gets out of the way.
- **How:** the persisted hints of C2 in place of `touched` in `DayArcHero.tsx`.

**B5. Banners land on the right spot** · P0 · S

- **Change:** the profile banner opens Settings on the gender question, the location banners on the location block.
- **User gain:** no more landing on six closed sections and guessing.
- **How:** the existing `focus` route param of Settings (`gender`, `location`).

### C. Discovery system: one list, four surfaces (F3, F4, F5)

**C1. Capability list** · P1 · S to M

- **Change (internal):** one list of about 25 capabilities, each pointing at what already exists (a bundle, a learning program, a notice topic, a tool screen, a setting), with a plain title, a one-line benefit, its state for this user (on, off, not installed, out of season) and its action.
- **User gain:** the offers, the hub and the capabilities screen use the same words for the same things, and a new feature cannot be forgotten: a coverage suite fails when a mitzvah group, add-on or screen has no entry.
- **How:** new `src/data/capabilities.ts` over A3's bundles; the suite follows `searchCoverage.test.ts`.
- **Built (2026-11-13):** 28 capabilities over the registry, the add-ons, the notice topics, the More tab's screens, two settings and the battery exemption (the bundles of A3 come with phase 3, so the list stands on its own until then). The states are on, off, not installed and unavailable; "out of season" is left to the capabilities screen (C4), if its study needs it.

**C2. Offers** · P1 · M

- **Change:** a small pure rule set picks one thing to offer, from the user's own state and the calendar, and the app remembers what it already offered.
- **First offers:** the battery exemption when missing; a first-day tour of home (the guide's home topic); the learning programs asked for in setup; the catch-up of A6; a learning program after some active days; candle lighting and havdalah toward Shabbat when off; the Omer before it starts; hilulot before a hilula; Birchot HaShachar; the Tracking tab after the first full day; the profile questions. Rosh Chodesh is worded on its existing home row.
- **Policy:** one at a time; each offered once (a seasonal one once a year) and shown for five days at most; two days between offers; on the first day only the tour and what was asked for in setup; "don't suggest" closes it for good. The Shabbat screen already covers every surface it appears on.
- **Fixes:** F5.
- **User gain:** the app introduces itself gradually, like a good host: one relevant suggestion with one button, never a wall of switches.
- **How:** a `discovery` field in `useUserStore` (`hints`, `offers`, `whatsNew`; `wants` joins it with phase 3, the first code that writes it, so phase 1 reads it as empty; it rides the backup and the reset, with no version bump; built 2026-11-13 over the pure `src/utils/discovery.ts`); pure `src/utils/offers.ts` with `pickOffer(input)`; a hook `useOffer()` that evaluates after paint and memoises on the app day, never on the clock tick. Accepting goes through `setMitzvahEnabled()`, `setNoticesEnabled()`, `requestIgnoreBatteryOptimizations()` or a route. It returns nothing while `firstOpenedAt` is unset, which keeps today's home suites untouched. The models are the rating rule (`src/utils/rating.ts`) and the Selichot offer.
- **Built (2026-11-13), with these readings of the policy:** the battery offer (G1) may come on the install day beside the tour, because a blocked delivery is the first offer; the tour comes only in the install's first two app days, so an existing install never sees it; an offer that stops applying before it is closed (the user turned the mitzvah on elsewhere) counts its two-day gap from its showing. Not in phase 1: the learning programs asked for in setup (with A3's `wants`, phase 3), the catch-up of A6 (phase 2, it opens the capabilities screen) and the profile questions (home's existing profile prompt stays until A2 moves them).

**C3. The offer on home, in Messages** · P1 · S to M

- **Change:** the current offer appears in the Messages block: icon, title, one-line benefit and its action. When nothing is open now it leads the screen, since Messages already takes that slot.
- **User gain:** features come to the user on the screen they open several times a day, and turning one on takes one or two taps, with no trip to Settings.
- **How:** `home.tsx`'s messages block and `src/utils/homeMessages.ts`, built from `ListRow`, `BottomSheet` and `SheetAction`; the offer adds nothing to the banner chain of `pickBanner()`. `roshChodeshMessage()` words its caption by whether the notices are on.

**C4. "All capabilities" screen** · P1 · L · study

- **Change:** a new screen ("כל היכולות") lists everything the app can do, by goal: prayer, Shabbat and festivals, daily learning, the calendar, tracking, personal, tools and help. Each item shows its state and one action (turn on, download, open); a goal has "turn all on" (A3's bundles). A mitzvah group opens the library for its per-mitzvah switches, so there is no second list of switches and no score.
- **User gain:** one place answers "what else can this app do for me?", with what is off visible and one tap from on.
- **How:** new route `src/app/capabilities.tsx` over C1, with its routes, smoke, guide-topic and search-coverage entries.

**C5. The More tab becomes the hub** · P1 · M · same study

- **Change:** the search on top; "worth trying", up to three offers from C2; the entry to "all capabilities"; then labelled groups: daily learning; prayer texts and tools; the calendar (schedule, Rosh Chodesh, hilulot); the app (all mitzvot with the count in use, the guide). The tab's name is decided in the study (working name "גלה").
- **Fixes:** F4.
- **User gain:** the tab stops being a junk drawer. A glance shows which families of things exist, the library is found outside Settings, and suggestions wait where the user came to explore.
- **How:** `src/app/(tabs)/more.tsx` as `SectionLabel` and `Card` groups, `useLearningRows()` unchanged, `nav.more`, `more.render.test.tsx`.

**C6. A tip in the weekly notification** · P1 · S to M

- **Change:** the weekly report notification (motzaei Shabbat, on by default) carries one tip line, and the report screen shows the offer as "a tip for next week" with its action. The weekly-report switch controls it; no notification is added.
- **User gain:** one gentle weekly reminder of something useful, on a notification the user already receives.
- **How:** `planReport()` in `src/services/notifications/planners/report.ts`, with the tip read once in `readPlanInput()`; `src/app/report.tsx`.
- **Built (2026-11-13):** the tip is `weeklyTip()`: candle lighting and havdalah while either is off (the report goes out at motzaei Shabbat, so the coming-Shabbat window does not apply), else the first other offer that applies, never the tour, the battery or the Tracking tab, and never one the user closed; the report screen shows it as a card whose sheet runs its action or closes it.

**C7. "What's new" comes to the user** · P0 · S

- **Change:** after an update that carries a newer what's-new entry, a Messages row opens it, for three days or until opened.
- **User gain:** a user learns what an update brought without knowing the guide exists.
- **How:** `whatsNewMessage()` in `homeMessages.ts` compares the newest `WHATS_NEW` label with the one stored in the discovery state (never with the running update's number, which is per channel); an install with nothing stored starts as "seen".

### D. Words that explain (F4, F8)

**D1. Names and benefit captions** · P1 · M · copy sign-off

- **Change:** every row in the library, the hub and the capabilities screen says what the user gets ("a reminder before the end of the Shema's time"), never a category ("morning"). The library gets a name of its own, so "המצוות שלי" means only personal mitzvot. The search box says it searches the whole app. The Prayer section's summary stops naming a compass control that is not there. "רמת נודניקיות", the owner's term, stays.
- **User gain:** the user understands a row without trying it.
- **How:** `he.json` and `en.json` (the parity suite), the captions of `MitzvahLibraryList.tsx`; the search keeps the old words as synonyms.

**D2. Personal mitzvah from a template** · P2 · M · small study

- **Change:** "add a mitzvah" opens a short gallery (daily tzedakah, a Torah lesson, a chapter of Tehillim, a call to parents and the like), each created in one tap with sensible hours and one reminder, beside "my own" for today's full form.
- **User gain:** the personal-mitzvah feature, today a ten-field form, becomes usable by someone who would never fill a form.
- **How:** a small template list beside `src/app/custom-mitzvah.tsx`, saved through `useCustomMitzvotStore` with `firstReminder(name)` as today.

### E. Teach in place (F5, F6)

**E1. One-time hints** · P1 · S to M

- **Change:** one mechanism for a hint that shows once: "drag the sun" (B4) first, then the check-in after Shabbat and the home card's "⋯". A hint inside the siddur reader waits: it touches the reader's scroll math.
- **User gain:** a hidden gesture is taught exactly where it is used, once.
- **How:** `useOneTimeHint(id)` over `discovery.hints`, drawn with the hero's `hint` prop or an `info` `Banner`.

**E2. A guide button on the complex screens** · P1 · S

- **Change:** the mitzvah screen, the schedule, the report, the check-in and the notice screens get a small "guide" pill in their header that opens the guide on their topic.
- **User gain:** help is where the question arises, not at the bottom of a list.
- **How:** a `HeaderPill` in `ScreenHeader`'s `actions`, to `/guide` with its `topic` param.

**E3. Empty states that lead somewhere** · P2 · S

- **Change:** the empty states of Tracking ("not enough history yet", trends, achievements, reading) gain one line on what will appear and a button to the action that fills them.
- **User gain:** a new user who opens Tracking on day one understands what it will become, instead of meeting blank cards.
- **How:** the empty-state blocks of `src/app/(tabs)/history.tsx`, with the shared `Button`.

### F. Make progress visible (F7)

**F1. Streak-goal moment** · P0 · S

- **Change:** on the day the streak reaches a goal (7, 30, 100, 365), home's streak row says so and opens Achievements.
- **User gain:** the tracking the app already does becomes a reason to come back, and users find the Tracking tab through their own success.
- **How:** `streakMessage()` in `homeMessages.ts` with `STREAK_GOALS`; no stored state.

### G. Reliability is part of the experience (F1)

**G1. Notification health** · P1 · S

- **Change:** when something blocks delivery (the battery exemption on Android), it is the first offer on home, with the button that fixes it; Settings › Device gains "send a sample reminder" (A5).
- **User gain:** the user learns that reminders may not arrive before missing a time, not after.
- **How:** `isIgnoringBatteryOptimizations()` and `requestIgnoreBatteryOptimizations()` of `src/services/deviceSettings.ts`, through C2.

### H. Measure without collecting (F9)

**H1. Usability test script** ([usability-test.md](usability-test.md)): eight tasks for the closed testers, run before phase 1 and after phases 2 and 3: finish setup and receive a reminder; find tomorrow's latest Shema; start a daily Chok LeYisrael reminder; get fewer notifications at night; mark from a notification and skip a mitzvah for today; open today's Tehillim; see the streak and last week's report; add a personal mitzvah. Nothing is collected by the app.

### Deferred on purpose

Built only if the test of H1 shows the need:

- Folding the mitzvah screen's timeline and reminders under one section: the timeline is the owner's pick of 2026-11-05, and the screen already opens with the switch, the mark and the text.
- A "most used" card in Settings: the aim is to need Settings less; B5 and the search cover it.
- "Remind me more" and quiet-hours offers: the first clears hand-placed nags, the second can drop night reminders.
- Guide summaries (16 topics, two languages), badge celebrations (the badge fold is too heavy to run on a mark), a hint in the reader.
- With a native build: a home-screen widget and app-icon shortcuts.

## Delivery phases

Each phase ships to the preview channel on its own. Phases 2 and 3 run in parallel; phase 3 is tied to the next native build.

| Phase | Content | Study first | Reaches users by |
|---|---|---|---|
| 0. Quick wins | A1, B3, B4, B5, C7, F1, the H1 baseline | no | update (A1's setup half with the next build) |
| 1. Offers | C1, C2, C3, C6, G1 | no (shared components) | update |
| 2. The map | C5, C4, A6, B1, B2, D1, E1, E2, E3, D2 | hub, capabilities screen, home's entry points | update |
| 3. First run | A2, A3, A4, A5 | setup short path | the next native build |

## How the work runs in this repo

1. Record the program: this plan as `.claude/specs/discoverability.md`, and one batch of items in `not-close.md` (project-manager skill).
2. For an item marked "study": a study under `design/lab/studies/<date>-<topic>/`, published as Artifacts, and the owner's pick before any code.
3. Build under the `src/` DOX chain. Every item carries its guide topic, its `WHATS_NEW` line, its search words, both dictionaries and its AGENTS.md updates. The sample reminder's own category is written into the root AGENTS.md as the one exception to "no category outside a mitzvah".
4. Gate: `pnpm typecheck`, `pnpm lint`, `pnpm check:dox`, `pnpm test:tz`.
5. Publish to preview, the owner checks on the phone, then production with the next production update (held today for the rav's R17). After home, the hub or setup change: `pnpm guide:build` and new store screenshots.

## Risks and how they are held

- **The owner's recent picks on home:** the offers use the existing Messages rows; anything that touches the hero or the cards goes through the study.
- **Launch time:** offers are evaluated after the first paint and memoised on the app day; nothing runs at module scope.
- **Notification schedule:** nothing new is scheduled and no id changes, so `SCHEDULE_FORMAT` stays. The weekly tip changes one body, which the sync reschedules by its content hash; the sample is presented at once and never pending.
- **Backup:** one new field in the user store; an older file restores it empty.
- **Store screenshots script:** it needs exactly one `setNotificationPermission('unknown')` in the web bundle, so the web shim adds none.
- **App Review:** it runs the binary's own setup, on an iPad, possibly on a Saturday; the preview and the sample button must hold inside a holy block.

## Verification

- **Suites added or extended:** the permission flow (`onboarding.cta.render`, `PermissionsList.render`, `NotificationScheduler.test.ts`, `schedulerWebParity.test.ts`, a home banner case); a store suite for `discovery` (defaults, merge, reset, backup); `offers.test.ts` (each rule and the policy, under `pnpm test:tz`) and a home render suite for the offer; `homeMessages.test.ts` (what's new, the streak goal); `notificationResponseHandler.test.ts` for the sample; a capability coverage suite; render suites for the hub and the capabilities screen. `routes.test.ts`, `screens.smoke.render.test.tsx`, `guide.test.ts`, `searchCoverage.test.ts` and `designSystem.test.ts` stay green.
- **On the preview app:** a setup from a reset on Android 13+ and on an iPhone (allow, "not now", blocked); the sample reminder's buttons on both; an offer accepted and declined; nothing offered inside Shabbat; the search from home on a real iPhone (the tab's views are rebuilt on a switch); Hebrew and English; display sizes 0.8 and 1.2.
- **With users:** the H1 script against its baseline.

## Open decisions for the owner

1. **The next native build:** the first-run work reaches new users only with it. Recommended: phases 0 to 2 over the air now, and phase 3 in the next build.
2. **Quiet hours for new users:** a night bound drops late alerts (Maariv's and the bedtime Shema's last-chance alerts, and after a late summer Shabbat abroad the weekly report). Recommended: 23:00 to 06:30, ticked and editable on the notification screen, with one line saying so.
3. **Candle lighting and the Omer by gender:** for a man whose wife lights, an unmarked candle lighting would read as missed every week. Recommended: candle lighting ticked for women and for an unanswered gender, off for men, who still get the pre-Shabbat notice with the lighting time; the Omer ticked for everyone until the rav says otherwise.
4. **Names:** the hub ("גלה" or "עוד") and the library's own name, in the study and the copy sign-off.
5. **The weekly tip:** read here as a line inside the existing weekly report notification. A separate weekly notification is possible but adds noise.
6. **The sample reminder's "done" button:** it needs the written exception of step 3 above. Recommended: yes.
