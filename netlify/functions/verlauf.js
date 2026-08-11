/* Kursverlauf fuer die eigenen Charts.

   Bis hierher stand in jeder Karte ein TradingView-Rahmen. Der hat drei
   Nachteile, und alle drei sind hier nicht zu beheben: er sieht aus wie
   TradingView und nicht wie diese Seite, er ignoriert die Parameter, mit
   denen man seine Leisten ausblenden soll (hidetoptoolbar, hidelegend,
   hidevolume — alle drei wirkungslos am widgetembed), und er bringt seine
   eigene Hoehe mit, die keine Karte einhaelt.

   Also zeichnet die Seite selbst. Diese Funktion liefert nur die Zahlen.

   Aufruf:  /.netlify/functions/verlauf?sym=NVO&spanne=1T
   Antwort: { ok, punkte: [[zeit, kurs], ...], vorher, waehrung, stand }

   "vorher" ist der Schlusskurs davor — der Bezugspunkt, an dem sich
   entscheidet, ob die Linie gruen oder rot ist, und die gestrichelte Linie
   im Chart.

   Die Quelle ist dieselbe wie in status.js: Yahoo, ohne Schluessel. Deshalb
   liegt ein Zwischenspeicher davor — zehn Karten mal fuenf Zeitraeume waeren
   sonst fuenfzig Abrufe fuer einen einzigen Blick auf die Liste. */

import { getStore } from "@netlify/blobs";

/* Wie weit zurueck und wie fein, je Knopf. Und wie lange die Antwort taugt:
   ein Tagesverlauf ist nach einer Minute alt, ein Jahresverlauf nicht.

   Je Spanne mehrere Versuche, vom feinsten zum groebsten. Nicht jedes Papier
   liefert jede Aufloesung: bei Gold und Silber sind das Futures (GC=F,
   SI=F), und die geben je nach Tageszeit und Kontrakt keine
   Fuenf-Minuten-Reihe heraus — dann kam eine leere Antwort zurueck und die
   Karte blieb leer. Statt aufzugeben wird es eine Stufe groeber versucht.
   Lieber ein etwas grober Tagesverlauf als gar keiner. */
const SPANNEN = {
  "1T": { frisch: 60, versuche: [["1d", "5m"], ["1d", "15m"], ["5d", "30m"]] },
  "1W": { frisch: 300, versuche: [["5d", "30m"], ["5d", "1h"], ["1mo", "1d"]] },
  "1M": { frisch: 1800, versuche: [["1mo", "90m"], ["1mo", "1d"], ["3mo", "1d"]] },
  "1J": { frisch: 3600, versuche: [["1y", "1d"], ["1y", "1wk"], ["2y", "1wk"]] },
  MAX: { frisch: 43200, versuche: [["max", "1wk"], ["max", "1mo"], ["10y", "1mo"]] }
};

export default async (request) => {
  const url = new URL(request.url);
  const sym = (url.searchParams.get("sym") || "").trim();
  const spanne = (url.searchParams.get("spanne") || "1T").toUpperCase();

  if (!sym) return json({ ok: false, fehler: "kein Symbol" }, 400);

  /* Warum hat dieses Papier keinen Chart?

     Aufruf: /.netlify/functions/verlauf?sym=FTG&pruef=1

     Bei FIT Group ist dieselbe Frage dreimal falsch beantwortet worden —
     FTG.DE (falsche Boerse), leer (zu vorsichtig), FTG.VI (richtige Boerse,
     aber Yahoo fuehrt das MTF-Segment offenbar nicht). Jedes Mal war die
     Rueckmeldung dieselbe: "Kein Kurs". Das ist keine Auskunft, das ist ein
     Ergebnis.

     Hier steht die Auskunft: jede Schreibweise, jede Quelle, mit Status und
     dem, was zurueckkam. Damit ist beim naechsten Mal nicht zu raten,
     sondern nachzulesen. Kein Schluessel noetig, alles oeffentlich. */
  if (url.searchParams.get("pruef")) {
    return json(await pruefen(sym), 200);
  }

  const plan = SPANNEN[spanne];
  if (!plan) return json({ ok: false, fehler: "unbekannte Spanne" }, 400);

  const schluessel = sym + "|" + spanne;
  const speicher = laden();

  const alt = await gespeichert(speicher, schluessel);
  if (alt && Date.now() - alt.stand < plan.frisch * 1000) {
    return json(Object.assign({ ok: true, aus: "speicher" }, alt), 200, plan.frisch);
  }

  const frisch = await holenMitRueckfall(sym, plan);
  if (!frisch) {
    // Lieber alt als nichts: ein Chart von vorhin ist besser als ein leeres Feld
    if (alt) return json(Object.assign({ ok: true, aus: "speicher-alt" }, alt), 200, 60);
    return json({ ok: false, fehler: "keine Daten" }, 502);
  }

  if (speicher) {
    try {
      await speicher.setJSON(schluessel, frisch);
    } catch (e) {
      /* Ohne Speicher geht es auch, nur oefter zur Quelle */
    }
  }
  return json(Object.assign({ ok: true, aus: "quelle" }, frisch), 200, plan.frisch);
};

function laden() {
  try {
    return getStore("aktien-verlauf");
  } catch (e) {
    return null;
  }
}

async function gespeichert(speicher, schluessel) {
  if (!speicher) return null;
  try {
    /* Stark lesen: der Zwischenspeicher soll bremsen, nicht alte Kurse
       zeigen, weil eine Kopie noch nicht nachgezogen ist. */
    return await speicher.get(schluessel, { type: "json", consistency: "strong" });
  } catch (e) {
    return null;
  }
}

/* Der Reihe nach, bis eine Reihe herauskommt. */
/* Die Schreibweisen, die es zu versuchen lohnt: das Kuerzel, wie es
   ankommt, und dazu die Boersen-Suffixe, die fuer eine europaeische
   Notierung in Frage kommen. Ein Suffix zeigt auf genau eine Boerse — ein
   blankes Kuerzel dagegen auf irgendeine Firma, die es zufaellig traegt. */
const SUFFIXE = [".VI", ".DE", ".F", ".SG", ".BE", ".MU", ".DU", ".HM", ".VIE"];

async function pruefen(sym) {
  const basis = sym.split(".")[0].toUpperCase();
  const kandidaten = [sym].concat(SUFFIXE.map((x) => basis + x))
    .filter((v, i, a) => a.indexOf(v) === i);

  const zeilen = [];
  for (const k of kandidaten) {
    const adresse = "https://query1.finance.yahoo.com/v8/finance/chart/" +
      encodeURIComponent(k) + "?range=5d&interval=1d";
    const z = { quelle: "Yahoo", symbol: k };
    try {
      const res = await fetch(adresse, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AktienListe/1.0)", Accept: "application/json" }
      });
      z.status = res.status;
      const d = await res.json().catch(() => null);
      const e = d && d.chart && d.chart.result && d.chart.result[0];
      const m = e && e.meta;
      if (d && d.chart && d.chart.error) z.urteil = "Yahoo kennt es nicht: " + (d.chart.error.code || "");
      else if (!m) z.urteil = "keine Daten";
      else {
        z.waehrung = m.currency;
        z.boerse = m.exchangeName || m.fullExchangeName;
        z.name = m.longName || m.shortName;
        z.kurs = m.regularMarketPrice;
        z.punkte = (e.timestamp || []).length;
        z.urteil = z.punkte ? "brauchbar" : "kennt es, liefert aber keine Reihe";
      }
    } catch (e) {
      z.urteil = "nicht erreichbar: " + (e && e.message ? e.message : "unbekannt");
    }
    zeilen.push(z);
  }

  /* Und eine zweite Quelle, falls Yahoo dieses Segment gar nicht fuehrt.
     Stooq liefert Tagesschluesse als CSV, ohne Schluessel. */
  for (const k of [basis.toLowerCase() + ".at", basis.toLowerCase() + ".de", basis.toLowerCase()]) {
    const adresse = "https://stooq.com/q/l/?s=" + encodeURIComponent(k) + "&f=sd2t2ohlcv&h&e=csv";
    const z = { quelle: "Stooq", symbol: k };
    try {
      const res = await fetch(adresse, { headers: { "User-Agent": "Mozilla/5.0 (compatible; AktienListe/1.0)" } });
      z.status = res.status;
      const text = (await res.text()).trim();
      z.antwort = text.split("\n").slice(0, 2).join(" | ").slice(0, 160);
      z.urteil = /N\/D/.test(text) ? "kennt es nicht" : (text.split("\n").length > 1 ? "brauchbar" : "leer");
    } catch (e) {
      z.urteil = "nicht erreichbar: " + (e && e.message ? e.message : "unbekannt");
    }
    zeilen.push(z);
  }

  return { sym, gefunden: zeilen.filter((z) => z.urteil === "brauchbar").map((z) => z.quelle + " " + z.symbol), zeilen };
}

async function holenMitRueckfall(sym, plan) {
  for (const [range, interval] of plan.versuche) {
    const d = await holen(sym, range, interval);
    if (d) return d;
  }
  return null;
}

async function holen(sym, range, interval) {
  try {
    const url =
      "https://query1.finance.yahoo.com/v8/finance/chart/" +
      encodeURIComponent(sym) +
      "?range=" + range + "&interval=" + interval + "&includePrePost=false";
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AktienListe/1.0)",
        Accept: "application/json"
      }
    });
    if (!res.ok) return null;

    const daten = await res.json();
    const ergebnis = daten && daten.chart && daten.chart.result && daten.chart.result[0];
    const meta = ergebnis && ergebnis.meta;
    if (!meta) return null;

    const zeiten = ergebnis.timestamp || [];
    const schluss =
      (ergebnis.indicators &&
        ergebnis.indicators.quote &&
        ergebnis.indicators.quote[0] &&
        ergebnis.indicators.quote[0].close) ||
      [];

    /* Luecken ueberspringen, nicht auffuellen. Yahoo liefert null, wo nicht
       gehandelt wurde; eine Linie, die dort waagerecht weiterlaeuft, wuerde
       Handel behaupten, den es nicht gab. */
    const punkte = [];
    for (let i = 0; i < zeiten.length; i++) {
      const k = schluss[i];
      if (typeof k === "number" && isFinite(k)) punkte.push([zeiten[i], runde(k)]);
    }
    if (punkte.length < 2) return null;

    /* Der Bezugspunkt. Beim Tagesverlauf ist das der gestrige Schluss — nur
       daran ist ein Plus ein Plus. Bei den laengeren Spannen gibt es keinen
       sinnvollen "davor", dort ist es der erste Punkt der Reihe selbst. */
    const vorher =
      range === "1d" && typeof meta.chartPreviousClose === "number"
        ? runde(meta.chartPreviousClose)
        : punkte[0][1];

    return {
      punkte: punkte,
      vorher: vorher,
      waehrung: meta.currency || null,
      quelle: "Yahoo",
      aufloesung: range + "/" + interval,
      stand: Date.now()
    };
  } catch (e) {
    return null;
  }
}

function runde(x) {
  return Math.round(x * 10000) / 10000;
}

function json(obj, status, frisch) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": frisch ? "public, max-age=" + frisch : "no-store"
    }
  });
}
