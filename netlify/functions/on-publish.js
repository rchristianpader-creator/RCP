/* Meldet Aenderungen, sobald ein Deploy durch ist.

   Netlify ruft diese Function nach jedem erfolgreichen Deploy auf
   (Site configuration -> Notifications -> Outgoing webhook -> Deploy succeeded).

   Sie vergleicht die veroeffentlichte Seite mit dem letzten Stand und schickt
   nur bei echten Aenderungen einen Push:
     1. Der Text im Laufband hat sich geaendert  -> genau dieser Text geht raus
     2. Neue Positionen in der Liste             -> "Neu in der Liste: ..."

   Beim allerersten Aufruf wird nur der Stand gespeichert, ohne Push. */

import webpush from "web-push";
import { getStore } from "@netlify/blobs";
import { keys } from "./vapid.js";
import { dienstKopf } from "./sitzung.js";
import { lesen, LADEN } from "./positionen.js";

export default async () => {
  const store = getStore("aktien-push");

  const jetzt = await seiteLesen();
  if (!jetzt) {
    return json({ ok: false, fehler: "Seite nicht lesbar" }, 500);
  }

  const vorher = await store.get("published-state", { type: "json" }).catch(() => null);
  await store.setJSON("published-state", jetzt);

  if (!vorher) {
    return json({ ok: true, hinweis: "erster Stand gespeichert, kein Push" });
  }

  const neueWerte = jetzt.positionen.filter((x) => vorher.positionen.indexOf(x) === -1);
  const bannerNeu = jetzt.banner && jetzt.banner !== vorher.banner;

  let title = null;
  let body = null;

  if (neueWerte.length) {
    title = neueWerte.length === 1 ? "Neu in der Liste" : "Neu in der Liste";
    body = neueWerte.join(" · ") + (bannerNeu ? " — " + jetzt.banner : "");
  } else if (bannerNeu) {
    title = "Aktien-Liste";
    body = jetzt.banner;
  }

  if (!title) {
    return json({ ok: true, hinweis: "nichts Neues", banner: jetzt.banner });
  }

  const subs = [];
  try {
    const list = await store.list({ prefix: "sub-" });
    for (const blob of list.blobs || []) {
      const sub = await store.get(blob.key, { type: "json" });
      if (sub && sub.endpoint) subs.push({ key: blob.key, sub: sub });
    }
  } catch (e) {}

  if (!subs.length) {
    return json({ ok: true, hinweis: "kein Geraet angemeldet", wollte_senden: body });
  }

  const k = await keys();
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:push@rcp-aktien.netlify.app",
    k.publicKey,
    k.privateKey
  );

  const payload = JSON.stringify({
    title: title,
    body: body,
    url: neueWerte.length ? "/#" + jetzt.letzteId : "/",
    tag: "veroeffentlicht"
  });

  let gesendet = 0;
  for (const entry of subs) {
    try {
      await webpush.sendNotification(entry.sub, payload);
      gesendet++;
    } catch (err) {
      const code = err && err.statusCode;
      if (code === 404 || code === 410) await store.delete(entry.key).catch(() => {});
    }
  }

  return json({ ok: true, gesendet: gesendet, titel: title, text: body });
};

/* Liest Laufband-Text und Positionen aus der veroeffentlichten Seite */
async function seiteLesen() {
  const base = process.env.URL || process.env.DEPLOY_URL;
  if (!base) return null;

  const headers = { "User-Agent": "AktienListe-Publish/1.0" };
  // Das Tor laesst die eigene Seite nur mit unterschriebener Kennung durch
  Object.assign(headers, dienstKopf());

  let html = "";
  try {
    const res = await fetch(base + "/index.html", { headers, cache: "no-store" });
    if (!res.ok) return null;
    html = await res.text();
  } catch (e) {
    return null;
  }

  // Erster Span im Laufband, ohne Tags
  let banner = "";
  const m = html.match(/<div class="news-banner-track">\s*<span>([\s\S]*?)<\/span>/);
  if (m) {
    banner = m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Positionen kommen aus der gespeicherten Watchlist, nicht mehr aus dem HTML.
  // Neue Eintraege meldet positionen.js beim Speichern selbst; hier bleibt es
  // als Netz fuer den Fall, dass die Liste anders geaendert wurde.
  const positionen = (await lesen(getStore(LADEN))).map((p) => p.badge).filter(Boolean);

  return { banner: banner, positionen: positionen, letzteId: letzteId };
}

function json(obj, status) {
  return new Response(JSON.stringify(obj, null, 2), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
