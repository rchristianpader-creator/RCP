#!/usr/bin/env python3
"""Erzeugt die Koernung fuer den Grund.

Warum Koernung
--------------
Der Grund ist ein dunkler Verlauf aus vier grossen Farbfeldern. Dunkle
Verlaeufe haben ein Problem, das man erst auf einem guten Bildschirm sieht:
sie streifen. Zwischen zwei benachbarten Helligkeitsstufen liegt bei dunklen
Toenen weniger Abstand, als das Auge unterscheiden kann — es entstehen
sichtbare Baender statt eines glatten Uebergangs. Das sieht billig aus, und
kein Verlauf der Welt behebt es.

Was es behebt, ist Rauschen. Eine sehr feine, sehr schwache Koernung darueber
bricht die Baender auf: das Auge mittelt sie weg und sieht einen glatten
Verlauf. Dieselbe Technik steckt hinter fast jedem Hintergrund, der teuer
wirkt — in der Fotografie heisst sie Filmkorn, im Druck Rasterung.

Vorher stand hier eine Zeichnung aus drei grossen Kurslinien. Die war
gegenstaendlich und machte den Grund zu einem Bild, statt ihn Grund sein zu
lassen.

Wie stark
---------
Sehr schwach. Beim ersten Anlauf stand die Deckkraft auf 0,55 — dann sieht
man das Korn, und die Flaeche wirkt schmutzig statt tief. Es soll nicht
sichtbar sein, nur seine Wirkung: dass keine Baender mehr da sind. 0,06.

Der Aufbau
----------
feTurbulence erzeugt das Rauschen im Browser, es muss also nichts uebertragen
werden — die Datei ist ein paar hundert Byte gross, egal wie fein die
Koernung ist. Ohne Farbe (saturate 0), damit sie den Farbfeldern darunter
nichts antut, und mit einer Kachel von 160 Pixeln, damit sich kein Muster
abzeichnet.

    python3 grund.py > grund.svg
"""

KACHEL = 160


def main():
    print(
        '<svg xmlns="http://www.w3.org/2000/svg" width="{k}" height="{k}" '
        'viewBox="0 0 {k} {k}">'
        '<filter id="korn" x="0" y="0" width="100%" height="100%">'
        # fractalNoise statt turbulence: gleichmaessiger, ohne die typischen
        # Wolkenkerne, die man sonst als Muster wiedererkennt.
        '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" '
        'stitchTiles="stitch" seed="7"/>'
        # Grau, nicht bunt: die Farbe kommt aus den Feldern darunter.
        '<feColorMatrix type="saturate" values="0"/>'
        "</filter>"
        '<rect width="{k}" height="{k}" filter="url(#korn)" opacity="0.06"/>'
        "</svg>".format(k=KACHEL)
    )


if __name__ == "__main__":
    main()
