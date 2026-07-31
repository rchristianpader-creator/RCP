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
netlify/functions/artikel.js          Eigene Beitraege: schreiben, lesen, verlinken
netlify/functions/bild.js             Bilder zu Meldungen: hochladen und ausliefern
netlify/functions/meldungen.js        Das Buch hinter der Glocke
netlify/functions/besuch.js           Wer gerade auf der Seite ist
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
verschieben, entfernen, markieren. Gespeichert wird immer die ganze Liste auf
einmal.

### Die zwei Markierungen

Zwei Schalter je Position, beide fürs Menü und die Karte:

| Schalter | Zeichen | Aussehen |
|---|---|---|
| **NEU** | `NEU` | schwarz |
| **UPDATE** | `UPDATE` | grau — überarbeitet |

Grau statt schwarz, damit man die Rangfolge sieht, ohne sie zu lesen.

Beide zugleich ergäben keinen Sinn: was gerade erst dazugekommen ist, ist nicht
auch schon überarbeitet. Im Editor schaltet deshalb das eine das andere aus.
Kommen trotzdem beide an — von Hand, über die Function —, gewinnt NEU; es wird
immer nur **ein** Zeichen gezeigt.

### Was sich von selbst meldet

Drei Anlässe gehen als Push an alle Geräte und stehen danach in der Glocke:

| Anlass | Überschrift | Text |
|---|---|---|
| Eine Position kommt dazu | **Neu in der Liste** | die Kürzel |
| Die Einkaufszone ändert sich | **Neue Einkaufszone** | `UAA · Zone 7,00 – 6,00 USD` |
| Das Kursziel ändert sich | **Neues Kursziel** | `UAA · Ziel 20,00 USD` |
| Beides zugleich | **Zone und Ziel geändert** | beide Zahlen |
| UPDATE wird gesetzt, ohne dass sich die Zahlen ändern | **Überarbeitet** | die Kürzel |

Die Zahlen stehen in der Meldung, nicht nur das Kürzel — auf dem Sperrbildschirm
ist das der Unterschied zwischen „irgendwas hat sich geändert" und „die Zone
liegt jetzt hier". Sind mehrere Positionen betroffen, würde das zu lang; dann
stehen nur die Kürzel.

Jede Position landet in **höchstens einer** Meldung. Wer beim Ändern der Zone
auch den UPDATE-Haken setzt — der Normalfall — bekommt die mit den Zahlen; sie
sagt mehr als das Wort. Eine frisch angelegte Position steht nur unter „Neu",
auch wenn beide Haken gesetzt wären.

Gemeldet wird nur der **Übergang**. Sonst ginge bei jedem Umsortieren dasselbe
noch einmal raus. Wird die UPDATE-Markierung weggenommen und später wieder
gesetzt, ist das ein neuer Übergang und meldet sich wieder.

Still bleiben: Name, Branche, Symbole, Reihenfolge, das Wegnehmen einer
Markierung, das Entfernen einer Position. Dass etwas *nicht mehr* markiert ist,
ist keine Nachricht an alle Geräte.

Passiert mehreres in einem Zug, gehen mehrere Meldungen raus, jede mit eigenem
Anhänger, damit eine die andere auf dem Sperrbildschirm nicht überschreibt.

Der Editor sagt nach dem Speichern, was gemeldet wurde: „Gespeichert. Neu: …
Geändert: … Überarbeitet: … · an 3 Geräte gemeldet".

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

Was sich beim Speichern von selbst meldet, steht oben unter „Was sich von
selbst meldet".

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

### Wie laut das Scrollen ist

Die Bewegung war lange bewusst zurueckhaltend und wirkte dadurch beliebig.
Jetzt ist sie unuebersehbar:

- **Der Weg** eines Kartenteils betraegt 110 statt 26 Pixel.
- Er kommt aus **`scale(0.86)`** und **um 18 Grad nach hinten gekippt** herein.
  Die Perspektive steht im `transform` selbst (`perspective(900px)`), nicht am
  Vorfahren — sonst zoege sie den Chart in einen 3D-Raum, und genau das soll er
  nicht.
- **Die Deckkraft kommt frueher als die Bewegung** (bei 55 % der Strecke) — die
  Zeile steht schon lesbar da, waehrend sie ihren letzten Zentimeter noch faehrt.
- **Die Abschnitte liegen weit auseinander** (0–34 %, 14–50 %, 30–66 %, 46–82 %
  der Einfahrt) und ueberlappen nur zu einem Drittel. Gemessen bei einer Karte
  600 Pixel vor dem Bild: Kopf steht, Zielleiste bei 54 Pixel, News bei 103, der
  Knopf hat noch nicht angefangen. Das ist die Welle.
- **Die Haarlinie** faehrt aus `scaleY(5)` bei voller Deckkraft auf eine
  1-Pixel-Linie bei 0,12 — ein breiter Strich, der sich zur Kante beruhigt.
- **Der Kopf sinkt weg** statt nur zurueckzubleiben: 92 % statt 38 %, dazu
  `scale(0.78)` und Deckkraft 0,12.

Skaliert wird dabei **nie die Karte** — Kopf, Zielleiste, News und Knopf sind
Geschwister des Charts, nicht seine Vorfahren.

### Der leise Weg war der wichtigere

Zwei Wege fuehren zu derselben Bewegung, und lange war nur einer laut.

Wo der Browser `animation-timeline: view()` kann (Chrome), haengt die Bewegung
am Finger. Wo nicht — **auf dem iPhone der Regelfall** — setzt ein
`IntersectionObserver` die Klasse `sichtbar`, und die Bewegung laeuft an der
Uhr ab. Dieser zweite Weg liess frueher die **ganze Karte** einmal um 16 Pixel
aufsteigen, waehrend drueben vier Teile nacheinander kamen. Wer die Liste auf
dem iPhone ansah, bekam von der ganzen Arbeit fast nichts mit — und lauter
wurde durch jede Aenderung am ersten Weg auch nichts.

Jetzt fahren beide Wege **dieselben vier Teile mit denselben Keyframes**
(`teilLauf`), nur die Uhr ist eine andere: dort die Scrollstellung, hier
0,78 s Lauf mit 0,1 s Versatz je Teil. Nebenbei ist der zweite Weg damit auch
billiger geworden — die Karte selbst wird gar nicht mehr angefasst, und sie ist
der Vorfahr des Charts.

Die Weiche ist `@supports not (animation-timeline: view())`. Sie **muss** dort
stehen: die Regeln des zweiten Wegs tragen vier Klassen und wuerden sonst gegen
den ersten gewinnen, auch wo es ihn gibt.

`scroll-test` misst den ersten Weg, `rueckfall-test` den zweiten — dafuer wirft
er den scrollgebundenen Zweig aus dem Stylesheet und haengt den Rumpf der
Weiche nackt ein, denn Chromium laesst sich nicht sagen, es koenne etwas nicht.
`fluss-test` prueft, dass das Scrollen trotz allem fluessig bleibt.

## Nachricht an alle

In der Verwaltung steht oben **Nachricht an alle**: Titel, Text, senden. Sie
geht an jedes Gerät, das Benachrichtigungen angemeldet hat — dieselben
Empfänger wie bei den Kursalarmen, unabhängig davon, wem das Gerät gehört.
Vor dem Absenden fragt die Seite nach und nennt die Zahl der Geräte.

Jede Nachricht bekommt einen eigenen Tag, überschreibt die vorige also nicht.
Geräte, die der Push-Dienst nicht mehr kennt, werden beim Senden aussortiert
und in der Rückmeldung gezählt.

### Positionen markieren

Unter dem Textfeld steht ein Kürzel je Position zum Antippen. Was markiert ist,
hängt an der Nachricht — und dann führt sie nicht mehr nur zur Liste, sondern
zur **Karte** der ersten markierten Position (`/#uaa`).

Zwei Orte, zwei Darstellungen, weil sie verschieden viel können:

- **Im Push** gibt es nur Text. Die Kürzel stehen deshalb vorn:
  `UAA · DOW · Auf die Zone achten.` — auf dem Sperrbildschirm sieht man ohne
  Öffnen, worum es geht.
- **In der Glocke** stehen sie als eigene Zeichen unter dem Text, in derselben
  Machart wie die Kürzel im Menü. Der Text bleibt dort, wie er getippt wurde.

Geprüft wird gegen die echte Liste: was es nicht gibt, fällt weg — sonst stünde
in der Meldung ein Kürzel, hinter dem keine Karte liegt. Doppelte werden
verworfen, höchstens sechs werden genommen. Bleibt danach nichts übrig, ist es
eine gewöhnliche Nachricht und führt zur Liste.

Die Kürzel kommen beim Zählen der Geräte gleich mit (`GET` auf `nachricht`
liefert `symbole`) — ein zweiter Gang zum Speicher wäre dafür zu viel.

### Ein Bild dazu

**Bild hinzufügen** nimmt ein Foto oder einen Screenshot. Was die Kamera
liefert, wird nicht verschickt: der Browser verkleinert es vorher auf höchstens
1280 Pixel lange Kante und setzt es als JPEG um (Qualität 0,82). Aus mehreren
Megabyte werden ein paar hundert Kilobyte.

Hochgeladen wird zu `netlify/functions/bild.js`, Store `aktien-bilder`. Zurück
kommt eine **ID**, und nur die geht mit der Nachricht mit — eine beliebige
Adresse wäre ein Weg, fremde Bilder in die Glocke zu hängen. Geprüft werden
Format (`jpeg`, `png`, `webp`, `gif`) und Größe (höchstens ~2 MB). Wer ein Bild
hochlädt, räumt dabei die weg, die älter als 90 Tage sind — ein eigener Lauf
dafür wäre ein Dienst mehr, den niemand vermisst.

Ausgeliefert wird mit langer Frist (`private, max-age=31536000, immutable`):
eine ID zeigt immer auf dasselbe Bild. Hinter dem Tor bleibt es trotzdem — wer
nicht angemeldet ist, kommt hier so wenig durch wie sonst irgendwo. Hochladen
darf nur die Verwaltung, ansehen jeder Angemeldete.

Das Bild geht **so hinaus, wie es hereinkam**. Vorher wurde jedes auf 1280
Pixel heruntergerechnet — ein Chart in 4K war danach in der Lupe verwaschen,
und genau dort will man ja hineinsehen. Angefasst wird nur, was sonst nicht
durchpasst: eine Function nimmt rund sechs Megabyte an, und Base64 macht aus
drei Megabyte vier. Muss doch umgerechnet werden, dann auf 2560 statt 1280 und
mit Güte 0,92. Die Verwaltung schreibt dazu, was passiert ist: „3840 × 2160
Pixel · unverändert".

Die **Maße gehen mit** (`breite`, `hoehe` in `bild.js`, `bildB`/`bildH` an der
Meldung). Damit hält die App den Platz im **echten Seitenverhältnis** frei,
bevor das Bild da ist. Vorher stand dort 16:9 mit `object-fit: cover` — ein
Chart, dem oben und unten etwas fehlt, ist kein Chart mehr. Jetzt `contain`,
überall: in der Liste, im Aufgeschlagenen, in der Vorschau der Verwaltung.

**Auf dem iPhone zeigt die Meldung selbst kein Bild.** Apples Web-Push kennt
das Feld nicht; Android und Chrome zeigen es groß im Banner (`image` in
`showNotification`). Verlässlich steht es in der App, unter **Meldungen** —
dort ist es ohnehin am nützlichsten, weil man es dort auch wiederfindet. Der
Hinweis steht in der Verwaltung neben dem Knopf, damit die Erwartung stimmt.

## Flüssigkeit

Gemessen wird bei **sechsfach gedrosseltem Prozessor** — ein Telefon, das ein
paar Jahre auf dem Buckel hat. Ziel ist ein Bild alle 16,7 ms; über 32 ms sieht
man einen Ruckler.

| Wo | Mittlerer Bildabstand | Bilder über 32 ms |
|---|---|---|
| Anmeldeseite, Kerzen laufen | 17 ms | 0 |
| Ruhezustand | 17 ms | 0 |
| Scrollen durch die ganze Liste | 16 ms | 0 |
| Glocke aufmachen | 18 ms | 2 (schlechtestes 50 ms) |
| Ein Schritt im Rundgang | 18 ms | 3 (schlechtestes 67 ms) |

Der Start: **592 ms** bis DOMContentLoaded, erster Inhalt nach **200 ms**,
Karten stehen nach **1,6 s** — alles gedrosselt, also grob ein Sechstel davon
auf einem heutigen Telefon.

### Was gemessen wurde und was daraus folgte

Vier Verdächtige wurden einzeln abgeschaltet und nachgemessen:

- **`backdrop-filter` in der Kopfleiste** — kostet beim Scrollen **nichts**
  Messbares. Bleibt.
- **`content-visibility` auf den Karten** — schaltet man es ab, wird Scrollen
  *schlechter* (3 statt 0 Ruckler). Es trägt also, wie gedacht.
- **Der wandernde Ausschnitt im Rundgang** (`left/top/width/height` auf einem
  Element mit `box-shadow: 0 0 0 9999px`) — 3 lange Bilder je Schritt. Die
  naheliegende Umstellung auf `transform` würde genau die Eigenschaft
  zerstören, die den Schleier billig macht: bei `scale(0)` verschwände der
  Schatten mit. Der Preis wäre ein Aufblitzen der Seite bei jedem Schritt —
  dafür sind 2 Bilder je Schritt zu wenig Gewinn. Bleibt, wie es ist.
- **Der Kerzen-Hintergrund** — kostet nichts. Bleibt.

Geändert wurde nur, was sich auch messen ließ:

1. **`prefers-reduced-motion` beendet die Animationen jetzt wirklich.** Vorher
   stand dort nur `animation-duration: 0.01ms` — die endlosen Animationen
   liefen damit unsichtbar schnell *weiter*, statt aufzuhören. Mit
   `animation-iteration-count: 1` gehen sie einmal durch und sind fertig. Der
   Test zählt nach: bei „weniger Bewegung" läuft **keine** endlose Animation
   mehr.
2. **Bilder reservieren ihren Platz** (`aspect-ratio: 16/9` an den Bildern in
   der Glocke und im Beitrag). Vorher hatten sie vor dem Laden die Höhe null
   und schoben die Liste weg, sobald sie ankamen.

Was gemessen wurde und nichts brachte, ist auch wieder draußen —
`content-visibility` auf dem Laufband hat die Animation nicht angehalten, also
steht es nicht drin.

`fluss-test` hält das fest. Die Schwellen liegen **über** den gemessenen
Werten, nicht darauf: die Maschine, auf der das läuft, ist nicht immer gleich
schnell. Was dort reißt, ist eine echte Verschlechterung, kein Rauschen.

## Im Browser statt in der App

Auf dem Telefon soll die Liste als App laufen — nur dort kommen die Meldungen
an, nur dort startet sie ohne Adressleiste in einem Zug. Wer sie stattdessen im
Browser aufmacht, sieht deshalb **keine Liste**, sondern nur den Weg dorthin.

Es bleiben: der Kopf mit dem Namen, die Kontozeile mit dem Abmelden, für die
Verwaltung ihr Knopf — und darunter ein Kasten mit dem Symbol, zwei Sätzen und
**So geht's**, das die bekannte Anleitung öffnet. Alles andere ist weg: Leiste,
Karten, Charts, News, Termine, Setups, Marktstimmung, Fuß — und der Streifen am
unteren Rand, der sich sonst genau über den Knopf im Kasten legte. Der Test
misst das jetzt direkt nach: an der Mitte des Knopfes muss auch der Knopf
liegen, nicht etwas anderes.

Der erste Versuch war eine Liste mit verschlossenen Feldern statt der Charts.
Das war zu viel: halbe Sachen sind schlechter als gar keine, eine Liste voller
Schlösser liest sich wie eine kaputte Seite. Entweder richtig oder eben nicht
hier.

### Die Verwaltung ist ausgenommen

Wer die Liste pflegt, braucht sie auch am Schreibtisch und unterwegs im
Browser. Für die Verwaltung ist die Sperre deshalb aus — alles ist da: Leiste,
Karten, Charts, News, Termine, Marktstimmung, Glocke, Beiträge. Für alle
anderen bleibt es, wie es war.

Die Seite kann das nicht selbst wissen: der Sitzungs-Keks ist `HttpOnly`, kein
Skript kommt daran. Im **Tor** ist die Unterschrift aber ohnehin schon geprüft
— also legt es der Verwaltung ein lesbares Zeichen daneben (`rcp_frei=1`), und
das Kopfskript in `index.html` sieht vor dem ersten Bild nach. Nur an Seiten,
nicht an jedes Symbol: sonst hinge an jeder Anfrage ein `Set-Cookie`.

Das Zeichen folgt der Rolle, nicht dem Gerät: bei jedem Seitenaufruf wird es
neu gesetzt oder gelöscht. Wer die Verwaltung abgibt, hat es beim nächsten
Aufruf nicht mehr.

**Es ist ein Komfortschalter, kein Schloss.** Es steuert nur, welche Teile der
Oberfläche gezeigt werden. Alles Echte hängt weiter am Tor und an
`chefLesen()` in den Functions — wer sich das Zeichen von Hand setzt, sieht
dieselbe Liste, die er in der App ohnehin sähe, und kommt an nichts heran, an
das er nicht ohnehin herankäme.

Dahinter laufen die Kerzen wie auf der Anmeldeseite, der Kasten ist milchig,
Symbol, Text und Knopf kommen um 100/180/280 ms versetzt nach. Die Kerzen
stehen nicht zweimal im Markup, sondern werden aus dem Ladebildschirm hierher
gehängt — das Bild ist groß, einmal genügt.

**Geladen wird dabei nichts.** Der Kartenbau steigt gleich am Anfang aus, und
weil alle anderen Module auf sein `rcp:karten` warten, läuft auch sonst kein
Abruf. Nur Fear & Greed hing nicht am Kartenbau und brauchte eine eigene
Bremse. Der Test misst das nach: außer Konto und Anwesenheit geht keine einzige
Anfrage raus.

Der Rundgang startet hier nicht von selbst — es gibt nichts zu zeigen. Über den
Knopf im Fuß geht er weiterhin, in der App.

**Am Schreibtisch bleibt alles.** Dort gibt es kein „Zum Home-Bildschirm", und
eine gesperrte Seite wäre schlicht kaputt. Die Sperre greift nur, wenn die
Geräte-Kennung nach iPhone, iPad oder Android aussieht.

Entschieden wird das in einem winzigen Skript **im Kopf der Seite**, vor dem
Stylesheet: die Klasse `nur-web` muss vor dem ersten Bild stehen, sonst blitzt
alles kurz auf und verschwindet dann wieder.

`web-test` prüft alle drei Fälle: im Browser zu, als App offen, am Schreibtisch
offen.

### Eine Spalte am Schreibtisch

Am Telefon füllt jeder Block die Breite. Ab **720 Pixeln** steht alles in einer
Spalte von höchstens 780 Pixeln in der Mitte — Kopf, Reiter, Marktstimmung und
Karten auf derselben Linie.

Genau das war kaputt. Die Regel galt nur für `.card`, und seit die Karten in
einem Flex-Stapel liegen (`.karten`, sortiert über `order`, damit kein Chart
neu lädt), gewann `.karten > .card { margin: 0 14px 56px }` gegen das
Mittigsetzen: zwei Klassen schlagen eine, Media Queries ändern daran nichts.
Ergebnis: Kopf und Marktstimmung in der Mitte, die Karten am linken Rand
klebend, rechts eine leere Hälfte.

Die Spalte steht jetzt an **einer** Stelle, am Ende des Stylesheets — was dort
steht, kommt nach allen Grundregeln und gewinnt ohne Spezifitäts-Tricks.

Der zweite Fallstrick steckt im Flexbox-Modell: **ein Flex-Kind mit
selbsttätigem Außenabstand quer zur Richtung hört auf, sich zu dehnen.**
`margin-left/right: auto` machte die Karte nicht mittig, sondern 374 Pixel
breit — so breit wie ihr Text. Im Stapel wird deshalb mit `align-self: center`
und fester Breite gearbeitet, außerhalb mit dem gewohnten `margin: auto`.

Die Bänder bleiben über die ganze Breite: das Laufband muss laufen können, der
Setup-Streifen steht ohnehin mittig. Beim Terminkasten wächst nur sein
Innenabstand mit (`padding-left: max(14px, (100% - 780px) / 2)`), bis sein
linksbündiger Text genau dort beginnt wie die Karte. Ihn stattdessen innen
mittig zu setzen wäre falsch: er richtete sich dann an seiner eigenen
Innenkante aus, und zwischen 720 und 808 Pixeln liefe er um 16 Pixel neben der
Spalte.

`breite-test` misst bei 390, 719, 720, 800, 1512 und 2560 Pixeln nach: Breite,
Abstand links, Abstand rechts, ob nichts über den Rand steht — und ob die Karte
noch 780 Pixel breit ist statt auf ihre Inhaltsbreite zurückzufallen.

Verwaltung und Positionen standen schon vorher richtig, die Blätter auch: 520
Pixel, unten in der Mitte.

## Die Vorschau beim Verschicken

Wer die Adresse in WhatsApp oder iMessage schickt, schickt einen Roboter los,
der die Seite holt und daraus die Karte baut. Der Roboter hat keine
Anmeldung — das Tor leitet ihn auf `/anmelden.html` weiter.

Deshalb stehen die Open-Graph-Angaben **dort**, nicht nur auf `index.html`.
Vorher standen sie nur auf der Liste, die der Roboter nie zu sehen bekam; im
Chat kam die nackte Adresse an, ohne Bild und ohne Titel. Das Bild selbst ist
ohne Anmeldung erreichbar (`OFFEN_ANFANG` in `tor.js`).

Bei jedem neuen Vorschaubild muss die Nummer im `?v=` hoch, sonst zeigen die
Dienste ihre alte Kopie — sie merken sich das Bild je Adresse, oft wochenlang.

`sw-test` geht den Weg des Roboters nach: Wurzel ohne Keks anfragen, der
Weiterleitung folgen, Titel/Text/Bild aus dem Kopf lesen, das Bild ohne
Anmeldung holen und prüfen, dass es ein PNG unter 600 KB ist.

## Der Rundgang

Beim allerersten Start legt sich eine Führung über die Liste: ein Ausschnitt
wandert von Stelle zu Stelle, ein Ring schlägt darum, daneben steht in zwei
Sätzen, was man gerade sieht. Zwölf Schritte — Leiste, Sortieren, Termine,
Setups, Marktstimmung, dann eine Karte von oben nach unten (Kopf, Zone und
Ziel, Chart, Nachrichten, Analyse), zuletzt Benachrichtigungen und Verwaltung.

Ein Schritt hieß „News und Analyse" und saß auf dem Analyse-Knopf allein — die
Nachrichten stehen aber im Kasten darüber. Zwei Namen auf einer Stelle, und die
gemeinte war nicht dabei. Jetzt ist es je ein Schritt: **Nachrichten** auf dem
News-Kasten (samt Teilen), **Die Analyse** auf dem Knopf.

Weiter geht es mit dem Knopf, mit einem Tipp irgendwo daneben, mit Pfeiltaste
oder Leertaste. Zurück geht auch, Escape bricht ab. Danach kommt er nicht mehr
von selbst; über **Rundgang noch einmal** im Fuß aber jederzeit wieder.

### Der Schleier bleibt liegen

Zuerst war es anders gebaut, und es sah schlecht aus: beim Wechsel wurde der
ganze Schleier ausgeblendet. Die Seite blitzte hell auf, scrollte sichtbar, und
wurde wieder dunkel — bei jedem Schritt.

Jetzt ist es ein einziges Element: der Schatten ringsum **ist** der Schleier
(`box-shadow: 0 0 0 9999px`). Fällt der Ausschnitt auf Größe null zusammen,
deckt der Schatten weiter alles. Der Ablauf ist deshalb:

1. Der Ausschnitt fällt an seiner eigenen Mitte zu (240 ms).
2. Die Seite scrollt — der Schleier hält still.
3. Der Ausschnitt springt lautlos an den neuen Platz (`transition: none`,
   Umbruch erzwingen, wieder an).
4. Er geht dort von null auf volle Größe auf (440 ms).

Zugehen ist schneller als Aufgehen; das wirkt entschlossen statt zäh. Titel,
Text und Fuß kommen um 50/100/150 ms versetzt nach, beim Hinausgehen ohne
Versatz. Der laufende Punkt wird zum Strich, statt nur größer zu werden — das
zeigt Fortschritt, ohne dass etwas hüpft.

Gemessen mit sechsfach gedrosseltem Prozessor: mittlerer Bildabstand **17 ms**
über den ganzen Wechsel, ein einzelnes Bild über 32 ms (das ist der Scroll).

Der Test greift genau den alten Fehler ab: über den ganzen Wechsel wird die
Deckkraft des Schleiers abgetastet, sie muss durchgehend auf 1 stehen — und der
Ausschnitt muss dabei nachweislich auf null gehen und wieder aufmachen.

Zwei Dinge, auf die es sonst noch ankam:

### Ein Zug je Schritt

Zuerst wurde erst die ganze Karte angefahren und der Teil darin danach
nachgeholt — mit dem Hintergedanken, dass unter `content-visibility: auto` die
Maße in einer weit entfernten Karte nicht stimmen. Der Preis dafür war
sichtbar: bei allem, was unten in einer Karte sitzt — Chart, News, Analyse —
fuhr die Seite erst hoch und gleich wieder herunter.

Nötig war der Umweg nie. Alle Karten-Schritte zeigen auf die **erste** Karte,
und die ist immer gezeichnet; die Höhen stehen ohnehin fest, der Chart-Kasten
misst 400 Pixel, ob die Zeichnung schon darin hängt oder nicht. Gemessen wird
deshalb gleich am Ziel: `offsetTop` des Stücks selbst, ein `scrollTo`, fertig.
Was in den freien Streifen zwischen Leiste und Erklärkarte passt, wird darin
mittig gesetzt; was zu groß ist, oben angelegt. Das Nachfassen danach bleibt
als Notnagel stehen, feuert aber im Regelfall nicht mehr.

Der Test misst den ganzen Übergang mit: über jeden Schritt wird `scrollY`
abgetastet, und die Richtung darf dabei nicht wechseln. Gegen die alte Fassung
gehalten fällt er auch — bei „News und Analyse", genau dort, wo es aufgefallen
war (732 → 497 → 1247).

Und es läuft kein Skript je Bild. Die Größe des Ausschnitts wird einmal je
Schritt gesetzt, während alles kurz ausgeblendet ist; bewegt wird nur, was der
Compositor allein kann. Der Test misst das nach: während der Rundgang steht,
wird beim Scrollen **kein einziges Mal** nachgemessen.

Schritte, deren Ziel es nicht gibt, fallen weg — ein Gast hat keine Verwaltung,
ohne Push gibt es keinen Knopf dafür. Der Zähler richtet sich danach.

Gestartet wird nicht mitten in den Auftakt oder ein offenes Blatt hinein,
sondern erst, wenn der Weg frei ist.

### Die Installations-Anleitung

Die vier Schritte darin führen sich selbst vor: ein Umlauf von 7,2 Sekunden,
vier gleiche Viertel, in jedem leuchtet ein Schritt auf — Ring, Nummer und
Rahmen zusammen.

Die Versätze sind **negativ** (`0s, -5.4s, -3.6s, -1.8s`). Mit positiven
Verzögerungen stünde jeder Ring bis zu seinem Einsatz in seiner Grundgestalt
da, also sichtbar, und alle vier wären gleichzeitig zu sehen. Negativ startet
jeder mitten im Umlauf, dort, wo er unsichtbar ist. Der Test greift genau das
ab: über vierzehn Proben darf nie mehr als einer leuchten, und jeder muss
einmal drankommen.

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
zuschneidet.

### Wenn sich das Symbol ändert

Drei Stellen müssen zusammenpassen, sonst bleibt irgendwo das alte Bild stehen:

1. `CACHE` in `sw.js` hochzählen — der Vorrat des Service Workers wird sonst
   nicht erneuert.
2. Dieselbe Nummer als `?v=` an alle Symbol-Adressen hängen: in `PRECACHE`, in
   den vier HTML-Dateien und im Manifest. Ohne das gibt Safari beim Anlegen auf
   dem Startbildschirm das Bild aus seinem eigenen Zwischenspeicher heraus.
3. `sw-test` prüft beides — dass der Service Worker sich überhaupt noch
   installiert, dass jede Adresse aus `PRECACHE` wirklich ein PNG liefert und
   dass die Versionsnummern übereinstimmen.

Punkt 3 ist wichtiger, als er aussieht: `caches.addAll` ist alles oder nichts.
Eine einzige tote Adresse in `PRECACHE`, und der Service Worker installiert
sich gar nicht mehr — still, ohne Fehlermeldung.

**Auf dem iPhone reicht das trotzdem nicht.** iOS holt das Symbol genau einmal,
beim „Zum Home-Bildschirm", und legt es zum Lesezeichen. Danach sieht es nie
wieder nach. Es gibt keinen Weg, das von der Seite aus zu ändern — die App muss
vom Startbildschirm gelöscht und neu angelegt werden. Android macht es von
selbst: Chrome liest das Manifest erneut und tauscht das Bild aus.

## Die Glocke

Im Kopf steht **Meldungen** mit einem Zähler für Ungelesenes. Dahinter liegt,
was passiert ist: Kurse in ihrer Einkaufszone, neue Positionen, Nachrichten an
alle — und für die Verwaltung die Zugangsanfragen.

Jede Push-Meldung wird beim Versenden auch ins Buch geschrieben
(`notieren()` in `sitzung.js`, Store `aktien-meldungen`). Der Schlüssel trägt
die Zeit **rückwärts** (`1e15` minus Zeitstempel) — dann steht in der Liste des
Speichers das Neueste vorn, ohne dass irgendwer sortieren muss.

Geschrieben wird **vor** dem Push, nicht danach: ob gerade ein Gerät angemeldet
ist, ändert nichts daran, dass die Sache passiert ist. Schlägt das Schreiben
fehl, wird der Push trotzdem verschickt — das Buch ist Beiwerk.

### Was vor dem Einzug war, bleibt draußen

Der Stichtag ist der Moment, in dem dieses Gerät die App zum ersten Mal
geöffnet hat (`rcp:seit` im `localStorage`). Auf dem Home-Bildschirm hat die
App ihren eigenen Speicher — der erste Start dort ist also wirklich der Einzug.

Wer sich heute die App holt, soll nicht die Meldungen von vorletzter Woche
vorfinden, zu denen er nie gefragt wurde. Der Stichtag geht als `?seit=` an die
Function, die filtert schon dort.

Ganz unten steht immer der **Willkommensgruß**. Er wird in der App erzeugt,
nicht verschickt: eine Meldung zum Einzug, die niemanden weckt.

### Eine Meldung im Ganzen

Ein Tipp auf einen Eintrag schlägt ihn auf, statt gleich woandershin zu führen:
Überschrift, Zeitpunkt, der **ganze Text** in Lesegröße, das **Bild groß**.

Die markierten Kürzel stehen **vor der Überschrift** — man sieht zuerst, worum
es geht, dann was los ist — und sind **Tasten**: jede führt zu ihrer Karte,
nicht nur die erste. Sie stehen in der Liste genauso wie im Aufgeschlagenen.

Steht eine dieser Positionen gerade in ihrer Einkaufszone, **schlägt ihre
Taste** — dieselbe `beat-badge`-Animation im selben Takt wie das Zeichen auf
der Karte und der Chip im Menü. Woran das erkannt wird: die Karte trägt dann
`card-live`.

Welche Karte zu einem Kürzel gehört, steht an der Karte selbst
(`data-kuerzel`). Zuerst wurde dafür das **letzte Zeichen im Kopf** gelesen —
das ging so lange gut, bis eine Position in ihre Zone eintrat: dann hängt dort
`AKTIV` hinter dem Kürzel, die Suche fand nichts, und die Marke verschwand
ausgerechnet bei der Position, um die es ging.

Tasten erscheinen nur für Kürzel, zu denen es auch wirklich eine Karte gibt —
sonst zeigte eine Taste ins Leere. Trägt die Meldung einen eigenen Weg (ein
Beitrag, eine Karte), steht der als Knopf darunter; bei markierten Positionen
entfällt er, die Tasten sagen dasselbe genauer.

Der Eintrag ist deshalb kein `<button>` mehr, sondern ein Kasten mit
`role="button"`: Knopf im Knopf gibt es nicht. Angetippt wird er trotzdem wie
einer, mit Tastatur auch.

### Auffahren, umblättern, zufahren

Ein Blatt fährt **vom unteren Rand herauf** und dorthin zurück — nicht ein
Stück weit, sondern ganz; der Schleier blendet dazu auf. Vorher war es ein Ruck
um vierzehn Pixel, den man kaum sah, und beim Schließen verschwand es
übergangslos.

Zwischen Liste und Aufgeschlagenem wird **geblättert**: das eine geht zur Seite
hinaus, das andere kommt von der anderen Seite herein — vorwärts nach links,
zurück nach rechts. Nacheinander, nicht übereinander: übereinander müssten
beide Seiten absolut liegen, und dann stimmt die Höhe des Blattes nicht mehr.

Das steht in einem gemeinsamen `rcpBlatt` (`auf`, `zu`, `blaettern`), damit es
in der Glocke und bei den Beiträgen gleich aussieht. Wer weniger Bewegung
eingestellt hat, bekommt kein Warten aufgetischt — dann wird nur umgeschaltet.

Blätter, die selbst auf- und zufahren, tragen dafür die Klasse `faehrt`. Eine
Regel auf `.sheet` allein hätte auch die unsichtbar gemacht, die niemand
umgestellt hat (Installation, Benachrichtigungen) — die öffnen weiterhin nur
mit `hidden = false` und behalten ihr altes Auffahren.

Der Test misst das nach: über den ganzen Übergang wird abgetastet, ob der
Schleier wirklich aufblendet, wie weit die Karte fährt, dass beim Umblättern
**nie beide Seiten zugleich** dastehen, und dass ein fremdes Blatt weiter
sichtbar ist.

### Die Lupe

Ein Tipp aufs Bild zeigt es formatfüllend auf schwarzem Grund — und dort lässt
es sich **hineinzoomen**. Ein Chart im Hochformat ist sonst klein; auf die
Breite gerechnet bleibt vom Kursverlauf wenig übrig.

- **Zwei Finger** ziehen den Maßstab auf, der Punkt darunter bleibt, wo er ist.
- **Doppeltipp** geht auf einen Schlag so weit hinein, dass das Bild die Höhe
  füllt — und noch einer wieder heraus.
- **Ein Finger** zieht im Vergrößerten das Bild; über den Rand hinaus geht es
  nicht.
- **Nach unten wischen** schließt, das Bild geht mit dem Finger.
- **Ein einzelner Tipp**, Escape oder das × schließen ebenfalls.
- Am Schreibtisch zoomt auch das **Mausrad**.

Die Gesten werden selbst geführt (`touch-action: none`). Überließe man sie dem
Browser, zoomte iOS die ganze Seite mit — samt Kopfleiste und Meldung
dahinter.

Beim Öffnen wächst das Bild **aus seinem Platz in der Meldung heraus**, der
Grund blendet auf; beim Schließen geht beides denselben Weg zurück. Das ist
mehr als ein Einblenden: man sieht, woher es kommt und wohin es geht.

Einen eigenen `dblclick`-Lauscher gibt es **nicht**. Die Maus löst dieselben
Zeiger-Ereignisse aus wie der Finger, und der Doppeltipp fängt sie schon ab —
mit beidem hob sich die Geste selbst auf: erst hinein, dann durch das
nachlaufende `dblclick` gleich wieder heraus.

Dasselbe Fenster dient dem Bild in einem **Beitrag**.

**Alle Meldungen** führt zurück auf die Liste. `Schließen` schließt das ganze
Blatt.

Jede Meldung trägt dafür eine eigene Kennung (`id`, dieselbe wie ihr Schlüssel
im Speicher). Kommt man aus einer Benachrichtigung und ist sie noch nicht
geladen, wird sie geholt und dann aufgeschlagen; findet sie sich nicht, geht
die ganze Liste auf statt ins Leere zu zeigen.

Zugangsanfragen tragen `nur: "chef"` und gehen niemanden sonst etwas an.
Einträge älter als 60 Tage werden beim Nachsehen weggeräumt.

Eine Meldung kann **Zeichen** tragen (`zeichen: ["UAA", "DOW"]`) — die Kürzel
der Positionen, um die es geht. Sie stehen als kleine Marken unter dem Text.
Gesetzt werden sie beim Markieren einer Nachricht (siehe „Nachricht an alle").

### Meldungen verwalten und löschen

Geschrieben wird das Buch von den Stellen, die auch den Push verschicken.
**Weggeräumt wird nur an einer Stelle** — in `meldungen.js`, per POST, und nur
von der Verwaltung:

```
GET  ?seit=<ms>          das, was die Glocke dieses Geräts zeigt
GET  ?alle=1             das ganze Buch, ohne Stichtag       nur Verwaltung
POST { tat: "weg", id }  eine wegräumen                      nur Verwaltung
POST { tat: "leeren" }   alle wegräumen                      nur Verwaltung
```

`?alle=1` ist nicht bloß bequem, sondern nötig: die Glocke jedes Geräts zeigt
nur, was seit seinem Einzug dazukam, und **wer nur sieht, was sein Gerät sieht,
räumt weg, was er nicht sieht.** Für einen Gast ist der Parameter wirkungslos —
er bekommt seinen Stichtag und keine Zugangsanfragen, egal was er fragt.

In der **Verwaltung** steht das Buch als eigener Kasten: je Zeile die Art als
kleines Zeichen (Nachricht, Einkaufszone, Position, Beitrag, Zugang), die
Überschrift, darunter Zeitpunkt, markierte Kürzel, „mit Bild" und „nur
Verwaltung". Dazu ein **Löschen** je Zeile und ein **Alle löschen**. Was gerade
verschickt oder veröffentlicht wurde, steht sofort im Kasten — die beiden
anderen Module rufen dafür `window.rcpBuchFrisch()`.

In der **Glocke** steht derselbe Knopf an der aufgeschlagenen Meldung — dort,
wo man die missratene Meldung bemerkt. Er ist der leiseste Knopf im Blatt und
nur für die Verwaltung da; ob wirklich gelöscht werden darf, entscheidet
`chefLesen()` am Konto, nicht das lesbare Zeichen im Keks. Am
Willkommensgruß steht er nicht: der wird in der App erzeugt und hat keine
Kennung.

**Eine Meldung ist für alle dieselbe.** Was hier weggeht, ist auf jedem Gerät
weg — deshalb wird vorher gefragt, und deshalb steht es auch im Kasten.

**Das Bild geht mit.** Zeigt keine bleibende Meldung mehr darauf, wird es aus
`aktien-bilder` gelöscht; zeigt noch eine darauf, bleibt es liegen. Sonst wäre
es entweder Müll, der für immer bezahlt wird, oder ein Loch in einer Meldung,
die noch steht.

`buch-test` prüft die Function (wer darf, wer nicht, was mit dem Bild
passiert), `buchweg-test` die beiden Oberflächen — bis hin zu dem Fall, dass
ein Gast den Aufruf von Hand absetzt.

## Beiträge

Bis hierher kam alles, was in der Liste „News" hieß, von außen: die
Schlagzeilen in den Karten von Yahoo, das Laufband ganz oben stand als Text
in `index.html`. Etwas Eigenes zu veröffentlichen ging nur über den Code.

Jetzt gibt es in der Verwaltung **Beitrag veröffentlichen**. Zwei Arten:

- **Nur einen Link.** Adresse einsetzen, **Nachsehen** drücken — die Function
  holt sich Überschrift, Vorschaubild und Quelle von der Seite selbst (Open
  Graph, dieselben Angaben, aus denen auch WhatsApp seine Karte baut) und zeigt
  die Karte zur Kontrolle. Die Überschrift wandert ins Feld darunter und lässt
  sich dort noch ändern, falls das Portal einen Werbetitel gesetzt hat. Ein Text
  ist dann nicht nötig.
- **Selbst geschrieben.** Überschrift und Text, Leerzeilen trennen Absätze.

Dazu ein Haken für „Alle benachrichtigen". Was dabei entsteht, geht drei Wege in
die App:

1. Das **Band ganz oben** zeigt den neuesten Beitrag und führt zu ihm. Steht
   noch keiner, bleibt der fest eingebaute Text stehen.
2. Der Knopf **Beiträge** im Fuß öffnet die Liste. Er zeigt sich nur, wenn es
   etwas zu lesen gibt.
3. Eine **Push-Meldung** mit `?beitrag=<id>`, und derselbe Eintrag in der
   Glocke. Ein Tipp darauf öffnet den Beitrag im Blatt, ohne die Seite neu zu
   laden — die App ist ja schon offen.

In der Liste sieht ein verlinkter Beitrag aus wie die Karte eines Boten: Bild
links, Überschrift daneben, Quelle darunter in 10px-Versalien — kein buntes
Zeichen davor, die Liste ist schwarzweiß. Ein selbst geschriebener steht ohne
Bild da, dafür mit Anriss.

Gelesen wird in einem Blatt: Überschrift, Datum, Quelle oder Verfasser, das
Vorschaubild, der Text. Gesetzt wird über `textContent`, nie über `innerHTML` —
was in der Verwaltung getippt wird, ist Text und kein Markup. Unten führt
**Artikel öffnen** zur Quelle (nur beim verlinkten), und **Teilen** schickt den
Link weiter; wo keiner hinführt, das gemalte Bild.

### Was wo liegt

`netlify/functions/artikel.js`, Store `aktien-artikel`. Der Schlüssel trägt die
Zeit rückwärts (`1e15` minus Zeitstempel) — dieselbe Bauweise wie beim
Meldungsbuch, dann steht das Neueste ohne Sortieren vorn.

Die **Liste** bringt nur den Vorspann mit, die ersten 180 Zeichen. Den ganzen
Text holt erst, wer ihn liest, und die App behält ihn dann — sonst zöge jeder
Start alles mit, was je geschrieben wurde.

Lesen darf jeder Angemeldete, schreiben nur die Verwaltung (`chefLesen`). Der
Test schickt einen Gast gegen die Function: er bekommt **403**, und danach ist
auch wirklich nichts entstanden.

### Beim Nachsehen wird nicht alles abgerufen

Eine Function, die jede Adresse abruft, die man ihr hinhält, wäre ein Werkzeug
für andere Zwecke — auch wenn nur die Verwaltung sie anstoßen kann. Deshalb:
nur `http` und `https`, und nichts, was ins eigene Netz zeigt (`localhost`,
`127.*`, `10.*`, `192.168.*`, `172.16–31.*`, `169.254.*` — der
Metadaten-Dienst —, `fc/fd/fe80`, `.local`, `.internal`).

Gelesen werden höchstens 300 KB: der Kopf steht vorn, und ein Portal mit
Endlos-Strom hält die Function damit nicht auf. Neun Sekunden Frist, eine
Kennung im `User-Agent` — ohne die liefern manche Portale nur eine Sperrseite.

Überschriften kommen als HTML herein, mit `&uuml;` und `&ndash;`. Die
gebräuchlichen Namen stehen in einer Tabelle, alles andere kommt als Zahl und
wird darüber aufgelöst.

`vorschau-test` prüft das ohne Netz — die Seite wird im Test gestellt: og:title
gewinnt vor `<title>`, Attribute in beliebiger Reihenfolge, relative Bilder
werden gegen die Seite aufgelöst, und für **keine** der zwölf verbotenen
Adressen geht auch nur ein Ruf hinaus.

**Zurücknehmen** löscht den Beitrag. Der Eintrag in der Glocke bleibt stehen —
ein Tipp darauf sagt dann „Dieser Beitrag wurde zurückgenommen".

## Eine Meldung weitergeben

Oben rechts in jedem News-Kasten steht **Teilen**. Was dabei rausgeht, hängt
davon ab, ob es etwas zu öffnen gibt.

### Wo ein Link hinführt, geht der Link raus

Eine Meldung aus einem News-Kasten hat eine Adresse. Die geht als `url` mit:

```js
navigator.share({ title: titel, text: titel, url: link })
```

Der Bote holt sich davon selbst Überschrift, Vorschaubild und Quelle
(Open Graph) und baut daraus **seine eigene Karte** — genau das Bild, das
WhatsApp zeigt, wenn man eine Adresse einsetzt. Das sieht besser aus als alles
Gemalte, und der Empfänger kann den Artikel öffnen.

Zuvor war es andersherum gebaut: ein gezeichnetes Bild ohne `url`, damit keine
Adresse zu sehen ist. Das hielt zwar den Link aus der Nachricht, nahm dem
Empfänger aber auch den Artikel. Die Karte des Boten kann beides.

Ob die Adresse dabei zusätzlich als Text mitläuft, entscheidet der Bote — nicht
diese App.

Am Schreibtisch, wo es kein Teilen gibt, wandert die Adresse in die
Zwischenablage; der Knopf sagt kurz **Kopiert**.

### Wo keiner hinführt, wird gezeichnet

Ein selbst geschriebener Beitrag steht nur in dieser App — dorthin führt keine
Adresse. Für den wird weiterhin ein Bild gezeichnet, 1080 × 1080, im Zuschnitt
der App: `#fafafa` als Grund, oben links das Symbol mit denselben runden Ecken
wie auf dem Telefon, daneben „AKTIEN-LISTE" und der Name. Die Überschrift steht
groß in der Mitte und bekommt bis zu acht Zeilen; was nicht mehr passt, endet
mit drei Punkten statt mitten im Wort. Unten ein Haarstrich und der Name.

Gezeichnet, nicht geholt: ein fremdes Vorschaubild würde die Leinwand verderben
(cross-origin), und dann ließe sie sich nicht mehr ausgeben. Das Symbol ist von
hier, das geht.

Wo Dateien nicht geteilt werden können, wird das Bild heruntergeladen und die
Überschrift in die Zwischenablage gelegt.

Der Knopf im News-Kasten zeigt sich erst, wenn wirklich Meldungen geladen sind
(`.news-block[data-live="1"]`); vorher gäbe es nichts zu teilen. Im Browser
steht er gar nicht erst da, dort ist die Liste ohnehin zu.

Zwei Tests, zwei Wege: `teilen-test` prüft, dass aus einem News-Kasten die
Adresse der **gerade sichtbaren** Meldung rausgeht — nicht die einer anderen —
und `beitrag-test`, dass beim selbst geschriebenen Beitrag eine Datei geht,
kein `url`, und dass **jedes einzelne Wort** auf der Leinwand gegen `https?:`,
`://`, `www.`, `netlify` und Endungen wie `.de`/`.app` gehalten wird.

## Antippen einer Meldung

Jede Meldung trägt einen Weg, und der führt dorthin, wovon sie handelt:

| Meldung | Wohin |
|---|---|
| Kurs in seiner Einkaufszone | `/#uaa` — zur Karte |
| Neue, geänderte, überarbeitete Position | `/#uaa` — zur Karte |
| Nachricht an alle | `/?meldung=<id>` — **diese eine Meldung**, aufgeschlagen |
| Beitrag | `/?beitrag=<id>` — das Blatt geht auf |
| Zugangsanfrage | `/verwaltung.html` |

Ein Kursalarm führt geradewegs zur Karte — da gibt es nichts zu lesen, was
nicht schon im Banner stünde. Eine **Nachricht** dagegen hat einen Text, oft
ein Bild und markierte Positionen; die führt deshalb auf sich selbst. Vorher
landete man gleich auf einer Karte und hatte den Text nicht mehr.

### Warum das nicht `client.navigate()` ist

Zuerst stand im Service Worker nur: das offene Fenster nach vorn holen und
`client.navigate(ziel)`. Auf dem Schreibtisch geht das. Auf dem iPhone gibt es
`navigate()` in `WindowClient` **nicht** — man landete in der App und dann
nirgendwo. Und wer die Nachricht ohne Markierung antippte, kam auf die bloße
Liste; hatte er sie vom Sperrbildschirm weggewischt, fand er sie nirgends
wieder.

Jetzt schickt der Service Worker den Weg als Nachricht an die Seite
(`postMessage({art:"hin", url})`) und die Seite geht ihn selbst: Sprungmarke
anfahren, Blatt öffnen, Glocke öffnen — alles ohne Neuladen. Meldet sich die
Seite innerhalb von 400 ms über einen `MessagePort` zurück, ist die Sache
erledigt. Meldet sie sich nicht — weil der Weg woanders hinführt, etwa in die
Verwaltung —, greift `navigate()` doch noch, und wo es das nicht gibt,
`openWindow()`. Ist gar kein Fenster offen, macht er eines auf.

Die Seite nimmt nur an, was sie auch einlösen kann: nichts Fremdes, keine
andere Seite, keine Sprungmarke, die es nicht gibt. Ein offenes Blatt macht
sie vorher zu, sonst führe man hinter dem Schleier.

**Was der Test kann und was nicht:** den Klick auf eine Benachrichtigung löst
das Betriebssystem aus, der lässt sich von außen nicht nachstellen. Geprüft
wird deshalb die Stelle, an der es hakte — was die Seite mit dem geschickten
Weg macht — und dass die Functions Ziele setzen, die irgendwohin führen.

## Auf dem Laufenden bleiben

Der Zähler am Verwaltungsknopf stand früher **nur einmal**, beim Laden. Kam
währenddessen eine Anfrage herein, meldete sie sich zwar per Push — die App
zeigte sie aber erst nach einem Neustart. Jetzt wird nachgesehen:

- wenn die App wieder in den Vordergrund kommt,
- alle 60 Sekunden, solange sie sichtbar ist,
- und **sofort**, wenn der Service Worker eine Meldung durchreicht: er schickt
  nach `showNotification` ein `postMessage` an alle offenen Fenster.

Der Knopf wird dabei jedes Mal frisch beschriftet. Vorher wurde das
Zählerzeichen nur angehängt — bei jedem Durchgang eines mehr.

## Ein Tipp muss reichen

Freigeben brauchte zwei Tipps. Beim Antippen passierte sichtbar nichts, bis der
Server geantwortet hatte und die ganze Liste neu stand; wer nicht wusste, ob es
gezählt hat, tippte noch einmal. Drei Ursachen, drei Änderungen:

1. **Keine Rückmeldung.** Jetzt wechselt der Knopf sofort auf „…", die Karte
   wird blass, und alle Knöpfe darin sind gesperrt. Ein zweiter Tipp kann gar
   nicht mehr durchgehen — der Test zählt mit, dass genau **eine** Entscheidung
   rausgeht.
2. **Die Liste flog bei jeder Aktion neu ein.** `riseIn` lief auf jeder Karte
   bei jedem Aufbau. Wer während der halben Sekunde tippte, traf daneben. Jetzt
   bewegt sich nur der erste Aufbau.
3. **Die Besuchszeile wechselte die Höhe.** Sie wird alle 20 Sekunden neu
   geschrieben; war sie mal ein-, mal zweizeilig, rückten die Knöpfe darunter
   genau dann weg, wenn jemand tippt. Jetzt ist sie immer genau eine Zeile.

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
| `/.netlify/functions/meldungen` | `{"ok":true,"meldungen":[…]}` — was hinter der Glocke steht |
| `/.netlify/functions/artikel` | `{"ok":true,"artikel":[…]}` — die eigenen Beiträge, Neuestes vorn |
| `/.netlify/functions/bild?id=<id>` | das Bild selbst — nur für Angemeldete |

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
