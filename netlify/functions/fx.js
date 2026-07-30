/* Liefert den aktuellen Wechselkurs EUR/USD.
   Aufruf: /.netlify/functions/fx  ->  { "rate": 1.0842, "zeit": "...", "quelle": "..." }
   Die Antwort wird fuenf Minuten zwischengespeichert. */

export default async () => {
  const versuche = [
    { url: "https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?range=1d&interval=5m", name: "Yahoo" },
    { url: "https://api.frankfurter.app/latest?from=EUR&to=USD", name: "Frankfurter (EZB)" },
    { url: "https://open.er-api.com/v6/latest/EUR", name: "exchangerate-api" }
  ];

  for (const v of versuche) {
    try {
      const res = await fetch(v.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AktienListe/1.0)",
          Accept: "application/json"
        }
      });
      if (!res.ok) continue;
      const data = await res.json();

      let rate = null;
      if (v.name === "Yahoo") {
        rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
      } else {
        // Frankfurter: rates.USD ; exchangerate-api: rates.USD
        rate = data?.rates?.USD ?? null;
      }

      if (rate && isFinite(rate) && rate > 0.5 && rate < 2) {
        return json(
          { rate: Number(rate), zeit: new Date().toISOString(), quelle: v.name },
          200,
          "public, max-age=300"
        );
      }
    } catch (e) {
      // naechste Quelle versuchen
    }
  }

  return json({ fehler: "kein Wechselkurs verfuegbar" }, 502, "no-store");
};

function json(obj, status, cache) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache
    }
  });
}
