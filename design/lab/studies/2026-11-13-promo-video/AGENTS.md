# AGENTS.md

## Purpose

- The promo video of 2026-11-13, the owner's request: a 42-second vertical (1080x1920, 30 fps) Hebrew advertisement that shows what the app is for. An illustrated young man (kippah, short beard) gets a real reminder at work, opens the app, reads the text, marks it and keeps his streak; a montage of more screens; the quiet Shabbat; an end card. Hebrew narration and music.
- Round 3 (the owner's request of 2026-11-13, after picking figure ה and voice א): the figure in motion (waking, walking, stopping when the phone buzzes, working, resting on Shabbat), more of the app's abilities in less time, several variants, and narration that sounds less mechanical. Three variants, each laid out from its narration: "יום אחד" (a whole day, 05:52 to motzaei Shabbat), "כל האפליקציה בדקה" (twelve abilities with the figure presenting) and "לפני ואחרי" (missing the time, then the app).
- This study is a video, not boards: it has no `boards/`, `build.mjs`, `assemble.mjs` or canvas, which the lab's contract names for screen studies. Its build is the steps below.

## Ownership

- [capture.mjs](capture.mjs) captures the real app screens from a web export, in two sets (`round1`, and `round3`: home at 05:53, 11:54, 16:31, 21:05 and Friday 15:30, the tefillin, Mincha and bedtime Shema readers and Tehillim tall, the nag level and the quiet hours in Settings, the settings search for "תהלים", the More tab, the hilulot, the weekly report, achievements and trends, the check-in of motzaei Shabbat 7 November, the custom mitzvah form, the siddur tab at noon and the mitzvot list), with the seed and server that [../../../../scripts/store/screenshots.mjs](../../../../scripts/store/screenshots.mjs) exports: home at 08:17 on Wednesday 2026-11-04 in Jerusalem (Shema open, 20 minutes left, ending 08:37), home at 08:24 after the morning marks, the Shacharit reader (and a tall capture of it to pan), the siddur tab, history (a 15-day streak), the schedule, the compass, Rabbi Shimon bar Yochai's page and the Shabbat screen of Friday 2026-11-06 at 17:40. Every time and text in the video comes from these captures or the app's own strings: the notification is the orange `soon` point of the morning Shema at 08:17 (`notifications.timeLeft.line`, `notifications.nag.endingSoon`, the buttons "פתח נוסח" and "עשיתי").
- [stage.html](stage.html) is the whole video as one page: every scene, the character (drawn in SVG, posed per frame) and the captions, with `window.render(t)` setting each frame from the time alone, so a render is the same every run. Draft 1 and draft 2 still draw draft 1's figure inline; the character the owner picks replaces it from [characters.js](characters.js).
- [characters.js](characters.js) draws round 2's five figures (`CHARACTERS`: the avrech, the chassid, the Sephardi, the yeshiva bachur, the dati-leumi), each with a weekday and a Shabbat outfit, through `characterSVG()`, `characterFace()` (blink, gaze, smile, brows) and `characterArm()`.
- [gallery.html](gallery.html) is the page the owner picks from: the five figures on a weekday and on Shabbat, idle-animated, the two voices over the music and draft 2. [build-gallery.mjs](build-gallery.mjs) inlines the characters and the narration lines and writes the site with its MP3s and a 720 px cut.
- [music.py](music.py) writes the original music (numpy, seeded), D major at 96 BPM, its sections (`arp`, `kick`, `bass`, `full`, `calmA`, `calmB`, `outro`, `bells`) moved to each timeline by name=value arguments.
- [variants.json](variants.json) holds round 3's three variants: each beat's scene, its real notification (title, time-left line, body and stage, from the app's own strings and the planner's rules for that hour), its narration (`vo`) and the caption tag.
- [engine.html](engine.html) is round 3's stage: one scene function per beat kind (bedroom, Jerusalem street, the phone in the hand, office with the prayer compass, the nag stack at sunset, the sofa at night, tracking, Friday with flowers and the Shabbat table, the presenter's features, before/after, the end card), the figure of [characters.js](characters.js) in full body with `characterLegs()` and `walkPose()`, the notifications and the subtitles; `window.render(t)` reads the plan that [render-variant.mjs](render-variant.mjs) writes.
- [render-variant.mjs](render-variant.mjs) lays a variant out from its narration lengths, renders it, shapes the music to that timeline and mixes the narration over it.
- [tts_vox.py](tts_vox.py) speaks round 3's narration with VoxCPM2 (`openbmb/VoxCPM2`, Apache 2.0, commercial use allowed) on the CPU: four voices designed from a description (`warm`, `deep`, `lively`, `woman`), each from one reference line generated with a fixed seed and then continued for every line, so no real person's voice is cloned. A line the model misreads (מנחה, מקרא, אור החיים, לכותל on 2026-11-13) is regenerated as the best of several takes, scored by transcribing each with ivrit-ai's Hebrew Whisper; vowel points made VoxCPM2 misread more words, not fewer.
- [gallery3.html](gallery3.html) and [build-gallery3.mjs](build-gallery3.mjs) write round 3's page to the same link: the three cuts, the four voices over the music, the research table and round 2's figures.
- [tts.py](tts.py) (round 2) speaks [vo.md](vo.md)'s plain column with Phonikud (the MIT Hebrew diacritizer) and its Piper voices from Hugging Face (`thewh1teagle/phonikud-onnx` and `thewh1teagle/phonikud-tts-checkpoints`), one WAV per voice. It runs in a Python venv with `phonikud-tts` and `phonikud==0.4.1` (`--ignore-requires-python` on Python 3.13; PyPI's resolver otherwise picks the unrelated `phonikud` 0.1.0). Each take was checked by transcribing it with ivrit-ai's Hebrew Whisper (`ivrit-ai/whisper-large-v3-turbo-ct2`, faster-whisper): `shaul` and `model` came back word for word, `michael` was dropped (too slow for the slots, words lost). Writing "ובשבת ובחג" made every voice say "הובחה"; the line opens "בשבת ובחג". The Phonikud TTS checkpoints are licensed non-commercial (their model card, read 2026-11-13), so no Phonikud voice may narrate the ad.
- [render.mjs](render.mjs) renders the stage frame by frame in headless Chromium, encodes it with ffmpeg, and mixes the music, ducked under the narration file when it exists.
- [vo.md](vo.md) is the narration, line by line with its slot, voweled for a narrator or a text-to-speech engine.

## Local Contracts

- No invented numbers: no user counts, ratings or testimonials (PRODUCT.md). The end card's store line says Google Play only; the App Store is not live.
- Only a voice whose model licence allows commercial use narrates a published cut, and no voice is cloned from a real person.
- Every notification shown is one the app sends at that time for the seed's place and day; a new beat takes its wording from the dictionaries and its times from the captures.
- A change of wording changes the caption in [stage.html](stage.html) and the line in [vo.md](vo.md) together.
- `out/` is never committed; the video is rebuilt from the sources.

## Work Guidance

- Build, from this folder, after `pnpm install` at the root:
  1. `npx expo export -p web --output-dir <dir>` at the root, then `node capture.mjs <dir>`;
  2. `python3 music.py out/music.wav 42`;
  3. `node render.mjs --stills 3,7,12,19,26,32,38` to check frames, then `node render.mjs` for the finished video in the gitignored output folder (about two minutes).
- Narration: `<venv>/bin/python tts.py <models> out shaul model`, copy the chosen voice's WAV over the narration file that [render.mjs](render.mjs) mixes in (`vo` in the output folder), then `node render.mjs`.
- The models and the venv live outside the repository (the session's scratchpad); the environment needs `huggingface.co` and `us.aws.cdn.hf.co` to fetch them.
- Round 3: `node capture.mjs <dir> round3`; `<venv>/bin/python tts_vox.py <VoxCPM2 dir> out warm day,rapid,before` (and `deep,lively,woman day` for the comparison; a fifth argument of beat numbers regenerates those beats, and a sixth, with `WHISPER_DIR` set, keeps the best of that many takes); `node render-variant.mjs <variant> warm --stills …`, then without `--stills`; `node build-gallery3.mjs`, then publish the site to the same link.
- The VoxCPM2 venv also needs `pip install voxcpm` (it pulls torch); the model is 5 GB, and the session's disk could not hold Chatterbox as well.
- Gallery (round 2): `node build-gallery.mjs`, then publish the site's page with the site folder as `root` and the files `audio/shaul.mp3`, `audio/model.mp3` and `video/draft2.mp4` to the same link.

## Published

- Round 2 (2026-11-13), the characters and voices page: https://claude.ai/artifact/2WddyBo6En5LwiLR5iDh9C. Draft 1 and draft 2 were sent as files in the session.
- Round 2 picks (2026-11-13): figure ה (the dati-leumi) and voice א, then the request for less mechanical voices (voice א turned out non-commercial), more of the app in less time and the figure in motion.
- Round 3 (2026-11-13) replaced the page at the same link.

## Verification

- `node render.mjs --stills <times>` writes PNG stills to the output folder; look at each before a full render.
- `ffprobe` of the finished video must show 1080x1920 h264, an AAC track and 42 seconds.

## Child DOX Index

No child AGENTS.md files.
