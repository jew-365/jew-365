# AGENTS.md

## Purpose

- The promo video of 2026-11-13, the owner's request: a 42-second vertical (1080x1920, 30 fps) Hebrew advertisement that shows what the app is for. An illustrated young man (kippah, short beard) gets a real reminder at work, opens the app, reads the text, marks it and keeps his streak; a montage of more screens; the quiet Shabbat; an end card. Hebrew narration and music.
- This study is a video, not boards: it has no `boards/`, `build.mjs`, `assemble.mjs` or canvas, which the lab's contract names for screen studies. Its build is the four steps below.

## Ownership

- [capture.mjs](capture.mjs) captures the real app screens from a web export, with the seed and server that [../../../../scripts/store/screenshots.mjs](../../../../scripts/store/screenshots.mjs) exports: home at 08:17 on Wednesday 2026-11-04 in Jerusalem (Shema open, 20 minutes left, ending 08:37), home at 08:24 after the morning marks, the Shacharit reader (and a tall capture of it to pan), the siddur tab, history (a 15-day streak), the schedule, the compass, Rabbi Shimon bar Yochai's page and the Shabbat screen of Friday 2026-11-06 at 17:40. Every time and text in the video comes from these captures or the app's own strings: the notification is the orange `soon` point of the morning Shema at 08:17 (`notifications.timeLeft.line`, `notifications.nag.endingSoon`, the buttons "פתח נוסח" and "עשיתי").
- [stage.html](stage.html) is the whole video as one page: every scene, the character (drawn in SVG, posed per frame) and the captions, with `window.render(t)` setting each frame from the time alone, so a render is the same every run.
- [music.py](music.py) writes the original music (numpy, seeded), D major at 96 BPM, its sections following the timeline.
- [render.mjs](render.mjs) renders the stage frame by frame in headless Chromium, encodes it with ffmpeg, and mixes the music, ducked under `out/vo.wav` when that file exists.
- [vo.md](vo.md) is the narration, line by line with its slot, voweled for a narrator or a text-to-speech engine.

## Local Contracts

- No invented numbers: no user counts, ratings or testimonials (PRODUCT.md). The end card's store line says Google Play only; the App Store is not live.
- A change of wording changes the caption in [stage.html](stage.html) and the line in [vo.md](vo.md) together.
- `out/` is never committed; the video is rebuilt from the sources.

## Work Guidance

- Build, from this folder, after `pnpm install` at the root:
  1. `npx expo export -p web --output-dir <dir>` at the root, then `node capture.mjs <dir>`;
  2. `python3 music.py out/music.wav 42`;
  3. `node render.mjs --stills 3,7,12,19,26,32,38` to check frames, then `node render.mjs` for the finished video in the gitignored output folder (about two minutes).
- The narration is not recorded yet: the environment's text-to-speech downloads were refused on 2026-11-13. With `out/vo.wav` in place, `node render.mjs` mixes it in.

## Verification

- `node render.mjs --stills <times>` writes PNG stills to the output folder; look at each before a full render.
- `ffprobe` of the finished video must show 1080x1920 h264, an AAC track and 42 seconds.

## Child DOX Index

No child AGENTS.md files.
