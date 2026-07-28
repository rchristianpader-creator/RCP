exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=60"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  try {
    const params = event.queryStringParameters || {};
    const symbol = (params.symbol || "TSLA").toUpperCase();
    const q = params.q || symbol;

    // 1) Yahoo Finance RSS – echte Artikel-Headlines
    const yahooUrl =
      "https://feeds.finance.yahoo.com/rss/2.0/headline?s=" +
      encodeURIComponent(symbol) +
      "&region=US&lang=en-US";

    let items = await fetchRss(yahooUrl);

    // 2) Fallback: Google News RSS (DE)
    if (!items.length) {
      const gUrl =
        "https://news.google.com/rss/search?q=" +
        encodeURIComponent(q) +
        "&hl=de&gl=DE&ceid=DE:de";
      items = await fetchRss(gUrl);
    }

    // 3) Fallback: finanzen.net general news, filter by symbol/q
    if (!items.length) {
      const fnItems = await fetchRss("https://www.finanzen.net/rss/news");
      const re = new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "|" + escapeRe(q.split(" ")[0] || q), "i");
      items = fnItems.filter(function (it) {
        return re.test(it.title || "");
      });
    }

    items = items.slice(0, 5).map(function (it) {
      return {
        title: cleanTitle(it.title),
        link: it.link,
        pubDate: it.pubDate || ""
      };
    }).filter(function (it) {
      return it.title && it.link && !/google\.[^/]+\/search/i.test(it.link);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ symbol: symbol, items: items })
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ items: [], error: String(err && err.message ? err.message : err) })
    };
  }
};

function escapeRe(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanTitle(t) {
  return String(t || "")
    .replace(/\s*-\s*[^-]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchRss(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AktienListe/1.0)",
      Accept: "application/rss+xml, application/xml, text/xml, */*"
    }
  });
  if (!res.ok) return [];
  const text = await res.text();
  return parseRss(text);
}

function parseRss(xml) {
  const items = [];
  const parts = String(xml).split(/<item[\s>]/i);
  for (let i = 1; i < parts.length && items.length < 10; i++) {
    const block = parts[i].split(/<\/item>/i)[0] || "";
    const title = textOf(block, "title");
    let link = textOf(block, "link");
    if (!link) link = textOf(block, "guid");
    const pubDate = textOf(block, "pubDate");
    if (title && link) items.push({ title: decode(title), link: decode(link), pubDate: decode(pubDate) });
  }
  return items;
}

function textOf(block, tag) {
  const cdata = block.match(new RegExp("<" + tag + "[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/" + tag + ">", "i"));
  if (cdata) return cdata[1].trim();
  const normal = block.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)<\\/" + tag + ">", "i"));
  if (normal) return normal[1].replace(/<[^>]+>/g, "").trim();
  return "";
}

function decode(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
