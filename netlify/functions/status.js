/* Liefert je Position Kurs und Zonenstatus, damit die Seite aktive Setups
   markieren kann. Kein Push, keine Nachtruhe.

   Aufruf: /.netlify/functions/status
   Antwort: { rate, positionen: [ { id, badge, kurs, high, low, aktiv } ] }

   Zonen und Symbole kommen aus der veroeffentlichten index.html — es gibt
   keine zweite Liste zu pflegen. */

export default async () => {
  const watch = await zonen();
  if (!watch.length) {
    return json({ ok: false, fehler: "keine Zonen in index.html gefunden" }, 500);
  }

  const rateQuote = await quote("EURUSD=X");
  const rate = rateQuote && rateQuote.price ? rateQuote.price : null;

  const positionen = [];
  for (const item of watch) {
    const q = await quote(item.yahoo);
    const kurs = q && q.price ? q.price : null;
    // Abstand zur Zone in Prozent: positiv darueber, negativ darunter, 0 = drin
    let abstand = null;
    if (kurs) {
      if (kurs > item.high) abstand = (kurs / item.high - 1) * 100;
      else if (kurs < item.low) abstand = (kurs / item.low - 1) * 100;
      else abstand = 0;
    }

    // Ausgeloest: irgendeine Tageskerze der letzten Wochen ist in die Zone gelaufen
    let beruehrt = null;
    const kerzen = (q && q.kerzen) || [];
    for (const k of kerzen) {
      if (k.tief <= item.high) {
        beruehrt = { zeit: k.zeit, tief: k.tief };  // letzte Beruehrung gewinnt
      }
    }

    positionen.push({
      id: item.anchor,
      badge: item.badge,
      kurs: kurs,
      quelle: (q && q.quelle) || null,
      waehrung: (q && q.currency) || null,
      high: item.high,
      low: item.low,
      abstand: abstand === null ? null : Math.round(abstand * 100) / 100,
      in_zone: kurs !== null && kurs <= item.high && kurs >= item.low,
      beruehrt_am: beruehrt ? new Date(beruehrt.zeit * 1000).toISOString().slice(0, 10) : null,
      beruehrt_bei: beruehrt ? Math.round(beruehrt.tief * 100) / 100 : null,
      // Setup gilt als aktiv, sobald der Kurs die Zone erreicht hat
      aktiv: (kurs !== null && kurs <= item.high && kurs >= item.low) || beruehrt !== null
    });
  }

  return json({ ok: true, rate: rate, positionen: positionen }, 200, "public, max-age=120");
};

async function zonen() {
  const base = process.env.URL || process.env.DEPLOY_URL;
  if (!base) return [];

  const headers = { "User-Agent": "AktienListe-Status/1.0" };
  if (process.env.SITE_PASSWORD) {
    headers.Authorization = "Basic " + btoa("status:" + process.env.SITE_PASSWORD);
  }

  let html = "";
  try {
    const res = await fetch(base + "/index.html", { headers });
    if (!res.ok) return [];
    html = await res.text();
  } catch (e) {
    return [];
  }

  const out = [];
  const blocks = html.split('<section class="card"');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const anchor = (block.match(/^\s+id="([^"]+)"/) || [])[1];
    const yahoo = (block.match(/data-yahoo="([^"]+)"/) || [])[1];
    const badge = (block.match(/<span class="badge">([^<]+)<\/span>/) || [])[1];
    const zone = (block.match(/class="zone">Einkaufszone\s*([^<]+)</) || [])[1];
    if (!anchor || !yahoo || !zone) continue;

    const teile = zone.split(/[–-]/);
    if (teile.length < 2) continue;
    const a = num(teile[0]);
    const b = num(teile[1]);
    if (!isFinite(a) || !isFinite(b)) continue;

    out.push({
      anchor: anchor,
      badge: (badge || yahoo).trim(),
      yahoo: yahoo,
      high: Math.max(a, b),
      low: Math.min(a, b)
    });
  }
  return out;
}

/* Kurse: erst Yahoo, dann Stooq. Yahoo blockt Anfragen aus Rechenzentren
   gelegentlich, Stooq liefert CSV ohne Schluessel. */
async function quote(symbol) {
  const y = await quoteYahoo(symbol);
  if (y && y.price) return y;
  return await quoteStooq(symbol);
}

async function quoteYahoo(symbol) {
  try {
    // Ein Monat Tageskerzen: liefert aktuellen Kurs UND die Tiefs der letzten Tage
    const url =
      "https://query1.finance.yahoo.com/v8/finance/chart/" +
      encodeURIComponent(symbol) +
      "?range=1mo&interval=1d";
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AktienListe/1.0)",
        Accept: "application/json"
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta || !meta.regularMarketPrice) return null;

    const zeiten = result.timestamp || [];
    const tiefs = result.indicators?.quote?.[0]?.low || [];
    const kerzen = [];
    for (let i = 0; i < zeiten.length; i++) {
      if (typeof tiefs[i] === "number") kerzen.push({ zeit: zeiten[i], tief: tiefs[i] });
    }

    return {
      price: meta.regularMarketPrice,
      currency: meta.currency,
      quelle: "Yahoo",
      kerzen: kerzen
    };
  } catch (e) {
    return null;
  }
}

// Yahoo-Symbol -> Stooq-Symbol
function stooqSymbol(symbol) {
  const fest = { "GC=F": "xauusd", "SI=F": "xagusd" };
  if (fest[symbol]) return fest[symbol];
  if (symbol.endsWith("=X")) return symbol.slice(0, -2).toLowerCase();
  if (symbol.endsWith("-USD")) return symbol.replace("-", "").toLowerCase();
  return symbol.toLowerCase() + ".us";
}

async function quoteStooq(symbol) {
  try {
    const url =
      "https://stooq.com/q/l/?s=" + encodeURIComponent(stooqSymbol(symbol)) + "&f=sd2t2ohlc&h&e=csv";
    const res = await fetch(url, { headers: { "User-Agent": "AktienListe/1.0" } });
    if (!res.ok) return null;
    const text = await res.text();
    const zeilen = text.trim().split(/\r?\n/);
    if (zeilen.length < 2) return null;
    const spalten = zeilen[0].toLowerCase().split(",");
    const werte = zeilen[1].split(",");
    const i = spalten.indexOf("close");
    if (i < 0) return null;
    const price = parseFloat(werte[i]);
    if (!isFinite(price) || price <= 0) return null;
    const iLow = spalten.indexOf("low");
    const tief = iLow >= 0 ? parseFloat(werte[iLow]) : NaN;
    const cur = /xau|xag|usd$/.test(stooqSymbol(symbol)) || stooqSymbol(symbol).endsWith(".us") ? "USD" : "USD";
    return {
      price: price,
      currency: cur,
      quelle: "Stooq",
      kerzen: isFinite(tief) ? [{ zeit: Math.floor(Date.now() / 1000), tief: tief }] : []
    };
  } catch (e) {
    return null;
  }
}

function num(s) {
  return parseFloat(
    String(s || "")
      .replace(/[^\d.,]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  );
}

function json(obj, status, cache) {
  return new Response(JSON.stringify(obj, null, 2), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache || "no-store"
    }
  });
}
