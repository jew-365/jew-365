# AGENTS.md

## Purpose

- The home screen study of 2026-10-27, round 3: ten interactive directions for the app's home screen, for the owner to pick from.
- Every direction shows the owner's five home requirements:
  1. the day's zmanim;
  2. personal and general messages;
  3. what is open now, with its start and end;
  4. what was done today;
  5. what was missed today.
- Personal messages live inside home, never on a separate screen.

## Ownership

- [core.js](core.js) and [core.css](core.css) own every value and action every board reads:
  - live Jerusalem time, fixed times and scrubbing (`scrub`, `goLive`, `liveSec`);
  - the Shabbat screen inside a holy block (`holyAt`);
  - the seeded demo marks;
  - the messages;
  - the personal-message sheet.
- [data.json](data.json) is 68 days of real Jerusalem data (2026-10-25 to 2026-12-31): zmanim, Hebrew date, parasha, Shabbat blocks, Rosh Chodesh, Chanukah, fasts and hilulot. [gen-data.mjs](gen-data.mjs) writes it with the app's own libraries (kosher-zmanim, @hebcal/core) and [../../../../src/data/hilulot.ts](../../../../src/data/hilulot.ts).
- [boards/](boards) holds the ten directions:
  - ב קשת היום (`Arc`), ו שעון יום (`Dial`), ט סטוריז (`Stories`) and י שמיים (`Sky`): the owner's favourites from round 2, upgraded;
  - כ מסלולים (`Orbit`), ל אופק (`Horizon`), מ רדאר (`Radar`), נ קפסולות (`Capsules`), ס מנהרת זמן (`Tunnel`) and ע פעילויות חיות (`Live`): new in round 3.
- [dirs.json](dirs.json) holds each direction's gallery text. [site-template.html](site-template.html) is the gallery page, with a live sky header, one time slider for every phone, and up to three ranked picks.
- [BRIEF.md](BRIEF.md) is the contract the board-building agents followed.

## Local Contracts

- Published to the same two links every round:
  - canvas: https://claude.ai/artifact/UxdjEwamEp3YUTpkUTfxRn
  - gallery site: https://claude.ai/artifact/KNs1VuDX7J6LWXNxfZQPhT
- The site is shared as "anyone with the link", so every republish reaches whoever holds it.
- Both artifacts were created in the Akeyless claude.ai account. After that account is gone, the next publish creates new links: record them here.
- Rounds 1 and 2 are not kept as files. Round 2's dropped directions (מוקד, לוח אריחים, שיחה, יומן, לוח מודפס, גדול וברור) were removed at the owner's word.

## Work Guidance

- What the owner liked: time itself as the picture (a sun path, a 24-hour dial, a living sky), with motion and touch, a futuristic and calm look, and real live data.
- Open product decisions for the pick:
  - one tone for all messages or one per mitzvah;
  - whether the name card is required;
  - whether "בכל זאת עשיתי" is allowed;
  - which general messages home carries;
  - whether the scrub gesture ships in the app.

## Verification

- `node gen-data.mjs` rewrites [data.json](data.json) byte-identical while the libraries are unchanged.
- `node build.mjs`, then `node assemble.mjs`, then the screenshot set in [BRIEF.md](BRIEF.md) for any changed board.

## Child DOX Index

No child AGENTS.md files.
