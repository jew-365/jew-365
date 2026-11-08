# Brief: a condensed, smart schedule per period on the home screen

The owner's request (2026-11-08, in Hebrew): "לוח זמנים נוכחי מצומצם רלוונטי חכם פר תקופה למסך הבית" — a current schedule for the home screen that is condensed, shows only what is relevant, and is smart about the period.

"Period" is read two ways, and every board answers both:

- the part of the day: שחר (alot to netz), בוקר (to chatzot), צהריים (to plag), ערב (to tzeit, or to candle lighting on an erev, or to the exit on motzaei Shabbat), לילה (to the next alot; מוצאי שבת or ליל חנוכה when it is one);
- the time of year: ערב שבת, מוצאי שבת, ראש חודש (from three days ahead), חנוכה, קידוש לבנה, a fast day.

## The rules every board shares

They live once, in [sched.js](sched.js) (`schedPlan()`, `schedVals()`):

- Anchors are the day's zmanim plus the period's own times: candle lighting, the exit, the Chanukah candles, the end of a fast, the opening of Kiddush Levana. Every time is read from [data.json](data.json), which [gen-data.mjs](gen-data.mjs) computes with the app's own `ZmanimService`, `dayWindow()` over `MITZVOT` and `HebcalService.holyBlockOn()`.
- Each anchor has a score: a period time 5, the end of a mitzvah the user has not marked 4 (6 within 45 minutes, shown red), the start of an unmarked mitzvah 3, a plain zman 1, the bedtime-Shema chatzot 2 at most, and the end of a mitzvah already marked 0 (shown muted with its check).
- "The next ones" are the highest-scored future anchors up to the end of the next period (a period time always qualifies), shown in time order and filled up with the nearest ones.
- Badges name what is special now: ערב שבת with the lighting, tomorrow's erev after chatzot, מוצאי שבת, the Chanukah night, Rosh Chodesh (today, or within three days), a fast with its end, Kiddush Levana open with its last night.

## Boards

One source, [boards/HomeNow.html](boards/HomeNow.html); [gen-boards.mjs](gen-boards.mjs) writes the four directions by `const SCHED`. The template format and runtime rules are the lab's ([../../AGENTS.md](../../AGENTS.md)); the markup of the schedule card is [sched.html](sched.html), its styles [sched.css](sched.css).

## Round 2

The owner, after round 1: "התכוונתי ... לוח קטן שיציג זמנים רלוונטים לאותו הרגע ומצומצם עבור דף הבית או ראש האפליקציה", then the three layers: fixed times always shown, smart times by the hour and the period, and times the user pins from suggestions fitted to them. Round 2 keeps round 1's engine for the smart layer, takes at most two of its times, and shows one board in three placements (a card under the hero, the hero's strip, a band at the top of the app).
