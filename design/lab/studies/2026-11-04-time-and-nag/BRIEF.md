# Board contract: time left and the nagging level (Jew 365 design lab)

You change or add a board of this study: one interactive phone, 390 by 844, Hebrew, right to left. Read
[../../AGENTS.md](../../AGENTS.md) (the lab) and [AGENTS.md](AGENTS.md) (this study) first.

## The rules every board keeps

- Every zman, window, reminder and repeat comes from [data/notif.json](data/notif.json) or [data/home.json](data/home.json),
  which the generators compute with the app's own code. Never type a time, a date or a name into a board.
- A notification direction is one `case` of `dirText()` in [core/notif.js](core/notif.js) and one row of
  `NOTIF_DIRS` in [gen-notif-boards.mjs](gen-notif-boards.mjs). A home direction is one branch of `nagOf()` and one row
  of `HOME_DIRS` in [gen-home-boards.mjs](gen-home-boards.mjs). Then a row in [dirs.json](dirs.json).
- Copy comes from the app's [../../../../src/i18n/he.json](../../../../src/i18n/he.json) where it has the words; any other
  copy is this study's proposal.
- Text never under 12px, every control at least 44px to the touch.

## The DC template rules that bit here

- A text hole renders as `span.sc-interp`: style holes through child selectors.
- Draw an image through a `style` hole (a mask or a background), never a raw `<img src="{{...}}">`.
- A label that mixes a number and Hebrew needs `dir="auto"`, or "3 פעמים" reads "פעמים 3".

## Report

The board, what it shows, how you checked it (`node check.mjs` and any screenshot), and any gap. Do not commit.
