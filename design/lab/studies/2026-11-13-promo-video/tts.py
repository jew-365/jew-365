"""Hebrew narration with Phonikud (MIT diacritizer) and its Piper voices, one WAV per voice.

Reads each line's start, end and plain text (full spelling, no vowels: Phonikud adds its own, with stress)
from vo.md, speaks it, speeds it up a little when it overruns its slot (never past LENGTH_MIN, so the voice
stays natural; a line may then run up to 0.2 s before the next one), and places it at its start time.
Usage: <venv>/bin/python tts.py <models dir> <out dir> [voice ...]
  voices: model, shaul, michael (the .onnx names in the models dir); writes <out>/vo-<voice>.wav
"""
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from phonikud_tts import Phonikud, Piper, phonemize

HERE = Path(__file__).parent
DUR = 42.0
LENGTH = 1.0       # Piper's length scale: above 1 is slower
LENGTH_MIN = 0.85  # the fastest a line may be pushed to fit
models, out = Path(sys.argv[1]), Path(sys.argv[2])
voices = sys.argv[3:] or ['model', 'shaul', 'michael']

rows = []
for line in (HERE / 'vo.md').read_text(encoding='utf-8').splitlines():
    m = re.match(r'\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$', line)
    if m:
        rows.append((float(m[1]), float(m[2]), m[4]))
assert rows, 'no lines read from vo.md'

phonikud = Phonikud(str(models / 'phonikud-1.0.int8.onnx'))
phonemes = [phonemize(phonikud.add_diacritics(text)) for _, _, text in rows]

for voice in voices:
    piper = Piper(str(models / f'{voice}.onnx'), str(models / 'model.config.json'))
    track = None
    for n, ((start, end, text), ph) in enumerate(zip(rows, phonemes)):
        room = (rows[n + 1][0] - 0.2 if n + 1 < len(rows) else DUR - 1) - start
        scale = LENGTH
        for _ in range(4):
            samples, sr = piper.create(ph, is_phonemes=True, length_scale=scale)
            length = len(samples) / sr
            if length <= end - start or scale <= LENGTH_MIN:
                break
            scale = max(LENGTH_MIN, scale * (end - start) / length * 0.98)
        if track is None:
            track = np.zeros(int(DUR * sr), dtype=np.float32)
        samples = np.asarray(samples, dtype=np.float32)[: int(room * sr)]
        fade = min(len(samples), int(0.03 * sr))
        samples[:fade] *= np.linspace(0, 1, fade)
        samples[-fade:] *= np.linspace(1, 0, fade)
        i = int(start * sr)
        track[i:i + len(samples)] += samples[: len(track) - i]
        flag = '  OVER' if length > room else ''
        print(f'{voice:8} {start:5.1f}s  {length:4.1f}s (slot {end - start:4.1f}, room {room:4.1f})  scale {scale:.2f}{flag}')
    track /= max(1e-6, np.abs(track).max()) / 0.9
    sf.write(out / f'vo-{voice}.wav', track, sr)
    print(f'wrote {out / f"vo-{voice}.wav"}')
