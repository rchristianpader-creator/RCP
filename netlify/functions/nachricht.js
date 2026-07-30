/* Nachricht an alle Geraete, die die App angemeldet haben.

   Nur fuer die Verwaltung.

   Aufruf: /.netlify/functions/nachricht

     GET                       -> { ok, geraete }         wie viele Geraete es gibt
     POST { titel, text }      -> { ok, gesendet, weg }   raus damit

   Empfaenger sind alle Eintraege im Store "aktien-push" — dieselben, die auch
   Kursalarme bekommen. Geraete, die der Push-Dienst nicht mehr kennt (404/410),
   werden dabei aussortiert. */

import webpush from "web-push";
import { getStore } from "@netlify/blobs";
import { keys } from "./vapid.js";
import { chefLesen, geheimnis } from "./sitzung.js";

const MAX_TITEL = 60;
const MAX_TEXT = 300;

export default async (request) => {
  if (!geheimnis()) {
    return json({ ok: false, fehler: "RCP_GEHEIMNIS ist nicht gesetzt" }, 503);
  }

  const chef = await chefLesen(request);
  if (!chef) return json({ ok: false, fehler: "nur fuer die Verwaltung" }, 403);

  const store = getStore("aktien-push");

  if (request.method !== "POST") {
    return json({ ok: true, geraete: (await geraete(store)).length });
  }

  let body = {};
  try {
    body = (await request.json()) || {};
  } catch (e) {
    return json({ ok: false, fehler: "kein gueltiges JSON" }, 400);
  }

  const titel = String(body.titel || "").trim().slice(0, MAX_TITEL);
  const text = String(body.text || "").trim().slice(0, MAX_TEXT);

  if (!titel && !text) {
    return json({ ok: false, fehler: "Titel oder Text muss ausgefuellt sein." }, 400);
  }

  const liste = await geraete(store);
  if (!liste.length) {
    return json({ ok: false, fehler: "Kein Geraet angemeldet." }, 400);
  }

  const k = await keys();
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:push@rcp-aktien.netlify.app",
    k.publicKey,
    k.privateKey
  );

  // Eigener Tag je Nachricht, damit eine neue die vorige nicht ueberschreibt
  const nutzlast = JSON.stringify({
    title: titel || "Aktien-Liste",
    body: text,
    tag: "nachricht-" + Date.now().toString(36),
    url: "/"
  });

  let gesendet = 0;
  let weg = 0;
  const fehler = [];

  for (const g of liste) {
    try {
      await webpush.sendNotification(g.sub, nutzlast);
      gesendet++;
    } catch (e) {
      const code = e && e.statusCode;
      if (code === 404 || code === 410) {
        await store.delete(g.key).catch(() => {});
        weg++;
      } else {
        fehler.push(code || String((e && e.message) || e));
      }
    }
  }

  return json({
    ok: gesendet > 0,
    gesendet: gesendet,
    weg: weg,
    fehler: fehler.length ? fehler : undefined,
    von: chef.mail
  });
};

async function geraete(store) {
  const out = [];
  try {
    const l = await store.list({ prefix: "sub-" });
    for (const blob of l.blobs || []) {
      const s = await store.get(blob.key, { type: "json" }).catch(() => null);
      if (s && s.endpoint && s.keys) out.push({ key: blob.key, sub: s });
    }
  } catch (e) {
    // leerer Store zaehlt als null Geraete
  }
  return out;
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
