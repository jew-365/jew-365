# Logo trace

`source-paths.json` holds the outlines `build.mjs` draws as `SOURCE_PATHS`: the letters, the bell, the open book and its text lines, traced from the owner's logo of 2026-11-02 (`design/references/2026-11-02/logo.jpg`) in that image's own pixels, and the centre line of the stopwatch ring fitted to it. `trace.py` writes it, from the repository root, with Python 3, numpy and Pillow:

```bash
python design/jew365-concepts/vector/trace/trace.py
node design/jew365-concepts/vector/build.mjs
```

The tracer reads each colour's coverage, follows its edges at half coverage, keeps straight runs as exact lines (snapped to horizontal or vertical) and fits the rest with smooth cubic curves. Rerun it only when the reference image changes; the numbers in `SOURCE` (ticks, button, degree sign, white square) are measured from the same image and live in `build.mjs`.
