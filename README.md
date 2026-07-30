# Aktien-Liste · Ralph Christian Pader

Watchlist als installierbare Web-App: TradingView-Live-Charts, Live-News,
Fear & Greed Index und Push-Benachrichtigungen bei Eintritt in eine Einkaufszone.

Einkaufszonen und Ziele stehen in **USD**, in derselben Währung wie die Charts,
aus denen die Niveaus abgeleitet sind. Darunter zeigt die Seite denselben Wert
live in **Euro**, umgerechnet über den aktuellen EUR/USD-Kurs. Verglichen wird
im Alarm weiter in USD — das ist dieselbe Bedingung und hängt nicht am
Wechselkurs.

## Struktur

```
index.html                            Die Seite
manifest.webmanifest                  App-Metadaten (Name, Icons, Standalone)
sw.js                                 Service Worker: Offline-Rückfall, Push-Empfang
404.html                              Fehlerseite
netlify.toml                          Build, Functions, gesperrte Pfade
package.json                          Abhängigkeiten für die Functions
energie-these.pdf                     Download aus dem Laufband
og-preview-black.png                  Link-Vorschaubild (WhatsApp, iMessage)
icon-180.png                          Home-Bildschirm (iOS)
icon-192.png / icon-512.png           App-Icons
icon-maskable-512.png                 Android, beschnittfest

netlify/functions/news.js             Schlagzeilen je Position
netlify/functions/fx.js               Wechselkurs EUR/USD für die Euro-Anzeige
netlify/functions/vapid.js            Erzeugt und verwaltet das VAPID-Schlüsselpaar
netlify/functions/subscribe.js        Speichert angemeldete Geräte samt Besitzer
netlify/functions/alerts.js           Zonen-Prüfung, läuft alle 30 Minuten
netlify/functions/push-test.js        Testmeldung an alle Geräte
netlify/functions/on-publish.js       Meldet nach jedem Deploy, was neu ist
netlify/functions/positionen.js       Die Watchlist als Daten (lesen, ändern)
netlify/functions/positionen-start.js Der Bestand für den allerersten Aufruf
netlify/functions/konto.js            Registrierung, Anmeldung, Freigabe
netlify/functions/nachricht.js        Nachricht an alle Geräte (nur Verwaltung)
netlify/functions/sitzung.js          Unterschrift und Passwort-Hash (kein Endpunkt)

netlify/edge-functions/tor.js         Die Sperre: prüft jede Anfrage vor allem anderen

anmelden.html                         Anmelden und Zugang anfragen
verwaltung.html                       Konten freigeben, sperren, löschen
positionen.html                       Symbole hinzufügen, ändern, sortieren
```

## Deploy

Publish-Verzeichnis ist `.`, Build-Command bleibt leer. Netlify installiert die
Abhängigkeiten aus `package.json` selbst.

## Benachrichtigungen

1. Seite in Safari öffnen, Teilen → Zum Home-Bildschirm
2. App über das Icon starten (im Safari-Tab liefert iOS kein Push)
3. In der Kopfzeile auf **Benachrichtigungen** tippen
4. Im Blatt **Testmeldung senden** drücken

Danach läuft es allein: `alerts.js` liest Symbole und Einkaufszonen aus der
gespeicherten Watchlist, prüft alle 30 Minuten und meldet sich nur, wenn ein
Kurs **neu** in seine Zone eintritt. Zwischen 23 und 7 Uhr ist Ruhe.

Änderst du eine Zone unter **Verwaltung → Positionen**, zieht der Alarm
automatisch mit — es gibt keine zweite Liste zu pflegen.

## Meldung beim Veröffentlichen

`on-publish.js` wird nach jedem erfolgreichen Deploy aufgerufen und vergleicht
die Seite mit dem letzten Stand:

* Text im Laufband geändert → genau dieser Text geht als Meldung raus
* Neue Position in der Liste → "Neu in der Liste: UUUU"
* Nichts geändert → keine Meldung

Einmal in Netlify einrichten: **Site configuration** → **Notifications** →
**Add notification** → **Outgoing webhook** → Event **Deploy succeeded** →
URL `https://rcp-aktien.netlify.app/.netlify/functions/on-publish`

Der erste Aufruf speichert nur den Stand, ohne zu senden.

## Environment-Variablen

| Name | Zweck |
|---|---|
| `RCP_GEHEIMNIS` | **Pflicht.** Unterschreibt die Anmeldungen. Ohne sie bleibt die Seite zu. Ein langer Zufallstext, einmal gesetzt und nie geändert — ein neuer Wert meldet alle ab. |
| `ADMIN_MAIL` | Optional. Nur diese Adresse wird beim Registrieren zur Verwaltung. Ohne sie wird das **erste** angelegte Konto zur Verwaltung. |
| `VAPID_PUBLIC` / `VAPID_PRIVATE` | Optional. Eigenes Schlüsselpaar statt des automatisch erzeugten. |
| `VAPID_SUBJECT` | Optional. Kontaktadresse im Push-Header, z. B. `mailto:…` |

`SITE_PASSWORD` wird nicht mehr gebraucht und kann gelöscht werden.

## Positionen

Die Watchlist steht nicht mehr im HTML, sondern in Netlify Blobs (Store
`aktien-positionen`, ein Eintrag mit der ganzen Liste). `index.html` baut Menü
und Karten daraus auf; `status.js` und `alerts.js` lesen dieselbe Quelle, es
gibt also weiterhin nur eine Liste zu pflegen.

Bearbeitet wird sie unter **Verwaltung → Positionen**: hinzufügen, ändern,
verschieben, entfernen, als NEU markieren. Gespeichert wird immer die ganze
Liste auf einmal.

Je Position:

| Feld | Wofür |
|---|---|
| Name, Kürzel, Branche | Überschrift der Karte |
| Beschriftung im Menü | der Chip oben — bei Gold steht dort `Gold`, auf der Karte `XAUUSD` |
| Einkaufszone | zwei Zahlen, z. B. `50,12 – 39,19 USD` — daraus kommen Alarm und Sortierung |
| Ziel | die Zeile unter der Überschrift |
| TradingView-Symbol | `NASDAQ:INTC` — daraus wird der Chart gebaut |
| Yahoo-Symbol | Kurse für Alarme und Statusband |
| Suchbegriff für News | leer heißt: kein News-Block auf dieser Karte |
| finanzen.net-Seite, Analyse-Chart | optional, beide https |
| Anker | `#intc` in der Adresse — später nicht mehr ändern, sonst brechen alte Links |
| NEU | Markierung am Chip und auf der Karte |

Beim Speichern einer **neuen** Position geht automatisch eine Push-Meldung an
alle Geräte. Änderungen an vorhandenen melden nichts.

Der allererste Aufruf übernimmt den Bestand aus `positionen-start.js`. Danach
ist der Store die Wahrheit; Änderungen an dieser Datei haben keine Wirkung mehr.

Ohne Netz baut die Seite aus der zuletzt gesehenen Liste im lokalen Speicher.

## Der Auftakt

Wer die App vom Home-Bildschirm oeffnet und angemeldet geblieben ist, sah
bisher zuerst eine halbfertige Seite: Karten ohne Charts, Zahlen ohne Kurse.
Jetzt liegt fuer diese Sekunden ein Auftakt darueber — Name der App, "Angemeldet
als …", ein Strich, der sich fuellt, und darunter, woran gerade gearbeitet wird.

Er wartet auf drei Dinge: die Liste steht, der oberste Chart hat gezeichnet,
die Kurse sind da. Dazwischen laeuft alles ganz normal weiter — die Zeit wird
also genutzt, nicht hinzugefuegt.

Zwei Grenzen: mindestens 900 ms, damit es nicht zuckt, wenn alles schon im
Zwischenspeicher liegt; hoechstens 3 Sekunden, damit ein haengender Dienst
niemanden aufhaelt. Dazu ein Notausgang direkt im Markup, der ihn auch dann
wegnimmt, wenn weiter unten ein Skript stolpert.

## Der Hintergrund aus Kerzen

Anmeldeseite und Auftakt haben denselben Hintergrund: ein Kursverlauf aus
Kerzen, der von rechts nach links durchlaeuft. Zwei Baender uebereinander, das
hintere gross und langsam (15 s), das vordere kleiner und schneller (6 s) —
daraus entsteht Tiefe, ohne dass ein zweites Motiv noetig waere.

Die erste Fassung lief dreimal so schnell und war unruhig: ein Anmeldebildschirm
soll nicht draengen. Das Verhaeltnis der beiden Baender zueinander ist geblieben,
nur das Tempo ist heruntergenommen.

Gezeichnet wird nichts live. `kerzen.py` erzeugt einmal ein SVG aus
einem Zufallsweg mit Trends und Gegenbewegungen; steigende Kerzen bleiben hohl,
fallende sind gefuellt, also Kontrast ohne eine einzige Farbe. Die Reihe steht
zweimal hintereinander im Bild, deshalb laeuft `translateX(-50%)` nahtlos um.

Bewegt wird nur das Band als Ganzes per `transform` — eine Sache fuer den
Compositor, kein Layout, kein Skript. Gemessen mit sechsfach gedrosseltem
Prozessor kostet das keine messbare Ladezeit: erster Chart nach 1638–1677 ms
mit Kerzen, 1690–1740 ms ohne. Bei `prefers-reduced-motion` stehen die Baender
still, das Bild bleibt.

Die Anmeldekarte ist milchig statt weiss (`backdrop-filter`), damit die Kerzen
auch hinter ihr weiterlaufen; hinter dem Auftakt-Text liegt stattdessen ein
weicher Lichthof, sonst waere "Charts werden geladen" nicht zu lesen.

## Fluessigkeit

Zehn TradingView-Einbettungen sind zehn vollstaendige Anwendungen mit eigenen
Zeitgebern und Verbindungen. Deshalb haengt die Seite nur die Charts ein, die
in die Naehe kommen: zweieinhalb Bildschirme im Voraus, damit sie auch beim
schnellen Wischen schon stehen. Beim Laden sind es drei von zehn.

Ausgehaengt wird praktisch nie — erst zehn Bildschirme weit. Einmal geladen
bleibt geladen, Zurueckscrollen wartet nicht wieder. Die Grenze ist nur ein
Netz fuer den Fall, dass die Liste sehr lang wird.

Solange TradingView noch zeichnet, steht ein Platzhalter mit dem Kuerzel und
einer laufenden Linie; der Rahmen wird erst eingeblendet, wenn wirklich etwas
da ist. Ein leerer weisser Kasten sieht aus wie ein Fehler, ein beschrifteter
sieht aus wie Warten.

Beobachtet wird dabei die Karte, nicht der Chart-Kasten in ihr: die Karten
tragen `content-visibility`, und was uebersprungen wird, meldet alles darin
als unsichtbar — der Kasten waere ausgerechnet dann "weg", wenn er nur nicht
gezeichnet wird.

Bewegt wird beim Scrollen alles **ausser** dem Chart. Wer den Vorfahren eines
fremden `<iframe>` verwandelt, laesst es bei jedem Bild neu zeichnen; gemessen
ueber einen Scrollstoss kostete das 76 ms Stilberechnung statt 26 ms.

Abseitige Karten zeichnet der Browser wegen `content-visibility: auto` gar
nicht erst. Die Kopf-Parallaxe und die Fortschrittslinie haengen an
CSS-Zeitachsen — beim Scrollen laeuft kein rechnendes Skript.

## Nachricht an alle

In der Verwaltung steht oben **Nachricht an alle**: Titel, Text, senden. Sie
geht an jedes Gerät, das Benachrichtigungen angemeldet hat — dieselben
Empfänger wie bei den Kursalarmen, unabhängig davon, wem das Gerät gehört.
Vor dem Absenden fragt die Seite nach und nennt die Zahl der Geräte.

Jede Nachricht bekommt einen eigenen Tag, überschreibt die vorige also nicht.
Antippen öffnet die Liste. Geräte, die der Push-Dienst nicht mehr kennt,
werden beim Senden aussortiert und in der Rückmeldung gezählt.

## Das App-Symbol

Vorher stand da ein schwarzes Quadrat mit „RCP" — auf einem schwarzen
Hintergrundbild war es kaum zu finden, und mit der App hatte es nichts zu tun.

Jetzt trägt es dasselbe Motiv wie der laufende Hintergrund: vier Kerzen,
steigende hohl, fallende gefüllt, ein Rücksetzer und ein Anstieg, der höher
endet als er begann. Gebaut nach den Regeln, nach denen Apples eigene Symbole
gebaut sind — volle Kachel mit leichtem Verlauf, ein einziges Zeichen groß und
mittig darauf, keine Haarlinien, keine selbst gezeichneten runden Ecken.

Die Kachel ist weiß, weil die App selbst hell ist und weil Grün und Blau auf
einem iPhone-Startbildschirm gegen FaceTime, Telefon, Nachrichten, Mail und
App Store antreten müssten. `logo.py` kennt alle drei Farben; ein Aufruf
schreibt die SVG-Dateien, daraus werden die PNG gerendert:

| Datei | Größe | Quelle |
|---|---|---|
| `icon-180.png` | 180 | `logo-weiss.svg` |
| `icon-192.png` | 192 | `logo-weiss.svg` |
| `icon-512.png` | 512 | `logo-weiss.svg` |
| `icon-maskable-512.png` | 512 | `logo-weiss-maske.svg` |

Die Maske-Fassung ist kleiner gezeichnet, weil Android auf einen Kreis
zuschneidet. Die Symbole liegen im Vorrat des Service Workers — nach einer
Änderung muss `CACHE` in `sw.js` hochgezählt werden, sonst bleibt das alte
Bild auf den Geräten stehen.

## Wer gerade da ist

Ganz oben in der Verwaltung steht **Gerade auf der Seite**: wer die App in
diesem Moment offen hat, mit welchem Gerät und seit wann. Jede Kontokarte trägt
darunter eine eigene Zeile — entweder „jetzt auf der Seite" oder „auf der Seite
vor 20 Minuten". Angemeldet zu sein und die App offen zu haben ist nicht
dasselbe, deshalb stehen beide Zeiten getrennt.

Jede geöffnete Seite meldet sich alle 45 Sekunden (`besuch.js`), solange das
Fenster sichtbar ist. Wandert es in den Hintergrund oder wird es geschlossen,
geht ein letzter Ruf raus — sonst hinge jemand noch zwei Minuten als anwesend
herum, nachdem er die App längst zugemacht hat. Wer zwei Minuten lang nichts
mehr gemeldet hat, gilt als weg; zwei ausgefallene Rufe sind also erlaubt.

Gezählt wird je **Gerät**, nicht je Konto: sonst würde das Schließen des einen
Fensters jemanden abmelden, der auf dem zweiten Gerät noch liest. Eine Kennung
je Gerät liegt im `localStorage`. Die Verwaltung sieht alle 20 Sekunden nach.

Gespeichert wird nur Name, Geräteart und Zeit — keine IP-Adresse, kein voller
User-Agent. Wird ein Konto gelöscht, verschwinden seine Besuche mit.

Nur die Verwaltung darf nachsehen; melden darf jedes angemeldete Konto.

## Prüfen

| Adresse | Erwartung |
|---|---|
| `/.netlify/functions/vapid` | `{"publicKey":"B…"}` |
| `/.netlify/functions/push-test` | Testmeldung auf allen angemeldeten Geräten |
| `/.netlify/functions/alerts` | Alle Positionen mit Kurs, Zone und Status |
| `/.netlify/functions/konto?tat=wer` | `{"ok":true,"angemeldet":true,…}` |
| `/.netlify/functions/nachricht` | `{"ok":true,"geraete":3}` — nur als Verwaltung |
| `/.netlify/functions/positionen` | `{"ok":true,"anzahl":10,"positionen":[…]}` |
| `/.netlify/functions/besuch` | `{"ok":true,"da":1,"leute":[…]}` — nur als Verwaltung |

Der Punkt vor `netlify` gehört dazu. Ohne ihn wäre es ein Dateipfad, keine Function.

## Anmeldung

Die Seite ist serverseitig geschlossen. `netlify/edge-functions/tor.js` läuft
vor allem anderen und lässt nur durch, wer einen gültigen Sitzungs-Keks
mitbringt — das gilt für `index.html` genauso wie für das PDF, die Icons und
die Functions. Ohne Anmeldung bekommt der Browser die Seite gar nicht erst zu
sehen. Der frühere PIN stand im Quelltext und war nur ein Vorhang; er ist weg.

**Einrichten**

1. In Netlify `RCP_GEHEIMNIS` setzen (langer Zufallstext) und neu deployen.
   Solange sie fehlt, zeigt jede Adresse eine Einrichtungsseite mit Vorschlag.
2. `/anmelden.html` aufrufen, **Zugang anfragen**, eigene Adresse und Passwort
   eintragen. Das erste Konto ist sofort die Verwaltung.
3. Anmelden. Oben in der Kopfzeile steht nun **Verwaltung**.

**Weitere Leute**

Sie fragen selbst unter `/anmelden.html` an und landen auf *Wartet auf
Freigabe*. Du bekommst im selben Moment eine Push-Meldung — Antippen führt
direkt in die Verwaltung. Dort steht **Freigeben** oder **Ablehnen**; erst
danach kommt jemand rein. Der Knopf **Verwaltung** steht oben in der
Kopfzeile neben *Benachrichtigungen*; solange etwas offen ist, wird er
schwarz ausgefüllt und trägt die Zahl der offenen Anfragen.

Die Meldung geht nur an Geräte, an denen die Verwaltung angemeldet ist —
`subscribe.js` merkt sich zu jedem Gerät, wer daran hängt. Kursalarme gehen
weiter an alle. Bereits angemeldete Geräte tragen das beim nächsten Start von
selbst nach.

Wer freigegeben wird, erfährt es nicht von allein — vorher hat er kein Gerät
angemeldet, also gibt es nichts, wohin die Meldung gehen könnte. Ein kurzes
"Du kannst rein" muss von Hand kommen.

**Wie es zusammenhängt**

* Passwörter liegen als scrypt-Hash mit eigenem Salz in Netlify Blobs
  (Store `aktien-konten`), im Klartext steht nichts.
* Der Keks ist `HttpOnly` und `Secure` — kein Skript im Browser kommt an ihn
  heran. Ohne **Angemeldet bleiben** gilt er einen halben Tag, mit drei Monate.
* Fünf Fehlversuche sperren das Konto für eine Viertelstunde.
* Face ID kommt vom Gerät: die Felder heißen so, wie Safari sie erwartet,
  deshalb bietet der Schlüsselbund das gespeicherte Passwort per Face ID an.
* Die installierte App auf dem iPhone hat einen eigenen Keks-Speicher — dort
  meldet man sich einmal getrennt an.
* `status.js`, `alerts.js` und `on-publish.js` lesen die veröffentlichte
  `index.html`. Sie unterschreiben sich dafür selbst eine kurzlebige Kennung
  (`dienstKopf()` in `sitzung.js`), sonst würde das Tor sie aussperren.
