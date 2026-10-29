# Round 5 addendum (read after BRIEF.md)

The owner picked **ז · ציר בשלושה עיצובים** (`$V/boards/MixStyles.html`, the base) and asked for two more sets, ten boards in all. Every board is the **whole ז screen**, copied from `MixStyles.html` and changed in one place only. Everything else stays exactly as ז has it: header, counters, open-now cards, messages, the "היום שלי" heading with the look switch and the filter chips, behaviour, scrubbing, marks, the personal-message label override, the three themes and bigText.

Never edit `MixStyles.html`, `ref/`, the core, `build.mjs`, `assemble.mjs`, `dirs.json` or another agent's board. Your board is a new file under `$V/boards/`. Start by copying `MixStyles.html` to your file name, change its `<!--board title="…"-->`, and edit the copy. Build with `node build.mjs <Name>` from `$V`. The design-site server on port 8096 is already running: do not start or stop it.

## Set A: five arcs (boards `Arc*`)

Change only the top scene of ז: the sky card with the arc, the sun or moon and its gesture, the big clock and the zmanim strip below it. Keep ז's three-looks section as it is. The scene must stay in ז's style (a calm, premium sky scene that follows the time of day: dawn, noon, sunset, night with stars and a moon; the sun dragged along a path; the clock inside; zmanim ticks and a clear "now" marker; a `role="slider"` and keyboard equivalent; the scrub through `this.scrub` throttled with `requestAnimationFrame`; the core back pill and `goLive` working). It must look clearly different from ז's arc and from the other four, per the concept in your assignment. Text keeps at least 4.5:1 on the scene in all three themes and with bigText. CSS and SVG only.

## Set B: five replacements for the "רצועה" look (boards `Look*`)

ז's third look, "רצועה" (a 24-hour axis with one bar per item), is not pretty enough. Replace it with your concept: the look's button keeps the third place in the switch (give it a new Hebrew name and icon from the BRIEF's icon list), the three looks stay switchable, and **your board opens with the new look selected** (default `look` in state). Rails ("ציר") and cards ("כרטיסים") stay untouched. The new look shows the same `timeline` data, follows the filter chips and the scrub live, has designed empty states, and keeps every action (mark, "בכל זאת עשיתי", undo, open the siddur text "נוסח" where the other looks have it). It must work at 390px and with bigText.

## Verify

As the BRIEF's list, trimmed: build passes; screenshots with `startTime=12:30` (gold), `startTime=07:42`, `startTime=20:15`, `startTime=12:30&theme=night`, `startTime=12:30&theme=rose&bigText=1`, each opened and inspected; in headless Edge drive the scene gesture (arcs) or the new look's actions (looks), mark an open item, mark a missed item, undo, switch the three looks, change filters, and check the console is clean. Edge hygiene is mandatory: close every Edge you start and verify none of yours remain. Screenshots go under the session scratchpad dir `C:\Users\avrah\AppData\Local\Temp\claude\C--Users-avrah--claude-spares-spare-BVxlRU\b3587dd3-4b79-4168-9f44-b2beaaf8d47b\scratchpad\<your board name lowercased>\`. Do not commit. Never run a command that dumps package-manager config. Report briefly: board file, screenshot paths, the signature in one sentence, what you tested, known issues.
