# Spec: smart nag (critical zone per mitzvah type)

Status: characterized with the owner on 2026-11-04, Q1 to Q3 answered yes the same day ("1 כן, 2 כן, 3 כן"), built on 2026-11-04. Replaces the per-reminder repeats of [nagging-levels.md](nagging-levels.md) (section 3.1's chosen model). The owner's words are quoted where a rule comes from them.

## 1. Why

Today a level multiplies every reminder: at level 4 each reminder becomes four notifications, five minutes apart, wherever the reminder falls, even hours before the end. The owner (2026-11-04): "לא מרוצה משיטת הכפלת התראות סביב תזכורת ... נדרש מנגנון אחר פרקטי ואמיתי יותר ולא כזה שיוצר עומס התראות צפופות". The new model spends the extra notifications once per mitzvah window, where missing the mitzvah is a real risk.

## 2. Rules

### 2.1 Reminders stay as they are

A mitzvah's reminders (registry or custom, as edited) go out once each, unchanged. The level adds extra notifications ("nags") on top; level 1 (רגיל) adds none. The per-reminder nag of the reminder editor and the custom form (`Reminder.nag`) is retired; only the app level and the mitzvah's own level remain.

### 2.2 Time to perform, and the last-chance points

Every mitzvah has a time to perform it (`performMin`). Prayers have two, alone and with a minyan:

| Mitzvah | Alone | Minyan |
|---|---|---|
| Shacharit | 20 | 45 |
| Mincha | 10 | 20 |
| Maariv | 10 | 20 |
| Morning Shema, tefillin, bedtime Shema | 5 | – |
| Chok LeYisrael | 15 | – |
| Custom mitzvah | form field, 10 by default | – |

A **last-chance point** is `end − performMin`: the last moment to start and still finish in time. A prayer with two durations has two last-chance points, and both get a nag whatever the app's prayer mode says. The owner: "שיהיה התראה לשניהם ב 2 הזמנים הסופיים ... מבלי להתייחס למה הוגדר באפליקציה כדי לתת למשתמש צאנס לפחות ביחיד להספיק". The last point (alone) is marked ❗ with "הזמן האחרון להתחיל"; the minyan point ⚠️ with "הזמן האחרון להתחיל במניין". They go out at every level, level 1 included (Q1, yes).

### 2.3 The critical zone, by kind of mitzvah

Nags fall only inside the mitzvah's critical zone, which follows its kind and timing. The owner: "כל קטגוריה יש לה את התחום זמן הקריטי שלה ששם נכנס הנודניק". The window's end is never moved: a mitzvah that may be done all night keeps the whole night ("חצות לילה זה לא סוף זמן מבחינתי").

| Kind | Mitzvot | Critical zone | After the zone |
|---|---|---|---|
| Day, bounded | morning Shema, Shacharit, Mincha, tefillin, custom by day | the last third of the window, up to the last-chance points | — |
| Night, until dawn | Maariv, bedtime Shema, Omer | tzeit (or the window's start) to chatzot halayla ("לפני שהמשתמש ישן ... עד חצות בערך") | sparse: one nag an hour at most, then the last-chance points before alot; quiet hours apply (Q2, yes) |
| Start-weighted | Chanukah candles | the first hour from the window's start (the main time of lighting) | sparse until the end |
| Short | candle lighting | the last 20 minutes | — |
| Long, after a block | havdalah | the evening of the block's exit, to chatzot | sparse until the end |
| Multi-day | Kiddush Levana | the last three nights of the period, tzeit to chatzot each night | — |
| Pre-dawn | Selichot | the last third, before alot | — |
| Learning day | Chok LeYisrael | shkia to chatzot of the learning day | sparse until alot |
| Custom | custom mitzvot | the last third, like a bounded day mitzvah | — |

### 2.4 How many, and where

- Count by level: Gentle 1, Medium 2, Nag 3 nags in the critical zone, plus the last-chance points of 2.2.
- They are spread evenly over the zone; the zone's last nag is the earliest last-chance point when it falls inside the zone.
- No two notifications of one mitzvah are closer than 10 minutes, the reminders included; a nag that would fall closer is dropped, and when the zone is too short fewer nags go out.
- Nothing goes out once the mitzvah is marked done or skipped, inside a holy block, or (moved or dropped) in the quiet hours.

### 2.5 Marks and colour

Stage by place, as built on 2026-11-04 for reminders: the reminders are green; the zone's nags ⚠️ (orange); the last notification of the window ❗ (red). The time line keeps the time left first, then the end.

## 3. Out of scope

The reminder editor's own nag block and the custom form's are removed; the Settings level control and its example stay, the example redrawn on the new model. A native build is not needed: everything is JavaScript and ships over the air.

## 4. Answers

- **Q1** (last-chance points at level 1 too?): yes.
- **Q2** (after the night zone): at most one nag an hour, then the last-chance points before alot; quiet hours apply. Yes.
- **Q3** (the durations of 2.2 and the zones of 2.3): approved as listed.

## 5. Decisions made while building (2026-11-04), for the owner to confirm or reverse

- **A nag never comes before the mitzvah's first reminder.** The zone and its tail open no earlier than the window's first reminder, so the bedtime Shema nags from its 23:00 reminder, not from nightfall.
- **A zone nag that lands within 10 minutes of a reminder moves** to the middle of the zone's widest free stretch, instead of being dropped (Mincha at level 2: its one nag fell on the "one hour left" reminder).
- **Every other registry mitzvah takes 5 minutes** (a blessing, the Omer count, lighting, havdalah, Selichot), and **Kiddush Levana has no last-chance point**: its period ends by the molad, often in daylight, so its last night's nag is its last.
- **Candle lighting gets no nags.** Its window, lighting time to shkia, is inside Shabbat, where nothing is sent.
- **The night mitzvot's last-chance points fall just before alot** (Maariv about 04:30 and 04:45, the bedtime Shema about 04:50 in a Jerusalem winter), at level 1 too. Only the quiet hours, off by default, keep them out.
- **A full schedule gives up the later days' nags before any reminder.** From the third day on, the nags are dropped first, and only if the reminders alone still do not fit is each window thinned to one reminder. On iOS the opening days' nags outrank the later days, so a default iOS plan reaches one or two days less before its end notice.
- **The mitzvah screen's "next reminder" names reminders only**, never a nag. **Home's bell shows only for a level above 1.** The last-chance points of level 1 bring no bell.
- **A reminder's own nag from the 2026-11-01 model is ignored**, and it is dropped on the next save. The `SCHEDULE_FORMAT` is 13, so every install rebuilds once.
