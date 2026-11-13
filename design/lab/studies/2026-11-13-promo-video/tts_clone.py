"""Round 4 narration engines, each cloning round 3's designed `warm` voice (out/vo/warm/ref.wav, made by
tts_vox.py from a description, so no real person is cloned):

- chatterbox: Resemble AI's Chatterbox Multilingual V3 (MIT), its Hebrew pointed by Dicta's nakdan
  (dicta-onnx, `dicta-1.0.int8.onnx`) with a few words the nakdan points wrongly corrected (HE_FIX);
- omnivoice: k2-fsa's OmniVoice (CC BY-NC), as a comparison.

Usage: <venv>/bin/python tts_clone.py <engine> <model dir> <out dir> <variant[,variant]> [takes] [beat,beat]
Env: DICTA (the nakdan model, chatterbox only) and WHISPER_DIR (ivrit-ai/whisper-large-v3-turbo-ct2) when takes > 1:
each line is generated that many times and the take Hebrew Whisper transcribes closest to the text is kept.
Writes <out>/vo/<engine>/<variant>-<n>.wav and <variant>.json, like tts_vox.py.
"""
import difflib
import json
import os
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

torch.set_num_threads(4)
HERE = Path(__file__).parent
REF_TEXT = 'שלום וברוכים הבאים. יהודי שלוש מאות שישים וחמש עוזרת לך לקיים כל מצווה בזמנה, בכל יום מחדש.'
# Words Dicta's nakdan points wrongly in these lines (read 2026-11-13).
HE_FIX = {'מַנְחֶה': 'מִנְחָה', 'חַק': 'חֹק', 'לַכֹּותֶל': 'לַכֹּתֶל'}

engine, model_dir, out = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
variants = sys.argv[4].split(',')
takes = int(sys.argv[5]) if len(sys.argv) > 5 else 1
only = [int(x) for x in sys.argv[6].split(',')] if len(sys.argv) > 6 else None
ref = out / 'vo' / 'warm' / 'ref.wav'
data = json.loads((HERE / 'variants.json').read_text(encoding='utf-8'))


def spoken(text):
    return re.sub(r'\s+', ' ', text.replace('יהודי 365', 'יהודי שלוש מאות שישים וחמש')).strip()


def plain(text):
    return re.sub(r'[^א-ת0-9 ]', '', re.sub(r'[֑-ׇ]', '', text)).split()


def trim(wav, sr, floor=0.012, pad=0.06):
    loud = np.where(np.abs(wav) > floor)[0]
    if not len(loud):
        return wav
    return wav[max(0, loud[0] - int(pad * sr)):min(len(wav), loud[-1] + int(pad * sr))]


if engine == 'chatterbox':
    from safetensors.torch import load_file
    import perth
    import chatterbox.models.tokenizers.tokenizer as tk
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS, MTLTokenizer, S3Gen, T3, T3Config, VoiceEncoder
    from dicta_onnx import Dicta

    class NoMark:  # resemble-perth's watermarker needs native code this environment lacks
        def apply_watermark(self, wav, sample_rate):
            return wav

    perth.PerthImplicitWatermarker = NoMark
    nakdan = Dicta(os.environ['DICTA'])

    def point(text):
        pointed = nakdan.add_diacritics(text)
        for wrong, right in HE_FIX.items():
            pointed = pointed.replace(wrong, right)
        return pointed

    tk.add_hebrew_diacritics = point
    ve = VoiceEncoder()
    ve.load_state_dict(load_file(model_dir / 've.safetensors'))
    t3 = T3(T3Config.multilingual())
    t3.load_state_dict(load_file(model_dir / 't3_mtl23ls_v3.safetensors'))
    s3 = S3Gen()
    s3.load_state_dict(load_file(model_dir / 's3gen_v3.safetensors'), strict=False)
    model = ChatterboxMultilingualTTS(t3.eval(), s3.eval(), ve.eval(), MTLTokenizer(str(model_dir / 'grapheme_mtl_merged_expanded_v1.json')), 'cpu')
    model.prepare_conditionals(str(ref), exaggeration=0.55)
    sr = model.sr

    def say(text):
        return model.generate(spoken(text), language_id='he', exaggeration=0.55, cfg_weight=0.5).squeeze().numpy()
else:
    from omnivoice import OmniVoice

    model = OmniVoice.from_pretrained(str(model_dir), dtype=torch.float32)
    sr = 24000

    def say(text):
        return model.generate(text=spoken(text), language='he', ref_audio=str(ref), ref_text=REF_TEXT)[0]

if takes > 1:
    from faster_whisper import WhisperModel

    asr = WhisperModel(os.environ['WHISPER_DIR'], device='cpu', compute_type='int8', cpu_threads=4)

    def score(wav, text):
        a = np.interp(np.arange(0, len(wav), sr / 16000), np.arange(len(wav)), wav).astype('float32')
        heard = ' '.join(s.text for s in asr.transcribe(a, language='he', beam_size=3)[0])
        return difflib.SequenceMatcher(None, plain(heard), plain(spoken(text))).ratio(), heard

folder = out / 'vo' / engine
folder.mkdir(parents=True, exist_ok=True)
for variant in variants:
    beats = data[variant]['beats']
    index = folder / f'{variant}.json'
    lines = json.loads(index.read_text(encoding='utf-8')) if only and index.exists() else [None] * len(beats)
    for n, beat in enumerate(beats):
        if only and n not in only:
            continue
        best = None
        for take in range(takes):
            torch.manual_seed(2000 + n + 7919 * take)
            wav = trim(np.asarray(say(beat['vo']), dtype=np.float32), sr)
            if takes == 1:
                best = (1, wav)
                break
            ratio, heard = score(wav, beat['vo'])
            print(f'  take {take}: {ratio:.2f} {heard}', flush=True)
            if best is None or ratio > best[0]:
                best = (ratio, wav)
            if ratio >= 0.99:
                break
        sf.write(folder / f'{variant}-{n}.wav', best[1], sr)
        lines[n] = {'text': beat['vo'], 'seconds': round(len(best[1]) / sr, 3)}
        print(f'{engine} {variant}-{n}: {len(best[1]) / sr:.2f}s  {beat["vo"]}', flush=True)
    index.write_text(json.dumps(lines, ensure_ascii=False, indent=1), encoding='utf-8')
