/* Wirtschaftstermine der USA mit hoher Wirkung: CPI, Core PCE, FOMC,
   Arbeitsmarkt, PPI, Einzelhandel, BIP, ISM.

   Aufruf: /.netlify/functions/kalender
   Antwort: { ok: true, stand: "...", termine: [ { ... } ] }

   Je Termin:
     zeit      ISO-Zeitpunkt der Veroeffentlichung
     titel     Name des Termins, gekuerzt
     prognose  erwarteter Wert (null, wenn keiner vorliegt)
     vorwert   Wert der letzten Veroeffentlichung
     ergebnis  tatsaechlicher Wert (null, solange nicht veroeffentlicht)
     ueber     true/false/null - liegt das Ergebnis ueber der Prognose

   Der Schluessel kommt aus der Umgebungsvariablen KALENDER_KEY und steht
   nie im Code. Ohne Schluessel liefert die Funktion 503 und die Seite
   blendet das Band einfach aus, statt etwas Kaputtes zu zeigen.

   Aufruf mit ?roh=1 gibt den ersten unveraenderten Datensatz zurueck -
   hilfreich, falls die Quelle ihre Feldnamen aendert. */

const TAGE_ZURUECK = 3;   // schon veroeffentlichte Termine noch zeigen
const TAGE_VORAUS = 10;   // so weit nach vorne schauen
const MAX = 12;           // mehr passt in kein Laufband

// Nur diese Termine. Reihenfolge egal, geprueft wird auf Teilzeichenketten.
const WICHTIG = [
  "CPI", "Consumer Price Index", "Core PCE", "PCE Price", "Inflation Rate",
  "FOMC", "Fed Interest Rate", "Interest Rate Decision", "Fed Chair",
  "Non Farm", "Nonfarm", "Unemployment Rate", "Initial Jobless",
  "PPI", "Producer Price", "Retail Sales", "GDP", "ISM"
];

// Kurze Namen fuers Band - "Consumer Price Index (YoY)" ist zu lang
const KURZ = [
  [/core pce/i, "Core PCE"],
  [/pce price/i, "PCE"],
  [/consumer price index|^cpi/i, "CPI"],
  [/inflation rate/i, "Inflation"],
  [/fomc.*minutes|minutes.*fomc/i, "FOMC-Protokoll"],
  [/fomc|fed interest rate|interest rate decision/i, "FOMC-Zinsentscheid"],
  [/fed chair|powell/i, "Fed-Chef"],
  [/non ?farm/i, "Arbeitsmarkt (NFP)"],
  [/unemployment rate/i, "Arbeitslosenquote"],
  [/initial jobless/i, "Erstantraege"],
  [/producer price|^ppi/i, "PPI"],
  [/retail sales/i, "Einzelhandel"],
  [/\bgdp\b/i, "BIP"],
  [/ism.*manufacturing/i, "ISM Industrie"],
  [/ism.*services|ism.*non-?manufacturing/i, "ISM Dienstleistung"]
];

export default async (request) => {
  const schluessel = process.env.KALENDER_KEY;
  if (!schluessel) {
    return json({ ok: false, fehler: "kein KALENDER_KEY gesetzt" }, 503, "no-store");
  }

  const heute = new Date();
  const von = datum(heute, -TAGE_ZURUECK);
  const bis = datum(heute, TAGE_VORAUS);

  // Zwei Adressformen: die Quelle hat ihre Pfade umgestellt, die aeltere
  // funktioniert weiter. Erst die neue, dann die alte.
  const versuche = [
    `https://financialmodelingprep.com/stable/economic-calendar?from=${von}&to=${bis}&apikey=${schluessel}`,
    `https://financialmodelingprep.com/api/v3/economic_calendar?from=${von}&to=${bis}&apikey=${schluessel}`
  ];

  let roh = null;
  let fehler = null;
  for (const url of versuche) {
    const pfad = url.includes("/stable/") ? "stable" : "v3";
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const daten = await res.json().catch(() => null);

      if (Array.isArray(daten) && daten.length) { roh = daten; break; }

      // Die Quelle meldet Fehler mal ueber den Status, mal im Koerper mit
      // Status 200. Beides durchreichen, sonst steht man beim Suchen im Dunkeln.
      const meldung = daten && !Array.isArray(daten)
        ? (daten["Error Message"] || daten.message || daten.error || JSON.stringify(daten).slice(0, 200))
        : null;
      fehler = pfad + ": " + (meldung || (res.ok ? "leere Liste" : "Antwort " + res.status));
    } catch (e) {
      fehler = pfad + ": " + (e && e.message ? e.message : String(e));
    }
  }

  if (!roh) {
    return json({ ok: false, fehler: fehler || "keine Daten" }, 502, "no-store");
  }

  if (new URL(request.url).searchParams.get("roh")) {
    return json({ ok: true, anzahl: roh.length, erster: roh[0] }, 200, "no-store");
  }

  const termine = roh
    .filter(istUSA)
    .filter(istHoch)
    .filter(istWichtig)
    .map(umbauen)
    .filter((t) => t.zeit)
    .sort((a, b) => new Date(a.zeit) - new Date(b.zeit))
    .slice(0, MAX);

  return json(
    { ok: true, stand: new Date().toISOString(), termine: termine },
    200,
    "public, max-age=900"
  );
};

/* ---------- Filter ---------- */

function istUSA(e) {
  const land = String(feld(e, ["country", "countryCode", "Country"]) || "").toUpperCase();
  return land === "US" || land === "USA" || land === "UNITED STATES";
}

// Die Quelle schreibt die Wirkung mal als Wort, mal als Zahl
function istHoch(e) {
  const w = feld(e, ["impact", "importance", "Impact"]);
  if (typeof w === "number") return w >= 3;
  const t = String(w || "").toLowerCase();
  return t === "high" || t === "3";
}

function istWichtig(e) {
  const name = String(feld(e, ["event", "name", "title", "Event"]) || "");
  return WICHTIG.some((w) => name.toLowerCase().includes(w.toLowerCase()));
}

/* ---------- Umbau ---------- */

function umbauen(e) {
  const name = String(feld(e, ["event", "name", "title", "Event"]) || "").trim();
  const prognose = zahl(feld(e, ["estimate", "forecast", "consensus", "Estimate"]));
  const vorwert = zahl(feld(e, ["previous", "prev", "Previous"]));
  const ergebnis = zahl(feld(e, ["actual", "Actual"]));

  return {
    zeit: zeitpunkt(feld(e, ["date", "datetime", "time", "Date"])),
    titel: kurz(name),
    voll: name,
    einheit: einheit(name, feld(e, ["unit"])),
    prognose: prognose,
    vorwert: vorwert,
    ergebnis: ergebnis,
    ueber: ergebnis === null || prognose === null ? null : ergebnis > prognose
  };
}

function kurz(name) {
  for (const [muster, ersatz] of KURZ) {
    if (muster.test(name)) {
      // Zusatz in Klammern behalten, wenn er den Zeitraum nennt
      const zusatz = name.match(/\((YoY|MoM|QoQ)\)/i);
      return zusatz ? ersatz + " " + zusatz[1].toUpperCase() : ersatz;
    }
  }
  return name.length > 28 ? name.slice(0, 27) + "…" : name;
}

// Prozent oder nicht: die Quelle liefert die Einheit nicht zuverlaessig mit
function einheit(name, angegeben) {
  if (angegeben) return String(angegeben);
  if (/rate|cpi|pce|ppi|inflation|gdp|sales|price index/i.test(name)) return "%";
  if (/non ?farm|payroll|claims/i.test(name)) return "K";
  return "";
}

function zeitpunkt(wert) {
  if (!wert) return null;
  // "2026-07-30 14:30:00" ist ohne T kein gueltiges ISO-Datum
  const s = String(wert).replace(" ", "T");
  const d = new Date(/Z$|[+-]\d\d:?\d\d$/.test(s) ? s : s + "Z");
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function zahl(wert) {
  if (wert === null || wert === undefined || wert === "") return null;
  if (typeof wert === "number") return isFinite(wert) ? wert : null;
  // "2.9%" oder "236K" oder "-0.1"
  const t = String(wert).replace(/[%\s]/g, "").replace(",", ".");
  const m = t.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  let n = parseFloat(m[0]);
  if (/k$/i.test(t)) n = n * 1;      // K bleibt K, nur die Zahl zaehlt
  if (/m$/i.test(t)) n = n * 1000;
  return isFinite(n) ? n : null;
}

/* ---------- Werkzeug ---------- */

// Feldnamen unterscheiden sich je nach Pfad der Quelle
function feld(obj, namen) {
  for (const n of namen) {
    if (obj && obj[n] !== undefined && obj[n] !== null) return obj[n];
  }
  return null;
}

function datum(d, versatz) {
  const x = new Date(d.getTime() + versatz * 86400000);
  return x.toISOString().slice(0, 10);
}

function json(obj, status, cache) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache
    }
  });
}
