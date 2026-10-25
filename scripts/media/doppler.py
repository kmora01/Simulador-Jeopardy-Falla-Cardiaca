"""Imágenes didácticas sintéticas: Doppler espectral, Doppler tisular y curvas de presión invasiva.

Son imágenes originales generadas por código (no copiadas de ninguna fuente).
Salida: public/img/eco/*.webp y public/img/hemo/*.webp
Uso: python3 scripts/media/doppler.py
"""
import math
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from scipy.ndimage import gaussian_filter  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "img")
RNG = np.random.default_rng(7)


def g(t, c, s, a=1.0):
    return a * np.exp(-0.5 * ((t - c) / s) ** 2)


def bump(x, start, peak, end, vmax, k_up=1.0, k_dn=1.0):
    """Onda suave asimétrica (inicio, pico y final en s)."""
    y = np.zeros_like(x)
    up = (x >= start) & (x <= peak)
    dn = (x > peak) & (x <= end)
    y[up] = np.sin(0.5 * np.pi * (x[up] - start) / (peak - start)) ** k_up
    y[dn] = np.cos(0.5 * np.pi * (x[dn] - peak) / (end - peak)) ** k_dn
    return y * vmax


def decel(x, start, peak, end, vmax, curve=1.0):
    """Ascenso rápido y descenso con pendiente (lineal si curve=1; cóncavo si >1)."""
    y = np.zeros_like(x)
    up = (x >= start) & (x <= peak)
    dn = (x > peak) & (x <= end)
    y[up] = np.sin(0.5 * np.pi * (x[up] - start) / (peak - start))
    y[dn] = (1 - (x[dn] - peak) / (end - peak)) ** curve
    return y * vmax


def periodic(fn, rr, seconds, start=0.12):
    def f(t):
        out = np.zeros_like(t)
        for k in np.arange(start - rr, seconds + rr, rr):
            x = t - k
            m = (x >= 0) & (x < rr)
            out[m] += fn(x[m])
        return out
    return f


def ecg_trace(t, beats):
    e = np.zeros_like(t)
    for k in beats:
        e += g(t, k - 0.15, 0.02, 0.12) + g(t, k, 0.008, 1.0) + g(t, k + 0.02, 0.008, -0.25) + g(t, k + 0.29, 0.045, 0.25)
    return e


def save(fig, sub, name):
    d = os.path.join(ROOT, sub)
    os.makedirs(d, exist_ok=True)
    fig.savefig(os.path.join(d, name + ".webp"), dpi=100, facecolor=fig.get_facecolor(),
                pil_kwargs={"quality": 82})
    plt.close(fig)


# ------------------------------------------------------------------ Doppler espectral

def spectral(name, vfun, vmin, vmax, seconds=3.0, rr=0.85, title="", label="", notes=(), mode="cw",
             beats=None, ecg=True):
    W, H = 1000, 420
    nt, nv = 900, 300
    t = np.linspace(0, seconds, nt)
    v = vfun(t)
    vel = np.linspace(vmax, vmin, nv)[:, None]
    env = v[None, :]
    inside = ((vel >= 0) & (vel <= env)) | ((vel <= 0) & (vel >= env))
    frac = np.where(env != 0, vel / np.where(env == 0, 1, env), 0)
    if mode == "pw":  # laminar: banda brillante cerca de la envolvente, ventana central oscura
        inten = inside * (0.15 + 0.85 * np.clip(frac, 0, 1) ** 2.5)
    else:  # CW: relleno denso con borde brillante
        inten = inside * (0.55 + 0.45 * np.clip(frac, 0, 1) ** 3)
    speck = RNG.gamma(2.5, 0.4, inten.shape)
    img = gaussian_filter(inten * speck, (1.2, 0.6))
    img += RNG.normal(0, 0.02, img.shape)
    img = np.clip(img / np.percentile(img[inside] if inside.any() else img, 97), 0, 1)

    fig = plt.figure(figsize=(W / 100, H / 100), facecolor="#000")
    ax = fig.add_axes([0.04, 0.17, 0.89, 0.72])
    ax.imshow(img, cmap="gray", aspect="auto", extent=[0, seconds, vmin, vmax], vmin=0, vmax=1, interpolation="bilinear")
    ax.axhline(0, color="#6f6", lw=1)
    ax.set_facecolor("#000")
    ax.yaxis.tick_right()
    ax.tick_params(colors="#8f8", labelsize=9, length=3)
    step = 1.0 if vmax - vmin > 2.5 else (0.5 if vmax - vmin > 1 else 0.05)
    ticks = np.arange(math.ceil(vmin / step) * step, vmax + 1e-6, step)
    ax.set_yticks(ticks)
    cms = step < 0.1
    ax.set_yticklabels([f"{round(x * 100):d}" if cms else f"{round(x, 2):g}" for x in ticks])
    ax.set_xticks([])
    for s in ax.spines.values():
        s.set_visible(False)
    ax.text(1.06, 0.5, "cm/s" if cms else "m/s", transform=ax.transAxes, color="#8f8", fontsize=9,
            rotation=90, va="center")
    if ecg:
        ax2 = fig.add_axes([0.04, 0.03, 0.89, 0.12])
        bt = beats or list(np.arange(0.12, seconds, rr))
        ax2.plot(t, ecg_trace(t, bt), color="#3f3", lw=1.2)
        ax2.set_xlim(0, seconds)
        ax2.axis("off")
    fig.text(0.015, 0.93, title, color="#eee", fontsize=13, fontweight="bold")
    fig.text(0.93, 0.93, label, color="#9cf", fontsize=11, ha="right")
    for i, n in enumerate(notes):
        fig.text(0.05, 0.84 - i * 0.055, n, color="#ffd34d", fontsize=11)
    fig.text(0.995, 0.01, "imagen didáctica sintética", color="#555", fontsize=7, ha="right")
    save(fig, "eco", name)


def mitral(E, A, dt, rr):
    def f(x):
        return decel(x, 0.40, 0.46, 0.46 + dt, E, 1.0) + bump(x, rr - 0.17, rr - 0.11, rr - 0.03, A)
    return f


def doppler_set():
    S = 3.0
    spectral("mitral-normal", periodic(mitral(0.85, 0.55, 0.19, 0.85), 0.85, S), -0.4, 1.4, S, 0.85,
             "Doppler pulsado", "PW · flujo transmitral", mode="pw")
    spectral("mitral-relajacion-alterada", periodic(mitral(0.5, 0.85, 0.29, 0.85), 0.85, S), -0.4, 1.4, S, 0.85,
             "Doppler pulsado", "PW · flujo transmitral", mode="pw")
    spectral("mitral-restrictivo", periodic(mitral(1.25, 0.32, 0.11, 0.7), 0.7, S), -0.4, 1.6, S, 0.7,
             "Doppler pulsado", "PW · flujo transmitral", ("TD 110 ms",), mode="pw")
    spectral("estenosis-aortica-cw", periodic(lambda x: -bump(x, 0.07, 0.22, 0.38, 4.8, 1.0, 1.4), 0.85, S),
             -6, 1, S, 0.85, "Doppler continuo", "CW · válvula aórtica (apical 5C)",
             ("Vmáx 4,8 m/s", "Gradiente medio 56 mmHg"))
    spectral("mch-daga", periodic(lambda x: -bump(x, 0.07, 0.31, 0.39, 4.6, 3.2, 1.0), 0.85, S),
             -6, 1, S, 0.85, "Doppler continuo", "CW · tracto de salida del VI (apical)",
             ("Vmáx 4,6 m/s tras Valsalva",))
    spectral("insuficiencia-aortica-pht",
             periodic(lambda x: decel(x, 0.38, 0.40, 0.83, 4.4, 2.2) - bump(x, 0.07, 0.17, 0.35, 1.9), 0.85, S),
             -2.5, 5, S, 0.85, "Doppler continuo", "CW · válvula aórtica (apical 5C)", ("PHT 190 ms",))
    spectral("estenosis-mitral-pht",
             periodic(lambda x: decel(x, 0.40, 0.44, 0.88, 2.3, 0.75) + bump(x, 0.72, 0.78, 0.88, 0.7), 0.9, S),
             -0.8, 3, S, 0.9, "Doppler continuo", "CW · válvula mitral (apical 4C)",
             ("PHT 280 ms", "Gradiente medio 12 mmHg"))
    spectral("it-psap", periodic(lambda x: -bump(x, 0.06, 0.2, 0.42, 3.9, 0.8, 0.8), 0.85, S),
             -5, 1, S, 0.85, "Doppler continuo", "CW · válvula tricúspide",
             ("Vmáx IT 3,9 m/s", "VCI 24 mm, colapso inspiratorio <50 %"))
    spectral("insuficiencia-mitral-cw", periodic(lambda x: -bump(x, 0.04, 0.13, 0.44, 5.4, 0.6, 0.5), 0.85, S),
             -6.5, 1, S, 0.85, "Doppler continuo", "CW · válvula mitral (apical 4C)", ("Señal densa y holosistólica",))
    spectral("venas-pulmonares-inversion",
             periodic(lambda x: -bump(x, 0.1, 0.22, 0.36, 0.45) + bump(x, 0.43, 0.5, 0.66, 0.62)
                      - bump(x, 0.69, 0.74, 0.82, 0.32), 0.85, S),
             -0.8, 1.0, S, 0.85, "Doppler pulsado", "PW · vena pulmonar superior derecha", mode="pw")
    spectral("aorta-holodiastolico",
             periodic(lambda x: -bump(x, 0.07, 0.13, 0.33, 1.1) + decel(x, 0.35, 0.39, 0.84, 0.42, 0.6), 0.85, S),
             -1.4, 0.8, S, 0.85, "Doppler pulsado", "PW · aorta descendente (supraesternal)", mode="pw")

    # Variación respiratoria (taponamiento): 6 s, ondas E que caen en inspiración
    S2, rr = 6.0, 0.6
    base = periodic(mitral(0.9, 0.5, 0.17, rr), rr, S2)
    spectral("variacion-respiratoria", lambda t: base(t) * (1 - 0.34 * (0.5 + 0.5 * np.sin(2 * math.pi * t / 3.0))),
             -0.4, 1.4, S2, rr, "Doppler pulsado", "PW · flujo transmitral",
             ("Variación respiratoria del pico E 38 %",), mode="pw")
    spectral("tisular-e-reducida",
             periodic(lambda x: bump(x, 0.08, 0.15, 0.3, 0.055) - bump(x, 0.44, 0.49, 0.58, 0.04)
                      - bump(x, 0.69, 0.74, 0.82, 0.075), 0.85, S),
             -0.12, 0.1, S, 0.85, "Doppler tisular", "DTI · anillo mitral septal", ("e' septal 4 cm/s",), mode="pw")
    spectral("tisular-annulus-reversus",
             periodic(lambda x: bump(x, 0.08, 0.15, 0.3, 0.07) - bump(x, 0.42, 0.47, 0.56, 0.15)
                      - bump(x, 0.69, 0.74, 0.82, 0.05), 0.85, S),
             -0.2, 0.12, S, 0.85, "Doppler tisular", "DTI · anillo mitral septal", ("e' septal 15 cm/s",), mode="pw")


# ------------------------------------------------------------------ Hemodinámica invasiva

def _per(v, i):
    return v[i] if isinstance(v, (list, tuple, np.ndarray)) else v


def lv_curve(t, beats, lv_sys, lv_edp, sysdur=0.36, plateau=False, k=0.8):
    """Presión del VI latido a latido: sístole en forma de cúpula, relajación rápida y llenado con onda a."""
    lv = np.full_like(t, float(lv_edp))
    for i, b in enumerate(beats):
        nxt = beats[i + 1] if i + 1 < len(beats) else t[-1] + 1
        sp, edp = _per(lv_sys, i), lv_edp
        m = (t >= b) & (t < nxt)
        x = t[m] - b
        y = np.empty_like(x)
        s = x <= sysdur
        y[s] = edp + (sp - edp) * np.maximum(np.sin(np.pi * x[s] / sysdur), 0) ** k
        d = ~s
        xd = x[d] - sysdur
        dur = max(nxt - b - sysdur, 0.15)
        if plateau:
            # caída rápida a ~2 mmHg ("dip") y meseta temprana
            y[d] = edp - (edp - 2) * np.exp(-xd / 0.03) - 0.0
            y[d] = np.where(xd < 0.04, edp - (edp - 2) * (xd / 0.04) ** 0.6 if False else y[d], y[d])
            y[d] = 2 + (edp - 2) * (1 - np.exp(-np.maximum(xd - 0.035, 0) / 0.03))
            y[d] = np.where(xd < 0.035, edp + (2 - edp) * np.sin(0.5 * np.pi * xd / 0.035), y[d])
        else:
            fall = edp + (3 - edp) * np.sin(0.5 * np.pi * np.clip(xd / 0.06, 0, 1))
            fill = 3 + (edp * 0.7 - 3) * np.clip((xd - 0.06) / (dur - 0.06), 0, 1) ** 0.7
            akick = edp * 0.3 * g(xd, dur - 0.06, 0.03)
            y[d] = np.where(xd < 0.06, fall, fill) + akick
            # empalme exacto con la presión telediastólica
            y[d] += (edp - (edp * 0.7 + edp * 0.3 * g(dur, dur - 0.06, 0.03))) * np.clip((xd - dur + 0.03) / 0.03, 0, 1)
        lv[m] = y
    return lv


def aorta_curve(t, beats, lv, dia, grad=0.0, late=False, close_frac=0.6):
    """Presión aórtica: se abre cuando el VI supera la diastólica, sigue al VI menos el gradiente
    y tras la incisura dícrota decae exponencialmente hasta la diastólica del latido siguiente."""
    ao = np.zeros_like(t)
    opens, closes = [], []
    for i, b in enumerate(beats):
        nxt = beats[i + 1] if i + 1 < len(beats) else t[-1] + 1
        m = np.where((t >= b) & (t < nxt))[0]
        d = _per(dia, i)
        seg = lv[m]
        pk = int(np.argmax(seg))
        o = m[int(np.argmax(seg[:pk + 1] >= d))]
        gi = _per(grad, i)
        sp_ao = seg[pk] - gi
        pc = d + close_frac * (sp_ao - d)
        after = np.where(seg[pk:] <= pc)[0]
        c = m[pk + (after[0] if len(after) else len(seg) - pk - 1)]
        u = (t[o:c + 1] - t[o]) / max(t[c] - t[o], 1e-3)
        shape = np.sin(np.pi * u) ** (2.0 if late else 0.9) * ((u + 0.15) ** 1.2 if late else 1)
        shape /= max(shape.max(), 1e-6)
        ao[o:c + 1] = np.maximum(lv[o:c + 1] - gi * shape, d)
        opens.append(o)
        closes.append(c)
    # diástoles
    first_dia = _per(dia, 0)
    ao[:opens[0]] = first_dia + 8 * (1 - t[:opens[0]] / max(t[opens[0]], 1e-3))
    for i, c in enumerate(closes):
        end = opens[i + 1] if i + 1 < len(opens) else len(t)
        target = _per(dia, i + 1) if i + 1 < len(opens) else _per(dia, i)
        pc = ao[c]
        xd = t[c:end] - t[c]
        span = xd[-1] if len(xd) > 1 else 0.3
        if i + 1 >= len(opens):
            span = max(span, beats[1] - beats[0] - (t[c] - t[opens[i]]) - 0.05)
        tau = span / max(math.log(pc / target), 0.05)
        y = pc * np.exp(-xd / tau)
        y += -5 * g(xd, 0.012, 0.008) + 3 * g(xd, 0.05, 0.022)
        ao[c:end] = y
    return ao


def pressure_fig(name, t, curves, ymax, title, beats=None, notes=(), labels=(), ystep=20, colors=None):
    fig = plt.figure(figsize=(10, 4.2), facecolor="#0b1020")
    ax = fig.add_axes([0.07, 0.17, 0.9, 0.7], facecolor="#0b1020")
    cols = colors or ["#ffd34d", "#5ad1ff", "#ff7a7a", "#9cff8a"]
    for (lab, y), c in zip(curves, cols):
        ax.plot(t, y, color=c, lw=2.2, label=lab)
    ax.set_ylim(-5, ymax)
    ax.set_xlim(t[0], t[-1])
    ax.set_yticks(np.arange(0, ymax + 1, ystep))
    ax.grid(axis="y", color="#1f2a44")
    ax.tick_params(colors="#8aa", labelsize=9)
    ax.set_xticks([])
    for s in ax.spines.values():
        s.set_visible(False)
    ax.set_ylabel("mmHg", color="#8aa", fontsize=9)
    leg = ax.legend(loc="upper right", frameon=False, fontsize=11)
    for txt, c in zip(leg.get_texts(), cols):
        txt.set_color(c)
    for (x, y, s) in labels:
        ax.text(x, y, s, color="#fff", fontsize=13, fontweight="bold", ha="center")
    if beats is not None:
        ax2 = fig.add_axes([0.07, 0.02, 0.9, 0.12], facecolor="#0b1020")
        ax2.plot(t, ecg_trace(t, beats), color="#3f3", lw=1.2)
        ax2.set_xlim(t[0], t[-1])
        ax2.axis("off")
    fig.text(0.015, 0.93, title, color="#eee", fontsize=13, fontweight="bold")
    for i, n in enumerate(notes):
        fig.text(0.09, 0.82 - i * 0.055, n, color="#ffd34d", fontsize=11)
    fig.text(0.995, 0.01, "trazado didáctico sintético", color="#556", fontsize=7, ha="right")
    save(fig, "hemo", name)


def hemo_set():
    S, rr = 3.2, 0.8
    t = np.arange(0, S, 0.001)
    beats = np.arange(0.15, S, rr)
    # Estenosis aórtica severa: gradiente pico ~70 mmHg, ascenso aórtico lento
    lv = lv_curve(t, beats, 200, 20, k=1.2)
    ao = aorta_curve(t, beats, lv, 72, grad=72, close_frac=0.75)
    pressure_fig("gradiente-vi-ao", t, [("VI", lv), ("Aorta", ao)], 220, "VI y aorta simultáneos", beats)
    # Constricción: dip and plateau, igualación diastólica
    lv = lv_curve(t, beats, 110, 22, plateau=True)
    rv = lv_curve(t, beats, 40, 21, plateau=True, sysdur=0.33)
    pressure_fig("dip-plateau", t, [("VI", lv), ("VD", rv)], 120, "VI y VD simultáneos", beats)
    # Discordancia respiratoria (interdependencia ventricular)
    S2 = 6.4
    t2 = np.arange(0, S2, 0.001)
    b2 = np.arange(0.15, S2, rr)
    lv = lv_curve(t2, b2, [110 * (1 - 0.12 * math.sin(2 * math.pi * b / 3.2)) for b in b2], 22, plateau=True)
    rv = lv_curve(t2, b2, [40 * (1 + 0.2 * math.sin(2 * math.pi * b / 3.2)) for b in b2], 21, plateau=True, sysdur=0.33)
    pressure_fig("discordancia-respiratoria", t2, [("VI", lv), ("VD", rv)], 140, "VI y VD durante la respiración", b2,
                 labels=[(0.15 + 0.8, 128, "insp."), (0.15 + 2.4, 128, "esp.")])
    # Ondas v gigantes
    pcwp = np.full_like(t, 16.0)
    for b in beats:
        x = t - b
        pcwp += g(x, -0.06, 0.035, 6) - g(x, 0.08, 0.04, 3) + g(x, 0.42, 0.07, 36) - g(x, 0.6, 0.06, 5)
    pressure_fig("ondas-v-gigantes", t, [("Presión capilar pulmonar", pcwp)], 70, "Presión de enclavamiento pulmonar",
                 beats, labels=[(beats[1] + 0.42, 56, "v"), (beats[1] - 0.06, 26, "a")], ystep=10)
    # Brockenbrough-Braunwald-Morrow: tras la extrasístole sube el VI, aumenta el gradiente y cae la presión de pulso
    bb = [0.15, 0.95, 1.45, 2.45]
    t3 = np.arange(0, 3.3, 0.001)
    lv = lv_curve(t3, bb, [180, 180, 140, 250], 18)
    ao = aorta_curve(t3, bb, lv, [78, 78, 74, 80], grad=[50, 50, 30, 0], late=True, close_frac=0.7)
    # latido postextrasistólico: la sistólica aórtica no sube y la presión de pulso se estrecha
    pv = t3 >= bb[3]
    ao[pv] = 80 + (ao[pv] - 80) * (40 / 170)
    pressure_fig("brockenbrough", t3, [("VI", lv), ("Aorta", ao)], 270, "VI y aorta: latido postextrasistólico", bb,
                 labels=[(1.45 + 0.18, 160, "EV")])
    # Insuficiencia aórtica aguda grave: presión de pulso amplia y equiparación diastólica Ao-VI
    lv = lv_curve(t, beats, 160, 38)
    ao = aorta_curve(t, beats, lv, 44, grad=4, close_frac=0.55)
    pressure_fig("presion-ia", t, [("Aorta", ao), ("VI", lv)], 200, "Aorta y VI simultáneos", beats,
                 colors=["#5ad1ff", "#ffd34d"])
    # Pulso paradójico
    S3, rr3 = 7.2, 0.6
    t4 = np.arange(0, S3, 0.001)
    b3 = np.arange(0.15, S3, rr3)
    sps = [118 - 22 * (0.5 + 0.5 * math.sin(2 * math.pi * b / 3.6)) for b in b3]
    lv = lv_curve(t4, b3, sps, 18, sysdur=0.3)
    ao = aorta_curve(t4, b3, lv, [s * 0.62 for s in sps], grad=4)
    pressure_fig("pulso-paradojico", t4, [("Presión arterial", ao)], 140, "Presión arterial invasiva y respiración",
                 notes=("Caída inspiratoria de la PAS 22 mmHg",))
    # Pulso alternante
    t5 = np.arange(0, 4.2, 0.001)
    b5 = np.arange(0.15, 4.2, 0.6)
    lv = lv_curve(t5, b5, [120 if i % 2 == 0 else 95 for i in range(len(b5))], 25, sysdur=0.3)
    ao = aorta_curve(t5, b5, lv, 72, grad=4)
    pressure_fig("pulso-alternante", t5, [("Presión arterial", ao)], 140, "Presión arterial invasiva")
    # Presión auricular derecha con x e y profundos
    ra = np.full_like(t, 16.0)
    for b in beats:
        x = t - b
        ra += g(x, -0.07, 0.03, 4) - g(x, 0.22, 0.06, 8) + g(x, 0.4, 0.03, 4) - g(x, 0.52, 0.04, 9)
    pressure_fig("ad-m-w", t, [("Aurícula derecha", ra)], 30, "Presión auricular derecha", beats, ystep=5,
                 labels=[(beats[1] + 0.22, 5, "x"), (beats[1] + 0.52, 4, "y")])


def doppler_set2():
    """Lote 2 con generador propio para no alterar las imágenes del lote 1."""
    global RNG
    RNG = np.random.default_rng(71)
    S = 3.0
    spectral("estenosis-pulmonar-cw", periodic(lambda x: -bump(x, 0.08, 0.24, 0.42, 4.3, 1.0, 1.3), 0.85, S),
             -5.5, 1, S, 0.85, "Doppler continuo", "CW · válvula pulmonar (paraesternal eje corto)",
             ("Vmáx 4,3 m/s",))
    spectral("tsvi-vti-bajo", periodic(lambda x: -bump(x, 0.07, 0.16, 0.33, 0.55), 0.62, S),
             -1.2, 0.5, S, 0.62, "Doppler pulsado", "PW · tracto de salida del VI (apical 5C)",
             ("ITV 9 cm", "FC 97 lpm"), mode="pw")
    spectral("pulmonar-muesca", periodic(lambda x: -(bump(x, 0.06, 0.12, 0.2, 0.75, 0.8, 1.0)
                                                    + bump(x, 0.2, 0.27, 0.36, 0.5)), 0.85, S),
             -1.2, 0.5, S, 0.85, "Doppler pulsado", "PW · tracto de salida del VD",
             ("Tiempo de aceleración 60 ms",), mode="pw")
    spectral("ea-bajo-gradiente", periodic(lambda x: -bump(x, 0.08, 0.2, 0.37, 3.3, 1.0, 1.3), 0.85, S),
             -5, 1, S, 0.85, "Doppler continuo", "CW · válvula aórtica (apical 5C)",
             ("Vmáx 3,3 m/s · Gradiente medio 26 mmHg", "AVA 0,8 cm² · FEVI 30 % · VS indexado 28 ml/m²"))
    spectral("it-masiva", periodic(lambda x: -bump(x, 0.05, 0.1, 0.4, 2.1, 0.7, 1.6), 0.85, S),
             -3.5, 1, S, 0.85, "Doppler continuo", "CW · válvula tricúspide",
             ("Señal densa, triangular y de pico precoz",))
    spectral("coartacion-cw",
             periodic(lambda x: -(bump(x, 0.07, 0.2, 0.36, 3.6) + decel(x, 0.36, 0.37, 0.84, 1.3, 1.2)), 0.85, S),
             -4.5, 1, S, 0.85, "Doppler continuo", "CW · aorta descendente (supraesternal)",
             ("Vmáx 3,6 m/s · flujo anterógrado diastólico",))
    spectral("tisular-s-vd",
             periodic(lambda x: bump(x, 0.08, 0.16, 0.32, 0.065) - bump(x, 0.44, 0.49, 0.58, 0.07)
                      - bump(x, 0.69, 0.74, 0.82, 0.09), 0.85, S),
             -0.14, 0.12, S, 0.85, "Doppler tisular", "DTI · anillo tricuspídeo lateral", ("S' 6,5 cm/s",), mode="pw")


if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["lote2"]:
        doppler_set2()
    else:
        doppler_set()
        hemo_set()
    print("ok")
