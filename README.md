# Aktien-Liste · Ralph Christian Pader

Watchlist als installierbare Web-App: TradingView-Live-Charts, Live-News,
Fear & Greed Index und Push-Benachrichtigungen bei Eintritt in eine Einkaufszone.

Alle Kurse, Einkaufszonen und Ziele sind in **USD**, in derselben Währung wie
die Charts, aus denen die Niveaus abgeleitet sind.

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
netlify/functions/vapid.js            Erzeugt und verwaltet das VAPID-Schlüsselpaar
netlify/functions/subscribe.js        Speichert angemeldete Geräte
netlify/functions/alerts.js           Zonen-Prüfung, läuft alle 30 Minuten
netlify/functions/push-test.js        Testmeldung an alle Geräte
netlify/functions/on-publish.js       Meldet nach jedem Deploy, was neu ist

netlify/edge-functions/site-password.js   Optional: Passwort für alle Pfade
```

## Deploy

Publish-Verzeichnis ist `.`, Build-Command bleibt leer. Netlify installiert die
Abhängigkeiten aus `package.json` selbst.

## Benachrichtigungen

1. Seite in Safari öffnen, Teilen → Zum Home-Bildschirm
2. App über das Icon starten (im Safari-Tab liefert iOS kein Push)
3. In der Kopfzeile auf **Benachrichtigungen** tippen
4. Im Blatt **Testmeldung senden** drücken

Danach läuft es allein: `alerts.js` liest Symbole und Einkaufszonen direkt aus
der veröffentlichten `index.html`, prüft alle 30 Minuten und meldet sich nur,
wenn ein Kurs **neu** in seine Zone eintritt. Zwischen 23 und 7 Uhr ist Ruhe.

Änderst du eine Zone im HTML, zieht der Alarm automatisch mit — es gibt keine
zweite Liste zu pflegen.

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

Alle optional. Ohne sie funktioniert die Push-Kette vollständig, die Schlüssel
liegen dann in Netlify Blobs.

| Name | Zweck |
|---|---|
| `SITE_PASSWORD` | Aktiviert den Passwortschutz für alle Pfade |
| `VAPID_PUBLIC` / `VAPID_PRIVATE` | Eigenes Schlüsselpaar statt des automatisch erzeugten |
| `VAPID_SUBJECT` | Kontaktadresse im Push-Header, z. B. `mailto:…` |

## Prüfen

| Adresse | Erwartung |
|---|---|
| `/.netlify/functions/vapid` | `{"publicKey":"B…"}` |
| `/.netlify/functions/push-test` | Testmeldung auf allen angemeldeten Geräten |
| `/.netlify/functions/alerts` | Alle Positionen mit Kurs, Zone und Status |

Der Punkt vor `netlify` gehört dazu. Ohne ihn wäre es ein Dateipfad, keine Function.

## Hinweis

Der PIN vor der Liste prüft im Browser und hält Neugierige ab, mehr nicht.
Echten Schutz gibt nur `SITE_PASSWORD`, weil der auf dem Server greift und auch
für PDF, Icons und Functions gilt.
