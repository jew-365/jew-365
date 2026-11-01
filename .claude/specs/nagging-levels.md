# Spec: nagging levels and reminder nags (PRD and implementation plan)

Status: planning only (the owner's call, 2026-11-01: "כרגע זה רק ברמת תכנון ויצירת משימות"). Nothing here is built. The tasks are in `not-close.md`, batch "Nagging levels and reminder nags, 2026-11-01"; the open product questions are Q9 to Q15 there. Every value marked **(Qn)** is a proposal the owner may change; everything else is a technical decision that is cheap to reverse.

## 1. Goal

The owner asked (2026-11-01, in Hebrew) for two things that share one mechanism:

1. **A nagging level, 1 to 5** (רמת נודניקיות): an app-wide default in Settings and an override per mitzvah. Today's behaviour is level 1; levels 2 to 5 add notifications. The level says how many notifications the user gets for a mitzvah.
2. **A nag on any reminder** (נודניק), custom and registry mitzvot alike: how many times it repeats, at what interval (3 or 5 minutes were named), and whether the repeats come before the reminder's time, after it, or half and half.

The result must ship over the air: every change below is JavaScript, and nothing touches expo-notifications' native side, `app.json` or a native module.

## 2. Glossary

- **Reminder**: a `Reminder` of a mitzvah (`anchor`, `offsetMin`, `label`), the rows of the mitzvah screen's reminders card. Unchanged in shape; it gains one optional field.
- **Trigger**: the instant one reminder fires for one window (`WindowTrigger` in `src/services/notifications/planners/mitzvot.ts`).
- **Nag** (נודניק): extra notifications that repeat one reminder around its trigger: `{ count, everyMin, placement }`.
- **Repeat**: one of those extra notifications, numbered `k` of `count`. The reminder's own notification is the **main**.
- **Level** (רמת נודניקיות): 1 to 5. A level is a preset nag applied to every reminder that has no explicit nag. The app level lives in Settings; a mitzvah may override it.
- **Explicit nag**: a nag the user set on one reminder. It always beats the level.

## 3. Product decisions

### 3.1 A level is "how many times each reminder repeats", not "extra reminders at fixed points of the window"

Two models were weighed. The chosen one: **the level multiplies the mitzvah's own reminders** (each main gets `n` repeats after it). The rejected one: the level adds derived reminders at fractions of the window (a midpoint, a last call 30 minutes before the end, a follow-up).

Why the chosen model:

- **Predictable.** The user reads his reminders on the mitzvah screen and knows exactly where the repeats land: right after each of them. Nothing appears at a time he did not set.
- **Night windows.** Maariv, the bedtime Shema, the Omer, the Chanukah candles and Chok LeYisrael end at the next alot. A "last call 30 minutes before the end" is a notification at 04:30. The repeat model never invents a time; the bedtime Shema's 23:00 reminder repeats at 23:05 and 23:10.
- **Short windows.** Candle lighting is 18 to 40 minutes long; fractions of it collapse. Repeats degrade by themselves: a repeat that falls inside the holy block is dropped by `reminderFires()`, as any trigger is today.
- **The halachic last call already exists.** Tefillin (E-45), the Shema (E-30), Shacharit (E-45) and Mincha (E-60) carry their own before-the-end reminder, and Maariv its second one at +120. Repeats on them nag at the right time without a second rule.
- **One mechanism.** The per-reminder nag and the level are the same thing at two scopes, so the planner, the preview, the editor and the tests handle one shape: a reminder with a nag.

### 3.2 The level table (Q9)

`NAG_LEVELS` in `src/utils/nagging.ts`, the one home of the presets. Names and numbers are the proposal; a change is one line.

| Level | Name (he / en) | Repeats per reminder | Interval | Placement | What the user gets |
| --- | --- | --- | --- | --- | --- |
| 1 | רגיל / Regular | 0 | - | - | today's behaviour: each reminder once |
| 2 | עדין / Gentle | 1 | 10 min | after | one more, ten minutes later |
| 3 | בינוני / Medium | 2 | 5 min | after | two more, within ten minutes |
| 4 | נמרץ / Firm | 3 | 5 min | after | three more, within a quarter of an hour |
| 5 | נודניק / Nagging | 5 | 3 min | after | five more, within a quarter of an hour |

Example, Shacharit in Jerusalem on a weekday with netz 06:10 and sof zman tfila 09:35; its own reminders fire at 06:10 (start) and 08:50 (E-45):

- level 1: 06:10 · 08:50
- level 3: 06:10 · 06:15 · 06:20 · 08:50 · 08:55 · 09:00
- level 5: 06:10 · 06:13 · 06:16 · 06:19 · 06:22 · 06:25 · 08:50 · 08:53 · 08:56 · 08:59 · 09:02 · 09:05

Every preset places its repeats **after** the main. Candle lighting therefore gets no repeats from a level (its main is the block's opening edge, and everything after it is inside the block); a user who wants them sets an explicit nag with placement "before".

### 3.3 Resolution order

For one reminder of one mitzvah:

1. `reminder.nag` is an object: that nag.
2. `reminder.nag` is `null`: no nag, whatever the level says (an exemption).
3. `reminder.nag` is absent: the level's preset, `NAG_LEVELS[level]`, where `level = activeMitzvot[id].nagLevel ?? user.nagLevel`, and `user.nagLevel` is 1 by default.

`nagFor(reminder, level): ReminderNag | null` is the one function that answers it. A malformed stored nag (a count or interval outside the limits) reads as absent.

### 3.4 The nag shape and its limits (Q10)

```ts
export type NagLevel = 1 | 2 | 3 | 4 | 5;
export type NagPlacement = 'before' | 'after' | 'around';
export type ReminderNag = { count: number; everyMin: number; placement: NagPlacement };
export const NAG_MAX_COUNT = 5;                 // count: 1 to 5
export const NAG_INTERVALS_MIN = [3, 5, 10, 15] as const;  // the chips offered; 3 and 5 as asked, 10 and 15 for a gentler nag
```

Placement: `before` puts every repeat before the main (`-k·everyMin`), `after` every repeat after it (`+k·everyMin`), `around` (חצי-חצי) `floor(count/2)` before and the rest after, so a count of 3 gives one before and two after, and a count of 1 behaves like `after`.

### 3.5 How repeats are planned (the logic)

Each rule names where it lives. Together they are the whole behaviour; nothing else changes in the engine.

1. **Offsets.** `repeatOffsets(nag): number[]` (minutes, sorted) in `src/utils/nagging.ts`, per 3.4.
2. **Relative to the main as it goes out.** A repeat is `main.trigger + offset`, where `main.trigger` is the main's final instant, after a quiet-hours move. A main moved from 05:00 to 07:00 nags at 07:05 and 07:10, not at 05:05.
3. **Each repeat is judged on its own, by the existing rules.** It passes `quietHoursTrigger()` and then `reminderFires(trigger, window, location, now, reminder.anchor)`, so a repeat never falls more than 180 minutes before the window opens, never after the window's end (for a `followUp` reminder: within the 720 minutes after the end, as the main), and never strictly inside a holy block. A nag therefore never crosses the window's end: nagging after the time has passed is what a `followUp` reminder is for (and Q13).
4. **No main, no repeats.** When the main does not fire (dropped, marked, skipped, outside its range), none of its repeats is planned.
5. **One notification per instant per mitzvah.** `withoutMovedDuplicates()` becomes `withoutDuplicates()`: a group of two or more candidates of one mitzvah at one instant is reduced when any member moved **or any member is a repeat**; a main beats a repeat, then the later `dateKey`, then the lower `reminderIndex`, then the lower `k`. A coincidence of two unmoved mains still stays, as today.
6. **A mark clears everything.** A marked or skipped day plans nothing (as today), and `cancelForMitzvah(id, date)` cancels every pending repeat and dismisses the presented ones, because they carry the same `data.mitzvahId` and `data.dateKey`. `MARK_DONE` on any repeat clears the chain. `reminderDayEnded()` clears leftovers at the app day's end, as for any reminder.
7. **Thinning drops repeats first.** From `horizon.thinFromIndex` on (the third day), `thinned()` keeps the latest main at or before the window's end, never a repeat; the fallback for a window with only `followUp` or `blockExit` triggers picks its earliest main.
8. **The budget ladder** (3.7) keeps the plan inside the platform cap when nags are on.
9. **The preview is the plan.** `windowTriggers()` yields the repeats, so `nextReminderAt()` names a repeat when it is the next thing to fire, the mitzvah screen's rows and header agree with the schedule, and the editor's preview (4.3) is computed from the same function.
10. **Skip-if-done and the text button follow the main.** A repeat carries the main's `skipIfDone`, category, `hasText`, channel and content; the body variant is chosen from the main's trigger, so a chain reads one text.

### 3.6 Notification content (Q11)

- Title: unchanged (the mitzvah's name).
- Body: the main's body, then ` · ` and `notifications.nag.repeat` = "תזכורת %{k} מתוך %{n}" / "reminder %{k} of %{n}", so a user who sees three similar notifications knows the app is nagging as configured and how many are left. The owner may prefer identical text (Q11).
- Id: `${mitzvahId}__${YYYY-MM-DD}__${idx}[.${occurrence}]~${k}` (`buildId(mitzvahId, date, idx, occurrence, repeat)`); `parseId()` is unchanged, because it reads the index as an integer and stops at `.` or `~`.
- Payload: `data.repeat = { k, of }` on a repeat only; `data.reminderIndex` stays the reminder's index. `PendingNotificationMeta` gains `repeat?: { k: number; of: number }`.
- `SCHEDULE_FORMAT` goes from 10 to 11, so the first foreground after the update rebuilds once.

### 3.7 Capacity: Android is fine, iOS needs a ladder (Q14)

The cap is `planCap()`: 400 on Android, 60 on iOS, one slot of it the end-of-reminders notice. The default-on set on a plain weekday is 12 mains a day (tefillin 3, the Shema 2, Shacharit 2, Mincha 2, Maariv 2, the bedtime Shema 1).

| Level | Mains + repeats per day | Android (room 399) | iOS (room 59) today |
| --- | --- | --- | --- |
| 1 | 12 | ~30 days (thinning may already start near day 3 for a full set) | today, tomorrow, then one per window for ~6 days |
| 2 | 24 | 30 days, one per window from day 3 | today and tomorrow whole, then ~2 days |
| 3 | 36 | 30 days, one per window from day 3 | today whole, tomorrow's mains, then ~1 day |
| 4 | 48 | 30 days, one per window from day 3 | today's mains kept and its nags capped at 2 repeats (36, with the default set on a plain weekday: 48 plus tomorrow's 12 mains is 60, one over the room), tomorrow's mains |
| 5 | 72 | 30 days, one per window from day 3 | today alone does not fit: today's nags are capped at the first count that fits, 2 repeats (36) with the default set on a plain weekday, tomorrow's mains |

The ladder in `buildPlan()` (`src/services/notifications/plan.ts`), each stage only when the one before still exceeds the room:

1. The full plan (today).
2. Thin from `thinFromIndex`: one main per window from the third day (today's rule; repeats go with it).
3. **New:** drop every repeat from tomorrow on, and cap today's nags at `c` repeats, for `c` from `NAG_MAX_COUNT - 1` down to 0; the first `c` that fits wins. `c = 0` is level 1 for today, so the ladder never does worse than today's app.
4. Cut furthest first and place the end-of-reminders notice on the last whole day (today's rule).

What the user is told: Settings and the mitzvah sheet show, on iOS only and from level 3 up, `settings.nagLevelIosNote`: the system keeps 64 scheduled notifications, so at this level the reminders are planned for today and tomorrow and planned again every time the app opens; the end-of-reminders notice still warns when they run out. The mitzvah screen's caveat in the guide (a reminder named beyond tomorrow may not be scheduled on iOS) extends to repeats.

### 3.8 Level 5 and the time after the window (Q13)

The owner may want the top level to nag after the window has passed as well ("the time passed, mark it late?"), which the late-mark flow of 2026-10-29 makes meaningful. The planner already supports a `followUp` anchor for any mitzvah; only the editors offer it for custom mitzvot alone (the user's call, 2026-10-24). Not built until the owner answers. If yes: `NAG_LEVELS[5]` gains `followUpMin: [15]` and `windowTriggers()` adds one `followUp` trigger per listed minute with `skipIfDone`, labelled `reminder.followUp.label`.

### 3.9 Only mitzvah reminders (Q15)

The level and the nags apply to mitzvah reminders, custom mitzvot included, and to nothing else: the hilula and Rosh Chodesh notices are information, the check-in nudges already come three times, the weekly report and the pre-block notice are one-offs, and the taharah reminders keep their own quiet policy and discretion. The owner's words were "all the notifications" with the explanation "for a specific mitzvah or the default for the whole app", read here as every mitzvah reminder.

## 4. UX and UI

Every surface uses the shared components ([src/components/AGENTS.md](../../src/components/AGENTS.md)); the design lab study (task 5) proposes the look and the owner picks. The structure below is what the study starts from.

### 4.1 Settings → Device and notifications

Right after the notifications switch, before the weekly report switch:

```
רמת נודניקיות                              (field label, anchor `nagLevel`)
[ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ]               (SegmentedControl; each option named by the level's name)
בינוני: כל תזכורת חוזרת עוד פעמיים, כל 5 דקות.   (name + description of the chosen level)
כ-36 התראות ביום עם המצוות הפעילות.           (remindersPerDay() over the enabled mitzvot' effective reminders at this level)
אפשר לקבוע רמה אחרת לכל מצווה במסך שלה.       (hint)
[iOS, level 3 and up: the 64-notifications note]
```

A change writes `useUserStore.setNagLevel()`; the user-store subscription in `initNotificationHandlers()` rebuilds the schedule (add `nagLevel` to its watched keys). Search item `nagLevel` in `SETTINGS_SEARCH_ITEMS` with the words people type: נודניק, נודניקיות, רמת נודניקיות, תזכורות חוזרות, חזרות, כמה תזכורות, עוצמת תזכורות, נדנוד, nag, nagging, nag level, repeat reminders, repeats, snooze, persistence, intensity, reminder frequency.

### 4.2 The mitzvah screen (registry and custom)

In the reminders card, under its title and above the rows, one [ListRow](../../src/components/ListRow.tsx) (icon `bell`, chevron):

```
רמת נודניקיות
כמו בהגדרות האפליקציה: רגיל (1) · כ-2 התראות ביום     (or: "נמרץ (4) · כ-8 התראות ביום" for an override)
```

A tap opens a [BottomSheet](../../src/components/BottomSheet.tsx) titled `detail.nagLevel` with six `SheetAction`s, the current one `selected`: "כמו בהגדרות האפליקציה (רגיל, 1)" then the five levels, each captioned by its description and its per-day estimate for this mitzvah. A choice writes `useMitzvotStore.setNagLevel(id, level | null)` and closes the sheet; the mitzvot-store subscription rebuilds.

Each reminder row gains a third caption line when it nags: `nag.row.fromLevel` ("נודניק מהרמה: עוד 2 תזכורות, כל 5 דק׳ אחרי"), `nag.row.custom` ("נודניק: עוד 3 תזכורות, כל 5 דק׳, חצי-חצי") or `nag.row.none` ("בלי נודניק", only for an explicit `null` while the level would nag). The row's `detail.reminderNextAt` keeps naming `nextReminderAt(mitzvah, [reminder], scope)`, which now includes repeats; the header's next-reminder line too. Both pass the mitzvah's resolved level in the scope.

"חזרה לברירת מחדל" resets the reminders alone; the level keeps its own "כמו בהגדרות האפליקציה" choice in the sheet (`resetToDefault()` keeps `nagLevel`).

### 4.3 The reminder editor (the mitzvah screen's sheet)

A new shared block, `ReminderNagFields` (`src/components/ReminderNagFields.tsx`), between the send-time line and the label (Q12 for the three-state control):

```
נודניק
( לפי הרמה ) ( בלי ) ( מותאם )               (SegmentedControl)
לפי הרמה · בינוני (3): עוד 2 תזכורות, כל 5 דק׳ אחרי.   (caption; "בלי" says "התזכורת נשלחת פעם אחת")

— with "מותאם":
כמה פעמים         [ - ]  3  [ + ]            (1 to 5)
כל כמה דקות       ( 3 ) ( 5 ) ( 10 ) ( 15 )  (ChipRow)
מתי               ( לפני ) ( אחרי ) ( חצי-חצי )  (SegmentedControl)

התזכורות החוזרות: 08:55 · 09:00 · 09:05      (preview, goldText; a dropped one: "09:40 אחרי סוף הזמן, לא תישלח" in urgent)
```

The preview is `nagPreview(mitzvah, draft, scope)` from the scheduler facade (and the web shim): the repeats of the draft's next main, each with whether it fires, computed by `windowTriggers()` itself, so the editor never promises a repeat the plan drops. Save stores `nag` as an object, `null`, or leaves it absent; it never refuses a nag, and a nag whose every repeat is dropped shows the preview's warning and saves. The existing send check (`nextReminderAt(mitzvah, [draft])` with no level) is unchanged.

### 4.4 The custom mitzvah form

Each reminder card gets the same `ReminderNagFields` under its timing fields, with a preview from `nagClockPreview(startHHMM, endHHMM, reminder)` in `src/utils/customMitzvah.ts` beside `reminderClock()` (the same bounds, printed as clocks, since the mitzvah may not exist yet). The reminders section also gets an [OptionSelect](../../src/components/OptionSelect.tsx) "רמת נודניקיות למצווה" with "כמו בהגדרות האפליקציה (n)" and the five levels, each captioned; save writes `useMitzvotStore.setNagLevel(id, value)` after the form's `resetToDefault()` (which keeps it). Save keeps `nag` on every reminder it writes.

### 4.5 Notifications

A chain in the tray: the main, then its repeats as separate notifications (each tray entry is one OS request), each with the same buttons; marking from any one of them clears the rest. The body suffix (3.6) tells them apart.

### 4.6 The guide and what's new

The `reminders` topic of `src/data/guide.ts` gains a paragraph on the level (Settings, per mitzvah) and the nag (the editor, custom mitzvot), the iOS note, and `WHATS_NEW` an entry labelled `1.0.21-10` (the next production update after `1.0.21-9`); `pnpm guide:build` rewrites `docs/guide/`.

### 4.7 Unchanged

Onboarding (no level step: the default is 1), home, history, the check-in, the other notice kinds (3.9), the Android notification channels and the Kotlin mark-done service (a native change would need a build).

## 5. Data model and persistence

- `src/types/mitzvah.ts`: `Reminder.nag?: ReminderNag | null`; `ReminderNag`, `NagPlacement` and `NagLevel` exported from `src/utils/nagging.ts` (types only may live in `src/types/mitzvah.ts`; keep one home). Optional, so no `STORE_VERSION` bump anywhere.
- `useUserStore`: `nagLevel: NagLevel`, 1 by default and for an older payload; `setNagLevel(level)` accepts only an integer 1 to 5 and otherwise returns the state as it is (no subscriber fires); the `merge` repairs anything else to 1; `reset()` returns it to 1; it rides the backup file with the store.
- `useMitzvotStore`: `ActiveMitzvahState.nagLevel?: NagLevel` (absent means "like the app"); `setNagLevel(id, level | null)` writes or deletes the field on the entry (creating `{ enabled: false }` for a missing id, as `setReminders` does); the `merge` drops an invalid saved value; `resetToDefault()` keeps it; `removeMitzvah()` drops it with the entry. It rides the backup file.
- `Reminder.nag` persists inside `customReminders` (mitzvot store) and inside `CustomMitzvah.reminders` (custom mitzvot store) as part of each reminder; the custom form's `cleanedReminders` keeps it.
- `PlanInput`: `nagLevel: NagLevel` and `nagLevels: Record<string, NagLevel>` (the overrides of the planned mitzvot), read in `readPlanInput()`; `ReminderScope` gains optional `nagLevel`, the resolved level of the mitzvah asked about (absent means 1, so every existing caller and test keeps its behaviour).

## 6. Contracts by file

**`src/utils/nagging.ts` (new, pure)** - `NagLevel`, `NagPlacement`, `ReminderNag`, `NAG_LEVELS`, `NAG_MAX_COUNT`, `NAG_INTERVALS_MIN`, `NAG_LEVEL_IDS = [1, 2, 3, 4, 5]`, `isNagLevel()`, `isReminderNag()`, `nagFor(reminder, level)`, `repeatOffsets(nag)`, `repeatsPerReminder(reminder, level)` and `remindersPerDay(reminders, level)` (the estimate the screens print: `Σ (1 + count)`).

**`src/services/notifications/planners/mitzvot.ts`** - `WindowTrigger` gains `repeat: number` (0 for a main). `ownTriggers()` plans each main as today, then its repeats per 3.5 (quiet hours, `reminderFires()` with the reminder's anchor). `windowTriggers()` passes repeats through; its clock-heads-up comparison still compares mains only. `thinned()` considers mains only. `candidatesFor()` builds a repeat's candidate with the main's body plus the suffix, `data.repeat`, and `buildId(..., repeat)`. `withoutDuplicates()` per 3.5.5. `planMitzvot(input, horizon, thin?)` takes `{ from: Date; repeatsFrom?: Date; todayRepeatCap?: number }` in place of the bare `thinFrom`, for the ladder. `nextReminderAt()` unchanged in signature; it reads `scope.nagLevel`. New `nagPreview(mitzvah, draft, scope): { trigger: Date; fires: boolean }[]`.

**`src/services/notifications/ids.ts`** - `buildId(mitzvahId, date, idx, occurrence = 0, repeat = 0)`; `PendingNotificationMeta.repeat?`; `SCHEDULE_FORMAT = 11`.

**`src/services/notifications/plan.ts`** - the ladder of 3.7.

**`src/services/notifications/types.ts`, `snapshot.ts`** - `nagLevel`, `nagLevels` on `PlanInput`, read from the stores.

**`src/services/NotificationScheduler.ts`, `NotificationScheduler.web.ts`** - export `nagPreview` from both (`schedulerWebParity.test.ts`); the user-store subscription rebuilds on `nagLevel`; the mitzvot-store subscription already rebuilds on any change of `activeMitzvot`.

**`src/stores/useUserStore.ts`, `src/stores/useMitzvotStore.ts`** - per section 5.

**`src/utils/customMitzvah.ts`** - `nagClockPreview()`.

**`src/components/ReminderNagFields.tsx` (new)** - the block of 4.3, stateless like `ReminderTimingFields` (`mode`, `nag`, `level`, `onChange`, `preview`, `inline`, `style`).

**`src/components/ReminderEditor.tsx`** - the block, the preview, the stored `nag`.

**`src/app/mitzvah/[id].tsx`** - the level row and sheet, the row lines, the resolved level in both scopes.

**`src/app/(tabs)/settings.tsx`** - the control of 4.1 with its anchor.

**`src/app/custom-mitzvah.tsx`** - the block in each reminder card, the level select, the store write on save.

**`src/utils/settingsSearch.ts`** - the `nagLevel` item.

**`src/data/guide.ts`** - the paragraph and the what's-new entry.

## 7. i18n keys (both dictionaries; plain hyphens, no nikud)

| Key | he | en |
| --- | --- | --- |
| `settings.nagLevel` | רמת נודניקיות | Nagging level |
| `settings.nagLevelHint` | קובע כמה פעמים כל תזכורת חוזרת. במסך של כל מצווה אפשר לקבוע לה רמה משלה. | How many times each reminder repeats. Each mitzvah's screen can set its own level. |
| `settings.nagLevelPerDay` | כ-%{n} התראות ביום עם המצוות הפעילות | About %{n} notifications a day with the mitzvot that are on |
| `settings.nagLevelIosNote` | באייפון המערכת שומרת עד 64 התראות מתוכננות, ולכן ברמה זו התזכורות מתוכננות להיום ולמחר ונקבעות מחדש בכל פתיחה של האפליקציה. | iPhone keeps up to 64 scheduled notifications, so at this level reminders are planned for today and tomorrow and planned again each time the app opens. |
| `nag.level.1.name` … `nag.level.5.name` | רגיל · עדין · בינוני · נמרץ · נודניק | Regular · Gentle · Medium · Firm · Nagging |
| `nag.level.1.desc` | כל תזכורת נשלחת פעם אחת | Each reminder is sent once |
| `nag.level.n.desc` (2-5) | כל תזכורת חוזרת עוד %{count}, כל %{every} דקות | Each reminder repeats %{count} more times, every %{every} minutes |
| `detail.nagLevel` | רמת נודניקיות | Nagging level |
| `detail.nagLevelApp` | כמו בהגדרות האפליקציה (%{name}, %{level}) | Like the app settings (%{name}, %{level}) |
| `detail.nagLevelPerDay` | כ-%{n} התראות ביום | About %{n} notifications a day |
| `nag.title` | נודניק | Nag |
| `nag.mode.level` | לפי הרמה | By the level |
| `nag.mode.none` | בלי | None |
| `nag.mode.custom` | מותאם | Custom |
| `nag.mode.levelCaption` | לפי הרמה · %{name} (%{level}): %{effect} | By the level · %{name} (%{level}): %{effect} |
| `nag.mode.noneCaption` | התזכורת נשלחת פעם אחת | The reminder is sent once |
| `nag.effect` | עוד %{count} תזכורות, כל %{every} דק׳ %{placement} | %{count} more, every %{every} min, %{placement} |
| `nag.effect.none` | ללא חזרות | no repeats |
| `nag.count` | כמה פעמים | How many times |
| `nag.count.less` / `nag.count.more` | פעם אחת פחות / פעם אחת יותר | One fewer / One more |
| `nag.every` | כל כמה דקות | Every how many minutes |
| `nag.every.option` | %{n} דק׳ | %{n} min |
| `nag.placement` | מתי | When |
| `nag.placement.before` / `after` / `around` | לפני / אחרי / חצי-חצי | Before / After / Half and half |
| `nag.preview` | התזכורות החוזרות: %{times} | The repeats: %{times} |
| `nag.previewDropped` | %{time} אחרי סוף הזמן, לא תישלח | %{time} is after the end, not sent |
| `nag.previewAllDropped` | כל החזרות נופלות אחרי סוף הזמן ולא יישלחו | Every repeat falls after the end and none is sent |
| `nag.row.fromLevel` | נודניק מהרמה: עוד %{count}, כל %{every} דק׳ %{placement} | Nag from the level: %{count} more, every %{every} min, %{placement} |
| `nag.row.custom` | נודניק: עוד %{count}, כל %{every} דק׳, %{placement} | Nag: %{count} more, every %{every} min, %{placement} |
| `nag.row.none` | בלי נודניק | No nag |
| `custom.nagLevel` | רמת נודניקיות למצווה | The mitzvah's nagging level |
| `notifications.nag.repeat` | תזכורת %{k} מתוך %{n} | reminder %{k} of %{n} |

## 8. Tests

- `src/utils/__tests__/nagging.test.ts`: the table, `nagFor()` resolution (object, `null`, absent, malformed), `repeatOffsets()` for every placement and odd counts, `remindersPerDay()`.
- `src/services/notifications/__tests__/nag.mitzvot.test.ts` (also under `pnpm test:tz`): through `buildPlan()` on a fixed `PlanInput`: the repeats of a level and of an explicit nag, their ids, bodies and payload; relative to a moved main under quiet hours and the collapse of repeats onto one instant; a repeat dropped after the window's end and inside a holy block (candle lighting with "after"); no repeats for a marked day; a `followUp` reminder's repeats inside its 720 minutes; `blockExit` occurrences with repeats; thinning keeping mains only; `nextReminderAt()` agreeing with the first candidate; `nagPreview()` agreeing with the plan.
- `src/services/notifications/__tests__/nagBudget.test.ts`: the ladder on `platform: 'ios'` at levels 3, 4 and 5 (today's mains always kept, tomorrow's repeats gone first, today's nags capped to the first fitting count) and on Android (no stage reached at level 5 with the default set); the end notice's day.
- `src/services/__tests__/schedulerWebParity.test.ts`: `nagPreview`.
- `src/stores/__tests__/nagLevel.store.test.ts`: both stores' defaults, setters, refusals, `resetToDefault()` keeping the level, reset and merge repair; `src/services/__tests__/BackupService.test.ts`: the fields ride a backup.
- `src/app/__tests__/settings.nagLevel.render.test.tsx`: the control, the caption, the estimate, the iOS note, the anchor; `src/utils/__tests__/searchCoverage.test.ts` and `settingsSearch.test.ts`: the item and its words.
- `src/app/__tests__/mitzvah.nag.render.test.tsx`: the row and sheet, the override written and cleared, the row lines, the header naming a repeat.
- `src/components/__tests__/ReminderEditor.render.test.tsx` and `ReminderNagFields.render.test.tsx`: the three modes, the fields, the preview with a dropped repeat, the saved `nag`.
- `src/app/__tests__/customMitzvah.render.test.tsx`: the block in a card, `nagClockPreview()`, the level select written on save.
- `src/data/__tests__/guide.test.ts`: the web copy; `src/i18n/__tests__/i18n.test.ts`: key parity.
- An emulator run (task 11): a 3 × 3-minute nag arrives as three notifications and a mark-done on the first clears the other two.

## 9. Docs (the DOX pass, in the same change as each task)

Root `AGENTS.md` (Mitzvah Data Model: `nag`; Notification Engine: repeats, ids, dedupe, the ladder, `SCHEDULE_FORMAT` 11; State and Persistence: both `nagLevel`s; Common Change Checklist: a new reminder field reaches the editor, the custom form, `windowTriggers()` and the preview together), `src/types/AGENTS.md`, `src/utils/AGENTS.md` (`nagging.ts`, `nagClockPreview()`), `src/services/notifications/AGENTS.md`, `src/services/AGENTS.md` (the id grammar), `src/stores/AGENTS.md`, `src/components/AGENTS.md` (`ReminderNagFields`, the editor's order), `src/app/AGENTS.md` (the custom form), `src/app/(tabs)/AGENTS.md` (Settings), `src/app/mitzvah/AGENTS.md`, `design/lab/AGENTS.md` (the study).

## 10. Open questions (owned by the owner; the assumptions are what gets built until answered)

| Q | Question | Assumption | Recommendation |
| --- | --- | --- | --- |
| Q9 | The level table: names, counts, intervals (3.2) | the table as written | keep; it is one constant |
| Q10 | The chips: intervals 3, 5, 10, 15 minutes and a count of 1 to 5 | as written | keep 10 and 15 for gentle nags |
| Q11 | A repeat's body: the suffix "תזכורת k מתוך n", or identical text | the suffix | the suffix: the user sees the chain is intentional and how long it is |
| Q12 | The per-reminder control: three states (by the level / none / custom) or two (level / custom) | three | three: it is the only way to exempt one reminder from a level |
| Q13 | Level 5 also nags after the window (a follow-up 15 minutes after the end, while not marked), registry mitzvot included | not built | yes, at level 5 only, now that a late mark is a real action |
| Q14 | iOS at high levels: the ladder of 3.7 plus the note from level 3 | built as written | keep; the cap is the platform's |
| Q15 | The level applies to the other notice kinds too (hilulot, Rosh Chodesh, the weekly report, the check-in nudges, the pre-block notice, taharah) | mitzvah reminders only | no (3.9) |

## 11. Task map

Phase A, the logic (no UI; can start on the assumptions): tasks 1 to 4.
Phase B, the look: task 5, the design lab study, the owner's pick.
Phase C, the surfaces, on the pick: tasks 6 to 9.
Phase D, the words and the proof: tasks 10 and 11, then one preview update (`pnpm update:preview`) for the owner's phone check, then production with the owner's approval.

## 12. Out of scope

A snooze button on the notification itself (iOS and Android offer no reliable per-notification snooze through expo-notifications without native work), nagging for the notice kinds of 3.9, a native change of any kind, and an onboarding step for the level.
