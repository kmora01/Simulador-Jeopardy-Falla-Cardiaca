"""Generador de ECG sintéticos de 12 derivaciones en SVG.

Cada trazado se construye sumando ondas gaussianas (P, Q, R, S, T, U) por derivación,
con un modelo de ritmo (sinusal, FA, flúter, bloqueos, TV...) y modificaciones del
segmento ST. No reproduce ningún ECG real: son imágenes didácticas originales, libres
para publicar.

Uso: python3 scripts/media/ecg.py            (genera public/img/ecg/*.svg)
"""
from __future__ import annotations

import math
import os
import sys
from copy import deepcopy

import numpy as np

FS = 250  # muestras por segundo
LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"]
LIMB = LEADS[:6]
PREC = LEADS[6:]
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "img", "ecg")

# --- Morfología normal por derivación: (centro ms desde inicio QRS, sigma ms, amplitud mV)
NORMAL_QRS = {
    "I": [(15, 8, -0.05), (40, 10, 0.75), (65, 8, -0.12)],
    "II": [(15, 8, -0.06), (40, 10, 1.05), (66, 8, -0.15)],
    "III": [(38, 10, 0.35), (64, 9, -0.2)],
    "aVR": [(22, 9, 0.12), (48, 12, -0.85)],
    "aVL": [(15, 8, -0.05), (40, 10, 0.35), (65, 9, -0.2)],
    "aVF": [(15, 8, -0.04), (40, 10, 0.7), (65, 8, -0.15)],
    "V1": [(25, 9, 0.22), (52, 12, -1.0)],
    "V2": [(27, 9, 0.4), (54, 12, -1.4)],
    "V3": [(32, 10, 0.8), (58, 11, -0.85)],
    "V4": [(15, 7, -0.04), (40, 10, 1.35), (64, 9, -0.45)],
    "V5": [(15, 7, -0.07), (40, 10, 1.25), (64, 8, -0.22)],
    "V6": [(15, 7, -0.07), (40, 10, 0.95), (63, 8, -0.12)],
}
NORMAL_T = {"I": 0.22, "II": 0.32, "III": 0.1, "aVR": -0.26, "aVL": 0.1, "aVF": 0.22,
            "V1": 0.05, "V2": 0.45, "V3": 0.5, "V4": 0.45, "V5": 0.35, "V6": 0.27}
NORMAL_P = {"I": 0.1, "II": 0.17, "III": 0.08, "aVR": -0.13, "aVL": 0.04, "aVF": 0.13,
            "V1": 0.08, "V2": 0.1, "V3": 0.1, "V4": 0.1, "V5": 0.09, "V6": 0.08}


def base_beat():
    return {
        "qrs": deepcopy(NORMAL_QRS),
        "qrs_ms": 90,
        "t": dict(NORMAL_T),
        "t_ms": 300,       # pico de T desde inicio del QRS
        "t_sigma": 55,
        "t_shape": {},     # derivación -> lista extra de ondas (bifásicas, etc.)
        "st": {l: 0.0 for l in LEADS},
        "st_shape": "flat",  # flat | convex | downsloping | scoop
        "u": {l: 0.0 for l in LEADS},
        "p": dict(NORMAL_P),
        "p_ms": 100,       # duración aproximada de P
        "pr_ms": 160,
        "extra": {},       # derivación -> ondas adicionales (delta, epsilon, Osborn...)
    }


def g(t, c, s, a):
    return a * np.exp(-0.5 * ((t - c) / s) ** 2)


def sig(x):
    return 1 / (1 + np.exp(-x))


def render_beat(t_ms, beat, lead, scale=1.0):
    """Señal de un latido (QRS+ST+T+U) para tiempos t_ms relativos al inicio del QRS."""
    y = np.zeros_like(t_ms, dtype=float)
    for c, s, a in beat["qrs"][lead]:
        y += g(t_ms, c, s, a * scale)
    for c, s, a in beat["extra"].get(lead, []):
        y += g(t_ms, c, s, a * scale)
    j = beat["qrs_ms"]
    st = beat["st"][lead]
    if st:
        shape = beat["st_shape"]
        up = sig((t_ms - j + 5) / 6)
        down = sig((beat["t_ms"] + 70 - t_ms) / 25)
        if shape == "downsloping":
            ramp = np.clip((t_ms - j) / (beat["t_ms"] - j + 60), 0, 1)
            y += st * up * down * (1 - 0.6 * ramp)
        elif shape == "scoop":
            ramp = np.clip((t_ms - j) / (beat["t_ms"] - j), 0, 1)
            y += st * up * down * np.sin(ramp * math.pi / 2 + 0.2) ** 0.5
        elif shape == "convex":
            y += st * up * down * (1 + 0.15 * np.sin(np.clip((t_ms - j) / (beat["t_ms"] - j), 0, 1) * math.pi))
        else:
            y += st * up * down
    ta = beat["t"][lead]
    if ta:
        y += g(t_ms, beat["t_ms"], beat["t_sigma"], ta)
    for c, s, a in beat["t_shape"].get(lead, []):
        y += g(t_ms, c, s, a)
    ua = beat["u"][lead]
    if ua:
        y += g(t_ms, beat["t_ms"] + 170, 40, ua)
    return y


def render_p(t_ms, beat, lead, amp_scale=1.0):
    if lead in beat.get("p_custom", {}):
        return sum(g(t_ms, c, s_, a * amp_scale) for c, s_, a in beat["p_custom"][lead])
    a = beat["p"][lead] * amp_scale
    if lead == "V1":  # P bifásica en V1
        return g(t_ms, 35, 16, a) + g(t_ms, 75, 16, -a * 0.6)
    return g(t_ms, beat["p_ms"] / 2, beat["p_ms"] / 4.5, a)


class ECG:
    """Construye una señal continua de 10 s para las 12 derivaciones."""

    def __init__(self, seconds=10.0, seed=1):
        self.n = int(seconds * FS)
        self.t = np.arange(self.n) / FS * 1000  # ms
        self.sig = {l: np.zeros(self.n) for l in LEADS}
        self.rng = np.random.default_rng(seed)
        self.spikes = []  # (ms, tipo) espigas de marcapasos

    def add_beat(self, qrs_onset_ms, beat, scale=1.0, leads=None):
        lo, hi = qrs_onset_ms - 50, qrs_onset_ms + 800
        m = (self.t >= lo) & (self.t <= hi)
        for l in leads or LEADS:
            self.sig[l][m] += render_beat(self.t[m] - qrs_onset_ms, beat, l, scale)

    def add_p(self, p_onset_ms, beat, amp_scale=1.0):
        m = (self.t >= p_onset_ms - 20) & (self.t <= p_onset_ms + 200)
        for l in LEADS:
            self.sig[l][m] += render_p(self.t[m] - p_onset_ms, beat, l, amp_scale)

    def add_wave(self, lead_amps, func):
        for l, a in lead_amps.items():
            self.sig[l] += a * func(self.t)

    def noise(self, level=0.012, wander=0.03):
        for i, l in enumerate(LEADS):
            self.sig[l] += self.rng.normal(0, level, self.n)
            ph = self.rng.uniform(0, 6.28)
            self.sig[l] += wander * np.sin(2 * math.pi * 0.18 * self.t / 1000 + ph)

    def smooth(self):
        k = np.array([0.25, 0.5, 0.25])
        for l in LEADS:
            self.sig[l] = np.convolve(self.sig[l], k, mode="same")


# ---------------------------------------------------------------------------------
# Ritmos

def sinus(ecg, beat, rate=72, jitter=0.02, start=180):
    rr = 60000 / rate
    t = start + beat["pr_ms"]
    while t < ecg.t[-1] + 200:
        ecg.add_p(t - beat["pr_ms"], beat)
        ecg.add_beat(t, beat)
        t += rr * (1 + ecg.rng.normal(0, jitter))


def af(ecg, beat, mean_rate=110, irregular=0.28, fwave=0.05):
    b = deepcopy(beat)
    t = 150.0
    rr = 60000 / mean_rate
    while t < ecg.t[-1] + 200:
        ecg.add_beat(t, b)
        t += rr * (1 + ecg.rng.uniform(-irregular, irregular * 1.3))
    amps = {"II": fwave, "III": fwave, "aVF": fwave, "V1": fwave * 1.6, "I": fwave * 0.4, "aVR": -fwave * 0.6,
            "aVL": fwave * 0.3, "V2": fwave * 0.9}
    ph = ecg.rng.uniform(0, 6, 3)
    ecg.add_wave(amps, lambda x: (np.sin(2 * math.pi * 6.1 * x / 1000 + ph[0]) * 0.6
                                  + np.sin(2 * math.pi * 7.7 * x / 1000 + ph[1]) * 0.4
                                  + np.sin(2 * math.pi * 4.9 * x / 1000 + ph[2]) * 0.3))


def flutter(ecg, beat, conduction=2, atrial_rate=300, variable=False, amp=1.0):
    cyc = 60000 / atrial_rate

    def saw(x):
        ph = (x % cyc) / cyc
        return np.where(ph < 0.75, -ph / 0.75, -1 + (ph - 0.75) / 0.25) + 0.5

    amps = {"II": 0.22, "III": 0.25, "aVF": 0.24, "aVR": -0.12, "aVL": -0.05, "I": 0.03, "V1": -0.12,
            "V2": -0.05, "V3": 0.03, "V4": 0.03, "V5": 0.03, "V6": 0.03}
    ecg.add_wave({k: v * amp for k, v in amps.items()}, saw)
    t = cyc * 0.8 + 140
    seq = [conduction] if not variable else [2, 4, 2, 3, 4, 2]
    i = 0
    while t < ecg.t[-1] + 200:
        ecg.add_beat(t, beat)
        t += cyc * seq[i % len(seq)]
        i += 1


def av_block(ecg, beat, kind, atrial_rate=80, escape_rate=38, escape_beat=None):
    pp = 60000 / atrial_rate
    p_times = np.arange(150, ecg.t[-1] + 200, pp)
    if kind == "complete":
        for p in p_times:
            ecg.add_p(p, beat)
        rr = 60000 / escape_rate
        t = 420.0
        while t < ecg.t[-1] + 200:
            ecg.add_beat(t, escape_beat or beat)
            t += rr
        return
    pr = beat["pr_ms"]
    k = 0
    for i, p in enumerate(p_times):
        ecg.add_p(p, beat)
        if kind == "first":
            ecg.add_beat(p + pr, beat)
        elif kind == "wenckebach":  # ciclos 4:3
            pos = i % 4
            if pos < 3:
                ecg.add_beat(p + pr + [0, 110, 170][pos], beat)
        elif kind == "mobitz2":  # 3:2 / 4:3 con PR fijo
            pos = i % 4
            if pos != 3:
                ecg.add_beat(p + pr, beat)
        elif kind == "2to1":
            if i % 2 == 0:
                ecg.add_beat(p + pr, beat)


def regular(ecg, beat, rate, start=200, with_p=False):
    rr = 60000 / rate
    t = start
    while t < ecg.t[-1] + 200:
        if with_p:
            ecg.add_p(t - beat["pr_ms"], beat)
        ecg.add_beat(t, beat)
        t += rr


# ---------------------------------------------------------------------------------
# Modificadores de morfología

def set_st(beat, mv: dict, shape="flat"):
    beat["st"].update(mv)
    beat["st_shape"] = shape


def mult_t(beat, mult: dict):
    for l, m in mult.items():
        beat["t"][l] = beat["t"][l] * m if isinstance(m, float) and abs(m) < 5 else m


def set_t(beat, vals: dict):
    beat["t"].update(vals)


def q_waves(beat, leads, depth=0.35, width=14):
    for l in leads:
        r = [w for w in beat["qrs"][l]]
        beat["qrs"][l] = [(18, width / 2 + 3, -depth)] + [(c + 8, s, a * 0.55 if a > 0 else a) for c, s, a in r if c > 25]


def widen(beat, factor=1.6):
    for l in LEADS:
        beat["qrs"][l] = [(c * factor, s * factor, a) for c, s, a in beat["qrs"][l]]
    beat["qrs_ms"] = int(beat["qrs_ms"] * factor)
    beat["t_ms"] += int(beat["qrs_ms"] * 0.4)


def rbbb(beat):
    b = beat
    b["qrs_ms"] = 140
    b["qrs"]["V1"] = [(20, 8, 0.25), (45, 9, -0.35), (100, 19, 1.0)]
    b["qrs"]["V2"] = [(20, 8, 0.35), (48, 10, -0.6), (102, 19, 0.7)]
    b["qrs"]["V3"] = [(35, 10, 0.7), (60, 10, -0.5), (100, 14, 0.25)]
    for l, a in (("I", 0.7), ("V5", 1.1), ("V6", 0.9), ("aVL", 0.35), ("II", 0.9)):
        b["qrs"][l] = [(15, 7, -0.05), (40, 10, a), (102, 24, -0.45 if l in ("I", "V5", "V6", "aVL") else -0.2)]
    b["qrs"]["aVR"] = [(25, 9, 0.05), (48, 12, -0.75), (105, 18, 0.3)]
    b["t_ms"] = 330
    set_t(b, {"V1": -0.2, "V2": -0.12, "V3": 0.15})


def lbbb(beat):
    b = beat
    b["qrs_ms"] = 155
    b["qrs"]["V1"] = [(25, 9, 0.08), (75, 30, -1.5)]
    b["qrs"]["V2"] = [(25, 9, 0.12), (78, 30, -2.0)]
    b["qrs"]["V3"] = [(28, 10, 0.2), (80, 28, -1.4)]
    b["qrs"]["V4"] = [(45, 18, 0.5), (95, 22, -0.4)]
    b["qrs"]["V5"] = [(55, 18, 0.9), (105, 18, 0.95)]
    b["qrs"]["V6"] = [(55, 18, 0.85), (105, 18, 0.9)]
    b["qrs"]["I"] = [(55, 18, 0.7), (105, 18, 0.7)]
    b["qrs"]["aVL"] = [(55, 18, 0.55), (105, 18, 0.6)]
    b["qrs"]["II"] = [(50, 20, 0.5), (100, 20, 0.35)]
    b["qrs"]["III"] = [(50, 18, -0.3), (100, 22, -0.25)]
    b["qrs"]["aVF"] = [(50, 20, 0.15), (100, 22, 0.08)]
    b["qrs"]["aVR"] = [(80, 30, -0.75)]
    b["t_ms"] = 350
    b["t_sigma"] = 65
    set_t(b, {"V1": 0.35, "V2": 0.45, "V3": 0.35, "V4": 0.05, "V5": -0.3, "V6": -0.3, "I": -0.25, "aVL": -0.25,
              "II": -0.05, "III": 0.1, "aVF": 0.05, "aVR": 0.2})
    set_st(b, {"V1": 0.15, "V2": 0.2, "V3": 0.15, "V5": -0.1, "V6": -0.1, "I": -0.08, "aVL": -0.08}, "flat")


def lafb(beat):
    b = beat
    b["qrs"]["I"] = [(18, 7, 0.08), (42, 10, 0.75), (66, 8, -0.05)]
    b["qrs"]["aVL"] = [(18, 7, -0.1), (42, 10, 0.95)]
    b["qrs"]["II"] = [(18, 7, 0.12), (45, 11, -0.65)]
    b["qrs"]["III"] = [(18, 7, 0.18), (47, 11, -0.95)]
    b["qrs"]["aVF"] = [(18, 7, 0.15), (46, 11, -0.8)]
    b["qrs"]["aVR"] = [(22, 9, -0.25), (55, 12, 0.3)]
    b["qrs"]["V5"] = [(40, 10, 0.95), (66, 9, -0.45)]
    b["qrs"]["V6"] = [(40, 10, 0.7), (66, 9, -0.4)]
    set_t(b, {"II": 0.15, "III": 0.05, "aVF": 0.1, "aVL": 0.18})


def lvh(beat, strain=True):
    b = beat
    sc = {"V1": 1.0, "V2": 1.0, "V3": 0.9, "V4": 1.0, "V5": 1.0, "V6": 1.0}
    b["qrs"]["V1"] = [(25, 10, 0.15), (55, 13, -2.4)]
    b["qrs"]["V2"] = [(27, 10, 0.3), (57, 13, -2.8)]
    b["qrs"]["V3"] = [(32, 10, 0.9), (60, 12, -1.5)]
    b["qrs"]["V5"] = [(15, 7, -0.05), (45, 11, 3.0), (68, 8, -0.1)]
    b["qrs"]["V6"] = [(15, 7, -0.05), (45, 11, 2.4), (68, 8, -0.05)]
    b["qrs"]["V4"] = [(42, 11, 2.2), (66, 9, -0.6)]
    b["qrs"]["aVL"] = [(15, 7, -0.05), (42, 10, 1.3), (66, 8, -0.1)]
    b["qrs"]["I"] = [(15, 7, -0.05), (42, 10, 1.4), (66, 8, -0.1)]
    b["qrs_ms"] = 105
    b["p"]["V1"] = 0.1  # crecimiento auricular izquierdo (P terminal negativa)
    if strain:
        set_st(b, {"V5": -0.15, "V6": -0.15, "I": -0.1, "aVL": -0.12, "V4": -0.05}, "downsloping")
        set_t(b, {"V5": -0.35, "V6": -0.3, "I": -0.2, "aVL": -0.25, "V4": -0.1})
        set_st(b, {"V1": 0.12, "V2": 0.15}, "downsloping")
    _ = sc


def rvh(beat):
    b = beat
    b["qrs"]["V1"] = [(30, 10, 1.1), (60, 10, -0.15)]
    b["qrs"]["V2"] = [(30, 10, 0.9), (60, 11, -0.5)]
    b["qrs"]["V5"] = [(40, 10, 0.4), (64, 10, -0.8)]
    b["qrs"]["V6"] = [(40, 10, 0.3), (64, 10, -0.7)]
    b["qrs"]["I"] = [(35, 10, 0.15), (60, 10, -0.6)]
    b["qrs"]["aVL"] = [(35, 10, 0.1), (60, 10, -0.6)]
    b["qrs"]["III"] = [(40, 10, 1.1), (64, 9, -0.1)]
    b["qrs"]["aVF"] = [(40, 10, 1.0), (64, 9, -0.1)]
    b["qrs"]["II"] = [(40, 10, 0.9), (64, 9, -0.15)]
    b["qrs"]["aVR"] = [(25, 9, -0.2), (55, 11, 0.45)]
    set_t(b, {"V1": -0.3, "V2": -0.25, "V3": -0.1, "I": 0.05})
    set_st(b, {"V1": -0.08, "V2": -0.06}, "downsloping")
    for l in ("II", "III", "aVF"):
        b["p"][l] = 0.28  # P pulmonale


def delta(beat, pr=100):
    """Preexcitación (vía lateral izquierda): PR corto, onda delta y QRS ancho."""
    b = beat
    b["pr_ms"] = pr
    amp = {"I": 0.3, "aVL": 0.3, "II": 0.25, "III": -0.05, "aVF": 0.1, "aVR": -0.25,
           "V1": 0.35, "V2": 0.45, "V3": 0.45, "V4": 0.45, "V5": 0.4, "V6": 0.35}
    for l in LEADS:
        b["qrs"][l] = [(c + 20, s, a) for c, s, a in b["qrs"][l]]
        b["extra"].setdefault(l, []).append((22, 24, amp[l] * 1.4))
    b["qrs"]["V1"] = [(55, 12, 0.7), (90, 12, -0.3)]
    b["qrs"]["V2"] = [(58, 12, 1.0), (90, 12, -0.5)]
    b["t_ms"] += 25
    b["qrs_ms"] = 125
    set_t(b, {"V1": -0.15, "V2": -0.1, "I": -0.05, "aVL": -0.15})


def vt_beat(axis="lbbb_inferior"):
    """Complejo de TV monomórfica (QRS muy ancho, concordancia precordial negativa)."""
    b = base_beat()
    b["qrs_ms"] = 180
    shapes = {
        "I": [(70, 32, 1.0)], "II": [(70, 32, -0.6)], "III": [(70, 32, -1.2)], "aVR": [(70, 32, 0.6)],
        "aVL": [(70, 32, 1.1)], "aVF": [(70, 32, -0.9)],
        "V1": [(40, 18, 0.3), (95, 30, 1.3)], "V2": [(90, 32, 1.4)], "V3": [(90, 32, 1.3)],
        "V4": [(90, 32, 1.1)], "V5": [(90, 32, -0.9)], "V6": [(30, 14, -0.4), (95, 30, -1.1)],
    }
    b["qrs"] = shapes
    b["t_ms"] = 330
    b["t_sigma"] = 70
    b["t"] = {l: -0.45 * np.sign(sum(a for _, _, a in shapes[l])) for l in LEADS}
    return b


def paced(beat):
    b = beat
    b["qrs_ms"] = 160
    neg = {"V1": -1.6, "V2": -2.0, "V3": -1.7, "V4": -1.2, "V5": -0.9, "V6": -0.7, "II": -1.0, "III": -1.2,
           "aVF": -1.1, "I": 0.6, "aVL": 0.9, "aVR": 0.3}
    for l, a in neg.items():
        b["qrs"][l] = [(70, 30, a)]
    b["t_ms"] = 360
    b["t"] = {l: -0.35 * np.sign(a) for l, a in neg.items()}


# ---------------------------------------------------------------------------------
# Render SVG

def svg_12lead(ecg: ECG, title="", rhythm_lead="II", speed=25, gain=10, cal=True):
    px = 4  # px por mm
    W_mm, row_h = 260, 27
    n_rows = 4
    H_mm = row_h * n_rows + 8
    W, H = W_mm * px, H_mm * px
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
             f'font-family="Helvetica,Arial,sans-serif">',
             '<defs><pattern id="s" width="4" height="4" patternUnits="userSpaceOnUse">'
             '<path d="M4 0H0V4" fill="none" stroke="#f6b9b9" stroke-width="0.4"/></pattern>'
             '<pattern id="b" width="20" height="20" patternUnits="userSpaceOnUse">'
             '<rect width="20" height="20" fill="url(#s)"/>'
             '<path d="M20 0H0V20" fill="none" stroke="#ec8a8a" stroke-width="0.9"/></pattern></defs>',
             f'<rect width="{W}" height="{H}" fill="#fff5f5"/><rect width="{W}" height="{H}" fill="url(#b)"/>']
    x0 = 10 * px
    seg = 2.5
    layout = [["I", "aVR", "V1", "V4"], ["II", "aVL", "V2", "V5"], ["III", "aVF", "V3", "V6"]]

    def path(lead, t0, t1, ox, oy):
        i0, i1 = int(t0 * FS), min(int(t1 * FS), ecg.n)
        y = ecg.sig[lead][i0:i1]
        xs = ox + (np.arange(i1 - i0) / FS) * speed * px
        ys = oy - y * gain * px
        d = "M" + " L".join(f"{a:.1f},{b:.1f}" for a, b in zip(xs, ys))
        return f'<path d="{d}" fill="none" stroke="#111" stroke-width="1.15" stroke-linejoin="round"/>'

    for r, row in enumerate(layout + [[rhythm_lead]]):
        oy = (r * row_h + row_h * 0.62 + 4) * px
        if cal:
            parts.append(f'<path d="M{2*px},{oy} h{2*px} v{-10*px} h{5*px} v{10*px} h{1*px}" fill="none" '
                         f'stroke="#111" stroke-width="1.2"/>')
        if r < 3:
            for c, lead in enumerate(row):
                ox = x0 + c * seg * speed * px
                parts.append(path(lead, c * seg, (c + 1) * seg, ox, oy))
                if c:
                    parts.append(f'<path d="M{ox},{oy - 3*px} v{6*px}" stroke="#111" stroke-width="1"/>')
                parts.append(f'<text x="{ox + 4}" y="{oy - 13*px}" font-size="15" font-weight="700" '
                             f'fill="#222">{lead}</text>')
        else:
            parts.append(path(row[0], 0, 10, x0, oy))
            parts.append(f'<text x="{x0 + 4}" y="{oy - 13*px}" font-size="15" font-weight="700" fill="#222">'
                         f'{row[0]}</text>')
        for ms, kind in ecg.spikes:
            if r == 3 or True:
                pass
    parts.append(f'<text x="{W - 8}" y="{H - 8}" font-size="12" text-anchor="end" fill="#555">'
                 f'25 mm/s · 10 mm/mV · ECG didáctico sintético</text>')
    parts.append("</svg>")
    return "".join(parts)


def svg_strip(ecg: ECG, leads=("II",), seconds=10, speed=25, gain=10):
    px = 4
    row_h = 30
    W_mm = seconds * speed + 14
    H_mm = row_h * len(leads) + 6
    W, H = W_mm * px, H_mm * px
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
             f'font-family="Helvetica,Arial,sans-serif">',
             '<defs><pattern id="s" width="4" height="4" patternUnits="userSpaceOnUse">'
             '<path d="M4 0H0V4" fill="none" stroke="#f6b9b9" stroke-width="0.4"/></pattern>'
             '<pattern id="b" width="20" height="20" patternUnits="userSpaceOnUse">'
             '<rect width="20" height="20" fill="url(#s)"/>'
             '<path d="M20 0H0V20" fill="none" stroke="#ec8a8a" stroke-width="0.9"/></pattern></defs>',
             f'<rect width="{W}" height="{H}" fill="#fff5f5"/><rect width="{W}" height="{H}" fill="url(#b)"/>']
    for r, lead in enumerate(leads):
        oy = (r * row_h + row_h * 0.6 + 3) * px
        i1 = min(int(seconds * FS), ecg.n)
        y = ecg.sig[lead][:i1]
        xs = 10 * px + np.arange(i1) / FS * speed * px
        ys = oy - y * gain * px
        d = "M" + " L".join(f"{a:.1f},{b:.1f}" for a, b in zip(xs, ys))
        parts.append(f'<path d="{d}" fill="none" stroke="#111" stroke-width="1.15"/>')
        parts.append(f'<text x="{10*px + 4}" y="{oy - 14*px}" font-size="15" font-weight="700" fill="#222">{lead}</text>')
    parts.append(f'<text x="{W - 8}" y="{H - 8}" font-size="12" text-anchor="end" fill="#555">'
                 f'25 mm/s · 10 mm/mV · tira de ritmo sintética</text></svg>')
    return "".join(parts)
