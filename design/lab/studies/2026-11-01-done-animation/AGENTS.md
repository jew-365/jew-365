# AGENTS.md

## Purpose

- The study of 2026-11-01 for the owner's request: on home, pressing "עשיתי" on an open mitzvah lays a "נעשה!" stamp on the card and then removes it; the owner asked for five other animations for closing the task.
- One page shows home's "open now" cards and My day as the app draws them, with the current stamp and five variants, any of which plays on a press of "עשיתי": 1. the button turns into a drawn check and the ring fills in green; 2. the ring sweeps to full and a green wash spreads from it over the card; 3. a check pops on the icon tile and the card slides out toward My day; 4. the card folds into a done row with an undo button for two seconds; 5. sparks burst from the button. In each the card closes (height, gap and opacity together, so the list moves up as one) and its My day row turns done with a brief green light.
- Round 2, the same day, on the owner's word ("a combination of 2 and 5, and make the check in the ring less aggressive"): variant 6 joins them, the button turning into a check with sparks while the ring fills, a soft green wash spreads from it and the end line reads "done at"; the page opens on it. The ring's check, in every variant that has one, is now small (24 points), thin (2.2) and drawn in over 360 ms at 0.9 opacity, with no pop. The variants share `ringWash()`, `endLineDone()`, `sparks()`, `fillRing()` and `swapToCheck()`, and every animation holds its first frame through its delay (`fill: 'both'`).
- The owner's pick, the same day: variant 6 ("implement 6 and make an update to preview"). It ships in [../../../../src/components/NowCard.tsx](../../../../src/components/NowCard.tsx) with the page's timings; the ring turns green there by a green arc fading in over it rather than an animated stroke colour.

## Ownership

- [build.mjs](build.mjs) writes the page into the build output (`out/`, never committed) from [site-template.html](site-template.html), reading at build time the palettes of [../../../../src/theme/colors.ts](../../../../src/theme/colors.ts), the strings of [../../../../src/i18n/he.json](../../../../src/i18n/he.json) and the icons the app draws today, [../../../../src/components/jewishIcons.generated.ts](../../../../src/components/jewishIcons.generated.ts), which the page paints with the app's own `toneOf()` rule.
- [site-template.html](site-template.html) holds the cards, the six animations (`VARIANTS`, each a `run()` on the Web Animations API with the strong ease-out and ease-in-out curves), a ×4 slow-motion switch, a reset and the six palettes.

## Local Contracts

- Published as one private Artifact: https://claude.ai/artifact/NQ6K7uCD9NXQ2se1c9C2He, from the page the build writes. Republish to the same link after a change.
- The data is Thursday 29 October 2026 in Jerusalem at 13:00 with that day's zmanim (misheyakir 05:01, mincha gedola 11:50, shkia 16:52, tzeit 17:22); the marks at 07:12 and 07:40 are demo marks.
- The stamp variant reproduces [../../../../src/components/MarkStamp.tsx](../../../../src/components/MarkStamp.tsx) (1300 ms, scale 2.8 to 1.06 to 1, -18 to -12 degrees) and the card then vanishing at once, as home does today.
- Under reduced motion every variant is a 200 ms fade.

## Work Guidance

- In the app a variant becomes reanimated work in [../../../../src/components/NowCard.tsx](../../../../src/components/NowCard.tsx) and home's stamping state; the closing height is an interaction (allowed by the tripwire's allowlist), never a `layout=` prop.

## Verification

- `node build.mjs` in this folder, then play each variant with Playwright (at 1100 and at 430 points, slow motion on) and check that the card leaves, its My day row reads done and the open count drops.

## Child DOX Index

No child AGENTS.md files.
