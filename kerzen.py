#!/usr/bin/env python3
"""Erzeugt das Kerzenfeld als SVG.

Ein Zufallsweg, wie ihn ein Kurs geht — kein Rauschen, sondern Trends mit
Gegenbewegungen. Zweimal hintereinander gelegt, damit das Band nahtlos
umlaufen kann: die zweite Haelfte ist die erste noch einmal.

Bewegt wird spaeter nur das ganze Band per transform. Alles darin steht still.

Das Ergebnis steht fest eingebaut in anmelden.html und im Auftakt von
index.html. Dieses Skript ist die Quelle davon: aendert man hier etwas, muss
das neue SVG von Hand in beide Dateien uebernommen werden.
"""

import random

random.seed(23102026)          # fest, damit es bei jedem Bauen gleich aussieht

KERZEN = 34                    # je Durchgang
BREITE = 22                    # Abstand von Kerze zu Kerze
KOERPER = 13                    # Breite des Koerpers
HOEHE = 300                    # Zeichenhoehe
RAND = 34                      # Luft oben und unten


def weg(n):
    """Ein Kursverlauf: Trends, die halten, und Gegenbewegungen."""
    kurs = HOEHE / 2
    richtung = 1
    laufe = 0
    aus = []
    for i in range(n):
        if laufe <= 0:
            richtung = -richtung if random.random() < 0.62 else richtung
            laufe = random.randint(3, 9)
        laufe -= 1
        schritt = random.uniform(6, 26) * richtung
        offen = kurs
        kurs = max(RAND, min(HOEHE - RAND, kurs + schritt))
        schluss = kurs
        # Dochte gehen ueber Koerper hinaus
        hoch = min(offen, schluss) - random.uniform(3, 13)
        tief = max(offen, schluss) + random.uniform(3, 13)
        aus.append({
            "offen": offen, "schluss": schluss,
            "hoch": max(RAND - 20, hoch), "tief": min(HOEHE - RAND + 20, tief),
            "steigt": schluss <= offen,      # kleinerer y-Wert = hoeher = gestiegen
        })
    return aus


def svg():
    reihe = weg(KERZEN)
    voll = reihe + reihe                     # zweite Runde = erste Runde
    breite = len(voll) * BREITE

    teile = []
    for i, k in enumerate(voll):
        x = i * BREITE
        mitte = x + BREITE / 2
        # Dochte
        teile.append(
            f'<rect class="d" x="{mitte - 1.3:.1f}" y="{k["hoch"]:.1f}" '
            f'width="2.6" height="{max(1, k["tief"] - k["hoch"]):.1f}"/>'
        )
        # Koerper — steigende bleiben hohl, fallende sind gefuellt.
        # So entsteht der Kontrast ohne eine einzige Farbe.
        oben = min(k["offen"], k["schluss"])
        hoehe = max(9, abs(k["schluss"] - k["offen"]))
        klasse = "s" if k["steigt"] else "f"
        teile.append(
            f'<rect class="{klasse}" x="{mitte - KOERPER / 2:.1f}" y="{oben:.1f}" '
            f'width="{KOERPER}" height="{hoehe:.1f}"/>'
        )

    return breite, (
        f'<svg class="kerzen-feld" viewBox="0 0 {breite} {HOEHE}" '
        f'width="{breite}" height="{HOEHE}" preserveAspectRatio="none" '
        f'aria-hidden="true" focusable="false">' + "".join(teile) + "</svg>"
    )


if __name__ == "__main__":
    breite, s = svg()
    print("Breite eines vollen Durchgangs:", breite // 2)
    print("Zeichen:", len(s))
    open("kerzen.svg",
         "w", encoding="utf-8").write(s)
