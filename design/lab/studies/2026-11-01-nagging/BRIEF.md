# Board contract: the nagging controls (Jew 365 design lab)

You build or change a board of this study: one interactive phone, 390 by 844, Hebrew, right to left, in the app's own
look. The study shows the owner the surfaces of section 4 of the nagging spec
([../../../../.claude/specs/nagging-levels.md](../../../../.claude/specs/nagging-levels.md)) before any production code.
Read [../../AGENTS.md](../../AGENTS.md) (the lab) and [AGENTS.md](AGENTS.md) (this study) first.

## What the boards show

- Settings, Device and notifications (spec 4.1): the level control right after the notifications switch. Three
  directions: א [boards/LevelSegmented.html](boards/LevelSegmented.html) is spec 4.1 exactly and is the baseline the app
  is built on; ב [boards/LevelDots.html](boards/LevelDots.html) and ג [boards/LevelExample.html](boards/LevelExample.html)
  are alternatives. A change to א that departs from 4.1 is a new direction, not an edit of א.
- The mitzvah screen (4.2), the reminder editor (4.3), the custom mitzvah form (4.4) and the notification tray (4.5, 3.6):
  one board each.

## The rules every board keeps

- Every zman, window and reminder comes from [data.json](data.json), which [gen-data.mjs](gen-data.mjs) computes with the
  app's own code. Never type a time, a date or a name into a board. A custom mitzvah's hours and the clock of a set-time
  reminder are the user's input, not zmanim, and may be sample values.
- The level table (spec 3.2), the placement rule (3.2.1), the resolution order (3.3) and the repeat offsets (3.4) live in
  [core.js](core.js) only (`levelOf()`, `placementsFor()`, `presetPlacement()`, `nagFor()`, `offsets()`), and whether a
  trigger goes out in `trigger()` and `dropReason()`. A board never keeps a copy.
- Copy: the strings of spec section 7 for the keys it lists, the app's [../../../../src/i18n/he.json](../../../../src/i18n/he.json)
  for every other key, through `this.str(key, params)`. Copy that neither has is a proposal and is listed in
  [AGENTS.md](AGENTS.md).
- Theme tokens only (`var(--gold)`, `var(--goldText)` and the rest, injected from
  [../../../../src/theme/colors.ts](../../../../src/theme/colors.ts)), the type classes of [core.css](core.css), Rubik.
  Text never under 12px, every control at least 44px to the touch.
- The app's shared components as [core.css](core.css) draws them: SegmentedControl (`.seg`), ChipRow (`.chips`, `.chip`),
  ListRow (`.listrow`), Card (`.card`), BottomSheet and SheetAction (`.sheetwrap`, `.sheet`, `.saction`), OptionSelect
  (`.select`, or `.choices` / `.choice` inline), the steppers (`.stepper`), Switch (`.switch`), Button (`.btn`).

## Files and commands

- A board is `boards/<Name>.html`: a `<!--board title="..."-->` line, a `<style>`, a `<template>` and a `<script>` whose
  class holds `/*CORE*/`. No shell (`.ph`, `x-dc`, `helmet`, doctype).
- Shared markup macros: `<!--SETTINGS_TOP-->` and `<!--SETTINGS_BOTTOM-->` (the Settings section around a level control),
  `<!--MITZVAH-->` (the mitzvah screen), `<!--LEVELSHEET-->`, `<!--EDITOR-->`, `<!--NAG:<path>-->` (the nag block with its
  holes under `<path>`), `<!--TOAST-->`, `<!--TABS-->`; icons `[[ic:<name>:<class>]]`.
- Values: `this.core()` (theme class, toast, the level sheet, the editor), `this.settingsVals()`, `this.mitzvahVals(id)`,
  `this.nagBlock(draft, { level, allowed, preview, set })`, `this.chain(id, reminder, level)`.
- `node gen-data.mjs` (only when the data or the copy changes), `node build.mjs [<Name>]`, `node assemble.mjs`, then
  `node check.mjs` (Playwright). Never edit `data.json` or the build output by hand.

## The DC template rules that bit here

- A text hole renders as `span.sc-interp`: style holes through child selectors.
- A boolean hole in `disabled` renders the attribute even when false: use `aria-disabled` and clamp in the handler.
- A raw `<img src="{{...}}">` is fetched before the runtime fills it: draw an image through a `style` hole
  (`this.iconStyle(name)`).
- A range input changes only through real input; a test drives it with Playwright's `fill`.
- A browser's `type="time"` field follows the browser's locale (it showed "AM"); the boards use a 24-hour text field
  that keeps the raw text and moves the clock once it reads as HH:MM.

## Report

The board file, what it shows, how you checked it (the `check.mjs` lines and any screenshot), and any gap in the core.
Do not commit.
