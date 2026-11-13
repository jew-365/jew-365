"""Hebrew narration with VoxCPM2 (Apache-2.0, openbmb/VoxCPM2), the round 3 voices.

Each voice is designed once from a text description (no real person's voice is cloned): a reference sentence is
generated from the description with a fixed seed, and every narration line is then generated as a continuation
of that reference, so all lines keep one voice. Leading and trailing silence is trimmed.
Usage: <venv>/bin/python tts_vox.py <VoxCPM2 dir> <out dir> <voice[,voice]> <variant[,variant]> [beat,beat] [takes]
The fifth argument regenerates only those beats of an existing run; with a sixth, each of those beats is
generated that many times and the take Hebrew Whisper (WHISPER_DIR, ivrit-ai/whisper-large-v3-turbo-ct2)
transcribes closest to the text is kept. Vowel points do not help: VoxCPM2 misread more words with them.
Writes <out>/vo/<voice>/ref.wav, <variant>-<n>.wav and <variant>.json (each line's text and length).
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

torch.set_num_threads(4)
from voxcpm import VoxCPM  # noqa: E402

HERE = Path(__file__).parent
VOICES = {
    'warm': '(A young Israeli man around 28, warm and smiling, friendly and confident narrator, natural conversational pace)',
    'deep': '(An Israeli man in his forties, deep rich baritone, calm and trustworthy, professional commercial voice-over)',
    'lively': '(An energetic young Israeli man, upbeat and lively advertising voice, clear and quick)',
    'woman': '(A young Israeli woman around 30, warm, clear and friendly narrator, natural pace)',
}
REF_TEXT = 'שלום וברוכים הבאים. יהודי שלוש מאות שישים וחמש עוזרת לך לקיים כל מצווה בזמנה, בכל יום מחדש.'


def spoken(text):
    """The text as the narrator says it."""
    text = text.replace('יהודי 365', 'יהודי שלוש מאות שישים וחמש')
    return re.sub(r'\s+', ' ', text).strip()


def plain(text):
    return re.sub(r'[^\u05d0-\u05ea0-9 ]', '', re.sub(r'[\u0591-\u05c7]', '', text)).split()


def trim(wav, sr, floor=0.012, pad=0.06):
    loud = np.where(np.abs(wav) > floor)[0]
    if not len(loud):
        return wav
    a = max(0, loud[0] - int(pad * sr))
    b = min(len(wav), loud[-1] + int(pad * sr))
    return wav[a:b]


models, out = Path(sys.argv[1]), Path(sys.argv[2])
voices = sys.argv[3].split(',')
variants = sys.argv[4].split(',')
data = json.loads((HERE / 'variants.json').read_text(encoding='utf-8'))
model = VoxCPM(voxcpm_model_path=str(models), zipenhancer_model_path=None, enable_denoiser=False, optimize=False, device='cpu')
sr = model.tts_model.sample_rate
TAKES = int(sys.argv[6]) if len(sys.argv) > 6 else 1
if TAKES > 1:
    import difflib
    import os
    from faster_whisper import WhisperModel

    asr = WhisperModel(os.environ['WHISPER_DIR'], device='cpu', compute_type='int8', cpu_threads=4)

    def score(wav, text):
        a = np.interp(np.arange(0, len(wav), sr / 16000), np.arange(len(wav)), wav).astype('float32')
        heard = ' '.join(s.text for s in asr.transcribe(a, language='he', beam_size=3)[0])
        return difflib.SequenceMatcher(None, plain(heard), plain(spoken(text))).ratio(), heard

for voice in voices:
    folder = out / 'vo' / voice
    folder.mkdir(parents=True, exist_ok=True)
    ref = folder / 'ref.wav'
    if not ref.exists():
        torch.manual_seed(365)
        wav = model.generate(text=VOICES[voice] + REF_TEXT, cfg_value=2.0, inference_timesteps=10)
        sf.write(ref, trim(np.asarray(wav), sr), sr)
        print(f'{voice}: designed the reference voice', flush=True)
    for variant in variants:
        only = [int(x) for x in sys.argv[5].split(',')] if len(sys.argv) > 5 else None
        index = folder / f'{variant}.json'
        lines = json.loads(index.read_text(encoding='utf-8')) if only and index.exists() else [None] * len(data[variant]['beats'])
        for n, beat in enumerate(data[variant]['beats']):
            if only and n not in only:
                continue
            best = None
            for take in range(TAKES):
                torch.manual_seed(1000 + n + 7919 * take)
                wav = model.generate(
                    text=spoken(beat['vo']),
                    prompt_wav_path=str(ref),
                    prompt_text=REF_TEXT,
                    reference_wav_path=str(ref),
                    cfg_value=2.0,
                    inference_timesteps=10,
                )
                wav = trim(np.asarray(wav, dtype=np.float32), sr)
                if TAKES == 1:
                    best = (1, wav)
                    break
                ratio, heard = score(wav, beat['vo'])
                print(f'  take {take}: {ratio:.2f} {heard}', flush=True)
                if best is None or ratio > best[0]:
                    best = (ratio, wav)
            wav = best[1]
            sf.write(folder / f'{variant}-{n}.wav', wav, sr)
            lines[n] = {'text': beat['vo'], 'seconds': round(len(wav) / sr, 3)}
            print(f'{voice} {variant}-{n}: {len(wav) / sr:.2f}s  {beat["vo"]}', flush=True)
        (folder / f'{variant}.json').write_text(json.dumps(lines, ensure_ascii=False, indent=1), encoding='utf-8')
