"""Ecocardiogramas 2D y modo M didácticos sintéticos (no son estudios de pacientes).

Cada vista se arma con regiones de reflectividad (sangre, miocardio, pericardio, válvulas, masas)
y se convierte en imagen de ultrasonido con speckle, compresión logarítmica y sector.
Salida: public/img/eco/*.webp
Uso: python3 scripts/media/echo2d.py [nombre...]
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import distance_transform_edt, gaussian_filter

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "img", "eco")
W, H = 640, 540
SS = 2
APEX = (320, 26)
RADIUS = 480
HALF = math.radians(42)
YY, XX = np.mgrid[0:H, 0:W].astype(float)
PX_CM = 29.0

try:
    F_B = ImageFont.truetype("DejaVuSans-Bold.ttf", 15)
    F = ImageFont.truetype("DejaVuSans.ttf", 12)
    F_S = ImageFont.truetype("DejaVuSans.ttf", 10)
except OSError:
    F_B = F = F_S = ImageFont.load_default()


def raster(draw_fn):
    im = Image.new("L", (W * SS, H * SS), 0)
    draw_fn(ImageDraw.Draw(im), SS)
    return np.asarray(im.resize((W, H), Image.LANCZOS), float) / 255


def poly_mask(pts):
    return raster(lambda d, s: d.polygon([(x * s, y * s) for x, y in pts], fill=255))


def ell_mask(cx, cy, rx, ry, ang=0.0):
    c, s = math.cos(ang), math.sin(ang)
    x, y = XX - cx, YY - cy
    u, v = (x * c + y * s) / rx, (-x * s + y * c) / ry
    return (u * u + v * v <= 1).astype(float)


def line_mask(pts, w):
    return raster(lambda d, s: d.line([(x * s, y * s) for x, y in pts], fill=255, width=max(1, int(w * s)),
                                      joint="curve"))


def dilate(m, r):
    return (distance_transform_edt(m < 0.5) <= r).astype(float)


def sector_mask():
    dx, dy = XX - APEX[0], YY - APEX[1]
    r = np.hypot(dx, dy)
    a = np.arctan2(dx, dy)
    return ((r <= RADIUS) & (np.abs(a) <= HALF) & (dy > 0)).astype(float), r


def bullet(apex, base_c, half_w, n=40, balloon=0.0, bpos=0.15, side_scale=(1.0, 1.0), power=0.42):
    """Contorno de una cavidad en forma de bala (VI) desde la punta a la base."""
    ax, ay = apex
    bx, by = base_c
    L = math.hypot(bx - ax, by - ay)
    ux, uy = (bx - ax) / L, (by - ay) / L
    nx, ny = -uy, ux
    left, right = [], []
    for u in np.linspace(0, 1, n):
        hw = half_w * (u ** power + balloon * math.exp(-((u - bpos) / 0.2) ** 2))
        px, py = ax + ux * u * L, ay + uy * u * L
        left.append((px + nx * hw * side_scale[0], py + ny * hw * side_scale[0]))
        right.append((px - nx * hw * side_scale[1], py - ny * hw * side_scale[1]))
    return left + right[::-1]


class Echo:
    def __init__(self, seed=1, view="Apical 4 cámaras", depth=16):
        self.rng = np.random.default_rng(seed)
        self.R = np.zeros((H, W))       # reflectividad
        self.view = view
        self.depth = depth
        self.notes = []
        self.sparkle = np.zeros((H, W))

    def add(self, mask, val, mode="set"):
        if mode == "set":
            self.R = self.R * (1 - mask) + val * mask
        else:
            self.R += val * mask

    def render(self):
        sec, r = sector_mask()
        R = gaussian_filter(self.R, 1.8)
        het = gaussian_filter(self.rng.normal(0, 1, (H, W)), 6)
        tissue = 0.1 * (np.clip(R, 0, None) / 0.5) ** 2 * np.exp(0.35 * het / het.std())
        speck = self.rng.rayleigh(0.65, (H, W))
        speck = gaussian_filter(speck, (0.8, 2.2))
        speck /= speck.mean()
        sig = tissue * speck * 1.5 + 0.004 * self.rng.rayleigh(1, (H, W))
        sig += self.sparkle * self.rng.random((H, W)) ** 6 * 2.5
        # ruido de campo cercano y atenuación compensada
        sig += 0.25 * np.exp(-r / 28) * self.rng.random((H, W))
        sig *= 1.0 - 0.25 * (r / RADIUS)
        img = np.log1p(14 * sig) / np.log1p(14)
        img = np.clip(img * 1.1, 0, 1) * sec
        im = Image.fromarray((img * 255).astype(np.uint8), "L").convert("RGB")
        d = ImageDraw.Draw(im)
        self.chrome(d)
        return im

    def chrome(self, d):
        d.text((14, 10), self.view, fill=(235, 235, 235), font=F_B)
        d.text((W - 14, 10), f"{self.depth} cm  ·  2D", fill=(170, 200, 255), font=F, anchor="ra")
        for i, n in enumerate(self.notes):
            d.text((14, 34 + i * 18), n, fill=(255, 211, 77), font=F)
        # marcas de profundidad
        for cm in range(0, self.depth + 1, 2):
            rr = cm * RADIUS / self.depth
            x = APEX[0] + math.sin(HALF) * rr + 8
            y = APEX[1] + math.cos(HALF) * rr
            d.line([(x, y), (x + 5, y)], fill=(160, 160, 160))
        d.ellipse([APEX[0] - 3, APEX[1] - 3, APEX[0] + 3, APEX[1] + 3], fill=(255, 160, 40))
        # ECG
        xs = np.linspace(40, W - 40, 400)
        ys = []
        for x in xs:
            ph = ((x - 40) / 190) % 1
            v = math.exp(-0.5 * ((ph - 0.3) / 0.012) ** 2) * 18 - math.exp(-0.5 * ((ph - 0.33) / 0.012) ** 2) * 5
            v += math.exp(-0.5 * ((ph - 0.6) / 0.05) ** 2) * 5 + math.exp(-0.5 * ((ph - 0.12) / 0.03) ** 2) * 3
            ys.append(H - 18 - v)
        d.line(list(zip(xs, ys)), fill=(60, 230, 90), width=1)
        d.text((W - 10, H - 14), "imagen didáctica sintética", fill=(110, 110, 110), font=F_S, anchor="ra")


# ------------------------------------------------------------------ vistas

def a4c(seed=1, lv_w=60, lv_len=240, sept=30, lat=24, rv_w=46, la=(56, 66), ra=(50, 62), balloon=0.0,
        effusion=0, tv_off=0, masses=(), asd=0, notes=(), sparkle=0.0, trabec=False, rv_len=None,
        ra_collapse=False, myo=0.5):
    e = Echo(seed, "Apical 4 cámaras")
    e.notes = list(notes)
    cx = 335
    apex = (cx + 8, 70 + 28)
    base_y = apex[1] + lv_len
    lv_base = (cx + 50, base_y)
    lv_cav = bullet(apex, lv_base, lv_w, balloon=balloon)
    lv_out = bullet((apex[0], apex[1] - 14), (lv_base[0], base_y + 4), lv_w,
                    side_scale=(1 + sept / lv_w, 1 + lat / lv_w), power=0.4, balloon=balloon * 0.9)
    rv_len = rv_len or lv_len * 0.8
    sept_x = lv_base[0] - lv_w - sept
    rv_base = (sept_x - rv_w + 18, base_y)
    rv_apex = (apex[0] - sept * 1.1 - 6, apex[1] + lv_len - rv_len + 14)
    rv_cav = bullet(rv_apex, rv_base, rv_w, power=0.55)
    rv_out = bullet((rv_apex[0], rv_apex[1] - 10), (rv_base[0] - 4, base_y + 4), rv_w + 8, power=0.5,
                    side_scale=(1.15, 1.0))
    la_c = (lv_base[0] + 4, base_y + la[1] + 4)
    ra_c = (rv_base[0] - 6 - tv_off * 0.15, base_y + ra[1] + 4 - tv_off * 0.3)
    myo_m = np.clip(poly_mask(lv_out) + poly_mask(rv_out) + ell_mask(*la_c, la[0] + 8, la[1] + 8)
                    + ell_mask(*ra_c, ra[0] + 8, ra[1] + 8 + tv_off * 0.3), 0, 1)
    heart = (myo_m > 0.5).astype(float)
    # pericardio y derrame
    if effusion:
        peri = dilate(heart, effusion + 7) - dilate(heart, effusion)
    else:
        peri = dilate(heart, 6) - heart
    e.add(gaussian_filter(np.clip(peri, 0, 1), 1.5), 0.95)
    e.add(myo_m, myo)
    lv_m = poly_mask(lv_cav)
    rv_m = poly_mask(rv_cav) * (1 - poly_mask(lv_out))
    la_m = ell_mask(*la_c, *la)
    ra_m = ell_mask(*ra_c, ra[0], ra[1] + tv_off * 0.3)
    if ra_collapse:
        ra_m = np.clip(ra_m - ell_mask(ra_c[0] - ra[0] * 0.9, ra_c[1], ra[0] * 0.45, ra[1] * 0.45), 0, 1)
    for m in (lv_m, rv_m, la_m, ra_m):
        e.add(m, 0.0)
    if sparkle:
        e.sparkle = np.clip(myo_m - lv_m - rv_m - la_m - ra_m, 0, 1) * sparkle
    # tabique interauricular (con CIA opcional)
    if asd:
        e.add(ell_mask((la_c[0] + ra_c[0]) / 2 + 6, base_y + 70, 14, asd / 2), 0.02)
    # trabeculaciones (no compactación)
    if trabec:
        for k in range(14):
            u = 0.08 + k * 0.035
            px = apex[0] + (lv_base[0] - apex[0]) * u + e.rng.normal(0, 10)
            py = apex[1] + lv_len * u
            side = 1 if k % 2 else -1
            hw = lv_w * u ** 0.42
            e.add(ell_mask(px + side * hw * 0.75, py, 9, 6, 0.4 * side), 0.4)
    # válvulas mitral y tricuspídea (diástole: abiertas hacia la punta)
    ms, ml = (lv_base[0] - lv_w + 4, base_y), (lv_base[0] + lv_w - 4, base_y)
    e.add(line_mask([ms, (ms[0] + 12, base_y - 40)], 3.5), 0.85)
    e.add(line_mask([ml, (ml[0] - 6, base_y - 24)], 3.5), 0.85)
    ts, tl = (rv_base[0] + rv_w - 6, base_y - tv_off), (rv_base[0] - rv_w + 4, base_y)
    e.add(line_mask([ts, (ts[0] - 6, ts[1] - 30)], 3.2), 0.8)
    e.add(line_mask([tl, (tl[0] + 18, base_y - 52 - tv_off * 0.3)], 3.5), 0.8)
    for (mx, my, rx, ry, val) in masses:
        e.add(gaussian_filter(ell_mask(mx, my, rx, ry), 1.2), val)
    e.geo = dict(apex=apex, base_y=base_y, lv_base=lv_base, lv_w=lv_w, la_c=la_c, ra_c=ra_c, rv_base=rv_base)
    return e


def plax(seed=2, sept=10, post=10, lvid=48, root=32, la=36, effusion=0, flap=False, vegetation=False, notes=(),
         sam=False):
    """Paraesternal eje largo: VD arriba, tabique, VI, pared posterior; aorta y AI a la derecha."""
    e = Echo(seed, "Paraesternal eje largo")
    e.notes = list(notes)
    k = PX_CM / 10   # px por mm
    tilt = -0.05

    def yl(x, y0):
        return y0 + tilt * (x - 320)

    def band(x0, x1, y0, th, val, n=6):
        top = [(x, yl(x, y0)) for x in np.linspace(x0, x1, n)]
        bot = [(x, y + th) for x, y in top[::-1]]
        e.add(poly_mask(top + bot), val)

    # pared torácica (campo cercano)
    band(0, W, 40, 70, 0.35)
    y_rvw = 112
    band(40, 600, y_rvw, 14, 0.55)                        # pared libre del VD
    y_sep = y_rvw + 14 + 26 * k                           # cavidad del VD ~26 mm
    st = sept * k
    band(30, 392, y_sep, st, 0.5)                         # tabique
    rk = root * k
    ao_top = yl(392, y_sep)
    # pared anterior de la aorta en continuidad con el tabique
    e.add(poly_mask([(392, ao_top), (W, ao_top - 12), (W, ao_top - 2), (392, ao_top + 10)]), 0.6)
    ao_bot = ao_top + rk
    e.add(poly_mask([(398, ao_bot), (W, ao_bot - 12), (W, ao_bot - 1), (398, ao_bot + 11)]), 0.6)
    y_lv = y_sep + st
    y_pw = y_lv + lvid * k
    pt = post * k
    band(30, 430, y_pw, pt, 0.5)                          # pared posterior
    # aurícula izquierda bajo la aorta
    lak = la * k
    la_c = (520, ao_bot + 14 + lak / 2)
    e.add(ell_mask(la_c[0], la_c[1], 112, lak / 2 + 9), 0.45)
    e.add(ell_mask(la_c[0], la_c[1], 103, lak / 2), 0.0)
    # pericardio posterior (con derrame opcional) y aorta descendente
    yp = y_pw + pt + effusion
    band(20, W, yp, 13, 0.95)
    band(20, W, yp + 13, 60, 0.12)
    dax = (455, yl(455, yp) + 13 + 26)
    e.add(ell_mask(dax[0], dax[1], 22, 20), 0.55)
    e.add(ell_mask(dax[0], dax[1], 16, 14), 0.0)
    # válvula aórtica cerrada (diástole)
    mid = (ao_top + ao_bot) / 2 + 4
    e.add(line_mask([(404, ao_top + 9), (420, mid)], 3), 0.85)
    e.add(line_mask([(404, ao_bot + 1), (420, mid + 2)], 3), 0.85)
    # válvula mitral: valva anterior desde la continuidad mitroaórtica
    mv = (396, ao_bot + 8)
    tip = (300, y_lv + 22) if sam else (322, y_lv + lvid * k * 0.42)
    e.add(line_mask([mv, ((mv[0] + tip[0]) / 2 + 4, (mv[1] + tip[1]) / 2 + 6), tip], 4), 0.85)
    pm = (432, yl(432, y_pw) - 2)
    e.add(line_mask([pm, (396, yl(396, y_pw) - 30)], 4), 0.8)
    # músculo papilar / cuerdas
    e.add(line_mask([(250, yl(250, y_pw) - 2), (300, yl(300, y_pw) - 26), (322, y_lv + lvid * k * 0.55)], 2), 0.35)
    if vegetation:
        e.add(gaussian_filter(ell_mask(tip[0] - 4, tip[1] + 4, 12, 9, 0.6), 1), 0.8)
    if flap:
        e.add(line_mask([(430, mid + 6), (520, mid - 8), (W, mid - 22)], 3), 0.9)
    e.geo = dict(y_lv=y_lv, y_pw=y_pw)
    return e


def psax(seed=3, lv_r=52, wall=11, d_shape=False, rv_big=False, effusion=0, notes=()):
    e = Echo(seed, "Paraesternal eje corto (músculos papilares)")
    e.notes = list(notes)
    c = (330, 300)
    rvx, rvy = (c[0] - 40, c[1] - lv_r - 30) if not rv_big else (c[0] - 70, c[1] - lv_r - 30)
    rv_rx, rv_ry = (95, 40) if not rv_big else (130, 85)
    e.add(ell_mask(c[0], c[1], lv_r + wall + 6 + effusion + 6, lv_r + wall + 6 + effusion + 6), 0.95)
    if effusion:
        e.add(ell_mask(c[0], c[1], lv_r + wall + effusion + 6, lv_r + wall + effusion + 6), 0.02)
    e.add(ell_mask(rvx, rvy, rv_rx + 10, rv_ry + 10, -0.35), 0.5)
    e.add(ell_mask(c[0], c[1], lv_r + wall, lv_r + wall), 0.5)
    e.add(ell_mask(rvx, rvy, rv_rx, rv_ry, -0.35) * (1 - ell_mask(c[0], c[1], lv_r + wall + 2, lv_r + wall + 2)), 0.02)
    lv = ell_mask(c[0], c[1], lv_r, lv_r)
    if d_shape:
        # tabique aplanado: recorte del sector superior izquierdo
        flat = ((YY - c[1]) * 0.75 + (XX - c[0]) * 0.65 < -lv_r * 0.45).astype(float)
        lv = lv * (1 - flat)
        e.add(ell_mask(c[0], c[1], lv_r + wall, lv_r + wall) * flat * ell_mask(c[0], c[1], lv_r, lv_r), 0.5)
    e.add(lv, 0.02)
    for ang in (2.2, 3.7):
        e.add(ell_mask(c[0] + math.cos(ang) * lv_r * -0.6 + 10, c[1] + math.sin(ang) * lv_r * 0.55 + 6, 13, 10), 0.55)
    return e


def psax_ao(seed=4, bicuspid=False, notes=()):
    e = Echo(seed, "Paraesternal eje corto (válvula aórtica)")
    e.notes = list(notes)
    c = (325, 250)
    e.add(ell_mask(c[0], c[1], 72, 72), 0.55)
    e.add(ell_mask(c[0], c[1], 58, 58), 0.03)
    if bicuspid:
        # dos valvas con rafe y orificio en "boca de pez"
        e.add(line_mask([(c[0] - 58, c[1] + 10), (c[0] + 58, c[1] - 10)], 3.5), 0.85)
        e.add(ell_mask(c[0], c[1], 44, 12, -0.17) * 0, 0)
        e.add(line_mask([(c[0] + 6, c[1] + 58), (c[0] + 2, c[1] + 18)], 3), 0.55)
    else:
        for a in (-90, 30, 150):
            r = math.radians(a)
            e.add(line_mask([c, (c[0] + 58 * math.cos(r), c[1] + 58 * math.sin(r))], 3.5), 0.85)
    # AI, AD, TSVD alrededor
    e.add(ell_mask(c[0] + 20, c[1] + 140, 90, 50), 0.45)
    e.add(ell_mask(c[0] + 20, c[1] + 140, 80, 42), 0.02)
    e.add(ell_mask(c[0] - 135, c[1] + 70, 55, 60), 0.45)
    e.add(ell_mask(c[0] - 135, c[1] + 70, 46, 52), 0.02)
    e.add(ell_mask(c[0] + 10, c[1] - 120, 130, 32, 0.15), 0.45)
    e.add(ell_mask(c[0] + 10, c[1] - 120, 120, 24, 0.15), 0.02)
    return e


# ------------------------------------------------------------------ modo M y strain

def mmode(name, title, traces, depth=14, notes=(), seconds=3.0):
    """traces: lista de (función y(t) en cm, grosor en cm, reflectividad)."""
    Wm, Hm = 640, 420
    t = np.linspace(0, seconds, Wm)
    ycm = np.linspace(0, depth, Hm)[:, None]
    R = np.zeros((Hm, Wm))
    for fn, th, val in traces:
        y = fn(t)[None, :]
        R = np.maximum(R, val * (np.abs(ycm - y) < th / 2))
    rng = np.random.default_rng(len(name))
    speck = gaussian_filter(rng.rayleigh(0.65, R.shape), (1.4, 0.3))
    speck /= speck.mean()
    sig = 0.1 * (gaussian_filter(R, (1.0, 0.6)) / 0.5) ** 2 * speck * 1.5 + 0.004 * rng.rayleigh(1, R.shape)
    img = np.clip(1.1 * np.log1p(14 * sig) / np.log1p(14), 0, 1)
    full = np.zeros((Hm + 90, Wm + 60))
    full[50:50 + Hm, 10:10 + Wm] = img
    im = Image.fromarray((full * 255).astype(np.uint8), "L").convert("RGB")
    d = ImageDraw.Draw(im)
    d.text((14, 12), title, fill=(235, 235, 235), font=F_B)
    d.text((Wm + 50, 14), "Modo M", fill=(170, 200, 255), font=F, anchor="ra")
    for i, n in enumerate(notes):
        d.text((Wm - 10, 34 + i * 18), n, fill=(255, 211, 77), font=F, anchor="ra")
    for cm in range(0, depth + 1, 2):
        y = 50 + cm * Hm / depth
        d.line([(Wm + 12, y), (Wm + 18, y)], fill=(160, 160, 160))
        d.text((Wm + 22, y - 6), str(cm), fill=(160, 160, 160), font=F_S)
    xs = np.linspace(10, 10 + Wm, 500)
    beats = 0.85
    ys = []
    for x in xs:
        tt = (x - 10) / Wm * seconds
        ph = ((tt - 0.1) / beats) % 1
        v = math.exp(-0.5 * ((ph - 0.0) / 0.012) ** 2) * 18 + math.exp(-0.5 * ((ph - 0.35) / 0.05) ** 2) * 5
        v += math.exp(-0.5 * ((ph - 0.85) / 0.03) ** 2) * 3
        ys.append(Hm + 80 - v)
    d.line(list(zip(xs, ys)), fill=(60, 230, 90), width=1)
    d.text((Wm + 50, Hm + 86), "imagen didáctica sintética", fill=(110, 110, 110), font=F_S, anchor="rb")
    os.makedirs(ROOT, exist_ok=True)
    im.save(os.path.join(ROOT, name + ".webp"), quality=84)


def cyc(t, rr=0.85, t0=0.1):
    return ((t - t0) / rr) % 1


def strain_bullseye(name, values, title, notes=()):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib import cm, colors

    fig = plt.figure(figsize=(6.4, 5.4), facecolor="#000")
    ax = fig.add_axes([0.08, 0.06, 0.72, 0.8], projection="polar", facecolor="#000")
    ax.set_theta_zero_location("N")
    ax.set_theta_direction(-1)
    cmap = matplotlib.colormaps["RdBu"]
    norm = colors.Normalize(vmin=-25, vmax=0)
    rings = [(0.75, 1.0, 6, 60), (0.5, 0.75, 6, 60), (0.25, 0.5, 4, 45), (0.0, 0.25, 1, 0)]
    k = 0
    for r0, r1, n, off in rings:
        for i in range(n):
            th0 = math.radians(off + i * 360 / n) - math.pi / 2 * 0
            width = 2 * math.pi / n
            v = values[k]
            k += 1
            ax.bar(th0 + width / 2, r1 - r0, width=width, bottom=r0, color=cmap(norm(v)), edgecolor="#000", lw=1.5)
            ax.text(th0 + width / 2, (r0 + r1) / 2 if r1 > 0.25 else 0, f"{v:.0f}", color="#000", ha="center",
                    va="center", fontsize=10, fontweight="bold")
    ax.set_xticks([])
    ax.set_yticks([])
    ax.spines["polar"].set_visible(False)
    for th, lab in ((0, "ANT"), (math.pi / 2, "LAT"), (math.pi, "INF"), (3 * math.pi / 2, "SEPT")):
        ax.text(th, 1.12, lab, color="#9cf", ha="center", va="center", fontsize=9, fontweight="bold")
    cax = fig.add_axes([0.85, 0.2, 0.03, 0.55])
    cb = fig.colorbar(cm.ScalarMappable(norm=norm, cmap=cmap), cax=cax)
    cb.ax.tick_params(colors="#ccc", labelsize=8)
    cb.set_label("% strain longitudinal", color="#ccc", fontsize=8)
    fig.text(0.02, 0.94, title, color="#eee", fontsize=13, fontweight="bold")
    for i, n in enumerate(notes):
        fig.text(0.02, 0.89 - i * 0.045, n, color="#ffd34d", fontsize=10)
    fig.text(0.98, 0.01, "imagen didáctica sintética", color="#666", fontsize=7, ha="right")
    fig.savefig(os.path.join(ROOT, name + ".webp"), dpi=100, facecolor="#000", pil_kwargs={"quality": 84})
    plt.close(fig)


# ------------------------------------------------------------------ catálogo

CAT = {}


def eco(name):
    def deco(fn):
        CAT[name] = fn
        return fn
    return deco


@eco("a4c-normal")
def _n():
    return a4c(1)


@eco("plax-normal")
def _pn():
    return plax(2)


@eco("derrame-pericardico-taponamiento")
def _tam():
    return a4c(3, effusion=26, ra_collapse=True, notes=("Colapso telediastólico/sistólico de la AD",))


@eco("takotsubo")
def _tako():
    return a4c(4, balloon=0.55, bpos=None, notes=("Telesístole",)) if False else a4c(4, balloon=0.6,
                                                                                         notes=("Telesístole",),
                                                                                         lv_w=46)


@eco("trombo-apical")
def _thr():
    e = a4c(5, lv_w=66, balloon=0.25)
    ax, ay = e.geo["apex"]
    e.add(gaussian_filter(ell_mask(ax + 4, ay + 34, 22, 16, 0.3), 1.2), 0.7)
    return e


@eco("miocardiopatia-dilatada")
def _dcm():
    return a4c(6, lv_w=88, lv_len=262, sept=15, lat=14, la=(66, 76), notes=("Telediástole",))


@eco("ebstein")
def _eb():
    return a4c(7, tv_off=60, ra=(70, 80), rv_w=56, notes=("Desplazamiento apical de la valva septal tricuspídea",))


@eco("mixoma-auricular")
def _myx():
    e = a4c(8)
    lx, ly = e.geo["la_c"]
    e.add(gaussian_filter(ell_mask(lx - 18, ly + 6, 30, 24, 0.2), 1.5), 0.55)
    return e


@eco("vegetacion-mitral")
def _veg():
    return plax(9, vegetation=True)


@eco("mch-septal")
def _hcm():
    return plax(10, sept=28, post=11, lvid=38, notes=("Septo interventricular 28 mm",))


@eco("sam-plax")
def _sam_plax():
    return plax(11, sept=22, post=11, lvid=38, sam=True, notes=("Mesosístole",))


@eco("diseccion-aortica-raiz")
def _dis():
    return plax(12, root=50, flap=True, notes=("Raíz aórtica 50 mm",))


@eco("derrame-plax")
def _effp():
    return plax(13, effusion=40)


@eco("signo-d")
def _d():
    return psax(14, d_shape=True, rv_big=True, notes=("Telesístole",))


@eco("psax-normal")
def _psn():
    return psax(15)


@eco("valvula-bicuspide")
def _bav():
    return psax_ao(16, bicuspid=True, notes=("Sístole",))


@eco("valvula-aortica-trivalva")
def _tav():
    return psax_ao(17, bicuspid=False, notes=("Diástole",))


@eco("comunicacion-interauricular")
def _asd():
    return a4c(18, asd=26, ra=(62, 72), rv_w=60, notes=("Subcostal no disponible: vista apical",))


@eco("amiloidosis")
def _amy():
    return a4c(19, sept=40, lat=36, lv_w=44, la=(64, 74), ra=(60, 70), effusion=8, sparkle=0.5, myo=0.62)


@eco("no-compactacion")
def _lvnc():
    return a4c(20, lv_w=70, trabec=True)


@eco("vd-dilatado-mcconnell")
def _mcc():
    return a4c(21, rv_w=78, rv_len=230, lv_w=48, ra=(64, 72),
               notes=("Acinesia de pared libre del VD con ápex conservado",))


# ---------------------------------------------------------------- lote 2

@eco("hvi-concentrica")
def _lvh():
    return plax(40, sept=15, post=15, lvid=42, notes=("Septo 15 mm · pared posterior 15 mm",))


@eco("raiz-aortica-dilatada")
def _root():
    return plax(41, root=52, la=34, notes=("Senos de Valsalva 52 mm",))


@eco("aneurisma-apical")
def _aneu():
    e = a4c(42, lv_w=58, balloon=0.45, notes=("Telesístole · ápex adelgazado y discinético",))
    return e


@eco("hipertrofia-lipomatosa-sia")
def _lipo():
    e = a4c(43)
    lx, ly = e.geo["la_c"]
    rx_, ry = e.geo["ra_c"]
    mx = (lx + rx_) / 2 + 4
    e.add(gaussian_filter(ell_mask(mx, ly - 28, 13, 22), 1.3), 0.7)
    e.add(gaussian_filter(ell_mask(mx, ly + 34, 14, 24), 1.3), 0.7)
    return e


@eco("mch-apical-eco")
def _apical():
    e = a4c(44, lv_w=54, notes=("Telediástole",))
    ax, ay = e.geo["apex"]
    e.add(gaussian_filter(ell_mask(ax + 4, ay + 46, 34, 44), 2.0), 0.5)
    return e


@eco("derrame-circunferencial-psax")
def _effc():
    return psax(45, effusion=30, notes=("Derrame circunferencial 2 cm",))


@eco("hipertrofia-psax")
def _hpsax():
    return psax(46, lv_r=34, wall=28, notes=("Telediástole",))


def write_mmodes():
    rr = 0.85

    def sept_fn(base, amp):
        return lambda t: base + amp * np.sin(np.pi * np.clip(cyc(t, rr) / 0.38, 0, 1))

    # SAM: la valva anterior se acerca al tabique en sístole
    def amv(t):
        c = cyc(t, rr)
        dia = 7.4 - 1.6 * np.exp(-0.5 * ((c - 0.5) / 0.06) ** 2) - 1.2 * np.exp(-0.5 * ((c - 0.86) / 0.04) ** 2)
        sam = -2.4 * np.exp(-0.5 * ((c - 0.2) / 0.07) ** 2)
        return dia + sam

    mmode("modo-m-sam", "Modo M del aparato mitral", [
        (lambda t: 1.4 + 0 * t, 0.5, 0.9),
        (lambda t: 2.4 + 0 * t, 0.5, 0.5),
        (lambda t: 3.6 - 0.2 * np.sin(np.pi * np.clip(cyc(t, rr) / 0.38, 0, 1)), 2.6, 0.5),
        (amv, 0.25, 0.9),
        (lambda t: 8.6 + 0.6 * np.sin(np.pi * np.clip(cyc(t, rr) / 0.4, 0, 1)), 0.25, 0.85),
        (lambda t: 10.0 - 0.9 * np.sin(np.pi * np.clip(cyc(t, rr) / 0.4, 0, 1)), 1.1, 0.5),
        (lambda t: 11.0 - 0.9 * np.sin(np.pi * np.clip(cyc(t, rr) / 0.4, 0, 1)), 0.4, 0.95),
    ], notes=("Septo 26 mm",))

    # TAPSE reducido (12 mm)
    def annulus(t):
        c = cyc(t, rr)
        return 9.0 - 1.2 * np.sin(np.pi * np.clip(c / 0.42, 0, 1)) ** 1.2 + 0.25 * np.exp(-0.5 * ((c - 0.86) / 0.04) ** 2)

    mmode("modo-m-tapse", "Modo M del anillo tricuspídeo lateral", [
        (lambda t: 2.0 + 0 * t, 0.6, 0.5),
        (annulus, 0.9, 0.85),
        (lambda t: annulus(t) + 1.3, 0.6, 0.45),
    ], notes=("TAPSE 12 mm",))

    # Taponamiento: colapso diastólico de la pared libre del VD
    def rvwall(t):
        c = cyc(t, rr)
        return 2.4 + 0.9 * np.exp(-0.5 * ((c - 0.62) / 0.09) ** 2)

    mmode("modo-m-colapso-vd", "Modo M paraesternal: pared libre del VD", [
        (lambda t: 1.0 + 0 * t, 0.4, 0.95),
        (rvwall, 0.5, 0.6),
        (lambda t: 4.6 + 0.3 * np.sin(np.pi * np.clip(cyc(t, rr) / 0.38, 0, 1)), 1.0, 0.5),
        (lambda t: 9.6 - 0.8 * np.sin(np.pi * np.clip(cyc(t, rr) / 0.4, 0, 1)), 1.0, 0.5),
        (lambda t: 12.2 + 0 * t, 0.5, 0.95),
    ], notes=("Espacio libre de ecos anterior y posterior",))


def write_strain():
    # orden: 6 basales, 6 medios, 4 apicales, 1 ápex
    strain_bullseye("strain-preservacion-apical",
                    [-6, -5, -7, -6, -5, -6, -10, -9, -11, -10, -9, -10, -20, -21, -19, -22, -23],
                    "Strain longitudinal global: mapa polar", ("SLG -11 %",))
    strain_bullseye("strain-mch-septal",
                    [-18, -17, -6, -5, -19, -18, -19, -18, -8, -7, -19, -20, -20, -19, -12, -21, -22],
                    "Strain longitudinal global: mapa polar", ("SLG -16 %",))


def write_strain2():
    strain_bullseye("strain-territorio-da",
                    [-18, -17, -16, -9, -6, -5, -17, -18, -15, -7, -5, -4, -17, -16, -5, -4, -3],
                    "Strain longitudinal global: mapa polar", ("SLG -13 %",))


def write_all(names=None):
    os.makedirs(ROOT, exist_ok=True)
    for name, fn in CAT.items():
        if names and name not in names:
            continue
        fn().render().save(os.path.join(ROOT, name + ".webp"), quality=84)
    if not names:
        write_mmodes()
        write_strain()


if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["strain2"]:
        write_strain2()
    else:
        write_all(sys.argv[1:])
    print("ok")
