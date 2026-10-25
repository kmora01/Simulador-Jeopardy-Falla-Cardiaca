"""Radiografías de tórax PA didácticas sintéticas (no son imágenes de pacientes).

Modelo de densidades: aire, partes blandas, mediastino/corazón y hueso, que se convierten en una
imagen de rayos X (más denso = más blanco). Cada hallazgo modifica la anatomía base.
Salida: public/img/rx/*.webp
Uso: python3 scripts/media/xray.py
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "img", "rx")
W, H = 640, 720
SS = 2  # sobremuestreo para bordes suaves
YY, XX = np.mgrid[0:H, 0:W].astype(float)


# ------------------------------------------------------------------ utilidades geométricas

def catmull(points, closed=True, n=24):
    pts = list(points)
    if closed:
        pts = [pts[-1]] + pts + [pts[0], pts[1]]
    else:
        pts = [pts[0]] + pts + [pts[-1]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = (np.array(pts[j], float) for j in (i - 1, i, i + 1, i + 2))
        for s in np.linspace(0, 1, n, endpoint=False):
            s2, s3 = s * s, s * s * s
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * s3))
    if not closed:
        out.append(np.array(pts[-2], float))
    return [tuple(p) for p in out]


def poly(points, blur=2.0, smooth=True):
    pts = catmull(points) if smooth else points
    im = Image.new("L", (W * SS, H * SS), 0)
    ImageDraw.Draw(im).polygon([(x * SS, y * SS) for x, y in pts], fill=255)
    a = np.asarray(im.resize((W, H), Image.LANCZOS), float) / 255
    return gaussian_filter(a, blur) if blur else a


def line(points, width, blur=1.0, smooth=True):
    pts = catmull(points, closed=False) if smooth and len(points) > 2 else points
    im = Image.new("L", (W * SS, H * SS), 0)
    ImageDraw.Draw(im).line([(x * SS, y * SS) for x, y in pts], fill=255, width=max(1, int(width * SS)),
                            joint="curve")
    a = np.asarray(im.resize((W, H), Image.LANCZOS), float) / 255
    return gaussian_filter(a, blur) if blur else a


class Canvas:
    """Lienzo sobremuestreado para dibujar muchos trazos y convertirlos una sola vez."""

    def __init__(self):
        self.im = Image.new("L", (W * SS, H * SS), 0)
        self.dr = ImageDraw.Draw(self.im)

    def seg(self, pts, width, smooth=True):
        pts = catmull(pts, closed=False, n=10) if smooth and len(pts) > 2 else pts
        self.dr.line([(x * SS, y * SS) for x, y in pts], fill=255, width=max(1, int(round(width * SS))), joint="curve")

    def array(self, blur=0.8):
        a = np.asarray(self.im.resize((W, H), Image.LANCZOS), float) / 255
        return gaussian_filter(a, blur) if blur else a


def ellipse(cx, cy, rx, ry, blur=2.0, angle=0.0):
    c, s = math.cos(angle), math.sin(angle)
    x, y = XX - cx, YY - cy
    u, v = (x * c + y * s) / rx, (-x * s + y * c) / ry
    a = (u * u + v * v <= 1).astype(float)
    return gaussian_filter(a, blur) if blur else a


def g2(cx, cy, sx, sy):
    return np.exp(-0.5 * (((XX - cx) / sx) ** 2 + ((YY - cy) / sy) ** 2))


# ------------------------------------------------------------------ anatomía base

class Chest:
    def __init__(self, seed=1, **k):
        self.rng = np.random.default_rng(seed)
        self.p = dict(
            ctr=1.0,           # factor de tamaño del corazón (lateral)
            ra=0.0,            # abultamiento de AD (px)
            lv=0.0,            # proyección del VI (px)
            la=0.0,            # orejuela/AI (px en borde izquierdo)
            pa=0.0,            # tronco pulmonar (px, negativo = cóncavo)
            knob=0.0,          # botón aórtico (px)
            apex_up=0.0,       # punta levantada (bota)
            mediast=0.0,       # ensanchamiento mediastínico superior (px por lado)
            globular=False,
            mirror=False,
            right_arch=False,
        )
        self.p.update(k)
        self.extra = np.zeros((H, W))      # densidades añadidas
        self.lung_mod = np.ones((H, W))    # multiplicador de marcas vasculares
        self.overlay = []                  # dispositivos dibujados al final (hueso/metal)
        self.metal = np.zeros((H, W))
        self.hilum = 1.0
        self.upper_div = 0.0
        self.edema_k = 0.0
        self.eff = []

    # -- partes
    def heart_points(self):
        p = self.p
        c = p["ctr"]
        lvx = 320 + (135 + p["lv"]) * c
        rax = 320 - (65 + p["ra"]) * (0.6 + 0.4 * c)
        knob = 360 + 14 + p["knob"] + p["mediast"]
        if p["globular"]:
            return [(300 - p["mediast"], 140), (290 - p["mediast"], 250), (rax - 25, 360), (rax - 40, 450),
                    (rax - 20, 515), (320, 528), (lvx + 25, 515), (lvx + 40, 440), (lvx + 20, 350),
                    (knob - 2, 260), (350 + p["mediast"], 140)]
        apex_y = 482 - p["apex_up"]
        pts = [
            (300 - p["mediast"], 130),        # tronco braquiocefálico derecho / VCS
            (292 - p["mediast"], 220),
            (290 - p["mediast"] * 0.5, 300),  # VCS
            (rax + 8, 350),                   # AD
            (rax, 420),
            (rax + 14, 490),
            (300, 512),                       # unión con el diafragma
            (lvx - 15, 515),
            (lvx, apex_y),                    # punta del VI
            (lvx - 18 - p["lv"] * 0.1, 410 - p["apex_up"] * 0.4),
            (356 + p["la"] + 18 + p["pa"] * 0.2, 345),  # orejuela izquierda
            (362 + p["pa"], 300),             # tronco pulmonar
            (knob, 245),                      # botón aórtico
            (knob - 10, 205),
            (350 + p["mediast"], 140),
        ]
        return pts

    def build(self):
        p = self.p
        D = np.zeros((H, W))
        # tórax (partes blandas): hombros y pared costal
        body = poly([(20, 0), (620, 0), (632, 120), (612, 400), (604, 720), (36, 720), (28, 400), (8, 120)], 6)
        D += 0.85 * body
        neck = poly([(250, 0), (390, 0), (380, 90), (260, 90)], 8)
        D += 0.15 * neck
        # pulmones
        rl = poly([(225, 92), (250, 100), (292, 150), (300, 300), (296, 470), (250, 500), (180, 505),
                   (120, 530), (96, 560), (84, 470), (86, 330), (110, 200), (160, 115)], 2.5)
        ll = poly([(415, 92), (390, 100), (348, 150), (340, 300), (344, 480), (400, 520), (470, 525),
                   (525, 545), (548, 575), (556, 480), (554, 330), (530, 200), (480, 115)], 2.5)
        if p["mirror"]:
            rl, ll = rl[:, ::-1].copy(), ll[:, ::-1].copy()
        self.rl, self.ll = rl, ll
        lungs = np.clip(rl + ll, 0, 1)
        # diafragma/abdomen bajo los pulmones (hígado y bazo densos)
        D += 0.35 * gaussian_filter((YY > 470).astype(float), 10) * (1 - lungs)
        # corazón y mediastino
        hp = self.heart_points()
        if p["mirror"]:
            hp = [(W - x, y) for x, y in hp]
        heart = poly(hp, 2.2)
        if p["right_arch"]:
            heart = np.maximum(heart, ellipse(282, 240, 22, 26, 2.5))
        self.heart = heart
        lung_air = lungs * (1 - heart)
        thick = gaussian_filter(lung_air, 22)
        D -= (0.42 + 0.35 * thick) * lung_air
        hthick = gaussian_filter(heart, 14)
        D += (0.3 + 0.3 * hthick) * heart
        # tráquea y bronquios principales (aire)
        tr = line([(320, 0), (320, 120), (321, 270)], 24, 2.5, smooth=False)
        br = line([(321, 268), (288, 312), (268, 340)], 14, 2) + line([(321, 268), (356, 306), (380, 336)], 14, 2)
        D -= 0.35 * np.clip(tr + br, 0, 1)
        # marcas vasculares: árbol ramificado desde cada hilio, más grueso en bases (gravedad)
        cv = Canvas()

        def branch(x, y, a, length, w, depth, side):
            pts = [(x, y)]
            n = 5
            for _ in range(n):
                a += self.rng.normal(0, 0.12)
                x += side * math.cos(a) * length / n
                y += math.sin(a) * length / n * 1.15
                pts.append((x, y))
            cv.seg(pts, w)
            if depth < 3 and w > 1.2:
                for da in (-0.38, 0.34):
                    branch(x, y, a + da + self.rng.normal(0, 0.1), length * self.rng.uniform(0.55, 0.75),
                           w * 0.68, depth + 1, side)

        for hx, hy, side in ((278, 320, -1), (364, 310, 1)):
            if p["mirror"]:
                hx, side = W - hx, -side
            for ang in (-1.15, -0.75, -0.35, 0.05, 0.4, 0.75, 1.05, 1.3):
                lower = ang > 0
                w0 = (5.2 if lower else 4.0) * (1 + (self.upper_div if not lower else 0))
                branch(hx, hy, ang + self.rng.normal(0, 0.08), self.rng.uniform(60, 85), w0, 0, side)
        fade = np.zeros((H, W))
        for hx, hy in ((278, 320), (364, 310)):
            if p["mirror"]:
                hx = W - hx
            fade = np.maximum(fade, np.exp(-((XX - hx) ** 2 + (YY - hy) ** 2) / (2 * 150.0 ** 2)))
        vessels = cv.array(1.3) * lung_air * self.lung_mod * (0.35 + 0.65 * fade)
        D += 0.5 * vessels
        # hilios
        for hx, hy in ((272, 318), (368, 304)):
            if p["mirror"]:
                hx = W - hx
            D += 0.28 * self.hilum * g2(hx, hy, 16 * self.hilum, 28) * lungs
        # columna (visible tras el corazón)
        spine = poly([(304, 0), (336, 0), (340, 720), (300, 720)], 3, smooth=False)
        D += 0.35 * spine
        for k in range(14):
            y = 20 + k * 52
            D += 0.12 * ellipse(320, y + 22, 24, 20, 3)
            D -= 0.06 * line([(298, y), (342, y)], 4, 2, smooth=False)
        # clavículas
        for s in (-1, 1):
            cl = line([(320 + s * 34, 128), (320 + s * 90, 112), (320 + s * 170, 104), (320 + s * 230, 82),
                       (320 + s * 262, 74)], 16, 1.5)
            D += 0.65 * cl
        # costillas posteriores (corteza más densa que la medular) y anteriores, más tenues
        outer, inner, ant = Canvas(), Canvas(), Canvas()
        for k in range(10):
            y0 = 122 + k * 40
            for s in (-1, 1):
                pts = []
                reach = 238 - k * 2 if k < 7 else 246
                for u in np.linspace(0, 1, 9):
                    x = 320 + s * (24 + u * reach)
                    y = y0 - 22 * math.sin(math.pi * min(u * 1.25, 1)) + 64 * u ** 2.2
                    pts.append((x, y))
                bw = 10 + k * 0.5
                outer.seg(pts, bw)
                inner.seg(pts, bw - 5)
                xa = 320 + s * 250
                ant.seg([(xa, y0 + 58), (320 + s * 200, y0 + 100), (320 + s * 125, y0 + 140),
                         (320 + s * 78, y0 + 150)], 10)
        bone = 0.42 * outer.array(0.8) - 0.22 * inner.array(0.8) + 0.12 * ant.array(2.2)
        self.ribs = bone
        D += bone * 0.75
        # escápulas en la periferia
        for s in (-1, 1):
            sc = poly([(320 + s * 240, 120), (320 + s * 290, 140), (320 + s * 296, 260), (320 + s * 270, 330),
                       (320 + s * 250, 200)], 4)
            D += 0.22 * sc
        # burbuja gástrica bajo el hemidiafragma izquierdo
        gx = 470 if not p["mirror"] else W - 470
        D -= 0.35 * ellipse(gx, 572, 42, 24, 4)
        D += self.edema_k * (1 - 0.85 * heart)
        D += 0.9 * self._effusions(lungs) * (1 - heart)
        D += self.extra
        D += self.metal * 3.0
        self.D = D
        return self

    def render(self, label=None):
        tex = gaussian_filter(self.rng.normal(0, 1, (H, W)), 9)
        D = gaussian_filter(self.D, 0.8) + 0.025 * tex / tex.std()
        img = 1 - np.exp(-1.25 * np.clip(D, 0, None))
        img = img ** 1.15
        # grano y viñeteo
        img += self.rng.normal(0, 0.018, img.shape)
        img = gaussian_filter(img, 0.6)
        vign = 1 - 0.18 * (((XX - W / 2) / (W / 2)) ** 2 + ((YY - H / 2) / (H / 2)) ** 2)
        img = np.clip(img * vign, 0, 1)
        im = Image.fromarray((img * 255).astype(np.uint8), "L").convert("RGB")
        dr = ImageDraw.Draw(im)
        try:
            f = ImageFont.truetype("DejaVuSans-Bold.ttf", 20)
            f2 = ImageFont.truetype("DejaVuSans.ttf", 11)
        except OSError:
            f = f2 = ImageFont.load_default()
        dr.text((W - 46, 24), "L" if not self.p["mirror"] else "L", fill=(235, 235, 235), font=f)
        dr.text((20, H - 22), "PA · imagen didáctica sintética", fill=(150, 150, 150), font=f2)
        return im

    # -- hallazgos
    def kerley(self, n=14):
        for s in (-1, 1):
            for k in range(n):
                y = 400 + self.rng.uniform(0, 110)
                x0 = 320 + s * (230 - (y - 400) * 0.15 + self.rng.uniform(-6, 6))
                ln = self.rng.uniform(14, 26)
                self.extra += 0.35 * line([(x0, y), (x0 - s * ln, y + self.rng.uniform(-1.5, 1.5))], 1.6, 0.6,
                                          smooth=False)

    def edema(self, k=1.0):
        bat = (g2(268, 330, 62, 105) + g2(374, 320, 62, 105))
        mott = gaussian_filter(self.rng.random((H, W)), 3.5)
        mott = np.clip((mott - mott.mean()) / mott.std() * 0.5 + 0.5, 0, 1)
        self.edema_k = 0.42 * k * bat * (0.35 + 0.9 * mott)

    def effusion(self, side="both", level=470):
        self.eff.append((side, level))

    def _effusions(self, lungs):
        out = np.zeros((H, W))
        for side, level in self.eff:
            for s in ((-1, 1) if side == "both" else ((-1,) if side == "right" else (1,))):
                cx = 320 + s * 200
                # menisco: el borde sube hacia la pared lateral
                top = level + 40 - 70 * np.clip(s * (XX - cx) / 60 + 0.6, 0, 1.6) / 1.6
                m = (YY > top) & (np.sign(XX - 320) == s)
                out += gaussian_filter(m.astype(float), 7)
        return np.clip(out, 0, 1) * lungs

    def calc_pericardium(self):
        pts = self.heart_points()[3:10]
        self.extra += 0.9 * line([(x + (6 if x > 320 else -6), y + 4) for x, y in pts], 3.5, 1.0)

    def device_box(self, cx, cy, w, h, r=10):
        im = Image.new("L", (W * SS, H * SS), 0)
        ImageDraw.Draw(im).rounded_rectangle([(cx - w / 2) * SS, (cy - h / 2) * SS, (cx + w / 2) * SS,
                                              (cy + h / 2) * SS], radius=r * SS, fill=255)
        a = np.asarray(im.resize((W, H), Image.LANCZOS), float) / 255
        self.metal += gaussian_filter(a, 0.8) * 0.9

    def lead(self, pts, w=2.5, k=0.8):
        self.metal += k * line(pts, w, 0.6)

    def sternotomy(self):
        for y in (200, 250, 300, 350, 400, 450):
            self.metal += 0.8 * line([(311, y - 8), (329, y - 8), (331, y), (329, y + 8), (311, y + 8)], 3, 0.5,
                                     smooth=False)

    def valve_ring(self, cx, cy, rx, ry, ang=0.6, w=3.0):
        pts = [(cx + rx * math.cos(a) * math.cos(ang) - ry * math.sin(a) * math.sin(ang),
                cy + rx * math.cos(a) * math.sin(ang) + ry * math.sin(a) * math.cos(ang))
               for a in np.linspace(0, 2 * math.pi, 40)]
        self.metal += 0.8 * line(pts, w, 0.6)


# ------------------------------------------------------------------ catálogo

CAT = {}


def rx(name):
    def deco(fn):
        CAT[name] = fn
        return fn
    return deco


@rx("normal")
def _normal():
    return Chest(1).build()


@rx("cardiomegalia")
def _cm():
    return Chest(2, ctr=1.42, ra=22, lv=18).build()


@rx("edema-pulmonar")
def _edema():
    c = Chest(3, ctr=1.3, lv=10, ra=8)
    c.hilum = 1.5
    c.upper_div = 0.8
    c.edema(1.0)
    c.kerley()
    c.effusion("both", 478)
    return c.build()


@rx("redistribucion-kerley")
def _redis():
    c = Chest(4, ctr=1.18, lv=6)
    c.upper_div = 1.0
    c.hilum = 1.3
    c.kerley(18)
    return c.build()


@rx("derrame-pleural-derecho")
def _eff():
    c = Chest(5)
    c.effusion("right", 380)
    return c.build()


@rx("botella-de-agua")
def _wb():
    c = Chest(6, ctr=1.45, ra=34, lv=26, globular=True)
    c.lung_mod *= 0.9
    return c.build()


@rx("corazon-en-bota")
def _boot():
    c = Chest(7, ctr=1.0, pa=-10, apex_up=62, lv=14, right_arch=True)
    c.lung_mod *= 0.45   # oligohemia
    c.hilum = 0.7
    return c.build()


@rx("huevo-en-cuerda")
def _egg():
    c = Chest(8, ctr=1.3, ra=14, lv=20, mediast=-24, pa=-10, knob=-16)
    c.lung_mod *= 1.5
    c.hilum = 1.3
    return c.build()


@rx("muneco-de-nieve")
def _snow():
    c = Chest(9, ctr=1.18, ra=14)
    c.extra += 0.6 * ellipse(320, 190, 112, 80, 5)
    c.lung_mod *= 1.5
    return c.build()


@rx("coartacion-muescas")
def _coa():
    c = Chest(10, lv=10, knob=-4)
    # signo del 3: dilatación pre y postestenótica
    c.extra += 0.55 * ellipse(372, 222, 18, 16, 2) + 0.55 * ellipse(368, 268, 16, 20, 2)
    c.extra -= 0.3 * ellipse(384, 246, 9, 6, 1.5)
    c.build()
    # muescas costales: escotaduras en el borde inferior de costillas 4-8
    notch = np.zeros((H, W))
    for k in range(3, 8):
        y0 = 120 + k * 41
        for s in (-1, 1):
            for u in (0.45, 0.6, 0.75):
                x = 320 + s * (26 + u * (245 - k * 3))
                y = y0 - 26 * math.sin(math.pi * min(u * 1.2, 1)) + 70 * u ** 2.2 + 7
                notch += ellipse(x, y, 7, 4, 1)
    c.D -= 0.12 * notch * (c.ribs > 0.15)
    return c


@rx("mediastino-ensanchado")
def _med():
    c = Chest(11, mediast=40, knob=20)
    return c.build()


@rx("calcificacion-pericardica")
def _calc():
    c = Chest(12, ctr=1.05)
    c.calc_pericardium()
    return c.build()


@rx("westermark-hampton")
def _wh():
    c = Chest(13, pa=10)
    c.hilum = 1.25
    # oligohemia regional del lóbulo superior derecho y joroba de Hampton basal izquierda (periférica, de base pleural)
    c.lung_mod *= 1 - 0.95 * gaussian_filter(((XX < 300) & (YY < 300) & (YY > 110)).astype(float), 18)
    c.extra += 0.5 * poly([(520, 452), (548, 440), (552, 500), (512, 498)], 4)
    return c.build()


@rx("estenosis-mitral")
def _ms():
    c = Chest(14, la=26, pa=14, ctr=1.05)
    # doble contorno de la AI y apertura de la carina
    c.extra += 0.35 * ellipse(338, 372, 60, 44, 4)
    c.upper_div = 1.1
    c.hilum = 1.35
    c.kerley(10)
    return c.build()


@rx("cimitarra")
def _scim():
    c = Chest(15, ra=-6)
    c.extra += 0.6 * line([(262, 330), (240, 380), (228, 430), (236, 480), (262, 506)], 9, 1.6)
    return c.build()


@rx("hipertension-pulmonar")
def _pah():
    c = Chest(16, pa=34, ra=16, ctr=1.1)
    c.hilum = 1.9
    c.lung_mod *= 1.0 - 0.6 * np.clip((np.abs(XX - 320) - 120) / 120, 0, 1)   # poda periférica
    return c.build()


@rx("dextrocardia")
def _dex():
    return Chest(17, mirror=True).build()


@rx("aneurisma-vi")
def _anv():
    c = Chest(18, ctr=1.15, lv=6)
    c.extra += 0.55 * ellipse(470, 432, 34, 46, 3)
    c.calc_pericardium() if False else None
    c.extra += 0.6 * line([(452, 392), (486, 404), (500, 440), (488, 474)], 2.5, 0.8)
    return c.build()


@rx("neumotorax")
def _ptx():
    c = Chest(19)
    edge = poly([(415, 120), (380, 140), (350, 300), (360, 480), (430, 505), (500, 505), (500, 400), (470, 200)], 2)
    c.lung_mod *= 1 - np.clip(1.5 * (c_left_mask() - edge), 0, 1)
    c.build()
    c.D -= 0.22 * np.clip(c.ll - edge, 0, 1)
    c.D += 0.25 * line([(415, 120), (470, 200), (500, 400), (500, 505)], 1.5, 0.6)
    return c


def c_left_mask():
    return poly([(415, 92), (390, 100), (348, 150), (340, 300), (344, 480), (400, 520), (470, 525),
                 (525, 545), (548, 575), (556, 480), (554, 330), (530, 200), (480, 115)], 2.5)


@rx("marcapasos-bicameral")
def _pm():
    c = Chest(20)
    c.device_box(470, 150, 64, 50, 18)
    c.lead([(450, 158), (400, 146), (340, 156), (298, 186), (290, 260), (286, 330), (294, 370), (312, 352),
            (318, 330)])   # electrodo auricular en J (orejuela derecha)
    c.lead([(452, 164), (404, 158), (346, 170), (308, 200), (304, 270), (306, 380), (360, 462), (412, 476)])
    return c.build()


@rx("dai")
def _icd():
    c = Chest(21)
    c.device_box(474, 152, 78, 62, 22)
    c.lead([(450, 160), (400, 150), (340, 160), (304, 196), (300, 270), (300, 380), (360, 470), (408, 478)], 3)
    # bobinas de choque (VCS y VD)
    c.lead([(300, 200), (298, 300)], 6.5, 0.9)
    c.lead([(312, 410), (360, 470), (404, 478)], 6.5, 0.9)
    return c.build()


@rx("tres-electrodos-trc")
def _crt():
    c = Chest(22)
    c.device_box(470, 150, 70, 54, 20)
    c.lead([(450, 158), (400, 146), (340, 156), (298, 186), (290, 260), (286, 330), (294, 370), (312, 352),
            (318, 330)])
    c.lead([(452, 164), (404, 158), (346, 170), (308, 200), (304, 270), (306, 380), (360, 462), (412, 476)])
    c.lead([(452, 164), (404, 158), (346, 170), (306, 200), (304, 290), (318, 360), (390, 360), (436, 380),
            (452, 420)])  # seno coronario a vena lateral
    return c.build()


@rx("dav-izquierdo")
def _lvad():
    c = Chest(23, ctr=1.3, lv=14)
    c.sternotomy()
    c.device_box(440, 470, 70, 58, 26)
    c.metal += 0.6 * line([(418, 450), (380, 380), (352, 300), (348, 250)], 10, 1)   # cánula de salida (injerto)
    c.lead([(450, 500), (500, 600), (540, 720)], 5, 0.7)   # línea motriz
    return c.build()


@rx("tavi-y-esternotomia")
def _tavi():
    c = Chest(24)
    c.sternotomy()
    # stent valvular en posición aórtica
    for i in range(6):
        c.metal += 0.7 * line([(328 + i * 6, 300 + i * 2), (348 + i * 6, 340 + i * 2)], 1.6, 0.4, smooth=False)
        c.metal += 0.7 * line([(348 + i * 6, 300 + i * 2), (328 + i * 6, 340 + i * 2)], 1.6, 0.4, smooth=False)
    c.metal += 0.6 * line([(326, 300), (366, 312)], 2, 0.4, smooth=False)
    c.metal += 0.6 * line([(326, 340), (366, 352)], 2, 0.4, smooth=False)
    # anillo mitral
    c.valve_ring(372, 392, 26, 12, 0.5)
    return c.build()


@rx("protesis-mecanicas")
def _mech():
    c = Chest(25, la=10)
    c.sternotomy()
    c.valve_ring(338, 320, 18, 10, 0.9, 4)
    c.valve_ring(370, 396, 22, 12, 0.4, 4)
    return c.build()


# ---------------------------------------------------------------- lote 2: dispositivos y calcificaciones

@rx("balon-contrapulsacion")
def _iabp():
    c = Chest(26, ctr=1.15, lv=8)
    c.metal += 0.9 * ellipse(368, 268, 4, 7, 0.6)          # marcador radiopaco de la punta
    c.lead([(368, 274), (364, 400), (352, 560), (344, 720)], 1.6, 0.35)
    c.extra += 0.12 * line([(368, 280), (364, 420)], 14, 3)   # balón (densidad tenue)
    return c.build()


@rx("swan-ganz")
def _sg():
    c = Chest(27)
    c.lead([(262, 40), (290, 110), (300, 200), (298, 300), (294, 380), (312, 440), (350, 452), (372, 420),
            (360, 330), (330, 300), (290, 300), (238, 318), (196, 336)], 2.4, 0.8)
    return c.build()


@rx("electrodo-desplazado")
def _disl():
    c = Chest(28)
    c.device_box(470, 150, 64, 50, 18)
    c.lead([(452, 164), (404, 158), (346, 170), (308, 200), (300, 270), (294, 340), (288, 372)])
    return c.build()


@rx("impella")
def _imp():
    c = Chest(29, ctr=1.2, lv=10)
    c.lead([(346, 720), (352, 520), (366, 360), (378, 262), (362, 228), (338, 238), (334, 300), (354, 360),
            (400, 430)], 3.2, 0.85)
    c.metal += 0.6 * line([(350, 330), (376, 392)], 7, 0.8)     # motor/cánula a través de la válvula
    c.lead([(400, 430), (418, 448), (414, 466), (398, 462), (396, 446)], 2.2, 0.8)   # pigtail
    return c.build()


@rx("calcificacion-anillo-mitral")
def _mac():
    c = Chest(30, ctr=1.1, la=12)
    pts = [(350 + 30 * math.cos(a), 410 + 16 * math.sin(a)) for a in np.linspace(0.3, 2 * math.pi - 0.9, 26)]
    c.extra += 0.75 * line(pts, 7, 1.2)
    return c.build()


@rx("aorta-porcelana")
def _porc():
    c = Chest(31, knob=10)
    c.extra += 0.55 * line([(318, 330), (310, 280), (316, 232), (340, 214), (372, 222), (380, 248), (378, 300)],
                           3.2, 0.9)
    return c.build()


@rx("bypass-coronario")
def _cabg():
    c = Chest(32, ctr=1.1)
    c.sternotomy()
    for y in (230, 262, 300, 338, 372, 404):
        c.metal += 0.8 * line([(352 + (y - 230) * 0.12, y), (360 + (y - 230) * 0.12, y + 3)], 2.6, 0.4, smooth=False)
    for x, y in ((330, 286), (342, 296), (296, 352)):
        c.metal += 0.8 * line([(x, y), (x + 7, y + 2)], 2.6, 0.4, smooth=False)
    return c.build()


@rx("holter-implantable")
def _ilr():
    c = Chest(33)
    c.device_box(400, 330, 46, 9, 4)
    return c.build()


@rx("dai-subcutaneo")
def _sicd():
    c = Chest(34)
    c.device_box(566, 430, 54, 70, 22)
    c.lead([(548, 440), (470, 480), (380, 492), (336, 490)], 2.6, 0.85)
    c.lead([(336, 490), (338, 400), (338, 330), (336, 280)], 6, 0.9)    # bobina paraesternal izquierda
    c.lead([(336, 280), (336, 262)], 2.6, 0.85)
    return c.build()


@rx("marcapasos-sin-cables")
def _micra():
    c = Chest(35)
    c.metal += 0.95 * line([(332, 436), (352, 452)], 11, 0.8)
    c.lead([(352, 452), (360, 458)], 1.5, 0.7)
    return c.build()


@rx("mitraclip")
def _clip():
    c = Chest(36, ctr=1.25, la=18, lv=12)
    c.metal += 0.9 * line([(358, 396), (366, 414)], 7, 0.6)
    c.metal += 0.5 * line([(352, 398), (360, 400), (366, 394)], 2, 0.5)
    return c.build()


def write_all(names=None):
    os.makedirs(ROOT, exist_ok=True)
    for name, fn in CAT.items():
        if names and name not in names:
            continue
        fn().render().save(os.path.join(ROOT, name + ".webp"), quality=84)
    return sorted(CAT)


if __name__ == "__main__":
    import sys
    print(write_all(sys.argv[1:]))
