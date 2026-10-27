# History tab sketches (2026-10-26)

Two directions for the task "Sketch two directions for the history tab" in [../../not-close.md](../../not-close.md). Both carry the five agreed items (greeting by first name, an explaining line under each number, best streak, badges, a streak per mitzvah) on the same fixture: a 12-day streak, a best of 31, 87% over 30 days, three badges earned. Screenshots are 375 points wide in Hebrew, gold palette (light) and dark palette (dark).

## A - Ring first ([a-light.png](a-light.png), [a-dark.png](a-dark.png), [sketch-a.tsx.txt](sketch-a.tsx.txt))

Keeps today's landscape hero and streak ring, with the greeting above it and the "what a streak is" line under the goal caption. Two stat cards (best streak, 30-day percent) follow, then a horizontal row of badge tiles (earned first, locked ones muted), the 30-day grid with a legend, and the per-mitzvah card where each row adds a streak chip beside its percent and bar. Emphasis: the current streak, as today.

## B - Summary card ([b-light.png](b-light.png), [b-dark.png](b-dark.png), [sketch-b.tsx.txt](sketch-b.tsx.txt))

Drops the hero: the greeting is the NavBar title, and one card holds the three numbers side by side (streak, best, percent), each with its explaining line, then a progress bar to the next goal and a compact 30-day dot grid. Earned badges get their own three-tile row, the next badges a list with progress bars, and each mitzvah is a ListRow with its icon, "streak N days · best M" and the percent at the end. Emphasis: achievements and the per-mitzvah picture, more information above the fold.

The `.tsx.txt` files are the temporary route sources with hard-coded fixtures and Hebrew literals; the chosen one is rebuilt properly (i18n, real data) in the task "Build the chosen history design".

## Round 2: on top of A (2026-10-26)

The owner chose A and asked to replace the 30-day percent with daily, weekly and monthly percents drawn like the streak ring, maybe as three tabs. Both variants share one fixture, Thursday 18 Cheshvan in Jerusalem at 15:40 with eight daily mitzvot enabled: today 4 of 6 (67%, two still open), the week since Sunday 31 of 38 (82%), the last 30 days 209 of 240 (87%), a 12-day streak, a best of 31, three badges. "Monthly" counts the last 30 days, the window the 30-day grid and the stats engine already use, so it is never a near-empty Hebrew month on its first days. The percent rings are a local `PercentRing` in each sketch, drawn in `StreakRing`'s arc language (disc, `surface2` track, round `gold` arc from the top); building either variant means giving `StreakRing` a percent mode rather than a second ring component.

### C - Three rings ([c-light.png](c-light.png), [c-dark.png](c-dark.png), [sketch-c.tsx.txt](sketch-c.tsx.txt))

A unchanged down to the streak ring, then a row of three smaller rings (יומי, שבועי, חודשי), each with its percent, the count under it, and a short line naming what it counts, plus one shared line on what a percent means. The best streak becomes one full-width card; badges, the 30-day grid and the per-mitzvah card follow as in A. One scroll, every number visible.

### D - Day / week / month tabs ([d-week-light.png](d-week-light.png), [d-day-light.png](d-day-light.png), [d-month-light.png](d-month-light.png), [d-week-dark.png](d-week-dark.png), [sketch-d.tsx.txt](sketch-d.tsx.txt))

The hero shrinks to the greeting, a smaller streak ring with the goal, the explaining line and a best-streak pill beside it, so the streak and best stay above the tabs. A `SegmentedControl` (יום / שבוע / חודש) switches one big percent ring and that period's content: today's mitzvot done, open and coming later; a seven-day bar strip and the week per mitzvah; the 30-day grid and per-mitzvah percent with streak chips. Badges close every tab. It opens on שבוע: home already answers "today", the week is the app's rhythm (it closes at Shabbat with the weekly report), and a day ring at seven in the morning reads 0% or 100% off one or two windows.

## Round 3: E, the tabbed screen on top of C (2026-10-26)

The owner chose C as the first of three tabs and approved the structure: `סיכום | מגמות | הישגים`, the reports inside מגמות (no Reports pill), and one insight line under every chart. Same fixture as round 2 (Thursday 18 Cheshvan 5787 in Jerusalem, streak 12, best 31, this week 82%, 30 days 87%, three badges), plus twelve weeks of history from parashat Shoftim to Vayera. Screenshots per tab, gold (light) and dark: [e-summary-light.png](e-summary-light.png), [e-trends-light.png](e-trends-light.png), [e-achievements-light.png](e-achievements-light.png), [e-summary-dark.png](e-summary-dark.png), [e-trends-dark.png](e-trends-dark.png), [e-achievements-dark.png](e-achievements-dark.png); source [sketch-e.tsx.txt](sketch-e.tsx.txt).

### Layout decisions

- **The hero stays above all three tabs, and the switcher sticks.** The tab switcher is the shared `SegmentedControl`, right under the hero. If the hero belonged to סיכום only, the switcher would jump some 360 points up the moment מגמות or הישגים is chosen, away from the finger that pressed it. With the hero on every tab the switcher never moves, the streak (the one number every tab explains) stays the screen's identity, and the switcher is a sticky header (`stickyHeaderIndices`), so once the hero has scrolled away the tabs stay pinned at the top. The build keeps the scroll at the switcher when switching tabs below the hero.
- **Time flows right to left in the charts.** The oldest week is on the right and the current week on the left, where a Hebrew reader's eye ends. The same screen already runs right to left: the 30-day grid (day 1 at the top right), every progress bar (filled from the right) and the switcher. Many Israeli apps keep time left to right in charts, but a chart that reads the other way from the grid above it makes the eye reverse within one scroll. Bars are plain flex `View`s, so the direction comes from the layout direction, never from coordinates; flipping it later is `row-reverse` on one row.
- **Shabbat and Yom Tov have their own row in the weekday chart and stay out of the comparison.** Their marks come from the check-in after the block, made later and from memory, so they measure the check-in as much as the day. Ordinary Sunday to Friday days are compared; the holy days (every day inside a holy block, Yom Tov on a weekday included) form one dashed row under a divider with a line saying why. Nothing is hidden and nothing is compared unfairly.
- **סיכום keeps C's numbers, minus what moved to הישגים.** The period rings, the 30-day grid and the per-mitzvah card stay; C's best-streak card and badge row move to הישגים, and a single row in their place ("3 הישגים · השיא שלך 31 ימים", next badge in its caption) switches to that tab.
- **Charts and bars.** Bars start at zero (no cropped axis to exaggerate change), with hairline guides at 50% and 100%. The highlighted bar is solid `gold`, the others `gold` at 45% over `surface`; the current, unfinished week is a dashed `gold` outline on `goldLight`, the same mark the holy-days row uses for "not a closed number". Value labels only on the current and the best week.
- **Per-mitzvah trend is the bar plus a tick, not a sparkline.** Each row shows the 30-day percent, a chip with the change in points (`chevronUp` / `chevronDown`, `goldText` on `goldLight` for a rise, `textSub` on `surface2` for a fall, "ללא שינוי" for none) and a thin tick on the bar where the mitzvah stood in the 30 days before. Sorted by change, rises first. A fall is never red: the app does not scold.
- **Reports** are a divided card: the current week first as "השבוע (עד עכשיו)", then the five weeks before it, each titled by its parasha (or "שבוע סוכות" for a festival week), with the d.M range of the report screen, marked of decided, the percent and a small bar; a row opens `/report?week=<week end>`. A last row opens the older weeks.
- **הישגים**: the earned badges as a three-column grid (icon, name, Hebrew date earned), "בדרך להישג הבא" with a progress bar and how many are left, the two personal records (longest streak with its dates, best week with its parasha and dates), and each mitzvah's longest streak beside its current one.

### Insight lines and the rule behind each

Every line is one sentence, factual and in the second person without a gendered verb (סימנת, שלך), like the app's existing copy. A rule names only good news or a neutral fact; when no rule fires, the line falls back to a neutral average, never to the weakest item.

| Chart | Line in the sketch | Rule (first that fires) |
|---|---|---|
| 30-day grid | ב־28 מתוך 30 הימים האחרונים סימנת לפחות מצווה אחת | days with at least one mark out of the days judged |
| Per mitzvah (סיכום) | תפילין מובילה: 93% ב־30 הימים האחרונים | highest 30-day percent |
| 12 weeks | 88% בשבוע של לך לך: השבוע הטוב ביותר ב־12 השבועות האחרונים | 1. the last finished week is the best of the twelve; 2. N ≥ 3 finished weeks in a row at 80% or more; 3. the last four finished weeks average 5 points above the four before; 4. "ממוצע 12 השבועות: X%" |
| Weekday | ראשון הוא היום החזק שלך: 89% ב־12 השבועות האחרונים | the best Sunday to Friday day when it leads the mean by 5 points; else "הימים שלך מאוזנים: כולם בין X% ל־Y%" |
| Per-mitzvah trend | שחרית עלתה ב־12 נקודות לעומת 30 הימים שלפני, והיא עכשיו על 83% | 1. the biggest rise of 5 points or more; 2. the highest mitzvah held steady ("X נשארה על Y%"); never the biggest fall |

Bidi gotcha found while capturing: a maqaf before a percent (`מ־71%`) renders as `מ־%71`, so a line keeps a percent after a space and never right after a Hebrew prefix letter.

### Data each chart needs

- **12 weeks and the reports list**: per week, the marked and decided count, which `weekSummary()` in `src/utils/weeklyReport.ts` already computes for the report screen. Twelve weeks are 84 days, inside the 400-day retention of `useCompletionsStore`; nothing new is stored.
- **Weekday chart**: per ordinary day over the twelve weeks, marked and decided, the same judging as `computeStats()` / `judgeDay()` in `src/utils/historyStats.ts` run over 84 days instead of 30, with holy-block days split out through `HebcalService.holyBlockOn()`.
- **Per-mitzvah trend**: `computeStats()` over two 30-day windows (days 1-30 and 31-60), already within retention.
- **Badges and records**: the streak badges, the full week and "100 times" counts derive from the completions map; the longest streak, the best week and each mitzvah's best streak over the whole history need the history past 400 days, where `archivedDays` keeps only runs of kept days (enough for the overall streak, not for per-mitzvah counts or week percents). An earned badge and a record must therefore be stored when first reached, a new small persisted record (badge id, date earned; record value, dates), and its definitions ("שבוע מלא", "1,000 סימונים") decided once.

### Captures

375 points at 2x, Hebrew, from a temporary route in the Expo web build through headless Chrome, as in rounds 1 and 2; the route is deleted. Web only, so the Android font metrics and the sticky header's behaviour are unverified.

## Round 4: prototype (2026-10-27)

E with the owner's decisions of 2026-10-27, made live and animated so the owner can play with it: the temporary route `src/app/prototype-history.tsx`, opened at `http://localhost:8090/prototype-history` while the Expo web build runs (`?theme=dark`, `?tab=trends|achievements`, and `?reduce=1` to force reduced motion; a `?theme` stays in that browser's saved settings, so `?theme=gold` brings the light palette back). Same fixture as round 3. Captures (375 points at 2x, headless Chrome): [proto-summary-light.png](proto-summary-light.png), [proto-tab-switch-midframe.png](proto-tab-switch-midframe.png) (110 ms after pressing מגמות: the indicator has arrived, the 12-week bars are still growing in stagger), [proto-trends-selected-light.png](proto-trends-selected-light.png) (after tapping נח and שלישי), [proto-achievements-sheet-light.png](proto-achievements-sheet-light.png) (the "שבוע מלא" badge tapped) and [proto-trends-dark.png](proto-trends-dark.png).

### Owner decisions applied on top of E

- The hero (landscape, "שלום, אברהם", streak ring) stays above all three tabs; the switcher sticks once the hero scrolls away, and a tab change while scrolled below the hero keeps the scroll at the switcher.
- Charts run right to left; the weekday chart compares Sunday to Friday, Shabbat and Yom Tov in their own dashed row outside the comparison.
- Best streak and badges in הישגים; סיכום keeps one link row that switches to it.
- Each mitzvah's trend shows the two percents, "71% ← 83%" (previous 30 days → last 30 days), with the tick where it stood, and no change figure. The text is forced right to left: digits alone start a left-to-right paragraph on web and the arrow then pointed the wrong way.
- Reports: six weeks and a "שבועות קודמים" row.
- Badges: "שבוע מלא" is Sunday to Shabbat; "1,000 סימונים" is in "בדרך להישג הבא".

### Motion (emil-design-eng)

| What | How | Duration / easing |
|---|---|---|
| Streak ring | arc fills from 0, the number counts up from the same value | 900 ms, ease-out `(0.23, 1, 0.32, 1)` |
| Period rings | same, percent and count in sync | 700 ms each, 90 ms stagger |
| Bars (12 weeks, weekday, per mitzvah, trend, report mini bars, next badge) | `scaleY` from the bottom / `scaleX` from the start edge, transform only | 360 ms ease-out, 25 ms stagger for the weeks, 35 ms for rows |
| Previous-period tick | fades in once its bar is half grown | 360 ms ease-out |
| Tab change | indicator slides; the new tab fades in and slides 12 points in the direction of travel (RTL-aware); the old one leaves at once | indicator 250 ms `(0.77, 0, 0.175, 1)`, fade 200 ms, slide 260 ms ease-out |
| Week bar / weekday tap | selects it: solid bar, its percent above it, a detail row (parasha or day, range, marked of decided, percent) cross-fades in | 160 ms fade |
| Earned badges | pop in from scale 0.9 with a light spring | spring damping 15, stiffness 260; opacity 180 ms; 70 ms stagger |
| Badge / next-badge tap | the shared `BottomSheet` with its description and date or progress | the sheet's own slide |
| Report rows, badges, next rows | press scale 0.97 | 100 ms in, 160 ms out, ease-out |
| Report row tap | a toast naming the report it would open (`report?week=<week end>`), no navigation: the real `/report` reads the empty prototype stores | in 200 ms ease-out, out 150 ms, shown 2.6 s |
| Replay | the "שוב" pill in the hero (prototype only) remounts the ring and the tab | — |
| Month calendar (replaced the 30-day grid) | cells scale from 0.85 and fade in, in reading order (the 1st first, at its weekday); today's outline lands last, from scale 1.15; a month switch slides the grid 12 points in the direction of travel (next month from the right, the previous from the left) and fades it in, without the cell stagger; cells and arrows press to 0.97 | 180 ms each, 17 ms stagger, 673 ms for 30 days; outline 260 ms; slide 260 ms / fade 200 ms ease-out |
| Calendar insight line | fades in and rises 6 points once the grid has settled, and again after a month switch | 220 ms ease-out |
| עקביות לפי מצווה | each bar grows from the start edge and its percent counts up in sync; the streak chip pops in with the badge spring after 70% of its bar | 360 ms ease-out, 35 ms between rows that come into view together |

The calendar, its insight line, each per-mitzvah row and the closing insight start only once half of them is on screen (`measureInWindow` on mount, on layout and on every scroll event), so content below the fold animates when it is scrolled to, never off screen; capture: [proto-summary-bars-mid.png](proto-summary-bars-mid.png) (the last rows still counting, their chips mid-pop; the strong ease-out covers about 90% of the travel in the first third, so most rows already read final).

Rings and bars replay whenever their tab becomes active: the owner confirmed it on 2026-10-27.

Reduced motion (reanimated `useReducedMotion()`, or `?reduce=1`): every value is final on the first frame, no slide, no spring, no fade; checked at 60 ms after load (ring 12, rings 67%, 82%, 87%).

### Calendar: the current month (owner's feedback, 2026-10-27)

The 30-day grid became a month calendar: the Hebrew month (חשוון תשפ״ז, 30 days by `@hebcal/core`, 1 Cheshvan on Monday 12.10.2026, today 18 Cheshvan, Thursday 29.10), its civil range under the title, weekday headers א׳ to ש׳ with Sunday the right column, blank leading cells so the 1st sits on its weekday, the Hebrew day letters as the number and the civil day small under them, future days plain and disabled, today outlined in the text colour (a gold outline vanishes on a gold day). The arrows step back three months (to Av) and forward to the current month, where the next arrow is disabled. The month is Hebrew because the app is Hebrew-first and its headers already show the Hebrew date; showing the civil month instead is one function (`buildMonth()` in the route). The "חודשי" ring follows the current Hebrew month (the owner, 2026-10-27): "בחשוון עד היום", 113 of 130 (87%), which is the sum over the calendar's days 1 to 18, today included; the Shabbat still waiting for its check-in counts 0 of 0 until it is marked, and the shared line under the rings says so. When the arrows show an earlier month, the ring stays on the current month. The current week of the fixture (14 to 18 Cheshvan) is pinned to 31 of 38, so the weekly ring, the 12-week chart and the report row agree with the calendar.

- **Shades:** a day where everything was done is solid `gold`; a partly done day is `gold` over the page at 22%, 45% or 70% (under 40%, under 75%, the rest of its share); a day with nothing done is `surface2`; a holy day still waiting for its check-in is a dashed `gold` outline on the page. The legend shows הכל בוצע, the three partial steps as one swatch, כלום and ממתין לצ׳ק־אין. Each day number takes `text` or `onGold`, whichever reads better on its fill: measured in the page, the lowest is 6.88:1 on gold (light) and 4.70:1 on the 70% step (dark); `surface2` with `textSub` is 4.91:1. Future days are disabled and use `textMuted`.
- **Day sheet:** every past day and today opens the app's `BottomSheet`: a Shabbat or Yom Tov pill (candles icon, "שבת · פרשת לך־לך", the chag name from hebcal), the weekday and Hebrew date, the civil date with "X מתוך Y בוצעו", then each mitzvah of the day in time order with its state: בוצע with the time marked (or "סומן בצ׳ק־אין" on a holy day), לא בוצע, דילגת, ממתין לסימון אחרי שבת / החג, and for today פתוח עכשיו or עוד לא הגיע זמנה. Tefillin and Chok LeYisrael are left out on holy days. "לפרטים מלאים" closes the sheet and shows a toast naming `/day/<date>`.
- **Fixture:** each day's marks are seeded from its date, so a day reads the same on every load and its cell matches its sheet. Today is 4 of 6, with Mincha and Chok LeYisrael open and Maariv and the bedtime Shema still ahead. Shabbat 13 Cheshvan (24.10) is shown as still waiting for its check-in, so its look can be judged: under the real rule that check-in closed at alot on Monday.
- Captures: [proto-calendar-month-light.png](proto-calendar-month-light.png), [proto-calendar-month-dark.png](proto-calendar-month-dark.png), [proto-calendar-day-sheet-light.png](proto-calendar-day-sheet-light.png) (today), [proto-calendar-shabbat-sheet-light.png](proto-calendar-shabbat-sheet-light.png) (the waiting Shabbat), [proto-calendar-previous-light.png](proto-calendar-previous-light.png) (Tishrei, after the previous arrow).

### Checks run

- Headless Chrome at 375 points: the ring reads 4 at 60 ms and 12 when settled, the period rings settle on 67% 4/6, 82% 31/38, 87% 113/130 (the month ring equals the calendar's sum, checked in the page), every bar ends at scale 1, the week and weekday detail rows follow the tap, the current percent sits left of the previous one, the badge sheet opens with its text. Final frames match round 3 apart from the decisions above.
- `tsc --noEmit` and ESLint: no findings in the route. `routes.test.ts` fails on the extra route, as the smoke and guide suites will: no prototype exemption exists, so the route is deleted before the batch is committed.

### Not verified / web-only notes

- Web only: Android and iOS were not run. The rings redraw from React state on each frame (simple and works on web); the build should drive the arc with `useAnimatedProps` on the UI thread.
- On web `start` positions resolve to the left even in Hebrew, so the indicator uses `right: 0` on web and `start: 0` on native, and bar origins are physical (`right` in Hebrew); both need a check on a device with `forceRTL`.
- The 12 week bars are about 23 points wide, under the 48 dp target; the build should make the whole chart a scrub area or widen the hit slop.
- The production build should give the shared `SegmentedControl` the sliding indicator and `StreakRing` an animated / percent mode, never keep local copies as this prototype does.
