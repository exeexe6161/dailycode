#!/usr/bin/env python3
# ============================================================
# dailycode  Icon Generator
# Erzeugt die PWA Icons aus der vorhandenen Formensprache des
# Spiels: eine der sechs Formen (Sechseck) als weisse Marke auf
# ruhigem Grund. Kein Fremdasset, keine Icon Bibliothek.
# Marke und Geometrie stammen aus dem Symbol sym-hexagon in
# index.html (viewBox 0 0 100 100).
# Aufruf:  python3 make_icons.py
# ============================================================

from PIL import Image, ImageDraw

ACCENT = (59, 91, 219, 255)      # --accent  #3b5bdb
WHITE = (255, 255, 255, 255)     # --state-ink

# Sechseck, normalisiert aus den Punkten von sym-hexagon (geteilt durch 100).
HEX = [
    (0.500, 0.100),
    (0.846, 0.300),
    (0.846, 0.700),
    (0.500, 0.900),
    (0.154, 0.700),
    (0.154, 0.300),
]

SS = 4  # Supersampling fuer glatte Kanten


def render(size, maskable):
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if maskable:
        # Voller Hintergrund, Marke in der Safe Zone (kleiner skaliert).
        draw.rectangle([0, 0, big, big], fill=ACCENT)
        scale = 0.52
    else:
        # Abgerundetes Quadrat auf transparentem Grund.
        radius = int(big * 0.22)
        draw.rounded_rectangle([0, 0, big - 1, big - 1], radius=radius, fill=ACCENT)
        scale = 0.62

    poly = [
        (((x - 0.5) * scale + 0.5) * big, ((y - 0.5) * scale + 0.5) * big)
        for (x, y) in HEX
    ]
    draw.polygon(poly, fill=WHITE)

    return img.resize((size, size), Image.LANCZOS)


def main():
    render(192, False).save("icon-192.png")
    render(512, False).save("icon-512.png")
    render(512, True).save("icon-maskable-512.png")
    print("Icons geschrieben: icon-192.png, icon-512.png, icon-maskable-512.png")


if __name__ == "__main__":
    main()
