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
