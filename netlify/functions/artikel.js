/* Beitraege — was die Verwaltung selbst schreibt.

   /.netlify/functions/artikel

     GET                      -> { ok, artikel: [ … ] }   Liste, Neuestes vorn
     GET ?id=<id>             -> { ok, artikel: { … } }   ein einzelner, mit Text
     POST { tat: "vorschau", url }                         nachsehen, was dort steht
     POST { titel, text, link, bild, quelle, push }        veroeffentlichen
     POST { tat: "weg", id }                               zuruecknehmen

   Ein Beitrag ist entweder selbst geschrieben (Ueberschrift und Text) oder
   ein fremder Artikel (Link). Beim Link holt "vorschau" die Ueberschrift, das
   Vorschaubild und die Quelle von der Seite selbst — dieselben Angaben, aus
   denen auch WhatsApp seine Karte baut (Open Graph).

   Lesen darf jeder Angemeldete, schreiben nur die Verwaltung.

   Der Schluessel traegt die Zeit rueckwaerts (1e15 minus Zeitstempel) — dann
   steht in der Liste des Speichers das Neueste vorn, ohne dass irgendwer
   sortieren muss. Dieselbe Bauweise wie beim Meldungsbuch.

   In der Liste steht nur der Anfang des Textes (der Vorspann). Wer den ganzen
   Beitrag will, holt ihn einzeln — sonst zieht die App bei jedem Start alles
   mit, was je geschrieben wurde. */

import { getStore } from "@netlify/blobs";
import { keys } from "./vapid.js";
import { ARTIKEL, kontoLesen, chefLesen, geheimnis, notieren } from "./sitzung.js";

const MAX_TITEL = 120;
const MAX_TEXT = 20000;
const VORSPANN = 180;
const HOECHSTENS = 60;

export default async (request) => {
  if (!geheimnis()) {
    return json({ ok: false, fehler: "RCP_GEHEIMNIS ist nicht gesetzt" }, 503);
  }

  try {
    const store = getStore(ARTIKEL);

    if (request.method !== "POST") {
      const konto = await kontoLesen(request);
      if (!konto) return json({ ok: false, fehler: "nicht angemeldet" }, 401);

      const id = new URL(request.url).searchParams.get("id");
      if (id) {
        const a = await store.get(schluessel(id), { type: "json", consistency: "strong" }).catch(() => null);
        if (!a) return json({ ok: false, fehler: "nicht gefunden" }, 404);
        return json({ ok: true, artikel: a });
      }
      return json({ ok: true, artikel: await liste(store) });
    }

    const chef = await chefLesen(request);
    if (!chef) return json({ ok: false, fehler: "nur fuer die Verwaltung" }, 403);

    let body = {};
    try {
      body = (await request.json()) || {};
    } catch (e) {
      return json({ ok: false, fehler: "kein gueltiges JSON" }, 400);
    }

    if (body.tat === "vorschau") {
      const v = await schauen(String(body.url || ""));
      if (!v) return json({ ok: false, fehler: "Von dieser Adresse kommt nichts zurück." }, 400);
      return json({ ok: true, vorschau: v });
    }

    if (body.tat === "weg") {
      const id = String(body.id || "");
      if (!id) return json({ ok: false, fehler: "welcher denn" }, 400);
      await store.delete(schluessel(id)).catch(() => {});
      return json({ ok: true, artikel: await liste(store) });
    }

    const titel = String(body.titel || "").trim().slice(0, MAX_TITEL);
    const text = String(body.text || "").trim().slice(0, MAX_TEXT);
    const link = adresse(body.link);
    if (!titel) return json({ ok: false, fehler: "Ohne Überschrift geht es nicht." }, 400);
    // Ein fremder Artikel braucht keinen eigenen Text — der Link ist der Inhalt
    if (!text && !link) return json({ ok: false, fehler: "Ohne Text oder Link geht es nicht." }, 400);

    const zeit = Date.now();
    const id = String(1e15 - zeit) + "-" + Math.random().toString(36).slice(2, 8);
    const artikel = {
      id: id,
      zeit: new Date(zeit).toISOString(),
      titel: titel,
      text: text,
      link: link,
      bild: adresse(body.bild),
      quelle: String(body.quelle || "").trim().slice(0, 60),
      von: chef.name || chef.mail
    };
    await store.setJSON(schluessel(id), artikel);

    await notieren({
      titel: titel,
      text: text ? vorspann(text) : (artikel.quelle || ""),
      url: "/?beitrag=" + encodeURIComponent(id),
      art: "beitrag"
    });

    let gesendet = 0;
    if (body.push !== false) gesendet = await wecken(titel, text, id);

    return json({ ok: true, id: id, gesendet: gesendet, artikel: await liste(store) });
  } catch (e) {
    return json({ ok: false, fehler: String((e && e.message) || e) }, 500);
  }
};

function schluessel(id) {
  return "a/" + String(id).replace(/[^0-9a-z-]/gi, "");
}

function vorspann(text) {
  const t = String(text).replace(/\s+/g, " ").trim();
  return t.length > VORSPANN ? t.slice(0, VORSPANN - 1).replace(/\s+\S*$/, "") + " …" : t;
}

/* Die Liste traegt keinen ganzen Text mit — nur so viel, dass man weiss,
   worum es geht. */
async function liste(store) {
  const l = await store.list({ prefix: "a/" }).catch(() => ({ blobs: [] }));
  const schluessels = (l.blobs || []).map((b) => b.key).sort().slice(0, HOECHSTENS);
  const alle = await Promise.all(
    schluessels.map((k) => store.get(k, { type: "json" }).catch(() => null))
  );
  return alle.filter(Boolean).map((a) => ({
    id: a.id,
    zeit: a.zeit,
    titel: a.titel,
    von: a.von,
    link: a.link || "",
    bild: a.bild || "",
    quelle: a.quelle || "",
    vorspann: vorspann(a.text || "")
  }));
}

/* ---------- Nachsehen, was hinter einem Link steht ----------

   Dieselben Angaben, aus denen auch WhatsApp seine Vorschaukarte baut:
   Open Graph im Kopf der Seite. Wo es die nicht gibt, tut es der Titel.

   Geholt wird nur der Anfang der Seite — der Kopf steht vorn, und ein
   ganzes Nachrichtenportal muss deswegen nicht durch die Leitung. */
export async function schauen(roh) {
  const url = adresse(roh);
  if (!url) return null;

  let host = "";
  try { host = new URL(url).hostname.toLowerCase(); } catch (e) { return null; }
  if (privat(host)) return null;

  const abbruch = AbortSignal.timeout ? AbortSignal.timeout(9000) : undefined;
  let antwort;
  try {
    antwort = await fetch(url, {
      redirect: "follow",
      signal: abbruch,
      headers: {
        // Ohne Kennung liefern manche Portale nur eine Sperrseite aus
        "User-Agent": "Mozilla/5.0 (compatible; AktienListe/1.0; +https://rcp-aktien.netlify.app)",
        "Accept": "text/html,application/xhtml+xml"
      }
    });
  } catch (e) {
    return null;
  }
  if (!antwort.ok) return null;

  const html = (await stueckweise(antwort)).slice(0, 300000);
  const m = kopfdaten(html);
  const titel = m["og:title"] || m["twitter:title"] || zwischenTitel(html) || "";
  if (!titel) return null;

  const ziel = antwort.url || url;
  return {
    link: ziel,
    titel: titel.slice(0, MAX_TITEL),
    bild: dazu(m["og:image"] || m["twitter:image"] || m["twitter:image:src"] || "", ziel),
    quelle: (m["og:site_name"] || wirt(ziel)).slice(0, 60),
    beschreibung: (m["og:description"] || m["description"] || "").slice(0, 300)
  };
}

/* Nur der Anfang: 300 KB reichen fuer jeden Kopf, und ein Portal mit
   Endlos-Strom haelt die Function damit nicht auf. */
async function stueckweise(antwort) {
  if (!antwort.body || !antwort.body.getReader) return await antwort.text();
  const leser = antwort.body.getReader();
  const dekoder = new TextDecoder("utf-8");
  let raus = "";
  try {
    for (;;) {
      const { done, value } = await leser.read();
      if (done) break;
      raus += dekoder.decode(value, { stream: true });
      if (raus.length > 300000) break;
    }
  } catch (e) { /* was da ist, reicht */ }
  try { await leser.cancel(); } catch (e) {}
  return raus;
}

/* Alle <meta>-Kaesten einsammeln. Reihenfolge der Attribute ist beliebig —
   deshalb wird jeder Kasten einzeln angesehen, statt eine Reihenfolge zu
   unterstellen. Der erste Treffer je Name gilt. */
function kopfdaten(html) {
  const raus = {};
  const kaesten = html.match(/<meta\b[^>]*>/gi) || [];
  for (const k of kaesten) {
    const n = (k.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i) || [])[1];
    const c = (k.match(/content\s*=\s*["']([^"']*)["']/i) || [])[1];
    if (!n || c === undefined) continue;
    const schluessel = n.toLowerCase();
    if (!(schluessel in raus) && c.trim()) raus[schluessel] = entziffern(c.trim());
  }
  return raus;
}

function zwischenTitel(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? entziffern(m[1].replace(/\s+/g, " ").trim()) : "";
}

/* Ueberschriften kommen als HTML herein — mit &uuml; und &ndash; und was die
   Portale sonst noch setzen. Was hier nicht steht, kommt in aller Regel als
   Zahl (&#252;) und wird darunter aufgeloest. */
const ZEICHEN = {
  amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ",
  auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß",
  agrave: "à", aacute: "á", egrave: "è", eacute: "é", ecirc: "ê",
  iacute: "í", oacute: "ó", ocirc: "ô", uacute: "ú", ccedil: "ç", ntilde: "ñ",
  ndash: "–", mdash: "—", hellip: "…", middot: "·", bull: "•",
  laquo: "«", raquo: "»", bdquo: "„", ldquo: "“", rdquo: "”",
  sbquo: "‚", lsquo: "‘", rsquo: "’", prime: "′", times: "×",
  euro: "€", pound: "£", deg: "°", copy: "©", reg: "®", trade: "™", shy: ""
};

function entziffern(s) {
  return String(s)
    .replace(/&([a-zA-Z][a-zA-Z0-9]{1,9});/g, (g, n) => {
      if (n in ZEICHEN) return ZEICHEN[n];
      const klein = n.toLowerCase();
      return klein in ZEICHEN ? ZEICHEN[klein] : g;
    })
    .replace(/&#x([0-9a-f]+);/gi, (g, n) => zeichen(parseInt(n, 16), g))
    .replace(/&#(\d+);/g, (g, n) => zeichen(Number(n), g));
}

function zeichen(z, sonst) {
  return z > 0 && z < 1114112 ? String.fromCodePoint(z) : sonst;
}

// Relative Bildadressen gegen die Seite aufloesen, auf der sie standen
function dazu(bild, basis) {
  if (!bild) return "";
  try { return adresse(new URL(bild, basis).href); } catch (e) { return ""; }
}

function wirt(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
}

/* Nur http und https, und nichts, was auf das eigene Netz zeigt. Anstossen
   kann das ohnehin nur die Verwaltung — aber eine Function, die jede Adresse
   abruft, die man ihr hinhaelt, waere ein Werkzeug fuer andere Zwecke. */
function adresse(roh) {
  const s = String(roh || "").trim();
  if (!s) return "";
  let u;
  try { u = new URL(s); } catch (e) { return ""; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return "";
  if (privat(u.hostname.toLowerCase())) return "";
  return u.href.slice(0, 500);
}

function privat(host) {
  const h = host.replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "::1" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^(127|10|0)\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^(fc|fd|fe80)/i.test(h)) return true;
  return false;
}

/* Alle angemeldeten Geraete wecken. Geraete, die der Push-Dienst nicht mehr
   kennt (404/410), fliegen dabei raus — wie bei nachricht.js. */
async function wecken(titel, text, id) {
  try {
    const store = getStore("aktien-push");
    const l = await store.list({ prefix: "sub-" });
    const geraete = (await Promise.all(
      (l.blobs || []).map((b) =>
        store.get(b.key, { type: "json" }).catch(() => null).then((s) => ({ key: b.key, sub: s }))
      )
    )).filter((g) => g.sub && g.sub.endpoint && g.sub.keys);
    if (!geraete.length) return 0;

    const webpush = (await import("web-push")).default;
    const k = await keys();
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:push@rcp-aktien.netlify.app",
      k.publicKey,
      k.privateKey
    );

    const nutzlast = JSON.stringify({
      title: titel,
      body: vorspann(text),
      tag: "beitrag-" + id,
      url: "/?beitrag=" + encodeURIComponent(id)
    });

    let gesendet = 0;
    for (const g of geraete) {
      try {
        await webpush.sendNotification(g.sub, nutzlast);
        gesendet++;
      } catch (e) {
        const code = e && e.statusCode;
        if (code === 404 || code === 410) await store.delete(g.key).catch(() => {});
      }
    }
    return gesendet;
  } catch (e) {
    return 0;   // der Beitrag steht auch ohne Push
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
