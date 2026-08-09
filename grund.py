#!/usr/bin/env python3
"""Erzeugt den Grund hinter der ganzen App als SVG.

Warum ueberhaupt etwas dahinter liegt
-------------------------------------
Glas zeigt, was dahinter liegt. Weiche Farbverlaeufe liegen zwar dahinter,
geben dem Verwischen aber nichts zu tun: ein 20-Pixel-Blur ueber einem
weichen Verlauf ergibt wieder denselben weichen Verlauf. Man sieht keine
Scheibe, man sieht eine hellere Flaeche. Sichtbar wird Glas an *Kanten* —
Formen mit hohem oertlichem Kontrast, die beim Verwischen zu erkennbaren
Flecken zerlaufen.

Warum es keine Kerzenwand mehr ist
----------------------------------
Der erste Anlauf war genau das: fuenf Lagen bunter Kerzen, ganzflaechig.
Kanten hatte er reichlich — aber er sah aus wie ein Spielzeug. Viele kleine
Bloecke in vier kraeftigen Farben sind laut, nicht edel.

Jetzt sind es drei grosse, ruhige Kurslinien: ein feiner Strich und darunter
eine sehr blasse Flaeche, die nach unten ausblendet. Der Strich liefert die
Kante, die das Glas braucht; die Flaeche gibt Tiefe. Alles in Tinte, ohne
eigene Farbe — die Farbe kommt aus den vier gedeckten Feldern im
Stylesheet, und darueber liegt diese Zeichnung wie eine Praegung.

Die Wege sind *geschlossen*: der letzte Kurs ist der erste, deshalb passt
die Kachel nahtlos an sich selbst. Auf dem Telefon steht ohnehin nur eine,
am Schreibtisch zwei bis drei — dort waere ein Sprung deutlich zu sehen.

Nicht verwechseln mit kerzen.py: das erzeugt das schmale laufende Band fuer
den Ladebildschirm und die Anmeldeseite. Dieses hier ist der stehende Grund
unter der ganzen Liste.

    python3 grund.py > grund.svg
"""

import random

random.seed(9082026)           # fest, damit jeder Bau dasselbe Bild ergibt

BREITE = 620                   # Kachelbreite; dieselbe wie beim Band
HOEHE = 900


def weg(punkte, glaetten, mitte, spanne):
    """Ein geschlossener Kursweg, anschliessend geglaettet.

    Erst ein Zufallsweg mit Trends und Gegenbewegungen, dann ein gleitender
    Mittelwert darueber — ohne den waere es eine gezackte Linie, und gezackt
    ist das Gegenteil von ruhig. Der Mittelwert laeuft im Kreis, damit die
    Naht nicht doch noch an der Glaettung sichtbar wird."""
    kurs = 0.0
    richtung = 1
    laufe = 0
    roh = []
    for _ in range(punkte):
        roh.append(kurs)
        if laufe <= 0:
            richtung = -richtung if random.random() < 0.58 else richtung
            laufe = random.randint(6, 20)
        laufe -= 1
        kurs += random.uniform(0.2, 1.0) * richtung

    # Drift herausnehmen: der letzte Punkt liegt wieder auf dem ersten
    drift = (roh[-1] - roh[0]) / (punkte - 1)
    roh = [k - drift * i for i, k in enumerate(roh)]

    for _ in range(glaetten):
        roh = [
            (roh[(i - 1) % punkte] + roh[i] + roh[(i + 1) % punkte]) / 3
            for i in range(punkte)
        ]

    tief, hoch = min(roh), max(roh)
    weite = max(hoch - tief, 1e-6)
    return [mitte + (k - (tief + hoch) / 2) / weite * spanne for k in roh]


def linie(punkte, glaetten, mitte, spanne, dicke, strich_deckung, flaeche_deckung, nummer):
    """Ein Strich mit blasser Flaeche darunter."""
    y = weg(punkte, glaetten, mitte, spanne)
    schritt = BREITE / (punkte - 1)
    pfad = " ".join(
        ("M" if i == 0 else "L") + "%.1f %.1f" % (i * schritt, k)
        for i, k in enumerate(y)
    )
    flaeche = pfad + " L%.1f %.1f L0 %.1f Z" % (BREITE, HOEHE, HOEHE)
    kennung = "verlauf%d" % nummer
    return (
        '<linearGradient id="%s" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#111" stop-opacity="%.3f"/>'
        '<stop offset="1" stop-color="#111" stop-opacity="0"/>'
        "</linearGradient>"
        '<path d="%s" fill="url(#%s)"/>'
        '<path d="%s" fill="none" stroke="#111" stroke-width="%.1f" '
        'stroke-opacity="%.3f" stroke-linejoin="round"/>'
        % (kennung, flaeche_deckung, flaeche, kennung, pfad, dicke, strich_deckung)
    )


def main():
    # punkte, glaetten, mitte, spanne, dicke, strich, flaeche
    lagen = [
        linie(180, 5, HOEHE * 0.30, HOEHE * 0.34, 2.6, 0.13, 0.045, 1),
        linie(180, 4, HOEHE * 0.55, HOEHE * 0.30, 2.0, 0.16, 0.038, 2),
        linie(180, 3, HOEHE * 0.76, HOEHE * 0.22, 1.5, 0.20, 0.030, 3),
    ]
    print(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" '
        'preserveAspectRatio="none">%s</svg>' % (BREITE, HOEHE, "".join(lagen))
    )


if __name__ == "__main__":
    main()
