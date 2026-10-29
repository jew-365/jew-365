# AGENTS.md

## Purpose

- The home screen study of 2026-10-28, round 4: five mixes built only from what the owner liked in round 3, for the owner to pick **two** from. One becomes the app's default home and the other its alternative, switchable in Settings.
- The owner's likes, in his words of 2026-10-28:
  1. [ב קשת היום](../2026-10-27-home/boards/Arc.html): the clock and the day's state on the arc with the zmanim strip under it, and the vertical day timeline. The arc and its background were to be improved.
  2. In ב, the messages come right after the day's state. The yellow "ההתראה הבאה שלך" block with its "עריכה" button goes; the open-now cards of [ל אופק](../2026-10-27-home/boards/Horizon.html) take its place.
  3. The timeline of what was done, missed, open and still ahead, with more choices of design.
  4. From [י שמיים](../2026-10-27-home/boards/Sky.html): the open card over two side-by-side lists, "פספסתי היום" and "עשיתי היום", and a row for what is still ahead today.
- Order in every mix: the day's state (clock, arc or sky, zmanim strip) → open now → messages → the rest of the day.

## Ownership

- [core.js](core.js), [core.css](core.css) and [data.json](data.json) are copies of the round 3 core, unchanged; [gen-data.mjs](gen-data.mjs) writes the data.
- [ref/](ref) holds copies of the three round 3 boards the mixes borrow from, read-only, never built or published.
- [boards/](boards) holds the five mixes:
  - ג קשת וציר (`MixRail`): the improved arc, open-now cards, messages, the vertical rail;
  - ד קשת ושמיים (`MixTiles`): the same top, then the two side-by-side lists and the "בהמשך היום" row, no timeline;
  - ה שמיים מלאים (`MixSky`): a living sky hero with the zmanim strip, open now, messages, and the day in collapsible groups (בוקר, צהריים, ערב ולילה);
  - ז ציר בשלושה עיצובים (`MixStyles`): the same top, and the day in three looks switched by the user (ציר, כרטיסים, רצועת 24 שעות) with filters;
  - ח מסך אחד וטאבים (`MixTabs`): a small arc, open now and one top message in the first fold, then tabs: היום שלי, הודעות, זמני היום.
- Round 5 (the owner's request of 2026-10-28, after picking ז): ten more boards, each the whole ז screen ([boards/MixStyles.html](boards/MixStyles.html)) with one part changed, per [BRIEF-R5.md](BRIEF-R5.md):
  - five new arcs for ז's top scene: ק1 פנורמית (`ArcPanorama`), ק2 זכוכית (`ArcGlass`), ק3 שעון (`ArcDial`), ק4 שמש וירח (`ArcOrbit`), ק5 שכבות (`ArcPaper`);
  - five replacements for ז's third look, "רצועה", each opening on its look: ר1 לוח עמודות (`LookColumns`), ר2 קרוסלה (`LookCarousel`), ר3 אריחים (`LookTiles`), ר4 רשימה (`LookChecklist`), ר5 טבעות (`LookRings`).
- Round 6 (the owner was not sure about the arc and asked for more directions that blend with the app's colour scheme, [BRIEF-R6.md](BRIEF-R6.md)): five arcs over [boards/Final.html](boards/Final.html), their colours from the theme tokens, never saturated sky blue: ק6 קו (`ArcLine`), ק7 ים (`ArcSea`), ק8 טבעת (`ArcRing`), ק9 חלון (`ArcWindow`), ק10 זמנים על הקשת (`ArcRuler`, no chips strip). Round 5's ק1–ק5 use saturated blue skies and do not follow this rule.
- Round 7 ([BRIEF-R7.md](BRIEF-R7.md)): the owner found the "open now" card crowded (the progress bar with the sun thumb duplicates the ring timer), so the bar and the separate start and end labels were removed from every board, the window now sits once in the card's caption, and he asked for five more views in that direction, each Final with only that card changed: כ1 טבעת גדולה (`NowRing`), כ2 ספרות (`NowDigits`), כ3 מד (`NowGauge`), כ4 קומפקטי (`NowCompact`), כ5 מילוי (`NowFill`).
- The owner's picks of 2026-10-29 (after rounds 6 and 7): for the arc, the scene of ד קשת ושמיים ([boards/MixTiles.html](boards/MixTiles.html)); for the card, Final's ring card with its time text changed to two lines, "<start> - התחלה" and "<end> - סוף", with no zman names. [boards/Final.html](boards/Final.html) now holds both: one full-bleed hero over the top half of the screen (greeting, Hebrew date, arc, next-zman pill and the zmanim chips on the sky, no floating card, no counters), and from its bottom edge the body in the theme colours (open now, messages, "היום שלי" with rings by default). The version before this change is [ref/Final-before-hero.html](ref/Final-before-hero.html). The arcs of rounds 5 and 6 and the cards of round 7 stay as alternatives that were not picked.
- [dirs.json](dirs.json) holds each mix's gallery text. [site-template.html](site-template.html) is the gallery page, changed for this round to take **two** ranked picks (the first is the default, the second the alternative).
- [BRIEF.md](BRIEF.md) is the contract the board-building agents followed.

## Local Contracts

- The personal "next notification" message is a plain row in every mix, opening the personal sheet; no board draws the yellow header or the edit button. The core still labels that message's action "עריכה"; each board overrides the label in its own `renderVals()`.
- A mix is a complete home screen on its own, so any two can ship as default and alternative.
- Published to two private Artifacts, republished to the same links on every later round of this study:
  - canvas: https://claude.ai/artifact/FbnAifFQQGcBcUMmEfqpcR
  - gallery site: https://claude.ai/artifact/A5dhTCGRLox5qmY1ycq7EP
- Both are private; sharing is the owner's call from each page's Share menu. Both were created in the Akeyless claude.ai account, so after that account is gone the next publish creates new links: record them here.

## Work Guidance

- Owner's pick of 2026-10-28: ז ציר בשלושה עיצובים first, then, from round 5, ק4 (the sun and moon ellipse) and ר5 (rings, in place of "רצועה"). [boards/Final.html](boards/Final.html) is that pick built as one board: ז with ק4's scene and ר5's rings as the default look, and, at the owner's word, no filter chips (and the rings legend no longer filters) and no counters or streak chip at the top. There is no second design: the owner closed the default-and-alternative question with the look switch inside Final (rings, cards, rail). A third Artifact, https://claude.ai/artifact/GBQXruVRkaBxPCmvn515Nb, shows Final alone in a phone frame, built from the build folder [out/final](out/final) (a copy of the built Final board and `support.js` under an `index.html` that scales the phone to the screen); republish it to the same link after any change to Final.

- Open decisions for the pick:
  - which two mixes, and which is the default;
  - where the switch between the two lives in Settings;
  - the product decisions still open from round 3 (one tone for all messages or one per mitzvah, a required name card, "בכל זאת עשיתי", which general messages home carries, whether the scrub gesture ships in the app).
- Known notes from the builders: ג and ז's streak chip may wrap; ד's "פספסתי היום" wraps in the narrow column; ח's tab bar sits under the core's back pill while scrubbing; the core's pill and `shot.mjs` render a 420px window for a 390px phone, so screenshots carry a blank strip.

## Verification

- `node build.mjs`, then `node assemble.mjs`, then screenshots with `node ../../tools/shot.mjs 2026-10-28-home-mix <Board> "startTime=12:30" <out.png>` while the `design-site` server runs.

## Child DOX Index

No child AGENTS.md files.
