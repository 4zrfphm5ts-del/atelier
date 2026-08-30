#!/usr/bin/env python3
"""Icônes d'écran d'accueil — génère les PNG carrés des cinq sites.

iOS ne sait pas fabriquer une icône à partir d'un favicon SVG : sans PNG carré,
« Sur l'écran d'accueil » range une capture de la page, illisible dans une grille
d'icônes. Chaque site a donc son jeu 512 / 192 / 180 / 32, dessiné ici plutôt
qu'à la main pour être refait à l'identique le jour où une couleur bouge.

Usage :  python3 tools/make_icons.py        (depuis la racine du dépôt)
Dépend de Pillow.  Les marques tiennent dans les 62 % centraux : c'est la zone
que les masques Android (« maskable ») ne rognent jamais.

Sortie : <site>/icon-512.png, icon-192.png, icon-180.png, favicon-32.png
"""
import os
from PIL import Image, ImageDraw

S = 1024          # on dessine grand puis on réduit : bords lisses sans antialias maison
SIZES = [("icon-512.png", 512), ("icon-192.png", 192), ("icon-180.png", 180),
         ("favicon-32.png", 32)]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def canvas(bg):
    im = Image.new("RGB", (S, S), bg)
    return im, ImageDraw.Draw(im)


def atelier():
    """Landing — panneau orange et trois barres crème, cousin de L'Enseigne."""
    im, d = canvas("#26221C")
    d.rounded_rectangle([S*.19, S*.19, S*.81, S*.81], radius=S*.11, fill="#C1502E")
    for i, (x1, y) in enumerate([(.66, .34), (.56, .47), (.63, .60)]):
        d.rounded_rectangle([S*.30, S*y, S*x1, S*(y+.075)], radius=S*.019, fill="#FAF5EC")
    return im


def au_soleil():
    """Soleil ambre — mêmes couleurs que le favicon SVG de la page."""
    im, d = canvas("#ffd166")
    c, r = S/2, S*.155
    d.ellipse([c-r, c-r, c+r, c+r], fill="#ff9f1c")
    import math
    for k in range(8):
        a = math.radians(k*45)
        x, y = math.cos(a), math.sin(a)
        d.line([c+x*r*1.45, c+y*r*1.45, c+x*r*2.05, c+y*r*2.05],
               fill="#ff9f1c", width=int(S*.036))
    # bouts arrondis : PIL ne sait pas le faire sur une ligne, on pose des points
    for k in range(8):
        a = math.radians(k*45)
        for f in (1.45, 2.05):
            x, y = c+math.cos(a)*r*f, c+math.sin(a)*r*f
            rr = S*.018
            d.ellipse([x-rr, y-rr, x+rr, y+rr], fill="#ff9f1c")
    return im


def piou_piou():
    """Poussin — ciel, corps jaune, bec orange, œil noir."""
    im, d = canvas("#8fd3ff")
    c = S/2
    r = S*.235
    d.ellipse([c-r, c-r*1.02, c+r, c+r*1.02], fill="#ffd93d")          # corps
    d.ellipse([c-r*.55, c+r*.62, c+r*.55, c+r*1.06], fill="#ffcf3f")   # ventre
    e = S*.042                                                          # œil
    ex, ey = c-r*.34, c-r*.22
    d.ellipse([ex-e, ey-e, ex+e, ey+e], fill="#222")
    d.ellipse([ex-e*.34, ey-e*.42, ex+e*.18, ey+e*.06], fill="#fff")
    d.polygon([(c+r*.72, c-r*.12), (c+r*1.42, c+r*.10), (c+r*.72, c+r*.32)],
              fill="#ff9f1c")                                           # bec
    d.polygon([(c-r*.16, c-r*1.02), (c-r*.02, c-r*1.34), (c+r*.14, c-r*1.00)],
              fill="#ffcf3f")                                           # houppe
    return im


def enseigne():
    """L'Enseigne — tringle sombre, panneau orange, texte crème."""
    im, d = canvas("#FAF5EC")
    d.rounded_rectangle([S*.13, S*.19, S*.87, S*.235], radius=S*.022, fill="#26221C")
    for x in (.30, .70):
        d.rectangle([S*x-S*.011, S*.235, S*x+S*.011, S*.33], fill="#26221C")
    d.rounded_rectangle([S*.19, S*.33, S*.81, S*.80], radius=S*.075, fill="#C1502E")
    d.rectangle([S*.34, S*.44, S*.40, S*.70], fill="#FFF9F0")           # hampe du E
    for y in (.44, .545, .645):
        w = .56 if y != .545 else .51
        d.rectangle([S*.34, S*y, S*w, S*(y+.055)], fill="#FFF9F0")
    return im


def dada(logo_path):
    """DADA — le logo du client, centré sur son blanc lait, enfin carré."""
    im = Image.new("RGB", (S, S), "#F0EBEB")
    logo = Image.open(logo_path).convert("RGBA")
    box = int(S*.74)
    k = min(box/logo.width, box/logo.height)
    logo = logo.resize((max(1, int(logo.width*k)), max(1, int(logo.height*k))),
                       Image.LANCZOS)
    im.paste(logo, ((S-logo.width)//2, (S-logo.height)//2), logo)
    return im


def write(im, folder):
    out = os.path.join(ROOT, folder)
    for name, px in SIZES:
        im.resize((px, px), Image.LANCZOS).save(os.path.join(out, name),
                                                optimize=True)
        print(f"  {folder}/{name}")


JOBS = [(".", atelier), ("au-soleil", au_soleil), ("piou-piou-express", piou_piou),
        ("enseigne", enseigne)]

if __name__ == "__main__":
    for folder, fn in JOBS:
        print(folder)
        write(fn(), folder)
    print("dada")
    write(dada(os.path.join(ROOT, "dada/assets/logo-dada.png")), "dada/assets")
