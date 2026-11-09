# Home bento: the default of each zone

The owner's pick of 2026-11-09 in the design study [design/lab/studies/2026-11-08-home-schedule/](../../design/lab/studies/2026-11-08-home-schedule/AGENTS.md) (`R4Bento`): round 3's bento inside the home hero, in place of the zmanim strip, with the "now" and "mine" rows merged and an edit mode. This spec answers the owner's question of the same day: what each zone should show by default, for heavy daily use and for function.

## Principles

1. **One question per zone.** The big tile answers "what do I have to do next, and how long do I have". The four small tiles answer "what are today's times". The row answers "what is special now, and what did I ask for".
2. **Stable where the eye returns, smart where it glances.** The four small tiles never change their order or meaning during a day; only the big tile and the row change with the hour and the period. A user learns where "שקיעה" is and finds it there every day.
3. **Derived from the user, not from a generic luach.** Defaults come from the mitzvot the user switched on and from their halachic opinions, so a new user sees a board that already fits them and rarely needs the edit mode.
4. **Never the same time twice in view.** When the next time is also a small tile, the small tile gets the gold ring and the big tile still shows it with the time left. The row never repeats a time shown in a tile.
5. **The cards keep their room.** The default is two tile rows plus the row (about 155 points). The edit mode may add a third tile row, never more.

## Zone 1: the big tile, "הבא" (2×2)

Shows one time, chosen by the first rule that matches:

| # | Rule | Example |
|---|---|---|
| 1 | The end of an open window of an enabled mitzvah the user has not marked, if it ends within 3 hours | סוף זמן ק״ש 08:39, בעוד 57 דק׳ |
| 2 | A time of the period, today: candle lighting from chatzot on an erev Shabbat or Yom Tov, the Chanukah candles from plag, the end of a fast from mincha gedola | הדלקת נרות 16:21 |
| 3 | The opening of the next window of an enabled mitzvah | צאת הכוכבים, ערבית |
| 4 | The next zman of the day | חצות הלילה |

- Content: the kind (הבא · קבוע / עכשיו / שלי), the name, the time large, the time left, and a ring that fills as the time nears. Within 45 minutes of an end the time turns red (the app's urgent rule).
- Tap: opens the mitzvah whose window it ends or opens; for a plain zman, moves the arc to that time.
- When the user has marked the mitzvah, its end drops out of rule 1 at once, so the tile moves on by itself.

## Zone 2: the four small tiles

One tile per daily deadline of the user's enabled mitzvot, in time order, with the time from the user's own opinion:

| Profile | Tiles |
|---|---|
| Default (Shema, Shacharit, Mincha, Maariv on) | סוף ק״ש, סוף תפילה, שקיעה, צאת הכוכבים |
| Shema off | הנץ instead of סוף ק״ש |
| Shacharit off | חצות היום instead of סוף תפילה |
| A woman whose prayers are off | הנץ, חצות היום, שקיעה, צאת הכוכבים |

- סוף ק״ש follows `halachicOpinions.ksSofZman` (GRA by default, MGA when the user chose it), so the tile and the reminders agree.
- On an erev Shabbat or Yom Tov the שקיעה tile reads הדלקת נרות with its time; the block covers the evening anyway.
- A passed tile stays in place, dimmed. After צאת הכוכבים the morning tiles show tomorrow's times, labelled מחר, because at night the only use of a morning time is planning the next morning. (Not drawn in the study yet.)
- Tap: moves the arc to that time; long press opens the edit mode on that tile.

## Zone 3: the row, "עכשיו ושלי"

One full-width row, scrolled sideways. In view, in this order:

1. **Now**, up to two times, gold: the times the hour and the period add, by the study's scores (an unmarked mitzvah's end first, a period time always). Examples by period:

| Period | Now |
|---|---|
| Dawn (alot to netz) | זמן תו״ט, הנץ |
| Morning (to chatzot) | סוף תפילה, סוף ק״ש מג״א (if the opinion is GRA) |
| Noon (to plag) | מנחה גדולה, פלג המנחה |
| Evening (to tzeit) | שקיעה, צאת הכוכבים |
| Erev Shabbat or Yom Tov | הדלקת נרות; on Chanukah also the Chanukah candles |
| Motzaei Shabbat | צאת השבת, havdalah |
| Night | חצות הלילה, עלות השחר |
| A fast day | סוף הצום |

2. **Mine**, outlined: the times the user pinned, in time order, the passed ones dimmed.
3. **+**, which opens the pin list: "מומלץ לך" first, each suggestion with its reason read from the user's mitzvot and marks (זמן תו״ט for tefillin, חצות הלילה for the bedtime Shema, פלג המנחה for one who marks Mincha late, הדלקת נרות of the week for planning), then the other zmanim.
4. Past a divider, a sideways scroll away: the rest of the day's zmanim, future first, then the passed ones.

A period with no time of its own (Rosh Chodesh, Kiddush Levana) gets one badge line above the bento, never a chip in the row.

## The edit mode

- Entry: the "עריכה" button above the bento, and a long press on any tile. Exit: "סיום". "איפוס" restores the defaults above.
- Select a tile, then one toolbar under the bento: החלפה (another zman), גודל (קטן 1×1, רחב 2×1, גדול 2×2; the big "הבא" tile is at least רחב), הזזה (one step each way), הסרה. Dragging a tile also reorders it, but every action has a button, so nothing depends on dragging.
- "+ אריח" adds any zman of the day, הדלקת נרות of the week, or a removed special widget (הבא, the row).
- Limits: at most three tile rows plus the row; the row stays full width.
- Store: the layout in `useUserStore` (a new persisted field, in the backup file), beside `hiddenZmanim`; a search item and a guide entry in the same change.

## Out of scope for the study

The study's demo marks, the reason "סימנת מנחה אחרי פלג השבוע" and the fixed four are a demonstration. The app reads the profile, the opinions and the marks for real.
