# AGENTS.md

## Purpose

- The study of 2026-11-13 for phase 3 of the discoverability program ([../../../../.claude/specs/discoverability.md](../../../../.claude/specs/discoverability.md), A2 to A5): the short first-run setup, six screens with goal bundles, the notification step with quiet hours and the ready screen with today's real windows and a sample reminder; a second direction for the bundles screen.
- Work in progress, not published yet: the sample reminder's time-left line comes out empty, because the data script fills the strings' placeholders before the page does.

## Ownership

- [gen-data.mjs](gen-data.mjs) is the hub study's data script with the setup's strings added; it writes [data.json](data.json) from the app's own code through [ts-loader/](ts-loader). Run `TZ=Asia/Jerusalem node --import ./ts-loader/register.mjs gen-data.mjs`.
- [build.mjs](build.mjs) writes the page into the build output (`out/`, never committed) from [site-template.html](site-template.html) and [data.json](data.json).

## Local Contracts

- The owner's picks: none yet. No code of phase 3 starts before them.

## Work Guidance

## Verification

- `node build.mjs` in this folder, then open the page at 1240 and at 430 points: no horizontal scroll, no page error.

## Child DOX Index

No child AGENTS.md files.
