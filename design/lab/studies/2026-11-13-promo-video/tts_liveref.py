"""A livelier reference line for a VoxCPM2 voice (round 5b, 2026-11-17).

tts_ipa.py continues each line from the voice's reference, so every line copies the reference's pace and melody: the
calm reference of tts_vox.py made the narration slow and flat. This script speaks a short, gender-neutral line in the
same voice with VoxCPM2's style-controlled cloning (`reference_wav_path` alone, the style in parentheses before the
text), several takes per style, and keeps the take that is both exact and lively: its IPA (whisper-heb-ipa) against
Phonikud's, plus the spread of its pitch in semitones and its vowels per second. No real person's voice is cloned:
the reference is the voice designed from a description in tts_vox.py.

Usage: IPA_MODEL=<whisper-heb-ipa dir> <venv>/bin/python tts_liveref.py <VoxCPM2 dir> <out dir> <voice> [takes]
Writes <out>/vo/<voice>/ref-live.wav, ref-live.txt (its text, which tts_ipa.py passes as the prompt) and
ref-live.json (every take's measures).
"""
import difflib
import json
import os
import re
import sys
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
import torch

torch.set_num_threads(4)
from phonikud import phonemize  # noqa: E402
from transformers import pipeline  # noqa: E402
from voxcpm import VoxCPM  # noqa: E402

TEXT = 'שלום וברוכים הבאים! יהודי שלוש מאות שישים וחמש מזכירה כל מצווה בזמנה, בכל יום מחדש.'
VOWELED = 'שָׁל֫וֹם וּבְרוּכִ֫ים הַבָּאִ֫ים! יְֽהוּדִי שָׁל֫וֹשׁ מֵא֫וֹת שִׁשִּׁ֫ים וְחָמֵ֫שׁ מַזְכִּירָ֫ה כׇּל מִצְוָ֫ה בִּזְמַנָּ֫הּ, בְּכׇל י֫וֹם מֵחָדָ֫שׁ.'
STYLES = {
    'promo': '(a bright, smiling Israeli radio-ad narrator, upbeat and confident, quick pace, lively melodic intonation)',
    'host': '(an energetic, warm TV host, smiling, quick natural pace, rich rising and falling intonation)',
}

model_dir, out, voice = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
takes = int(sys.argv[4]) if len(sys.argv) > 4 else 4
folder = out / 'vo' / voice
want = phonemize(VOWELED)


def norm(ipa):
    ipa = ipa.lower().replace('χ', 'x').replace('ʁ', 'r').replace('ɡ', 'g')
    return re.sub(r'[ˈʔh\s.,?!:;\-–]', '', ipa)


def trim(wav, sr, floor=0.012, pad=0.06):
    loud = np.where(np.abs(wav) > floor)[0]
    return wav[max(0, loud[0] - int(pad * sr)):min(len(wav), loud[-1] + int(pad * sr))] if len(loud) else wav


model = VoxCPM(voxcpm_model_path=str(model_dir), zipenhancer_model_path=None, enable_denoiser=False, optimize=False, device='cpu')
sr = model.tts_model.sample_rate
ears = pipeline('automatic-speech-recognition', model=os.environ['IPA_MODEL'], device='cpu',
                generate_kwargs={'language': 'he', 'task': 'transcribe'})
vowels = len(re.findall(r'[aeiou]', norm(want)))
tried, best = [], None
for take in range(takes):
    for name, style in STYLES.items():
        torch.manual_seed(900 + 37 * take + len(name))
        wav = trim(np.asarray(model.generate(text=style + TEXT, reference_wav_path=str(folder / 'ref.wav'),
                                             cfg_value=2.0, inference_timesteps=10), dtype=np.float32), sr)
        a = librosa.resample(wav, orig_sr=sr, target_sr=16000)
        f0, voiced, _ = librosa.pyin(a, fmin=90, fmax=450, sr=16000, frame_length=1024)
        f = f0[voiced & ~np.isnan(f0)]
        spread = float(np.std(12 * np.log2(f / np.median(f))))
        heard = ears({'raw': a, 'sampling_rate': 16000})['text']
        match = difflib.SequenceMatcher(None, norm(heard), norm(want)).ratio()
        rate = vowels / (len(wav) / sr)
        # Exactness first; then pitch spread up to 4.5 semitones and pace up to 6 vowels a second.
        score = match + 0.03 * min(max(spread - 2.5, 0), 2) + 0.03 * min(max(rate - 5, 0), 1)
        tried.append({'style': name, 'take': take, 'score': round(score, 3), 'match': round(match, 3),
                      'spread': round(spread, 2), 'rate': round(rate, 2), 'heard': heard})
        print(f'{name}{take} {score:.3f} match={match:.3f} spread={spread:.2f} rate={rate:.2f} {heard}', flush=True)
        if match >= 0.95 and (best is None or score > best[0]):
            best = (score, wav)
sf.write(folder / 'ref-live.wav', best[1], sr)
(folder / 'ref-live.txt').write_text(TEXT, encoding='utf-8')
(folder / 'ref-live.json').write_text(json.dumps(tried, ensure_ascii=False, indent=1), encoding='utf-8')
print('kept', max(tried, key=lambda t: t['score'] if t['match'] >= 0.95 else -1))
