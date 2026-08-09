#!/usr/bin/env python3
"""App-Logo in der Machart der App.

Was sich geaendert hat
----------------------
Das Symbol war eine weisse Kachel mit einem dunklen Kerzenverlauf darauf —
aus der Zeit, als die App hell war. Sie ist dunkel geworden, und ein weisses
Symbol daneben sieht aus wie eine andere App.

Jetzt dieselbe Machart wie die Fenster in der Liste: ein dunkler Grund mit
zwei Farbfeldern, darauf ein schmaler Lichtstreifen und eine Lichtkante
oben. Das ist der ganze Trick am Glas — nicht mehr Licht, sondern
schaerferes: ein breiter Verlauf hat keine Kante, und ohne Kante sieht das
Auge kein Licht, sondern nur eine hellere Flaeche.

Warum kein Frost, kein Rundfunkeln, keine Spiegelung: ein Symbol ist auf dem
Startbildschirm 40 bis 60 Pixel gross. Alles, was feiner ist als ein
Prozent der Kante, verschwindet dort — oder wird zu Matsch. Geblieben ist,
was auch bei 40 Pixeln noch zwei Dinge sagt: dunkles Glas, Licht von oben
links.

Das Zeichen
-----------
Der Kerzenverlauf: steigende Kerzen hohl, fallende gefuellt. Von Hand
gesetzt, nicht gewuerfelt — ein Ruecksetzer, dann ein Anstieg, der hoeher
endet als er begann. Ein Zufallsweg sieht auf 40 Pixeln nach nichts aus.

Gezeichnet wird direkt als PNG, nicht mehr ueber SVG: fuer SVG braucht es
einen Rasterer, und der ist auf keiner Maschine sicher vorhanden. Pillow
ist es.

    python3 logo.py

    -> icon-512.png, icon-192.png, icon-180.png, icon-maskable-512.png
"""

from PIL import Image, ImageDraw

# Alle Masse beziehen sich auf diese Kantenlaenge und werden mitskaliert.
BEZUG = 512

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

STRICH = (242, 245, 244)          # --fg
GRUND_OBEN = (34, 41, 39)         # heller Kopf des Verlaufs
GRUND_UNTEN = (9, 12, 11)         # --bg, praktisch
KUEHL = (38, 72, 92)              # --grund-kuehl, oben links
WARM = (78, 60, 42)               # --grund-warm, oben rechts


def misch(a, b, t):
    t = 0.0 if t < 0 else (1.0 if t > 1 else t)
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def heller(farbe, weiss_anteil):
    return misch(farbe, (255, 255, 255), weiss_anteil)


def grund(seite):
    """Dunkler Verlauf mit zwei weichen Farbfeldern.

    Die Felder sind sehr schwach. Sie sollen nicht als Farbe auffallen,
    sondern verhindern, dass die Flaeche wie ein graues Rechteck wirkt —
    dieselbe Aufgabe wie beim Grund der Seite.
    """
    bild = Image.new("RGB", (seite, seite))
    punkte = []
    for y in range(seite):
        ty = y / (seite - 1)
        zeile_grund = misch(GRUND_OBEN, GRUND_UNTEN, ty ** 0.85)
        for x in range(seite):
            tx = x / (seite - 1)
            f = zeile_grund
            # Kuehles Feld oben links, warmes oben rechts. Quadratischer
            # Abfall: weich, ohne sichtbaren Rand.
            dk = ((tx - 0.06) ** 2 + (ty - 0.02) ** 2) ** 0.5
            if dk < 0.78:
                f = misch(f, KUEHL, 0.44 * (1 - dk / 0.78) ** 2)
            dw = ((tx - 0.98) ** 2 + (ty - 0.10) ** 2) ** 0.5
            if dw < 0.72:
                f = misch(f, WARM, 0.34 * (1 - dw / 0.72) ** 2)
            punkte.append(f)
    bild.putdata(punkte)
    return bild


def glanz(bild):
    """Der schmale Lichtstreifen und die Lichtkante oben.

    Der Streifen laeuft unter 148 Grad wie in der App. Schmal, mit hartem
    Anstieg und weichem Abfall — so faellt Licht auf eine glatte Flaeche.
    """
    seite = bild.size[0]
    punkte = list(bild.getdata())
    # Richtung des Verlaufs: 148 Grad, gemessen wie in CSS (von oben, im
    # Uhrzeigersinn). Der Wert unten ist der Anteil entlang dieser Achse.
    import math
    w = math.radians(148.0)
    dx, dy = math.sin(w), -math.cos(w)
    laenge = abs(dx) + abs(dy)

    for y in range(seite):
        for x in range(seite):
            t = ((x / seite) * dx + (y / seite) * dy + (1 if dx < 0 else 0) + (1 if dy < 0 else 0)) / laenge
            # Ein schmaler Streifen, der die obere linke Ecke quert — nicht
            # die Ecke selbst: von t=0 an waere es kein Streifen, sondern
            # eine aufgehellte Ecke. Harter Anstieg, weicher Abfall.
            if 0.075 < t < 0.20:
                if t < 0.115:
                    a = (t - 0.075) / 0.04
                else:
                    a = max(0.0, 1 - (t - 0.115) / 0.085)
                if a > 0:
                    i = y * seite + x
                    punkte[i] = heller(punkte[i], 0.115 * a)
    bild.putdata(punkte)

    zeichner = ImageDraw.Draw(bild, "RGBA")
    # Lichtkante oben: hell in der Mitte, zu den Ecken hin aus. Eine Kante,
    # die ringsum gleich hell ist, sieht nach Rahmen aus, nicht nach Licht.
    dicke = max(1, round(seite / 170))
    for x in range(seite):
        mitte = 1 - abs(x / (seite - 1) - 0.5) * 2
        a = round(96 * (mitte ** 0.7))
        if a > 0:
            zeichner.rectangle([x, 0, x, dicke - 1], fill=(255, 255, 255, a))
    # Keine Seitenlinien: auf 40 Pixeln lesen sie sich als Rahmen um das
    # Symbol, und ein Rahmen ist genau das, was ein Symbol nicht haben soll.
    return bild


def zeichen(bild, anteil):
    """Der Kerzenverlauf. anteil < 1 schrumpft ihn zur Mitte hin."""
    seite = bild.size[0]
    k = seite / BEZUG
    zeichner = ImageDraw.Draw(bild)
    n = len(VERLAUF)
    breite = n * KOERPER + (n - 1) * LUECKE
    x0 = (BEZUG - breite) / 2
    mitte = BEZUG / 2

    def um(v):
        """Auf die Zielgroesse und, wenn noetig, zur Mitte hin gestaucht."""
        return (mitte + (v - mitte) * anteil) * k

    for i, (offen, schluss, hoch, tief) in enumerate(VERLAUF):
        x = x0 + i * (KOERPER + LUECKE)
        m = x + KOERPER / 2
        steigt = schluss < offen

        r = DOCHT * anteil * k / 2
        zeichner.rounded_rectangle(
            [um(m - DOCHT / 2), um(hoch), um(m + DOCHT / 2), um(tief)],
            radius=r, fill=STRICH)

        o = min(offen, schluss)
        h = max(KANTE * 2.8, abs(schluss - offen))
        zeichner.rounded_rectangle(
            [um(x), um(o), um(x + KOERPER), um(o + h)],
            radius=9 * anteil * k, fill=STRICH)
        if steigt:
            # Hohl: der Grund wird wieder ausgestanzt, der Rand bleibt
            # stehen. Ausgestanzt wird mit dem, was an dieser Stelle
            # ohnehin liegt — sonst saehe man dort eine flache Flaeche.
            kasten = [round(um(x + KANTE)), round(um(o + KANTE)),
                      round(um(x + KOERPER - KANTE)), round(um(o + h - KANTE))]
            loch = bild.copy().crop(kasten)
            maske = Image.new("L", (kasten[2] - kasten[0], kasten[3] - kasten[1]), 0)
            ImageDraw.Draw(maske).rounded_rectangle(
                [0, 0, maske.size[0] - 1, maske.size[1] - 1],
                radius=max(1, round(4 * anteil * k)), fill=255)
            bild.paste(hintergrund.crop(kasten), (kasten[0], kasten[1]), maske)
    return bild


def symbol(seite, anteil=1.0):
    global hintergrund
    hintergrund = glanz(grund(seite))
    return zeichen(hintergrund.copy(), anteil)


if __name__ == "__main__":
    gross = symbol(BEZUG)
    gross.save("icon-512.png")
    # Kleinere Groessen nativ zeichnen, nicht herunterrechnen: die Lichtkante
    # ist einen Pixel dick und wuerde beim Verkleinern zu Grau verwaschen.
    symbol(192).save("icon-192.png")
    symbol(180).save("icon-180.png")
    # Android schneidet zum Kreis: alles Wesentliche in die mittleren 70 %
    symbol(BEZUG, 0.70).save("icon-maskable-512.png")
    print("geschrieben: icon-512, icon-192, icon-180, icon-maskable-512")
