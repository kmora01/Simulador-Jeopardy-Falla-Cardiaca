"""Catálogo de ECG didácticos. Cada función devuelve un objeto ECG listo para dibujar.
Ejecutar: python3 scripts/media/ecg_catalog.py [nombre ...]
"""
import math
import os
import sys
from copy import deepcopy

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from ecg import (ECG, LEADS, OUT, af, av_block, base_beat, delta, flutter, g, lafb, lbbb, lvh, paced,  # noqa
                 q_waves, rbbb, regular, render_beat, rvh, set_st, set_t, sinus, svg_12lead, svg_strip, vt_beat)

CAT = {}


def ecg(name, strip=None):
    def deco(f):
        CAT[name] = (f, strip)
        return f
    return deco


def mk(seed=1):
    return ECG(seed=seed)


@ecg("normal")
def _():
    e = mk(); sinus(e, base_beat(), 72); return e


@ecg("bradicardia-sinusal", strip=("II",))
def _():
    e = mk(); sinus(e, base_beat(), 42, 0.03); return e


@ecg("taquicardia-sinusal")
def _():
    b = base_beat(); b["t_ms"] = 250; b["pr_ms"] = 140
    e = mk(); sinus(e, b, 128, 0.01); return e


@ecg("fa-rapida")
def _():
    b = base_beat(); b["t_ms"] = 270
    e = mk(2); af(e, b, 128); return e


@ecg("fa-lenta", strip=("II", "V1"))
def _():
    e = mk(3); af(e, base_beat(), 58, 0.35); return e


@ecg("fluter-2a1")
def _():
    b = base_beat(); b["t"] = {k: v * 0.5 for k, v in b["t"].items()}; b["t_ms"] = 250
    e = mk(); flutter(e, b, 2, amp=1.4)
    for l in ("II", "III", "aVF"):
        e.sig[l] *= 1.0
    return e


@ecg("fluter-4a1")
def _():
    e = mk(); flutter(e, base_beat(), 4); return e


@ecg("trnav")
def _():
    b = base_beat(); b["t_ms"] = 230; b["t_sigma"] = 45
    b["extra"]["V1"] = [(115, 9, 0.18)]; b["extra"]["II"] = [(115, 9, -0.12)]; b["extra"]["III"] = [(115, 9, -0.12)]
    b["extra"]["aVF"] = [(115, 9, -0.12)]
    set_st(b, {"V4": -0.1, "V5": -0.12, "V6": -0.1, "II": -0.06}, "flat")
    e = mk(); regular(e, b, 182); return e


@ecg("wpw")
def _():
    b = base_beat(); delta(b)
    e = mk(); sinus(e, b, 75); return e


@ecg("fa-preexcitada")
def _():
    b = base_beat(); delta(b); b["qrs_ms"] = 140
    e = mk(5)
    t = 150.0
    while t < e.t[-1] + 200:
        bb = deepcopy(b)
        w = e.rng.uniform(0.6, 1.4)
        for l in LEADS:
            bb["extra"][l] = [(c, s * w, a * w * 1.2) for c, s, a in b["extra"][l]]
        e.add_beat(t, bb)
        t += 60000 / 210 * (1 + e.rng.uniform(-0.3, 0.45))
    return e


@ecg("bav-1", strip=("II",))
def _():
    b = base_beat(); b["pr_ms"] = 320
    e = mk(); av_block(e, b, "first", 68); return e


@ecg("wenckebach", strip=("II", "V1"))
def _():
    b = base_beat(); b["pr_ms"] = 190
    e = mk(); av_block(e, b, "wenckebach", 88); return e


@ecg("mobitz-2", strip=("II", "V1"))
def _():
    b = base_beat(); rbbb(b); b["pr_ms"] = 180
    e = mk(); av_block(e, b, "mobitz2", 84); return e


@ecg("bav-2a1", strip=("II",))
def _():
    b = base_beat(); b["pr_ms"] = 180
    e = mk(); av_block(e, b, "2to1", 86); return e


@ecg("bav-completo")
def _():
    b = base_beat()
    esc = base_beat(); esc["qrs"] = {l: [(c * 1.7, s * 1.7, a) for c, s, a in v] for l, v in esc["qrs"].items()}
    esc["qrs_ms"] = 150; esc["t_ms"] = 360; esc["t"] = {k: -v * 1.2 for k, v in esc["t"].items()}
    e = mk(); av_block(e, b, "complete", 82, 34, esc); return e


@ecg("brdhh")
def _():
    b = base_beat(); rbbb(b); e = mk(); sinus(e, b, 74); return e


@ecg("brihh")
def _():
    b = base_beat(); lbbb(b); e = mk(); sinus(e, b, 76); return e


@ecg("hbai")
def _():
    b = base_beat(); lafb(b); e = mk(); sinus(e, b, 70); return e


@ecg("bifascicular")
def _():
    b = base_beat(); lafb(b); rbbb(b)
    b["qrs"]["II"] = [(18, 7, 0.12), (45, 11, -0.6), (100, 18, -0.15)]
    b["qrs"]["III"] = [(18, 7, 0.18), (47, 11, -0.9)]
    b["qrs"]["aVF"] = [(18, 7, 0.15), (46, 11, -0.75)]
    b["qrs"]["aVL"] = [(18, 7, -0.1), (42, 10, 0.95), (100, 20, -0.25)]
    e = mk(); sinus(e, b, 72); return e


@ecg("iamcest-anterior")
def _():
    b = base_beat()
    set_st(b, {"V1": 0.2, "V2": 0.45, "V3": 0.5, "V4": 0.4, "V5": 0.15, "I": 0.1, "aVL": 0.15,
               "II": -0.08, "III": -0.15, "aVF": -0.12}, "convex")
    set_t(b, {"V2": 0.75, "V3": 0.8, "V4": 0.65, "III": -0.1, "aVF": 0.0})
    q_waves(b, ["V1", "V2"], 0.25)
    e = mk(); sinus(e, b, 92); return e


@ecg("iamcest-inferior")
def _():
    b = base_beat()
    set_st(b, {"II": 0.3, "III": 0.45, "aVF": 0.38, "I": -0.15, "aVL": -0.25, "V2": -0.1, "aVR": -0.1}, "convex")
    set_t(b, {"III": 0.45, "aVF": 0.4, "II": 0.4, "aVL": -0.15})
    e = mk(); sinus(e, b, 64); return e


@ecg("iamcest-inferoposterior")
def _():
    b = base_beat()
    set_st(b, {"II": 0.25, "III": 0.3, "aVF": 0.28, "I": -0.1, "aVL": -0.18, "V1": -0.2, "V2": -0.3, "V3": -0.25,
               "V6": 0.12}, "convex")
    b["qrs"]["V1"] = [(28, 10, 0.75), (55, 10, -0.35)]
    b["qrs"]["V2"] = [(30, 10, 1.1), (58, 11, -0.55)]
    set_t(b, {"V1": 0.15, "V2": 0.3})
    e = mk(); sinus(e, b, 68); return e


@ecg("iamcest-lateral")
def _():
    b = base_beat()
    set_st(b, {"I": 0.22, "aVL": 0.3, "V5": 0.2, "V6": 0.18, "III": -0.2, "aVF": -0.1, "II": -0.02}, "convex")
    set_t(b, {"aVL": 0.35, "I": 0.4, "III": -0.15})
    e = mk(); sinus(e, b, 84); return e


@ecg("wellens-a")
def _():
    b = base_beat()
    b["t_shape"]["V2"] = [(250, 40, 0.35), (350, 45, -0.35)]
    b["t_shape"]["V3"] = [(250, 40, 0.3), (350, 45, -0.35)]
    set_t(b, {"V2": 0.0, "V3": 0.0, "V4": 0.15})
    e = mk(); sinus(e, b, 66); return e


@ecg("wellens-b")
def _():
    b = base_beat()
    set_t(b, {"V1": -0.25, "V2": -0.75, "V3": -0.8, "V4": -0.55, "V5": -0.2})
    b["t_sigma"] = 50
    e = mk(); sinus(e, b, 62); return e


@ecg("de-winter")
def _():
    b = base_beat()
    set_st(b, {"V1": -0.05, "V2": -0.2, "V3": -0.25, "V4": -0.22, "V5": -0.15, "V6": -0.1, "aVR": 0.12},
           "flat")
    set_t(b, {"V2": 1.2, "V3": 1.3, "V4": 1.1, "V5": 0.7})
    b["t_sigma"] = 45; b["t_ms"] = 270
    e = mk(); sinus(e, b, 78); return e


@ecg("avr-depresion-difusa")
def _():
    b = base_beat()
    set_st(b, {"aVR": 0.2, "V1": 0.08, "I": -0.15, "II": -0.2, "III": -0.1, "aVF": -0.15, "aVL": -0.05,
               "V3": -0.2, "V4": -0.3, "V5": -0.3, "V6": -0.25}, "downsloping")
    set_t(b, {"V4": 0.1, "V5": 0.05, "V6": 0.05})
    e = mk(); sinus(e, b, 102); return e


@ecg("pericarditis")
def _():
    b = base_beat()
    set_st(b, {l: 0.18 for l in ["I", "II", "aVF", "aVL", "V2", "V3", "V4", "V5", "V6"]}, "scoop")
    b["st"]["III"] = 0.08; b["st"]["aVR"] = -0.15; b["st"]["V1"] = -0.03
    e = mk()
    # depresión del PR (elevación en aVR)
    sinus(e, b, 96)
    pr = {l: -0.06 for l in ["I", "II", "aVF", "V3", "V4", "V5", "V6", "aVL", "V2"]}; pr["aVR"] = 0.06
    rr = 60000 / 96
    tq = np.arange(180, e.t[-1], rr)
    for l, a in pr.items():
        for tt in tq:
            e.sig[l] += g(e.t, tt + 100, 28, a)
    return e


@ecg("hiperpotasemia")
def _():
    b = base_beat(); b["t_sigma"] = 32; b["t_ms"] = 250
    for l in LEADS:
        b["t"][l] = b["t"][l] * 3.2 if b["t"][l] > 0 else b["t"][l] * 1.5
    b["t"]["V1"] = 0.35
    b["p"] = {k: v * 0.4 for k, v in b["p"].items()}
    b["qrs"] = {l: [(c * 1.3, s * 1.3, a) for c, s, a in v] for l, v in b["qrs"].items()}; b["qrs_ms"] = 120
    e = mk(); sinus(e, b, 64); return e


@ecg("hipopotasemia")
def _():
    b = base_beat()
    b["t"] = {k: v * 0.35 for k, v in b["t"].items()}
    b["u"] = {l: 0.18 if l in ("V2", "V3", "V4", "II") else 0.08 for l in LEADS}; b["u"]["aVR"] = -0.06
    set_st(b, {"V4": -0.08, "V5": -0.08, "II": -0.05, "V6": -0.06}, "downsloping")
    e = mk(); sinus(e, b, 78); return e


@ecg("hvi-sobrecarga")
def _():
    b = base_beat(); lvh(b); e = mk(); sinus(e, b, 72); return e


@ecg("hvd")
def _():
    b = base_beat(); rvh(b); e = mk(); sinus(e, b, 88); return e


@ecg("brugada-1")
def _():
    b = base_beat()
    b["qrs"]["V1"] = [(25, 9, 0.2), (52, 11, -0.6), (88, 10, 0.55)]
    b["qrs"]["V2"] = [(27, 9, 0.3), (54, 11, -0.9), (90, 10, 0.75)]
    set_st(b, {"V1": 0.35, "V2": 0.45}, "downsloping")
    set_t(b, {"V1": -0.3, "V2": -0.35})
    e = mk(); sinus(e, b, 70); return e


@ecg("qt-largo")
def _():
    b = base_beat(); b["t_ms"] = 470; b["t_sigma"] = 70
    b["t"] = {k: v * 0.85 for k, v in b["t"].items()}
    e = mk(); sinus(e, b, 58); return e


@ecg("torsades", strip=("II", "V1"))
def _():
    e = mk(7)
    b = base_beat(); b["t_ms"] = 480; b["t_sigma"] = 70
    for tt in (300, 1350):
        e.add_p(tt - 160, b); e.add_beat(tt, b)
    # salvas de TV polimórfica con amplitud modulada
    t = np.copy(e.t); m = t > 2050
    env = 0.25 + 0.95 * np.abs(np.sin(2 * math.pi * (t - 2050) / 2600))
    wave = np.sin(2 * math.pi * 4.0 * (t - 2050) / 1000)
    for l, k in zip(LEADS, np.linspace(0.6, 1.3, 12)):
        sgn = -1 if l in ("aVR", "V1") else 1
        e.sig[l][m] += (sgn * k * 1.1 * env * wave)[m]
    return e


@ecg("tv-monomorfica")
def _():
    b = vt_beat(); e = mk()
    regular(e, b, 175, 100)
    pb = base_beat()
    for p in np.arange(250, e.t[-1], 60000 / 88):  # disociación AV
        e.add_p(p, pb, 0.8)
    return e


@ecg("fv", strip=("II", "V1"))
def _():
    e = mk(9)
    t = e.t
    for l in LEADS:
        ph = e.rng.uniform(0, 6, 4)
        s = (np.sin(2 * math.pi * 5.2 * t / 1000 + ph[0]) * 0.5 + np.sin(2 * math.pi * 3.7 * t / 1000 + ph[1]) * 0.35
             + np.sin(2 * math.pi * 6.9 * t / 1000 + ph[2]) * 0.25)
        e.sig[l] += s * (0.6 + 0.4 * np.sin(2 * math.pi * 0.3 * t / 1000 + ph[3]))
    return e


@ecg("displasia-vd")
def _():
    b = base_beat()
    set_t(b, {"V1": -0.3, "V2": -0.35, "V3": -0.25})
    for l, a in (("V1", 0.2), ("V2", 0.17), ("V3", 0.1)):
        b["extra"][l] = [(118, 4, a), (132, 4, a * 0.6)]
    b["qrs"]["V1"] = [(25, 9, 0.2), (58, 14, -1.0)]
    b["qrs_ms"] = 110
    e = mk(); sinus(e, b, 70); return e


@ecg("mch-apical")
def _():
    b = base_beat(); lvh(b, strain=False)
    set_t(b, {"V2": -0.6, "V3": -1.0, "V4": -1.2, "V5": -0.9, "V6": -0.5, "I": -0.3, "aVL": -0.2, "II": -0.2})
    set_st(b, {"V3": -0.08, "V4": -0.1, "V5": -0.08}, "downsloping")
    e = mk(); sinus(e, b, 64); return e


@ecg("hipotermia")
def _():
    b = base_beat(); b["t_ms"] = 400; b["pr_ms"] = 230; b["qrs_ms"] = 110
    osb = {"II": 0.35, "III": 0.25, "aVF": 0.3, "V3": 0.3, "V4": 0.45, "V5": 0.45, "V6": 0.35, "I": 0.2,
           "aVL": 0.1, "aVR": -0.25, "V2": 0.2, "V1": 0.05}
    for l, a in osb.items():
        b["extra"][l] = [(102, 14, a)]
    e = mk(11); sinus(e, b, 40, 0.04)
    for l in LEADS:  # temblor
        e.sig[l] += e.rng.normal(0, 0.03, e.n)
    return e


@ecg("tep")
def _():
    b = base_beat(); b["t_ms"] = 250
    b["qrs"]["I"] = [(40, 10, 0.55), (68, 9, -0.45)]
    b["qrs"]["III"] = [(18, 8, -0.3), (42, 10, 0.75)]
    set_t(b, {"III": -0.3, "V1": -0.2, "V2": -0.25, "V3": -0.2, "aVF": -0.05})
    b["qrs"]["V1"] = [(22, 8, 0.2), (45, 9, -0.4), (85, 12, 0.35)]; b["qrs_ms"] = 105
    e = mk(); sinus(e, b, 118); return e


@ecg("bajo-voltaje-alternancia")
def _():
    b = base_beat(); b["t_ms"] = 250; b["t"] = {k: v * 0.35 for k, v in b["t"].items()}
    e = mk()
    rr = 60000 / 118
    t = 300.0; k = 0
    while t < e.t[-1] + 200:
        sc = 0.48 if k % 2 == 0 else 0.2
        e.add_p(t - 150, b, 0.6)
        e.add_beat(t, b, sc)
        t += rr; k += 1
    return e


@ecg("dextrocardia")
def _():
    b = base_beat()
    for l in ("I",):
        b["qrs"][l] = [(c, s, -a) for c, s, a in b["qrs"][l]]; b["t"][l] = -b["t"][l]; b["p"][l] = -b["p"][l]
    b["qrs"]["II"], b["qrs"]["III"] = deepcopy(b["qrs"]["III"]), deepcopy(b["qrs"]["II"])
    b["t"]["II"], b["t"]["III"] = 0.1, 0.32; b["p"]["II"], b["p"]["III"] = 0.08, 0.17
    b["qrs"]["aVR"], b["qrs"]["aVL"] = deepcopy(b["qrs"]["aVL"]), deepcopy(b["qrs"]["aVR"])
    b["t"]["aVR"], b["t"]["aVL"] = 0.1, -0.26; b["p"]["aVR"], b["p"]["aVL"] = 0.04, -0.13
    for i, l in enumerate(["V1", "V2", "V3", "V4", "V5", "V6"]):
        f = [1, 0.8, 0.6, 0.45, 0.35, 0.3][i]
        b["qrs"][l] = [(25, 9, 0.15 * f), (52, 12, -0.9 * f)]; b["t"][l] = 0.12 * f
    e = mk(); sinus(e, b, 72); return e


@ecg("inversion-electrodos")
def _():
    b = base_beat()
    b["qrs"]["I"] = [(c, s, -a) for c, s, a in b["qrs"]["I"]]; b["t"]["I"] = -0.22; b["p"]["I"] = -0.08
    b["qrs"]["II"], b["qrs"]["III"] = deepcopy(NQ := b["qrs"]["III"]), deepcopy(b["qrs"]["II"])
    b["t"]["II"], b["t"]["III"] = 0.1, 0.32
    b["qrs"]["aVR"], b["qrs"]["aVL"] = deepcopy(b["qrs"]["aVL"]), deepcopy(b["qrs"]["aVR"])
    b["t"]["aVR"], b["t"]["aVL"] = 0.1, -0.26; b["p"]["aVR"], b["p"]["aVL"] = 0.03, -0.1
    _ = NQ
    e = mk(); sinus(e, b, 70); return e


@ecg("marcapasos-vvi")
def _():
    b = base_beat(); paced(b); e = mk()
    rr = 60000 / 70
    t = 250.0
    while t < e.t[-1] + 200:
        e.add_beat(t, b)
        for l in LEADS:
            e.sig[l] += g(e.t, t - 6, 1.6, 1.4)
        t += rr
    return e


@ecg("digoxina")
def _():
    b = base_beat(); b["t_ms"] = 260; b["pr_ms"] = 210
    set_st(b, {"V4": -0.18, "V5": -0.22, "V6": -0.2, "I": -0.12, "II": -0.15, "aVF": -0.12}, "scoop")
    set_t(b, {"V5": 0.05, "V6": 0.05, "I": 0.05, "II": 0.05})
    e = mk(4); af(e, b, 72, 0.25); return e


@ecg("hipercalcemia")
def _():
    b = base_beat(); b["t_ms"] = 215; b["t_sigma"] = 45; e = mk(); sinus(e, b, 72); return e


@ecg("repolarizacion-precoz")
def _():
    b = base_beat()
    for l, a in (("V3", 0.15), ("V4", 0.25), ("V5", 0.2), ("V6", 0.12), ("II", 0.12), ("aVF", 0.1)):
        b["extra"][l] = [(92, 7, a)]
    set_st(b, {"V2": 0.15, "V3": 0.18, "V4": 0.2, "V5": 0.12, "II": 0.08, "aVF": 0.06}, "scoop")
    set_t(b, {"V3": 0.7, "V4": 0.65, "V5": 0.5})
    e = mk(); sinus(e, b, 56); return e


@ecg("tam", strip=("II", "V1"))
def _():
    e = mk(12)
    t = 250.0
    while t < e.t[-1] + 200:
        b = base_beat()
        shape = e.rng.integers(0, 3)
        b["p"] = {k: v * [1.0, -0.6, 1.8][shape] for k, v in b["p"].items()}
        b["pr_ms"] = int(e.rng.uniform(120, 200)); b["t_ms"] = 260
        e.add_p(t - b["pr_ms"], b); e.add_beat(t, b)
        t += 60000 / 118 * (1 + e.rng.uniform(-0.25, 0.3))
    return e


@ecg("ritmo-idioventricular", strip=("II", "V1"))
def _():
    b = vt_beat(); b["t_ms"] = 360; e = mk(); regular(e, b, 78, 300); return e


@ecg("iam-antiguo-inferior")
def _():
    b = base_beat(); q_waves(b, ["II", "III", "aVF"], 0.4, 16)
    set_t(b, {"III": -0.2, "aVF": -0.12, "II": -0.05}); e = mk(); sinus(e, b, 66); return e


@ecg("aneurisma-vi")
def _():
    b = base_beat(); q_waves(b, ["V1", "V2", "V3", "V4"], 0.6, 16)
    set_st(b, {"V1": 0.12, "V2": 0.25, "V3": 0.25, "V4": 0.18}, "flat")
    set_t(b, {"V2": 0.25, "V3": 0.2, "V4": 0.1}); e = mk(); sinus(e, b, 74); return e


@ecg("sgarbossa")
def _():
    b = base_beat(); lbbb(b)
    set_st(b, {"V5": 0.35, "V6": 0.32, "I": 0.3, "aVL": 0.32, "V1": 0.0, "V2": -0.2, "V3": -0.18}, "convex")
    set_t(b, {"V5": 0.3, "V6": 0.3, "I": 0.3, "aVL": 0.3, "V2": 0.1, "V1": 0.1})
    e = mk(); sinus(e, b, 88); return e


@ecg("takotsubo")
def _():
    b = base_beat(); b["t_ms"] = 400; b["t_sigma"] = 65
    set_t(b, {"V2": -0.5, "V3": -0.7, "V4": -0.75, "V5": -0.6, "V6": -0.45, "I": -0.25, "II": -0.3, "aVF": -0.25,
              "aVL": -0.15, "aVR": 0.3, "V1": 0.1})
    e = mk(); sinus(e, b, 82); return e


@ecg("crecimiento-ai-mitral", strip=("II", "V1"))
def _():
    b = base_beat(); b["p_ms"] = 140
    b["p_custom"] = {"II": [(35, 17, 0.15), (95, 17, 0.16)], "I": [(35, 17, 0.1), (95, 17, 0.1)],
                     "V1": [(30, 15, 0.06), (85, 20, -0.17)], "aVF": [(35, 17, 0.1), (95, 17, 0.1)]}
    b["pr_ms"] = 200
    e = mk(); sinus(e, b, 74)
    return e


def write_all(names=None):
    os.makedirs(OUT, exist_ok=True)
    for name, (f, strip) in CAT.items():
        if names and name not in names:
            continue
        e = f(); e.noise(); e.smooth()
        svg = svg_strip(e, strip) if strip else svg_12lead(e)
        with open(os.path.join(OUT, name + ".svg"), "w") as fh:
            fh.write(svg)
    print(len(CAT), "ECG en", os.path.relpath(OUT))


if __name__ == "__main__":
    write_all(sys.argv[1:] or None)
