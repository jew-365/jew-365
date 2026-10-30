# Spec: late marks count as done, in-time stats and new badges

## 1. Goal
A mark made after its window closed ("late") counts as done on every surface: percentages, the calendar, trends, the weekly report, per-mitzvah runs, every existing badge and the best week. The `late` map only tags it. The tracking tab gains in-time shares, per-mitzvah late counts, a 12-week late chart, a "לשיפור" card, and three badges (`punctualWeek`, `punctualMonth`, `fewerLate`). The weekly report gains a line naming the mitzvah marked late most often that week.

## 2. Ownership (anything not listed is off limits)

**Executor A, phase 1 (core logic)**
- CHANGED `src/utils/historyStats.ts`: `countsAsDone()`; `verdictOf()` puts `late` items in `done`.
- CHANGED `src/utils/badges.ts`: new badge ids, `FOLD_RULE`, fold invalidation, late counted as done, mark totals without the `late` parameter.
- CHANGED `src/utils/historyTrends.ts`: a `late` count in the tallies, `onTimePercent`, `lateByMitzvah`, `lateWeeksInsight`.
- CHANGED `src/utils/weeklyReport.ts`: `lateTop`, plus the comment.
- CHANGED `src/utils/lateMarks.ts`: `lateImprove`.
- CHANGED `src/utils/homeDay.ts`: comment line 54 only.
- CHANGED `src/stores/useCompletionsStore.ts`: `BadgeId`, `AchievementFold.rule?`, `archiveMarkCounts` signature, `merge` call, comment.
- CHANGED tests: `src/utils/__tests__/lateMarks.test.ts`, `src/utils/__tests__/badges.test.ts`, `src/utils/__tests__/historyTrends.test.ts`, `src/stores/__tests__/lateMarks.store.test.ts`.

**Executor D, phase 1 (copy and docs)**
- CHANGED `src/i18n/he.json`, `src/i18n/en.json`: every key in section 5.
- CHANGED `src/data/guide.ts`: history topic paragraph and a `WHATS_NEW` entry.
- CHANGED `docs/guide/index.html`, `docs/guide/en/index.html`: generated only, by `pnpm guide:build`.
- CHANGED `AGENTS.md` (root), `src/utils/AGENTS.md`, `src/app/AGENTS.md`, `src/app/(tabs)/AGENTS.md`, `src/stores/AGENTS.md`.
- CHANGED `not-close.md`: one item.

**Executor B, phase 2 (screens), after A and D**
- CHANGED `src/app/(tabs)/history.tsx`
- CHANGED `src/app/report.tsx`
- CHANGED tests: `src/app/__tests__/history.lateMarks.render.test.tsx`, `src/app/__tests__/history.render.test.tsx`, `src/app/__tests__/lateMark.render.test.tsx`.

**Executor C, phase 2 (search), after A and D**
- CHANGED `src/utils/settingsSearch.ts`
- CHANGED `src/components/SettingsSearch.tsx`: the stats input only.
- CHANGED `src/utils/__tests__/searchCoverage.test.ts`
- CHANGED `src/utils/__tests__/settingsSearch.test.ts`: only if a case fails because of this change.

**Off limits to everyone:** `src/components/DayLooks.tsx` and its test (another task's uncommitted work), `src/app/late-marks.tsx` (its copy changes only through i18n), `src/hooks/useLateMarkDialog.tsx`, `src/utils/homeDay.ts` logic, the notification code, `persistOptions.ts` / `STORE_VERSION`, `app.json`, `package.json`, `action-log.md`, `state.md`.

## 3. Contracts

### A. `src/utils/historyStats.ts`
- Add:
  ```ts
  export function countsAsDone(state: JudgedState): boolean { return state === 'done' || state === 'late'; }
  ```
- `verdictOf()`: `if (countsAsDone(state)) verdict.done.push(id); else if (state === 'missed' || state === 'skipped') verdict.missed.push(id); else verdict.pending.push(id);`. `DayVerdict` keeps its shape.
- Replace the comment above `DayVerdict` with:
  `// \`done\` holds every item that counts as done, a late mark included (countsAsDone); a surface that shows late marks apart reads the judged items.`
- `judgeDayItems()` unchanged (still yields `'late'`). `computeStreak()` and `computeStats()` unchanged.

### A. `src/stores/useCompletionsStore.ts`
- `BadgeId`: add `'punctualWeek' | 'punctualMonth' | 'fewerLate'`.
- `AchievementFold`: `{ through: string; run: StreakRun; mitzvahRuns: Record<string, StreakRun>; rule?: number }`.
- `archiveMarkCounts(counts: MarkCounts, completions: Completions, today: Date = new Date()): MarkCounts`: drop the `late` parameter and the `if (late[key]?.[id]) continue;` line; delete the comment about late marks above it.
- In `merge`: `archivedMarks: archiveMarkCounts(saved?.archivedMarks ?? EMPTY_MARK_COUNTS, completions)`. Keep the `late` const for `late: pruneCompletions(late)`.
- No `STORE_VERSION` change. An older `fold` has no `rule`, so it reads as stale.

### A. `src/utils/badges.ts`
- `export const FOLD_RULE = 2;`
- `BadgeKind` adds `{ kind: 'punctualWeek' } | { kind: 'punctualMonth' } | { kind: 'fewerLate' }`; `badgeKind()` maps the three exact ids before the `thousand` fallback.
- `markTotals(completions: Completions, archived: MarkCounts): MarkTotals`: no `late` parameter; every mark counts. Delete the late comment.
- `markBadges(completions, archived, fallbackKey = dateKey(), knownIds?)`: no `late` parameter; every mark counts.
- `foldAchievements()` keeps its signature:
  - `const fold = stored?.fold?.rule === FOLD_RULE ? stored.fold : null;` A stale fold rescans from `floor`; archive seeding stays.
  - `settled(days, accept: (state: JudgedState) => boolean)` returns false on the first item where `!accept(state)`, else `due > 0`.
  - Week badges, same Saturday condition: `fullWeek` with `countsAsDone`; `punctualWeek` with `(s) => s === 'done'`.
  - Month badges, same last-day-of-Hebrew-month condition: `fullMonth` with `countsAsDone`, `punctualMonth` with `(s) => s === 'done'`.
  - Mitzvah runs: no code change (they iterate `verdict.done` / `verdict.missed`).
  - Best-week loop: `if (countsAsDone(state)) done += 1;` and `if (state === 'late') late += 1;`. Push each scanned week to `scanned: { end: string; late: number; settled: boolean }[]` (newest first; `settled = unsettled === 0 && due > 0`) before `end = previousWeekEnd(...)`. After the loop:
    `for (let i = scanned.length - 2; i >= 0; i--) { const cur = scanned[i]; const prev = scanned[i + 1]; if (cur.settled && prev.settled && prev.late >= 1 && cur.late < prev.late) badges.fewerLate ??= cur.end; }`
  - `nextFold = snapshot ? { through, run, mitzvahRuns, rule: FOLD_RULE } : fold;` (the validated `fold`, not `stored?.fold`).
  - `markBadges(input.completions, archived, appDayKey(now, location), knownIds)`.
- `KIND_ORDER`: `['streak7','streak30','streak100','streak365','fullWeek','punctualWeek','fullMonth','punctualMonth','fewerLate','thousandMarks']`.
- `nextBadges()` unchanged: the in-time badges are never listed as next.
- Import `countsAsDone` and `type JudgedState` from `@/utils/historyStats`.

### A. `src/utils/historyTrends.ts`
- `DayTally = { key; done; due; waiting; later; late: number }`. `tallyOf`: `else { tally.due += 1; if (countsAsDone(state)) tally.done += 1; if (state === 'late') tally.late += 1; }`.
- `sumRange` also sums `late`.
- `PeriodTally = { done: number; due: number; late: number; percent: number | null }`; `periodOf` returns `late`.
- `WeekPoint` adds `late: number`, from `sumRange`.
- Exports:
  - `onTimePercent(done: number, late: number): number | null` = `done > 0 ? Math.round(((done - late) / done) * 100) : null`.
  - `lateByMitzvah(input: HistoryInput, now: Date, judge: DayJudge, daysBack = 30): Record<string, number>`: days `addDays(appDay(now, input.location), -offset)` for `offset = daysBack - 1 … 0`; counts each `state === 'late'` item by id; only ids with count ≥ 1.
  - ```ts
    export type LateWeeksInsight =
      | { kind: 'none' }
      | { kind: 'falling'; recent: number; before: number }
      | { kind: 'rising'; recent: number; before: number }
      | { kind: 'total'; count: number }
      | null;
    export function lateWeeksInsight(weeks: WeekPoint[]): LateWeeksInsight
    ```
    1. every week `due === 0` → `null`. 2. `total` = sum of `late`; 0 → `{ kind: 'none' }`. 3. `finished` = weeks with `!current && due > 0`. 4. if `finished.length >= 8`: `recent` = sum late of `finished.slice(-4)`, `before` = of `finished.slice(-8, -4)`; `recent < before` → falling, `recent > before` → rising. 5. else `{ kind: 'total', count: total }`.

### A. `src/utils/weeklyReport.ts`
- `WeekSummary` adds `lateTop: { id: string; late: number } | null`: count `state === 'late'` per id over `judged`; highest; ties to smaller id; `null` when 0.
- Replace the late comment with: `// A late mark counts in \`done\`; \`late\` says how many of the done marks were late.`
- `improve` keeps its logic (now misses only).

### A. `src/utils/lateMarks.ts`
```ts
export type LateImprove = { top: { id: string; count: number } | null; total: number; days: number };
export function lateImprove(input: Pick<LateMarkInput, 'find' | 'completions' | 'late' | 'location'>, now: Date): LateImprove | null
```
- `total` = `countLateMarks(input)`; `null` when 0.
- `recentFrom` = `dateKey(addDays(appDay(now, input.location), 1 - LATE_RECENT_DAYS))`.
- Over `late` entries with `key >= recentFrom`, a done mark beside them and `find(id)`: count per id, track latest key per id.
- `top` = highest count; ties to later latest key, then smaller id; `null` when nothing recent. `days: LATE_RECENT_DAYS`.

### A. `src/utils/homeDay.ts`
- Delete the comment line 54 only.

### B. `src/app/(tabs)/history.tsx`
- `ViewModel`: replace `lateCount: number` with `improve: LateImprove | null` and `lateByMitzvah: Record<string, number>`; compute `lateImprove({ find: findAnyMitzvah, completions, late, location }, now)` and `lateByMitzvah(input, now, judge, HISTORY_DAYS)`; `markTotals(completions, store.archivedMarks)`; drop `countLateMarks` import.
- `badgeInfo` new branches: `punctualWeek` icon `'sun'`, `punctualMonth` icon `'night'`, `fewerLate` icon `'undo'`; title/description keys `history.badge.<id>.title` / `.description`.
- Period rings (`renderSummary`): under each caption `Text`, when `period.tally.done > 0`, `<Text testID={`history-period-ontime-${period.id}`} style={[typography.small, styles.center, { color: colors.textSub }]}>` with `p = onTimePercent(done, late)`: late 0 → `history.period.onTime {percent}`; late 1 → `history.period.onTimeLate.once {percent}`; else `history.period.onTimeLate {percent, count}`.
- Improve card: delete the `history-late-link` block. After the achievements `Card`, before `MonthCalendar`, when `data.improve`: `<SectionLabel text={t('history.improve.title')} />` then `<Card divided><View testID="history-improve-card"><ListRow … chevron onPress={() => router.push('/late-marks')} /></View></Card>`. `topMitzvah = data.improve.top ? findAnyMitzvah(data.improve.top.id) : undefined`; icon `topMitzvah ? iconFor(topMitzvah.icon) : 'calendar'`; title: count 1 → `history.improve.top.once {name, days}`, >1 → `history.improve.top {name, count, days}`, else `history.improve.noneRecent {days}`; caption `history.improve.total(.once) {count: total}`.
- `ConsistencyRow`: `ConsistencyItem` adds `lateText: string | null`; when `item.percent !== null && item.lateText`, render under the `ProgressBar` `<Text testID={`history-late-${item.id}`} style={[typography.small, { color: lateTone(colors).ink }]}>`. Parent: `late = data.lateByMitzvah[id] ?? 0`; `lateText = late ? t(late === 1 ? 'history.perMitzvah.late.once' : 'history.perMitzvah.late', { count: late }) : null`; summary: eligible 0 → `history.newMitzvah`; late → `history.percentLate(.once) {percent, count}`; else `history.percent`.
- `SelectionDetail`: optional `value?: string`; heading renders `value ?? (percent === null ? t('history.percentNone') : `${percent}%`)`.
- `WeekBar`: optional `metric?: 'percent' | 'late'` (default percent) and `max?: number` (default 1); hooks above the early return; empty column: `metric === 'late' ? week.due === 0 : week.percent === null`. With late: testID `history-late-week-${weekEnd}`, label testID `history-late-week-label-${weekEnd}`, label `String(week.late)`, height `(WEEK_CHART_HEIGHT * week.late) / Math.max(1, max)`, accessibilityLabel `history.lateWeeks.barLabel {title, count}`, colours from `lateTone(colors)` (current: fill bg, ring border, dashed; others: ring bg same opacity rule; selected/current label ink). Percent path output unchanged; use `week.percent ?? 0`.
- Late chart in `renderTrends`, inside the `!allEmpty` fragment after the `weeksText` insight, before the weekday `SectionLabel`: state `selectedLateWeek`; `lateMax = Math.max(1, ...weeks.map((w) => w.late))`; `mostLate` = among `!w.current && w.due > 0`, `w.late > 0`, highest, ties to later; `chosenLate = weeks.find((w) => w.weekEnd === selectedLateWeek && w.due > 0) ?? mostLate ?? weeks[weeks.length - 1]`. Render: SectionLabel `history.lateWeeks.title`; hint Text `history.lateWeeks.hint` (`styles.sectionHint`); `<Card padded>` with `<View testID="history-late-chart" style={styles.weekChart}>` (same three grid lines, one `WeekBar metric="late" max={lateMax}` per week, selected/labelled when `w.weekEnd === chosenLate.weekEnd`, `onSelect` sets the state, same title/index; `axisTop` Text `String(lateMax)`, no middle label), same `axisRow`, `<SelectionDetail id={`late-${chosenLate.weekEnd}`}>` with the same title expression, caption `history.lateWeeks.detail {range: rangeOf(chosenLate), late, done}`, `percent={null}`, `value={String(chosenLate.late)}`; then `<Reveal><Insight/></Reveal>` when text not null: none → `history.insight.lateNone`; falling → `lateFalling {recent, before}`; rising → `lateRising {recent, before}`; total → `lateTotal` or `.once` when count 1; null → nothing.

### B. `src/app/report.tsx`
- `lateMitzvah = summary?.lateTop ? mitzvahOf(summary.lateTop.id) : undefined`.
- Improve block: when `(summary.improve && improved) || (summary.lateTop && lateMitzvah)`: SectionLabel `report.improve`; existing improve Banner when `summary.improve && improved`; when `summary.lateTop && lateMitzvah`: `<View testID="report-late-top" style={styles.stackGap}><Banner tone="info" text={t(lateTop.late === 1 ? 'report.lateTopLine.once' : 'report.lateTopLine', { name: nameFor(lateMitzvah), count })} onPress={() => router.push({ pathname: '/mitzvah/[id]', params: { id: lateMitzvah.id } })} /></View>`.
- New style `stackGap: { marginTop: spacing.sm }`.

### C. `src/utils/settingsSearch.ts`
- `SearchStats` adds `lateTotal?: number`.
- `HISTORY_CARDS`: append `'איחורים'`, `'late'` to `perMitzvah` terms; after `perMitzvah` add `{ id: 'onTime', titleKey: 'settings.search.stat.onTime', tab: 'summary', terms: ['בזמן','אחוז בזמן','דייקנות','איחורים','on time','punctual','punctuality','late'] }` and `{ id: 'improve', titleKey: 'history.improve.title', tab: 'summary', terms: ['לשיפור','שיפור','איחור','איחורים','באיחור','improve','late','late marks'] }`; after `weeks` add `{ id: 'lateWeeks', titleKey: 'history.lateWeeks.title', tab: 'trends', terms: ['איחורים','איחור','גרף איחורים','שבועות','late','late marks','chart'] }`.
- `statItems` after `stat:marks`: `{ id: 'stat:lateTotal', kind: 'stat', icon: 'calendar', title: name('settings.search.stat.lateTotal'), caption: name(lateTotal === 1 ? 'late.total.once' : 'late.total', { count: lateTotal }), terms: ['איחור','איחורים','באיחור','סימונים באיחור','late','late marks'], href: toAchievements('summary') }`; destructure `lateTotal = 0`.
- `badgeItems`: after `fullWeek` add `badge('punctualWeek', 'history.badge.punctualWeek.title', 'history.badge.punctualWeek.description', {}, null)`; after `fullMonth` add `punctualMonth` then `fewerLate` the same way.

### C. `src/components/SettingsSearch.tsx`
- stats: `totals: markTotals(completions.completions, completions.archivedMarks)`, `lateTotal: countLateMarks({ find: findAnyMitzvah, completions: completions.completions, late: completions.late })`; imports accordingly.

## 4. Data
No new store field beyond optional `AchievementFold.rule`. Earned badges stay. The rescan under `FOLD_RULE` 2 raises `mitzvahBest`, `bestWeek` and new badge dates from history within retention. Stored `archivedMarks` stays.

## 5. i18n (D adds to both dictionaries; plain hyphen, no long dash, no nikud; "(change)" = reword existing)

| Key | he | en |
|---|---|---|
| `lateMark.lateCaption` (change) | נספר כבוצע ומסומן כאיחור | Counts as done and is shown as late |
| `late.note` (change) | סימון באיחור נספר כבוצע בכל מקום: ביום, ברצף, באחוזים, בדוח השבועי ובהישגים. הוא מסומן בכתום, וכאן רואים איפה כדאי להקדים. | A late mark counts as done everywhere: your day, your streak, percentages, the weekly report and badges. It is shown in orange, and here you can see where to be earlier. |
| `report.lateLine` (change) | מתוכן %{count} סומנו באיחור | %{count} of them marked late |
| `report.lateLine.once` (change) | מתוכן אחת סומנה באיחור | One of them marked late |
| `report.lateTopLine` | %{name} סומנה באיחור %{count} פעמים השבוע. אפשר להקדים את התזכורת שלה במסך המצווה. | %{name} was marked late %{count} times this week. You can set its reminder earlier on the mitzvah screen. |
| `report.lateTopLine.once` | %{name} סומנה באיחור פעם אחת השבוע. אפשר להקדים את התזכורת שלה במסך המצווה. | %{name} was marked late once this week. You can set its reminder earlier on the mitzvah screen. |
| `history.period.hint` (change) | כל אחוז: מתוך המצוות שזמנן הגיע בתקופה, כמה סימנת כבוצעו, גם באיחור. ״בזמן״: כמה מהסימונים נעשו בזמן. שבת או חג שממתינים לצ׳ק־אין עוד לא נספרים. | Each percent: of the mitzvot that came due in the period, how many you marked done, late marks included. On time: how many of those marks were made in time. A Shabbat or Yom Tov waiting for its check-in is not counted yet. |
| `history.period.onTime` | בזמן %{percent}% | On time %{percent}% |
| `history.period.onTimeLate` | בזמן %{percent}% · %{count} איחורים | On time %{percent}% · %{count} late |
| `history.period.onTimeLate.once` | בזמן %{percent}% · איחור אחד | On time %{percent}% · 1 late |
| `history.perMitzvahHint` (change) | האחוז: מהימים שזמן המצווה עבר בהם, בכמה סימנת אותה, גם באיחור. הרצף: ימים רצופים שסימנת אותה. איחורים: כמה מהסימונים ב-30 הימים נעשו אחרי שעבר הזמן. | The percent: of the days the mitzvah's time passed, how many you marked it, late marks included. The streak: days in a row you marked it. Late: how many of the marks in the 30 days came after the time passed. |
| `history.perMitzvah.late` | %{count} איחורים | %{count} late |
| `history.perMitzvah.late.once` | איחור אחד | 1 late |
| `history.percentLate` | %{percent}% · %{count} איחורים | %{percent}% · %{count} late |
| `history.percentLate.once` | %{percent}% · איחור אחד | %{percent}% · 1 late |
| `history.improve.title` | לשיפור | To improve |
| `history.improve.top` | %{name}: %{count} איחורים ב-%{days} הימים האחרונים | %{name}: %{count} late marks in the last %{days} days |
| `history.improve.top.once` | %{name}: איחור אחד ב-%{days} הימים האחרונים | %{name}: one late mark in the last %{days} days |
| `history.improve.noneRecent` | אין איחורים ב-%{days} הימים האחרונים | No late marks in the last %{days} days |
| `history.improve.total` | סך הכל %{count} סימונים באיחור | %{count} late marks in all |
| `history.improve.total.once` | סך הכל סימון אחד באיחור | One late mark in all |
| `history.lateWeeks.title` | איחורים ב-12 השבועות האחרונים | Late marks over the last 12 weeks |
| `history.lateWeeks.hint` | כמה מצוות סומנו אחרי שעבר הזמן בכל שבוע. לחיצה על עמודה מציגה את השבוע שלה | How many mitzvot were marked after their time each week. Tap a bar to see its week |
| `history.lateWeeks.barLabel` | %{title}, %{count} באיחור | %{title}, %{count} late |
| `history.lateWeeks.detail` | %{range} · %{late} מתוך %{done} סימונים באיחור | %{range} · %{late} of %{done} marks late |
| `history.insight.lateNone` | אין איחורים ב-12 השבועות האחרונים: כל הסימונים בזמן | No late marks in the last 12 weeks: every mark on time |
| `history.insight.lateFalling` | פחות איחורים: %{recent} ב-4 השבועות האחרונים, לעומת %{before} ב-4 שלפניהם | Fewer late marks: %{recent} in the last 4 weeks, against %{before} in the 4 before them |
| `history.insight.lateRising` | יותר איחורים: %{recent} ב-4 השבועות האחרונים, לעומת %{before} ב-4 שלפניהם. כדאי להקדים תזכורת | More late marks: %{recent} in the last 4 weeks, against %{before} in the 4 before them. An earlier reminder may help |
| `history.insight.lateTotal` | %{count} סימונים באיחור ב-12 השבועות האחרונים | %{count} late marks in the last 12 weeks |
| `history.insight.lateTotal.once` | סימון אחד באיחור ב-12 השבועות האחרונים | One late mark in the last 12 weeks |
| `history.badge.fullWeek.description` (change) | כל מצווה שזמנה הגיע, מיום ראשון ועד שבת, סומנה כבוצעה, גם אם באיחור | Every mitzvah that came due, from Sunday to Shabbat, was marked done, late marks included |
| `history.badge.fullMonth.description` (change) | כל מצווה שזמנה הגיע, בכל ימי חודש עברי אחד, סומנה כבוצעה, גם אם באיחור | Every mitzvah that came due, on every day of one Hebrew month, was marked done, late marks included |
| `history.badge.punctualWeek.title` | שבוע בזמן | A week on time |
| `history.badge.punctualWeek.description` | כל מצווה שזמנה הגיע, מיום ראשון ועד שבת, סומנה בזמן, בלי אף איחור | Every mitzvah that came due, from Sunday to Shabbat, was marked in time, with no late mark |
| `history.badge.punctualMonth.title` | חודש בזמן | A month on time |
| `history.badge.punctualMonth.description` | כל מצווה שזמנה הגיע, בכל ימי חודש עברי אחד, סומנה בזמן, בלי אף איחור | Every mitzvah that came due, on every day of one Hebrew month, was marked in time, with no late mark |
| `history.badge.fewerLate.title` | פחות איחורים | Fewer late marks |
| `history.badge.fewerLate.description` | שבוע שלם עם פחות סימונים באיחור מהשבוע שלפניו | A full week with fewer late marks than the week before it |
| `settings.search.stat.onTime` | אחוז הסימונים בזמן | Share marked on time |
| `settings.search.stat.lateTotal` | סך הסימונים באיחור | All late marks |

**Remove** from both files: `history.lateLink` and `history.lateLink.once` (grep first that nothing else reads them besides history.tsx, which B rewrites).

### Guide (`src/data/guide.ts`, D)
- History topic, the paragraph about late marks (`he`), replace with:
  > מצווה שהזמן שלה נגמר אפשר עדיין לסמן: ב״היום שלי״ בבית, במסך המצווה, בסידור ובצ׳ק־אין אחרי שבת. האפליקציה שואלת מתי עשית. ״עשיתי בזמן ולא סימנתי״ נספר כמו סימון בזמן. ״עשיתי אחרי שעבר הזמן״ נספר כבוצע בכל מקום, באחוזים, בלוח החודש, במגמות, בדוח השבועי ובהישגים, ומסומן בכתום. ב״סיכום״ מופיע כמה מהסימונים היו בזמן בכל תקופה, כמה איחורים היו לכל מצווה, וכרטיס ״לשיפור״ עם המצווה שאיחרת בה הכי הרבה ב-30 הימים האחרונים, שפותח את ״סימונים באיחור״: איזו מצווה, באיזה יום, מתי נגמר הזמן ומתי סימנת. ״מגמות״ מציג את האיחורים ב-12 השבועות האחרונים, והדוח השבועי את המצווה שאיחרת בה הכי הרבה השבוע. ההישגים ״שבוע בזמן״ ו״חודש בזמן״ דורשים שכל הסימונים יהיו בזמן, ו״פחות איחורים״ ניתן על שבוע עם פחות איחורים מהשבוע שלפניו.
- Same paragraph (`en`):
  > A mitzvah whose time has ended can still be marked: in My day on Home, on the mitzvah's screen, in the siddur and in the check-in after Shabbat. The app asks when you did it. "I did it in time and didn't mark it" counts like a mark made in time. "I did it after the time passed" counts as done everywhere, in percentages, the month calendar, Trends, the weekly report and badges, and shows in orange. Summary shows how many marks were on time in each period, the late marks of each mitzvah, and a To improve card with the mitzvah you were late on most in the last 30 days, which opens Late marks: which mitzvah, on which day, when its time ended and when you marked it. Trends shows the late marks of the last 12 weeks, and the weekly report the mitzvah you were late on most that week. The badges A week on time and A month on time need every mark in time, and Fewer late marks is given for a week with fewer late marks than the week before it.
- `WHATS_NEW`: prepend `{ label: '1.0.21-7', date: '2026-10-30', items: [...] }` (match the existing entry shape) with:
  1. he: סימון באיחור נספר עכשיו כבוצע בכל מקום: באחוזים, בלוח החודש, במגמות, בדוח השבועי ובהישגים. הוא עדיין מסומן בכתום. / en: A late mark now counts as done everywhere: percentages, the month calendar, Trends, the weekly report and badges. It is still shown in orange.
  2. he: במעקב: כמה מהסימונים היו בזמן בכל תקופה, איחורים לכל מצווה, כרטיס ״לשיפור״, גרף איחורים ב-12 השבועות, ושלושה הישגים חדשים: שבוע בזמן, חודש בזמן ופחות איחורים. / en: In Tracking: how many marks were on time in each period, late marks per mitzvah, a To improve card, a 12-week chart of late marks, and three new badges: A week on time, A month on time and Fewer late marks.
- If a `1.0.21-7` entry already exists, add the two items to it instead. The `1.0.21-6` entry stays.
- Then run `pnpm guide:build`.

## 6. Tests

### A: `src/utils/__tests__/lateMarks.test.ts`
- Drop `late` arguments to `markTotals`/`markBadges`/`archiveMarkCounts`; import `countsAsDone`, `lateImprove`, `FOLD_RULE`; add `const OTHER = morning('other')`.
- `is late, and scores as a miss` → `is late, and counts as done`: verdict `{ key: '2026-05-06', done: ['daily'], missed: [], pending: [] }`.
- New `countsAsDone`: over `['done','late','missed','skipped','waiting','open','later']` → `[true,true,false,false,false,false,false]`.
- `counts against the percentage but keeps the day in the streak` → `counts toward the percentage and keeps the day in the streak`: `perMitzvah.daily` = `{ done: 3, eligible: 3, pending: 0, percent: 100 }`; streak assertions stay.
- Mark totals → `counts a late mark in the mark totals`: `markTotals({ '2026-05-05': { a: 1, b: 1 }, '2026-05-06': { a: 1 } }, EMPTY_MARK_COUNTS)` = `{ total: 3, byMitzvah: { a: 2, b: 1 } }`.
- Hundred badge → `counts every mark toward the hundred badge`: keep only the `keys[99]` expectation.
- Runs and full week → `keeps the mitzvah run and the full week, and takes the week on time away`: on time `fullWeek` `'2026-05-09'`, `punctualWeek` `'2026-05-09'`, `mitzvahBest.daily.days` 7, `bestStreak` 7; with late on `2026-05-06`: `fullWeek` `'2026-05-09'`, `punctualWeek` undefined, `mitzvahBest.daily.days` 7, `bestStreak` 7, and `next.fold?.rule === FOLD_RULE` when the fold is not null.
- New month on time: `first = new HDate(1, months.IYYAR, 5786).greg()`, `length = HDate.daysInMonth(months.IYYAR, 5786)`; mark every day; `now = at(JERUSALEM, <last day key + 10 days>T12:00)`; `fullMonth === punctualMonth === dateKey(last day)`; with one late mark on day 15, `fullMonth` same, `punctualMonth` undefined.
- New fewer late: mark every day `2026-05-03`..`2026-05-16`, late on `05-05`, `05-06`, `05-12`, `now = at(J, '2026-05-20T12:00')` → `badges.fewerLate === '2026-05-16'`; late on `05-05`, `05-12`, `05-13` → undefined; no late marks → undefined.
- New stale fold: stored `{ badges: {}, bestStreak: null, bestWeek: null, mitzvahBest: { daily: { days: 3, from: '2026-05-03', to: '2026-05-05' } }, fold: { through: '2026-05-08', run: { days: 6, from: '2026-05-03', to: '2026-05-08' }, mitzvahRuns: { daily: { days: 0, from: null, to: null } } } }`; marks `05-03`..`05-09`, late on `05-06`, now `2026-05-20T12:00`; without `rule` → `next.mitzvahBest.daily.days === 7`; with `fold.rule = FOLD_RULE` → `3`.
- Weekly report case → `counts a late mark as done and names the mitzvah marked late`: `toMatchObject({ done: 7, missed: 0, late: 1, improve: null, lateTop: { id: 'daily', late: 1 } })`; with no late map, `lateTop` null.
- New `lateImprove`: `find = (id) => ({ daily: DAILY, other: OTHER })[id]`, `now = at(J, '2026-05-07T12:00')`; late `{'2026-05-01':{daily},'2026-05-02':{daily},'2026-05-05':{other},'2026-03-01':{daily,other},'2026-05-06':{gone}}` with matching completions → `{ top: { id: 'daily', count: 2 }, total: 5, days: 30 }`; `{'2026-05-01':{daily},'2026-05-03':{other}}` → `top.id === 'other'`; only `{'2026-03-01':{daily}}` → `{ top: null, total: 1, days: 30 }`; empty → `null`.

### A: `src/utils/__tests__/badges.test.ts`
- The case expecting `{ streak7: '2026-10-18', fullWeek: '2026-10-17' }` → add `punctualWeek: '2026-10-17'`.
- `orders earned badges`: add `punctualWeek: '2026-09-14'`; order `['streak7','fullWeek','punctualWeek','streak30']`.

### A: `src/utils/__tests__/historyTrends.test.ts`
- `point()` helper: `late: 0` before `...over`; every expected tally/period/week object gains `late: 0` (e.g. `{ done: 0, due: 0, late: 0, percent: null }`).
- New: `tallyOf` over items done, late, missed, waiting (`window: { start: new Date(0), end: new Date(0) }, markedAt: null, inCheckIn: false`) → `{ key: 'k', done: 2, due: 3, waiting: 1, later: 0, late: 1 }`.
- New: `periodPercents` with `late: { '2026-10-27': { tefillin: 1 } }` on the fixture → `week` = `{ done: 3, due: 4, late: 1, percent: 75 }`.
- New: `onTimePercent` `(4,1)` 75, `(3,0)` 100, `(3,3)` 0, `(0,0)` null.
- New: `lateByMitzvah`: fixture + completions `2026-09-20: {tefillin:1}`, late on `2026-10-21`, `2026-10-22`, `2026-09-20` for tefillin → `{ tefillin: 2 }`.
- New: `lateWeeksInsight`: `[]` null; `[point(null), point(null,{current:true})]` null; `[point(50), point(1,{current:true})]` `{ kind: 'none' }`; nine finished late `[0,3,1,1,1,0,0,1,0]` + current `point(1,{current:true,late:2})` → `{ kind: 'falling', recent: 1, before: 6 }`; `[0,1,0,0,1,1,1,3,0]` → `{ kind: 'rising', recent: 5, before: 2 }`; three finished `[1,0,1]` + current late 1 → `{ kind: 'total', count: 3 }`.
- If any expected number here disagrees with the contract, trust the contract, fix the test arithmetic, and report it.

### A: `src/stores/__tests__/lateMarks.store.test.ts`
- The archive-total expectation after merge → `1`.
- Last case → `archives a late mark as a mark`, 3 arguments, `{ lastKey: '2020-01-01', total: 2, byMitzvah: { shacharit: 1, mincha: 1 } }`.

### B: `src/app/__tests__/history.lateMarks.render.test.tsx`
- Case 1 → `counts a late mark as done and opens the late marks report from the To improve card`: late on `2026-10-27` shacharit; `history-late-link` null; within `history-improve-card`: `תפילת שחרית: איחור אחד ב-30 הימים האחרונים` and `סך הכל סימון אחד באיחור`; a button `/^תפילת שחרית, 100% · איחור אחד$/`; `history-late-shacharit` text `איחור אחד`; `history-period-ontime-week` text `בזמן 75% · איחור אחד`; `history-period-ontime-day` null (verify the fixture; adjust only if the day truly has marks and report it); pressing the card pushes `'/late-marks'`.
- Case 2: no improve card; row `/^תפילת שחרית, 100%$/`; `history-period-ontime-week` text `בזמן 100%`.
- Case 3 unchanged.
- New case 4: seed as case 1, press `screen.getAllByRole('radio', { name: 'מגמות' })[0]`; `history-late-chart` present; `history-late-week-label-2026-10-31` text `1`; `screen.getByText('סימון אחד באיחור ב-12 השבועות האחרונים')`.

### B: `src/app/__tests__/history.render.test.tsx`
- `'2 הישגים · השיא שלך 8 ימים'` → `'3 הישגים · השיא שלך 8 ימים'`; add `expect(screen.getByTestId('history-badge-punctualWeek')).toBeOnTheScreen()` beside the other badge assertions. If another expectation fails, stop and report.

### B: `src/app/__tests__/lateMark.render.test.tsx`
- Weekly report case: line text `מתוכן אחת סומנה באיחור`, press still pushes `/late-marks`.
- Add: `within(screen.getByTestId('report-late-top')).getByText('תפילת שחרית סומנה באיחור פעם אחת השבוע. אפשר להקדים את התזכורת שלה במסך המצווה.')`; press pushes `{ pathname: '/mitzvah/[id]', params: { id: 'shacharit' } }`.

### C: `src/utils/__tests__/searchCoverage.test.ts`
- Expected list adds `'badge:punctualWeek'`, `'badge:punctualMonth'`, `'badge:fewerLate'`, `'stat:card:onTime'`, `'stat:card:improve'`, `'stat:card:lateWeeks'`, `'stat:lateTotal'` (match the file's real id format).
- New: close results for `'שבוע בזמן'`→`badge:punctualWeek`, `'פחות איחורים'`→`badge:fewerLate`, `'לשיפור'`→`stat:card:improve`, `'on time'`→`stat:card:onTime`, `'איחורים'`→`stat:card:lateWeeks`, `'late marks'`→`stat:lateTotal`.
- New: with `stats.lateTotal: 3`, `stat:lateTotal` caption `.he` is `'3 סימונים באיחור'`, href `{ pathname: '/(tabs)/history', params: { tab: 'summary' } }` (match the real `toAchievements` output).

## 7. Verification
- A: `pnpm test -- src/utils/__tests__/lateMarks.test.ts src/utils/__tests__/badges.test.ts src/utils/__tests__/historyTrends.test.ts src/utils/__tests__/historyStats.test.ts src/utils/__tests__/weeklyReport.test.ts src/stores/__tests__/lateMarks.store.test.ts src/stores/__tests__/achievements.test.ts` (skip names that do not exist).
- D: `pnpm guide:build`, then `pnpm test -- src/i18n/__tests__/i18n.test.ts src/data/__tests__/guide.test.ts src/app/__tests__/guide.render.test.tsx`, then `pnpm check:dox`.
- B: `pnpm test -- src/app/__tests__/history src/app/__tests__/lateMark.render.test.tsx src/app/__tests__/designSystem.test.ts src/app/__tests__/screens.smoke.render.test.tsx src/app/__tests__/uiScale.render.test.tsx`
- C: `pnpm test -- src/utils/__tests__/searchCoverage.test.ts src/utils/__tests__/settingsSearch.test.ts src/app/__tests__/settings.search.render.test.tsx src/app/__tests__/settings.searchIndex.render.test.tsx`
- Final (planner): typecheck, lint, check:dox, test, test:tz.
- Typecheck fails between phases (A drops `markTotals`'s `late` parameter); run it only at the end. Never run `pnpm config list` / `npm config list`.

## 8. Out of scope, and docs (D writes them)
Do not touch: `DayLooks.tsx` and its test, home and its rings, notification planners and the report notice, `useLateMarkDialog`, `late-marks.tsx` code, `computeStreak`, `nextBadges`, `STORE_VERSION` / `migrate`, `release/`, `docs/index.html`, `action-log.md`, `state.md`, the `1.0.21-6` `WHATS_NEW` entry.

Doc edits (find each sentence by grep; wording below is the target):
- Root `AGENTS.md`, `useCompletionsStore` bullet: replace from "so it keeps home's day, the streak and the notifications as done, while" through "score it as a miss" with:
  > and counts as done everywhere (the owner's call, 2026-10-30): home's day, the streak, the notifications, every percentage, the calendar, trends, the weekly report, each mitzvah's run and every badge; the `late` map only tags it, for the in-time shares, the per-mitzvah late counts, the 12-week late chart, the To improve card, the weekly report's late lines and the in-time badges (`punctualWeek`, `punctualMonth`, `fewerLate`)
- Root `AGENTS.md`, Tests (late marks bullet): "the judge's `late` state scoring as a miss while the streak keeps the day" → "the judge's `late` state counting as done everywhere"; "full-week and per-mitzvah runs" → "full-week, in-time and per-mitzvah runs, the fewer-late badge and the fold's rule"; "the history link and day sheet chip" → "the To improve card, the in-time shares, the per-mitzvah late counts, the late chart and the day sheet chip"; "the weekly report's line" → "the weekly report's late lines".
- `src/utils/AGENTS.md`:
  - historyStats: the late-in-missed sentence → "which puts a `late` item in `done` through `countsAsDone(state)` (`done` or `late`, the one rule; the owner's call, 2026-10-30), so every percentage, calendar level, trend, the weekly report and every per-mitzvah run count a late mark as done, and only the judged items tell it apart".
  - historyTrends: append "Every tally counts a `late` item as done and also in `late` (`DayTally`, `PeriodTally`, `WeekPoint`); `onTimePercent(done, late)` is the in-time share of the done marks (`null` with none); `lateByMitzvah()` counts the late marks per mitzvah over the per-mitzvah window; `lateWeeksInsight()` is the late chart's line (none; falling or rising over the last four finished weeks against the four before them, from eight finished weeks; else the total)."
  - badges: mark totals "leaving a late mark out" → "a late mark counted like any other"; the full-week parenthesis → "(a full week or month needs every item counted as done, a late one included, and a late item keeps its mitzvah's run; `punctualWeek` and `punctualMonth` need every item `done` in time; `fewerLate` is a settled report week with fewer late marks than the settled week before it, which had at least one; a stored checkpoint without the current `FOLD_RULE` (2) is ignored, so the walk restarts from the retention floor once under a changed rule)"; after `nextBadges()` add "(the in-time badges are never listed as next)".
  - weeklyReport: "a late mark counts in `missed` and `improve` and again in `late`, …" → "a late mark counts in `done` and again in `late`, the number the report's late line shows, and `lateTop` is the mitzvah with the most late marks that week (ties by id), `null` with none".
  - lateMarks: append "`lateImprove(input, now)` is the history tab's To improve card: the total of `countLateMarks()` and the mitzvah with the most late marks in the last `LATE_RECENT_DAYS` app days (ties to the latest day, then the id), `null` without any late mark."
  - homeDay: "(skipped left out, a late mark counted as done: home's day counts it, the history does not)" → "(skipped left out, a late mark counted as done, as everywhere)".
  - settingsSearch: "the tracking tab's cards;" → "the tracking tab's cards (the in-time shares, the To improve card and the late chart among them);"; "the mark total," → "the mark total, the late marks total (`stats.lateTotal`),".
- `src/app/AGENTS.md`: report.tsx "which count as decided and not marked" → "which count as marked"; the `report.improve` parenthesis → "(a `warning` `Banner` into the mitzvah when something was missed, and an `info` `Banner` (`report-late-top`, `report.lateTopLine`) into the mitzvah marked late most often that week when any was; the heading shows when either does)"; late-marks.tsx "opened from the `history-late-link` row of the history tab's סיכום" → "opened from the To improve card (`history-improve-card`) of the history tab's סיכום".
- `src/app/(tabs)/AGENTS.md`: סיכום: after the rings add "each with an in-time line under its caption (`history-period-ontime-<id>`, `history.period.onTime` / `.onTimeLate`: the share of its done marks made in time by `onTimePercent()`, absent with no done mark)"; replace the `history-late-link` sentence with "then, only while the store holds a late mark, a `history.improve.title` SectionLabel over a Card with one ListRow (`history-improve-card`, from `lateImprove()`: the mitzvah with the most late marks in the last 30 days and its count, else `history.improve.noneRecent`, captioned with the total) that pushes `/late-marks`"; per-mitzvah row add "and, when its 30 days hold a late mark, a `history-late-<id>` line (`history.perMitzvah.late`) under the bar". מגמות: after the weeks chart add "then the same weeks' late marks (`history-late-chart`, `WeekBar` with `metric="late"`, bars `history-late-week-<weekEnd>`, the finished week with the most late marks selected by default, else the current week) and its `lateWeeksInsight()` line". Home bullet: "while the history tab, the weekly report and the badges score it as a miss" → "as every other surface does (the owner's call, 2026-10-30)".
- `src/stores/AGENTS.md` (`useCompletionsStore`): "a late mark left out" → "a late mark counted like any other"; after "the fold checkpoint" add "(its optional `rule` names the scoring rule it was folded under, `FOLD_RULE` in [../utils/badges.ts](../utils/badges.ts); an older payload reads as a stale checkpoint and is rescanned once, so no `STORE_VERSION` bump)".
- Any other sentence in these docs that still says a late mark scores as a miss: fix it the same way (grep "late" / "miss").
- `not-close.md`: add a section `### High — Late marks count as done, 2026-10-30` just before `## Bugs` (match the file's heading style), with:
  ```
  - [ ] Count a late mark as done, with in-time figures and three badges
    - **Flag:** `OTA`.
    - **Requested:** the owner, 2026-10-30: a late mark counts as done everywhere; new badges for a week and a month on time and for fewer late marks; in-time shares, per-mitzvah late counts, a 12-week late chart and a To improve card in Tracking; the weekly report names the mitzvah marked late most often.
    - **What it is:** `countsAsDone()` in `src/utils/historyStats.ts` is the one rule; the badge fold is rescanned once under `FOLD_RULE` 2; the screens are `src/app/(tabs)/history.tsx` and `src/app/report.tsx`; the search finds the new cards, figures and badges.
    - **Expected result:** a late mark raises every percentage and keeps every run and badge; the in-time lines, late counts, chart, card, report line and the three badges show as specified; the guide's `1.0.21-7` entry names it.
  ```

## 9. Report format (each executor)
Files changed (NEW/CHANGED); every verification command with exit code and the last 20 lines verbatim; deviations with reasons; open questions. No commit, no OTA, no push.
