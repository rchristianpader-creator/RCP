/* Beitraege — was die Verwaltung selbst schreibt.

   /.netlify/functions/artikel

     GET                      -> { ok, artikel: [ … ] }   Liste, Neuestes vorn
     GET ?id=<id>             -> { ok, artikel: { … } }   ein einzelner, mit Text
     POST { titel, text, push }                            veroeffentlichen
     POST { tat: "weg", id }                               zuruecknehmen

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
        const a = await store.get(schluessel(id), { type: "json" }).catch(() => null);
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

    if (body.tat === "weg") {
      const id = String(body.id || "");
      if (!id) return json({ ok: false, fehler: "welcher denn" }, 400);
      await store.delete(schluessel(id)).catch(() => {});
      return json({ ok: true, artikel: await liste(store) });
    }

    const titel = String(body.titel || "").trim().slice(0, MAX_TITEL);
    const text = String(body.text || "").trim().slice(0, MAX_TEXT);
    if (!titel) return json({ ok: false, fehler: "Ohne Überschrift geht es nicht." }, 400);
    if (!text) return json({ ok: false, fehler: "Ohne Text geht es nicht." }, 400);

    const zeit = Date.now();
    const id = String(1e15 - zeit) + "-" + Math.random().toString(36).slice(2, 8);
    const artikel = {
      id: id,
      zeit: new Date(zeit).toISOString(),
      titel: titel,
      text: text,
      von: chef.name || chef.mail
    };
    await store.setJSON(schluessel(id), artikel);

    await notieren({
      titel: titel,
      text: vorspann(text),
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
    vorspann: vorspann(a.text || "")
  }));
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
