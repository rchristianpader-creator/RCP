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

export default async () => {
  return new Response(JSON.stringify({ ok: false, fehler: "kein Endpunkt" }), {
    status: 404,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
};
