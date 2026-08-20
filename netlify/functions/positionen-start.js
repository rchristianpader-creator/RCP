/* Der Bestand, wie er bis jetzt in index.html stand.

   Diese Liste wird genau einmal gebraucht: beim allerersten Aufruf von
   positionen.js, wenn im Blobs-Store noch nichts liegt. Danach ist der Store
   die Wahrheit und diese Datei nur noch Geschichte — Aenderungen hier haben
   keine Wirkung mehr.

   Kein Endpunkt; der Default-Export sagt nur 404. */

export const START = [
  {
    "id": "uaa",
    "name": "Under Armour, Inc.",
    "badge": "UAA",
    "chip": "UAA",
    "neu": false,
    "branche": "Performance Apparel",
    "zone": "6,01 – 5,70 USD",
    "ziel": "14,44 USD",
    "tv": "NYSE:UAA",
    "yahoo": "UAA",
    "frage": "Under Armour Aktie",
    "fn": "https://www.finanzen.net/nachrichten/alle/under_armour",
    "keys": "Under Armour|UAA",
    "fibo": "https://de.tradingview.com/chart/IsFAfevG/"
  },
  {
    "id": "dow",
    "name": "Dow, Inc.",
    "badge": "DOW",
    "chip": "DOW",
    "neu": false,
    "branche": "Chemie & Materialien",
    "zone": "29,52 – 27,05 USD",
    "ziel": "88,90 USD",
    "tv": "NYSE:DOW",
    "yahoo": "DOW",
    "frage": "Dow Aktie",
    "fn": "https://www.finanzen.net/nachrichten/alle/dow",
    "keys": "Dow Inc|Dow Chemical|DOW",
    "fibo": "https://de.tradingview.com/chart/anWHZ0Ot/"
  },
  {
    "id": "nvo",
    "name": "Novo Nordisk A/S",
    "badge": "NVO",
    "chip": "NVO",
    "neu": false,
    "branche": "Pharma",
    "zone": "42,67 – 40,75 USD",
    "ziel": "76,23 USD",
    "tv": "NYSE:NVO",
    "yahoo": "NVO",
    "frage": "Novo Nordisk Aktie",
    "fn": "https://www.finanzen.net/nachrichten/alle/novo_nordisk",
    "keys": "Novo Nordisk|NVO",
    "fibo": "https://de.tradingview.com/chart/01o3MapY/"
  },
  {
    "id": "tsla",
    "name": "Tesla, Inc.",
    "badge": "TSLA",
    "chip": "TSLA",
    "neu": false,
    "branche": "Elektrofahrzeuge & AI",
    "zone": "263 – 226 USD",
    "ziel": "793 USD",
    "tv": "NASDAQ:TSLA",
    "yahoo": "TSLA",
    "frage": "Tesla Aktie",
    "fn": "https://www.finanzen.net/nachrichten/alle/tesla",
    "keys": "Tesla|TSLA",
    "fibo": "https://de.tradingview.com/chart/nJwqfuat/"
  },
  {
    "id": "btc",
    "name": "Bitcoin",
    "badge": "BTCUSD",
    "chip": "BTC",
    "neu": false,
    "branche": "Kryptowährung",
    "zone": "44.098 – 34.496 USD",
    "ziel": "95.030 USD",
    "tv": "BINANCE:BTCUSDT",
    "yahoo": "BTC-USD",
    "frage": "Bitcoin Kurs",
    "fn": "https://www.finanzen.net/nachrichten/alle/bitcoin",
    "keys": "Bitcoin|BTC|Krypto",
    "fibo": "https://de.tradingview.com/chart/GL9h1XoG/"
  },
  {
    "id": "hut",
    "name": "Hut 8 Corp.",
    "badge": "HUT",
    "chip": "HUT",
    "neu": false,
    "branche": "Bitcoin Mining / HPC",
    "zone": "28,94 – 19,97 USD",
    "ziel": "140,04 USD",
    "tv": "NASDAQ:HUT",
    "yahoo": "HUT",
    "frage": "Hut 8 Aktie",
    "fn": "https://www.finanzen.net/nachrichten/alle/hut_8",
    "keys": "Hut 8|Hut8|HUT",
    "fibo": "https://de.tradingview.com/chart/Z0bGwKnE/"
  },
  {
    "id": "gold",
    "name": "Gold Spot",
    "badge": "XAUUSD",
    "chip": "Gold",
    "neu": false,
    "branche": "Edelmetall",
    "zone": "3.763 – 3.330 USD",
    "ziel": "5.101 – 6.258 USD",
    "tv": "OANDA:XAUUSD",
    "yahoo": "GC=F",
    "frage": "Goldpreis",
    "fn": "https://www.finanzen.net/rohstoffe/goldpreis",
    "keys": "Goldpreis|Gold",
    "fibo": "https://de.tradingview.com/chart/KAott5wx/"
  },
  {
    "id": "silber",
    "name": "Silber",
    "badge": "XAGUSD",
    "chip": "Silber",
    "neu": false,
    "branche": "Edelmetall",
    "zone": "45,43 – 39,50 USD",
    "ziel": "172 – 892 USD",
    "tv": "OANDA:XAGUSD",
    "yahoo": "SI=F",
    "frage": "Silberpreis",
    "fn": "https://www.finanzen.net/rohstoffe/silberpreis",
    "keys": "Silberpreis|Silber",
    "fibo": "https://de.tradingview.com/chart/XXF0Fgrb/"
  },
  {
    "id": "intc",
    "name": "Intel Corporation",
    "badge": "INTC",
    "chip": "INTC",
    "neu": true,
    "branche": "Halbleiter",
    "zone": "50,12 – 39,19 USD",
    "ziel": "295,75 USD",
    "tv": "NASDAQ:INTC",
    "yahoo": "INTC",
    "frage": "Intel Aktie",
    "fn": "https://www.finanzen.net/nachrichten/alle/intel",
    "keys": "Intel|INTC",
    "fibo": "https://de.tradingview.com/chart/EzouZ6ts/"
  },
  {
    "id": "uuuu",
    "name": "Energy Fuels Inc.",
    "badge": "UUUU",
    "chip": "UUUU",
    "neu": true,
    "branche": "Uran & Seltene Erden",
    "zone": "9,44 – 7,31 USD",
    "ziel": "243,56 USD",
    "tv": "AMEX:UUUU",
    "yahoo": "UUUU",
    "frage": "Energy Fuels UUUU Aktie",
    "fn": "https://www.finanzen.net/nachrichten/alle/energy_fuels",
    "keys": "Energy Fuels|UUUU|Uran",
    "fibo": "https://de.tradingview.com/chart/tx3UAbNF/"
  }
];

/* NACHTRAG: Positionen, die aus dem Code dazukommen sollen.

   Die Liste oben gilt nur beim allerersten Aufruf — danach ist der Speicher
   die Wahrheit, und was hier steht, hat keine Wirkung mehr. Das war richtig
   gedacht und hatte eine Luecke: es gab keinen Weg mehr, eine Position aus
   dem Code hinzuzufuegen. Wer eine ergaenzen wollte, musste sie von Hand in
   der Verwaltung eintippen.

   Diese Liste schliesst die Luecke. Jeder Eintrag traegt einen Schluessel;
   ist er im Speicher vermerkt, passiert nichts mehr. Damit gilt:

   - Ein Nachtrag wirkt genau einmal, egal wie oft die Liste gelesen wird.
   - Eine Position, die spaeter in der Verwaltung geloescht wird, kommt NICHT
     zurueck — der Schluessel bleibt vermerkt.
   - Steht die id schon in der Liste, wird nichts angefuegt. Zwei Aufrufe im
     selben Augenblick koennen also hoechstens eine Meldung doppelt schicken,
     nie eine Position doppelt anlegen.

   Der Schluessel gehoert zum Nachtrag, nicht zur Position: wer denselben
   Eintrag spaeter noch einmal nachtragen will, gibt ihm einen neuen. */
export const NACHTRAG = [
  {
    "schluessel": "ftg-2026-08",
    "position": {
      "id": "ftg",
      "name": "FIT Group AG",
      "badge": "FTG",
      "chip": "FTG",
      "neu": true,
      "branche": "Gesundheitsprodukte",
      /* Preise stehen in Euro und bleiben es — FIT Group notiert im direct
         market plus der Wiener Boerse (ISIN DE000A426PD9, WKN A426PD). Die
         Umrechnung der Liste greift nur bei USD. */
      "zone": "16,15 – 15,15 EUR",
      "ziel": "27,30 – 32,90 EUR",
      /* Wien, nicht Xetra — und deshalb .VI.

         Der erste Anlauf hier war FTG.DE, aus der Annahme, eine deutsche
         ISIN heisse Handel in Deutschland. Falsch: die Aktie notiert im
         direct market plus der WIENER Boerse, in Deutschland ist sie nur
         ausserboerslich ueber Lang & Schwarz handelbar. Auf der Karte stand
         entsprechend "Kein Kurs".

         Danach stand das Feld leer, weil Yahoo unter FTG eine kanadische
         Firma fuehrt (Firan Technology Group) — ein blankes FTG haette still
         den Kurs eines fremden Papiers gezeigt.

         Jetzt FTG.VI: TradingView fuehrt die Aktie als VIE:FTG, und .VI ist
         Yahoos Kuerzel fuer die Wiener Boerse. Das ist keine Vermutung mehr,
         sondern die Konvention zur bestaetigten Boerse — und ein Suffix
         zeigt immer auf genau diese Boerse, kann also nicht versehentlich
         eine andere Firma treffen.

         Bleibt es trotzdem bei "Kein Kurs", fuehrt Yahoo dieses
         MTF-Segment nicht. Dann ist der Analyse-Chart der Chart, und das
         Feld gehoert wieder geleert.

         tv bleibt leer: seit dem Umbau auf eigene Charts benutzt es
         niemand mehr. */
      "tv": "VIE:FTG",
      "yahoo": "FTG.VI",
      "frage": "FIT Group AG Aktie",
      "fn": "https://www.finanzen.net/aktien/fit_group-aktie",
      "keys": "FIT Group|FTG|FitGun",
      "fibo": "https://de.tradingview.com/chart/WaxXaF87/"
    }
  },
  {
    "schluessel": "arm-2026-08",
    "position": {
      "id": "arm",
      "name": "ARM Holdings plc",
      "badge": "ARM",
      "chip": "ARM",
      "neu": true,
      "branche": "Halbleiter",
      /* Beide Spannen aus dem Analyse-Chart abgelesen:

           Kaufzone   das untere graue Band, 50,0 % (189,43) bis
                      61,8 % (154,49) — hoeherer Wert zuerst, wie ueberall
           Kursziel   das obere Band mit dem C, 161,8 % (764,15) bis
                      200,0 % (1.301,48)

         Notiert in Dollar, also rechnet die Liste die Euro-Zeile darunter
         selbst — anders als bei FIT Group, wo die Preise fest in Euro
         stehen. */
      "zone": "189,43 – 154,49 USD",
      "ziel": "764,15 – 1.301,48 USD",
      "tv": "NASDAQ:ARM",
      /* Blank, und das ist hier richtig: ARM notiert als Sponsored ADR an
         der NASDAQ, Yahoo fuehrt genau diese Aktie unter ARM (ISIN
         US0420682058). Bei FIT Group war ein blankes Kuerzel die Falle,
         weil dort eine fremde Firma daruntersteht; ein US-Papier an seiner
         Heimatboerse braucht kein Suffix — dieselbe Schreibweise wie UAA,
         TSLA oder NVO. */
      "yahoo": "ARM",
      "frage": "ARM Holdings Aktie",
      "fn": "https://www.finanzen.net/aktien/arm_holdings-aktie",
      "keys": "ARM Holdings|Arm Ltd",
      "fibo": "https://de.tradingview.com/chart/WntJnQFq/"
    }
  },
  {
    "schluessel": "fet-2026-08",
    "position": {
      "id": "fet",
      "name": "Fetch.ai",
      "badge": "FETUSD",
      "chip": "FET",
      "neu": true,
      /* VEROEFFENTLICHT. Stand hier eine Weile auf true — "nur fuer die
         Verwaltung": sichtbar in der Liste des Chefs und in der Verwaltung,
         sonst nirgends, nicht im Statusabruf, ohne Meldung beim Nachtragen
         und ohne Zonenwache. Eine Zonenmeldung geht an jedes Geraet und
         nennt das Kuerzel; das waere die Position gewesen, nur eben als
         Mitteilung.

         Hier steht es fuer eine FRISCHE Anlage. Speicher, in denen die
         Position schon mit true steht, stellt der Eintrag in AENDERUNG
         weiter unten um — die Quelle allein erreicht sie nicht. */
      "nurchef": false,
      "branche": "Kryptowährung",
      /* Aus dem Wochenchart abgelesen: die Kaufzone ist das graue Band
         zwischen 50,0 % (0,08014477) und 61,8 % (0,04562110). Fuenf
         Stellen reichen — darunter geht es um Bruchteile eines Cents, und
         die Zone ist eine Spanne, keine Marke. */
      "zone": "0,08014 – 0,04562 USD",
      "ziel": "10,00 USD",
      "tv": "BINANCE:FETUSDT",
      "yahoo": "FET-USD",
      "frage": "Fetch.ai Kurs",
      "fn": "https://www.finanzen.net/devisen/fetch.ai-dollar-kurs",
      "keys": "Fetch.ai|FET",
      "fibo": "https://de.tradingview.com/chart/DWzdvP7E/"
    }
  }
];

/* EINMALIGE AENDERUNGEN an Positionen, die schon stehen.

   NACHTRAG kann nur ANLEGEN. Etwas an einer Position, die es schon gibt,
   war aus dem Code heraus nicht zu erreichen: ergaenzen() fuellt nur, was
   leer ist, und tut das mit Absicht — es darf eine Aenderung aus der
   Verwaltung nicht zurueckdrehen. Fuer einen Schalter wie "nur fuer die
   Verwaltung" reicht das nicht; dort ist false ein Wert und keine Luecke.

   Diese Liste macht denselben Handgriff wie NACHTRAG, nur an Bestehendem:
   ein Schluessel, einmal angewandt, dann vermerkt. Sie ist bewusst schmal —
   was hier steht, ueberschreibt, und ueberschreiben ist genau das, was
   ergaenzen() nicht darf.

   Trifft der Eintrag auf keine Position, wird NICHTS vermerkt: er wartet,
   bis es sie gibt. Sonst waere ein Nachtrag, der eine Zeile spaeter
   umgestellt werden soll, still verpufft.

   melden: true schickt danach dieselbe Meldung wie bei einer neuen
   Position. Fuer eine Freigabe ist das richtig — fuer alle anderen ist die
   Position ja wirklich neu. */
export const AENDERUNG = [
  {
    /* Fetch.ai war "nur fuer die Verwaltung" — noch nicht veroeffentlicht.
       Jetzt fuer alle. Damit faellt auch alles andere, was an dem Schalter
       hing: der Kurs im Statusabruf, die Zonenwache, und die Vorstellung
       beim Start (die sucht eine Position, die nurchef UND neu ist — ab
       jetzt findet sie keine mehr). */
    "schluessel": "fet-frei-2026-08",
    "id": "fet",
    "setzen": { "nurchef": false },
    "melden": true
  }
];

export default async () => {
  return new Response(JSON.stringify({ ok: false, fehler: "kein Endpunkt" }), {
    status: 404,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
};
