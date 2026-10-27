# SPEC — Build the History tab (task "Build the chosen history design", not-close.md)

## 0. Decisions this spec makes on top of the owner's Decided line (veto before dispatch)
- D1. **Trend arrow.** "71% ← 83%" is drawn as two `Text`s around a `MitzvahIcon` `forwardIcon(language)` (12 pt, `textSub`). The `←` glyph fails `designSystem.test.ts` ("no file draws the ← glyph"). The prototype already fails that suite today.
- D2. **A skip counts as decided-not-done** in every number, as `judgeDay()` already counts it (missed). The day sheet still labels it "דילגת". The prototype left skips out of the denominator; this keeps history, the report and the per-mitzvah percents on one rule.
- D3. **What a period ring counts.** Day, week and month rings use `done / due`, where `due` = done + missed + skipped + open now. Items waiting for a check-in and items not started yet ("later") are excluded. This is the prototype's arithmetic (4/6 today, with open items counted).
- D4. **Calendar month arrows are `HeaderPill`s** (icon-only, the shared component the schedule and the taharah calendar use). The prototype's local `NavArrow` is not kept.
- D5. **Badges and records are folded when the History screen computes**, not at store hydrate. The store cannot import the judging utils (`historyStats.ts` imports the store, so that would be a cycle), and judging 400 days at launch is too costly.
- The earned day of every badge comes from the data (the day it was reached), so evaluating later loses nothing inside the 400-day retention window.
- The first evaluation is the seed, built from the kept history.
- D6. **Mark totals survive pruning.** A new persisted `archivedMarks` counts the marks that retention prunes, each day once, so the 100 and 1,000 badges keep their totals after 400 days.

## 1. Goal
The History tab becomes the owner's prototype built on real data: a hero (greeting, animated streak ring) above a sticky three-tab switcher (סיכום | מגמות | הישגים).
- סיכום: period rings, a Hebrew-month calendar with a day sheet, per-mitzvah consistency.
- מגמות: 12 weeks, the weekday chart, per-mitzvah trend, weekly reports.
- הישגים: badges, next badges, records, per-mitzvah records.

Earned badges and lifetime records persist in the completions store, ride the backup file and are cleared by the reset. A later unmark never removes them.

## 2. Ownership
Every executor runs in the same working tree.
- **A and B run in parallel. C starts only after A and B have both reported green.**
- he.json and en.json are B's in phase 1 (add every key) and C's in phase 2 (delete four keys).
- Root `AGENTS.md` is C's only.
- Anything not listed below is off limits.

**Executor A — data, store, tests**
- CHANGED `src/utils/historyStats.ts` — `judgeDayItems`, `verdictOf`, `createDayJudge`; `judgeDay` derives from them; `computeStats` takes an optional judge.
- NEW `src/utils/historyTrends.ts` — tallies, periods, calendar month, week series, weekday chart, trends, insights, Hebrew labels, `formatCount`.
- NEW `src/utils/badges.ts` — badge kinds, mark totals and mark badges, `foldAchievements`, `nextBadges`, `earnedBadgeList`.
- CHANGED `src/stores/useCompletionsStore.ts` — types, the `achievements` and `archivedMarks` fields, `saveAchievements`, `mergeAchievements`, `archiveMarkCounts`, merge, reset.
- CHANGED `src/utils/__tests__/historyStats.test.ts`
- NEW `src/utils/__tests__/historyTrends.test.ts`
- NEW `src/utils/__tests__/badges.test.ts`
- NEW `src/stores/__tests__/achievements.test.ts`
- CHANGED `src/services/__tests__/BackupService.test.ts`
- CHANGED `src/services/__tests__/AppResetService.test.ts`
- CHANGED `src/utils/AGENTS.md`, `src/stores/AGENTS.md`

**Executor B — shared components, hooks, tokens, i18n keys**
- CHANGED `src/components/StreakRing.tsx` — `animate` and `percent` modes.
- CHANGED `src/components/SegmentedControl.tsx` — optional `animated` sliding indicator.
- NEW `src/components/ProgressBar.tsx` — the animated horizontal bar.
- CHANGED `src/components/TimeField.tsx` — uses `useRowMirrored()` instead of its inline expression (line 59).
- NEW `src/hooks/useMotion.ts`, NEW `src/hooks/useRowMirrored.ts`
- CHANGED `src/theme/tokens.ts` (`motion`), CHANGED `src/theme/colors.ts` (`blendHex`, `contrastRatio`, `readableOn`)
- CHANGED `src/components/__tests__/StreakRing.render.test.tsx`, `SegmentedControl.render.test.tsx`; NEW `src/components/__tests__/ProgressBar.render.test.tsx`; NEW `src/theme/__tests__/colorMath.test.ts`
- CHANGED `src/i18n/he.json`, `src/i18n/en.json` — add every key in §5, delete none.
- CHANGED `src/components/AGENTS.md`, `src/hooks/AGENTS.md`, `src/theme/AGENTS.md`

**Executor C — screen, guide, docs, prototype removal**
- CHANGED `src/app/(tabs)/history.tsx` — full rewrite.
- CHANGED `src/app/__tests__/history.render.test.tsx`, `history.focus.render.test.tsx`
- CHANGED `src/app/__tests__/screens.smoke.render.test.tsx` — only the `(tabs)/history` case's `check`.
- CHANGED `src/i18n/he.json`, `src/i18n/en.json` — delete `history.gridTitle`, `history.missedYesterday`, `history.noMissedYesterday`, `report.open`.
- CHANGED `src/data/guide.ts`; REGENERATED `docs/guide/index.html` and `docs/guide/en/index.html` (via `pnpm guide:build` only).
- DELETED `src/app/prototype-history.tsx` — last step, after reading it.
- CHANGED root `AGENTS.md`, `src/app/(tabs)/AGENTS.md`, `src/app/AGENTS.md`

## 3. Contracts

### 3A. Executor A

**`src/utils/historyStats.ts`** (mirror the existing file's style)
```ts
export type JudgedState = 'done' | 'missed' | 'skipped' | 'waiting' | 'open' | 'later';
export type JudgedItem = {
id: string;
state: JudgedState;
window: { start: Date; end: Date };
markedAt: number | null;   // completions[key][id] for done, skipped[key][id] for skipped, else null
inCheckIn: boolean;        // see judgeDayItems
};
export type JudgedDay = { key: string; items: JudgedItem[] };
export type DayJudge = (day: Date) => JudgedDay;

export function judgeDayItems(day: Date, input: HistoryInput, now: Date, opts?: { checkInFlags?: boolean }): JudgedDay;
export function verdictOf(judged: JudgedDay): DayVerdict;
export function judgeDay(day: Date, input: HistoryInput, now: Date): DayVerdict; // = verdictOf(judgeDayItems(day, input, now))
export function createDayJudge(input: HistoryInput, now: Date): DayJudge;       // memo by dateKey(day)
```

`judgeDayItems` is today's `judgeDay` loop (lines 43–78) with these changes:
- Each kept mitzvah becomes one item, in `input.mitzvot` order. A mark → `done`. A skip → `skipped`.
- Inside a block: `checkInPending(...)` → `waiting`, else `missed`.
- Outside a block: `open` (the existing condition) → `now >= window.start ? 'open' : 'later'`, else `missed`.
- The block stays looked up lazily, exactly as now.
- `inCheckIn`:
- true for `waiting`;
- for a `done` item, true only when `opts?.checkInFlags` and `waitsInCheckIn(mitzvah, window, blockForDay(day, location))` holds (with a non-null block);
- false otherwise.

`verdictOf`:
- `done` ← done
- `missed` ← missed and skipped
- `pending` ← waiting, open and later

Keep item order. Every existing `historyStats`, `weeklyReport` and `skipRules` test must stay green unchanged.

`computeStats` signature becomes:
```ts
export function computeStats(mitzvot, completions, location, settings, daysBack = 30, now = new Date(),
extra: Pick<HistoryInput, 'checkIns' | 'archivedDays' | 'skipped' | 'enabledSince'> & { judge?: DayJudge } = {}): HistoryStats
```
It uses `verdictOf((extra.judge ?? ((d) => judgeDayItems(d, input, now)))(day))` per day. Its streak call passes the same judge through `verdictOf`. `HistoryStats` is unchanged (`missedYesterday` stays).

**`src/stores/useCompletionsStore.ts`** — new exports:
```ts
export type BadgeId = 'streak7' | 'streak30' | 'streak100' | 'streak365' | 'fullWeek' | 'fullMonth' | 'thousandMarks' | `hundred:${string}`;
export type StreakRun = { days: number; from: string | null; to: string | null };
export type DayRange = { days: number; from: string; to: string };
export type BestWeek = { weekStart: string; weekEnd: string; done: number; due: number; percent: number };
export type AchievementFold = { through: string; run: StreakRun; mitzvahRuns: Record<string, StreakRun> };
export type Achievements = {
badges: Partial<Record<BadgeId, string>>;   // date key of the app day each was reached
bestStreak: DayRange | null;
bestWeek: BestWeek | null;
mitzvahBest: Record<string, DayRange>;
fold: AchievementFold | null;
};
export type MarkCounts = { lastKey: string | null; total: number; byMitzvah: Record<string, number> };
export const EMPTY_MARK_COUNTS: MarkCounts; // { lastKey: null, total: 0, byMitzvah: {} } (frozen)
export function mergeAchievements(prev: Achievements | null, next: Achievements): Achievements;
export function archiveMarkCounts(counts: MarkCounts, completions: Completions, today?: Date): MarkCounts;
```

State gains:
- `achievements: Achievements | null` (default `null`)
- `archivedMarks: MarkCounts` (default `EMPTY_MARK_COUNTS`)
- `saveAchievements: (next: Achievements) => void`

`mergeAchievements`:
- `badges`: the union. Keep prev's date when both have one.
- `bestStreak`: the larger `days` wins; a tie keeps prev; null loses.
- `bestWeek`: the higher `percent` wins, then the higher `due`; a tie keeps prev.
- `mitzvahBest`: per id, as for `bestStreak`.
- `fold`: always next's.

`saveAchievements`: `set((s) => { const merged = mergeAchievements(s.achievements, next); return JSON.stringify(merged) === JSON.stringify(s.achievements) ? s : { achievements: merged }; })`. It queues no scheduler call.

`archiveMarkCounts`:
- With the same cutoff as `retentionCutoffKey`, it counts every day `key < cutoff` and (`lastKey === null` or `key > lastKey`):
- `total += Object.keys(day).length`, and `byMitzvah[id] += 1` per id;
- `lastKey` = the max key counted.
- When nothing is counted it returns the same `counts` reference. Because of `lastKey`, a re-hydrate of an unrewritten payload never counts a day twice.

`merge`: add `archivedMarks: archiveMarkCounts(saved?.archivedMarks ?? EMPTY_MARK_COUNTS, completions)`, computed before `pruneCompletions`, on the same `completions` variable. `achievements` comes through `...saved` (absent → `null` from `current`). No `STORE_VERSION` change.

`reset()` also sets `achievements: null` and `archivedMarks: EMPTY_MARK_COUNTS`.

**`src/utils/historyTrends.ts`** (pure; imports only utils, services, data and store types, like `weeklyReport.ts`)
```ts
export type DayTally = { key: string; done: number; due: number; waiting: number; later: number };
export function tallyOf(judged: JudgedDay): DayTally; // due = done+missed+skipped+open
export type PeriodTally = { done: number; due: number; percent: number | null }; // percent = due>0 ? Math.round(done/due*100) : null
export type PeriodPercents = { day: PeriodTally; week: PeriodTally; month: PeriodTally };
export function periodPercents(input: HistoryInput, now: Date, judge: DayJudge): PeriodPercents;
```
- `today = appDay(now, location)`.
- day = today.
- week = `addDays(today, -today.getDay())` … today.
- month = `new HDate(1, hd.getMonth(), hd.getFullYear()).greg()` … today, with `hd = new HDate(today)`.
- Waiting and later items are excluded through `due`.

```ts
export type CalendarLevel = 'full' | 'p3' | 'p2' | 'p1' | 'none' | 'waiting' | 'empty' | 'future';
export type CalendarCell = { key: string; date: Date; hebrewDay: number; civilDay: number; weekday: number;
level: CalendarLevel; today: boolean; holy: boolean; done: number; due: number; waiting: number };
export type CalendarMonth = { startKey: string; title: { he: string; en: string }; monthName: { he: string; en: string };
civilRange: string; leading: number; days: CalendarCell[]; past: number; marked: number; isCurrent: boolean;
previousStartKey: string | null; nextStartKey: string | null };
export function calendarMonth(startKey: string | null, input: HistoryInput, now: Date, judge: DayJudge): CalendarMonth;
```
- `startKey` null means the month of `appDay(now)`.
- Level, first that applies:
1. date > today → `future` (not judged)
2. waiting > 0 → `waiting`
3. due === 0 → `empty`
4. done === 0 → `none`
5. done === due → `full`
6. share < 0.4 → `p1`; < 0.75 → `p2`; else `p3`
- `holy` = `HebcalService.isHolyDay(locationNoon(date, location), location)`. `leading` = `days[0].weekday`.
- `past` = cells not in {future, waiting, empty}. `marked` = those with done > 0.
- `title` = he `"<monthName.he> <gematriya(year % 1000)>"`, en `"<monthName.en> <year>"`. `monthName` = `roshChodeshLabel(hd, 'he' | 'en')` from `@/data/roshChodesh`.
- `civilRange` = `"d.M–d.M.yyyy"` from the first and last civil days, numeric only.
- `previousStartKey` = the previous month's start when that month's last day ≥ `addDays(today, -RETENTION_DAYS)`, else null.
- `nextStartKey` = the next month's start when it is ≤ today's month start, else null. `isCurrent` = the month holds today.

```ts
export type WeekName = { kind: 'parasha' | 'festival'; he: string; en: string };
export function weekName(saturday: Date, location: Location): WeekName;
export type WeekPoint = { weekStart: string; weekEnd: string; current: boolean; name: WeekName;
done: number; due: number; waiting: number; percent: number | null };
export function weekSeries(input: HistoryInput, now: Date, judge: DayJudge, count = 12): WeekPoint[]; // oldest first, current last
```
`weekName`:
- `hd = new HDate(saturday)`; `reading = getSedra(hd.getFullYear(), location.inIsrael).lookup(hd)`.
- Not `chag` → `parasha`: `chokWeekName(reading.parsha, 'he' | 'en')` from `@/utils/chok`.
- Else → `festival`: the first event of `HebrewCalendar.getHolidaysOnDate(hd, location.inIsrael)` whose flags include `flags.CHAG | flags.CHOL_HAMOED`. Name: `basename()` for en, `Locale.gettext(basename(), 'he-x-NoNikud')` for he. With no such event, use `reading.parsha[0]` the same way.

`weekSeries`:
- `lastEnd = weekEndOnOrBefore(today, location, now)`.
- Current: `weekStart` = `lastEnd ? addDays(lastEnd, 1) : addDays(today, -today.getDay())`, through today. Its `weekEnd` key = `addDays(today, 6 - today.getDay())`, and its name is that Saturday's.
- Then `count - 1` finished weeks back: `end = lastEnd`, `start = weekStartFor(end, …)`, next `end = previousWeekEnd(end, …)`, stopping at null. A finished week's name = `weekName(shabbatOf(end))`.
- Sums are over `tallyOf(judge(day))`. For a finished week, `done / due` equals `weekSummary()`'s done / (done + missed).

```ts
export type WeekdayChart = { days: { weekday: number; done: number; due: number; percent: number | null }[]; // weekday 0..5
holy: { done: number; due: number; percent: number | null } };
export function weekdayChart(weeks: WeekPoint[], input: HistoryInput, now: Date, judge: DayJudge): WeekdayChart;
```
- Days from `weeks[0].weekStart` through `addDays(today, -1)`. Today is excluded.
- A holy day (`isHolyDay`) goes to `holy`. Otherwise it goes to the bucket of `getDay()`; a non-holy Saturday also goes to `holy`.

```ts
export type MitzvahWindowStat = { done: number; eligible: number; percent: number };
export type MitzvahTrend = { id: string; current: MitzvahWindowStat; previous: MitzvahWindowStat | null };
export function mitzvahTrends(input: HistoryInput, now: Date, judge: DayJudge,
current: HistoryStats['perMitzvah']): MitzvahTrend[];
```
- `current` is `computeStats(...).perMitzvah` (the last 30 days).
- `previous` is the same rule over `addDays(today,-59)`…`addDays(today,-30)` via `verdictOf(judge(d))`: eligible = done + missed, `null` when eligible is 0.
- Rows only for `input.mitzvot` with `current.eligible > 0`.
- Order:
1. rows with `previous`, by `current.percent - previous.percent` descending;
2. then rows without `previous`, by `current.percent` descending;
3. ties by `input.mitzvot` order.

Insights (pure; `pooled(ws) = Math.round(Σdone / Σdue * 100)`):
```ts
export type WeeksInsight = { kind: 'bestLast'; percent: number; name: WeekName } | { kind: 'run'; weeks: number }
| { kind: 'rising'; percent: number; delta: number } | { kind: 'average'; percent: number } | null;
export function weeksInsight(weeks: WeekPoint[]): WeeksInsight;
```
`finished` = the non-current weeks with `percent !== null`, oldest → newest. None → null. Otherwise the first rule that fires:
1. `finished.length >= 2` and the last week's percent is greater than every other → `bestLast`.
2. Count back from the newest while percent ≥ 80; if the run is ≥ 3 → `run`.
3. `finished.length >= 8` and `pooled(last 4) - pooled(the 4 before) >= 5` → `rising{percent: pooled(last 4), delta}`.
4. `average{pooled(finished)}`.

```ts
export type WeekdayInsight = { kind: 'strong'; weekday: number; percent: number } | { kind: 'balanced'; min: number; max: number } | null;
export function weekdayInsight(chart: WeekdayChart): WeekdayInsight;
```
- Use the days with percent ≠ null; none → null.
- best = the highest percent (a tie goes to the lowest weekday). mean = `pooled` of those days.
- If `best - mean >= 5` → `strong`; else `balanced` with the min and max percent.

```ts
export type TrendInsight = { kind: 'rise'; id: string; delta: number; percent: number } | { kind: 'steady'; id: string; percent: number }
| { kind: 'average'; percent: number } | null;
export function trendInsight(trends: MitzvahTrend[]): TrendInsight;
```
Empty → null. Otherwise the first rule that fires:
1. The largest `current - previous` (rows with previous; a tie goes to the earlier row) when it is ≥ 5 → `rise`.
2. Among rows with previous and |delta| < 5, the highest current percent (a tie goes to the earlier row) → `steady`.
3. `average{Math.round(Σcurrent.done / Σcurrent.eligible * 100)}`.

A fall is never named.

```ts
export function leaderInsight(perMitzvah: HistoryStats['perMitzvah'], order: string[]): { id: string; percent: number } | null;
export function calendarInsight(month: CalendarMonth): { marked: number; past: number; current: boolean } | null; // past === 0 → null
```
`leaderInsight`: among ids in `order` with eligible > 0, the highest percent; a tie goes to the earlier id.

Labels:
```ts
export function hebrewDayLabel(key: string, language: 'he' | 'en', withYear: boolean): string;
export function hebrewRangeLabel(fromKey: string, toKey: string, language: 'he' | 'en'): string;
export function civilRangeLabel(fromKey: string, toKey: string, withYear: boolean): string; // "d.M–d.M" (+".yyyy" after the end)
export function holyDayName(day: Date, location: Location): { kind: 'shabbat'; name: WeekName } | { kind: 'yomTov'; he: string; en: string } | null;
export function formatCount(n: number): string; // digits grouped by "," every 3, no Intl
```
- `hebrewDayLabel`: he `` `${gematriya(d)} ב${roshChodeshLabel(hd,'he')}` `` plus `` ` ${gematriya(y % 1000)}` `` when withYear; en `` `${d} ${hd.getMonthName()}` `` plus `` ` ${y}` ``. `hd = new HDate(calendarDay(key))`.
- `hebrewRangeLabel`, same Hebrew month and year: he `` `${g(d1)}–${g(d2)} ב${month}` ``, en `` `${d1}–${d2} ${month}` ``. Otherwise `` `${hebrewDayLabel(from,l,false)}–${hebrewDayLabel(to,l,false)}` ``.
- `holyDayName`: null unless `isHolyDay`. A Saturday → `shabbat` with `weekName(day)`. Otherwise the festival as in `weekName`'s festival branch.

**`src/utils/badges.ts`**
```ts
export const STREAK_BADGE_DAYS = [7, 30, 100, 365] as const;
export const FOLD_LAG_DAYS = 7;
export const WEEK_RESCAN_DAYS = 14;
export type BadgeKind = { kind: 'streak'; days: 7 | 30 | 100 | 365 } | { kind: 'fullWeek' } | { kind: 'fullMonth' }
| { kind: 'thousand' } | { kind: 'hundred'; mitzvahId: string };
export function badgeKind(id: BadgeId): BadgeKind;
export type MarkTotals = { total: number; byMitzvah: Record<string, number> };
export function markTotals(completions: Completions, archived: MarkCounts): MarkTotals;
export function markBadges(completions: Completions, archived: MarkCounts): Partial<Record<BadgeId, string>>;
export type FoldResult = { next: Achievements; live: { run: StreakRun; mitzvahRuns: Record<string, StreakRun> } };
export function foldAchievements(input: HistoryInput, stored: Achievements | null, archived: MarkCounts,
heroStreak: number, now: Date, judge: DayJudge): FoldResult;
export type NextBadge = { id: BadgeId; done: number; goal: number };
export function nextBadges(achievements: Achievements | null, totals: MarkTotals, heroStreak: number, enabledIds: string[]): NextBadge[];
export function earnedBadgeList(achievements: Achievements | null): { id: BadgeId; on: string }[];
```

`markTotals` = archived plus each kept `(day, id)` entry.

`markBadges`:
- Walk kept days by key ascending with a running total starting at `archived.total`; `thousandMarks` = the key where the running total first reaches ≥ 1000.
- Per mitzvah the same way from `archived.byMitzvah[id]`; `hundred:<id>` at 100.
- A count already reached by the archive alone earns on the earliest kept key, or on `appDay` today's key when nothing is kept.

`foldAchievements` (all keys via `dateKey`; days are device-local midnights stepped with `addDays`):
- `earliest` = the min key of `completions` ∪ `skipped`. None → return `{ next: stored ?? empty, live: zero runs }`, where `empty` = `{ badges:{}, bestStreak:null, bestWeek:null, mitzvahBest:{}, fold:null }`.
- `floor` = `max(earliest, dateKey(addDays(today, -RETENTION_DAYS)))`.
- `start` = `fold ? max(nextDay(fold.through), floor) : floor`. The runs start from `fold.run` / `fold.mitzvahRuns`, or from zero runs when there is no fold or `nextDay(fold.through) < floor`.
- Walk every day D from `start` through today with `j = judge(D)` and `v = verdictOf(j)`.
- Overall run (the `computeStreak` rules, run forward):
- D has a completion or `isArchivedDay` → +1;
- else if `input.mitzvot` is empty → reset;
- else if `v.pending` has a non-`multiDay` id, or `v.missed` is empty → unchanged;
- else reset.
- Per-mitzvah runs: id in `v.done` → +1; id in `v.missed` → reset; else unchanged.
- On +1: `from ??= key` when days was 0, and `to = key`. Reset = `{0, null, null}`. After each day, raise `bestStreak` and `mitzvahBest` on a larger `days`.
- Badges while walking:
- `streakN` on the key where the overall run first reaches N.
- `fullWeek` on Saturday D when `addDays(D,-6) >= earliest` and the 7 days hold no waiting, open or later items, Σdue > 0 and Σ(missed + skipped) = 0.
- `fullMonth` on D when `new HDate(D).next().getDate() === 1`, the month's first day is ≥ `earliest`, and the same rules hold over the month's days.
- Days earlier than `start` come from `judge` too (the memo).
- Fold commit: `limit` = the earlier of `addDays(today, -FOLD_LAG_DAYS)` and the day before the first walked day with `v.pending.length > 0`. Snapshot the runs after processing `limit`, so `next.fold = { through: key(limit), run, mitzvahRuns }`. If `limit < start`, `next.fold = stored?.fold ?? null`.
- `heroStreak >= N` also earns `streakN` on `appDayKey(now)` when it is not already earned.
- Best week: over `weekSeries`-style finished weeks, walking back from `weekEndOnOrBefore(today)` while `weekEnd >= weeksFrom`, where `weeksFrom` = `stored?.fold ? addDays(fold.through, -WEEK_RESCAN_DAYS) : earliest`. A week counts with no waiting items and due > 0. Keep the one with the highest percent, then the highest due.
- `next` = `{ badges: {...walkBadges, ...markBadges()}, bestStreak, bestWeek, mitzvahBest, fold }`. The store merges it with the stored value.
- `live` = the runs after today.

`nextBadges`, in this order, each only when not earned, at most 3:
1. `hundred:<id>` for the enabled id with the most marks (≥ 1; a tie goes to the earlier id), `done` = its marks, `goal` = 100.
2. `thousandMarks` with `{ total, 1000 }`.
3. The smallest unearned `streakN` with `done = Math.min(heroStreak, N)`, `goal = N`.

`earnedBadgeList`: by `on` ascending. A tie follows the order streak7, streak30, streak100, streak365, fullWeek, fullMonth, thousandMarks, then `hundred:*` by id.

### 3B. Executor B

**`src/theme/tokens.ts`** — add:
```ts
export const motion = {
easeOut: [0.23, 1, 0.32, 1], easeInOut: [0.77, 0, 0.175, 1],
streakRingMs: 900, periodRingMs: 700, periodRingStagger: 90, barMs: 360, weekBarStagger: 25, rowBarStagger: 35,
tabFadeMs: 200, tabSlideMs: 260, tabShift: 12, indicatorMs: 250, pressInMs: 100, pressOutMs: 160, pressScale: 0.97,
badgeStagger: 70, badgeSpring: { damping: 15, stiffness: 260, mass: 1 }, badgeFadeMs: 180, badgeFrom: 0.9,
detailFadeMs: 160, gridCellMs: 180, gridCellFrom: 0.85, calCellStagger: 17, todayRingMs: 260, todayRingFrom: 1.15,
lineMs: 220, lineShift: 6, chipFrom: 0.9, visibleShare: 0.5, batchWindowMs: 150,
} as const;
```
Distances stay unscaled, per `src/components/AGENTS.md`.

**`src/theme/colors.ts`** — add, ported from `prototype-history.tsx:842-870`:
- `blendHex(top, bottom, share): string` — channel = `round(top*share + bottom*(1-share))`, lowercase `#rrggbb`.
- `contrastRatio(a, b): number` — WCAG.
- `readableOn(fill, candidates): string` — the highest contrast.

**`src/hooks/useRowMirrored.ts`**
```ts
export function useRowMirrored(): boolean; // Platform.OS === 'web' ? useI18n().language === 'he' : I18nManager.isRTL
```

**`src/hooks/useMotion.ts`**
```ts
export function useReduceMotion(): boolean;            // reanimated useReducedMotion()
export function useEntrance(delay: number, duration: number, active = true, playKey: unknown = 0): SharedValue<number>;
export function useCountUp(progress: SharedValue<number>, target: number): number;
export function usePressScale(): { style: AnimatedStyle; onPressIn: () => void; onPressOut: () => void };
export const EASE_OUT: EasingFunction; export const EASE_IN_OUT: EasingFunction; // Easing.bezier(...motion.easeOut / easeInOut)
```
- `useEntrance` mirrors `prototype-history.tsx:509-521`; reduced motion → 1 at once; it re-runs on `playKey`, `active`, `delay` and `duration`.
- `useCountUp` is `Math.round(target*progress)` through `useAnimatedReaction` + `scheduleOnRN(setState)` only when the integer changes; under reduced motion it returns `target`.
- `usePressScale` = `prototype-history.tsx:536-547`.

**`src/components/StreakRing.tsx`**
```ts
type Common = { size?: number; animate?: boolean; delay?: number; playKey?: unknown };
type Props = Common & ({ streak: number; percent?: undefined } | { percent: { done: number; total: number }; streak?: undefined });
```
- Streak mode is the current drawing and labels, with stroke 0.055.
- Percent mode: stroke `Math.round(size*0.075)`; centre `${p}%` (Heebo black, size×0.26, lineHeight size×0.30) over `typography.small` `textSub` `${done}/${total}`.
- With total 0 the arc is empty and the centre reads `history.percentNone`.
- `accessibilityLabel`: `history.ring.percentLabel` `{percent, done, total}`, or `history.ring.empty` when total is 0.
- The arc is an `Animated.createAnimatedComponent(Circle)` driven by `useAnimatedProps(() => ({ strokeDashoffset: c*(1 - fraction*progress.value) }))`. `progress` = `useEntrance(delay ?? 0, streak ? motion.streakRingMs : motion.periodRingMs, true, playKey)` when `animate`, else 1. The number uses `useCountUp`.
- The accessibility label always carries the final value.
- Default `animate=false`, so today's look is unchanged.

**`src/components/SegmentedControl.tsx`** — add `animated?: boolean` (default false). Without it, behaviour and styles stay byte-identical.

With `animated`:
- The track measures its width (`onLayout`). Behind the options sits an `absoluteFill` row of `surface2` cells (same gap and radius).
- `segment = (w - spacing.xs*(n-1))/n`, `step = segment + spacing.xs`.
- An absolute `Animated.View` (testID `segmented-indicator`): `top:0`, `bottom:0`, `width: segment`, `gold`, `radius.md`.
- Edge: on web `mirrored ? { right: 0 } : { left: 0 }`, on native `{ start: 0 }`.
- `translateX = (mirrored ? -1 : 1) * index * step` via `withTiming(motion.indicatorMs, EASE_IN_OUT)`; instant under reduced motion or before the first measure.
- `mirrored` = `useRowMirrored()`.
- Option `Pressable`s are transparent; labels keep `onGold` / `text`. The radio accessibility is unchanged.

**`src/components/ProgressBar.tsx`**
```ts
type Props = { percent: number; height?: number; opacity?: number; dashed?: boolean; tick?: number | null;
delay?: number; active?: boolean; playKey?: unknown; testID?: string };
```
- `surface2` track (`radius.full`, `overflow:'hidden'`, `alignItems:'flex-start'`), height default `scaled(6)`.
- Fill width `${clamp(0,100)}%` with `testID` on the fill, `radius.full`.
- `dashed` → 1.5 `gold` dashed border and no fill; otherwise `gold` at `opacity`.
- `transformOrigin: mirrored ? 'right' : 'left'`; `scaleX` = `useEntrance(delay, motion.barMs, active, playKey)`.
- `tick` (a percent): a layer as in `prototype-history.tsx:1477-1487 / 2004-2016`, 2×`scaled(14)` in `text`, fading in with `useEntrance(delay + motion.barMs/2, motion.barMs, active, playKey)`.

### 3C. Executor C — `src/app/(tabs)/history.tsx`

Mirror the prototype's structure (`prototype-history.tsx`), with these replacements:
- real data;
- i18n keys from §5;
- shared pieces: `StreakRing animate`, `SegmentedControl animated`, `ProgressBar`, `useEntrance` / `usePressScale` / `useCountUp` / `useReduceMotion`, `useRowMirrored`, `motion`, `blendHex` / `readableOn`.

Remove: the replay pill, the toasts, the `?theme` / `?tab` / `?reduce` params, the local `RingArc`, `PercentRing`, `Bar`, `SlidingTabs`, `NavArrow` and color math.

Layout:
- `SafeAreaView` (top), then a `ScrollView` (ref, `stickyHeaderIndices={[1]}`, `onScroll` throttle 16 feeding a local `ScrollBus` and `scrollY`). Children:
1. Hero: height `scaled(360)`, full-bleed `Landscape height={HERO_HEIGHT}`.
   - `NavBar title={greeting} subtitle={dateLine}`, where `greeting` = `history.greeting {name}` (the first word of `profileName.trim()`) or `history.greetingNeutral`, and `dateLine` = `${formatDate(today,'cccc',language)}, ${hebrewDayLabel(key,language,false)}`.
   - `StreakRing key={`ring-${playKey}-${ready}`} streak size={scaled(200)} animate`.
   - The goal caption (once ready, as today).
   - `history.streakExplain` (`small`, `textSub`, centred).
2. Switcher: a `View` on `bg` (padding as `prototype:1894`) with `accessibilityRole="radiogroup"`, labelled `history.tabs`, holding `SegmentedControl animated` with the three tabs.
3. Body (`paddingHorizontal: spacing.lg`): `SlideIn key={`${tab}-${playKey}`} from={enterFrom}`, where `SlideIn` = the prototype's `TabPane`.
   - Start shift = `enterFrom * motion.tabShift * (mirrored ? 1 : -1)`, with `enterFrom = Math.sign(toIndex - fromIndex)`.
- `changeTab`: when `scrollY > HERO_HEIGHT`, `requestAnimationFrame(() => scrollTo({ y: HERO_HEIGHT, animated: false }))`.
- `playKey` increments on every `useIsFocused()` false→true.
- Reduced motion (`useReduceMotion()`) → every value final on the first frame. `active`/in-view gates are ignored then.

Compute: the current effect shape (inputs list, `computedFor` ref, `afterPaint`, compute only while focused), with this task:
```ts
const now = new Date();
const input: HistoryInput = { mitzvot: enabled, completions, checkIns, archivedDays, skipped, enabledSince: enabledSinceOf(activeMap), location, settings };
const judge = createDayJudge(input, now);
const stats = computeStats(enabled, completions, location, settings, 30, now, { checkIns, archivedDays, skipped, enabledSince: input.enabledSince, judge });
const store = useCompletionsStore.getState();
const fold = foldAchievements(input, store.achievements, store.archivedMarks, stats.streak, now, judge);
store.saveAchievements(fold.next);
const weeks = weekSeries(input, now, judge);
const weekdays = weekdayChart(weeks, input, now, judge);
const view = { stats, live: fold.live, achievements: useCompletionsStore.getState().achievements,
totals: markTotals(completions, store.archivedMarks), periods: periodPercents(input, now, judge),
month: calendarMonth(null, input, now, judge), weeks, weekdays, trends: mitzvahTrends(input, now, judge, stats.perMitzvah) };
judgeRef.current = { judge, input, now };
```
- `achievements` and `archivedMarks` are not inputs of the effect.
- An earlier calendar month = `useMemo(() => monthStart ? calendarMonth(monthStart, judgeRef.current.input, judgeRef.current.now, judgeRef.current.judge) : view.month)`.
- Before ready, the body renders nothing.

סיכום:
- Three `StreakRing percent` rings (`scaled(100)`, `animate`, delays 0/90/180; testIDs `history-period-day|week|month`), each with label and caption:
- day: `history.period.day` / `.dayCaption`
- week: `history.period.week` / `.weekCaption`
- month: `history.period.month` / `.monthCaption {month}`
- `history.period.hint`.
- A `Card divided` with one `ListRow` (testID `history-achievements-link`, `star`, chevron) that switches to הישגים.
- title = `<count text> · <best text>` (best text left out when the best is 0);
- caption = `history.achievements.next {title, left}` of `nextBadges()[0]` (no caption when there is none).
- The calendar:
- a header row: `HeaderPill icon={backIcon(language)}` labelled `history.calendar.previous` (disabled without `previousStartKey`), title (`heading`) over `civilRange`, `HeaderPill icon={forwardIcon(language)}` labelled `history.calendar.next` (disabled when `isCurrent`);
- weekday letters via `formatDate(addDays(sunday,i),'ccc',language)`;
- a grid (testID `history-calendar`) of rows of 7 with blank leading cells.
- Each cell is a `Pressable` (testID `history-day-<key>`, disabled when `future`), labelled `<hebrewDayLabel(key,l,false)>, <d.M>, <cell summary>`. Fill and ink follow `prototype:876-902`, using `blendHex(gold,bg,share)` with shares 0.22 / 0.45 / 0.70 and `readableOn(fill,[text,onGold])`:
  - `empty` and `future` → `bg`; `waiting` → `bg` with a dashed `gold` border;
  - ink `textMuted` for future, `textSub` for none and empty;
  - today's outline in `text`.
- Motion: `prototype:922-933, 1087-1098`.
- The legend as `prototype:1065-1086`.
- The insight line.
- `history.perMitzvah` over `history.perMitzvahHint`, then a `Card divided` of today's rows:
- same filter and sort, each press → `/mitzvah/[id]`;
- a row = name, streak chip (`history.chip.streak {count}` from `live.mitzvahRuns[id]?.days ?? 0`, or `history.chip.none`), percent (count-up), `ProgressBar testID={`history-bar-${id}`}`;
- the new-mitzvah caption as today; the `history.empty` rule as today.
- The leader insight.

Day sheet:
- `BottomSheet` with the cell's `judgeDayItems(date, input, new Date(), { checkInFlags: true })`, its items sorted by `window.start`.
- The holy pill (`candles`, `goldLight`): `history.day.shabbat {name}` (name = `history.week.parasha` or `history.week.festival` with the `WeekName` in the UI language) or the yom-tov name.
- A `heading`: `formatDate(date,'cccc')`, `hebrewDayLabel(key,l,true)`.
- A `caption`: `d.M.yyyy · ` followed by one of `history.day.waiting` (`.once`), `history.day.nothingDue` (due 0), or `history.day.doneOf`.
- Rows: icon `iconFor`, `nameFor`, state chip per `prototype:1113-1146`:
- done → `doneInCheckIn` when `inCheckIn`, else `doneAt {time: clockOf(new Date(markedAt), location.tz)}`;
- waiting → `waitingShabbat` when the block kind is `shabbat`, else `waitingYomTov`.
- No items → `day.noItems`.
- `Button secondary icon="calendar" label=history.day.full` closes the sheet and pushes `{ pathname: '/day/[date]', params: { date: key } }`.

מגמות:
- `history.weeks.title` and `.hint`, then the chart (`prototype:1260-1386`):
- bars testID `history-week-<weekEnd>`; a week with null percent draws no bar and is not pressable;
- value labels on the selected and the current week;
- default selection = the best finished week (a tie goes to the newest), else the current one;
- `hitSlop {top: spacing.md, bottom: spacing.md, left: spacing.xs/2, right: spacing.xs/2}`;
- axis labels: the oldest week's name in the UI language and `history.weeks.nowLabel`;
- detail title `history.week.currentWithName {title}` / the week title; caption `history.weeks.detail` (+ `history.weeks.best` for the best week).
- The insight.
- `history.weekday.title`, the chart (`prototype:1388-1475`): rows `history-weekday-<n>` named by `formatDate(…,'cccc')`, plus `history-weekday-holy`, `history.weekday.holyNote`, detail. Then the insight.
- `history.trend.title` and `.hint`, rows `history-trend-<id>`:
- name;
- `[previous% or history.percentNone] [forwardIcon] [current% captionBold goldText]`;
- `ProgressBar tick={previous?.percent ?? null}`.
- The insight.
- `history.reports.title`, then a `Card divided`:
- the current week, then the 5 newest finished weeks with due > 0, newest first; rows `history-report-<weekEnd>` with press scale (`prototype:1520-1549`, `MitzvahIcon forwardIcon` chevron), each pushing `{ pathname: '/report', params: { week: weekEnd } }`;
- then, when the series holds an older finished week with due > 0, `ListRow` `history-report-older` (`calendar`, muted, chevron, `history.reports.older` / `.olderCaption {title}`) pushing that week.
- When every week's percent is null, `history.trends.empty` replaces the two charts and their insights.

הישגים:
- `SectionLabel history.badges.earned count={n}`: tiles in rows of 3 (pad the last row with empty `flex:1` views), each `history-badge-<id>` (`prototype:1590-1630`). The date is `hebrewDayLabel(on,l,true)`. With no badges, `history.badges.none`.
- `history.badges.next`: rows `history-next-<id>` (`prototype:1644-1666`); progress `history.badges.progress` via `formatCount`.
- `history.records.title`: `Card divided` with two `ListRow`s:
- `history-record-streak` (`star`, `history.streak`/`.once` with `max(bestStreak.days, live.run.days)`, caption `history.records.streakCaption` with `hebrewDayLabel(...,false)`);
- `history-record-week` (`calendar`, `history.records.weekTitle`, caption `history.records.weekCaption {title, range: hebrewRangeLabel}`);
- with neither, the `history.records.none` text.
- `history.records.perMitzvah`: rows `history-record-<id>` for enabled mitzvot with best > 0, by best descending:
- best = `max(mitzvahBest[id]?.days ?? 0, live.mitzvahRuns[id]?.days ?? 0)`;
- shows `history.records.now {count}` and `history.records.days` (`.once`).
- Badge sheet (`prototype:1691-1722`): `BottomSheet` with title and description from §5; earned shows `history.badges.earnedOn`, next shows the left text, a `ProgressBar` and the progress.
- Badge icons: streak7 / streak100 `star`, streak30 / streak365 `sparkle`, fullWeek `calendar`, fullMonth `moon`, thousandMarks `check`, hundred `iconFor(mitzvah.icon)`.

Below the fold (calendar, insights, per-mitzvah rows): animate when half of the element is on screen, using `useInView` with a `ScrollBus` context (`prototype:471-507, 822-840, 1220-1247`).

Constants, all through `scaled()`:
- `HERO_HEIGHT` 360, `RING_SIZE` 200, `PERIOD_RING` 100
- `WEEK_CHART_HEIGHT` 120, `WEEKDAY_BAR_HEIGHT` 10, `MINI_BAR_WIDTH` 56, `AXIS_GUTTER` 30
- `INSIGHT_ICON` 14, `BADGE_TILE` 52, `CAL_CELL_HEIGHT` 46, `WEEKDAY_NAME_WIDTH` 80
- `PERCENT_MIN_WIDTH` 36, `RECORD_VALUE_WIDTH` 56
- `MUTED_BAR_OPACITY` 0.45 (unscaled)

No `textAlign: 'left'`.

## 4. Data
- Store `completions-store` gains the optional fields `achievements` (`Achievements | null`) and `archivedMarks` (`MarkCounts`), with no `STORE_VERSION` bump.
- An older payload reads `null` and `EMPTY_MARK_COUNTS`.
- Both ride `createBackup()` / `restoreBackup()` unchanged (the whole persisted string); `BackupService.ts` is not edited.
- `reset()` clears both; `AppResetService.reset()` already calls it.
- Never lowered: badges, bestStreak, bestWeek and mitzvahBest only grow, through `mergeAchievements`.
- Not persisted: anything else computed by the screen.

## 5. i18n
B adds every key below to both files. C deletes `history.gridTitle`, `history.missedYesterday`, `history.noMissedYesterday` and `report.open`. No other key is added.

| key | he | en |
|---|---|---|
| history.greeting | שלום, %{name} | Hello, %{name} |
| history.greetingNeutral | שלום וברוכים הבאים | Hello and welcome |
| history.streakExplain | רצף = ימים רצופים שבכל אחד מהם סימנת לפחות מצווה אחת | Streak = days in a row with at least one mitzvah marked |
| history.tabs | תצוגות ההיסטוריה | History views |
| history.tab.summary | סיכום | Summary |
| history.tab.trends | מגמות | Trends |
| history.tab.achievements | הישגים | Achievements |
| history.period.day | יומי | Daily |
| history.period.dayCaption | מה שזמנו הגיע היום | What came due today |
| history.period.week | שבועי | Weekly |
| history.period.weekCaption | מיום ראשון עד עכשיו | Since Sunday |
| history.period.month | חודשי | Monthly |
| history.period.monthCaption | ב%{month} עד היום | In %{month} so far |
| history.period.hint | כל אחוז: מתוך המצוות שזמנן הגיע בתקופה, כמה סימנת כבוצעו. שבת או חג שממתינים לצ׳ק־אין עוד לא נספרים. | Each percent: of the mitzvot that came due in the period, how many you marked done. A Shabbat or Yom Tov waiting for its check-in is not counted yet. |
| history.ring.percentLabel | %{percent}%, %{done} מתוך %{total} | %{percent}%, %{done} of %{total} |
| history.ring.empty | עוד אין מצוות שזמנן הגיע | Nothing has come due yet |
| history.percentNone | — | — |
| history.achievements.count | %{count} הישגים | %{count} achievements |
| history.achievements.count.once | הישג אחד | 1 achievement |
| history.achievements.count.none | עוד אין הישגים | No achievements yet |
| history.achievements.best | השיא שלך %{count} ימים | Your best: %{count} days |
| history.achievements.best.once | השיא שלך יום אחד | Your best: 1 day |
| history.achievements.next | הבא בתור: %{title}, %{left} | Next up: %{title}, %{left} |
| history.calendar.previous | החודש הקודם | Previous month |
| history.calendar.next | החודש הבא | Next month |
| history.calendar.legend.full | הכל בוצע | All done |
| history.calendar.legend.partial | חלק | Part |
| history.calendar.legend.none | כלום | None |
| history.calendar.legend.waiting | ממתין לצ׳ק־אין | Waiting for check-in |
| history.calendar.cell.future | עוד לא הגיע | Not yet |
| history.calendar.cell.empty | אין מצוות | No mitzvot |
| history.calendar.cell.doneOf | %{done} מתוך %{due} בוצעו | %{done} of %{due} done |
| history.calendar.insightCurrent | ב־%{marked} מתוך %{past} הימים שעברו ב%{month} סימנת לפחות מצווה אחת | On %{marked} of the %{past} days so far in %{month} you marked at least one mitzvah |
| history.calendar.insightPast | ב־%{marked} מתוך %{past} ימי %{month} סימנת לפחות מצווה אחת | On %{marked} of the %{past} days of %{month} you marked at least one mitzvah |
| history.perMitzvahHint | האחוז: מהימים שזמן המצווה עבר בהם, בכמה סימנת אותה. הרצף: ימים רצופים שסימנת אותה. | The percent: of the days the mitzvah's time passed, how many you marked it. The streak: days in a row you marked it. |
| history.chip.streak | %{count} ברצף | %{count} in a row |
| history.chip.none | אין רצף | No streak |
| history.insight.leader | %{name} מובילה: %{percent}% ב־30 הימים האחרונים | %{name} leads: %{percent}% over the last 30 days |
| history.day.doneOf | %{done} מתוך %{due} בוצעו | %{done} of %{due} done |
| history.day.waiting | %{count} מצוות ממתינות לצ׳ק־אין | %{count} mitzvot waiting for the check-in |
| history.day.waiting.once | מצווה אחת ממתינה לצ׳ק־אין | 1 mitzvah waiting for the check-in |
| history.day.nothingDue | אין מצוות שזמנן הגיע ביום הזה | Nothing came due on this day |
| history.day.state.doneAt | בוצע · %{time} | Done · %{time} |
| history.day.state.doneInCheckIn | בוצע · סומן בצ׳ק־אין | Done · marked in the check-in |
| history.day.state.missed | לא בוצע | Not done |
| history.day.state.skipped | דילגת | Skipped |
| history.day.state.waitingShabbat | ממתין לסימון אחרי שבת | Waiting to be marked after Shabbat |
| history.day.state.waitingYomTov | ממתין לסימון אחרי החג | Waiting to be marked after Yom Tov |
| history.day.state.open | פתוח עכשיו | Open now |
| history.day.state.later | עוד לא הגיע זמנה | Not yet time |
| history.day.shabbat | שבת · %{name} | Shabbat · %{name} |
| history.day.full | לפרטים מלאים | Full details |
| history.day.itemLabel | %{name}: %{state} | %{name}: %{state} |
| history.week.parasha | פרשת %{name} | Parashat %{name} |
| history.week.festival | שבוע %{name} | %{name} week |
| history.week.current | השבוע (עד עכשיו) | This week (so far) |
| history.week.currentWithName | השבוע · %{title} | This week · %{title} |
| history.weeks.title | 12 השבועות האחרונים | The last 12 weeks |
| history.weeks.hint | לחיצה על עמודה מציגה את השבוע שלה | Tap a bar to see its week |
| history.weeks.nowLabel | השבוע, עד עכשיו | This week, so far |
| history.weeks.detail | %{range} · %{done} מתוך %{due} סימונים | %{range} · %{done} of %{due} marks |
| history.weeks.best | · הטוב ביותר | · the best |
| history.weeks.barLabel | %{title}, %{percent}% | %{title}, %{percent}% |
| history.insight.weeksBest | %{percent}% בשבוע של %{name}: השבוע הטוב ביותר ב־12 השבועות האחרונים | %{percent}% in the week of %{name}: the best of the last 12 weeks |
| history.insight.weeksRun | %{count} שבועות ברצף עם 80% ומעלה | %{count} weeks in a row at 80% or more |
| history.insight.weeksRising | 4 השבועות האחרונים: %{percent}% בממוצע, %{delta} נקודות מעל 4 השבועות שלפניהם | The last 4 weeks: %{percent}% on average, %{delta} points above the 4 before them |
| history.insight.weeksAverage | ממוצע 12 השבועות: %{percent}% | 12-week average: %{percent}% |
| history.weekday.title | היום החזק שלך בשבוע | Your strongest day of the week |
| history.weekday.holy | שבת וחג | Shabbat and Yom Tov |
| history.weekday.holyNote | שבת וחג נספרים לפי מה שסימנת בצ׳ק־אין אחריהם, ולכן מוצגים בנפרד ולא נכנסים להשוואה | Shabbat and Yom Tov count by what you marked in the check-in after them, so they are shown apart and left out of the comparison |
| history.weekday.holyDetail | שבת וחג, מחוץ להשוואה | Shabbat and Yom Tov, outside the comparison |
| history.weekday.detail | %{done} מתוך %{due} סימונים ב־12 השבועות האחרונים | %{done} of %{due} marks over the last 12 weeks |
| history.weekday.rowLabel | %{name} %{percent}% | %{name} %{percent}% |
| history.insight.weekdayStrong | %{day} הוא היום החזק שלך: %{percent}% ב־12 השבועות האחרונים | %{day} is your strongest day: %{percent}% over the last 12 weeks |
| history.insight.weekdayBalanced | הימים שלך מאוזנים: כולם בין %{min}% לבין %{max}% | Your days are balanced: all between %{min}% and %{max}% |
| history.trend.title | מגמה לפי מצווה | Trend by mitzvah |
| history.trend.hint | 30 הימים שלפני, ואחריהם 30 הימים האחרונים. הקו הדק: איפה המצווה עמדה אז. | The 30 days before, then the last 30 days. The thin line: where the mitzvah stood then. |
| history.trend.rowLabel | %{name}: %{previous}% ב־30 הימים שלפני, %{percent}% ב־30 הימים האחרונים | %{name}: %{previous}% in the 30 days before, %{percent}% in the last 30 days |
| history.trend.rowLabelNew | %{name}: %{percent}% ב־30 הימים האחרונים | %{name}: %{percent}% in the last 30 days |
| history.insight.trendRise | %{name} עלתה ב־%{delta} נקודות לעומת 30 הימים שלפני, והיא עכשיו על %{percent}% | %{name} rose %{delta} points over the 30 days before, and is now at %{percent}% |
| history.insight.trendSteady | %{name} נשארה על %{percent}% | %{name} held at %{percent}% |
| history.insight.trendAverage | ממוצע 30 הימים האחרונים: %{percent}% | Average over the last 30 days: %{percent}% |
| history.reports.title | דוחות שבועיים | Weekly reports |
| history.reports.caption | %{range} · %{done} מתוך %{due} | %{range} · %{done} of %{due} |
| history.reports.captionCurrent | %{title} · %{range} · %{done} מתוך %{due} | %{title} · %{range} · %{done} of %{due} |
| history.reports.older | שבועות קודמים | Earlier weeks |
| history.reports.olderCaption | %{title} והשבועות שלפניו | %{title} and the weeks before it |
| history.reports.rowLabel | %{title}, %{percent}% | %{title}, %{percent}% |
| history.trends.empty | המגמות יופיעו כאן אחרי השבוע הראשון | Trends appear here after your first week |
| history.badges.earned | הישגים שהשגת | Achievements earned |
| history.badges.none | עוד אין הישגים. הבא בתור מופיע כאן למטה. | No achievements yet. The next one is below. |
| history.badges.next | בדרך להישג הבא | On the way to the next one |
| history.badges.progress | %{done} מתוך %{goal} | %{done} of %{goal} |
| history.badges.earnedOn | הושג ב־%{date} | Earned on %{date} |
| history.badges.tileLabel | %{title}, %{date} | %{title}, %{date} |
| history.badges.nextLabel | %{title}, %{left} | %{title}, %{left} |
| history.badge.streak.title | %{count} ימים ברצף | %{count} days in a row |
| history.badge.streak.description | %{count} ימים רצופים שבכל אחד מהם סימנת לפחות מצווה אחת | %{count} days in a row, each with at least one mitzvah marked |
| history.badge.fullWeek.title | שבוע מלא | A full week |
| history.badge.fullWeek.description | כל מצווה שזמנה הגיע, מיום ראשון ועד שבת, סומנה כבוצעה | Every mitzvah that came due, from Sunday to Shabbat, was marked done |
| history.badge.fullMonth.title | חודש מלא | A full month |
| history.badge.fullMonth.description | כל מצווה שזמנה הגיע, בכל ימי חודש עברי אחד, סומנה כבוצעה | Every mitzvah that came due, on every day of one Hebrew month, was marked done |
| history.badge.thousand.title | 1,000 סימונים | 1,000 marks |
| history.badge.thousand.description | אלף סימונים של מצוות כבוצעו, מכל המצוות יחד, מאז שהתחלת | A thousand mitzvot marked done, all mitzvot together, since you started |
| history.badge.hundred.title | 100 פעמים %{name} | %{name} 100 times |
| history.badge.hundred.description | מאה ימים שבהם סימנת %{name} כבוצעה, לא חייבים ברצף | A hundred days you marked %{name} done, not necessarily in a row |
| history.badge.deletedMitzvah | מצווה שנמחקה | a deleted mitzvah |
| history.badge.left.days | עוד %{count} ימים | %{count} more days |
| history.badge.left.days.once | עוד יום אחד | 1 more day |
| history.badge.left.times | עוד %{count} פעמים | %{count} more times |
| history.badge.left.times.once | עוד פעם אחת | 1 more time |
| history.badge.left.marks | עוד %{count} סימונים | %{count} more marks |
| history.badge.left.marks.once | עוד סימון אחד | 1 more mark |
| history.records.title | שיאים אישיים | Personal records |
| history.records.streakCaption | הרצף הארוך ביותר: %{from} עד %{to} | Longest streak: %{from} to %{to} |
| history.records.weekTitle | %{percent}% בשבוע אחד | %{percent}% in one week |
| history.records.weekCaption | השבוע הטוב ביותר: %{title}, %{range} | Best week: %{title}, %{range} |
| history.records.none | השיאים יופיעו כאן אחרי הימים הראשונים | Your records appear here after your first days |
| history.records.perMitzvah | הרצף הארוך לכל מצווה | Longest streak per mitzvah |
| history.records.now | עכשיו %{count} | now %{count} |
| history.records.days | %{count} ימים | %{count} days |
| history.records.days.once | יום אחד | 1 day |
| history.records.rowLabel | %{name}: %{best}, %{now} | %{name}: %{best}, %{now} |

**Guide (C, `src/data/guide.ts`)**

In the `history` topic, replace body paragraph 1 with:
- he: "בלשונית היסטוריה, מעל שלוש לשוניות, מופיעים הרצף שלך וכמה ימים נשארו עד היעד הבא. ״סיכום״ מראה כמה סימנת היום, השבוע והחודש העברי, לוח של החודש העברי שבו כל יום צבוע לפי כמה ממנו בוצע (הקשה על יום מציגה את המצוות שלו), ועקביות ורצף לכל מצווה."
- en: "The History tab shows your streak and the days left to the next goal above three tabs. Summary shows how much you marked today, this week and this Hebrew month, a calendar of the Hebrew month where each day is shaded by how much of it was done (tap a day to see its mitzvot), and each mitzvah's consistency and streak."

Insert after paragraph 1:
- he: "״מגמות״ מציג את 12 השבועות האחרונים, היום החזק שלך בשבוע (שבת וחג בנפרד, כי הם נסמנים בצ׳ק־אין), איך כל מצווה השתנתה לעומת 30 הימים שלפני, ואת הדוחות השבועיים. ״הישגים״ שומר את ההישגים שהשגת ואת השיאים שלך, גם אחרי שההיסטוריה הישנה נמחקת."
- en: "Trends shows the last 12 weeks, your strongest day of the week (Shabbat and Yom Tov apart, since they are marked in the check-in), how each mitzvah changed from the 30 days before, and the weekly reports. Achievements keeps the badges you earned and your records, even after old history is cleared."

In the reports paragraph:
- he: replace "״דוחות״ פותח את הסיכום השבועי:" with "דוח שבועי נפתח מרשימת הדוחות בלשונית מגמות:"
- en: replace "Reports opens the weekly report:" with "A weekly report opens from the reports list in Trends:"
- Keep the rest of that paragraph, including "הגדרות ← מכשיר והתראות" (`guide.test.ts` pins it).

Add as the **first** item of the `'1.0.21-3'` `WHATS_NEW` entry:
- he: "לשונית היסטוריה חדשה: סיכום יומי, שבועי וחודשי, לוח של החודש העברי, מגמות של 12 שבועות והיום החזק שלך, הישגים ושיאים אישיים שנשמרים, והדוחות השבועיים בתוכה."
- en: "A new History tab: daily, weekly and monthly summaries, a Hebrew-month calendar, 12-week trends and your strongest day, achievements and personal records that are kept, and the weekly reports inside it."

Then run `pnpm guide:build`.

## 6. Tests
Fixture **F**, used throughout:
- Jerusalem (`CITIES[0]`), `inIsrael: true`, `ashkenaz`.
- Only `tefillin` enabled, with `enabledAt: at(J,'2026-10-11T00:00').getTime()`.
- `completions` holds `{ tefillin: 1 }` on 2026-10-11..16, 18, 19, 21, 22, 23, 25, 26, 27 (no 20th; Shabbatot 17 and 24 empty).
- `now = at(J,'2026-10-28T10:00')`, with `jest.useFakeTimers({ now, doNotFake: [...ONLY_DATE] })` as in `history.render.test.tsx`.

**A — `historyStats.test.ts`** (add)
- For F and for every existing fixture case in the file, `judgeDay(d, input, now)` equals `verdictOf(judgeDayItems(d, input, now))` for every day of 2026-10-01..2026-10-28.
- 2026-10-28 → tefillin `open`; at `at(J,'2026-10-28T04:00')` → `later`.
- A skip on 2026-10-27 → state `skipped`, its `markedAt` equal to the skip timestamp, and `verdictOf` places it in `missed`.

**A — `historyTrends.test.ts`** (F)
- `periodPercents` → day `{0,1,0}`, week `{3,4,75}`, month `{13,15,87}`.
- `calendarMonth(null)`:
- `startKey '2026-10-12'`, `leading 1`;
- levels: 2026-10-20 `none`; 2026-10-17 `empty`; 2026-10-16 `full`; 2026-10-28 `none` with `today: true`; 2026-10-29 `future`;
- `past 15`, `marked 13`; `title.he 'חשון תשפ״ז'`; `isCurrent true`; `nextStartKey null`.
- `calendarMonth('2026-09-12')` → `title.he 'תשרי תשפ״ז'`, and a cell 2026-10-11 `full`.
- `weekSeries` → length 12; last `{weekStart:'2026-10-25', weekEnd:'2026-10-31', current:true, done:3, due:4, percent:75, name:{kind:'parasha', he:'וירא', en:'Vayera'}}`.
- [10] `{'2026-10-18','2026-10-24', 5, 6, 83, he:'לך־לך', en:'Lech-Lecha'}`
- [9] `{'2026-10-11','2026-10-17', 6, 6, 100, he:'נח'}`
- [8] weekEnd `'2026-10-10'`, percent null
- [7] weekEnd `'2026-10-03'`, name `{festival, he:'שמיני עצרת', en:'Shmini Atzeret'}`
- [9] equals `weekSummary()`'s done / (done + missed) for the same range.
- `weekdayChart` → Sun `{3,3,100}`, Mon `{3,3,100}`, Tue `{2,3,67}`, Wed/Thu/Fri `{2,2,100}`, holy `{0,0,null}`.
- `weekdayInsight` → `{strong, weekday:0, percent:100}`.
- `mitzvahTrends` (with F's `computeStats().perMitzvah`) → `[{id:'tefillin', current:{done:14, eligible:15, percent:93}, previous:null}]`.
- `trendInsight` → `{average, percent:93}`.
- Synthetic weeksInsight, built from 12 `WeekPoint`s with only `percent`/`done`/`due` meaningful:
- percents [null×8, 70, 75, 90] plus current → `bestLast 90`;
- [.. 80, 85, 82] with an earlier max of 95 → `run 3`;
- eight finished weeks at 60, 60, 60, 60, 70, 70, 70, 70 (due 10 each), last not the max → `rising {percent:70, delta:10}`;
- [50, 60] → `average 55`.
- Synthetic trendInsight:
- `[{a 80←70}, {b 90←88}]` → `rise a delta 10`;
- `[{a 80←79}, {b 90←88}]` → `steady b 90`;
- `[{a 60←90}]` → `average 60`.
- `leaderInsight({tefillin:93/15, shacharit:93/10}, ['shacharit','tefillin'])` → shacharit.
- Labels:
- `hebrewDayLabel('2026-10-28','he',true)` → `'י״ז בחשון תשפ״ז'`
- `('2026-10-28','en',false)` → `'17 Cheshvan'`
- `hebrewRangeLabel('2026-10-18','2026-10-24','he')` → `'ז׳–י״ג בחשון'`
- `('2026-10-11','2026-10-17','he')` → `'ל׳ בתשרי–ו׳ בחשון'`
- `civilRangeLabel('2026-10-12','2026-11-09',true)` → `'12.10–9.11.2026'`
- `formatCount(1000)` → `'1,000'`, `formatCount(812)` → `'812'`
- `weekName(new Date(2027,3,24), J)` → `{festival, he:'פסח', en:'Pesach'}`

**A — `badges.test.ts`**
- F seed: `foldAchievements(input, null, EMPTY_MARK_COUNTS, 6, now, judge)`:
- `bestStreak {8,'2026-10-11','2026-10-19'}`, `mitzvahBest.tefillin` the same;
- `badges {streak7:'2026-10-18', fullWeek:'2026-10-17'}`, with no fullMonth;
- `bestWeek {'2026-10-11','2026-10-17',6,6,100}`;
- `fold {through:'2026-10-21', run:{1,'2026-10-21','2026-10-21'}}`;
- `live.run {6,'2026-10-21','2026-10-27'}`.
- Second run: add 2026-10-28 to the completions; `now = at(J,'2026-10-29T10:00')`; `stored` = the merged first result:
- `live.run.days 7`; `fold.through '2026-10-22'`; `bestStreak.days` stays 8.
- Unmark keeps: `mergeAchievements(first, foldAchievements(input without 2026-10-18 and 19, null, …).next).badges.streak7` → `'2026-10-18'`.
- `markBadges(F.completions, {lastKey:'2025-09-01', total:990, byMitzvah:{tefillin:95}})` → `{thousandMarks:'2026-10-22', 'hundred:tefillin':'2026-10-15'}`.
- `markTotals` → `{total:1004, byMitzvah:{tefillin:109}}`.
- `nextBadges(null, {total:812, byMitzvah:{tefillin:74, shacharit:50}}, 12, ['tefillin','shacharit'])` → `[hundred:tefillin 74/100, thousandMarks 812/1000, streak7 7/7]`. With `badges {streak7, streak30}` the last item is `streak100 12/100`.
- `earnedBadgeList({badges:{streak30:'2026-09-30', fullWeek:'2026-09-14', streak7:'2026-09-14'}})` → order `streak7, fullWeek, streak30`.
- Under `pnpm test:tz`, all the above give the same results in the four zones.

**A — `achievements.test.ts`**
- `saveAchievements` stores the merge; a second identical save leaves `getState().achievements` the same reference.
- `reset()` → `achievements null`, `archivedMarks` equal to `EMPTY_MARK_COUNTS`.
- `archiveMarkCounts(EMPTY, {'2025-01-01':{a:1,b:1}, '2025-01-02':{a:1}, '2026-11-15':{a:1}}, new Date(2026,10,15))` → `{lastKey:'2025-01-02', total:3, byMitzvah:{a:2,b:1}}`. Feeding that result back with the same completions returns the same reference.
- `mergeAchievements` cases:
- a lower bestStreak in next keeps prev;
- a badge only in prev is kept;
- a badge in both keeps prev's date;
- fold takes next's;
- bestWeek at equal percent with higher due wins.

**A — `BackupService.test.ts`**
In `restoreBackup`, add "carries the achievements and the archived mark counts":
- after `fillSource()`, `setState({ achievements: <F seed next>, archivedMarks: {lastKey:'2025-01-02', total:3, byMitzvah:{a:2,b:1}} })`;
- `createBackup`, `resetAll`, `restoreBackup`;
- both fields `toEqual` the originals.

**A — `AppResetService.test.ts`**
Add "clears the achievements and archived mark counts": `reset()` → `null` / `EMPTY_MARK_COUNTS`.

**B — tests**
- `StreakRing`: all existing cases pass unchanged.
- Percent mode `{done:4,total:6}` with reduced motion mocked:
```ts
jest.mock('react-native-reanimated', () => ({ ...jest.requireActual('react-native-reanimated'), useReducedMotion: jest.fn(() => true) }))
```
shows `67%` and `4/6`, labelled `'67%, 4 מתוך 6'`.
- `{done:0,total:0}` → `—`, labelled `history.ring.empty`.
- `animate` with reduced motion → the text `12` at once.
- `animate` without reduced motion → the label is `'12 ימים ברצף'` from the first render.
- `SegmentedControl`: all existing cases pass.
- `animated`: after `fireEvent(track,'layout',{nativeEvent:{layout:{width:300}}})`, `segmented-indicator` has `width (300-2*spacing.xs)/3` and `backgroundColor gold`;
- the radios have no `gold` background;
- selected / checked / aria-checked are as in the static mode.
- `ProgressBar`: the fill `testID` carries `width: '40%'` and `gold`; `dashed` → `borderStyle 'dashed'` and no `backgroundColor`; `percent 140` → `'100%'`; `tick 30` renders the tick layer, with `tick null` none; origin `'right'` in Hebrew and `'left'` in English (with `Platform.OS` web).
- `colorMath`:
- `blendHex('#000000','#ffffff',0.5)` → `'#808080'`
- `contrastRatio('#000000','#ffffff')` → 21
- `readableOn('#000000',['#111111','#ffffff'])` → `'#ffffff'`
- for every `THEMES` palette, `readableOn(blendHex(gold,bg,0.7),[text,onGold])` reaches ≥ 4.5 against that fill.
- `TimeField` suite unchanged and green.

**C — `history.render.test.tsx`** (F; reanimated `useReducedMotion` mocked true; `useRouter` mock with push)
- Hero: `findByText('שלום, אברהם')` with `profileName 'אברהם כהן'`; `'שלום וברוכים הבאים'` with an empty name; `getByLabelText('6 ימים ברצף')`; `'עוד יום אחד ליעד 7'`; `Landscape` height 360; `StreakRing` size 200; the explain line.
- Tabs: three radios. Pressing `מגמות` shows `'12 השבועות האחרונים'` and hides `history-calendar`.
- Summary:
- `history-period-month` labelled `'87%, 13 מתוך 15'`; week `'75%, 3 מתוך 4'`; day `'0%, 0 מתוך 1'`;
- the calendar has 17 + leading cells … `history-day-2026-10-16` background `THEMES.gold.gold`; `-20` `surface2`;
- pressing `history-day-2026-10-27` opens the sheet with `'יום שלישי, ט״ז בחשון תשפ״ז'` and the `בוצע · <time>` chip; `לפרטים מלאים` pushes `{pathname:'/day/[date]', params:{date:'2026-10-27'}}`;
- `history-day-2026-10-29` is disabled;
- the previous arrow shows `'תשרי תשפ״ז'`; next is disabled on the current month;
- insight `'ב־13 מתוך 15 הימים שעברו בחשון סימנת לפחות מצווה אחת'`;
- the per-mitzvah row `'הנחת תפילין, 93%'` with `history-bar-tefillin` width `'93%'` and the chip `'6 ברצף'`;
- the leader insight; the link row title `'2 הישגים · השיא שלך 8 ימים'`.
- Trends:
- `history-week-2026-10-17` exists; the detail shows `'פרשת נח'`;
- `history-weekday-0` labelled `'יום ראשון 100%'`;
- weekday insight `'יום ראשון הוא היום החזק שלך: 100% ב־12 השבועות האחרונים'`;
- `history-trend-tefillin`;
- `history-report-2026-10-24` press pushes `{pathname:'/report', params:{week:'2026-10-24'}}`;
- there is no `'דוחות'` pill.
- Achievements: tiles `history-badge-streak7` and `history-badge-fullWeek`; `history-next-thousandMarks`; `history-record-streak` caption `'הרצף הארוך ביותר: ל׳ בתשרי עד ח׳ בחשון'`; `history-record-tefillin`.
- Kept from today's suite, ported:
- the new-mitzvah caption and its ordering;
- the 50% case on 2026-10-29;
- the English new caption;
- the persisted achievements after the render (`useCompletionsStore.getState().achievements.badges.streak7 === '2026-10-18'`).

**C — `history.focus.render.test.tsx`**
- Both existing cases stay.
- Add: a `saveAchievements` spy is called once per compute; a focus after a save with no input change recomputes nothing.

**C — `screens.smoke.render.test.tsx`**
- The `(tabs)/history` case's `check` becomes `text('סיכום', 'Summary')`.

## 7. Verification
Each executor runs these in order and reports the output verbatim.

**A**
1. `pnpm typecheck` (exit 0)
2. `pnpm lint` (exit 0)
3. `pnpm test -- src/utils/__tests__/historyStats.test.ts src/utils/__tests__/historyTrends.test.ts src/utils/__tests__/badges.test.ts src/utils/__tests__/weeklyReport.test.ts src/utils/__tests__/skipRules.test.ts src/data/__tests__/customNightWindow.test.ts src/stores src/services/__tests__/BackupService.test.ts src/services/__tests__/AppResetService.test.ts`
4. `pnpm test:tz -- src/utils/__tests__/historyStats.test.ts src/utils/__tests__/historyTrends.test.ts src/utils/__tests__/badges.test.ts src/utils/__tests__/weeklyReport.test.ts`
5. `pnpm check:dox`

**B**
1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test -- src/components src/theme src/hooks src/i18n`
4. `pnpm check:dox`

**C** (after A and B)
1. `pnpm guide:build`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm format:check`
5. `pnpm check:dox`
6. `pnpm test`
7. `pnpm test:tz`

Every step exits 0.

**Known broken until C deletes `src/app/prototype-history.tsx`.** Verified 2026-10-27:
- `designSystem.test.ts`: "no file draws the ← glyph" and "every stack screen renders a ScreenHeader";
- `guide.test.ts`: the two screen-coverage cases;
- `screens.smoke.render.test.tsx`: a screen file without a case.

A and B do not run those suites; C must see them green.

Never run `npm config list` or `pnpm config list`.

## 8. Out of scope

**Do not touch:**
- `report.tsx`, `day/[date].tsx`, `computeStreak` semantics, `streakGoal.ts`, `Landscape.tsx`, `TimeRibbon.tsx`, `BackupService.ts`, `AppResetService.ts`;
- the notification planners, home, the siddur screens, `not-close.md` / `action-log.md` / `state.md` (the planner records these after review), `design/**`, `.claude/**`;
- every other `SegmentedControl` caller (do not pass `animated` anywhere but history).

**Docs to update**

A — `src/utils/AGENTS.md`:
- Extend the `historyStats.ts` bullet with: "`judgeDayItems()` is the one judging loop: each item `done`, `missed`, `skipped`, `waiting`, `open` or `later`, with its window and mark time; `judgeDay()` is `verdictOf()` of it; `createDayJudge()` memoizes by date key and `computeStats()` takes it as `extra.judge`."
- Add a [historyTrends.ts](historyTrends.ts) bullet (tallies with `due` = done + missed + skipped + open; periods; Hebrew-month calendar and levels; 12 report weeks named by parasha or festival; weekday chart with holy days apart; 30-vs-30 trends; the insight rules; Hebrew and civil labels).
- Add a [badges.ts](badges.ts) bullet (badge kinds; mark totals with the archived counts; the forward fold with `FOLD_LAG_DAYS` 7 and `WEEK_RESCAN_DAYS` 14; earned days come from the data; next badges).
- Add both suites to Verification with `pnpm test:tz`.

A — `src/stores/AGENTS.md`, completions bullet: append "`achievements` (badges by the day reached, longest streak, best week, each mitzvah's longest streak and the fold checkpoint; only ever raised, through `mergeAchievements()` / `saveAchievements()`) and `archivedMarks` (`archiveMarkCounts()`: the marks retention prunes, each day once by `lastKey`); `reset()` clears both."

B — `src/components/AGENTS.md`:
- `StreakRing`: the `percent`, `animate`, `delay` and `playKey` props; the arc on the UI thread through `useAnimatedProps`; the count-up.
- `SegmentedControl`: the optional `animated` indicator and its web / native edge rule.
- A new `ProgressBar` bullet.
- `TimeField`: reads `useRowMirrored()`.

B — `src/hooks/AGENTS.md`: bullets for `useMotion.ts` and `useRowMirrored.ts`.

B — `src/theme/AGENTS.md`: `motion` in `tokens.ts`; `blendHex` / `contrastRatio` / `readableOn` in `colors.ts`.

C — `src/app/(tabs)/AGENTS.md`:
- Replace the three history bullets (NavBar Reports pill, per-mitzvah section, hero) and the NavBar sentence "history's Reports pill" with the contract of §3C: the NavBar in the hero, the tabs, the sticky switcher, the calendar sheet, reports in מגמות, compute-once-per-input, `saveAchievements`, and the motion and reduced-motion rule.

C — `src/app/AGENTS.md` (`report.tsx` bullet): "the history tab's Reports pill and the report notice open it" → "the reports list in the history tab's מגמות and the report notice open it".

C — root `AGENTS.md`:
- Source Map `(tabs)` line → "History opens with a landscape hero (greeting, streak ring) above three tabs, סיכום, מגמות and הישגים, under a sticky switcher."
- Add `ProgressBar` to the component list.
- Append the two completions-store fields to the State and Persistence bullet, as in `src/stores/AGENTS.md`.
- Rewrite the `history.render.test.tsx` Tests bullet to: "the hero, the three tabs, the period rings, the Hebrew-month calendar and its day sheet, per-mitzvah consistency and streak, the 12-week, weekday and trend charts with their insights, the reports list, badges and records, on fixture F (run again with `pnpm test:tz`)."

## 9. Report format
Each executor returns:
- files changed (NEW / CHANGED / DELETED);
- each §7 command with its exit code and the last 15 lines verbatim;
- any deviation from this spec, with the reason;
- open questions;
- for A, the actual results of the F cases if any number differs from §6 (stop and report rather than editing the expectation).

## 10. Open questions and UNVERIFIED

**Open questions** (each has a default; the spec uses the default)
1. "100 marks of one mitzvah": one badge per mitzvah (`hundred:<id>`, default, as the prototype's "100 פעמים תפילין"), or a single badge for whichever mitzvah first reaches 100?
2. The current-week report row pushes `/report?week=<coming Saturday>`. The report screen shows only finished weeks, so it opens last week. Keep (default, as the prototype), or make the current row non-pressable?

**UNVERIFIED** (how to check)
- The F expected numbers in §6 were derived by hand from the registry windows, hebcal output checked in node (parashiyot, Hebrew labels, festival basenames) and the judging rules. Executor A confirms them by running them.
- Whether reanimated 4 completes `withTiming` under Jest without fake timers. The render suites therefore mock reduced motion; B's non-reduced case asserts only the accessibility label.
- `transformOrigin: 'right'` and the indicator's `start: 0` on native with `forceRTL` (the prototype was checked on web only). Check on the Android emulator (`android-native-verify` skill) in Hebrew.
- The first-evaluation seed judges up to 400 days in one `afterPaint` task. Time the first History focus on the emulator after restoring a full backup; if it exceeds about 500 ms, split the seed walk across frames.
- `measureInWindow` in the Jest React Native mock may never call back: below-the-fold sections then stay inactive, which reduced motion covers.
