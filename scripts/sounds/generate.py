# Writes the four notification sounds of the app to the current folder: python3 scripts/sounds/generate.py
# from assets/sounds. Original synthesis (no samples), 44.1 kHz mono 16-bit WAV, under two seconds each.
import numpy as np, wave, sys
SR=44100
def n2f(n): return 440*2**((n-69)/12)
def env(t,a,d): return np.minimum(t/a,1)*np.exp(-t/d)
def bell(f,dur,d=0.6):
    t=np.arange(int(SR*dur))/SR
    parts=[(1,1),(2.0,.45),(2.76,.25),(5.4,.1),(8.93,.05)]
    return sum(a*np.sin(2*np.pi*f*r*t)*np.exp(-t/(d/r**.5)) for r,a in parts)*np.minimum(t/0.004,1)
def marimba(f,dur):
    t=np.arange(int(SR*dur))/SR
    return (np.sin(2*np.pi*f*t)*np.exp(-t/.35)+.4*np.sin(2*np.pi*f*4*t)*np.exp(-t/.06)+.15*np.sin(2*np.pi*f*10*t)*np.exp(-t/.02))*np.minimum(t/0.002,1)
def pluck(f,dur):
    N=int(SR/f); buf=np.random.RandomState(int(f)).uniform(-1,1,N); out=np.zeros(int(SR*dur))
    for i in range(len(out)):
        out[i]=buf[i%N]; buf[i%N]=0.996*0.5*(buf[i%N]+buf[(i+1)%N])
    return out
def horn(f0,f1,dur):
    t=np.arange(int(SR*dur))/SR
    f=f0+(f1-f0)*np.clip(t/(dur*.35),0,1)**.6
    ph=2*np.pi*np.cumsum(f)/SR
    vib=1+.004*np.sin(2*np.pi*5.5*t)
    s=sum((1/k)**1.3*np.sin(k*ph*vib) for k in range(1,9))
    e=np.minimum(t/.06,1)*np.clip((dur-t)/.25,0,1)
    return s*e
def place(total,events):
    out=np.zeros(int(SR*total))
    for at,sig in events:
        i=int(SR*at); n=min(len(sig),len(out)-i); out[i:i+n]+=sig[:n]
    return out
def save(name,x):
    x=x/np.max(np.abs(x))*0.89
    fade=int(SR*.03); x[-fade:]*=np.linspace(1,0,fade)
    with wave.open(name,'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x*32767).astype('<i2').tobytes())
# 1 bells: ascending triad
save('jew365_bells.wav',place(1.8,[(0,bell(n2f(76),1.8)),(.16,bell(n2f(80),1.6)),(.32,bell(n2f(83),1.5))]))
# 2 call: rising horn-like call, two blasts
save('jew365_call.wav',place(1.6,[(0,horn(n2f(55),n2f(62),.55)*.8),(.6,horn(n2f(57),n2f(67),.95))]))
# 3 harp: Ahava Rabba motif D Eb F# G A
notes=[62,63,66,67,69]
save('jew365_harp.wav',place(1.9,[(i*.12,pluck(n2f(n+12),1.9-i*.12)) for i,n in enumerate(notes)]))
# 4 marimba: two-note minimal
save('jew365_drop.wav',place(1.1,[(0,marimba(n2f(79),1.1)),(.14,marimba(n2f(86),.95))]))

# The eight gentle sounds of 2026-11-12 (the owner's request: pleasant, soft, never loud or harsh): pure
# tones, slow attacks, few and quiet overtones, and a lower peak than the first four.
def soft_save(name, x, peak=0.6):
    x = x / np.max(np.abs(x)) * peak
    fade = int(SR * .08); x[-fade:] *= np.linspace(1, 0, fade) ** 2
    with wave.open(name, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())
def tone(f, dur, attack=.012, decay=.6, parts=((1, 1),)):
    t = np.arange(int(SR * dur)) / SR
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (decay / r ** .7)) for r, a in parts)
    return s * (1 - np.exp(-t / attack))
# chime: a wind chime, five pentatonic glass bells falling softly into place
save_chime = place(2.2, [(at, tone(n2f(n), 2.2 - at, .006, .9, ((1, 1), (2.76, .12)))) for at, n in
                         ((0, 84), (.18, 88), (.31, 81), (.52, 86), (.70, 91))])
soft_save('jew365_chime.wav', save_chime, .5)
# glass: two pure glass-harmonica notes that swell in
soft_save('jew365_glass.wav', place(1.8, [(0, tone(n2f(76), 1.8, .09, .7, ((1, 1), (2, .08)))),
                                          (.35, tone(n2f(83), 1.45, .09, .7, ((1, 1), (2, .08))))]))
# kalimba: three soft thumb-piano notes, falling
soft_save('jew365_kalimba.wav', place(1.3, [(at, tone(n2f(n), 1.3 - at, .004, .28, ((1, 1), (5.4, .05)))) for at, n in
                                            ((0, 79), (.16, 76), (.32, 72))]))
# dew: a single drop of water, a soft sine that slides down
t = np.arange(int(SR * .9)) / SR
f = n2f(86) * np.exp(-t * 2.2)
soft_save('jew365_dew.wav', np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .22) * (1 - np.exp(-t / .006)), .55)
# music_box: a short four-note melody on a music box
soft_save('jew365_music_box.wav', place(1.9, [(at, tone(n2f(n), 1.9 - at, .003, .45, ((1, 1), (3, .1), (4.2, .04)))) for at, n in
                                              ((0, 88), (.2, 91), (.4, 95), (.6, 93))]))
# flute: two breathy flute notes with a light vibrato
def flute(f, dur):
    t = np.arange(int(SR * dur)) / SR
    vib = 1 + .006 * np.sin(2 * np.pi * 5 * t)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    breath = np.random.RandomState(7).normal(0, .03, len(t))
    env = np.minimum(t / .12, 1) * np.clip((dur - t) / .3, 0, 1)
    return (np.sin(ph) + .15 * np.sin(2 * ph) + breath) * env
soft_save('jew365_flute.wav', place(1.6, [(0, flute(n2f(74), .7)), (.65, flute(n2f(79), .95))]), .3)
# bowl: a singing bowl, warm low partials that beat slowly
t = np.arange(int(SR * 2.6)) / SR
bowl = sum(a * np.sin(2 * np.pi * f0 * t) * np.exp(-t / d) for f0, a, d in
           ((n2f(64), 1, 1.6), (n2f(64) * 1.004, .7, 1.6), (n2f(64) * 2.71, .25, .9), (n2f(64) * 5.1, .06, .5)))
soft_save('jew365_bowl.wav', bowl * (1 - np.exp(-t / .02)), .55)
# piano: a soft felt piano, a gentle rising fifth
soft_save('jew365_piano.wav', place(1.6, [(at, tone(n2f(n), 1.6 - at, .005, .55, ((1, 1), (2, .3), (3, .1)))) for at, n in
                                          ((0, 72), (.22, 79))]))
