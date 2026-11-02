"""Trace the owner's logo of 2026-11-02 into the outlines build.mjs draws (SOURCE_PATHS), in the image's own pixels.

Usage, from the repository root (Python 3 with numpy and Pillow):
    python design/jew365-concepts/vector/trace/trace.py
It reads design/references/2026-11-02/logo.jpg and writes source-paths.json beside this file.
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image

WHITE = np.array([253.5, 253.5, 253.5])
IMG = None


def dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out


def coverage(ink, gate=35.0, reach=4):
    """Share of `ink` in each pixel along the white->ink line, kept only within `reach` px of pixels that are clearly that ink."""
    v = WHITE - IMG
    d = WHITE - np.array(ink, float)
    a = (v @ d) / (d @ d)
    resid = np.linalg.norm(v - a[..., None] * d, axis=-1)
    core = (a > 0.6) & (resid < gate)
    return np.clip(a, 0, 1) * dilate(core, reach)


def blur(a, sigma):
    r = int(math.ceil(sigma * 3))
    k = np.exp(-(np.arange(-r, r + 1) ** 2) / (2 * sigma * sigma))
    k /= k.sum()
    p = np.pad(a, r, mode='edge')
    p = np.apply_along_axis(lambda m: np.convolve(m, k, mode='valid'), 1, p)
    p = np.apply_along_axis(lambda m: np.convolve(m, k, mode='valid'), 0, p)
    return p


def contours(a, level=0.5):
    """Marching squares with linear interpolation; returns closed loops of (x, y) in pixel-centre coordinates."""
    h, w = a.shape
    b = a >= level
    idx = (b[:-1, :-1].astype(int) * 8 + b[:-1, 1:] * 4 + b[1:, 1:] * 2 + b[1:, :-1] * 1)
    def pt(edge):
        kind, x, y = edge
        if kind == 'h':
            v0, v1 = a[y, x], a[y, x + 1]
            t = (level - v0) / (v1 - v0)
            return (x + t, y)
        v0, v1 = a[y, x], a[y + 1, x]
        t = (level - v0) / (v1 - v0)
        return (x, y + t)
    nxt = {}
    ys, xs = np.nonzero((idx != 0) & (idx != 15))
    for y, x in zip(ys, xs):
        c = idx[y, x]
        T, Rr, Bt, L = ('h', x, y), ('v', x + 1, y), ('h', x, y + 1), ('v', x, y)
        centre = (a[y, x] + a[y, x + 1] + a[y + 1, x] + a[y + 1, x + 1]) / 4 >= level
        segs = {
            1: [(L, Bt)], 2: [(Bt, Rr)], 3: [(L, Rr)], 4: [(Rr, T)], 6: [(Bt, T)], 7: [(L, T)],
            8: [(T, L)], 9: [(T, Bt)], 11: [(T, Rr)], 12: [(Rr, L)], 13: [(Rr, Bt)], 14: [(Bt, L)],
            5: [(L, T), (Rr, Bt)] if centre else [(L, Bt), (Rr, T)],
            10: [(T, Rr), (Bt, L)] if centre else [(T, L), (Bt, Rr)],
        }[c]
        for s, e in segs:
            nxt[s] = e
    loops = []
    seen = set()
    for start in list(nxt):
        if start in seen:
            continue
        loop = []
        e = start
        while e not in seen and e in nxt:
            seen.add(e)
            loop.append(pt(e))
            e = nxt[e]
        if len(loop) > 8:
            loops.append(np.array(loop))
    return loops


def area(p):
    x, y = p[:, 0], p[:, 1]
    return 0.5 * (np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


def resample(p, step=0.5):
    q = np.vstack([p, p[:1]])
    seg = np.linalg.norm(np.diff(q, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    n = max(8, int(s[-1] / step))
    t = np.linspace(0, s[-1], n, endpoint=False)
    return np.c_[np.interp(t, s, q[:, 0]), np.interp(t, s, q[:, 1])]


def bez(ctrl, t):
    t = np.asarray(t)[:, None]
    p0, p1, p2, p3 = ctrl
    mt = 1 - t
    return mt ** 3 * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t ** 3 * p3


def bez_d(ctrl, t):
    t = np.asarray(t)[:, None]
    p0, p1, p2, p3 = ctrl
    mt = 1 - t
    return 3 * mt * mt * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t * t * (p3 - p2)


def bez_dd(ctrl, t):
    t = np.asarray(t)[:, None]
    p0, p1, p2, p3 = ctrl
    return 6 * (1 - t) * (p2 - 2 * p1 + p0) + 6 * t * (p3 - 2 * p2 + p1)


def chord_u(pts):
    d = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))])
    return d / d[-1]


def gen_bezier(pts, u, t1, t2):
    p0, p3 = pts[0], pts[-1]
    a1 = t1[None, :] * (3 * (1 - u) ** 2 * u)[:, None]
    a2 = t2[None, :] * (3 * (1 - u) * u ** 2)[:, None]
    c = np.array([[np.sum(a1 * a1), np.sum(a1 * a2)], [np.sum(a1 * a2), np.sum(a2 * a2)]])
    base = bez([p0, p0, p3, p3], u)
    tmp = pts - base
    x = np.array([np.sum(a1 * tmp), np.sum(a2 * tmp)])
    det = c[0, 0] * c[1, 1] - c[0, 1] * c[1, 0]
    seg = np.linalg.norm(p3 - p0)
    if abs(det) > 1e-12:
        al1 = (x[0] * c[1, 1] - x[1] * c[0, 1]) / det
        al2 = (c[0, 0] * x[1] - c[1, 0] * x[0]) / det
    else:
        al1 = al2 = seg / 3
    eps = 1e-6 * seg
    if al1 < eps or al2 < eps:
        al1 = al2 = seg / 3
    return [p0, p0 + t1 * al1, p3 + t2 * al2, p3]


def reparam(ctrl, pts, u):
    q = bez(ctrl, u) - pts
    d1 = bez_d(ctrl, u)
    d2 = bez_dd(ctrl, u)
    num = np.sum(q * d1, axis=1)
    den = np.sum(d1 * d1, axis=1) + np.sum(q * d2, axis=1)
    with np.errstate(divide='ignore', invalid='ignore'):
        nu = np.where(np.abs(den) > 1e-12, u - num / den, u)
    return np.clip(nu, 0, 1)


def max_err(ctrl, pts, u):
    d = np.linalg.norm(bez(ctrl, u) - pts, axis=1)
    i = int(np.argmax(d[1:-1])) + 1 if len(d) > 2 else len(d) // 2
    return d[i], i


def norm(v):
    return v / (np.linalg.norm(v) + 1e-12)


def fit(pts, t1, t2, tol):
    if len(pts) == 2:
        dist = np.linalg.norm(pts[1] - pts[0]) / 3
        return [[pts[0], pts[0] + t1 * dist, pts[1] + t2 * dist, pts[1]]]
    u = chord_u(pts)
    ctrl = gen_bezier(pts, u, t1, t2)
    err, split = max_err(ctrl, pts, u)
    if err < tol:
        return [ctrl]
    if err < tol * 6:
        for _ in range(30):
            u = reparam(ctrl, pts, u)
            ctrl = gen_bezier(pts, u, t1, t2)
            err, split = max_err(ctrl, pts, u)
            if err < tol:
                return [ctrl]
    tc = norm(pts[split - 1] - pts[split + 1])
    return fit(pts[: split + 1], t1, tc, tol) + fit(pts[split:], -tc, t2, tol)


def fit_loop(loop, tol, pieces=8):
    p = resample(loop, 0.5)
    n = len(p)
    tan = lambda i: norm(p[(i + 3) % n] - p[(i - 3) % n])
    cuts = [int(round(i * n / pieces)) for i in range(pieces)] + [n]
    curves = []
    for a0, a1 in zip(cuts[:-1], cuts[1:]):
        seg = np.array([p[i % n] for i in range(a0, a1 + 1)])
        curves += fit(seg, tan(a0), -tan(a1 % n), tol)
    return curves


def cross2(a, b):
    return a[..., 0] * b[..., 1] - a[..., 1] * b[..., 0]


def pca_dev(pts):
    c = pts.mean(0)
    _, _, vt = np.linalg.svd(pts - c, full_matrices=False)
    return np.abs((pts - c) @ np.array([-vt[0][1], vt[0][0]])).max()


def line_fit(pts, snap_deg):
    c = pts.mean(0)
    _, _, vt = np.linalg.svd(pts - c)
    d = vt[0]
    ang = math.degrees(math.atan2(d[1], d[0])) % 180
    for target in (0, 90, 180):
        if abs(ang - target) < snap_deg:
            ang = target
    d = np.array([math.cos(math.radians(ang)), math.sin(math.radians(ang))])
    if np.dot(d, pts[-1] - pts[0]) < 0:
        d = -d
    return c, d


def fit_loop_lines(loop, tol=0.45, line_tol=0.25, grow_tol=0.35, merge_tol=0.55, ext_tol=0.2, min_len=20.0, snap_deg=2.0, trim=6):
    """Straight runs become exact lines (snapped to horizontal or vertical when within snap_deg); the rest is fitted
    with cubic Beziers whose end tangents follow the neighbouring lines, so every joint stays smooth."""
    p = resample(loop, 0.5)
    n = len(p)
    tan = lambda i: norm(p[(i + 3) % n] - p[(i - 3) % n])
    turn = np.array([abs(math.atan2(cross2(tan(i - 4), tan(i + 4)), np.dot(tan(i - 4), tan(i + 4)))) for i in range(n)])
    start = int(np.argmax(turn))
    p = np.roll(p, -start, axis=0)
    half = 12
    straight = np.zeros(n, bool)
    for i in range(half, n - half):
        win = p[i - half:i + half + 1]
        c = win.mean(0)
        _, _, vt = np.linalg.svd(win - c)
        straight[i] = np.abs((win - c) @ np.array([-vt[0][1], vt[0][0]])).max() < line_tol
    runs = []
    i = 0
    while i < n:
        if not straight[i]:
            i += 1
            continue
        j = i
        while j + 1 < n and straight[j + 1] and pca_dev(p[max(0, i - half):min(n, j + 1 + half + 1)]) < grow_tol:
            j += 1
        lo = runs[-1][1] + 2 * trim + 2 if runs else 0
        a0, a1 = max(i - half, lo), min(j + half, n - 1)
        c, d = line_fit(p[a0:a1 + 1], snap_deg)
        off = lambda k: abs(cross2(d, p[k] - c))
        while a0 - 1 >= lo and off(a0 - 1) < ext_tol:
            a0 -= 1
        while a1 + 1 < n and off(a1 + 1) < ext_tol:
            a1 += 1
        runs.append((a0 + trim, a1 - trim))
        i = max(j, a1) + 1
    merged = []
    for r in runs:
        if merged and pca_dev(p[merged[-1][0]:r[1] + 1]) < merge_tol:
            merged[-1] = (merged[-1][0], r[1])
        else:
            merged.append(r)
    runs = [r for r in merged if (r[1] - r[0]) * 0.5 >= min_len]
    fitted = [(a0, a1) + line_fit(p[a0:a1 + 1], snap_deg) for a0, a1 in runs]
    axis = lambda d: abs(d[0]) < 1e-9 or abs(d[1]) < 1e-9
    angle = lambda d0, d1: abs(math.degrees(math.atan2(cross2(d0, d1), np.dot(d0, d1))))
    facet = set()
    for i, (a0, a1, c, d) in enumerate(fitted):
        for j in (i - 1, i + 1):
            if not 0 <= j < len(fitted) or (axis(d) and axis(fitted[j][3])):
                continue
            gap = (fitted[j][0] - a1) if j > i else (a0 - fitted[j][1])
            if gap * 0.5 < 30 and angle(d, fitted[j][3]) < 20:
                facet.update({i, j} - {k for k in (i, j) if axis(fitted[k][3])})
    def flat_of_curve(a0, a1, d):
        before = norm(p[a0 % n] - p[(a0 - 40) % n])
        after = norm(p[(a1 + 40) % n] - p[a1 % n])
        return (a1 - a0) * 0.5 < 80 and angle(d, before) < 25 and angle(d, after) < 25
    lines = []
    for i, (a0, a1, c, d) in enumerate(fitted):
        if i in facet or flat_of_curve(a0, a1, d):
            continue
        proj = lambda q: c + d * np.dot(q - c, d)
        lines.append((a0, a1, proj(p[a0 % n]), proj(p[a1 % n]), d))
    curves = []
    if not lines:
        return fit_loop(loop, tol)
    for k, (a0, a1, s, e, d) in enumerate(lines):
        curves.append([s, s + (e - s) / 3, s + 2 * (e - s) / 3, e])
        b0, _, ns, _, nd = lines[(k + 1) % len(lines)]
        stop = b0 if k + 1 < len(lines) else b0 + n
        while stop < a1:
            stop += n
        if np.linalg.norm(ns - e) < 1e-6:
            continue
        mid = np.array([p[i % n] for i in range(a1, stop + 1)])
        if len(mid) < 3:
            mid = np.array([e, ns])
        mid[0], mid[-1] = e, ns
        curves += fit_with_corners(mid, d, -nd, tol)
    return curves


def fit_with_corners(pts, t1, t2, tol, k=6, corner_deg=70):
    m = len(pts)
    if m < 2 * k + 3:
        return fit(pts, t1, t2, tol)
    turn = np.zeros(m)
    for i in range(k, m - k):
        a, b = pts[i] - pts[i - k], pts[i + k] - pts[i]
        turn[i] = abs(math.degrees(math.atan2(cross2(a, b), np.dot(a, b))))
    cuts = [i for i in range(k, m - k) if turn[i] > corner_deg and turn[i] == turn[max(0, i - k):i + k + 1].max()]
    if not cuts:
        return fit(pts, t1, t2, tol)
    out = []
    bounds = [0] + cuts + [m - 1]
    for j in range(len(bounds) - 1):
        a0, a1 = bounds[j], bounds[j + 1]
        seg = pts[a0:a1 + 1]
        s1 = t1 if a0 == 0 else norm(pts[min(a0 + k, a1)] - pts[a0])
        s2 = t2 if a1 == m - 1 else norm(pts[max(a1 - k, a0)] - pts[a1])
        out += fit(seg, s1, s2, tol)
    return out


def to_d(curves, nd=1):
    f = lambda v: f"{v:.{nd}f}".rstrip('0').rstrip('.')
    s = f"M{f(curves[0][0][0])} {f(curves[0][0][1])}"
    for c in curves:
        straight = np.allclose(c[1], c[0] + (c[3] - c[0]) / 3) and np.allclose(c[2], c[0] + 2 * (c[3] - c[0]) / 3)
        s += f"L{f(c[3][0])} {f(c[3][1])}" if straight else "C" + " ".join(f"{f(q[0])} {f(q[1])}" for q in c[1:])
    return s + "Z"


def trace_region(ink, box, tol=0.45, sigma=0.9, gate=35.0, min_area=40):
    x0, y0, x1, y1 = box
    a = coverage(ink, gate)[y0:y1, x0:x1]
    a = blur(a, sigma)
    out = []
    for loop in contours(a):
        if abs(area(loop)) < min_area:
            continue
        loop = loop + np.array([x0 + 0.5, y0 + 0.5])
        curves = fit_loop_lines(loop, tol)
        out.append({'d': to_d(curves), 'segs': len(curves), 'area': float(area(loop)),
                    'bbox': [float(loop[:, 0].min()), float(loop[:, 1].min()), float(loop[:, 0].max()), float(loop[:, 1].max())]})
    return out


def trace_coverage(a, box, tol=0.45, sigma=0.9, min_area=30):
    x0, y0 = box[:2]
    a = blur(a, sigma)
    out = []
    for loop in contours(a):
        if abs(area(loop)) < min_area:
            continue
        loop = loop + np.array([x0 + 0.5, y0 + 0.5])
        out.append({'d': to_d(fit_loop_lines(loop, tol)), 'bbox': [float(loop[:, 0].min()), float(loop[:, 1].min())]})
    return out


def warm(box):
    """Coverage of any warm ink (orange and peach) against white, from the blue channel; cool pixels are 0."""
    R, B = IMG[..., 0], IMG[..., 2]
    a = np.clip((253.5 - B) / (253.5 - 12.0), 0, 1)
    a[(R - B) < 25] = 0
    x0, y0, x1, y1 = box
    return a[y0:y1, x0:x1]


def peach(box):
    R, B = IMG[..., 0], IMG[..., 2]
    a = coverage((253, 173, 104), gate=40, reach=3) * ~dilate((B < 60) & (R > 200), 2)
    x0, y0, x1, y1 = box
    return a[y0:y1, x0:x1]


RING_CENTRE = (568.2, 671.6)
RING_END_CAPS = ((752.3, 1072.7), (784.5, 264.1))


def ring_centre_line(harmonics=3):
    """The ring's centre line: mid points of its stroke on rays from RING_CENTRE, where the stroke has its full width
    (the button, the 8 o'clock tick and the end caps excluded), fitted as a radius with three harmonics and drawn
    from the bottom end cap to the top one."""
    R, B = IMG[..., 0], IMG[..., 2]
    yy, xx = np.mgrid[0:IMG.shape[0], 0:IMG.shape[1]]
    X, Y = xx + .5, yy + .5
    cov = np.clip((253.5 - R) / 248.5, 0, 1) * ((B - R > 60) & (B > 150))
    c0 = np.array(RING_CENTRE)
    d = np.hypot(X - c0[0], Y - c0[1])
    ang = (np.degrees(np.arctan2(X - c0[0], -(Y - c0[1]))) + 360) % 360
    ring = (cov > 0.5) & (d > 405) & (d < 492)
    th, rr = [], []
    for A in np.arange(160, 385, 0.5):
        m = ring & (np.abs(((ang - A % 360 + 180) % 360) - 180) < 0.25)
        if m.sum() < 6:
            continue
        lo, hi = d[m].min(), d[m].max()
        if 31 <= hi - lo <= 37:
            th.append(math.radians(A % 360))
            rr.append((lo + hi) / 2)
    th, rr = np.array(th), np.array(rr)
    basis = lambda t: np.stack([np.ones_like(t)] + [f(k * t) for k in range(1, harmonics + 1) for f in (np.cos, np.sin)], 1)
    coef, *_ = np.linalg.lstsq(basis(th), rr, rcond=None)
    pt = lambda t: np.c_[c0[0] + (basis(t) @ coef) * np.sin(t), c0[1] - (basis(t) @ coef) * np.cos(t)]
    ends = [math.atan2(e[0] - c0[0], -(e[1] - c0[1])) % (2 * math.pi) for e in RING_END_CAPS]
    line = pt(np.linspace(ends[0], ends[1] + 2 * math.pi, 600))
    return to_d(fit(line, norm(line[2] - line[0]), norm(line[-3] - line[-1]), 0.25)).rstrip('Z')


def main(image, out):
    global IMG
    IMG = np.asarray(Image.open(image).convert('RGB')).astype(float)
    glyphs = {'j': (260, 490, 410, 690), 'e': (412, 490, 559, 690), 'w': (560, 490, 830, 690),
              'three': (285, 700, 442, 915), 'six': (443, 700, 603, 915), 'five': (604, 700, 760, 915)}
    letters = {k: '' for k in glyphs}
    for s in trace_region((0, 39, 103), (255, 485, 835, 925)):
        x, y = (s['bbox'][0] + s['bbox'][2]) / 2, (s['bbox'][1] + s['bbox'][3]) / 2
        letters[next(k for k, (x0, y0, x1, y1) in glyphs.items() if x0 <= x <= x1 and y0 <= y <= y1)] += s['d']
    bell_box, book_box = (735, 185, 1095, 570), (755, 770, 1150, 1080)
    lines = trace_coverage(peach(book_box), book_box, min_area=60)
    is_line = lambda b: any(abs(b[0] - l['bbox'][0]) < 4 and abs(b[1] - l['bbox'][1]) < 4 for l in lines)
    paths = {
        'letters': letters,
        'bell': ''.join(s['d'] for s in trace_coverage(warm(bell_box), bell_box)),
        'book': ''.join(s['d'] for s in trace_coverage(warm(book_box), book_box) if not is_line(s['bbox'])),
        'ring': ring_centre_line(),
        'bookLines': ''.join(s['d'] for s in lines),
    }
    with open(out, 'w', encoding='utf8') as f:
        json.dump(paths, f, indent=1)
        f.write('\n')
    print('wrote', out)


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    main(os.path.join(here, '..', '..', '..', 'references', '2026-11-02', 'logo.jpg'), os.path.join(here, 'source-paths.json'))
