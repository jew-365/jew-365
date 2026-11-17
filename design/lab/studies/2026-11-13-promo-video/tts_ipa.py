"""Narration checked phoneme by phoneme (round 5).

For each beat of a variant, VoxCPM2 speaks the line in a designed voice (out/vo/<voice>/ref.wav, made by tts_vox.py)
from two texts: the plain line, and the line with its sensitive words respelled (HINTS). Vowel points are never
used: VoxCPM2 garbled whole lines around a single pointed word (2026-11-17). Each take is
transcribed into IPA by `notmax123/whisper-heb-ipa` (Apache 2.0) and compared with the exact pronunciation the beat
asks for: its `voweled` text (masculine forms, vocal shva marked with U+05BD, kamatz katan with U+05C7) through
Phonikud's phonemizer. A take loses points for every phoneme that differs and more for each `must` sound it lacks
(the masculine forms: ʃelχa, ʔotχa, hitpalalta). Each take is also measured for life: the spread of its pitch in
semitones and its vowels per second; a flat take (under 2.5 semitones) or a slow one (under 5 vowels a second) loses
points, a lively one gains a little. The best take is kept; every take's transcription and measures go to the report.

The voice continues its reference line: `ref.wav`, or `ref-live.wav` when it exists, a short line in the same voice
made livelier by tts_liveref.py, with its text from `ref-live.txt` (continuation copies the reference's pace and melody, 2026-11-17).

Usage: IPA_MODEL=<whisper-heb-ipa dir> <venv>/bin/python tts_ipa.py <VoxCPM2 dir> <out dir> <voice> <variant> [takes] [beat,beat]
Writes <out>/vo/<voice>/<variant>-<n>.wav, <variant>.json (text and length) and <variant>-ipa.json (the report).
"""
import difflib
import json
import os
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import librosa
import torch

torch.set_num_threads(4)
from phonikud import phonemize  # noqa: E402
from transformers import pipeline  # noqa: E402
from voxcpm import VoxCPM  # noqa: E402

HERE = Path(__file__).parent
REF_TEXT = 'שלום וברוכים הבאים. יהודי שלוש מאות שישים וחמש עוזרת לך לקיים כל מצווה בזמנה, בכל יום מחדש.'
# Respellings for words the model misread: "shalosh me'ot" for שלוש מאות, which a hyphen may join into the
# construct "shlosh me'ot" ("שלש" gave "shalash", 2026-11-17).
# "נוסח" reads "nosach" (the formal reading); one dagesh in its vav may lead to the spoken "nusach". Words with a
# full spelling of their own are respelled in the line itself instead (מינחה, חוק לישראל, מיקרא).
HINTS = {'שלוש מאות': 'שלוש-מאות', 'נוסח': 'נוּסח'}

model_dir, out, voice, variant = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], sys.argv[4]
takes = int(sys.argv[5]) if len(sys.argv) > 5 else 3
only = [int(x) for x in sys.argv[6].split(',')] if len(sys.argv) > 6 else None
beats = json.loads((HERE / 'variants.json').read_text(encoding='utf-8'))[variant]['beats']


def spoken(text):
    return re.sub(r'\s+', ' ', text.replace('יהודי 365', 'יהודי שלוש מאות שישים וחמש')).strip()


def hinted(text):
    for word, pointed in HINTS.items():
        text = text.replace(word, pointed)
    return text


def norm(ipa):
    ipa = ipa.lower().replace('χ', 'x').replace('ʁ', 'r').replace('ɡ', 'g')
    return re.sub(r'[ˈʔh\s.,?!:;\-–]', '', ipa)


def trim(wav, sr, floor=0.012, pad=0.06):
    loud = np.where(np.abs(wav) > floor)[0]
    if not len(loud):
        return wav
    return wav[max(0, loud[0] - int(pad * sr)):min(len(wav), loud[-1] + int(pad * sr))]


model = VoxCPM(voxcpm_model_path=str(model_dir), zipenhancer_model_path=None, enable_denoiser=False, optimize=False, device='cpu')
sr = model.tts_model.sample_rate
ears = pipeline('automatic-speech-recognition', model=os.environ['IPA_MODEL'], device='cpu',
                generate_kwargs={'language': 'he', 'task': 'transcribe'})


def hear(wav):
    a = np.interp(np.arange(0, len(wav), sr / 16000), np.arange(len(wav)), wav).astype('float32')
    return ears({'raw': a, 'sampling_rate': 16000})['text']


def pitch_spread(wav):
    a = librosa.resample(wav, orig_sr=sr, target_sr=16000)
    f0, voiced, _ = librosa.pyin(a, fmin=90, fmax=450, sr=16000, frame_length=1024)
    f = f0[voiced & ~np.isnan(f0)]
    return float(np.std(12 * np.log2(f / np.median(f)))) if len(f) else 0.0


def life(spread, rate):
    return 0.02 * min(max(spread - 2.5, 0), 2) - 0.04 * max(2.5 - spread, 0) - 0.03 * max(5.0 - rate, 0)


folder = out / 'vo' / voice
live = (folder / 'ref-live.wav').exists()
ref = folder / ('ref-live.wav' if live else 'ref.wav')
ref_text = (folder / 'ref-live.txt').read_text(encoding='utf-8').strip() if live else REF_TEXT
print('reference', ref.name, flush=True)
index, report_path = folder / f'{variant}.json', folder / f'{variant}-ipa.json'
lines = json.loads(index.read_text(encoding='utf-8')) if only and index.exists() else [None] * len(beats)
report = json.loads(report_path.read_text(encoding='utf-8')) if only and report_path.exists() else [None] * len(beats)
for n, beat in enumerate(beats):
    if only and n not in only:
        continue
    want = phonemize(beat['voweled'])
    musts = [norm(m) for m in beat.get('must', [])]
    vowels = len(re.findall(r'[aeiou]', norm(want)))
    texts = [spoken(beat['vo']), hinted(spoken(beat['vo']))]
    tried, best = [], None
    for take in range(takes):
        for k, text in enumerate(dict.fromkeys(texts)):
            torch.manual_seed(3000 + 101 * n + 7919 * take + k)
            wav = trim(np.asarray(model.generate(text=text, prompt_wav_path=str(ref), prompt_text=ref_text,
                                                 reference_wav_path=str(ref), cfg_value=2.0, inference_timesteps=10),
                                  dtype=np.float32), sr)
            heard = hear(wav)
            missing = [m for m in musts if m not in norm(heard)]
            match = difflib.SequenceMatcher(None, norm(heard), norm(want)).ratio()
            spread, rate = pitch_spread(wav), vowels / (len(wav) / sr)
            score = match - 0.08 * len(missing) + life(spread, rate)
            tried.append({'take': take, 'hinted': bool(k), 'score': round(score, 3), 'match': round(match, 3),
                          'spread': round(spread, 2), 'rate': round(rate, 2), 'missing': missing, 'heard': heard})
            print(f'  {n}.{take}{"h" if k else ""} {score:.3f} match={match:.3f} spread={spread:.2f} rate={rate:.2f} {missing} {heard}', flush=True)
            if best is None or score > best[0]:
                best = (score, wav, heard, match, spread, rate)
        if best[0] >= 0.98:
            break
    sf.write(folder / f'{variant}-{n}.wav', best[1], sr)
    (folder / f'{variant}-{n}.raw.wav').unlink(missing_ok=True)  # pace.py starts from the new take
    lines[n] = {'text': beat['vo'], 'seconds': round(len(best[1]) / sr, 3)}
    report[n] = {'text': beat['vo'], 'want': want, 'heard': best[2], 'score': round(best[0], 3), 'match': round(best[3], 3),
                 'spread': round(best[4], 2), 'rate': round(best[5], 2), 'takes': tried}
    print(f'{voice} {variant}-{n}: {best[0]:.3f} match={best[3]:.3f} spread={best[4]:.2f} rate={best[5]:.2f}  {len(best[1]) / sr:.2f}s  {best[2]}', flush=True)
    index.write_text(json.dumps(lines, ensure_ascii=False, indent=1), encoding='utf-8')
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
