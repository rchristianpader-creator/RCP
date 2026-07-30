#!/usr/bin/env python3
"""App-Logo in der Machart der Apple-Symbole.

Was Apples Symbole auf dem Startbildschirm gemeinsam haben: eine volle
Kachel mit leichtem Verlauf von oben nach unten, darauf ein einziges
Zeichen — gross, mittig, mit ordentlich Rand ringsum. Keine Haarlinien,
keine selbst gezeichneten runden Ecken; die macht das Betriebssystem.

Das Zeichen ist der Kerzenverlauf aus dem Hintergrund der App: steigende
Kerzen hohl, fallende gefuellt. Der Verlauf ist von Hand gesetzt, nicht
gewuerfelt — ein Ruecksetzer, dann ein Anstieg, der hoeher endet als er
begann. Ein Zufallsweg sieht auf 40 Pixeln nach nichts aus, und auf
40 Pixeln muss es noch lesbar sein.

Weiss ist gesetzt, weil die App selbst hell ist und weil Gruen und Blau auf
einem iPhone-Startbildschirm mit FaceTime, Telefon, Nachrichten, Mail und
App Store konkurrieren. Die anderen beiden stehen daneben und sind einen
Aufruf entfernt.

    python3 logo.py           schreibt logo-<farbe>.svg und logo-<farbe>-maske.svg

Daraus werden die PNG-Dateien gerendert, jeweils quadratisch:

    logo-weiss.svg        -> icon-180.png, icon-192.png, icon-512.png
    logo-weiss-maske.svg  -> icon-maskable-512.png

Die Maske-Fassung ist kleiner, weil Android auf einen Kreis zuschneidet.
"""

SEITE = 512

KOERPER = 66      # Breite eines Kerzenkoerpers
LUECKE = 24       # Abstand dazwischen
DOCHT = 24        # Breite des Dochts
KANTE = 18        # Wandstaerke der hohlen Kerzen

# (offen, schluss, hoch, tief) — kleinerer y-Wert heisst hoeher
VERLAUF = [
    (172, 252, 128, 282),
    (252, 342, 228, 388),
    (342, 250, 310, 384),
    (250, 124,  98, 284),
]

FARBEN = {
    # Name: (Kachel oben, Kachel unten, Zeichen)
    "weiss": ("#ffffff", "#f0f0f2", "#111111"),
    "gruen": ("#3ad35f", "#1f9a3c", "#ffffff"),
    "blau":  ("#2b8bff", "#0347d6", "#ffffff"),
}


def zeichnen(farbe, anteil=1.0):
    oben_f, unten_f, strich = FARBEN[farbe]
    n = len(VERLAUF)
    breite = n * KOERPER + (n - 1) * LUECKE
    x0 = (SEITE - breite) / 2
    mitte = SEITE / 2
    innen = []

    for i, (offen, schluss, hoch, tief) in enumerate(VERLAUF):
        x = x0 + i * (KOERPER + LUECKE)
        m = x + KOERPER / 2
        steigt = schluss < offen

        innen.append('<rect x="%.1f" y="%.1f" width="%d" height="%.1f" rx="%.1f" fill="%s"/>'
                     % (m - DOCHT / 2, hoch, DOCHT, tief - hoch, DOCHT / 2, strich))

        o = min(offen, schluss)
        h = max(KANTE * 2.8, abs(schluss - offen))
        innen.append('<rect x="%.1f" y="%.1f" width="%d" height="%.1f" rx="9" fill="%s"/>'
                     % (x, o, KOERPER, h, strich))
        if steigt:
            # Hohl: der Grund wird wieder ausgestanzt, der Rand bleibt stehen.
            # Das Loch bekommt denselben Verlauf wie die Kachel, sonst saehe
            # man an dieser Stelle eine flache Flaeche.
            innen.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="4" fill="url(#loch)"/>'
                         % (x + KANTE, o + KANTE, KOERPER - 2 * KANTE, h - 2 * KANTE))

    s = "".join(innen)
    if anteil != 1.0:
        v = mitte * (1 - anteil)
        s = '<g transform="translate(%.2f %.2f) scale(%.4f)">%s</g>' % (v, v, anteil, s)

    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">'
        '<defs>'
        '<linearGradient id="kachel" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>'
        '<linearGradient id="loch" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="%d">'
        '<stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>'
        '</defs>'
        '<rect width="%d" height="%d" fill="url(#kachel)"/>%s</svg>'
        % (SEITE, SEITE, SEITE, SEITE, oben_f, unten_f, SEITE, oben_f, unten_f, SEITE, SEITE, s)
    )


if __name__ == "__main__":
    for name in FARBEN:
        open("logo-" + name + ".svg", "w", encoding="utf-8").write(zeichnen(name))
        # Android schneidet zum Kreis: alles muss in die mittleren 80 Prozent
        open("logo-" + name + "-maske.svg", "w", encoding="utf-8").write(zeichnen(name, 0.70))
    print("geschrieben:", ", ".join(FARBEN))
