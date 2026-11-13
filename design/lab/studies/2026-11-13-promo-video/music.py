"""Original background music for the promo video, synthesised with numpy (seeded, so every run is the same).

D major, 96 BPM, I-V-vi-IV. Sections follow the video's timeline (seconds):
  0-6    intro: pad and a bell motif (the notification)
  6-22   build: plucked arpeggio, soft kick from 11 s
  22-29  full: kick, clap, bass, arpeggio (the montage)
  29-35  calm: pad and bells only (Shabbat)
  35-end outro: swell and a final chord
Usage: python3 music.py <out.wav> [duration seconds]
"""
import sys
import wave

import numpy as np

SR = 44100
BPM = 96
BEAT = 60 / BPM
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 42.0
N = int(SR * DUR)
rng = np.random.default_rng(365)

# I-V-vi-IV in D, one chord per bar (4 beats = 2.5 s)
CHORDS = [[62, 66, 69], [57, 61, 64], [59, 62, 66], [55, 59, 62]]
BAR = 4 * BEAT


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_adsr(n, a, d, s, r):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    e = np.full(n, s, dtype=np.float64)
    e[:a] = np.linspace(0, 1, a, endpoint=False) if a else e[:a]
    e[a:a + d] = np.linspace(1, s, max(d, 1))[: len(e[a:a + d])]
    if r:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def add(buf, start, sig):
    i = int(start * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    buf[i:i + len(sig)] += sig


def section_gain(t):
    """Per-layer loudness over time, as (pad, bell, arp, kick, clap, bass)."""
    def ramp(t, a, b):
        return np.clip((t - a) / (b - a), 0, 1)

    pad = 0.55 + 0.25 * ramp(t, 22, 24) - 0.2 * ramp(t, 29, 30) + 0.35 * ramp(t, 35, 38)
    bell = np.where(t < 7, 1.0, np.where((t > 29) & (t < 35.5), 0.9, 0.35))
    arp = ramp(t, 6, 8) * (1 - ramp(t, 29, 29.6)) + 0.6 * ramp(t, 35, 36) * (1 - ramp(t, DUR - 3, DUR - 1))
    kick = ramp(t, 11, 11.1) * (1 - ramp(t, 29, 29.2)) + ramp(t, 35.5, 35.6) * (1 - ramp(t, DUR - 3.5, DUR - 3.4))
    clap = ramp(t, 22, 22.1) * (1 - ramp(t, 29, 29.2))
    bass = ramp(t, 14.5, 15.5) * (1 - ramp(t, 29, 29.5)) + ramp(t, 35, 36) * (1 - ramp(t, DUR - 2, DUR - 0.5))
    return pad, bell, arp, kick, clap, bass


def pad_voice(f, n):
    t = np.arange(n) / SR
    detune = [0.997, 1.0, 1.003]
    sig = sum(np.sin(2 * np.pi * f * d * t + rng.uniform(0, 6)) for d in detune)
    sig += 0.3 * sum(np.sin(2 * np.pi * 2 * f * d * t) for d in detune)
    lfo = 0.85 + 0.15 * np.sin(2 * np.pi * 0.2 * t)
    return sig * lfo / 4


def pluck(f, dur=0.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    return sig * np.exp(-t * 7)


def bell(f, dur=2.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 3)
           + 0.25 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t * 6))
    return sig * np.exp(-t * 2.2) * np.minimum(1, t * 200)


def kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 50 + 90 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def clap():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    # crude band-pass: difference of two moving averages
    hp = noise - np.convolve(noise, np.ones(8) / 8, mode='same')
    bp = np.convolve(hp, np.ones(3) / 3, mode='same')
    return bp * np.exp(-t * 18) * 0.6


def bass_note(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * 2 * f * t)
    return sig * env_adsr(n, 0.01, 0.2, 0.7, 0.08)


layers = {k: np.zeros(N) for k in ('pad', 'bell', 'arp', 'kick', 'clap', 'bass')}

bars = int(np.ceil(DUR / BAR)) + 1
for b in range(bars):
    start = b * BAR
    chord = CHORDS[b % 4]
    n = int((BAR + 1.0) * SR)
    for m in chord:
        layers['pad'] += 0 if start >= DUR else 0
        add(layers['pad'], start, pad_voice(hz(m - 12), n) * env_adsr(n, 0.6, 0.3, 0.8, 1.0))
    # arpeggio in eighths: root, third, fifth, octave pattern
    pattern = [chord[0], chord[1], chord[2], chord[0] + 12, chord[2], chord[1], chord[2], chord[0] + 12]
    for i, m in enumerate(pattern):
        add(layers['arp'], start + i * BEAT / 2, pluck(hz(m + 12)) * (0.9 if i % 2 == 0 else 0.6))
    for i in range(4):
        add(layers['kick'], start + i * BEAT, kick())
        if i in (1, 3):
            add(layers['clap'], start + i * BEAT, clap())
    for i in range(2):
        add(layers['bass'], start + i * 2 * BEAT, bass_note(hz(chord[0] - 24), 2 * BEAT - 0.05))

# The notification motif: a rising three-note bell at 0.6 s, echoed later.
for at, notes in ((0.6, [74, 78, 81]), (5.4, [74, 78, 81]), (17.6, [81, 86]), (29.6, [74, 78, 81, 86]),
                  (32.1, [78, 81]), (36.0, [74, 78, 81, 86])):
    for i, m in enumerate(notes):
        add(layers['bell'], at + i * 0.18, bell(hz(m)) * 0.7)

t = np.arange(N) / SR
gains = dict(zip(('pad', 'bell', 'arp', 'kick', 'clap', 'bass'), section_gain(t)))
mix_level = {'pad': 0.16, 'bell': 0.16, 'arp': 0.13, 'kick': 0.38, 'clap': 0.12, 'bass': 0.2}
mix = sum(layers[k] * gains[k] * mix_level[k] for k in layers)

# simple stereo: arpeggio and bells slightly apart, a short echo on the bells
echo = np.zeros(N)
d = int(0.375 * SR)
echo[d:] = (layers['bell'] * gains['bell'] * mix_level['bell'])[:-d] * 0.35
left = mix + 0.15 * layers['arp'] * gains['arp'] * mix_level['arp'] + echo
right = mix - 0.15 * layers['arp'] * gains['arp'] * mix_level['arp'] + np.roll(echo, int(0.05 * SR))

fade = np.ones(N)
fade[: int(0.3 * SR)] = np.linspace(0, 1, int(0.3 * SR))
fade[-int(2.0 * SR):] = np.linspace(1, 0, int(2.0 * SR)) ** 1.5
stereo = np.stack([left * fade, right * fade], axis=1)
stereo /= np.max(np.abs(stereo)) / 0.85
pcm = (stereo * 32767).astype('<i2')

with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f'wrote {sys.argv[1]} ({DUR:.1f} s)')
