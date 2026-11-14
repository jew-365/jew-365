# AGENTS.md

## Purpose

- The study of 2026-11-13 for phase 3 of the discoverability program ([../../../../.claude/specs/discoverability.md](../../../../.claude/specs/discoverability.md), A2 to A5): the short first-run setup, six screens with goal bundles, the notification step with quiet hours and the ready screen with today's real windows and a sample reminder; a second direction for the bundles screen.
- The six screens, in order: welcome (language, optional name and gender, the backup restore), nusach, location (a Continue that asks for the phone's location, or a city), "what matters to you" (direction א, the recommendation: five goal cards, three ticked, each mitzvah inside a ticked card removable), notifications (Continue opens the system prompt, "not now" the only way past without it; night quiet hours 23:00 to 06:30 ticked; the battery row on Android) and ready (the rest of the day's real windows, the coming candle lighting, a sample reminder drawn as the iPhone or Android shows it, and the accuracy notice). Direction ב of the bundles screen is one card of switches.
- The answers carry across the phones: a gender chosen on the first screen sets the bundles (candle lighting off for men, open decision 3; tefillin and Kiddush Levana hidden for women) and the ready screen's rows.

## Ownership

- [gen-data.mjs](gen-data.mjs) is the hub study's data script with the setup's strings added; it writes [data.json](data.json) from the app's own code through [ts-loader/](ts-loader). Run `TZ=Asia/Jerusalem node --import ./ts-loader/register.mjs gen-data.mjs`.
- [site-template.html](site-template.html) holds the screens, the palette and phone switches and the presses; its base styles and icon helpers are copied from the hub study's page. The words the app does not have yet (the bundles' names and captions, the notification step's title, the ready screen's lines, the sample button) are proposed copy.
- [build.mjs](build.mjs) writes the page into the build output (`out/`, never committed) from [site-template.html](site-template.html) and [data.json](data.json).

## Local Contracts

- Published as one private gallery Artifact: https://claude.ai/artifact/HwB8eRAUxBLygyAmVsz9nM. Republish to the same link after a change.
- No button that leads to a system permission prompt says Allow, Enable or Grant (App Review 5.1.1(iv)); they say Continue.
- The owner's picks: none yet. No code of phase 3 starts before them.

## Work Guidance

- The picks become A2 to A5 in [../../../../src/app/onboarding/](../../../../src/app/onboarding) and `src/data/bundles.ts`, under the `src/` DOX chain; they reach users with the next native build.

## Verification

- `node build.mjs` in this folder, then open the page at 1240 and at 430 points: no horizontal scroll, no page error, every press shows its result (the system dialog, the sample notification, a toast).

## Child DOX Index

No child AGENTS.md files.
