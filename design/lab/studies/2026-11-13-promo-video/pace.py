"""A slightly brisker narration (round 5b, 2026-11-17).

For each line of a variant, after tts_ipa.py: every pause inside the line longer than MAX_PAUSE is shortened to it,
then the line is sped up with ffmpeg's atempo filter (time-domain, the pitch kept) toward TARGET vowels a second,
never faster than MAX_TEMPO and never slower than it was. The owner heard the first pass (rubberband, a phase
vocoder, up to 1.25 times toward 6 vowels a second) as metallic and too fast, so the nudge stays small: a faster
narration comes from a brisker reference (tts_liveref.py), not from stretching. The vowels are counted in the line's wanted IPA from
<variant>-ipa.json. The untouched takes are kept as <variant>-<n>.raw.wav, so a rerun starts from them.

With IPA_MODEL set (the whisper-heb-ipa folder), each paced line is transcribed again and its match and pitch spread
are stored beside the take's, so a speed-up that blurs a word shows in the report.

Usage: [IPA_MODEL=<dir>] <venv>/bin/python pace.py <out dir> <voice> <variant>
Rewrites <out>/vo/<voice>/<variant>-<n>.wav, the seconds in <variant>.json and `paced` in <variant>-ipa.json.
"""
import difflib
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

TARGET, MAX_TEMPO, MAX_PAUSE = 5.3, 1.08, 0.25

out, voice, variant = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
folder = out / 'vo' / voice
lines = json.loads((folder / f'{variant}.json').read_text(encoding='utf-8'))
report = json.loads((folder / f'{variant}-ipa.json').read_text(encoding='utf-8'))


def norm(ipa):
    ipa = ipa.lower().replace('χ', 'x').replace('ʁ', 'r').replace('ɡ', 'g')
    return re.sub(r'[ˈʔh\s.,?!:;\-–]', '', ipa)


ears = None
if os.environ.get('IPA_MODEL'):
    import librosa
    from transformers import pipeline
    ears = pipeline('automatic-speech-recognition', model=os.environ['IPA_MODEL'], device='cpu',
                    generate_kwargs={'language': 'he', 'task': 'transcribe'})


def recheck(path, want):
    wav, sr = sf.read(path, dtype='float32')
    a = librosa.resample(wav, orig_sr=sr, target_sr=16000)
    heard = ears({'raw': a, 'sampling_rate': 16000})['text']
    f0, voiced, _ = librosa.pyin(a, fmin=90, fmax=450, sr=16000, frame_length=1024)
    f = f0[voiced & ~np.isnan(f0)]
    return {'match': round(difflib.SequenceMatcher(None, norm(heard), norm(want)).ratio(), 3),
            'spread': round(float(np.std(12 * np.log2(f / np.median(f)))), 2), 'heard': heard}


def close_pauses(wav, sr, hop=0.01, floor_db=-38):
    n = int(hop * sr)
    frames = len(wav) // n
    rms = np.sqrt(np.mean(wav[:frames * n].reshape(frames, n) ** 2, axis=1) + 1e-12)
    quiet = 20 * np.log10(rms / rms.max()) < floor_db
    keep, k = np.ones(len(wav), bool), 0
    while k < frames:
        if quiet[k]:
            j = k
            while j < frames and quiet[j]:
                j += 1
            if k > 0 and j < frames and (j - k) * hop > MAX_PAUSE:  # inside the line only
                cut = int(((j - k) * hop - MAX_PAUSE) * sr)
                mid = (k * n + j * n) // 2
                keep[mid - cut // 2: mid - cut // 2 + cut] = False
            k = j
        else:
            k += 1
    return wav[keep]


for n, line in enumerate(lines):
    wav_path, raw = folder / f'{variant}-{n}.wav', folder / f'{variant}-{n}.raw.wav'
    if not raw.exists():
        shutil.copy(wav_path, raw)
    wav, sr = sf.read(raw, dtype='float32')
    closed = close_pauses(wav, sr)
    vowels = len(re.findall(r'[aeiou]', norm(report[n]['want'])))
    tempo = min(MAX_TEMPO, max(1.0, TARGET * len(closed) / sr / vowels))
    sf.write(wav_path, closed, sr)
    if tempo > 1.001:
        tmp = folder / f'{variant}-{n}.tmp.wav'
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav_path), '-af',
                        f'atempo={tempo:.3f}', str(tmp)], check=True)
        tmp.replace(wav_path)
    final = sf.info(wav_path).duration
    line['seconds'] = round(final, 3)
    report[n]['paced'] = {'tempo': round(tempo, 3), 'rate': round(vowels / final, 2)}
    if ears:
        report[n]['paced'].update(recheck(wav_path, report[n]['want']))
    print(f'{n}: {len(wav) / sr:.2f}s -> pauses {len(closed) / sr:.2f}s -> x{tempo:.2f} {final:.2f}s, {vowels / final:.2f} v/s',
          report[n]['paced'].get('match', ''))
(folder / f'{variant}.json').write_text(json.dumps(lines, ensure_ascii=False, indent=1), encoding='utf-8')
(folder / f'{variant}-ipa.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
