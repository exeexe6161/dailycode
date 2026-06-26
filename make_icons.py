#!/usr/bin/env python3
# ============================================================
# dailycode  Icon Generator
# Erzeugt die PWA Icons aus der vorhandenen Formensprache des
# Spiels. Kein Fremdasset, keine Icon Bibliothek.
#
# Spiel (code/): eine der sechs Formen (Sechseck) als weisse Marke.
# Portal (Wurzel): ein 2x2 Cluster aus vier der sechs Formen
# (Kreis, Dreieck, Quadrat, Raute) als Sammlungsmarke. Alle
# Geometrien stammen aus den Symbolen in code/index.html
# (viewBox 0 0 100 100).
# Aufruf:  python3 make_icons.py     (Pillow erforderlich)
# ============================================================

from PIL import Image, ImageDraw

ACCENT = (59, 91, 219, 255)      # --accent  #3b5bdb
WHITE = (255, 255, 255, 255)     # --state-ink

SS = 4  # Supersampling fuer glatte Kanten

# --- Formen, normalisiert (0..1) aus den Symbolen in index.html ---
# Sechseck (sym-hexagon)
HEX = [
    (0.500, 0.100), (0.846, 0.300), (0.846, 0.700),
    (0.500, 0.900), (0.154, 0.700), (0.154, 0.300),
]
# Dreieck (sym-triangle)  Punkte 50,16 84,82 16,82
TRI = [(0.50, 0.16), (0.84, 0.82), (0.16, 0.82)]
# Raute (sym-diamond)  Punkte 50,12 88,50 50,88 12,50
DIA = [(0.50, 0.12), (0.88, 0.50), (0.50, 0.88), (0.12, 0.50)]
# Quadrat (sym-square)  rect 20,20 60x60
SQUARE_BOX = (0.20, 0.20, 0.80, 0.80)
# Kreis (sym-circle)  cx50 cy50 r34
CIRCLE_R = 0.34


def _bg(draw, big, maskable):
    if maskable:
        draw.rectangle([0, 0, big, big], fill=ACCENT)
    else:
        radius = int(big * 0.22)
        draw.rounded_rectangle([0, 0, big - 1, big - 1], radius=radius, fill=ACCENT)


def render_game(size, maskable):
    """Sechseck Marke, wie bisher (Spiel)."""
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    _bg(draw, big, maskable)
    scale = 0.52 if maskable else 0.62
    poly = [(((x - 0.5) * scale + 0.5) * big, ((y - 0.5) * scale + 0.5) * big)
            for (x, y) in HEX]
    draw.polygon(poly, fill=WHITE)
    return img.resize((size, size), Image.LANCZOS)


def render_portal(size, maskable):
    """2x2 Cluster aus vier Formen (Sammlungsmarke, Portal)."""
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    _bg(draw, big, maskable)

    # Gesamtmarke in der Safe Zone, dann vier Quadranten.
    mark = 0.60 if maskable else 0.70
    quads = [(0.30, 0.30), (0.70, 0.30), (0.30, 0.70), (0.70, 0.70)]
    cell = mark * 0.5  # Kantenlaenge eines Quadranten als Bruchteil

    def place(px, py, center):
        cx, cy = center
        gx = (cx + (px - 0.5) * cell) * big
        gy = (cy + (py - 0.5) * cell) * big
        return (gx, gy)

    # 0 Kreis
    c = quads[0]
    r = CIRCLE_R * cell * big
    cx, cy = c[0] * big, c[1] * big
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE)
    # 1 Dreieck
    draw.polygon([place(x, y, quads[1]) for (x, y) in TRI], fill=WHITE)
    # 2 Quadrat (abgerundet, wie sym-square rx8)
    x0, y0, x1, y1 = SQUARE_BOX
    sq = [place(x0, y0, quads[2]), place(x1, y1, quads[2])]
    rad = int(0.08 * cell * big)
    draw.rounded_rectangle([sq[0][0], sq[0][1], sq[1][0], sq[1][1]], radius=rad, fill=WHITE)
    # 3 Raute
    draw.polygon([place(x, y, quads[3]) for (x, y) in DIA], fill=WHITE)

    return img.resize((size, size), Image.LANCZOS)


def main():
    # Spiel Icons (code/icon-*.png) bleiben unveraendert erhalten, sie wurden
    # bereits frueher erzeugt. render_game bleibt als Referenz der Marke.
    # Hier nur die Portal Icons in die Wurzel schreiben.
    render_portal(192, False).save("portal-icon-192.png")
    render_portal(512, False).save("portal-icon-512.png")
    render_portal(512, True).save("portal-icon-maskable-512.png")
    print("Portal Icons geschrieben: portal-icon-192/512/maskable-512.png")


if __name__ == "__main__":
    main()
