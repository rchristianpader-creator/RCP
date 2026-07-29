/* Prueft die Einkaufszonen und schickt Push, wenn ein Kurs neu in seine Zone eintritt.
   Laeuft von selbst alle 30 Minuten.

   Automatisch, ohne Konfiguration:
   - Zonen und Symbole liest die Function direkt aus der veroeffentlichten index.html
   - Empfaenger kommen aus Netlify Blobs (dort landen sie beim Tippen auf "Benachrichtigungen")
   - VAPID-Schluessel werden beim ersten Aufruf erzeugt und gespeichert

   Optional per Environment-Variable: SITE_PASSWORD (falls die Seite geschuetzt ist),
   VAPID_PUBLIC / VAPID_PRIVATE, VAPID_SUBJECT. */

import webpush from "web-push";
import { getStore } from "@netlify/blobs";
import { keys } from "./vapid.js";

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

  const usdPerEur = (await quote("EURUSD=X").then((q) => q && q.price)) || null;
  const report = [];

  for (const item of watch) {
    const q = await quote(item.yahoo);
    if (!q || !q.price) {
      report.push({ badge: item.badge, status: "kein Kurs" });
      continue;
    }

    let eur = q.price;
    if (q.currency === "USD") {
      if (!usdPerEur) {
        report.push({ badge: item.badge, status: "kein Wechselkurs" });
        continue;
      }
      eur = q.price / usdPerEur;
    } else if (q.currency && q.currency !== "EUR") {
      report.push({ badge: item.badge, status: "Waehrung " + q.currency });
      continue;
    }

    const inZone = eur <= item.high && eur >= item.low;
    const key = "zone-" + item.badge;
    const was = await store.get(key).catch(() => null);

    if (inZone && was !== "in") {
      await senden(store, subs, {
        title: item.label + " in der Zone",
        body: fmt(eur) + " EUR — Zone " + fmt(item.high) + " bis " + fmt(item.low) + " EUR",
        url: "/#" + item.anchor,
        tag: item.badge
      });
      report.push({ badge: item.badge, kurs: fmt(eur), status: "Push gesendet" });
    } else {
      report.push({
        badge: item.badge,
        kurs: fmt(eur),
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

async function zonen() {
  const base = process.env.URL || process.env.DEPLOY_URL;
  if (!base) return [];

  const headers = { "User-Agent": "AktienListe-Alerts/1.0" };
  if (process.env.SITE_PASSWORD) {
    headers.Authorization = "Basic " + btoa("alerts:" + process.env.SITE_PASSWORD);
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

    const anchor = firstMatch(block, /^\s+id="([^"]+)"/);
    const yahoo = firstMatch(block, /data-yahoo="([^"]+)"/);
    const label = firstMatch(block, /<h2>([^<]+)<\/h2>/);
    const badge = firstMatch(block, /<span class="badge">([^<]+)<\/span>/);
    const zone = firstMatch(block, /class="zone">Einkaufszone\s*([^<]+)</);
    if (!yahoo || !zone) continue;

    const parts = zone.split(/[–-]/);
    if (parts.length < 2) continue;
    const a = num(parts[0]);
    const b = num(parts[1]);
    if (!isFinite(a) || !isFinite(b)) continue;

    out.push({
      label: (label || badge || yahoo).trim(),
      badge: (badge || yahoo).trim(),
      yahoo: yahoo,
      anchor: anchor || "",
      high: Math.max(a, b),
      low: Math.min(a, b)
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

function fmt(n) {
  return Number(n).toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj, null, 2), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
