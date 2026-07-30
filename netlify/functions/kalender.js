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

   Quelle ist der woechentliche Kalender von ForexFactory. Er braucht keinen
   Schluessel und kein Kontingent. Der Wirtschaftskalender von Financial
   Modeling Prep waere die Alternative, ist dort aber ein Bezahl-Endpunkt:
   der kostenlose Tarif bekommt darauf HTTP 402.

   Aufruf mit ?roh=1 gibt den ersten unveraenderten Datensatz zurueck -
   hilfreich, falls die Quelle ihre Feldnamen aendert. */

import { getStore } from "@netlify/blobs";

const TAGE_ZURUECK = 3;   // schon veroeffentlichte Termine noch zeigen
const TAGE_VORAUS = 10;   // so weit nach vorne schauen
const MAX = 12;           // mehr passt in kein Laufband

// Die Quelle fuehrt zwei Wochen getrennt; beide holen und zusammenlegen
// Nur die laufende Woche: den Feed fuer die naechste Woche gibt es unter
// diesem Namen nicht, er antwortet mit 404. Die laufende Woche reicht auch -
// mit dem Fenster unten stehen die Ergebnisse der letzten Tage weiter im Band.
const QUELLEN = [
  "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
];

// Die Quelle drosselt (HTTP 429), wenn jeder Seitenaufruf bei ihr landet.
// Deshalb liegt ein Serverspeicher davor: hoechstens ein Abruf je Viertelstunde,
// egal wie viele Leute die Seite oeffnen. Faellt die Quelle aus, wird der
// gespeicherte Stand weitergereicht, auch wenn er aelter ist.
const FRISCH = 15 * 60 * 1000;
const NOTNAGEL = 24 * 3600 * 1000;   // so alt darf der Speicher hoechstens werden

// Kurze Namen fuers Band - "Core PCE Price Index m/m" ist zu lang
const KURZ = [
  [/core pce/i, "Core PCE"],
  [/core cpi/i, "Core CPI"],
  [/\bcpi\b/i, "CPI"],
  [/fomc.*minutes/i, "FOMC-Protokoll"],
  [/fomc.*projections/i, "FOMC-Prognosen"],
  [/fomc.*press/i, "FOMC-Pressekonferenz"],
  [/fomc statement/i, "FOMC-Statement"],
  [/federal funds rate/i, "FOMC-Zinsentscheid"],
  [/fomc/i, "FOMC"],
  [/fed chair|powell/i, "Fed-Chef"],
  [/non-?farm/i, "Arbeitsmarkt (NFP)"],
  [/unemployment rate/i, "Arbeitslosenquote"],
  [/average hourly/i, "Stundenloehne"],
  [/unemployment claims|jobless/i, "Erstantraege"],
  [/core ppi/i, "Core PPI"],
  [/\bppi\b/i, "PPI"],
  [/core retail/i, "Einzelhandel (Kern)"],
  [/retail sales/i, "Einzelhandel"],
  [/advance gdp/i, "BIP Schnellschätzung"],
  [/prelim gdp/i, "BIP 2. Schätzung"],
  [/final gdp/i, "BIP final"],
  [/\bgdp\b/i, "BIP"],
  [/ism.*manufacturing/i, "ISM Industrie"],
  [/ism.*services/i, "ISM Dienstleistung"]
];

export default async (request) => {
  const jetzt = Date.now();
  const von = jetzt - TAGE_ZURUECK * 86400000;
  const bis = jetzt + TAGE_VORAUS * 86400000;

  const speicher = laden_speicher();
  const gespeichert = await lesen(speicher);
  const alter = gespeichert ? Date.now() - gespeichert.zeit : Infinity;

  let roh = [];
  let quelle = "Speicher";
  const fehler = [];

  if (alter < FRISCH) {
    roh = gespeichert.roh;                       // frisch genug, Quelle in Ruhe lassen
  } else {
    for (const url of QUELLEN) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; AktienListe/1.0)",
            Accept: "application/json"
          }
        });
        const daten = await res.json().catch(() => null);
        if (Array.isArray(daten) && daten.length) { roh = roh.concat(daten); continue; }
        fehler.push("diese Woche: " + (res.ok ? "keine Liste" : "Antwort " + res.status));
      } catch (e) {
        fehler.push("diese Woche: " + (e && e.message ? e.message : String(e)));
      }
    }

    if (roh.length) {
      quelle = "ForexFactory";
      await schreiben(speicher, roh);
    } else if (gespeichert && alter < NOTNAGEL) {
      roh = gespeichert.roh;                     // Quelle streikt: alter Stand ist besser als nichts
      quelle = "Speicher (Quelle streikt)";
    }
  }

  if (!roh.length) {
    return json({ ok: false, fehler: fehler.length ? fehler : ["keine Daten"] }, 502, "no-store");
  }

  if (new URL(request.url).searchParams.get("roh")) {
    return json({ ok: true, anzahl: roh.length, erster: roh[0] }, 200, "no-store");
  }

  const termine = roh
    .filter(istUSA)
    .filter(istHoch)
    .map(umbauen)
    .filter((t) => t.zeit)
    .filter((t) => {
      const z = new Date(t.zeit).getTime();
      return z >= von && z <= bis;
    })
    .sort((a, b) => new Date(a.zeit) - new Date(b.zeit))
    .slice(0, MAX);

  return json(
    {
      ok: true,
      stand: new Date().toISOString(),
      quelle: quelle,
      alter_min: Math.round((Date.now() - (gespeichert ? gespeichert.zeit : Date.now())) / 60000),
      termine: termine,
      hinweis: fehler.length ? fehler : undefined
    },
    200,
    "public, max-age=900"
  );
};

/* ---------- Filter ---------- */

// Die Quelle fuehrt das Land als Waehrung: USD sind die US-Termine
function istUSA(e) {
  const land = String(feld(e, ["country", "Country"]) || "").toUpperCase();
  return land === "USD" || land === "US" || land === "USA";
}

// Nur die Termine, die den Markt wirklich bewegen. Bei dieser Quelle ist
// "High" fuer USD genau die Liste, die wir wollen - eine eigene Auswahl
// von Namen wuerde nur riskieren, dass etwas faelschlich rausfaellt.
function istHoch(e) {
  const w = feld(e, ["impact", "Impact"]);
  if (typeof w === "number") return w >= 3;
  return String(w || "").toLowerCase() === "high";
}

/* ---------- Umbau ---------- */

function umbauen(e) {
  const name = String(feld(e, ["title", "event", "name", "Title"]) || "").trim();
  const rohProg = feld(e, ["forecast", "Forecast", "estimate"]);
  const rohVor = feld(e, ["previous", "Previous"]);
  const rohErg = feld(e, ["actual", "Actual"]);

  const prognose = zahl(rohProg);
  const ergebnis = zahl(rohErg);

  return {
    zeit: zeitpunkt(feld(e, ["date", "Date", "datetime"])),
    titel: kurz(name),
    voll: name,
    einheit: einheit(rohErg, rohProg, rohVor),
    prognose: prognose,
    vorwert: zahl(rohVor),
    ergebnis: ergebnis,
    ueber: ergebnis === null || prognose === null ? null : ergebnis > prognose
  };
}

function kurz(name) {
  for (const [muster, ersatz] of KURZ) {
    if (muster.test(name)) {
      // Zeitraum behalten, wenn er im Namen steht: "CPI m/m" -> "CPI MOM"
      const zusatz = name.match(/\b(m\/m|y\/y|q\/q)\b/i);
      if (!zusatz) return ersatz;
      const form = { "m/m": "MoM", "y/y": "YoY", "q/q": "QoQ" }[zusatz[1].toLowerCase()];
      // Bei ohnehin langen Namen den Zusatz weglassen, sonst reisst das Band
      return ersatz.length > 14 ? ersatz : ersatz + " " + form;
    }
  }
  return name.length > 28 ? name.slice(0, 27) + "\u2026" : name;
}

// Die Einheit steht im Rohwert selbst ("2.9%", "236K") - das ist
// zuverlaessiger, als sie aus dem Namen zu erraten
function einheit() {
  for (const wert of arguments) {
    const t = String(wert === null || wert === undefined ? "" : wert).trim();
    if (!t) continue;
    if (t.indexOf("%") !== -1) return "%";
    const m = t.match(/([KMB])\s*$/i);
    if (m) return m[1].toUpperCase();
  }
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

/* ---------- Serverspeicher ---------- */

function laden_speicher() {
  try {
    return getStore("aktien-kalender");
  } catch (e) {
    return null;   // ohne Blobs laeuft es weiter, nur ohne Zwischenspeicher
  }
}

async function lesen(store) {
  if (!store) return null;
  try {
    const d = await store.get("ff-thisweek", { type: "json" });
    if (!d || !Array.isArray(d.roh) || !d.roh.length) return null;
    return { zeit: Number(d.zeit) || 0, roh: d.roh };
  } catch (e) {
    return null;
  }
}

async function schreiben(store, roh) {
  if (!store) return;
  try {
    await store.setJSON("ff-thisweek", { zeit: Date.now(), roh: roh });
  } catch (e) { /* Speichern ist Kuer, nicht Pflicht */ }
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
