"""Cuts the murmur Chatterbox sometimes leaves after a line: each line ends 0.3 s after the last word Hebrew Whisper
hears in it, and its length in <variant>.json follows.
Usage: WHISPER_DIR=<ivrit-ai/whisper-large-v3-turbo-ct2> <venv>/bin/python trim_tail.py <out>/vo/<engine> <variant[,variant]>
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel

folder = Path(sys.argv[1])
asr = WhisperModel(os.environ['WHISPER_DIR'], device='cpu', compute_type='int8', cpu_threads=4)
for variant in sys.argv[2].split(','):
    index = folder / f'{variant}.json'
    lines = json.loads(index.read_text(encoding='utf-8'))
    for n, line in enumerate(lines):
        if line is None:
            continue
        path = folder / f'{variant}-{n}.wav'
        wav, sr = sf.read(path, dtype='float32')
        a = np.interp(np.arange(0, len(wav), sr / 16000), np.arange(len(wav)), wav).astype('float32')
        segments = list(asr.transcribe(a, language='he', beam_size=3, word_timestamps=True)[0])
        words = [w for s in segments for w in (s.words or [])]
        if not words:
            continue
        end = min(len(wav), int((words[-1].end + 0.3) * sr))
        if end < len(wav) - int(0.2 * sr):
            fade = int(0.08 * sr)
            wav = wav[:end].copy()
            wav[-fade:] *= np.linspace(1, 0, fade)
            sf.write(path, wav, sr)
            print(f'{variant}-{n}: {line["seconds"]:.2f}s -> {len(wav) / sr:.2f}s', flush=True)
        line['seconds'] = round(len(wav) / sr, 3)
    index.write_text(json.dumps(lines, ensure_ascii=False, indent=1), encoding='utf-8')
