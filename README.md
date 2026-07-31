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

Push gibt es nur für wirklich neue Positionen. Ein UPDATE ist eine Notiz an der
Karte, kein Anlass, jemanden zu wecken.

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

Zugangsanfragen tragen `nur: "chef"` und gehen niemanden sonst etwas an.
Einträge älter als 60 Tage werden beim Nachsehen weggeräumt.

## Beiträge

Bis hierher kam alles, was in der Liste „News" hieß, von außen: die
Schlagzeilen in den Karten von Yahoo, das Laufband ganz oben stand als Text
in `index.html`. Etwas Eigenes zu veröffentlichen ging nur über den Code.

Jetzt gibt es in der Verwaltung **Beitrag veröffentlichen**: Überschrift, Text,
ein Haken für „Alle benachrichtigen". Was dabei entsteht, geht drei Wege in die
App:

1. Das **Band ganz oben** zeigt den neuesten Beitrag und führt zu ihm. Steht
   noch keiner, bleibt der fest eingebaute Text stehen.
2. Der Knopf **Beiträge** im Fuß öffnet die Liste. Er zeigt sich nur, wenn es
   etwas zu lesen gibt.
3. Eine **Push-Meldung** mit `?beitrag=<id>`, und derselbe Eintrag in der
   Glocke. Ein Tipp darauf öffnet den Beitrag im Blatt, ohne die Seite neu zu
   laden — die App ist ja schon offen.

Gelesen wird in einem Blatt: Überschrift, Datum, Verfasser, Text. Leerzeilen
trennen Absätze, mehr Auszeichnung gibt es nicht. Gesetzt wird über
`textContent`, nie über `innerHTML` — was in der Verwaltung getippt wird, ist
Text und kein Markup. Unten steht **Als Bild teilen**, dasselbe Bild wie bei
den Nachrichten, wieder ohne Adresse.

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

**Zurücknehmen** löscht den Beitrag. Der Eintrag in der Glocke bleibt stehen —
ein Tipp darauf sagt dann „Dieser Beitrag wurde zurückgenommen".

## Eine Meldung weitergeben

Oben rechts in jedem News-Kasten steht **Teilen**. Was dabei herauskommt, ist
ein Bild — kein Link.

Der Grund: ein gewöhnliches `navigator.share` mit `url` hängt in WhatsApp die
Adresse an die Nachricht. Genau das soll nicht passieren. Geteilt wird deshalb
eine Datei, und der Aufruf trägt **kein** `url`-Feld:

```js
navigator.share({ files: [datei], title: titel, text: titel })
```

Das Bild wird an Ort und Stelle gezeichnet, 1080 × 1080, im Zuschnitt der App:
`#fafafa` als Grund, oben links das Symbol mit denselben runden Ecken wie auf
dem Telefon, daneben „AKTIEN-LISTE" und der Name der Position. Die Überschrift
steht groß in der Mitte und bekommt bis zu acht Zeilen; was nicht mehr passt,
endet mit drei Punkten statt mitten im Wort. Unten ein Haarstrich, der Name und
das Kürzel. Nirgends eine Adresse.

Gezeichnet, nicht geholt: ein fremdes Vorschaubild würde die Leinwand verderben
(cross-origin), und dann ließe sie sich nicht mehr ausgeben. Das Symbol ist von
hier, das geht.

Wo Dateien nicht geteilt werden können — ältere Browser, Schreibtisch — wird
das Bild heruntergeladen und die Überschrift in die Zwischenablage gelegt. Auch
dann ohne Adresse.

Der Knopf zeigt sich erst, wenn wirklich Meldungen geladen sind
(`.news-block[data-live="1"]`); vorher gäbe es nichts zu teilen. Im Browser
steht er gar nicht erst da, dort ist die Liste ohnehin zu.

**Der Empfänger kann den Artikel damit nicht öffnen.** Das ist der Preis
dafür, dass keine Adresse zu sehen ist — beides zusammen geht nicht. Soll der
Link mitkommen, ist es eine Zeile: `url` in den Aufruf, und WhatsApp hängt ihn
wieder an.

Der Test greift genau darauf ab: der Aufruf darf kein `url`-Feld tragen, und
**jedes einzelne Wort**, das auf die Leinwand gemalt wird, wird gegen
`https?:`, `://`, `www.`, `netlify` und Endungen wie `.de`/`.com`/`.app`
gehalten.

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
