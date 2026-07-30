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

   Zwei Quellen, weil keine allein alles hat:

   - Termin, Prognose und Vorwert kommen vom woechentlichen Kalender von
     ForexFactory. Der ist frei abrufbar, fuehrt aber kein Feld fuer den
     tatsaechlichen Wert - er ist ein Terminplan, kein Ergebnisdienst.
   - Das Ergebnis kommt aus FRED, der Datenbank der Federal Reserve Bank of
     St. Louis. Dort steht der amtliche Wert, meist Minuten nach der
     Veroeffentlichung. Braucht einen kostenlosen Schluessel in FRED_KEY.

   Ohne FRED_KEY laeuft alles weiter, nur bleibt "ergebnis" leer.

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
// Die Ergebnisse haben ihren eigenen Takt: sie treffen ueber den Tag
// verteilt ein, unabhaengig davon, ob der Terminplan neu geholt wurde.
const FRISCH_FRED = 3 * 60 * 1000;
const NOTNAGEL = 24 * 3600 * 1000;   // so alt darf der Speicher hoechstens werden

// Zuordnung der Termine zu den Datenreihen in FRED. Nur Reihen, bei denen
// die Entsprechung eindeutig ist - eine falsche Zahl waere schlimmer als
// gar keine. Termine ohne Eintrag behalten "Aktuell -".
//   pch = Veraenderung zum Vormonat in Prozent
//   pc1 = Veraenderung zum Vorjahr in Prozent
//   chg = Veraenderung in der Einheit der Reihe (bei PAYEMS: Tausend Stellen)
//   lin = der Wert selbst
const FRED = [
  [/^core pce price index m\/m/i,   { id: "PCEPILFE", einheit: "pch", takt: "monat" }],
  [/^core pce price index y\/y/i,   { id: "PCEPILFE", einheit: "pc1", takt: "monat" }],
  [/^pce price index m\/m/i,        { id: "PCEPI",    einheit: "pch", takt: "monat" }],
  [/^core cpi m\/m/i,               { id: "CPILFESL", einheit: "pch", takt: "monat" }],
  [/^cpi m\/m/i,                    { id: "CPIAUCSL", einheit: "pch", takt: "monat" }],
  [/^cpi y\/y/i,                    { id: "CPIAUCSL", einheit: "pc1", takt: "monat" }],
  [/^ppi m\/m/i,                    { id: "PPIFIS",   einheit: "pch", takt: "monat" }],
  [/^non-?farm employment change/i, { id: "PAYEMS",   einheit: "chg", takt: "monat" }],
  [/^unemployment rate/i,           { id: "UNRATE",   einheit: "lin", takt: "monat" }],
  [/^average hourly earnings m\/m/i,{ id: "CES0500000003", einheit: "pch", takt: "monat" }],
  [/^retail sales m\/m/i,           { id: "RSAFS",    einheit: "pch", takt: "monat" }],
  [/gdp q\/q/i,                     { id: "A191RL1Q225SBEA", einheit: "lin", takt: "quartal" }],
  [/^federal funds rate/i,          { id: "DFEDTARU", einheit: "lin", takt: "tag" }]
];

// So weit darf der Beobachtungszeitraum vor dem Termin liegen. Verhindert,
// dass der Wert des Vormonats als frisches Ergebnis erscheint, solange die
// Veroeffentlichung noch aussteht.
const ABSTAND = { monat: 70 * 86400000, quartal: 140 * 86400000, tag: 8 * 86400000 };

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
  let werte = null;
  let quelle = "Speicher";
  const fehler = [];

  if (alter < FRISCH) {
    roh = gespeichert.roh;                       // frisch genug, Quelle in Ruhe lassen
    werte = gespeichert.werte || {};
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
      quelle = "ForexFactory";   // geschrieben wird erst unten, mit den Ergebnissen
    } else if (gespeichert && alter < NOTNAGEL) {
      roh = gespeichert.roh;                     // Quelle streikt: alter Stand ist besser als nichts
      werte = gespeichert.werte || {};
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

  // Ergebnisse nachfragen, wenn ein vergangener Termin noch keines hat und
  // der letzte Versuch lange genug her ist. Frueher haing das am Abruf des
  // Terminplans - stand der im Speicher, wurde FRED nie gefragt, auch wenn
  // inzwischen ein Schluessel da war.
  const offen = termine.some((t) => {
    if (new Date(t.zeit).getTime() > jetzt) return false;
    const k = schluesselFuer(t);
    return k && (werte || {})[k] === undefined;
  });
  const werteAlter = gespeichert && gespeichert.werte_zeit
    ? jetzt - gespeichert.werte_zeit
    : Infinity;

  if (!werte || (offen && werteAlter > FRISCH_FRED)) {
    const frisch = await ergebnisse(termine);
    werte = Object.assign({}, werte || {}, frisch);
    await schreiben(speicher, roh, werte, gespeichert ? gespeichert.zeit : jetzt);
  }
  for (const t of termine) {
    const k = schluesselFuer(t);
    if (k && werte[k] !== undefined && werte[k] !== null) {
      t.ergebnis = werte[k];
      t.ueber = t.prognose === null ? null : t.ergebnis > t.prognose;
    }
  }

  return json(
    {
      ok: true,
      stand: new Date().toISOString(),
      quelle: quelle,
      alter_min: Math.round((Date.now() - (gespeichert ? gespeichert.zeit : Date.now())) / 60000),
      // Damit sichtbar ist, warum "Aktuell" leer bleibt: ohne Schluessel
      // wird FRED gar nicht erst gefragt, und das sah man der Antwort
      // bisher nicht an.
      ergebnisdienst: process.env.FRED_KEY ? "FRED" : "kein FRED_KEY gesetzt",
      ergebnisse_da: Object.keys(werte || {}).length,
      // Nur die Namen, nie die Werte: zeigt, ob die Variable unter einer
      // anderen Schreibweise angelegt wurde oder ob sie ganz fehlt.
      gefundene_namen: Object.keys(process.env).filter((n) => /fred/i.test(n)),
      termine: termine,
      hinweis: fehler.length ? fehler : undefined
    },
    200,
    "public, max-age=900"
  );
};

/* ---------- Ergebnisse aus FRED ---------- */

function schluesselFuer(t) {
  const treffer = FRED.find(([muster]) => muster.test(t.voll));
  return treffer ? t.voll + "@" + String(t.zeit).slice(0, 10) : null;
}

async function ergebnisse(termine) {
  const out = {};
  const key = process.env.FRED_KEY;
  if (!key) return out;

  const jetzt = Date.now();
  for (const t of termine) {
    if (new Date(t.zeit).getTime() > jetzt) continue;      // steht noch aus
    const treffer = FRED.find(([muster]) => muster.test(t.voll));
    if (!treffer) continue;
    const reihe = treffer[1];

    try {
      const url = "https://api.stlouisfed.org/fred/series/observations" +
        "?series_id=" + reihe.id +
        "&units=" + reihe.einheit +
        "&sort_order=desc&limit=2&file_type=json&api_key=" + key;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) continue;
      const daten = await res.json();
      const beob = (daten && daten.observations || []).find((o) => o.value && o.value !== ".");
      if (!beob) continue;

      // Der Beobachtungszeitraum muss zum Termin passen: liegt er zu weit
      // zurueck, ist die Veroeffentlichung noch nicht in FRED angekommen
      // und der Wert waere der des Vormonats.
      const zeitraum = new Date(beob.date + "T00:00:00Z").getTime();
      const abstand = new Date(t.zeit).getTime() - zeitraum;
      if (!(abstand >= 0 && abstand <= (ABSTAND[reihe.takt] || ABSTAND.monat))) continue;

      const wert = parseFloat(beob.value);
      if (isFinite(wert)) out[t.voll + "@" + String(t.zeit).slice(0, 10)] = runden(wert);
    } catch (e) {
      // Ein Ausfall bei FRED laesst nur dieses eine Ergebnis leer
    }
  }
  return out;
}

function runden(n) {
  // Prozentwerte auf eine Nachkommastelle, Stellenzahlen ganz
  return Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
}

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
    return {
      zeit: Number(d.zeit) || 0,
      roh: d.roh,
      werte: d.werte || {},
      werte_zeit: Number(d.werte_zeit) || 0
    };
  } catch (e) {
    return null;
  }
}

async function schreiben(store, roh, werte, ffZeit) {
  if (!store) return;
  try {
    await store.setJSON("ff-thisweek", {
      zeit: ffZeit || Date.now(),        // Alter des Terminplans nicht zuruecksetzen
      werte_zeit: Date.now(),
      roh: roh,
      werte: werte || {}
    });
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
