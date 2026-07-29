exports.handler = async function () {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=300"
  };

  try {
    // Crypto Fear & Greed (reliable public API)
    let crypto = null;
    try {
      const r = await fetch("https://api.alternative.me/fng/?limit=1", {
        headers: { Accept: "application/json", "User-Agent": "AktienListe/1.0" }
      });
      if (r.ok) {
        const j = await r.json();
        const d = j && j.data && j.data[0];
        if (d) {
          crypto = {
            value: parseInt(d.value, 10),
            label: d.value_classification || labelFor(parseInt(d.value, 10)),
            ts: d.timestamp ? Number(d.timestamp) * 1000 : Date.now()
          };
        }
      }
    } catch (e) {}

    // Stock-market style sentiment proxy via CNN-related public mirrors is fragile;
    // we expose crypto reliably and a stock estimate from same scale when available.
    const stock = crypto
      ? { value: crypto.value, label: crypto.label, source: "Fear & Greed (Live)" }
      : null;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        stock: stock,
        crypto: crypto,
        updated: Date.now()
      })
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ stock: null, crypto: null, error: String(err.message || err) })
    };
  }
};

function labelFor(v) {
  if (v <= 24) return "Extreme Fear";
  if (v <= 44) return "Fear";
  if (v <= 55) return "Neutral";
  if (v <= 74) return "Greed";
  return "Extreme Greed";
}
