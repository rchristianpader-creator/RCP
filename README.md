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

**Und der Knopf verschwindet.** Er ist eine Aufforderung, kein Schalter — eine
erledigte Aufforderung gehört weg. Vorher stand er weiter in der Kopfzeile und
trug nur einen anderen Text („Benachrichtigungen aktiv"), nahm also bei jedem
Start Platz ein, ohne noch etwas zu tun.

Er kommt zurück, sobald es wieder etwas zu tun gibt: geprüft wird **beides** —
Erlaubnis erteilt *und* eine Anmeldung vorhanden. Wer die Anmeldung löscht oder
die Erlaubnis in den iOS-Einstellungen entzieht, sieht ihn beim nächsten Start
wieder. Ohne diese zweite Bedingung gäbe es keinen Weg zurück.

Er beginnt **versteckt** und kommt erst, wenn feststeht, dass er gebraucht
wird. Umgekehrt — erst zeigen, dann bei Bedarf zurückziehen — blitzte er bei
jedem Start kurz auf, und die Kopfzeile zuckte dabei. `pushknopf-test` misst
genau das nach: von Bild zu Bild, ob er je sichtbar war.

Im Rundgang fällt der Schritt dazu von selbst weg — die Schritte fragen über
`da()`, und `da()` gibt für Verstecktes nichts zurück. Was längst läuft, muss
nicht erklärt werden.

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

**Die Kürzel sind antippbar.** Eine Meldung trägt die Kürzel der Positionen,
um die es geht, als eigene Zeichen mit (`zeichen` im Buch) — in der Glocke
stehen sie als Knöpfe darunter und führen direkt zur Karte, genau wie das
Menü ganz oben. Vorher standen sie nur als Text in der Meldung: da war
„Neu in der Liste — OXY" zu lesen, aber nicht zu erreichen. Im Push geht das
nicht, dort müssen sie im Text stehen; beides zugleich schadet nichts.

### Stumm speichern

Nicht jede Änderung ist eine Nachricht wert — ein Tippfehler in der Branche,
eine andere Reihenfolge, ein nachgetragenes Yahoo-Symbol. Unten in der Leiste
steht deshalb neben *Speichern* ein Haken **Melden**.

Er ist **gesetzt**; abwählen muss man ausdrücklich. Andersherum gingen Zonen
und Ziele irgendwann unbemerkt heraus, und das ist der eine Fall, in dem eine
Meldung wirklich zählt. Ist er weg, geht die Änderung ganz normal in den
Bestand, aber ohne Push und ohne Eintrag im Buch; die Statuszeile sagt es
dazu: „Gespeichert. Geändert: OXY · still".

Technisch schickt die Seite `melden: false` mit, und `positionen.js`
überspringt den ganzen Meldeblock — nicht einzelne Meldungen, sondern alle
drei Anlässe. Der Vergleich läuft trotzdem: was sich geändert hat, steht
weiterhin in der Antwort und damit in der Statuszeile.

`stumm-test` legt eine Position mit Haken an (eine Meldung mehr im Buch),
ändert dann ohne Haken die Zone und prüft beides: keine Meldung mehr, die
Zone aber gespeichert.

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

### AKTIV heißt: seit sie auf der Liste steht

An der Karte hängt ein Kennzeichen, sobald der Kurs die Einkaufszone erreicht
hat — `IN DER ZONE`, solange er drin steht, sonst `AKTIV`. Dazu sucht
`status.js` in den Tageskerzen des letzten Monats nach einem Tief innerhalb
der Zone.

Ein Monat Kerzen weiß aber nicht, seit wann es die Position gibt. OXY wurde
angelegt, der Kurs stand bei 57,07 und damit **7,7 % über** der Zone
53,01 – 51,71 — und an der Karte stand trotzdem `AKTIV`, wegen eines Tiefs bei
48,00 vom 11. Juli. Zu der Zeit gab es die Position nicht und die Zone nicht.
Das ist kein ausgelöstes Setup, das ist Chartverlauf.

Deshalb trägt jede Position jetzt ein Feld **`seit`**, und Kerzen von davor
zählen nicht:

| Beim Speichern passiert | `seit` |
|---|---|
| Position kommt dazu | jetzt |
| Zone geändert | jetzt — eine neue Zone ist ein neues Setup |
| Ziel, Name, Branche, Reihenfolge geändert | bleibt stehen |

Gepflegt wird das Feld **nur vom Server**. Der Editor schickt es zwar mit,
aber `pruefen()` wirft es weg und der POST setzt es aus dem vorigen Stand neu
— es lässt sich also nicht von außen setzen.

**Rückwirkend wird nichts gesetzt.** Der erste Anlauf tat das: Positionen ohne
Feld bekamen „seit dem Speicherstand der Liste", also seit heute. Das war
falsch, und zwar sofort sichtbar — DOW war vor Kurzem wirklich in seiner Zone,
und genau dieses `AKTIV` wäre weggefallen. Ein Kennzeichen zu entfernen, das
zu Recht dasteht, ist schlimmer als eines stehenzulassen, das zu früh kam.

Positionen aus der Zeit vor dem Feld behalten deshalb den vollen Rückblick —
auch über beliebig viele Speichervorgänge hinweg, solange ihre Zone
unangetastet bleibt.

Eine Ausnahme gibt es: **die NEU-Markierung**. Sie sagt selbst, dass die
Position gerade erst dazugekommen ist — dann fängt auch ihre Zone nicht früher
an als der Stand der Liste. Damit sortiert sich der Altbestand von allein, ohne
dass jemand entscheiden müsste, was alt ist und was nicht: OXY trägt NEU und
bekommt seinen Zeitpunkt, DOW trägt keins und bleibt, wie es war. Und weil die
Ausnahme nur für Positionen **ohne** Feld greift, greift sie genau einmal.

Diese Ausnahme steckt in **`lesen()`, nicht nur im POST** — der Unterschied
zwischen „wirkt nach dem nächsten Speichern" und „wirkt sofort". Im ersten
Anlauf stand sie nur im POST, und OXY stand danach weiter als aktiv da: das
Nachziehen hätte ein Speichern in der Verwaltung gebraucht. Ein Handgriff, den
niemand kennt, ist keine Lösung. Geschrieben wird beim Lesen trotzdem nichts —
der POST setzt denselben Wert beim nächsten Speichern fest ein, bis dahin gilt
er eben so.

Nachsehen lässt sich das an `/.netlify/functions/status`: dort steht je
Position `seit`, `abstand`, `beruehrt_am` und `aktiv` — also auch, *warum*
etwas als aktiv gilt.

Verglichen wird **auf den Tag**, nicht auf die Sekunde: eine Tageskerze trägt
den Zeitpunkt der Eröffnung, die Zone kann am selben Tag später erreicht
worden sein. Wer morgens eine Position anlegt, deren Kurs mittags in die Zone
läuft, bekommt das mitgezählt.

`aktiv-test` stellt Yahoo mit festen Kerzen — ein Tief bei 48,00 vor drei
Wochen, sonst 56,00 — und lässt nur den Zeitpunkt wandern: eben angelegt →
nicht aktiv; einen Monat dabei → aktiv; Zone geändert → wieder von vorne; nur
den Namen geändert → bleibt stehen; heute in die Zone gelaufen → zählt sofort;
ohne `seit` und ohne NEU → voller Rückblick, auch nach dem Speichern; ohne
`seit`, aber mit NEU → greift sofort beim Lesen, und das Speichern schreibt es
fest. 26 Prüfungen; gegen den alten Stand fallen sieben durch, mit genau der
Ausgabe vom Screenshot (`abstand: 7.66`, `beruehrt_am: "2026-07-11"`,
`aktiv: true`).

## Wirtschaftstermine

Das Laufband über den Karten: US-Termine mit hoher Wirkung — CPI, Core PCE,
FOMC, Arbeitsmarkt, PPI, Einzelhandel, BIP, ISM. Drei Tage zurück, zehn nach
vorn, höchstens zwölf Einträge.

Zwei Quellen, weil keine allein alles hat:

| | |
|---|---|
| **ForexFactory** (`ff_calendar_thisweek.json`) | Termin, Prognose, Vorwert — und `actual`, sobald veröffentlicht |
| **FRED** (St. Louis Fed) | der amtliche Wert, meist Minuten nach der Veröffentlichung; braucht `FRED_KEY` |

FRED deckt nur 13 fest zugeordnete Reihen ab — eine falsche Zahl wäre
schlimmer als gar keine. Alles andere lebt vom `actual` aus dem Feed.

### Der eingefrorene Zeitstempel

**Befund:** „Wirtschaftstermine haben keine aktuellen Zahlen, obwohl sie schon
passiert sind."

Die Quelle drosselt (HTTP 429), wenn jeder Seitenaufruf bei ihr landet — also
liegt ein Blob-Speicher davor, höchstens ein Abruf je Viertelstunde. Nur:
geschrieben wurde immer mit dem **alten** Zeitstempel, auch nach einem frischen
Abruf:

```js
await schreiben(speicher, roh, werte, gespeichert ? gespeichert.zeit : jetzt);
//                                    ^ der Zeitpunkt von damals, nie "jetzt"
```

Damit wuchs `alter` unbegrenzt, die Viertelstunde griff nach dem allerersten
Mal nie wieder, und **jeder** Seitenaufruf ging an ForexFactory. Die drosselt
dann — und übrig blieb der gespeicherte Stand von vor Stunden, in dem `actual`
für alles, was seither veröffentlicht wurde, eben noch leer ist. Die 13
FRED-Reihen füllten sich weiter, der Rest blieb auf „Aktuell –" stehen. Genau
das Bild, das gemeldet wurde.

Der Zeitpunkt wird jetzt nachgezogen, wenn der Terminplan wirklich neu geholt
wurde (`planZeit`), und beim reinen FRED-Nachschlag stehen gelassen — dafür
war die alte Zeile ja gedacht. Dazu wird auch dann geschrieben, wenn nur der
Plan neu ist und FRED nichts beizutragen hatte; sonst bliebe der frische Plan
ungespeichert und der nächste Aufruf holte ihn wieder.

`alter_min` in der Antwort zeigt es an: nach einem frischen Abruf **0**,
vorher eine Zahl, die immer weiter wuchs.

`kalender-test` stellt die Quelle und misst die Abrufe: zwölf Aufrufe → ein
Abruf; Viertelstunde zurückgedreht → ein zweiter, und das Ergebnis erscheint;
danach fünf weitere Aufrufe → immer noch zwei. Gegen den alten Stand zeigt sie
`alter_min: 16` statt 0 und **sieben** Abrufe statt zwei.

Zum Nachsehen gibt es weiterhin `?pruef=1` (was je Termin gefragt wurde und
woran es scheitert) und `?roh=1` (der erste unveränderte Datensatz, falls die
Quelle ihre Feldnamen ändert).

## Runder und ruhiger

Die Handschrift bleibt — Haarlinien, viel Weiss, gesperrte Versalien —, aber
drei Dinge waren aus der Zeit gefallen.

### Radien nach Rolle, nicht nach Gewohnheit

Überall standen dieselben **2 Pixel**: hart, technisch, ohne Zugeständnis. Das
war einmal eine Haltung und ist heute nur noch alt. Weichere Ecken lesen sich
ruhiger — aber nicht überall gleich weich, sonst wird aus einem Abzeichen ein
Tropfen. Also sechs Marken, nach Rolle vergeben:

| | | |
|---|---|---|
| `--r-blatt` | 22 px | Blätter und Schirme, die von unten hereinfahren |
| `--r-karte` | 16 px | Karten und Kästen |
| `--r-bild` | 12 px | Bilder in Meldungen und Beiträgen |
| `--r-feld` | 12 px | Knöpfe und Eingaben |
| `--r-chip` | 11 px | die Symboltasten |
| `--r-marke` | 6 px | Abzeichen, Punkte, Zähler |

32 Stellen in `index.html`, 23 auf den anderen drei Seiten — keine davon
einzeln zurechtgeschoben, alle über die Marke.

### Eine Hebung unter der Haarlinie

Die Haarlinie bleibt die Handschrift: sie zeichnet die Kante. Darunter liegt
jetzt ein Schatten, den man nicht als Schatten bemerkt — er hebt die Karte vom
Grund, ohne sie schweben zu lassen. **Zwei Lagen**, weil eine einzelne
entweder zu hart am Rand sitzt oder zu weit ausfranst:

```css
--hebung:
  0 1px 2px rgba(var(--fg-rgb), 0.045),
  0 10px 28px -18px rgba(var(--fg-rgb), 0.12);
```

Im dunklen Anstrich trägt ein heller Schatten nichts — der Grund ist schon
schwarz. Dort arbeitet vor allem die Linie, der Schatten nur noch als Saum.

Der Ring beim Sprung aus dem Menü kommt **zur** Hebung dazu, statt sie zu
ersetzen: sonst fiele die Karte für den Moment des Sprungs flach auf den
Grund. Genau daran hat `scroll-test` angeschlagen — es prüfte „danach ist kein
Ring mehr da" gegen `box-shadow: none`, und das stimmt nicht mehr: „kein Ring"
heißt jetzt „wieder der Schatten von vorher". Die Reihe misst deshalb gegen
eine Karte, die gerade nicht angesprungen ist.

### Ziffern, die nicht wackeln

In der Grundschrift ist die 1 schmaler als die 8. Untereinander stehende Kurse
wackeln dadurch, und beim Aktualisieren springt die Zeile, weil aus 51,71 eben
48,03 wird. `font-variant-numeric: tabular-nums` gibt allen Ziffern dieselbe
Breite: die Zahl ändert sich, ihr Platz nicht. Gesetzt an Ziel und Umrechnung,
am Fear-&-Greed-Wert, an den Wirtschaftsterminen, am Setup-Streifen und an den
Zeitangaben in der Glocke.

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


## Glas

Flächen, die über etwas liegen, sind nicht mehr deckend: die Symboltasten,
die Blätter, der Streifen unten, der Neuheiten-Schirm und der Anmeldekasten.
Vier Teile machen aus Milchglas Glas:

| | |
|---|---|
| **Frost** | `saturate(210%) blur(28px)` — die Sättigung muss hoch, sonst wird alles dahinter grau statt farbig verwischt |
| **Füllung** | eine helle Schicht darauf, sonst wäre Schrift auf bewegtem Grund nicht zu lesen |
| **Kante** | vier Linien: eine helle oben, eine kühle darunter, eine weiche Wölbung knapp innerhalb des Randes, eine warme dunkle unten |
| **Schimmer** | ein schräger Glanz über die obere Hälfte, als zweite Hintergrundebene |

### Der Glanz, der zwei Runden lang nirgends ankam

Im Stylesheet stand eine Klasse `.glas` mit allen vier Bausteinen. Getragen hat
sie **kein einziges Element**. Die vier Flächen in der Liste hatten sich Frost,
Füllung und Kante einzeln geholt — und dabei den Schimmer vergessen. Nur der
Anmeldekasten hatte ihn, über ein eigenes `::before`. Es war Milchglas, kein
Glas, und niemand sah, woran es lag.

Jetzt liegt der Schimmer in `--glas-grund` (bzw. `--glas-grund-fest`), zusammen
mit der Füllung, als zwei Hintergrundebenen:

```css
--glas-grund:
  var(--glas-schimmer),
  linear-gradient(var(--glas-fuellung), var(--glas-fuellung));
```

Die Füllung muss als Verlauf geschrieben werden, weil eine Farbe in
`background` nur als letzte Angabe stehen darf — und dann unter allen Ebenen
läge.

Ein Hintergrund statt eines `::before` ist hier nicht nur kürzer, sondern der
einzige Weg, der bei den beiden Flächen funktioniert, die **innen scrollen**
(`.sheet-card`, `.neuheit-mitte`): ein absolut gesetztes Kind scrollt mit dem
Inhalt weg, ein Hintergrund bleibt am Rahmen des Elements stehen. Die
Prüfreihe rollt ein Blatt bis zum Anschlag und sieht nach, dass die
`background-position` dieselbe geblieben ist.

### Wölbung und Farbstich

Zwei Zutaten sind an der Kante dazugekommen, beide aus derselben Ecke wie der
Rest:

**Wölbung** — ein weicher dunkler Ring knapp innerhalb des Randes
(`inset 0 0 14px -6px`). Ohne ihn ist die Fläche eine Folie; mit ihm hat sie
Dicke. Licht, das durch eine Scheibe fällt, wird am Rand schräger gebrochen und
kommt dort dunkler an.

**Farbstich** — die helle Linie oben zieht ins Kühle (`214, 233, 255`), die
dunkle unten ins Warme (`78, 60, 38`). Das ist die sehr abgeschwächte Fassung
dessen, was an einer echten Linsenkante passiert: die Farben laufen
auseinander. Sichtbar wird nur, dass der Rand lebt statt grau zu sein.

### Was Glas braucht, um Glas zu sein

**Etwas dahinter, und zwar Farbe.** Über flachem `#fafafa` bleibt jedes Glas
ein hellerer Balken — man sieht ja nichts durch. Ein grauer Kursverlauf allein
reichte auch nicht: grau auf fast weiß verwischt der Frost zu nichts. Was Glas
zeigen kann, ist Farbe.

Farbe allein reicht aber auch nicht. Ein Verlauf ist weich, und ein
20-Pixel-Blur über etwas Weichem ergibt wieder dasselbe Weiche. Sichtbar wird
Glas an **Kanten** — Formen mit hohem örtlichem Kontrast, die beim Verwischen
zu erkennbaren Flecken zerlaufen. Auf den Vorlagen aus dem Netz ist das ein
Foto.

Unter der ganzen Liste liegen deshalb **vier große, sehr weiche Farbfelder** in
gedeckten Tönen — Indigo oben links, Sand oben rechts, Pflaume unten rechts,
Petrol unten links — und darüber, als Prägung, **drei große Kurslinien**
(`grund.py`): ein feiner Strich und darunter eine sehr blasse Fläche, die nach
unten ausblendet. Der Strich liefert die Kante, die das Glas braucht, die
Fläche gibt Tiefe. Alles in einem einzigen festen Element mit mehreren
Hintergrundebenen.

Der erste Anlauf war etwas anderes: fünf Lagen bunter Kerzen, ganzflächig.
Kanten hatte er reichlich — aber viele kleine Blöcke in vier kräftigen Farben
sind laut, nicht edel. Drei ruhige Linien sagen dasselbe.

Die Lautstärke hängt an vier Zeilen — `--grund-kuehl`, `--grund-warm`,
`--grund-flieder`, `--grund-tuerkis`. Sie stehen in beiden HTML-Dateien gleich,
und `glanz-test` vergleicht sie, damit Liste und Anmeldeseite nicht
auseinanderdriften.

**Und die Bänder oben mussten aufmachen.** Kopf, Laufstreifen und
Setup-Streifen waren deckende Platten quer über den oberen Bildrand — genau
dort, wo vom Grund am meisten zu sehen sein sollte, war nichts. Der Kopf trägt
jetzt Füllung und Schimmer (aber keinen Frost: hinter ihm liegt nur der Grund,
und der ist schon weich — ein Filter wäre dort reine Rechenzeit ohne Bild), die
beiden Streifen sind halbdurchsichtig.

**Zwei Dicken.** Die Symboltasten und der Streifen tragen Marken; dort darf
viel durchscheinen (`0.42`). Ein Blatt trägt Sätze, und hinter Sätzen soll
nichts stehen, das man mitliest (`0.66`).

### Glänzende Karten

Der Schimmer allein ist ein weicher Wisch von hell nach nichts — das ist mattes
Glas. Was eine Scheibe glänzen lässt, ist nicht *mehr* Licht, sondern
schärferes: ein schmaler Streifen mit einer Kante daran. Ein breiter Verlauf hat
keine Kante, und ohne Kante sieht das Auge kein Licht, sondern nur eine hellere
Fläche.

`--glas-glanz-karte` hat deshalb fünf Ebenen statt zwei, jede mit einem Grund
aus der Wirklichkeit:

| Ebene | wofür |
|---|---|
| schmaler Lichtstreifen, 148° | harter Anstieg, weicher Abfall — so fällt Licht auf eine glatte Fläche |
| Hotspot oben links | eine Kante ist nie ganz scharf; wo sie sich rundet, bündelt sie |
| Rückwurf von unten | ohne ihn endet die Scheibe im Nichts statt dick zu wirken |
| Schimmer | der breite Wisch von vorher, jetzt als Unterlage |
| Füllung | trägt die Schrift |

`--glas-kante-glanz` legt Licht ringsum statt nur oben: hell an der Oberkante,
ein Hauch an den Seiten, unten der dunkle Abschluss, der die Dicke macht.

### Der Schleier, der aufhellte statt abzudunkeln

„Mitteilungen sind nicht sichtbar." Das Meldungsblatt stand da, und die Seite
dahinter leuchtete hindurch — Symboltasten, Laufband, Fear & Greed, alles lag
über den Sätzen.

Die Ursache ist eine Nebenwirkung der Umstellung auf Dunkel, und sie ist
lehrreich:

```css
.sheet { background: rgba(var(--fg-rgb), 0.32); }
```

Auf der hellen Seite war `--fg` fast **schwarz** — ein Schleier, der abdunkelt.
Mit dem dunklen Thema ist `--fg` fast **weiß** geworden, und aus dem Schleier
wurde ein Aufheller. Dieselbe Zeile, gegenteilige Wirkung. Eine Marke, die ihre
Rolle wechselt, nimmt jede Stelle mit, die sich auf ihre *Helligkeit* verlässt
statt auf ihre *Bedeutung*.

Behoben: `var(--schleier)` (schwarz, 0,72), und unter das Glas des Blattes eine
deckende dunkle Lage — **auf Dunkel deckt Dunkel**, dieselbe Regel wie beim
Ladebildschirm über den Kerzen. Schimmer, Kante und Frost bleiben obenauf; das
Blatt ist weiterhin Glas. Der Schatten nach oben ist ebenfalls dunkel geworden:
ein heller Schein auf dunklem Grund wäre ein Leuchten, kein Schatten.

**Wie es gemessen wird.** Nicht über die Helligkeitsspanne im Blatt — die kommt
zum großen Teil vom Schimmer des Blattes selbst, und der soll da sein. Die
richtige Frage ist: *ändert sich das Blatt, wenn sich die Seite dahinter
ändert?* Dieselbe Fläche zweimal aufnehmen, dazwischen die Seite dahinter an
eine ganz andere Stelle fahren:

| | vorher | jetzt |
|---|---|---|
| Kontrast unter der Schrift | — | **7,71 : 1** |
| Durchscheinen, im Mittel | sichtbar | **0** |
| an der hellsten Stelle | sichtbar | **1** |

`blatt-test` wacht darüber.

### Der Ladebildschirm ist dieselbe Fläche wie die Liste

Nicht „sieht aus wie", sondern **ist**: `--grund-flaeche` und `--grund-kacheln`
stehen einmal da und gelten für `.grundkurve` wie für `.auftakt`. Beide liegen
`fixed` über den ganzen Schirm, also decken sich auch die Verläufe und die
Körnung Punkt für Punkt.

Vorher stand der Grund **zweimal** im Stylesheet. Zwei Stellen, die dasselbe
beschreiben, laufen auseinander, sobald eine angefasst wird — und der
Ladebildschirm ist genau die Stelle, an der ein Unterschied auffällt, weil er
unmittelbar in die Liste übergeht.

**Die Kerzen sind weg.** Sie waren das Einzige, was den Ladebildschirm von der
Liste unterschieden hat: eine bewegte Zeichnung, die es danach nirgends mehr
gibt — der erste Eindruck war eine andere App als die, die dann kam. Das
Element bleibt im Markup (`display: none`), denn es wird später in den
Neuheiten-Schirm und in die Browsersperre **verschoben**, nicht kopiert.

Damit fällt auch der Grund für die dunkle Lage unter der Textscheibe weg — sie
war gegen die laufenden Kerzen. Die Scheibe trägt jetzt denselben Glanz und
dieselbe Kante wie eine Karte.

### Vier Sekunden Liquid, laut und im Vollbild

Rückmeldung: „Ladebildschirm edles lautes Liquid Glass, 4 Sekunden." Der
Ladebildschirm war bis dahin eine Überbrückung — **900 ms** Mindestdauer, gerade
genug, damit es nicht zuckt. Jetzt ist er ein Auftritt.

**Die Dauer.** `MINDESTENS` steht auf **4000 ms**, die obere Grenze auf 5200 (sie
muss über den vier Sekunden liegen, sonst schneidet sie den Auftritt ab) und der
Notausgang ganz oben auf 7000. Der Preis ist ehrlich zu nennen: liegt alles im
Zwischenspeicher, wartet man jetzt länger als vorher. Das ist der Handel.

**Der Balken zeigt den kleineren von zwei Werten** — was geladen ist und wie viel
von den vier Sekunden herum ist. Nur nach Schritten wäre er nach zwei Sekunden
voll und stünde dann still: ein Hänger, kein Auftritt. Nur nach der Zeit wäre er
eine Lüge. So ist er genau dann voll, wenn der Deckel abgeht.

**Was sich bewegt.** Ein erster Anlauf hielt sich an der Scheibe fest — ein
Lichtzug von 133 px auf einem Schirm von 390. Zu leise. Jetzt Vollbild:

| | |
|---|---|
| drei Farbfelder | Blau, Bernstein, Flieder — kräftig statt geahnt, weit statt kaum, 4 s statt 73 |
| eine Flut | ein Puls aus der Mitte nach außen, zweimal |
| ein Lichtzug | über den ganzen Schirm, über die Scheibe mit, zweimal |
| die Scheibe | aus 0,94 herein, mit einem Hauch Überschwung |
| ein Kantenlicht | läuft zweimal um den Rand der Scheibe |

**Alles Laute liegt auf einer eigenen Lage**, die in der letzten Sekunde
zerfällt. Ohne diese Trennung wäre der Übergang ein Sprung: oben kräftige
Farben, darunter die geahnten der Liste, und im Moment des Abnehmens würde es
sichtbar dunkler. Was zurückbleibt, ist der Grund der Liste, unverändert —
`uebergang-test` misst weiterhin an sechs Punkten dieselben Werte vor und nach
dem Übergang.

**Das Kantenlicht ist ein gedrehtes Quadrat, kein gedrehter Verlauf.** Naheliegend
wäre ein `conic-gradient`, dessen Anfangswinkel wandert — das zeichnet die
Scheibe bei jedem Bild neu. Ob das teuer ist, war hier **nicht feststellbar**:
der Ladebildschirm rauscht mit 78 ms, die fertige Liste noch mit 27, und der
gesuchte Unterschied liegt darunter. Was man nicht messen kann, baut man besser
nicht ein. Stattdessen ein Quadrat mit festem Verlauf, das sich dreht —
quadratisch, damit die Drehung keine Kante ins Bild bringt, per `transform`,
damit nichts neu gezeichnet wird. Eine Maske schneidet den 1 px breiten Rand
heraus. Danach: **2,5 ms bei 42 ms Rauschen**, also unter der Nachweisgrenze.

Ein Fehler dabei, der fast durchgegangen wäre: die Messung hängte eine Scheibe
ein, in der das Kantenlicht **fehlte** — gemessen wurden zwei Bewegungen statt
drei, und ausgerechnet die, deretwegen gemessen wurde, war nicht dabei.

### Der Einzug: was unter dem Deckel lag, kommt herein

Rückmeldung: „Übergang vom Laden zur App laut, Karten und so weiter, flüssig,
liquid, laute Animation." Der Übergang war bis dahin **halb**: der Deckel löste
sich auf, und darunter stand alles schon fertig da. Das war sogar Absicht — „was
danach kommt, war die ganze Zeit an derselben Stelle". Nur sieht das nach Schnitt
aus, nicht nach Bewegung: vier Sekunden Glas, und dann ist auf einmal alles da.

Jetzt kommen die Blöcke gestaffelt herein — Kopf, Kürzel, Banner, Termine,
Setup-Streifen, Fear & Greed, und dann Karte für Karte. Von unten, leicht
kleiner, mit einer Kurve, die überschwingt: etwas, das ankommt und sich setzt,
nicht etwas, das eingeblendet wird.

**Die Staffel ist der eigentliche Trick.** Alle zugleich wären ein Block, der
sich bewegt; nacheinander wird daraus ein Zug, der durch die Seite läuft. 55 ms
Abstand, fünfzehn Elemente.

Die Nummer steht als `--n` am Element, nicht als `nth-child` im Stylesheet: die
Zahl der Karten steht erst zur Laufzeit fest, und Blöcke können ausgeblendet sein
(der Wirtschaftskasten ist es oft). Gezählt wird deshalb, was **wirklich zu sehen
ist**. Zuerst standen dort alle Kinder von `#app` — darin sind aber der
Kartenbehälter und der Fuß, die gar nicht mitfahren. Sie hätten Nummern
verbraucht, und der Zug hätte an ihrer Stelle Lücken gehabt. `einzug-test` prüft
genau das: lückenlos von 0 hoch, jede Nummer nur einmal.

**Und ein Licht läuft mit hinunter.** Eine Wellenfront über die ganze Seite — im
Ladebildschirm ging das Licht quer, hier läuft es der Staffel hinterher nach
unten. Damit ist der Übergang *eine* Bewegung und nicht zwei. Der erste Anlauf
lief weich aus und war im Bild kaum zu finden; jetzt steht die Spitze schmal und
hell kurz vor der Unterkante und fällt dahinter fast senkrecht ab. So liest es
sich als Kante, die durchs Bild läuft — und eine Kante sieht man.

**Ausgelöst wird der Einzug in demselben Bild, in dem der Deckel zu gehen
beginnt.** Nacheinander wären es zwei Bewegungen. `einzug-test` prüft, dass der
Auftakt in diesem Moment noch da ist *und* schon `.weg` trägt.

**Aufgeräumt wird hinterher**: Klasse, Nummern und Lichtband verschwinden, sobald
die Bewegung durch ist. Bliebe die Klasse stehen, würde jede später gebaute Karte
noch einmal hereinfahren — auch das steht als Prüfung drin.

**Der Übergang.** Die Scheibe geht zuerst und schneller als der Schirm um sie
herum: sie hebt sich 12 px ab, wird auf 0,97 kleiner und löst sich auf. Kein
Schirm, der weggeschoben wird, sondern ein Deckel, der abgenommen wird — was
danach kommt, war die ganze Zeit an derselben Stelle.

Gemessen an sechs Punkten, an denen nie etwas steht (die vier Ecken und die
beiden 14-px-Seitenstreifen), vor, mitten im und nach dem Übergang:

```
vorher  21,33,39  31,28,22  16,31,28  23,21,26  17,20,19  16,19,18
mitten  20,32,39  30,27,21  14,29,26  21,19,24  16,19,19  15,19,17
nachher 21,33,39  31,28,22  15,30,27  22,20,25  17,20,19  16,19,18
```

Der Grund steht still. `uebergang-test` wacht darüber.

Zwei falsche Alarme auf dem Weg dahin, beide lehrreich: beim ersten Anlauf fuhr
das **Installations-Blatt** genau während des Übergangs herein und übernahm die
Ecken; beim zweiten lag ein Messpunkt oben in der Mitte — also **auf der
Kopfkarte**. Beide Male meldete die Messung pflichtgemäß eine Änderung, und
beide Male hatte sich nicht der Grund geändert, sondern die Stelle war falsch
gewählt.

### Der oberste Kasten: Zeichen und Name

Rückmeldung: „Obersten Kasten bearbeiten, App-Symbol aber bewegend modern,
Symbol und nur Name, Symbol live bewegend Liquid App-Logo." Und danach, kürzer:
„Ohne App-Kasten, die Kerzen liquid bewegen, live durchgängig, edel."

**Vier Zeilen sind entfallen.** Über der ersten Position standen „Watchlist", der
Name, „Live-Charts · Technische Analyse", eine Trennlinie und die Verfasserzeile
mit Monat — rund 115 Pixel, und keine davon sagte etwas, das man nach dem zweiten
Öffnen noch braucht. Geblieben ist eine Zeile: **Zeichen und Name.** Verfasser
und Monat stehen weiterhin im Fuß, wo sie hingehören.

**Drei Anläufe für das Zeichen**, und die ersten zwei waren falsch:

1. **Ein erfundenes Zeichen** — eine Kachel mit drehendem Farbverlauf. Sah aus
   wie Liquid Glass und hatte mit dieser App nichts zu tun. Die Rückmeldung
   darauf war kurz und richtig: „Das ist nicht das App-Logo."
2. **Das Symbol als Bild** (`icon-192.png`) — richtig, aber mitsamt seiner
   Kachel. Die Kachel ist die Fassung für den Home-Bildschirm; hier braucht es
   sie nicht.
3. **Die Kerzen selbst**, als Inline-SVG, ohne Kasten. Dieselben Maße wie in
   `logo.py` (`KOERPER` 66, `LUECKE` 24, `DOCHT` 24, `KANTE` 18 auf 512), damit
   hier und auf dem Home-Bildschirm dasselbe steht — steigende hohl, fallende
   gefüllt.

**Und sie leben** — als Welle, die durch die vier Kerzen läuft. Dieselbe
Bewegung, nur zeitversetzt gestartet (negative `animation-delay`). Das ist das
Flüssige daran: nicht vier Dinge, die zappeln, sondern eine Bewegung, die
durchgeht. Die vier Zeiten (4,6 / 5,1 / 5,6 / 6,1 s) bleiben verschieden, damit
die Welle nie exakt dasselbe Bild wiederholt.

Bewegt wird nur `transform`, und der Bezug ist die Form selbst
(`transform-box: fill-box`) — ohne das drehte sich alles um die Ecke des
Bildes statt um die eigene Mitte. Gerechnet wird in **Einheiten des Bildes**,
nicht in Prozent: Prozent bezöge sich auf die eigene Höhe jeder Kerze, und die
ist bei jeder anders — die kurze hätte sich kaum gerührt, die lange weit.

**Zwei Fehlversuche bei der Bewegung selbst**, beide lehrreich:

*Zu leise.* Der erste Anlauf war `scaleY` von 1 auf 0,82 über 7,3 Sekunden. Auf
einem Zeichen von 38 Pixeln sind das **zwei Pixel in sieben Sekunden**. Die
Rückmeldung war „Es bewegt sich nicht" — und sie stimmte. Der Test war trotzdem
grün: er verglich zwei `transform`-Werte und fand sie verschieden. **Verschieden
ist nicht sichtbar.** `marke-test` misst jetzt Bildpunkte — die Kerze wird über
ihren Umlauf abgetastet, und zwischen höchster und tiefster Lage müssen
mindestens fünf Punkte liegen.

*Zu verzerrt.* Der zweite ging auf `scaleY` 1,34 ↔ 0,68 — sichtbar, aber die
Kerzen wurden dabei zu Klumpen, und das Zeichen war keins mehr.

**Die Lösung war, die Bewegung von der Verzerrung zu trennen** — und danach das
Maß in drei Anläufen zu finden:

| Hub | Rückmeldung |
|---|---|
| 2 px | „Es bewegt sich nicht." Richtig. |
| 9,8 px | sichtbar, aber noch zaghaft — „lauter, viel lauter" |
| 28,2 px | zu unruhig. Ein Zeichen, das hüpft, sieht nicht teuer aus, sondern unfertig |
| **17,6 px** | man sieht es, ohne dass es einen anspringt |

Dazu **langsamer**: 5,2–7,0 s je Umlauf statt 3,1–4,3. Edel heißt hier *langsam
und weit*, nicht *schnell und weit* — die Strecke trägt die Bewegung, das Tempo
trägt die Haltung. Die Verzerrung bleibt in allen Fassungen moderat (`scaleY`
1,18 ↔ 0,85), und genau deshalb bleibt die Form eine Kerze.

`marke-test` hat deshalb jetzt **zwei** Schranken statt einer: mindestens 12 px
Hub, damit „bewegt sich nicht" nicht zurückkommt, und höchstens 22 px, damit
„zu unruhig" nicht zurückkommt. Dazu mindestens 4,5 s je Umlauf.

### Die erste Karte fängt an der Kante an

Beim Öffnen schaute sie unten schon herein — ein Streifen Kartenkopf unter dem
Fear-&-Greed-Kasten. Das liest sich nicht als „hier geht es weiter", sondern als
abgeschnitten.

Alles über der Liste steckt jetzt in einer Hülle (`.erste-seite`) mit
`min-height: 100svh`. Damit fängt die erste Karte genau an der unteren Kante an:
sichtbar wird sie erst beim Scrollen. **Kein fester Abstand** — die Höhe kommt vom
Bildschirm, also stimmt sie auf jedem Gerät. Auf 844, 667 und 932 Pixeln gemessen:
Kartenkante immer bei Schirmhöhe + 80 px.

`svh` und nicht `vh`: `vh` rechnet mit dem Bildschirm *ohne* Browserleisten und
ist im Browser deshalb zu groß — dort schöbe es die Karte unnötig weit weg. `svh`
ist die kleinste sichere Höhe; in der App als eigenes Fenster sind beide gleich.

**Ein Testfehler beim Bauen:** die Schranke „nicht unnötig hoch" lag bei 40 px,
gemessen waren es 80. Das ist kein Leerlauf, sondern der normale Abstand der Liste
(`--luft`) plus der Außenabstand der Karte — derselbe, der zwischen allen Karten
steht. Ein Wert, der auf drei Schirmhöhen konstant ist, ist eine Eigenschaft und
kein Fehler.

### Kein Laufband, kein Aushang

Im Nachrichtenband lief der Text von rechts nach links durch, in vier Kopien
hintereinander. Zwei Dinge stimmten daran nicht:

- **Man konnte ihn nie ganz lesen.** An beiden Rändern abgeschnitten, und wer den
  Anfang verpasst hatte, wartete 38 Sekunden. Auf dem Gerät stand meist ein
  Fragment wie „…OBLEM · PDF HERUNTERLADEN".
- **Er stand fest verdrahtet im Markup** — „Neu — Energie-These · PDF
  herunterladen" — und damit auch dann noch da, wenn der Beitrag längst nicht mehr
  neu war. Ein Aushang, den niemand abnimmt.

**Der Text steht jetzt still und ganz da**, über zwei Zeilen wenn nötig. Bewegt
wird das Licht: ein Zug geht darüber hinweg, dieselbe Machart wie über dem
Ladebildschirm und der Symbolscheibe — 7,4 s Umlauf, davon 1,6 s Bewegung und der
Rest Ruhe. Ohne die Pause wäre es ein Blinken.

**Und der feste Aushang ist weg.** Das Band zeigt nur noch, was wirklich neu ist,
und ist sonst gar nicht da (`hidden`). Der Beitrag bleibt über den Knopf im Fuß
erreichbar.

**Zwei Folgefehler, die der Umbau ausgelöst hätte:**

1. **`on-publish.js` liest den Bandtext per Ausdruck** aus der ausgelieferten
   Datei — er erwartete den `<span>` direkt hinter der Spur. Seit dort der Lichtzug
   als `<i>` davorsteht, traf er nicht mehr, und die Meldung beim Veröffentlichen
   wäre **still ohne Text** rausgegangen.
2. **`bandSetzen()` baute vier Kopien** für die nahtlose Laufschrift. Ohne
   Laufschrift genügt eine — und der Lichtzug darf beim Austauschen des Textes
   nicht mitgelöscht werden.

### Die Knöpfe im Kopf tragen dasselbe Glas

Rückmeldung: „Meldungen-Button sollte gleichen Liquid-Stil haben." Stimmte —
`Meldungen`, `Verwaltung`, `App installieren` und `Benachrichtigungen` hatten
einen **harten weißen Rahmen auf gar keiner Fläche** (`border: 1px solid
var(--fg)`), während ringsum alles aus Glas ist. Ein Rest aus der Zeit vor dem
Umbau — und ausgerechnet in der ersten Zeile der Seite.

Jetzt dieselbe Machart wie die Symboltasten: durchsichtiges Fenster,
Haarlinie (`--line`) statt weißem Strich, Lichtkante obenauf. Gedrückt bleibt es
deutlich — gefüllt, nicht nur eingedrückt —, und dann fällt die Lichtkante weg:
was gefüllt ist, fängt kein Licht mehr, sondern gibt es ab.

`kopfknopf-test` prüft **gegen die Symboltaste, nicht gegen feste Werte**: Fläche,
Randfarbe, Randbreite und Lichtkante müssen übereinstimmen. Ändert sich die
Marke, ändern sich beide — der Test kann nicht veralten.

### Der Name gehört in den Kopf

Beim Aufräumen war er mitgegangen — die alte Verfasserzeile trug den Monat und
hatte eine Trennlinie über sich, und mit ihr fiel auch der Name weg. Das war zu
viel des Aufräumens. Er steht jetzt allein unter dem Titel: kleiner Grad, weiter
Satz, gedeckte Farbe. **Der Monat bleibt im Fuß** — er gehört nicht in den Kopf,
und `monat-test` prüft weiterhin, dass er genau einmal auf der Seite steht.

Die Kerzen ragen dabei absichtlich über ihren Kasten hinaus (`overflow: visible`) —
sonst wären sie mitten in der Bewegung abgeschnitten. `marke-test` tastet den
ganzen Umlauf ab und prüft, dass sie dabei nichts anfassen: nicht den Namen
daneben, nicht die Knopfreihe darunter (10 px Luft), nicht den Rand des Kastens.

**Der Preis:** vier Dauerläufer mehr, also fünfzehn statt elf. Sie sind so
billig, wie eine Bewegung sein kann — vier kleine SVG-Formen auf zusammen 43 × 38
Pixeln, kein `opacity`, keine Füllung, die sich ändert. Der Beleg steht in
derselben Testreihe: „im Ruhezustand läuft es rund" und „Scrollen bleibt flüssig"
sind mit ihnen grün geblieben. Das ist die Messung, der hier zu trauen ist — sie
hat einen Grundwert, der stimmt, und eine Lastschranke davor. Eigene
Kleinmessungen an einzelnen Bewegungen haben in dieser Sitzung dreimal mehr
gerauscht als gemessen.

**Zwei Testreihen mussten mit.** `monat-test` erwartete den Monat an zwei Stellen
— jetzt ist es eine. Und `lauf-test` maß die Parallaxe des Kopfes bei festen 100,
200 und 300 Pixeln; das ging gut, solange der Kopf 280 Pixel hoch war. Beim
kürzeren Kopf war die Parallaxe bei 300 längst am Anschlag, und der Test meldete
„die Strecke ist ungleichmäßig" — ungleichmäßig war nicht die Strecke, sondern
die Wahl der Punkte. Gemessen wird jetzt bei einem Viertel, der Hälfte und drei
Vierteln **der Kopfhöhe**.

**Und ein Rundungsfehler, zum zweiten Mal.** Der rohe Größenriegel rundete vor
dem Vergleich: bei 319,76 kB stand da 320, und die Prüfung gegen 320 fiel durch,
obwohl die Datei darunter lag. Genau derselbe Fehler war beim gzip-Deckel schon
einmal behoben worden — eine Zeile weiter unten stand er noch.

### Das Logo neben dem Namen

Links vom Firmennamen sitzt das Logo auf einer runden Glasscheibe — dieselbe
Machart wie die Symboltasten, nur rund. Ohne die Scheibe stünde ein fremdes Bild
ohne Übergang auf dem Glas: die meisten Logos kommen mit weißem oder
durchsichtigem Grund, und beides sieht auf einer dunklen Fläche nach Ausschnitt
aus, nicht nach Zugehörigkeit. `object-fit: contain` bei fester Größe, damit ein
breites Wortlogo und ein quadratisches Zeichen gleich viel Platz einnehmen.

**Das Logo ist ein Zusatz, kein Träger.** Das Bild hängt erst dann im Kasten,
wenn es *geladen* ist — ein `<img>`, das nichts findet, hinterlässt sonst das
Symbol für ein kaputtes Bild.

### Ein Zeichen, wenn kein Bild kommt

Rückmeldung vom Gerät: „Manche Symbole haben kein Logo." Das stimmte, und es war
kein Ausfall, sondern Bauart. Gold, Silber und Bitcoin **haben** kein
Firmenlogo, und keine Quelle kennt jede Firma. Bis dahin blieb die Karte dann
einfach leer und der Name rückte an die Innenkante — neben Karten mit Logo sieht
das nach Ladefehler aus, nicht nach Absicht. Von zehn Positionen der Startliste
sind drei per Definition ohne Bild.

Jetzt trägt **jede** Karte dieselbe Scheibe. Kommt ein Bild, steht es darauf;
kommt keins, steht das Kürzel darauf:

| | |
|---|---|
| `GC=F` `SI=F` `HG=F` | Au, Ag, Cu |
| `CL=F` `NG=F` `ZC=F` | Öl, Gas, Korn |
| `BTC-USD` `ETH-USD` | ₿, Ξ |
| `^…` | die ersten Zeichen des Index |
| sonst | die ersten zwei Buchstaben des Kürzels |

Die Scheibe steht **sofort** da, nicht erst nach dem Laden. Damit springt die
Zeile nicht mehr, wenn ein Logo nachträglich eintrifft — vorher rückte der Name
in dem Moment um 40 Pixel nach rechts. `logo-test` prüft jetzt genau das
Gegenteil von früher: dass die Zeile mit und ohne Bild **identisch** steht.

Für diese Symbole fragt die Seite gar nicht erst an. Die `OHNE_LOGO`-Regel steht
dafür zweimal da — in der Function, um nicht zu suchen, und in `index.html`, um
nicht zu fragen. `logo-test` vergleicht die beiden Zeichen für Zeichen, damit sie
nicht auseinanderlaufen.

Eine Falle dabei: `loading="lazy"` an einem Bild, das noch nicht im Dokument
hängt. Ein aufgeschoben ladendes Bild wartet darauf, in den sichtbaren Bereich zu
kommen — und etwas, das nirgends steht, kommt dort nie an. Es wurde nie geladen,
und keine Karte bekam ein Logo.

**Zwei Wege zum Bild**, und der erste geht vor:

1. **Feld „Logo-Adresse" an der Position.** Eine https-Adresse, die du selbst
   einträgst. Das ist der Weg, der immer geht.
2. **`netlify/functions/logo.js`.** Fragt nacheinander bei mehreren
   schlüssellosen Quellen an, legt das Ergebnis in Blobs ab (vier Wochen; ein
   *Nicht*-Ergebnis nur sechs Stunden, sonst hängt eine Position wochenlang an
   einem Ausfall fest) und liefert es von dort aus.

Warum überhaupt eine Function statt eines `<img>` auf die fremde Adresse: der
Zwischenspeicher (sonst zehn Fremdabrufe bei jedem Blick auf die Liste), die
Rückfallkette — und **kein Fremder erfährt, wer hier zusieht**. Ein direktes
`<img>` schickt bei jedem Blick die IP des Geräts dorthin; so sieht die fremde
Quelle nur diesen Server, und den nur einmal je Symbol.

Rohstoffe und Indizes (`GC=F`, `SI=F`, `^…`, `…-USD`) haben kein Firmenlogo —
danach zu suchen wäre bei jedem Aufruf verschwendete Zeit. Sie stehen in
`OHNE_LOGO` und bekommen sofort ein 404.

**Die Kette, nachgeschärft.** `financialmodelingprep.com/image-stock/<KÜRZEL>.png`
steht jetzt vorn: die Adresse ist nach dem Kürzel benannt, so wie Yahoo es
schreibt — also genau das, was ankommt — und es ist dieselbe Stelle, von der die
Seite ohnehin ihre Kurse holt. **companiesmarketcap ist rausgeflogen:** die Seite
benennt ihre Bilder nach dem Firmennamen, nicht nach dem Kürzel, `…/128/AAPL.png`
konnte also nie etwas treffen. Eine Quelle, die von der Bauart her nicht antworten
kann, ist keine Rückfallebene, sondern nur Wartezeit vor der nächsten. Und weil
`BRK-B` oder `SAP.DE` jede Quelle anders schreibt, wird beides versucht: wie es
ankommt und auf den Teil vor dem Trennzeichen gekürzt.

**Warum hat *dieses* Symbol kein Logo?** `?pruef=1` an die Function hängen:

```
/.netlify/functions/logo?sym=NVO&pruef=1
```

Antwort ist eine Liste — jede Adresse mit Status, Typ, Größe und einem Urteil
(„Status nicht ok", „kein Bildtyp, den wir nehmen", „zu klein, vermutlich
Platzhalter", „brauchbar"). Ein 404 allein sagt nicht, ob die Quelle das Kürzel
nicht kennt, eine Fehlerseite als Bild ausliefert oder gar nicht erreichbar war.
Hier steht es. Öffentliche Adressen, kein Schlüssel, nichts Geheimes darin.

**Offen gesagt:** welche der Quellen wirklich liefert, konnte beim Bauen nicht
geprüft werden — die Entwicklungsumgebung lässt keine fremden Hosts durch
(403 am Proxy, für `assets.parqet.com` und `companiesmarketcap.com` nachgelesen
im Proxy-Protokoll). Genau deshalb gibt es `?pruef=1`: die Frage ist auf der
fertigen Seite in einem Klick zu beantworten. Deshalb eine Kette statt einer
Quelle, deshalb ein sauberes 404 statt eines kaputten Bildes, und deshalb das
Feld an der Position, das
unabhängig davon funktioniert.

### Etwas, das durch das Glas zu sehen ist

„Warum jetzt nur noch schwarz — klar, Schwarz behalten, aber ein Bild, das die
Glas-Optik zur Geltung bringt, das sich bewegt, aber die Karten nicht stört."

Genau das fehlte, und es steht sogar in der Vorlage: auf dem Sperrbildschirm
laufen **Kerzen** hinter dem Kasten — deshalb wirkt er dort wie Glas. Eine
Scheibe, hinter der nichts ist, sieht nicht aus wie Glas, sondern wie ein Loch.

Der erste Anlauf waren dieselben Kerzen unter der Liste, sehr blass und sehr
langsam. Das trug, aber es blieb eine Zeichnung — und eine Zeichnung, die sich
wiederholt: eine Kachel, die durchläuft, kommt irgendwann wieder. Auf die
Rückmeldung „edleres Live-Hintergrund" ist sie ganz weggefallen.

### Drei wandernde Lichtfelder

Was jetzt unter der Liste liegt, hat keine Form mehr, sondern nur noch Licht:
drei sehr große, sehr weiche Farbfelder, die langsam über den Schirm ziehen.

| | |
|---|---|
| Farben | gedecktes Blau, warmes Braun, Flieder — je ein `radial-gradient` |
| Umläufe | **73 s**, **101 s**, **139 s** |
| Bewegung | nur `translate3d`, `ease-in-out … alternate` |

Die drei Zeiten sind absichtlich teilerfremd. Zwei Felder mit 60 s und 120 s
stünden alle zwei Minuten wieder gleich; 73, 101 und 139 treffen sich erst nach
Tagen wieder. Es gibt damit kein Muster, das man wiedererkennt — genau das
unterscheidet Licht von einer Kachel.

**Keine Deckkraft.** Die Schwäche steckt in den Farben selbst (0,17 bis 0,20 im
Kern, auf 0 auslaufend), nicht in einem `opacity` an der Ebene. Das ist die
Lehre aus dem Kerzen-Anlauf: Deckkraft an einer bewegten Ebene zwingt den
Compositor, sie bei jedem Bild zu überblenden — damals 5 lange Bilder im
Stillstand statt 0. So gemessen: **0 lange Bilder**, Mittel 16 ms.

`.grundkurve` bekommt dafür `overflow: hidden`. Die Felder ragen absichtlich
über den Rand hinaus, damit nie eine Kante ins Bild kommt; ohne die Zeile
bekäme die Seite dadurch eine Rollfläche.

### Im Ladebildschirm steht das Licht still

Der Ladebildschirm liegt über der Liste und deckt damit auch deren Licht ab. Er
braucht die Felder also selbst — durchscheinen können sie nicht.

Zuerst liefen sie dort mit. Das kostet, und `auftaktlicht.mjs` rechnet nach: drei
bewegte Ebenen mehr kosten in vier Durchgängen **4,5 / 1,0 / 4,5 / 4,5 ms je
Bild** (sechsfach gedrosselt). Der Betrag schwankt, das Vorzeichen nicht —
sechs Ebenen waren in keinem Lauf schneller als drei. Und bezahlt wird genau in
den Sekunden, in denen die Liste gebaut wird und die ersten Charts laden.

Laufen müssen sie aber gar nicht. `ease-in-out` beginnt fast flach: nach sechs
Sekunden — länger liegt der Deckel nie — ist das große Feld rund **vier Pixel**
gewandert. Stillstehend zeigen sie dasselbe Bild wie die laufenden darunter.
`uebergang-test` misst das an sechs Punkten des Grundes und findet über den
ganzen Übergang keinen Unterschied.

**Wie diese Zahl zustande kam.** Der erste Vergleich sagte 1 ms, der zweite
4,5 — bei derselben Seite. Zwischen zwei Läufen rauscht mehr, als innerhalb
eines Laufs sichtbar wird. Deshalb misst `auftaktlicht.mjs` jede Aufstellung
**zweimal**: was drei Felder von drei Feldern trennt, ist der Nullwert, und erst
was darüber hinausgeht, ist ein Preis. Geprüft wird am Ende nur noch die
Richtung und eine weite Obergrenze — auf einen Betrag, der sich nicht
reproduzieren lässt, gehört kein Deckel.

### Kein weißer Rand mehr

Die aktive Karte hatte eine hellere Kante, die angesprungene einen Ring. Auf dem
Telefon ist das ein weißer Strich um eine **schirmfüllende** Fläche — eine
Einrahmung, keine Auskunft. Gesagt wird es weiterhin, nur an den kleinen
Zeichen: am Abzeichen *IN DER ZONE* und an der Symboltaste, die beide schlagen.
Beim Sprung hellt kurz die Lichtkante auf — dieselbe Kante, nur heller.

### Die Körnung war die Unschärfe

Dreimal hieß es „sieht nicht so scharf aus wie auf dem Bild", und dreimal habe
ich an der falschen Stelle gesucht: erst die Kante (die stimmte schon), dann die
Bänder in der Karte (die halfen), dann die Farbfelder (die brachten kaum etwas).

Die Körnung war es. Ein Kachelbild aus feinem Rauschen über **allem** — und seit
die Fenster durchsichtig sind, auch mitten durch jede Karte hindurch. Von Punkt
zu Punkt wechselnde Helligkeit ist nichts anderes als Unschärfe. Gemessen auf
einem Stück reinem Grund:

| | Flimmern (Nachbarpunkte) | Helligkeit |
|---|---|---|
| mit Körnung | 1,24 | 17,7 |
| **ohne Körnung** | **0,02** | **11,8** |
| Vorlage (Sperrbildschirm) | — | 11,3 |

Sie kostete beides: Schärfe *und* Dunkelheit. Ohne sie liegt der Grund exakt auf
dem Wert der Vorlage.

Ihr Zweck war, die Bänder aufzubrechen, die dunkle Verläufe zeigen. Den gibt es
kaum noch — die vier Farbfelder stehen bei 0,04 bis 0,05 statt 0,4 bis 0,5, der
Grund ist fast gleichmäßig (zwei Stufen über 240 Punkte). **Wo nichts verläuft,
streift auch nichts.** `grund.py`, `grund.svg`, der Eintrag im Vorrat des Service
Workers und die Ausnahme im Tor sind mitgegangen; git hat sie, falls auf einem
OLED doch Bänder auftauchen.

Die Kanten danach, Karte gegen Vorlage: oben **4,24 zu 4,22**, links **1,55 zu
1,55**, rechts 1,55 zu 1,64.

### Der Rand pulst nicht mehr

Ein Fenster, das atmet, ist eine ganze Bildschirmseite in Bewegung. Die aktive
Position sagt sich woanders deutlicher: am Abzeichen und an ihrer Symboltaste —
zwei kleine Zeichen, die schlagen, statt einer großen Fläche, die pulsiert. Der
Karte bleibt die hellere Kante; sie steht still und sagt trotzdem, welche
gemeint ist.

Die Symboltasten sind ebenfalls Fenster geworden: durchsichtig, Kante,
Lichtrand. Sie waren zuletzt das einzige Stück mit Füllung und Schimmer.

### Alle Kästen sind Fenster

Nach Kopf und Karten trugen die übrigen Flächen noch die alte Machart und
standen als graue Platten dazwischen. Jetzt tragen sie alle dieselbe:
`--glas-fenster` (durchsichtig), `--line` als Kante, `--glas-kante-glanz` als
Lichtrand.

| | vorher |
|---|---|
| Laufband | `--glas-grund-karte` |
| Setup-Streifen | `--glas-grund-karte` |
| Wirtschaftstermine | `--glas-grund-karte` |
| Fear & Greed | **`--card`** — als einziger ganz deckend |

Dabei zwei Stück toter Code weggeräumt, dieselbe Sorte wie damals `.glas`:

- **`.flaeche`** stand als gemeinsame Machart für die Kästen im Stylesheet —
  und kein einziges Element trug sie.
- **`--glas-glanz-karte`**, die ganze Glanz-Machart (Lichtstreifen, Wölbung,
  Rückwurf), hat kein Element mehr, seit die Fenster durchsichtig sind. Die
  Symboltasten setzen ihren Schimmer aus `--glas-schimmer` und
  `--glas-fuellung-taste` selbst zusammen. Ein Bauplan, den niemand befolgt,
  ist kein Bauplan.

### Warum es trotzdem nicht scharf aussah

„Sieht nicht so scharf aus wie auf dem Bild." Der Verdacht lag auf der Kante —
falsch. Alle vier Kanten gemessen, Karte in der App gegen den Kasten auf dem
Sperrbildschirm (Kontrast Kante gegen Grund):

| | oben | links | rechts | unten |
|---|---|---|---|---|
| App, Karte | 4,29 | 1,61 | 1,63 | 1,24 |
| Sperrbildschirm, Kopf | 4,22 | 1,55 | 1,60 | 1,09 |

Gleich. Zwei andere Dinge waren es:

**Der Grund war ein Nebel.** In der Bildmitte 22 von 255, während derselbe
Kasten auf dem Sperrbildschirm — wo `.grundkurve` gar nicht gezeichnet wird —
auf 12 steht. Seit die Fenster durchsichtig sind, ist der Grund das, was man
überall sieht, und alles darauf verliert Kontrast gegen ihn. Die vier Farbfelder
sind auf etwa die Hälfte zurückgenommen.

**Die Karte hatte graue Bänder in sich.** Zielleiste (0,05), News-Block
(`--soft`) und der Chart-Platzhalter (0,22) trugen eigene Flächen. Solange die
Karte selbst eine Füllung hatte, fielen sie nicht auf; in einer durchsichtigen
Karte sind sie Streifen, und ein Fenster mit Streifen sieht nicht scharf aus,
sondern schichtig. Getrennt wird jetzt mit der Haarlinie, die ohnehin da war.

Gemessen quer über die linke Kante, von außen nach innen:

```
vorher   20 20 … 20  |  58 59 86 87  |  72 72 72 72 …
jetzt    20 20 … 20  |  58 59 48 48  |  30 31 31 31 …
```

Innen 31 statt 72, bei einem Grund von 22 — die Karte ist eine Fläche, kein
Stapel.

Zwei Messfehler auf dem Weg: `scrollIntoView` und `getBoundingClientRect` im
selben Zug abgelesen, während `scroll-behavior: smooth` noch lief — der
Ausschnitt landete mitten in der Karte statt an ihrer Kante, und die Messung
meldete „keine Kante" (alle Zeilen 78). Und der erste Verdacht auf den
Schlagschatten ließ sich mit einem Profil widerlegen: außen ändert er nichts.

### Ein Fenster — und es ist wirklich durchsichtig

Gemeint war der Kasten, wie er auf dem **Sperrbildschirm** aussieht: dort steht
`.nur-web header` auf `background: transparent`, und die Kerzen laufen sichtbar
hindurch. Was das Fenster ausmacht, ist die Kante und der Lichtrand — keine
Füllung.

Ich hatte es zuerst andersherum verstanden und die Karten **dichter** gemacht
statt durchsichtiger: in die genau entgegengesetzte Richtung. Eine Scheibe, durch
die man nichts sieht, ist keine Scheibe.

Jetzt `--glas-fenster: transparent` für Kopf, Karten und die Scheibe des
Ladebildschirms. Geblieben ist die Kante — und die reicht: ein Rahmen aus Licht
sagt „hier liegt Glas" deutlicher als jede Füllung. Der Grund dahinter ist
dunkel, das Lesen wird dadurch nicht schlechter, sondern besser.

Der Glanz ist nicht verloren: `--glas-glanz-karte` trägt weiterhin die
Symboltasten und den Glocken-Knopf. Nur die großen Flächen sind leer geworden.

**Der Beweis.** Dieselbe Stelle zweimal aufnehmen — einmal mit der Scheibe
(Inhalt, Kante und Schatten unterdrückt), einmal ganz ohne Karte:

| | Mittel | höchstens |
|---|---|---|
| Messung gegen sich selbst | 0 | 0 |
| **ohne Körnung: mit ↔ ohne Karte** | **0** | **0** |
| mit Körnung | 2,7 | 14 |

Punkt für Punkt gleich. Die paar Stufen, die mit Körnung übrig bleiben, kommen
nicht von der Scheibe, sondern davon, wie die Rauschkachel unter einer eigenen
Ebene gerastert wird — auf den Speckeln bis zu 14 von 255, gleichmäßig verteilt
und mit bloßem Auge nicht zu sehen. Das war auch der Beweis, dass es die Körnung
ist: ohne sie null, mit ihr nicht.

Zwei falsche Fährten davor: erst verdächtigte ich die 1,22-Sekunden-Überblendung
von `box-shadow` (die Aufnahme fiele mitten hinein) — das war es nicht. Dann eine
Gegenprobe „zweimal dasselbe messen", die 0 ergab und damit zeitliches Rauschen
ausschloss. Erst danach war klar, wo zu suchen ist.

### Die Karten sind so laut wie die Symboltasten

„Zu leise Design, bitte wie Symboltasten für Karten." Die Tasten hatten das
lautere Rezept, und die Karten trugen noch die Vorsichtsmaßnahmen gegen einen
wandernden Lichtzug, den es nicht mehr gibt:

| | Taste vorher | Karte vorher | jetzt beide |
|---|---|---|---|
| Schimmer | `--glas-schimmer` (0,22) | halbiert (0,11) | **0,22** |
| Füllung | Verlauf 0,10 → 0,04 | flach 0,09 | **Verlauf** |
| Kante | `--line` (0,16) | `--hair` (0,12) | **0,16** |

Die Füllung steht als `--glas-fuellung-taste` an einer Stelle — „wie die
Symboltasten" ist sonst eine Absicht, die beim nächsten Nachbessern
auseinanderläuft.

**Gleiche Zahlen ergeben aber nicht gleiche Helligkeit.** Ein Verlauf skaliert
mit seiner Fläche: was auf einer 34 px hohen Taste die ganze Taste aufhellt,
sitzt auf einer 816 px hohen Karte im obersten Zehntel, und das untere Ende des
Verlaufs (0,04) färbt fast die ganze Karte. Gemessen in Dritteln:

| | oben | Mitte | unten | Taste im Mittel |
|---|---|---|---|---|
| mit dem Tasten-Verlauf 1:1 | 75 | 45 | 40 | 46 |
| **mit Boden bei 0,075** | **77** | **49** | **47** | **46** |

Deshalb hat die Karte einen eigenen Boden — kein Abweichen von „wie die
Symboltasten", sondern die Bedingung dafür.

**Was es kostet:** im Lesebereich steigt das hellste Prozent von 87 auf 106, der
Kontrast fällt von 6,59 auf **5,00 : 1**. Das ist die lauteste Einstellung
dieser Sitzung und liegt weiter über der Schwelle von 4,5 : 1 für normalen Text.

### Das aktive Setup pulst wie Glas, nicht wie ein Fokusrahmen

Steht der Kurs in der Einkaufszone, war das bisher ein **Auswahlrahmen**: eine
deckende weiße Linie, zwei Pixel dick, und ein harter Ring, der im Takt
herauswuchs (`box-shadow: 0 0 0 8px`). Das ist die Sprache von
Betriebssystem-Fokus. Eine Scheibe bekommt keinen Rahmen, wenn etwas mit ihr los
ist — sie fängt mehr Licht.

Zwei echte Fehler steckten darin, beide nur zu sehen, wenn man weiß, wonach man
sucht:

1. **`beat-card` setzte `box-shadow` vollständig neu.** `box-shadow` ist eine
   einzige Angabe — mit dem Ring waren `--glas-kante-glanz` und `--hebung` weg,
   solange die Bewegung lief. Die aktive Karte war die einzige **ohne** Glas.
2. **`nav a.nav-live` setzte `background: transparent`.** Der aktive Chip war
   damit der einzige ohne Füllung und Schimmer.

Jetzt: die Kante wird **heller statt weiß** (`rgba(--fg-rgb, 0.55)`, weiterhin
1 px), und das Licht sammelt sich **innen am Rand**. Ein Schein nach innen liest
sich als Licht *in* der Scheibe; ein Ring nach außen liest sich als Markierung
*darum herum*.

Der Puls liegt in `.card.card-live::after` und ändert **nur seine Deckkraft**
(0,34 → 1). Damit wird bei jedem Bild nichts neu gezeichnet, sondern überblendet —
auf der größten Fläche der Seite ist das der ganze Unterschied. Dass der Schein
innen liegt, ist kein Zugeständnis an `overflow: hidden`, sondern das, was
gemeint ist.

**Und er kostet kein Lesen.** Gemessen auf dem Höhepunkt des Atems, 99. Perzentil:

| Bereich | mit Puls | ohne |
|---|---|---|
| ganze Karte (der Rand dominiert) | 122 — 3,91 : 1 | 100 — 5,39 : 1 |
| **Innenraum, wo die Schrift steht** | **87 — 6,59 : 1** | **87 — 6,59 : 1** |

Die Aufhellung liegt vollständig im 22-Pixel-Rand. Genau das soll ein Randlicht
tun.

Das Abzeichen „AKTIV" ist selbst hell und deckend — es kann nicht von innen
leuchten. Bei ihm liegt der Schein außen, aber weich: ein Schimmer, der atmet,
kein Ring, der herauswächst. Der Takt steht als `--puls: 3.4s` an einer Stelle
statt fünfmal als 2,7 s, und ist langsamer geworden: auffallen ohne zu drängen.

### Der Lichtzug, und warum er wieder weg ist

Hier zog ein schmaler heller Streifen über die ganze Karte, während sie durchs
Bild fuhr — an der `view-timeline` der Karte, über die volle Strecke. Die
Begründung: was eine Scheibe von einem hellen Rechteck unterscheidet, ist nicht
ihr Aussehen im Stillstand, sondern dass sich das Licht bewegt, wenn man sie
bewegt. Ein feststehendes Licht ist Farbe, kein Licht.

Drei Runden, bis klar war, dass die Begründung nicht trägt:

1. Zu hell (0,17 Kern) → **„zu extrem und erschwert das Lesen"**.
2. Hinter den Inhalt gelegt (`z-index: -1` + `isolation: isolate`). Gemessen:
   3276 Glyphenkerne unverändert, 8 verändert. Das Lesen war gerettet.
3. **„Die Blendung über die ganze Karte ist nervig."** Und das war der Punkt,
   den beide Anläufe nicht angerührt hatten: etwas Helles wandert über die ganze
   Fläche, auf jeder Karte, bei jedem Wisch. Das ist kein Detail, das man
   bemerkt — das ist Bewegung im Augenwinkel, die man nicht abstellen kann.

Der Glanz bleibt, aber er bleibt stehen: Streifen, Wölbung, Rückwurf, Kante. Eine
Scheibe, die Licht fängt, ohne damit zu wedeln. `glanz-test` wacht darüber, dass
kein `glanzZug` zurückkommt — weder als Regel noch als laufende Bewegung.

Der erste Anlauf des Zuges war übrigens ein einzelner breiter Verlauf über ein
Drittel der Kartenbreite — auf einer schirmhohen Karte las sich das als heller
Schmierstreifen quer durch den Chart, nicht als Licht.

### Wo die Helligkeit wirklich herkam

„Dieser weiße Schein ist zu extrem und erschwert das Lesen." Stimmte, und war
messbar. Gemessen wird das **99. Perzentil des reinen Kartengrunds** (Inhalt auf
`visibility: hidden`, dann die Helligkeitsverteilung): die Spitze hängt an der
einen hellen Linie der Kante und sagt nichts, der Mittelwert verwischt alles.

Statt zu raten, welche Zahl zu hoch ist, wurde jede Ebene einmal weggelassen:

| Zustand | hellstes Prozent | Kontrast |
|---|---|---|
| alles zusammen | 104 | 5,08 : 1 |
| ohne Lichtstreifen | 97 | 5,65 : 1 |
| ohne Wölbung | 108 | 4,79 : 1 |
| ohne Rückwurf | 109 | 4,72 : 1 |
| **ohne Schimmer** | **77** | **7,71 : 1** |

Der Schuldige war nicht der neue Glanz, sondern der **alte breite Schimmer**
darunter — er allein macht zwei Drittel der hellen Fläche aus und stand schon
vorher da. Deshalb trägt er auf den Karten nur noch die Hälfte
(`--glas-schimmer-leise`): der scharfe Streifen sagt dasselbe über die Oberfläche
und braucht ein Zehntel der Fläche dafür.

Ergebnis: **87 statt 93** wie vor dem Glanz, Kontrast **6,59 statt 6,00**. Die
Karten glänzen und lesen sich besser als vorher.

**Was es kostet: nichts.** Alles davon sind Hintergrundebenen — einmal
gezeichnet, danach nur noch verschoben. Gemessen bei sechsfach gedrosseltem
Prozessor: **89 Bilder beim Scrollen, Mittel 16 ms, schlechtestes 17 ms, null
über 32 ms.** Ein Frost wäre hier das Naheliegende und das Falsche — siehe die
Regel weiter oben.

### Kein Kasten um die Symboltasten

Um die Kürzel stand ein zweites Fenster: eigener Hintergrund, eigene Kante,
eigene Rundung — und darin nochmals gerundete Tasten. Rahmen um Rahmen. Weil er
oben klebte, war er außerdem das schwerste Stück auf dem Schirm: die einzige
Fläche, die den ganzen Tag über bewegtem Inhalt liegt.

Der Kasten ist weg. Die Tasten sind unverändert — sie tragen ihr Glas selbst
und brauchen keine Schale, um zusammenzugehören; das tut die Reihe.

Mit dem Kasten fällt das Kleben weg, das eine geht ohne das andere nicht: eine
durchsichtige Reihe, die stehen bleibt, während Karten hinter ihr durchziehen,
wäre ein Schmierbild, und jede Deckung dagegen wäre wieder der Kasten. Also
fährt die Reihe mit, wie die Überschrift darüber.

Drei Werte hingen an der klebenden Leiste und sind mitgegangen:

| vorher | jetzt |
|---|---|
| `--kartenhoehe: 100dvh − --leiste − --luft` | `100dvh − --luft` |
| `scroll-padding-top: --leiste + --luft/2` | `--luft/2` |
| ein Skript maß `--leiste` nach (ein- oder zweizeilig) | entfällt |

Gemessen bei 390 × 844: zehn Karten, alle 816 Pixel hoch, nach einem Sprung
14 oben und 14 unten, genau eine Karte im Bild. Die Fortschrittslinie lag im
Kasten und war nur sichtbar, solange er klebte; sie sitzt jetzt fest am oberen
Bildrand, zwei Pixel hoch, und braucht kein Ein- und Ausblenden mehr — bei
Scrollstellung null ist sie auf Null zusammengezogen.

**Auch die Karten sind Glas — aber ohne Frost.** Lange stand hier das
Gegenteil: Glas über einer flachen Fläche ist kein Glas, sondern eine hellere
Fläche mit Kosten. Das galt, solange hinter den Karten nichts lag. Jetzt liegt
dort der Grund, und die Karten decken den größten Teil des Bildes ab — bleiben
sie weiß, sieht man vom Grund nur die Fugen. Sie tragen deshalb die dickste der
drei Füllungen (`0.74`, sie tragen auch die meiste Schrift) und **keinen**
`backdrop-filter`: der Grund ist eine ruhige Zeichnung, da gibt es nichts zu
verwischen — zehn Karten mit Filter wären dagegen zehn Filterflächen beim
Scrollen, teuer bezahlt für kein Bild.

### Der Chart in der Karte ist unserer

Bis v81 stand in jeder Karte ein TradingView-Rahmen. Er hatte drei Nachteile,
und keiner war von außen zu beheben:

1. **Er sah aus wie TradingView**, nicht wie diese Seite.
2. **Er ignorierte die Parameter zum Ausblenden seiner Leisten.**
   `hidetoptoolbar`, `hidelegend`, `hidevolume` sind am `widgetembed`
   wirkungslos — Werkzeugleiste, Legende und Volumen standen weiter im Bild,
   egal was in der Adresse stand.
3. **Er brachte seine eigene Höhe mit**, die keine Karte einhielt. Zusammen mit
   den eigenen Zeitraum-Knöpfen passte die Karte nicht mehr auf den Schirm.

Jetzt zeichnet die Seite selbst.

**`netlify/functions/verlauf.js`** liefert die Zahlen: `?sym=NVO&spanne=1T` →
`{ punkte: [[zeit, kurs], …], vorher, waehrung }`. Quelle ist Yahoo ohne
Schlüssel, dieselbe wie in `status.js`. Davor liegt ein Zwischenspeicher in
Blobs — zehn Karten mal fünf Zeiträume wären sonst fünfzig Abrufe für einen
einzigen Blick auf die Liste. Die Frist richtet sich nach der Spanne: ein
Tagesverlauf ist nach einer Minute alt, ein Jahresverlauf nach einer Stunde.
Fällt die Quelle aus, gilt der alte Stand weiter — ein Chart von vorhin ist
besser als ein leeres Feld.

Lücken werden **übersprungen, nicht aufgefüllt**: Yahoo liefert `null`, wo
nicht gehandelt wurde, und eine Linie, die dort waagerecht weiterläuft,
behauptet Handel, den es nicht gab.

**Gezeichnet wird als SVG** mit vier Dingen darin: die Fläche (Verlauf nach
unten ausblendend), die Linie (grün oder rot gegen den Schlusskurs davor), das
**Zonenband** und der **Zielstrich**. Die letzten beiden sind der eigentliche
Grund für den eigenen Chart: *er weiß, worum es in dieser Liste geht.* Ein
eingebetteter Chart kann das nicht — er kennt weder Einkaufszone noch Kursziel.
Beide erscheinen nur, wenn sie in die Skala passen; eine Zone weit außerhalb
würde die Kursbewegung zu einem Strich zusammendrücken, und der Chart zeigt
zuerst den Kurs.

Der `viewBox` läuft 0…100 und wird in der Breite gedehnt. Daraus folgt zweierlei:
jeder Strich trägt `vector-effect="non-scaling-stroke"` (sonst wäre er links
dünner als rechts), der Punkt am Ende bekommt den Dehnungsfaktor als
Gegenrechnung (sonst wäre er ein Ei), und **jede Beschriftung steht als HTML
daneben** statt im SVG — gedehnte Schrift ist keine Schrift.

Eine Falle beim Bauen: `var(--gut)` gilt in CSS-Eigenschaften, **nicht in
XML-Attributen**. Als `stroke="var(--gut)"` bleibt die Linie grau. Farbe muss
über `style` gesetzt werden.

**Zeitraum-Knöpfe** `1T · 1W · 1M · 1J · Max` über dem Chart, beim Aufmachen
**1W**. Ein Klick holt die Reihe neu. Eine Antwort, die zu einem inzwischen
abgewählten Zeitraum gehört, wird verworfen statt gezeichnet.

Vorher stand 1T da — der Blick, an dem man sieht, dass der Chart lebt. Er zeigt
aber nur das Rauschen eines Handelstages, und bei allem, was nicht durchgehend
gehandelt wird (Gold, Silber, Bitcoin am Wochenende), auch das nicht
verlässlich. Eine Woche hat genug Weg für eine Richtung.

### Die Kaufzone ist beschriftet

Sie ist der Grund für den eigenen Chart und stand trotzdem als kaum sichtbarer
Schleier da: **0,06 Deckkraft, ohne Kante, ohne Namen.** Auf dem Telefon war
nicht zu erkennen, wo sie anfängt und aufhört — und schon gar nicht, dass sie es
überhaupt ist.

Drei Dinge machen daraus einen Bereich:

| | |
|---|---|
| Füllung **0,06 → 0,13** | das Band ist da, nicht nur zu ahnen |
| zwei **durchgezogene** Kanten (0,44) | wo sie anfängt und wo sie aufhört |
| ein Schild **„KAUFZONE 5,70 – 6,01"** | links auf dem Band, mit der Spanne |

Zwei Kanten statt eines Rahmens: die Zone ist ein Kursbereich, sie hat keinen
Anfang und kein Ende in der Zeit. **Durchgezogen**, während der Zielstrich
gestrichelt bleibt — zwei verschiedene Dinge dürfen nicht gleich aussehen.
Farbe scheidet als Unterscheidung aus: Grün und Rot bedeuten hier Steigen und
Fallen und nichts sonst.

Das Schild sitzt auf der Mitte des Bandes. Liegt das Band ganz oben oder ganz
unten, rückt es an die gegenüberliegende Kante — dort stehen die Prozentangabe
und die Zeitmarken. Vorher stand nur das Wort „Zone" rechts bei den Kursmarken,
wo es zu jeder Linie hätte gehören können.

Die Zeichenwerkzeuge fehlen nicht: der Knopf unter dem Chart öffnet weiter den
vollen Analyse-Chart mit den Fibonacci-Marken — als Knopf, nicht als
Einbettung.

**Zur Größe:** `fluss-test`s Deckel steht seither bei 275 statt 260 kB.
Dazugekommen sind rund 8 kB eigener Code, weggefallen sind zehn eingebettete
Fremdanwendungen, von denen jede ein Vielfaches davon nachlädt. Die Quelldatei
ist größer geworden, die Seite deutlich leichter.

### Was fehlt, und warum

Die **echte Brechung** — ein SVG-`feDisplacementMap` als `backdrop-filter` —
ist bewusst nicht drin. Nur Chromium reicht SVG-Filter an `backdrop-filter`
durch; auf dem iPhone, wo diese App läuft, täte sie nichts außer kosten.

### Was es kostet — und die eine Regel, die daraus folgt

**Frost nur, wo eine Fläche steht. Was mitscrollt, bekommt keinen.**

Ein mitscrollender `backdrop-filter` muss bei *jedem Bild* neu gefiltert
werden. Das ist der teuerste Fehler, den man in dieser Machart machen kann,
und ich habe ihn gemacht: Kopf, Laufstreifen und Setup-Streifen bekamen Frost,
und die Messung fiel von 17,0 auf 19,6 ms bei 17,6 langen Bildern je Lauf —
auch im Ruhezustand, nicht nur beim Scrollen.

Vier Varianten, je fünf Durchgänge, sechsfach gedrosselter Prozessor,
frischer Browser je Messung, Bilder über 32 ms:

| Variante | Mittel | lange Bilder |
|---|---|---|
| A — mit Frost auf den Bändern | 20,6 ms | 21,2 |
| B — Karten wieder deckend | 19,4 ms | 14,8 |
| C — Karten Glas, ohne Kante | 18,6 ms | 10,8 |
| **D — Bänder ohne Frost** | **17,0 ms** | **0,6** |

Es waren **nicht** die Karten: B und C bringen kaum etwas. Zehn Karten aus
Glas kosten nichts, solange sie keinen Filter tragen. Endstand nach der
Korrektur: `17,0 ms`, `0,8` lange Bilder, schlimmstes Einzelbild 33 ms —
dasselbe wie vor dem ganzen Umbau.

Zweiter Fund aus derselben Runde: **`background-attachment: fixed`** auf der
Anmeldeseite. Ein festgenagelter Hintergrund wird neu gezeichnet statt
zusammengesetzt, sobald sich darüber etwas bewegt — und darüber laufen die
Kerzenbänder. Die Prüfung „die Kerzen laufen rund" war rot, die Zeile konnte
ersatzlos weg.

### Die Größe — und was ein Deckel messen sollte

`index.html` wird auf jeden Aufruf ausgeliefert, deshalb hat `fluss-test`
einen Deckel. Der lag lange bei 260 kB **roher** Datei, wurde auf 275
angehoben — und in einer einzigen Sitzung **viermal** gerissen. Jedes Mal war
die Antwort dieselbe: Kommentare kürzen.

Das ist die falsche Antwort auf die falsche Frage. Die Zahlen:

| | roh | gzip |
|---|---|---|
| vor dem Umbau auf eigene Charts | 253,1 kB | 67,5 kB |
| danach | 275,7 kB | 74,9 kB |

Roh **+22,6 kB**, über die Leitung **+7,4**. Der Unterschied ist Prosa, und
Prosa komprimiert sich fast vollständig weg. Ein Deckel auf der rohen Datei
bestraft also Erklärungen und lässt Nutzlast durch — genau verkehrt herum.

Deshalb jetzt zwei Werte: **gzip unter 95 kB** ist der scharfe (das ist die
Ladezeit), **roh unter 360 kB** bleibt als weiter Riegel gegen ein
Davonlaufen. (Der rohe Riegel stand bei 300 und ist aus demselben Grund
gestiegen wie der gzip-Deckel von 80 auf 84: bei 301 kB roh sind es 79 kB
gzip — die Leitung merkt von den 300 nichts, und abgeschnitten würden nur
Erklärungen.)

**Drei Anhebungen in einer Sitzung — und das ist eine zu viel.** 80 → 84 (Prosa),
84 → 86 (die Scheibe mit dem Kürzel), 86 → 88 (die vier Sekunden Liquid). Jedes
Mal war der Grund echt, jedes Mal ist vorher gekürzt worden, und beim letzten Mal
ist dabei sogar echter Ballast gefunden worden: der zweite Lichtzug über der
Scheibe war neben dem über den ganzen Schirm überflüssig, und `.liquidfeld`
wiederholte die Geometrie von `.lichtfeld` (jetzt tragen die Elemente beide
Klassen — eine Quelle statt zweier, die auseinanderlaufen können).

Trotzdem: ein Deckel, der dreimal nachgibt, ist kein Deckel mehr, sondern ein
Nachlauf. Deshalb stand als Notiz im Test und hier: **reißt er das nächste Mal,
gehört nicht der Deckel angehoben, sondern die Datei angesehen.**

Er riss beim nächsten Mal — der Einzug. Also angesehen. Gefunden: drei Keyframes,
die von nichts benutzt wurden (`fadeUp`, `lineIn`, `shakeX`), und ein doppelter
Einzug im Ladebildschirm (`auftaktRein` neben `scheibeRein` — die Scheibe fährt
als Ganzes herein, was darin noch einmal einzeln steigt, sieht niemand). Beides
ist raus. **Gebracht hat es 0,1 kB.**

Das ist das Ergebnis, und es ist eins: in dieser Datei steckt kein Kilobyte
Speck. Sie ist groß, weil sie viel kann und weil danebensteht, warum sie es so
kann — und gzip bestraft nicht Wiederholung, sondern *einmaligen* Text. Vier
gleiche `animation:`-Zeilen zu löschen bringt fast nichts; ein Satz Erklärung
kostet mehr als sie alle.

**Wer die Datei kleiner will, muss sie teilen** — das CSS in eine eigene Datei,
die der Service Worker getrennt vorhält. Das ist ein Umbau, keine Kürzung, und er
gehört an einen Anfang, nicht ans Ende einer langen Runde. Bis dahin steht der
Deckel bei **95 kB** statt bei 88: einmal mit Luft, damit er nicht jede Runde
nachgibt. Reißt er wieder, ist die Teilung fällig — nicht die nächste Zahl. Gemessen wird die Datei selbst, nicht die Antwort des Servers —
der lokale Prüfserver komprimiert nicht, und der Wert soll überall derselbe
sein.

Zwei Korrekturen am Deckel selbst, beide aus Schaden:

**Er rundete erst und verglich dann.** Bei 79,76 kB stand da 80, und der Test
fiel durch, obwohl die Datei unter der Grenze lag. Das hat zweimal Kommentare
gekostet, die nicht zu kürzen waren.

**Er stand bei 80 und bestrafte dreimal hintereinander das Falsche.** Jedes Mal,
wenn eine Runde einen echten Fehler aufdeckte, ging die Begründung dafür in die
Datei — und musste danach wieder heraus. Drei Fehler dieser Sitzung wurden
gefunden, *weil* früher jemand aufgeschrieben hat, warum etwas so steht. Vier
Kilobyte gzip sind auf einer langsamen Verbindung rund 60 ms; das ist der Preis,
und er ist klein gegen einen Fehler, den niemand mehr versteht. Der Deckel soll
ein Davonlaufen verhindern, nicht das Denken.

### Zwei Rückwege

Ohne `backdrop-filter` wäre die Füllung eine halbdurchsichtige Schicht über
scharfem Text darunter — unleserlich. Und wer sein Gerät auf weniger
Transparenz gestellt hat, meint genau das. In beiden Fällen werden alle
Flächen wieder deckend, der Schimmer verschwindet, die Kurve auch.

`prefers-reduced-transparency` lässt sich mit diesem Playwright nicht
nachstellen — `emulateMedia` kennt den Schalter nicht. Die Prüfreihe sieht
deshalb für diesen Fall im Stylesheet nach, statt es im Browser zu messen.

## Positionen aus dem Code nachtragen

Die Startliste in `positionen-start.js` gilt **nur beim allerersten Aufruf**.
Danach ist der Blobs-Speicher die Wahrheit, und was im Code steht, hat keine
Wirkung mehr. Das war richtig gedacht — und hatte eine Lücke: es gab damit
**keinen Weg mehr, eine Position aus dem Code hinzuzufügen**. Wer eine ergänzen
wollte, musste sie von Hand in der Verwaltung eintippen.

`NACHTRAG` schließt die Lücke. Jeder Eintrag trägt einen Schlüssel; steht der im
Speicher vermerkt, passiert nichts mehr:

```js
export const NACHTRAG = [
  { schluessel: "ftg-2026-08", position: { id: "ftg", name: "FIT Group AG", … } }
];
```

| | |
|---|---|
| wirkt | genau einmal, egal wie oft gelesen wird |
| gelöscht | kommt **nicht** zurück — der Vermerk bleibt |
| doppelt | unmöglich: steht die `id` schon in der Liste, wird nichts angefügt |
| geprüft | durch dieselbe `pruefen()`-Schranke wie alles andere |
| meldet | „Neu in der Liste" an alle, wie bei jeder neuen Position |

Geschrieben wird **beim Lesen** — dieselbe Ausnahme wie beim allerersten Aufruf,
und aus demselben Grund: die Position soll dastehen, sobald der Code ausgeliefert
ist, nicht erst wenn jemand zufällig etwas speichert. Der Vermerk wird **vor** der
Meldung gesetzt: lieber eine Meldung, die einmal ausfällt, als eine, die bei jedem
Aufruf noch einmal rausgeht.

**Drei Fehler beim Bauen**, alle vom Test gefangen:

1. **`alt.nachgetragen`** — `alt` ist eine `Map` der Positionen, nicht das
   gespeicherte Objekt. Der Ausdruck war still `undefined`, und die Vermerke wären
   beim ersten Speichern in der Verwaltung verschwunden — womit eine gelöschte
   Position beim nächsten Lesen wiedergekommen wäre. `nachtrag-test` hat dafür eine
   **Gegenprobe**: ohne Vermerk kommt sie wirklich wieder.
2. **Der erste Aufruf übersprang den Nachtrag.** Ein bestehender Speicher bekam
   FIT Group, ein frischer nur die Startliste — zwei Wege, zwei Ergebnisse.
   Gefangen hat es `karten-test`, weil er die Zahl der Karten aus Startliste *plus*
   Nachträgen ableitet.
3. **Feste Zahlen in den Testreihen.** `=== 10`, `=== 11`, eine feste Kette von
   zehn Kürzeln, `nth(10)` für die neu angelegte Position. Sieben rote Zusicherungen,
   von denen keine einen Fehler zeigte. Alle leiten sich jetzt aus dem Bestand ab.

### Ein Symbol ohne Börse trifft irgendwas

FIT Group AG steht im **direct market plus der Wiener Börse** (ISIN DE000A426PD9,
WKN A426PD). In Deutschland ist die Aktie nur außerbörslich über Lang & Schwarz
handelbar — **kein Xetra, kein Frankfurt.**

Der Weg zum richtigen Symbol ging über zwei Fehler, und beide sind derselbe in
zwei Richtungen:

1. **`FTG.DE`** — aus der Annahme, eine deutsche ISIN heiße Handel in Deutschland.
   Auf der Karte stand „Kein Kurs".
2. **Leer** — weil Yahoo unter blankem `FTG` eine *kanadische* Firma führt (Firan
   Technology Group) und unter `FIT.VN` eine vietnamesische. Ein blankes Kürzel
   hätte still den Kurs eines fremden Papiers gezeigt und könnte damit sogar eine
   Zonen-Meldung auslösen.

**Ein Symbol ohne Börse trifft irgendwas, eins mit falscher Börse trifft nichts.**
Dann `FTG.VI`: TradingView führt die Aktie als `VIE:FTG`, und `.VI` ist Yahoos
Kürzel für die Wiener Börse. Ein Suffix zeigt immer auf genau eine Börse — es kann
also nicht versehentlich eine andere Firma treffen. `nachtrag-test` verlangt
deshalb, dass ein Symbol *eine Börse trägt*, statt nur „ist gesetzt" zu prüfen.

**Auch das war „Kein Kurs".** Damit ist dieselbe Frage dreimal falsch beantwortet
worden, und jedes Mal kam als Antwort dasselbe Wort zurück. Das ist ein Ergebnis,
keine Auskunft — und der Grund, warum ich raten musste: die Entwicklungsumgebung
kommt an keinen fremden Host heran, also ist jede Antwort erst auf dem Gerät zu
sehen.

### Die Function sucht das Symbol selbst

Viermal ist das Symbol für FIT Group von Hand geraten worden — `FTG.DE`, leer,
`FTG.VI` —, viermal stand „Kein Kurs" auf der Karte. Der Grund liegt nicht am
Raten, sondern daran, **warum** geraten werden musste: aus der
Entwicklungsumgebung ist keine einzige Kursquelle erreichbar. Systematisch
geprüft — **zehn Hosts per curl, drei per WebFetch, alle gesperrt** (Yahoo,
Stooq, stockanalysis, marketscreener, finanzen.net, wallstreet-online,
boerse-frankfurt, onvista, eodhd, FMP). Suchen geht, Daten holen nicht.

Auf Netlify laufen diese Quellen. Also sucht **die Function**, nicht ich:

1. das eingetragene Symbol
2. dasselbe Kürzel an den Börsen, an denen ein europäisches Papier notieren kann
   (`.VI .DE .F .SG .BE .MU .DU .HM`) — **nie blank**
3. (Diagnose: Stooq und die Wiener Börse, siehe unten)

**Der springende Punkt ist nicht das Suchen, sondern das Prüfen.** Ein Kürzel
trägt an jeder Börse eine andere Firma; blank bei Yahoo sogar eine kanadische.
Ein Fund wird deshalb nur genommen, wenn er zur Position passt:

| | |
|---|---|
| Währung | eine Zone in Euro braucht einen Kurs in Euro |
| Name | ein tragendes Wort des Firmennamens muss vorkommen (`AG`, `Inc`, `Group` zählen nicht) |

Damit ist automatisches Suchen **nicht gefährlicher als ein Symbol von Hand,
sondern sicherer** — von Hand wird gar nichts geprüft. `suche-test` stellt das
Netz nach und prüft beide Wachposten einzeln: „Firan Technology Group Corp" unter
`FTG.DE` wird abgelehnt, ein Kurs in CAD wird abgelehnt, das blanke Kürzel wird
nie gefragt, und Futures (`GC=F`) wie Krypto (`BTC-USD`) bleiben unangetastet.

**Ein Testfehler dabei, der lehrreich war:** alle Fälle hießen `FTG.VI`, und der
Zwischenspeicher der Function machte daraus einen einzigen — die späteren
Prüfungen lasen das Ergebnis der früheren und meldeten `aus: speicher`. Drei rote
Zeilen, von denen keine einen Fehler zeigte. Jeder Fall hat jetzt sein eigenes
Kürzel.

### Der Chart erklärt sich selbst

```
/.netlify/functions/verlauf?sym=FTG&pruef=1
```

Antwortet mit **jeder** Schreibweise und **jeder** Quelle: Yahoo mit den Suffixen
`.VI .DE .F .SG .BE .MU .DU .HM`, dazu Stooq — je mit Status, Börse, Name,
Währung, Kurs, Zahl der Punkte und einem Urteil („brauchbar", „Yahoo kennt es
nicht", „kennt es, liefert aber keine Reihe", „nicht erreichbar").

Zwei Dinge sind dabei Absicht:

- **Yahoo wird nie blank befragt.** Ein Kürzel ohne Suffix trifft irgendeine Firma,
  die es zufällig trägt — genau die Falle von Anlauf 2.
- **Eine zweite Quelle**, falls Yahoo das MTF-Segment gar nicht führt.

Die Mechanik ist lokal geprüft (`verlaufpruef-test`, mit nachgestelltem Netz):
alle Schreibweisen werden versucht, ein Fund wird mit Name und Börse erkannt, und
ein Ausfall nimmt die Auskunft nicht mit. **Die Antwort selbst kommt vom echten
Netz** — dafür ist sie ja da.

Damit das überhaupt geht, sind zwei Pflichtfelder gefallen:

- **`yahoo`** — nicht jede Notierung hat einen Kurs bei Yahoo. Ohne Symbol hat die
  Position keinen Live-Kurs und keinen Chart; sie zeigt Einkaufszone und Ziel, und
  das ist der Kern dieser Liste.
- **`tv`** — seit dem Umbau auf eigene Charts benutzt es niemand mehr. Steht eins
  da, muss es weiter stimmen; leer darf es bleiben.

Dazu ein ehrlicher Zustand im Chart: ohne Symbol stand dort **„Chart lädt …" für
immer**. Jetzt steht da „Kein Live-Kurs".

**Was ich nicht erfunden habe:** anfangs die Branche — bis die Recherche sie
lieferte (Gesundheitsprodukte: „FitGun"-Massagepistolen, „FGN"-Supplements). Eine
erfundene Branche stünde dauerhaft und falsch auf der Karte; eine fehlende ist in
der Verwaltung in zehn Sekunden nachgetragen.

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
fallende sind gefuellt, also Kontrast ohne eine einzige Farbe.

### Eine Kachel, kein gedehntes Bild

Das Muster stand als SVG im Markup und wurde auf die doppelte Fensterbreite
gezogen. 34 Kerzen, die immer die volle Breite füllen sollen — auf dem Telefon
sind das **11 Pixel je Kerze**, auf einem Fenster von 1900 aber **56**. Dieselbe
Zeichnung, nur riesig. Auf Windows und auf dem Tablett wurde aus dem Hintergrund
ein Vordergrund.

Der Fehler steckte in der Bauweise, nicht in einem Wert: kleiner werden die
Kerzen nur, wenn es **mehr** werden. Dehnen hilft nicht, Skalieren auch nicht —
34 Kerzen auf einen breiten Bildschirm sind eben grob. Es muss gekachelt werden.

Deshalb liegt das Muster jetzt als `/kerzen.svg` daneben, eine Schleife breit
(748 Einheiten, 34 Kerzen), und die Bänder holen es als
`background-repeat: repeat-x`:

```css
--kachel: min(100vw, 620px);
width: calc(100% + var(--kachel));     /* ein Fenster plus eine Kachel */
background-size: var(--kachel) 100%;
```

| Fenster | vorher | jetzt |
|---|---|---|
| 390 (Telefon) | 11,5 px | **11,5 px** — unverändert |
| 1024 (Tablett) | 30 px | **18,2 px** |
| 1900 (Schreibtisch) | 56 px | **18,2 px** |

Der Umlauf ist jetzt genau **eine Kachel** weit statt einer halben Bandbreite;
weil das Band ein Fenster *plus* eine Kachel breit ist, deckt es danach immer
noch alles ab, und weil die Kachel tapeziert, ist der Übergang nahtlos. Gemessen
in Kerzen ist das Tempo dasselbe wie vorher auf dem Telefon: rund vier je
Sekunde.

Zwei Nebenwirkungen, beide gut: `index.html` und `anmelden.html` sind zusammen
**35 KB leichter** (das Muster stand zweimal drin, je doppelt), und die Datei
wird einmal geholt und gecacht.

**Zwei Kacheln, nicht eine mit Deckkraft.** Ein Hintergrundbild lässt sich von
außen nicht mehr einfärben — die Farben stehen jetzt *in* der SVG-Datei. Der
erste Anlauf gab dem hinteren Band deshalb `opacity: 0.39`. Das war teuer:
Deckkraft am Element zwingt den Compositor, die **ganze Ebene bei jedem Bild zu
überblenden**. A/B gemessen, je sechs Durchgänge bei sechsfach gedrosseltem
Prozessor, frischer Browser je Messung:

| Fassung | Mittel | Bilder über 32 ms je Lauf |
|---|---|---|
| gedehntes SVG (vorher) | 17,3 ms | 0 · 2 · 0 · 8 · 3 · 11 → 4,0 |
| Kachel + `opacity` am Band | 17,2 ms | 1 · 4 · 0 · 0 · 2 · 11 → 3,0 |
| Kachel + eigene blasse Kachel | **17,0 ms** | 0 · 0 · 1 · 0 · 1 · 2 → **0,7** |

Also liegt die Blässe in `kerzen-blass.svg` — dieselbe Zeichnung, nur mit den
ursprünglichen Einzelwerten (0,16 · 0,17 · 0,26). Nichts zu überblenden, und
die gekachelte Fassung läuft damit **runder als die alte gedehnte**.

Beide Dateien müssen **ohne Anmeldung** erreichbar sein, sonst stünde die
Anmeldeseite leer — sie stehen deshalb in `OFFEN` im Tor und im Vorrat des
Service Workers.

Zur Messung selbst zwei Lehren. Erstens: ein Messskript, das sechs Kontexte in
**einem** Browser öffnet, wird von Lauf zu Lauf langsamer — der letzte war
immer der schlechteste, und das sah aus wie ein Rückschritt. Ein frischer
Browser je Messung räumt das aus. Zweitens: `fluss-test`s alte Schwelle
„höchstens 3 lange Bilder" lag auf dieser Maschine *im* Rauschen — die alte
Fassung riss sie in 3 von 6 Messungen genauso. Sie steht jetzt bei 12, mit den
Zahlen oben als Begründung im Test; was trägt, sind der Mittelwert (stabil bei
17 ms) und „kein Bild über 100 ms".

`kachel-test` misst die Kerzenbreite bei 390, 1024 und 1900 Pixeln, prüft die
Deckung (Fenster + Kachel), den Umlauf auf halbem Weg (genau eine halbe Kachel)
und dass in beiden HTML-Dateien kein gedehntes SVG mehr steht.

`css-test` zählt Klammern und Keyframes — und seit dem Glanz auch die Form jeder
Angabe im Markenblock. Ein Kommentar, der zu früh schließt, lässt Prosa roh im
Stylesheet stehen; die nimmt die folgende Angabe mit, `--glas-glanz-karte` fiel
weg, und die Karten wurden dunkel. Die Klammern gingen dabei auf, der Test war
grün. Jetzt fällt auf, was vor dem Doppelpunkt kein Name ist: „Wie hell" hat ein
Leerzeichen. Gegengeprüft, indem der Fehler absichtlich wieder eingebaut wurde.

`glanz-test` prüft, dass der Schimmer wirklich ankommt: zwei Hintergrundebenen
auf Blatt und Anmeldekasten, Licht oben und Schatten unten an der Kante, keine
Fläche mit nackter Füllung, kein `::before` mehr — und dass die
`background-position` sich
nicht bewegt, nachdem ein Blatt bis zum Anschlag gerollt wurde. Das Fenster
wird dafür auf 320 Pixel Höhe verkleinert, sonst ist das Blatt kürzer als der
Platz und rollt gar nicht.

Bewegt wird nur das Band als Ganzes per `transform` — eine Sache fuer den
Compositor, kein Layout, kein Skript. Gemessen mit sechsfach gedrosseltem
Prozessor kostet das keine messbare Ladezeit: erster Chart nach 1638–1677 ms
mit Kerzen, 1690–1740 ms ohne. Bei `prefers-reduced-motion` stehen die Baender
still, das Bild bleibt.

Die Anmeldekarte ist milchig statt weiss (`backdrop-filter`), damit die Kerzen
auch hinter ihr weiterlaufen; hinter dem Auftakt-Text liegt stattdessen ein
weicher Lichthof, sonst waere "Charts werden geladen" nicht zu lesen.

## Fluessigkeit

### Alles um ein Drittel langsamer

**Jede Dauer und jeder Vorlauf in allen vier Stylesheets ist mit 1,35
multipliziert** — in einem Zug, mit einem Skript, damit kein Verhaeltnis
zerreisst. Genau darauf kam es an: die vier Ringe im Rundgang laufen in
Vierteln einer Runde, die fuenf Kartenstuecke in gleichen Stufen. Wer
einzelne Werte von Hand anfasst, verschiebt solche Muster, ohne es zu
merken.

Warum das fluessiger ist und nicht nur langsamer: dieselbe Strecke auf mehr
Bilder verteilt heisst weniger Weg je Bild. Was vorher in acht Bildern
durchlief, hat jetzt elf — Ruckler fallen weniger auf, weil weniger dazwischen
passiert.

| | vorher | jetzt |
|---|---|---|
| Antippen (Rueckmeldung) | 0,12 s | 0,16 s |
| Uebergaenge an Knoepfen | 0,18 s | 0,24 s |
| Blatt auffahren | 0,36 s | 0,49 s |
| Blatt zufahren | 0,56 s | 0,76 s |
| Kartenstueck (an der Uhr) | 0,78 s | 1,05 s |
| Puls an aktiven Symbolen | 2 s | 2,7 s |
| Rundgang-Ringe (eine Runde) | 7,2 s | 9,72 s |
| Kerzen im Hintergrund | 15 s | 20,25 s |
| Laufband | 28 s | 37,8 s |

Nicht angefasst: `0.01ms` und `0ms` in der Regel fuer **weniger Bewegung** —
das sind keine Dauern, sondern der Schalter, der die Animationen abwuergt.
Ebenso wenig der Takt der Wirtschaftstermine (6 s je Eintrag): das ist eine
Lesezeit, keine Bewegung.

Was im Skript an einer CSS-Dauer haengt, ist mitgewandert: `HERAUF` 486 ms,
`HINUNTER` 756 ms, `SEITE` 270 ms, das Abraeumen nach dem Sortieren 1760 ms,
der Ring nach einem Sprung 880 ms, das Ruetteln der Anmeldung 610 ms.

Zwei Reihen haben dabei feste Sekunden erwartet und mussten umgestellt
werden — sie pruefen jetzt **Verhaeltnisse statt Betraege**: ob die vier
Ringe gleiche Viertel Vorlauf haben, ob die fuenf Stuecke in gleichen Stufen
kommen. Das ueberlebt auch die naechste Umstellung.

`fluss-test` misst nach, dass Scrollen, Glocke und Rundgang dabei im Rahmen
bleiben.

### Zehn Charts

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

Bewegt wird beim Scrollen jedes Stueck der Karte einzeln, der Chart-Kasten
eingeschlossen — aber nie die Karte selbst. Wer den Vorfahren eines
fremden `<iframe>` verwandelt, laesst es bei jedem Bild neu zeichnen; gemessen
ueber einen Scrollstoss kostete das 76 ms Stilberechnung statt 26 ms.

Abseitige Karten zeichnet der Browser wegen `content-visibility: auto` gar
nicht erst. Die Kopf-Parallaxe und die Fortschrittslinie haengen an
CSS-Zeitachsen — beim Scrollen laeuft kein rechnendes Skript.

### Wie laut das Scrollen ist

Die Bewegung war lange bewusst zurueckhaltend und wirkte dadurch beliebig.
Jetzt ist sie unuebersehbar:

- **Der Weg** eines Kartenteils betraegt 140 statt 26 Pixel.
- Er kommt aus **`scale(0.80)`** und **um 22 Grad nach hinten gekippt** herein.
  Die Perspektive steht im `transform` selbst (`perspective(900px)`), nicht am
  Vorfahren — sonst zoege sie den Chart in einen 3D-Raum, und genau das soll er
  nicht.
- **Die Deckkraft kommt frueher als die Bewegung** (bei 55 % der Strecke) — die
  Zeile steht schon lesbar da, waehrend sie ihren letzten Zentimeter noch faehrt.
- **Fuenf Stuecke, fuenf Abschnitte** (0–30 %, 11–41 %, 22–56 %, 35–70 %,
  48–84 % der Einfahrt), die nur zu einem Drittel ueberlappen: Kopf,
  Zielleiste, **Chart**, News, Knopf. So kommt eins nach dem anderen statt der
  Karte als Block.
- **Die Haarlinie** faehrt aus `scaleY(5)` bei voller Deckkraft auf eine
  1-Pixel-Linie bei 0,12 — ein breiter Strich, der sich zur Kante beruhigt.
- **Der Kopf sinkt weg** statt nur zurueckzubleiben: 92 % statt 38 %, dazu
  `scale(0.78)` und Deckkraft 0,12.

### Warum der Chart jetzt doch mitfaehrt

Er war lange ausgenommen, und der Grund war gut: in jeder Karte steckt ein
fremdes `<iframe>`, und als noch die **ganze Karte** verwandelt wurde, kostete
ein Scrollstoss 76 ms Stilberechnung und 358 ms Hauptfaden statt 25 und 259.

Das gilt fuer den Vorfahren. Den Kasten zu verwandeln, **in dem** das `<iframe>`
sitzt, ist etwas anderes — `chartkosten.mjs` misst denselben Scrollstoss
zweimal, einmal mit und einmal ohne Chart-Animation, mit einem absichtlich
schwer gefuellten `<iframe>`:

| | Stil | Hauptfaden | je Bild |
|---|---|---|---|
| Chart faehrt mit | 92 ms | 565 ms | 17 ms |
| Chart steht still | 82 ms | 507 ms | 17 ms |

Ueber 90 Bilder bei 4-facher Drosselung: 10 ms Stilberechnung, 58 ms
Hauptfaden, **0 ms je Bild**. Bei 6-facher Drosselung liegt der Unterschied im
Rauschen. Die Karte selbst bleibt weiterhin unberuehrt — das ist der Punkt, an
dem es teuer wuerde, und `scroll-test` haelt ihn fest.

### Was sonst noch stillstand

Ausserhalb der Karten bewegte sich gar nichts. Jetzt fahren mit:

| | Bewegung |
|---|---|
| Stimmungskasten, Fuss | `teilLauf` — wie ein Kartenstueck |
| Laufband, Setup-Streifen, Termine | `bandLauf` — 56 Pixel, `scale(0.94)`, kein Kippen |
| Name und Zeile im Kartenkopf | `teilKlein` — 26 Pixel, nacheinander |

Die Baender bekommen absichtlich die kuerzere Fassung: sie laufen ueber die
ganze Breite und liegen dicht aufeinander. 140 Pixel liessen sie
durcheinanderfahren, und ein Kippen saehe an einem randlosen Streifen aus wie
ein Fehler. Jeder Block liest seine **eigene** Uhr (`view()` ohne Namen) — nur
die fuenf Kartenstuecke teilen sich die Uhr ihrer Karte, damit ihre
Reihenfolge stimmt.

**Auf dem iPhone wiederholt sich die Bewegung jetzt.** Der Beobachter meldete
eine Karte nach ihrem ersten Auftauchen ab — wer hoch und wieder herunter
ging, sah nichts mehr. Jetzt schaltet er in beide Richtungen: was oben
hinausfaehrt, verliert `sichtbar` und faehrt beim Zurueckscrollen erneut
herein. Zurueckgesetzt wird ausserhalb des Bildes, das sieht niemand. Am
Finger war das ohnehin so — eine scrollgebundene Animation laeuft rueckwaerts,
wenn man rueckwaerts scrollt.

### Warum es keine Ausfahrt gibt

Naheliegend waere, jedes Stueck beim Verlassen oben auch wieder hinausfahren
zu lassen. Das geht nicht: **zwei scrollgebundene Animationen auf demselben
Element setzen sich in Chromium nicht zusammen.** Die zweite meldet auch weit
ausserhalb ihres Abschnitts noch `running` bei Fortschritt 0 und legt damit
ihr Anfangsbild — voll da, unverwandelt — ueber die erste; von der Einfahrt
saehe man nichts. Weder `forwards` noch `none` als Fuellart aendert daran
etwas. Nachgemessen in `probe.mjs`.

### Der leise Weg war der wichtigere

Zwei Wege fuehren zu derselben Bewegung, und lange war nur einer laut.

Wo der Browser `animation-timeline: view()` kann (Chrome), haengt die Bewegung
am Finger. Wo nicht — **auf dem iPhone der Regelfall** — setzt ein
`IntersectionObserver` die Klasse `sichtbar`, und die Bewegung laeuft an der
Uhr ab. Dieser zweite Weg liess frueher die **ganze Karte** einmal um 16 Pixel
aufsteigen, waehrend drueben vier Teile nacheinander kamen. Wer die Liste auf
dem iPhone ansah, bekam von der ganzen Arbeit fast nichts mit — und lauter
wurde durch jede Aenderung am ersten Weg auch nichts.

Jetzt fahren beide Wege **dieselben fuenf Stuecke mit denselben Keyframes**
(`teilLauf`), nur die Uhr ist eine andere: dort die Scrollstellung, hier
0,78 s Lauf mit 0,09 s Versatz je Stueck. Nebenbei ist der zweite Weg damit
auch billiger geworden — die Karte selbst wird gar nicht mehr angefasst, und
sie ist der Vorfahr des Charts.

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

### Und wenn die Maschine nicht ruhig ist

Das reichte nicht. An einem Tag hat dieselbe Reihe an derselben Seite
**14,9 s** für den Start gemeldet, allein danach 4,6 s und eine Viertelstunde
später dreimal grün. Gemessen wurde nicht die Seite, sondern wer sonst noch auf
den vier Kernen rechnete — dreimal falscher Alarm, und einmal hätte er beinahe
in die falsche Richtung geschickt.

Die Antwort ist nicht, die Schwellen aufzuweichen; dann misst der Test nichts
mehr. Sie ist, vorher zu fragen, ob überhaupt zu messen ist. `fluss-test` liest
`os.loadavg()`, und liegt die Last über einem Viertel der Kernzahl, werden alle
gedrosselten Messungen **gemeldet, aber nicht bewertet** — sichtbar als `--`
in der Ausgabe, damit niemand sie für gelaufen hält.

Zwei Dinge daran waren erst falsch:

**Der Lastmesser.** Zuerst ein fester Rechenlauf im Browser unter derselben
Drosselung. Der Zähler *stieg* unter Last, statt zu fallen — eine Zahl, die in
die falsche Richtung zeigt, ist schlimmer als keine. Deshalb die Systemlast.

**Der Umfang.** Die Schranke deckte zuerst nur die zwei Ladezeiten ab. Unter
künstlicher Last (9,64 statt 1,8) fielen die sechs Bildraten-Messungen weiter
durch — sie messen dasselbe. Jetzt gehen **alle zehn** hindurch, nachgeprüft
unter Last: bei 8,72 wurde jede gemeldet und keine bewertet, die Reihe lief
ohne einen einzigen Fehler durch.

Ein Test, der bei Last rot wird, erzieht dazu, rote Tests zu ignorieren. Das
ist teurer als jede Schwelle.

## Android, iOS und Windows

Drei Wege auf den Home-Bildschirm, und lange gab es nur zwei Anleitungen: iOS
und „alles andere". Android und Windows bekamen dieselben drei vagen Zeilen und
mussten selbst herausfinden, wo der Punkt sitzt.

**Die Anleitung kennt drei Geräte.** Das Gerät wird beim Öffnen erkannt und
genau eine Anleitung eingeblendet — `#stepsIos`, `#stepsAndroid`,
`#stepsDesktop`, plus `#stepsOther` als Rückfall für alles, was in keine der
drei Schubladen passt:

| | Weg |
|---|---|
| iOS | Safari → Teilen → Zum Home-Bildschirm (die vier bebilderten Schritte) |
| Android | ⋮ → App installieren; in Firefox und Samsung Internet heißt es *Zum Startbildschirm hinzufügen* |
| Windows & Schreibtisch | Zeichen rechts in der Adressleiste; sonst Edge: *Apps → Diese Website als App installieren*, Chrome: *Streamen, Speichern und Teilen → Seite als App installieren* |

**iOS und Android sind beide bebildert.** Vier Schritte, je mit einer kleinen
Zeichnung im selben Maß (300 × 66) und demselben Ring, der auf die Stelle
zeigt: bei iOS Teilen-Symbol → Liste → *Hinzufügen* → Home-Bildschirm, bei
Android die drei Punkte → Menüzeile *App installieren* → der Dialog mit
*Installieren* → Home-Bildschirm. Vorher hatte Android vier nackte Textzeilen
— das ist eine Liste, kein Tutorial. Die Zeichnungen laufen im selben Takt
durch (`schrittRing`, `schrittRahmen`, `schrittNummer`), ohne dass dafür etwas
dazugekommen wäre: die Regeln hängen an `.steps li:nth-child(n)` und greifen
für jede Liste.

Der Schreibtisch bleibt bei Text — dort ist die Stelle eine Adressleiste, und
die zu zeichnen erklärt weniger als sie zu benennen.

Eine Falle dabei: zwei `<clipPath>` mit derselben Kennung brechen jedes
`url(#…)` im ganzen Dokument, und zwar still. `plattform-test` sammelt deshalb
alle `id`-Attribute der Seite ein und prüft, dass keines zweimal vorkommt.

**Wo der Browser selbst kann, geht der Dialog vor.** Android und der
Schreibtisch liefern `beforeinstallprompt` — ein Tipp statt vier Schritten. Das
galt bisher nur für den Knopf im Kopf; die Sperre im Browser („So geht's") und
der Streifen am unteren Rand öffneten stur die Anleitung, obwohl der Browser die
Installation mit einem Tipp erledigt hätte. Jetzt gehen alle drei denselben Weg.
Lehnt der Dialog ab, wird er zurückgelegt, damit der Knopf nicht ins Leere
läuft; gibt es ihn nicht, bleibt die Anleitung.

**`viewport-fit=cover`** hat gefehlt. Ohne das liefert `env(safe-area-inset-*)`
konstant 0 — und genau darauf standen zwei Stellen: der Schließen-Knopf der Lupe
(sonst unter der Dynamic Island) und der Installationsstreifen unten (sonst
unter dem Home-Indikator).

**Das Manifest** war zu dünn für die großen Installationsfenster. Chrome auf
Android und Edge auf Windows zeigen sie nur, wenn `screenshots` da sind — sonst
bleibt es beim schmalen Streifen am unteren Rand. Dazugekommen sind
`id`, `description`, `categories`, `display_override` (mit `minimal-ui` als
Rückfall), ein Schnellzugriff auf die Meldungen (`/?meldungen=1` — ein Weg, den
die Seite wirklich kennt) und zwei Ansichten:

| Datei | Größe | `form_factor` |
|---|---|---|
| `ansicht-schmal.png` | 390 × 844 | `narrow` |
| `ansicht-breit.png` | 1280 × 800 | `wide` |

Beide entstehen aus der laufenden Seite (`schuss.mjs`), nicht aus einem
Bildbearbeiter — sie zeigen also immer, was wirklich dasteht. Und beide müssen
**ohne Anmeldung** zu holen sein: das Installationsfenster baut der Browser,
nicht die Seite. Das Tor lässt `/ansicht-` deshalb durch, wie `/icon-` und
`/og-preview`.

Auch das „schon installiert"-Erkennen kannte nur `standalone`. Auf Windows
läuft eine installierte App je nach Fenster als `minimal-ui` oder
`window-controls-overlay` — dort stand der Knopf *App installieren* also noch
in einer bereits installierten App. Alle drei zählen jetzt.

`plattform-test` prüft das mit drei gestellten Kennungen (iPhone, Pixel,
Windows/Edge): dass je genau eine Anleitung sichtbar ist, dass ihr Text auf die
richtige Stelle zeigt, dass Manifest und Ansichten vollständig und ohne
Anmeldung erreichbar sind — und dass ein Tipp auf *App installieren* den Dialog
des Browsers ruft statt der Anleitung, aber ohne Dialog die Anleitung aufgeht.

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

### Die Verwaltung ist **nicht** ausgenommen

Sie war es. Die Begründung: wer die Liste pflegt, braucht sie auch unterwegs im
Browser. Das stimmt für die **Verwaltungsseiten** — und die sind ohnehin nicht
gesperrt. Für die Liste selbst stimmte es nie: wer sie pflegt, sollte sie sehen
wie alle anderen, sonst pflegt er etwas, das er selbst nie zu Gesicht bekommt.
Und die Meldungen kommen auch bei ihm nur in der App an.

Also gilt die Sperre für alle. Wer die Liste auf dem Telefon sehen will, legt
sie auf den Home-Bildschirm — die Verwaltung eingeschlossen.

Das Zeichen `rcp_frei=1` **bleibt**, es hat nur noch eine Aufgabe: es steuert,
ob der Wegräumen-Knopf im Meldungsblatt dasteht. Die Seite kann die Rolle nicht
selbst wissen — der Sitzungs-Keks ist `HttpOnly`, kein Skript kommt daran. Im
**Tor** ist die Unterschrift ohnehin schon geprüft, also legt es der Verwaltung
ein lesbares Zeichen daneben. Nur an Seiten, nicht an jedes Symbol: sonst hinge
an jeder Anfrage ein `Set-Cookie`.

Das Zeichen folgt der Rolle, nicht dem Gerät: bei jedem Seitenaufruf wird es neu
gesetzt oder gelöscht. Wer die Verwaltung abgibt, hat es beim nächsten Aufruf
nicht mehr. Ob wirklich gelöscht werden darf, entscheidet weiterhin die
Function am Konto — das Zeichen steuert nur, ob der Knopf sichtbar ist.

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

### Das Bild selbst — drei Anläufe

**Erster Anlauf: still und beliebig.** Symbol, Titel, zwei Zeilen, alles
mittig, viel Luft. In einem Chat voller Vorschaukarten fiel das nicht auf —
und es sagte auch nicht, was die Seite eigentlich ist.

**Zweiter Anlauf: laut.** Titel über die volle Breite, Kürzel in Kästen, die
Kurve kräftig hinter allem. Fiel auf, drückte aber.

**Dritter Anlauf: edel.** Und edel heißt nicht leise — es heißt, dass nichts
um Aufmerksamkeit rangelt. Also eine klare Ordnung statt vieler lauter Teile:

- eine Haarlinie unter dem Kopf, eine über den Kürzeln, dazwischen Ruhe
Es zeigt jetzt, was hinter dem Link liegt: derselbe dunkle Grund, dasselbe
Glas, dieselben Symboltasten, dasselbe App-Zeichen. Vorher war es die helle
Fassung aus der Zeit davor — eine Vorschau, die eine andere App versprach als
die, die dann aufging.

Auf der Glasscheibe: Name und *Zugang auf Anfrage*, darunter *Watchlist*, der
Titel, die drei Stichworte und die Kürzel als Tasten. Am Fuß ein schmales
Kerzenband — der Inhalt endet **darüber**. Ragt die Karte hinein, schauen unten
Bruchstücke von Kerzen hervor, und die lesen sich als Rest, nicht als Zeichnung.

**Gerendert, nicht gezeichnet.** `vorschaubild.mjs` baut die Seite in
1200 × 630 und schießt sie ab — und holt sich die Marken dafür aus
`index.html` selbst: der `:root`-Block wird herausgeschnitten und eingesetzt.
Damit benutzt das Bild denselben Grund, dieselben Glasmarken, dieselben Radien
und dieselben Farben wie die Seite, statt einer Nachbildung, die beim nächsten
Nachbessern zurückbleibt.

Das Skript stand hier beschrieben, **lag aber nirgends**: es war ein
Wegwerf-Skript, und das Bild daneben war ein Stand, den niemand mehr erzeugen
konnte. Jetzt liegt es dabei.

**256 Farben mit Streuung.** Roh sind es 821 kB — über der Grenze von 600, die
`sw-test` prüft. Der Grund ist die Körnung: feines Rauschen ist für einen
PNG-Packer der schlimmste Fall, jeder Punkt anders als sein Nachbar. Eine
Palette mit Streuung löst das, ohne die Körnung aufzugeben: **350 statt
821 kB**. Ohne Streuung wären die dunklen Verläufe wieder gestreift — genau
das, wogegen die Körnung überhaupt da ist.

Das Skript baut **beide** Anstriche aus derselben Vorlage (`ANSTRICH` darin),
damit die Entscheidung eine Zeile bleibt und nicht eine zweite Gestaltung:
`og-preview.png` ist im Einsatz, `og-preview-black.png` liegt auf demselben
Stand daneben. Zum Wechseln die vier `og:image`- und `twitter:image`-Zeilen in
`index.html` und `anmelden.html` umbiegen — und die Nummer hoch, sonst bleibt
bei den Diensten die alte Karte stehen.

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

Es trägt dasselbe Motiv wie der Hintergrund: vier Kerzen, steigende hohl,
fallende gefüllt, ein Rücksetzer und ein Anstieg, der höher endet als er begann.
Von Hand gesetzt, nicht gewürfelt — ein Zufallsweg sieht auf 40 Pixeln nach
nichts aus.

**Die Kachel war weiß**, weil die App hell war. Sie ist dunkel geworden, und ein
weißes Symbol daneben sieht aus wie eine andere App. Jetzt dieselbe Machart wie
die Fenster in der Liste:

| | |
|---|---|
| dunkler Verlauf | von `#222927` oben nach `#090c0b` unten |
| zwei Farbfelder | kühl oben links, warm oben rechts — sehr schwach |
| Lichtstreifen | schmal, 148°, quert die obere linke **Ecke** |
| Lichtkante | oben, hell in der Mitte, zu den Ecken hin aus |

Kein Frost, kein Rundfunkeln, keine Spiegelung: ein Symbol ist auf dem
Startbildschirm 40 bis 60 Pixel groß. Alles, was feiner ist als ein Prozent der
Kante, verschwindet dort — oder wird zu Matsch. Geblieben ist, was auch bei
40 Pixeln noch zwei Dinge sagt: dunkles Glas, Licht von oben links.

Zwei Anläufe brauchte der Streifen. Beim ersten stand er auf 0,17 und begann
bei t=0 — auf fast schwarzem Grund wirkt derselbe Wert viel stärker als auf
einer Karte, und von der Ecke an ist es kein Streifen, sondern eine aufgehellte
Ecke. Jetzt 0,115, und er beginnt erst hinter der Ecke.

**`logo.py` zeichnet direkt PNG**, nicht mehr über SVG: für SVG braucht es
einen Rasterer, und der ist auf keiner Maschine sicher vorhanden. Pillow ist es.
Jede Größe wird **nativ** gezeichnet statt heruntergerechnet — die Lichtkante
ist einen Pixel dick und würde beim Verkleinern zu Grau verwaschen.

| Datei | Größe | |
|---|---|---|
| `icon-180.png` | 180 | |
| `icon-192.png` | 192 | |
| `icon-512.png` | 512 | |
| `icon-maskable-512.png` | 512 | Zeichen auf 70 % |

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

## Was dazugekommen ist

Beim Start, **über die ganze Seite, einmal**: was seit dem letzten Besuch neu
ist. Kein Blatt — ein Blatt lässt sich wegwischen und wirkt beiläufig; hier
soll es einmal richtig dastehen.

**Wann es kommt.** Nur wenn es wirklich etwas gibt, und nur beim Start.
Maßgeblich ist ein eigener Stand (`rcp:neuseit`), nicht der der Glocke: die
Glocke gilt als gelesen, sobald man sie aufmacht — der Schirm erst, wenn man
ihn weggeklickt hat. Wer die App wegdreht, ohne hingesehen zu haben, bekommt
ihn beim nächsten Mal wieder.

**Wann es nicht kommt:**

- beim **allerersten** Start — da gibt es kein „seit dem letzten Mal", und
  eine Liste von Dingen, die man noch gar nicht kennen kann, wäre nur Lärm.
  Der Stand wird dann still gesetzt. **Aber nur auf einem wirklich frischen
  Gerät**: wer die App schon hatte, hat einen Lesestand in der Glocke, und
  der wird übernommen. Ohne das verschluckte ausgerechnet der erste Start
  nach der Aktualisierung genau das, wofür der Schirm gebaut ist — und der
  Schirm blieb aus, obwohl gerade etwas veröffentlicht worden war.
- wenn der Rundgang läuft, die Installations-Anleitung offen ist oder die
  Glocke schon aufgeschlagen — nichts stapelt sich übereinander.
- im Browser (`nur-web`).
- wenn man die Glocke schon aufgemacht hat: dann ist es gesehen.

**Wie es sich bewegt.** Dahinter laufen dieselben Kerzen wie hinter dem
Ladebildschirm — verschoben, nicht kopiert, das Bild ist groß. Sie werden
**gesichert, bevor der Ladebildschirm aus dem Dokument genommen wird** (600 ms
nach dem Ausblenden), sonst wäre es ein Wettlauf. Zeile, Überschrift, jeder
Eintrag und der Knopf kommen nacheinander herein, gekippt und aus 0,94
Größe; der Vorlauf je Eintrag kommt aus dem Skript, das weiß, wie viele es
sind. Hinaus geht es wie bei den Blättern: länger, weiter, mit eigener Kurve.

Ein Tipp auf einen Eintrag fährt den Schirm weg und schlägt die Meldung in
der Glocke auf.

**Eine Falle, in die ich prompt gelaufen bin:** `.neuheit { display: flex }`
schlägt das `hidden`-Attribut. Ohne ein ausdrückliches
`.neuheit[hidden] { display: none }` lag der Schirm unsichtbar über der ganzen
Seite, fing jeden Tipp ab, und die Kerzen dahinter liefen durchgehend mit —
dieselbe Falle wie beim Dateifeld in der Verwaltung. `neuheit-test` prüft das
jetzt mit `elementFromPoint` nach.

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

Ganz unten steht der **Willkommensgruß**. Er wird in der App erzeugt, nicht
verschickt: eine Meldung zum Einzug, die niemanden weckt.

**Und er geht nach 24 Stunden.** Er sagt, wofür die Glocke gut ist — das muss
man einmal lesen, nicht jedes Mal. Bliebe er liegen, wäre er nach einer Woche
der älteste Eintrag und stünde trotzdem noch unter allem, was seither passiert
ist; ein Hinweis, der sich nicht verabschiedet, wird zum Möbel. Maßgeblich ist
`rcp:seit`, der Zeitpunkt des Einzugs auf diesem Gerät — auf dem
Home-Bildschirm hat die App ihren eigenen Speicher, dort zählt also der erste
Start dort.

Damit kann die Liste zum ersten Mal wirklich **leer** sein. Eine leere Fläche
liest sich wie ein Fehler, nicht wie „nichts passiert" — deshalb steht dort
jetzt eine Zeile: *Noch nichts. Hier landen Kurse in ihrer Einkaufszone, neue
Positionen und Nachrichten.* Die Glocke selbst bleibt erreichbar, nur ohne
Zähler.

`willkommen-test` prüft alle drei Zeitpunkte über `rcp:seit` — frisch, nach 23
Stunden, nach 25 — dazu, dass eine echte Meldung die leere Zeile verdrängt und
der Gruß im frischen Fall unter ihr steht.

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

#### Zufahren ist nicht Auffahren rückwärts

Beim Auffahren sieht man, wohin man kommt — da ist Kürze richtig. Beim
Zufahren sieht man nur noch, dass es weggeht, und mit derselben Dauer und
demselben Weg las sich das wie ein Abschalten: das Blatt war fort, ehe der
Blick nachkam.

Das Zufahren hat deshalb eine **eigene Klasse** (`zufahrt`). Über `.da` allein
ließe sich nur die Dauer trennen, nicht der Weg: die Stelle, an der das Blatt
beim Zufahren ankommt, ist dieselbe, von der es beim Auffahren startet.

| | Auffahren | Zufahren |
|---|---|---|
| Weg | von 100 % Höhe | auf **118 %**, dazu `scale(0.90)` und 9° nach hinten |
| Dauer | 360 ms | **560 ms** |
| Kurve | `--weich` | `cubic-bezier(0.45, 0, 0.55, 1)` |

**Die Kurve war wichtiger als die Dauer.** `--weich` ist stark vorgezogen: nach
einem knappen Drittel der Zeit ist damit fast alles vorbei, und länger machen
ändert daran nichts — es wartet dann nur hinterher. Der erste Versuch mit 540
statt 360 ms sah deshalb genauso aus wie vorher. Der Test hält das jetzt fest:
**nach 200 ms muss das Blatt zwischen 10 und 62 % des Weges stehen**, also
sichtbar unterwegs sein.

Während es wegfährt, nimmt es keine Tipps mehr an (`pointer-events: none`), und
das Scrollen der Seite wird **sofort** freigegeben statt erst nach der halben
Sekunde. Sonst läge eine gute halbe Sekunde lang ein unsichtbarer Deckel über
der Liste.

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

## Wenn der Speicher seine Liste verschläft

Eine Zugangsanfrage kam als Meldung sofort an — in der Verwaltung stand sie
aber erst **zwei Minuten später**, und so lange ließ sie sich auch nicht
freigeben. Dahinter steckten zwei Ursachen.

### 1. Die Verwaltung sah nur einmal nach

Die Liste der Zugänge wurde beim Öffnen der Seite geladen und dann nie wieder.
Wer die Verwaltung offen liegen hatte, bekam eine neue Anfrage gar nicht zu
sehen. Jetzt sieht sie nach wie die Anwesenheitsliste daneben: **alle 20
Sekunden**, beim Zurückkommen in den Vordergrund, und **sofort**, wenn der
Service Worker eine Meldung durchreicht.

### 2. Die Liste des Speichers hinkt hinterher

Netlify Blobs ist beim **Auflisten** nur nachträglich auf dem Stand. Ein eben
geschriebener Eintrag steht unter seinem Schlüssel sofort da — in
`store.list()` taucht er erst nach einer Weile auf. Genau die Lücke, in der
die Meldung schon beim Empfänger ist und die Anfrage noch nirgends steht.

Deshalb führt jeder betroffene Speicher jetzt ein **Verzeichnis**: einen
einzigen Eintrag unter dem Schlüssel `verzeichnis`, in dem die Schlüssel
stehen. Er wird beim Schreiben mitgepflegt und beim Lesen ausdrücklich frisch
geholt (`consistency: "strong"`).

**Gelesen wird beides und vereinigt** (`schluesselListe()` in `sitzung.js`).
Das Verzeichnis ist der schnelle Weg, `store.list()` der verlässliche: geht
eine Pflege daneben — zwei Anmeldungen in derselben Sekunde können sich
überschreiben —, holt die Liste den Eintrag nach. Ein Verzeichnis, das man
blind glaubt, wäre schlimmer als gar keins.

### 3. Auch `get()` antwortet mit dem Stand von vorhin

Das Verzeichnis allein reichte nicht. Es liefert den **Schlüssel** sofort —
das anschließende `store.get(key)` aber immer noch den alten Stand, und ohne
Vorgänger heißt das: `null`. Aufgefallen ist es an einer eben
veröffentlichten Position (OXY), zu der weder Knopf noch Meldung kamen.

Wo eine Antwort über Zugang, Anzeige oder **Löschen** entscheidet, steht
deshalb jetzt überall `{ consistency: "strong" }`:

| Stelle | warum es sonst schiefgeht |
| --- | --- |
| `positionen.js` `lesen()` | eine frisch gespeicherte Position fehlt in der App |
| `sitzung.js` `kontoLesen()` | wer gerade freigegeben wurde, gilt noch als wartend |
| `konto.js` (4 Stellen, `alleKonten()`) | die Verwaltung sieht die Anfrage nicht |
| `meldungen.js` `buch()` | eine neue Meldung liest sich als `null` — und `buch()` **löscht** sie dann |
| `bild.js` (GET und `aufraeumen()`) | dasselbe, nur mit Bildern: das Aufräumen frisst frisch Hochgeladenes |
| `artikel.js` | ein eben gespeicherter Beitrag ist nicht da |

Die letzten drei sind die gefährlichen: dort führt ein veraltetes `null` nicht
zu "kommt gleich", sondern zu "weg für immer".

Umgestellt sind `aktien-konten` (Zugänge), `aktien-meldungen` (Glocke),
`aktien-positionen`, `aktien-bilder` und `aktien-artikel`. **Nicht** umgestellt
ist die Geräteliste für Push (`sub-`): dieselbe Klasse, aber sieben Lesestellen
in sieben Functions, und praktisch folgenlos — Alarme laufen ohnehin nur alle
30 Minuten.

`traege-test` stellt einen Speicher, der beides nachstellt: `list()`
verschweigt alles Neue, `get()` antwortet mit dem Stand von damals, solange
nicht ausdrücklich frisch verlangt wird. Darin läuft der ganze Weg — Anfrage
anlegen, sofort sehen, sofort freigeben, Meldung in der Glocke, Löschen — und
eine neue Position, die sofort in der Liste stehen muss. Gegen den alten Stand
fällt die Reihe durch. `anfrage-test` prüft dasselbe im Browser, ohne ein
einziges Neuladen.

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
