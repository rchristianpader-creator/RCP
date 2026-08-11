/* Prueft die Einkaufszonen und schickt Push, wenn ein Kurs neu in seine Zone eintritt.
   Laeuft von selbst alle 30 Minuten.

   Automatisch, ohne Konfiguration:
   - Zonen und Symbole liest die Function direkt aus der veroeffentlichten index.html
   - Zonen stehen in der Waehrung ihrer Position (Fib 0,5-0,618 aus den
     Charts). Verglichen wird ohne Umrechnung: der Kurs von Yahoo kommt in
     derselben Waehrung wie die Notierung, und der Ausloeser soll nicht am
     Wechselkurs haengen. Nur wenn beides in Dollar steht, zeigt die Meldung
     zusaetzlich den live umgerechneten Euro-Wert — eine Position, die schon
     in Euro notiert, braucht ihn nicht
   - Empfaenger kommen aus Netlify Blobs (dort landen sie beim Tippen auf "Benachrichtigungen")
   - VAPID-Schluessel werden beim ersten Aufruf erzeugt und gespeichert

   Optional per Environment-Variable: SITE_PASSWORD (falls die Seite geschuetzt ist),
   VAPID_PUBLIC / VAPID_PRIVATE, VAPID_SUBJECT. */

import webpush from "web-push";
import { notieren } from "./sitzung.js";
import { getStore } from "@netlify/blobs";
import { keys } from "./vapid.js";
import { lesen, zonenZahlen, LADEN } from "./positionen.js";

const QUIET_FROM = 23;
const QUIET_TO = 7;

export default async () => {
  const hour = Number(
    new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      hour12: false
    }).format(new Date())
  );
  if (hour >= QUIET_FROM || hour < QUIET_TO) {
    return json({ ok: true, uebersprungen: "Nachtruhe", stunde: hour });
  }

  const store = getStore("aktien-push");

  const subs = await empfaenger(store);
  if (!subs.length) {
    return json({ ok: true, hinweis: "noch kein Geraet angemeldet" });
  }

  const watch = await zonen();
  if (!watch.length) {
    return json({ ok: false, fehler: "keine Zonen in index.html gefunden" }, 500);
  }

  const k = await keys();
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:push@rcp-aktien.netlify.app",
    k.publicKey,
    k.privateKey
  );

  // Wechselkurs nur fuer die Anzeige in Euro; verglichen wird in USD.
  const rate = await eurUsd();
  const report = [];

  for (const item of watch) {
    const q = await quote(item.yahoo);
    if (!q || !q.price) {
      report.push({ badge: item.badge, status: "kein Kurs" });
      continue;
    }

    // Zone und Kurs stehen in derselben Waehrung: verglichen wird ohne
    // Umrechnung, damit der Ausloeser nicht am Wechselkurs haengt.
    const cur = q.currency || "";
    const price = q.price;
    const inZone = price <= item.high && price >= item.low;
    const key = "zone-" + item.badge;
    const was = await store.get(key).catch(() => null);

    if (inZone && was !== "in") {
      let text;
      if (rate && cur === "USD") {
        text =
          eur(price / rate) + " EUR — Zone " + eur(item.high / rate) + " bis " +
          eur(item.low / rate) + " EUR · " + fmt(price) + " USD";
      } else {
        text = fmt(price) + " " + cur + " — Zone " + fmt(item.high) + " bis " + fmt(item.low) + " " + cur;
      }

      await notieren({
        titel: item.label + " in der Zone",
        text: text,
        url: "/#" + item.anchor,
        art: "zone"
      });
      await senden(store, subs, {
        title: item.label + " in der Zone",
        body: text,
        url: "/#" + item.anchor,
        tag: item.badge
      });
      report.push({ badge: item.badge, kurs_usd: fmt(price), status: "Push gesendet" });
    } else {
      report.push({
        badge: item.badge,
        kurs_usd: fmt(price),
        kurs_eur: rate ? eur(price / rate) : null,
        zone_usd: fmt(item.high) + " - " + fmt(item.low),
        status: inZone ? "weiter in Zone" : "ausserhalb"
      });
    }

    await store.set(key, inZone ? "in" : "out").catch(() => {});
  }

  return json({ ok: true, geraete: subs.length, ergebnis: report });
};

export const config = { schedule: "*/30 * * * *" };

/* --- Empfaenger --- */

async function empfaenger(store) {
  const out = [];
  try {
    const list = await store.list({ prefix: "sub-" });
    for (const blob of list.blobs || []) {
      const sub = await store.get(blob.key, { type: "json" });
      if (sub && sub.endpoint) out.push({ key: blob.key, sub: sub });
    }
  } catch (e) {
    // Blobs nicht verfuegbar
  }
  if (!out.length && process.env.PUSH_SUB) {
    try {
      out.push({ key: null, sub: JSON.parse(process.env.PUSH_SUB) });
    } catch (e) {}
  }
  return out;
}

async function senden(store, subs, payload) {
  for (const entry of subs) {
    try {
      await webpush.sendNotification(entry.sub, JSON.stringify(payload));
    } catch (err) {
      const code = err && err.statusCode;
      // Geraet abgemeldet oder Subscription abgelaufen: Eintrag entfernen
      if ((code === 404 || code === 410) && entry.key) {
        await store.delete(entry.key).catch(() => {});
      } else {
        console.error("Push fehlgeschlagen", code, err && err.body);
      }
    }
  }
}

/* --- Zonen aus der eigenen Seite lesen --- */

/* Zonen und Symbole kommen aus der gespeicherten Watchlist. */
async function zonen() {
  const liste = await lesen(getStore(LADEN));
  const out = [];
  for (const p of liste) {
    const z = zonenZahlen(p.zone);
    if (!z || !p.yahoo) continue;
    out.push({
      anchor: p.id,
      badge: (p.badge || p.yahoo).trim(),
      yahoo: p.yahoo,
      high: z.high,
      low: z.low
    });
  }
  return out;
}

function firstMatch(text, re) {
  const m = text.match(re);
  return m ? m[1] : null;
}

// "40.557" -> 40557 ; "8,68" -> 8.68
function num(s) {
  return parseFloat(
    String(s || "")
      .replace(/[^\d.,]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  );
}

/* --- Kurse --- */

/* Kurse: erst Yahoo, dann Stooq. Yahoo blockt Anfragen aus Rechenzentren
   gelegentlich, Stooq liefert CSV ohne Schluessel. */
async function quote(symbol) {
  const y = await quoteYahoo(symbol);
  if (y && y.price) return y;
  return await quoteStooq(symbol);
}

async function quoteYahoo(symbol) {
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
    if (!meta || !meta.regularMarketPrice) return null;
    return { price: meta.regularMarketPrice, currency: meta.currency, quelle: "Yahoo" };
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
    const cur = /xau|xag|usd$/.test(stooqSymbol(symbol)) || stooqSymbol(symbol).endsWith(".us") ? "USD" : "USD";
    return { price: price, currency: cur, quelle: "Stooq" };
  } catch (e) {
    return null;
  }
}

async function eurUsd() {
  const q = await quote("EURUSD=X");
  const r = q && q.price;
  return r && isFinite(r) && r > 0.5 && r < 2 ? r : null;
}

function eur(n) {
  const stellen = n >= 1000 ? 0 : 2;
  return Number(n).toLocaleString("de-DE", {
    minimumFractionDigits: stellen,
    maximumFractionDigits: stellen
  });
}

function fmt(n) {
  return Number(n).toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj, null, 2), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
