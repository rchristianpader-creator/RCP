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
    positionen.push({
      id: item.anchor,
      badge: item.badge,
      kurs: kurs,
      waehrung: (q && q.currency) || null,
      high: item.high,
      low: item.low,
      aktiv: kurs !== null && kurs <= item.high && kurs >= item.low
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

async function quote(symbol) {
  try {
    const url =
      "https://query1.finance.yahoo.com/v8/finance/chart/" +
      encodeURIComponent(symbol) +
      "?range=1d&interval=15m";
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AktienListe/1.0)",
        Accept: "application/json"
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return { price: meta.regularMarketPrice, currency: meta.currency };
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
