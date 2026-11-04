# Board contract: the notification timeline (Jew 365 design lab)

You build or change a board of this study: one interactive phone, 390 by 844, Hebrew, right to left, in the app's own look: the mitzvah screen's window card with every notification of the window on its axis. Read [../../AGENTS.md](../../AGENTS.md) (the lab) and [AGENTS.md](AGENTS.md) (this study) first.

## The rules every board keeps

- Every zman, window, reminder and nag comes from [data.json](data.json), which [gen-data.mjs](gen-data.mjs) computes with the app's own code. Never type a time, a date or a name into a board.
- The smart nag, the stages, the wording and the editing model live in [core.js](core.js) only (`smartNags()`, `sends()`, `setAt()`, `remove()`, `addAt()`, `resetSmart()`, the pointer handlers). A board only draws the axis: it maps `core().sends` through `this.dotVals(s, { cls, … })` and binds `d.down`, `d.move`, `d.up`, `d.keydown` and `d.pos` on each dot, inside an element with `data-axis`.
- The shared markup macros: `<!--WINDOW_TOP-->` (the header, the card's head, the zoom and the level), `<!--WINDOW_BOTTOM-->` (the ends, the legend, the reset, the values panel, the list) and `<!--TOAST-->`; icons as `[[ic:<name>]]`.
- Theme tokens only, the stage colours `--stG`, `--stO`, `--stR`, Rubik, text never under 12px, every dot 44px to the touch.

## Files and commands

- A board is `boards/<Name>.html`: a `<!--board title="..."-->` line, a `<style>`, a `<template>` and a `<script>` whose class holds `/*CORE*/`.
- `node build.mjs [<Name>]`, `node assemble.mjs`, then `node check.mjs`. Never edit `data.json` or the build output by hand.

## Report

The board file, what it shows, how you checked it (the `check.mjs` lines and any screenshot), and any gap in the core. Do not commit.
