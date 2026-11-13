# Jew 365: usability test script (H1)

The eight-task test of the discoverability program ([discoverability.md](discoverability.md), H1 and G5). The owner runs it with the closed testers: once now as the **baseline** (before phase 1 reaches them), and again after phases 2 and 3. Nothing is collected by the app — the owner writes the results down on this sheet or a copy.

Goal (G5): success of 90% or more, and the median taps on each task down by half between the baseline and the final run.

## How to run it

- One tester at a time, on their own phone, with the app freshly installed and not yet opened (so setup is part of task 1). Give each tester the preview app for the run that tests a new build, or production for the over-the-air runs; note which build and update number each ran (Settings shows `<version>-<n>`).
- Read each task aloud as written. Do not point, name a tab, or say where to tap. If the tester asks where something is, that counts against success; answer only "wherever you think" and let them try.
- For each task record: **success** (did they reach the result on their own: yes / no / gave up), **taps** (count every tap and swipe from the task's start until the result), **time** (optional, seconds), and any **confusion** in their words.
- A task starts from home unless it says otherwise. If a task depends on an earlier one (a reminder received), allow the time it needs or simulate it as noted.

## The eight tasks

1. **Finish setup and receive a reminder.** From a fresh install: "Set the app up for yourself, and get it to the point where it will remind you to pray." Success = setup finished, notifications allowed (or an explicit "not now" chosen knowingly), and the tester can say a reminder will come. Baseline note: on today's build this is the nine-step setup; after phase 3 it is the short path with the sample reminder on the ready screen.

2. **Find tomorrow's latest time for the morning Shema.** "Without changing anything, find the latest time you may say the morning Shema tomorrow." Success = they reach the morning Shema's screen or the schedule/day view for tomorrow and read the time. Count taps to the answer.

3. **Start a daily Chok LeYisrael reminder.** "Turn on a daily reminder to learn Chok LeYisrael." Success = Chok LeYisrael switched on (its add-on download started or already installed, the mitzvah enabled with a reminder). Note whether they found it from home, the hub/More tab, or only through Settings.

4. **Get fewer notifications at night.** "Make the app stop sending you notifications late at night." Success = they reach the quiet-hours setting and set a night bound (or, after phase 3, confirm the night quiet hours that setup pre-ticked). Note where they looked first.

5. **Mark from a notification, and skip a mitzvah for today.** With a reminder in the tray (send one, or wait for one): "Mark that mitzvah as done from the notification." Then, from the app: "Now skip a different mitzvah just for today." Success = one mark made from the notification's button, and one mitzvah skipped for today. Note whether they found "skip today" without a long press.

6. **Open today's Tehillim.** "Open today's Tehillim to read it." Success = the Tehillim reader open. Count taps; note the path (siddur tab, More tab, search).

7. **See the streak and last week's report.** "Find how many days in a row you've kept, and open last week's summary." Success = the streak seen (home or Tracking) and the weekly report opened. Note whether they found Tracking on their own.

8. **Add a personal mitzvah.** "Add your own daily reminder — say, to give tzedakah each morning." Success = a custom mitzvah created with hours and at least one reminder. Note whether the form stopped them (after phase 2's template gallery, note whether a template was used instead).

## Score sheet (one row per tester per run)

| Run (date · build/update) | Tester | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | Success % | Median taps |
|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline · | | | | | | | | | | | |

For each task cell write `taps` and a success mark (✓ / ✗ / gave up). Summarize per run: the share of task attempts that succeeded (the 90% target) and the median taps across all tasks (the figure that should halve by the final run).

## What the baseline establishes

The baseline run is on today's production build, before any discoverability change reaches the testers. It is the number the final run (after phases 2 and 3) is measured against. Record it before phase 1 ships to the testers, so the comparison is clean; the owner keeps the filled sheet with the release records.
