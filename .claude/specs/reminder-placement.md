# Reminder placement per mitzvah, aligned with the critical zone

Status: characterization, 2026-11-05. Awaiting the owner's decisions (section 5). Nothing here is built.

## 1. The owner's report

"אני חושב שלא טיפלנו בפיזור התראות על כל מצווה בצורה חכמה… צריך לחזור שלב אחורה ולאפיין מחדש איפה לפזר התראות על כל סוג מצווה ומצווה, כדי שיהיו התראות מספיק בתוך חלון הזמן, על מנת שנוכל לפזר עליהם את הנודניקים" (2026-11-05, with a screenshot of the bedtime Shema's timeline).

The smart nag ([smart-nag.md](smart-nag.md)) defined a critical zone per kind of mitzvah, but the default reminders it builds on predate it: they were set as fixed offsets from the window's edges, never placed against the zone. Because the zone "opens no earlier than the first reminder" (`smartNagTimes()` in [src/utils/nagging.ts](../../src/utils/nagging.ts)), a reminder in the wrong place shrinks or empties the zone, and the nags crowd into the leftover.

## 2. Measurement

Every registry mitzvah with its `defaultReminders`, Jerusalem, Sefard, `NO_QUIET_HOURS`, through `windowTimeline()` (the planner itself). `R` = reminder, `n` = nag, `L` = last-chance point. Level 1 sends no zone nags, and level 4 sends three.

| Mitzvah (day) | Window | Zone | Level 4 sends |
| --- | --- | --- | --- |
| tefillin (Wed 11 Nov) | 04:59–16:47 | 12:51–16:47 | R04:59 R07:59 n13:48 n14:46 n15:44 R16:02 L16:42 |
| krias_shma_shacharit | 06:04–08:40 | 07:48–08:40 | R06:04 n07:59 R08:10 n08:22 L08:35 |
| shacharit | 06:04–09:34 | 08:24–09:34 | R06:04 n08:30 R08:49 L09:14 |
| mincha | 11:54–16:47 | 15:09–16:47 | R11:54 n15:28 R15:47 n15:57 n16:07 L16:27 L16:37 |
| maariv | 17:00–04:54 | 17:00–23:24 | R17:00 n18:36 R19:00 n20:12 n21:48 n00:41 n01:59 n03:16 L04:34 L04:44 |
| birchot_hashachar | 04:53–11:23 | 09:13–11:23 | R04:53 n09:44 n10:15 n10:46 L11:18 |
| krias_shma_al_hamita | 17:00–04:54 | 17:00–23:24 | R23:00 n23:12 n00:45 n02:06 n03:27 L04:49 |
| sefirat_haomer (22 Apr) | 19:34–04:36 | 19:34–00:38 | R19:34 R20:34 n20:50 n22:06 n23:22 n01:55 n03:13 L04:31 |
| chanukah_candles (7 Dec) | 16:53–05:18 | 16:53–17:53 | R16:53 n17:08 n17:23 n17:38 n20:43 n23:33 n02:23 L05:13 |
| candle_lighting (Fri 13 Nov) | 16:26–16:46 | 16:26–16:46 | R16:26 (the rest is inside the block) |
| havdalah (Sat 14 Nov) | 17:16–18:46 | 17:16–18:46 | R17:16 n17:37 n17:58 n18:19 L18:41 |
| ushpizin (27 Sep) | 18:49–05:13 | 18:49–00:31 | R18:49 n20:14 n21:40 n23:05 n01:40 n02:49 n03:58 L05:08 |
| selichot (night of 6 Sep) | 00:38–10:28 | 03:30–04:56 | R00:38 n03:51 n04:13 n04:34 L10:23 |
| chok_leyisrael (11 Nov) | 04:53–04:54 | 16:47–23:24 | R09:00 n18:26 n20:05 n21:44 n00:42 n02:01 n03:20 L04:39 |

Kiddush Levana was not on a probed night; its zone (the last three nights) is unchanged by this spec.

## 3. Findings

1. **A reminder at the zone's end eats the zone.** The bedtime Shema's only reminder is a clock 23:00, 24 minutes before the zone's end (chatzot, 23:24). The zone opens at the first reminder, so it is 23:00–23:24, its nags fall at 23:12 and the rest go to the tail.
2. **Nags in the middle of the night.** The night kinds' sparse tail (maariv, bedtime Shema, Omer, Ushpizin, Chanukah, Chok LeYisrael) sends a nag about every 80 minutes from chatzot to dawn (00:41, 01:59, 03:16). With quiet hours off by default, this wakes the user.
3. **Last-chance points nobody acts on.** Maariv, the bedtime Shema, Ushpizin, the Chanukah candles and Chok LeYisrael send their last chance a few minutes before alot (04:34–05:13). Maariv's own description says "לכתחילה עד חצות".
4. **A minyan last-chance point that shrinks the zone.** The zone ends at the earliest last-chance point. Shacharit's minyan point (end − 45, 08:49) coincides with its `end −45` reminder, which leaves a 25-minute zone (08:24–08:49) and one nag at level 4 instead of three.
5. **Openers at dawn.** Tefillin opens at misheyakir (04:59) and Birchot HaShachar at alot (04:53). Both reminders go out at 5 am.
6. **Leftover reminders the zone already covers.** Tefillin's `start +180` (07:59), the morning Shema's `end −30`, Mincha's `end −60` and Maariv's `start +120` were the old nags-by-hand; the zone and the last-chance points now cover them. Where they land inside the zone they take its slots, and outside it they add noise.

## 4. Proposed rules (recommendation)

- **P1. Two default reminders per window, both placed against the zone.** An *opener* when the mitzvah becomes possible, at a waking hour, and a *zone opener* at the zone's start, which keeps the whole zone for the nags. The zone opener is a new anchor, `zone` (offset in minutes from the zone's start), so it follows the zone every day of the year as the zmanim move. Where the zone starts at the window's start, the two are one reminder.
- **P2. No nag between chatzot halayla and alot** for any kind whose zone ends at chatzot (the night kinds, Chanukah, Chok LeYisrael): the sparse tail stops at chatzot. Selichot, which lives before dawn, keeps its zone.
- **P3. A last-chance point only where someone acts on it.** For the night kinds the last-chance point moves to chatzot (maariv, the bedtime Shema, the Omer, Ushpizin, Chok LeYisrael) or is dropped; this is a halachic choice for the rav (section 5).
- **P4. The zone ends at the latest last-chance point**, so a prayer's minyan point sits inside the zone instead of cutting it.
- **P5. Openers at a waking hour.** A morning opener goes out at sunrise (netz), not at misheyakir or alot, unless the window starts later.

Per mitzvah under P1–P5:

| Mitzvah | Opener | Zone opener | Zone | Last chance |
| --- | --- | --- | --- | --- |
| tefillin | netz | zone start (last third) | last third | end − 5 |
| krias_shma_shacharit | start (netz) | zone start | last third | end − 5 |
| shacharit | start | zone start | last third, to the alone point | minyan and alone |
| mincha | start | zone start | last third | minyan and alone |
| birchot_hashachar | netz | zone start | last third | end − 5 |
| maariv | start | — (zone = window start) | start to chatzot | chatzot (rav) |
| krias_shma_al_hamita | — | zone start, the zone becoming the 2 hours before chatzot | chatzot − 120 to chatzot | chatzot (rav) |
| sefirat_haomer | start | — | start to chatzot | chatzot (rav) |
| ushpizin | start | — | start to chatzot | chatzot (rav) |
| chanukah_candles | start | — | first hour, tail to chatzot | the rav's latest lighting |
| chok_leyisrael | 09:00 clock (the owner's call of 2026-10-23) | zone start (shkia) | shkia to chatzot | chatzot |
| selichot, havdalah, candle_lighting, kiddush_levana | unchanged | | | |

## 5. Decisions for the owner

1. P1: the new `zone` anchor for the default reminders (recommended), or fixed offsets tuned by hand per mitzvah.
2. P2: no nags between chatzot and alot (recommended).
3. P3: the night kinds' last chance at chatzot. Halachic, so it goes to the rav through [docs/halacha-review.html](../../docs/halacha-review.html) either way; until then the recommendation is chatzot for maariv and the bedtime Shema and no last-chance point for the Omer and Ushpizin.
4. The bedtime Shema's zone: the two hours before chatzot (recommended), or from nightfall.
5. Existing installs: a user who never edited a mitzvah's reminders gets the new defaults through an OTA update; one who edited them keeps theirs (their `customReminders` override).

## 5a. The marks: one orange and one red per window (the owner, 2026-11-05)

The owner's rule: a window has exactly two marked notifications, one orange ⚠️ before the end and one red ❗ last; every other notification, reminders and zone nags alike, is plain. Today `sendStage()` in [src/utils/timeLeft.ts](../../src/utils/timeLeft.ts) marks every zone nag orange (up to three at level 4, plus a prayer's minyan point), and a mitzvah with one duration has no orange at all at level 1. Decisions:

1. The orange of a mitzvah with one duration (tefillin, the Shema, Birchot HaShachar, a custom mitzvah). Recommended: a "time is running out" notification 15 minutes before the red one, at every level. A prayer's orange stays its minyan point.
2. Zone nags unmarked ("עוד לא סימנת", no ⚠️). Recommended: yes.
3. The zone ends at the alone (red) point, so the orange sits inside it (P4).

## 6. What it touches once approved

`defaultReminders` in [src/data/mitzvot.ts](../../src/data/mitzvot.ts); a `zone` anchor in the `Reminder` type, `windowTriggers()`, `reminderFires()`, the reminder editor, the timeline (a drag converts it to `start` / `end`) and `timingSummary()`; `NAG_ZONE_KIND`, `hasSparseTail()` and the zone's end in [src/utils/nagging.ts](../../src/utils/nagging.ts); [smart-nag.md](smart-nag.md); `SCHEDULE_FORMAT`; the guide; the dated suites in [src/services/notifications/__tests__/](../../src/services/notifications/__tests__).
