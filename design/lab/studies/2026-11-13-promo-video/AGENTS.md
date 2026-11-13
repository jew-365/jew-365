# AGENTS.md

## Purpose

- The promo video of 2026-11-13, the owner's request: a 42-second vertical (1080x1920, 30 fps) Hebrew advertisement that shows what the app is for. An illustrated young man (kippah, short beard) gets a real reminder at work, opens the app, reads the text, marks it and keeps his streak; a montage of more screens; the quiet Shabbat; an end card. Hebrew narration and music.
- This study is a video, not boards: it has no `boards/`, `build.mjs`, `assemble.mjs` or canvas, which the lab's contract names for screen studies. Its build is the four steps below.

## Ownership

- [capture.mjs](capture.mjs) captures the real app screens from a web export, with the seed and server that [../../../../scripts/store/screenshots.mjs](../../../../scripts/store/screenshots.mjs) exports: home at 08:17 on Wednesday 2026-11-04 in Jerusalem (Shema open, 20 minutes left, ending 08:37), home at 08:24 after the morning marks, the Shacharit reader (and a tall capture of it to pan), the siddur tab, history (a 15-day streak), the schedule, the compass, Rabbi Shimon bar Yochai's page and the Shabbat screen of Friday 2026-11-06 at 17:40. Every time and text in the video comes from these captures or the app's own strings: the notification is the orange `soon` point of the morning Shema at 08:17 (`notifications.timeLeft.line`, `notifications.nag.endingSoon`, the buttons "פתח נוסח" and "עשיתי").
- [stage.html](stage.html) is the whole video as one page: every scene, the character (drawn in SVG, posed per frame) and the captions, with `window.render(t)` setting each frame from the time alone, so a render is the same every run. Draft 1 and draft 2 still draw draft 1's figure inline; the character the owner picks replaces it from [characters.js](characters.js).
- [characters.js](characters.js) draws round 2's five figures (`CHARACTERS`: the avrech, the chassid, the Sephardi, the yeshiva bachur, the dati-leumi), each with a weekday and a Shabbat outfit, through `characterSVG()`, `characterFace()` (blink, gaze, smile, brows) and `characterArm()`.
- [gallery.html](gallery.html) is the page the owner picks from: the five figures on a weekday and on Shabbat, idle-animated, the two voices over the music and draft 2. [build-gallery.mjs](build-gallery.mjs) inlines the characters and the narration lines and writes the site with its MP3s and a 720 px cut.
- [music.py](music.py) writes the original music (numpy, seeded), D major at 96 BPM, its sections following the timeline.
- [tts.py](tts.py) speaks [vo.md](vo.md)'s plain column with Phonikud (the MIT Hebrew diacritizer) and its Piper voices from Hugging Face (`thewh1teagle/phonikud-onnx` and `thewh1teagle/phonikud-tts-checkpoints`), one WAV per voice. It runs in a Python venv with `phonikud-tts` and `phonikud==0.4.1` (`--ignore-requires-python` on Python 3.13; PyPI's resolver otherwise picks the unrelated `phonikud` 0.1.0). Each take was checked by transcribing it with ivrit-ai's Hebrew Whisper (`ivrit-ai/whisper-large-v3-turbo-ct2`, faster-whisper): `shaul` and `model` came back word for word, `michael` was dropped (too slow for the slots, words lost). Writing "ובשבת ובחג" made every voice say "הובחה"; the line opens "בשבת ובחג".
- [render.mjs](render.mjs) renders the stage frame by frame in headless Chromium, encodes it with ffmpeg, and mixes the music, ducked under the narration file when it exists.
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
- Narration: `<venv>/bin/python tts.py <models> out shaul model`, copy the chosen voice's WAV over the narration file that [render.mjs](render.mjs) mixes in (`vo` in the output folder), then `node render.mjs`.
- The models and the venv live outside the repository (the session's scratchpad); the environment needs `huggingface.co` and `us.aws.cdn.hf.co` to fetch them.
- Gallery: `node build-gallery.mjs`, then publish the site's page with the site folder as `root` and the files `audio/shaul.mp3`, `audio/model.mp3` and `video/draft2.mp4` to the same link.

## Published

- Round 2 (2026-11-13), the characters and voices page: https://claude.ai/artifact/2WddyBo6En5LwiLR5iDh9C. Draft 1 and draft 2 were sent as files in the session.
- Picks: none yet (the owner asked for more traditional figures than draft 1's).

## Verification

- `node render.mjs --stills <times>` writes PNG stills to the output folder; look at each before a full render.
- `ffprobe` of the finished video must show 1080x1920 h264, an AAC track and 42 seconds.

## Child DOX Index

No child AGENTS.md files.
