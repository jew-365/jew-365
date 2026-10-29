# Home screen board contract, round 4 (Jew 365 design directions)

You build or upgrade **design directions for the home screen** of Jew 365 (יהודי 365), a Hebrew-first mobile app of daily mitzvah reminders inside halachic time windows. Each direction is one interactive phone board, 390×844, RTL Hebrew. These are design mockups only: nothing in the app repo changes.

Root folder (call it `$V`): `design/lab/studies/2026-10-28-home-mix` in the repository. Read [design/lab/AGENTS.md](../../AGENTS.md) for the lab's workflow.

## What the product owner asked for this round (round 4: five mixes)

The owner looked at the ten round 3 directions and named exactly what he liked. Build **mixes of only these parts**. Reference boards (read them first, they are copies of the round 3 boards): `$V/ref/Arc.html` (ב קשת היום), `$V/ref/Horizon.html` (ל אופק), `$V/ref/Sky.html` (י שמיים). Copy markup, CSS and logic from them freely into your own board; never edit `ref/`.

**Likes**
1. **From ב קשת היום:** the top of the screen: the clock and the day's state on the sun arc, with the day's zmanim in a compact strip right under it, and the vertical **day timeline** lower down (a rail with every item of the day: done, missed, active now, later, with a "now" marker). He wants the **arc and its background improved** (see "The improved scene").
2. **From ב:** right after the day's state come the messages to the user. **Drop** its yellow "ההתראה הבאה שלך" header with the "עריכה" button (the whole peach block). The personal "next notification" message stays only as an ordinary message row (tag אישי, opens the personal sheet through `m.act`), no yellow header, no edit button.
3. **From ל אופק:** the **open-now card** style, and it goes **between the day's state and the messages**, instead of that dropped block: a ring with the time left, the mitzvah name and its subtitle, a progress bar with a glowing sun thumb from its start time to its end time (`startT`/`fromName`, `endT`/`toName`/`endWord`), then "התפללתי" (mark) and "נוסח". More than one open item gives more than one card (a compact stack or a horizontal snap).
4. **From ב:** the day timeline as a rail (done, missed with "בכל זאת עשיתי", active, later) is the best view of "what I did, what I missed, what is left". He wants **more design choices for it**.
5. **From י שמיים:** the open-now card on top of two side-by-side lists, **"פספסתי היום"** and **"עשיתי היום"**, and under them one row for **"בהמשך היום"** (the next later item and its time).

**Order of the main content, in every mix:** the day's state (clock, arc, zmanim strip) → open now → messages → the rest of the day (timeline and/or the two lists and the "later" row, as your mix says).

**The improved scene** (for mixes with the arc): the arc's sky and background must feel richer and calmer than round 3's Arc: a sky gradient that follows the time of day (dawn, noon, sunset, night with stars and a moon), a soft horizon line or hills silhouette, a glowing sun with a trail along the arc, the arc stroke as a gradient by part of day with small ticks at the zmanim and a clear "now" marker, gentle drifting clouds or light rays. Calm, premium, readable; CSS and SVG only. The signature gesture stays "drag the sun along the arc" plus the range input equivalent.

**What the mix owns:** each mix (below) decides which of these parts it shows and how the rest of the day is laid out. The owner will pick **two** mixes: one becomes the app's default home and the other its alternative, switchable in Settings, so keep each mix a complete, self-sufficient home screen.

All five things below (zmanim, messages, open now, done, missed, plus upcoming) must still appear in every mix, and the empty states stay designed.

## The five things every board must show (unchanged)

1. **זמני היום**: all 11 zmanim (`zmanim`), past ones dimmed, the next one highlighted with how long until it (`nextZ`).
2. **הודעות**: messages to the user (`messages`). Personal ones come first: the next notification in the user's name and tone, and the streak. Then general ones built from real data: today's or the next hilula, the next Shabbat with candle lighting and exit, Rosh Chodesh, Chanukah or a fast when near, and a system update. Dismiss works where `canDismiss` is true. The personal "next notification" message opens the personal sheet (`m.act`).
3. **מה פתוח עכשיו**: every open mitzvah (`active`) with **when it started and when it ends** (`startT`, `endT`, `endWord`, `fromName`/`toName`) and the time left, plus a mark button.
4. **מה עשיתי היום**: `done`, with the time (`at`), a late tag (`late`) and undo.
5. **מה פספסתי היום**: `missed`, with when it ended (`ago`) and "בכל זאת עשיתי" (`mark`).

Also show what is still ahead (`upcoming`). Every list has a designed empty state (`noActive`/`activeEmptyTitle`/`activeEmptyText`, `noDone`/`doneEmpty`, `noMissed`/`missedEmpty`). The board contains `<!--NAMECARD-->` once near the top.

## Live time, real data and scrubbing (new this round, in the core)

- **Real data.** The core carries 68 days of real Jerusalem data (25.10–31.12.2026) computed with the app's own libraries: zmanim, Hebrew date, parasha, Shabbat blocks, Rosh Chodesh, Chanukah, fasts, hilulot.
  - Zmanim and windows change every day, so **never hardcode a time, a date, a name or a zman value**. Read everything from `coreVals()`, `this.items()`, `this.zmanimList()`, `this.zmanSec(id)`, `this.dayStart()` (alot, seconds), `this.dayEnd()` (next alot, seconds; may be above 86400) and `this.now()`.
  - Seconds above 86400 are after midnight of the same app day. The app's day runs from alot to the next alot.
- **Time modes.** The board opens on the real time now in Jerusalem (`mode` is `'live'`, `isLive`).
  - The hash or canvas tweak `startTime=HH:MM` fixes a time, which then ticks (`'fixed'`).
  - `date=YYYY-MM-DD` forces a date, for testing only. Useful dates: `2026-10-30` (Friday; Shabbat starts at candle lighting), `2026-10-31` (Shabbat), `2026-11-10` (Rosh Chodesh), `2026-12-06` (Chanukah), `2026-12-20` (fast).
- **Scrubbing is the core of "alive".**
  - Your board's signature gesture calls `this.scrub(sec)` with an absolute second of the app day. The core clamps it to the day.
  - Statuses, done/missed, messages, the next zman and the Hebrew date all re-derive at that time. Dragging back to the morning shows nothing done yet.
  - While scrubbed (`isScrub`), the core shows a floating "תצוגה של 14:05 · חזרה לעכשיו" pill at the top; `this.goLive()` returns. Do not build your own back control unless it is part of your gesture's own design; never build a second pill.
  - Throttle drag updates with `requestAnimationFrame`.
- **Shabbat and Yom Tov.** When the shown instant is inside a holy block (from candle lighting to exit), the core covers the board with its Shabbat screen and a "להציץ ביום חול לדוגמה" button. You build nothing for it, but your gesture must not break when scrubbing into or out of a block.
- **Marks.** Demo marks are seeded from the day's zmanim: tefillin at netz+75 min, shacharit at sof tfila−40, mincha at mincha gedola+110; Kriat Shema of shacharit is the demo miss. A mark counts only once the shown time is at or after it.

## Files and commands

- Your board: `$V/boards/<Name>.html`. The core is `$V/core.js` and `$V/core.css`; read `coreVals()` for every value.
- **Never edit** `core.js`, `core.css`, `build.mjs`, `shot.mjs`, `data.json` or another agent's board. A real core gap goes in your report; derive what you can in your own `renderVals()`.
- Build: `node "$V/build.mjs" <Name>` → `$V/out/project/<Name>.dc.html`.
- Serve the build with the `design-site` launch configuration (python on port 8096, rooted at `design/`): a board opens at `http://127.0.0.1:8096/lab/studies/2026-10-28-home-mix/out/project/<Name>.dc.html`. Do not stop a server you did not start.
- Screenshot: `node design/lab/tools/shot.mjs 2026-10-28-home-mix <Name> "<hash>" "<scratch folder>/<Name>-<tag>.png"`, then open the PNG with your Read tool. The hash takes:
  - `startTime=07:42|08:15|12:30|20:15|HH:MM`
  - `theme=gold|rose|night`
  - `bigText=1`
  - `userName=` (empty, so the name card shows)
  - `date=YYYY-MM-DD`
  `tall=1` is added for you. **Always pass `startTime` in screenshots**, so the result does not depend on the real clock.
- To test gestures, drive the page in headless Edge over the DevTools protocol (dispatch pointer events, read the DOM). Use a random debug port and a unique profile folder, and kill only the Edge processes you started.
- **Edge hygiene is mandatory.** In the previous run, leftover headless Edge instances piled up to about 480 processes. They choked the machine and killed several agents' connections.
  - Close every Edge you launch as soon as its test ends: `Browser.close` over CDP, then kill the PID you started if it is still alive.
  - Never leave a page with running animations open, and never start a test in the background and walk away from it.
  - Keep test and screenshot runs to what the contract requires.
  - Before your final report, verify that none of your Edge processes remain.

## Board template format

```html
<!--board title="כ · מסלולים"-->
<style>/* board CSS; colors through var(--token) unless your direction owns a fixed palette */</style>
<template>
<div class="scroll" style="position: absolute; inset: 0; overflow-y: auto; padding: 24px 20px 124px">
  ... markup with <!--NAMECARD--> once ...
</div>
</template>
<script>
class Component extends DCLogic {
/*CORE*/

  boardState() { return {}; }

  renderVals() {
    const c = this.coreVals();
    return { ...c };
  }
}
</script>
```

- No shell (`.ph`, `x-dc`, `helmet`, doctype). Your scroll container is `class="scroll"` with ≥124px bottom padding for the floating tab bar.
- Layers:
  - your own floating layers stay below `z-index` 9;
  - the core uses the back pill (9), the tabs (10), the toast (15), the Shabbat screen (18) and the personal sheet (20+).
- Hooks: `boardState()`, `boardMount()`, `boardUnmount()`.

## Template language (DC runtime), exact rules

- Holes are plain paths only (`{{hero.endT}}`). Compute every string and number in `renderVals()`.
- `<sc-if value="{{bool}}" hint-placeholder-val="{{ true }}">` and `<sc-for list="{{arr}}" as="x" hint-placeholder-count="3">`. They nest, and `sc-for` keys its rows by index.
- Events:
  - `onClick`;
  - `onChange` (on `<input type="range">` it fires on every move);
  - `onPointerDown`, `onPointerMove`, `onPointerUp` (verified to work; use `e.currentTarget.setPointerCapture(e.pointerId)` on down, and `touch-action: none` on the drag surface);
  - `onKeyDown`.
- Holes work in attributes, including SVG attributes (`d`, `cx`, `transform`) and `style`.
- **A text hole inside SVG `<text>` renders nothing**: put dynamic labels in HTML positioned over the SVG.
- **Every text hole renders as `<span class="sc-interp">`**, so descendant `span` selectors catch it: use child selectors (`>`) or classes.
- Restart an entrance animation with `'enter-' + this.flip('key', value)` and two identical keyframes.
- Icon macros:
  - `[[ic:NAME]]`, with NAME one of box, book, sun, moon, check, clock, bell, pencil, close, flame, star, candle, update, dawn, sunrise, sunset, chevron, undo, speaker, sparkle, list, alert, calendar, grid, home, chart, sliders, play, pause;
  - `[[icItem:it]]`, `[[icMsg:m]]`, `[[icZ:z]]`.

## Data from `coreVals()`

- **Clock and date** (`liveSec` is the unscrubbed time, for a "now" ghost while scrubbing):
  - `nowT`, `nowSec`, `nowPos` (percent of the app day), `dayStartSec`, `dayEndSec`;
  - `mode`, `isLive`, `isScrub`, `isNight`;
  - `greeting`, `greetPart`, `name`;
  - `weekday`, `hebDate`, `hebDay`, `gregDate`, `gregShort`, `parasha`, `city`, `dateLine`, `dateKey`, `streak`.
- **Zmanim:** `zmanim[]` {id, name, short, time, p, past, isNext, cls, isDawn/isRise/isDay/isSet/isNight}; `nextZ` {name, short, time, left, leftShort}.
- **Messages:** `messages[]` {id, tag, title, body, hasAction, action, act, canDismiss, dismiss, dismissLabel, isPersonal/isGeneral/isSystem, kindCls, cls, isBell/isFlame/isStar/isCandle/isMoon/isUpdate/isCalendar}; `msgPersonal`, `msgGeneral`, `msgCount`, `hasMessages`, `hasMsgGeneral`.
- **Every mitzvah item:** id, name, short, startT, endT, endsTomorrow, endWord, fromName, toName, range, cta, p0, p1, isSun/isBox/isBook/isMoon, cls, isMarking, mark, markLabel, open.
  - `active[]` adds left, leftShort, leftNum, leftUnit, pctLeft, pctGone, urgent, urgentCls, focus, focusLabel. `hero`, `hasHero`, `heroAnim`, `rest`, `hasRest`.
  - `done[]` adds at, late, undo, undoLabel. `missed[]` adds ago. `upcoming[]` adds inText, inShort.
  - `timeline[]`: all items with status, statusText, statusShort, isDone/isMissed/isActive/isUpcoming, at, undo.
  - Raw seconds: `this.items()` gives `S`/`E`; `this.zmanimList()` gives `S`.
- **Counts:** doneN, missedN, activeN, upcomingN, totalN, donePct, countText, countLabel.
- **Personal:** openPersonal, pLine, pLineTitle.
- **Helpers:** `this.dash(c, pct)`, `this.jump(id)`, `this.showToast({ text })`, `this.clock(sec)`, `this.left(sec)`, `this.hm(sec)`.

## Design bar, round 4

- **Futuristic and beautiful.** Think premium watch faces, spatial UI, glass and light: depth, glow, layered translucency, precise thin lines, generous dark or luminous surfaces, purposeful motion. It must stay calm and readable for a religious daily-use app, never a gaming HUD parody.
- **Alive.** Something always shows time passing: a sweep, a breathing glow, drifting light, a ticking hand. State changes animate: marking, undo, dismiss, scrubbing. The signature gesture feels physical (inertia or easing is welcome), and every visual reacts to it as you drag.
- **One signature gesture per board** that scrubs time through the visual itself: drag the sun, spin the dial, swipe the horizon. Also offer an accessible equivalent: a real `<input type="range">` (it may be visually integrated), or arrow keys via `onKeyDown` on a focusable element with `role="slider"`, `aria-valuetext` and the time.
- Colors: theme tokens for content (`--bg --surface --surface2 --text --sub --border --accent --onAccent --soft --accentText --safe --onSafe --safeSoft --urgent --onUrgent --urgentSoft --info --infoSoft --shadow`), so gold, rose and night work. A direction that owns a fixed scene palette (sky, space) may use fixed colors for the scene, but **all text keeps ≥4.5:1 contrast in all three themes**.
- Accessibility:
  - tap targets ≥44px;
  - an `aria-label` on icon-only buttons;
  - real buttons;
  - lists marked up as lists;
  - text ≥12px;
  - `bigText=1` must hold.
  - `prefers-reduced-motion` is handled globally by the core, but do not rely on motion to convey meaning.
- Hebrew on screen only, natural and short; numbers tabular. No horizontal overflow except deliberate scrollers. Fonts: Heebo and Frank Ruhl Libre. No external resources or images: CSS and SVG only.

## Verify before you report

1. `node "$V/build.mjs" <Name>` passes.
2. Screenshots, each opened and inspected:
   - `startTime=07:42`, `startTime=12:30` and `startTime=20:15` (gold);
   - `startTime=12:30&theme=night`;
   - `startTime=12:30&theme=rose&bigText=1`;
   - `startTime=08:15&userName=`;
   - `startTime=12:30&date=2026-12-06` (Chanukah messages);
   - `startTime=15:00&date=2026-10-30` (a Friday before candle lighting).
   Fix what you see.
3. In headless Edge:
   - Drive the signature gesture and check that the time, the statuses and the visuals follow it, that the core back pill appears, and that `goLive` returns.
   - Mark an open item, mark a missed one, undo a done one, dismiss and restore a message, and open the personal sheet.
   - Watch the browser console for errors.

Report: board file(s), screenshot paths, the direction's signature in one sentence, the gesture and how it was tested, known issues, core gaps. Do not commit anything.
