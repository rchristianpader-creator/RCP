/* Nachricht an alle Geraete, die die App angemeldet haben.

   Nur fuer die Verwaltung.

   Aufruf: /.netlify/functions/nachricht

     GET                       -> { ok, geraete }         wie viele Geraete es gibt
     POST { titel, text }      -> { ok, gesendet, weg }   raus damit

   Empfaenger sind alle Eintraege im Store "aktien-push" — dieselben, die auch
   Kursalarme bekommen. Geraete, die der Push-Dienst nicht mehr kennt (404/410),
   werden dabei aussortiert. */

import { getStore } from "@netlify/blobs";
import { keys } from "./vapid.js";
import { chefLesen, geheimnis, notieren } from "./sitzung.js";

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

  // Erst hier laden: das blosse Zaehlen der Geraete braucht es nicht, und
  // was im Kopf steht, wird bei jedem Kaltstart mitgeladen.
  const webpush = (await import("web-push")).default;
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

  await notieren({ titel: titel || "Aktien-Liste", text: text, url: "/", art: "nachricht" });

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

/* Jeder Eintrag ist eine eigene Anfrage an den Speicher. Nacheinander
   gelesen wartet die Verwaltung beim Oeffnen auf eine Anfrage nach der
   anderen — deshalb alle auf einmal. */
async function geraete(store) {
  try {
    const l = await store.list({ prefix: "sub-" });
    const alle = await Promise.all(
      (l.blobs || []).map((b) =>
        store.get(b.key, { type: "json" }).catch(() => null).then((s) => ({ key: b.key, sub: s }))
      )
    );
    return alle.filter((g) => g.sub && g.sub.endpoint && g.sub.keys);
  } catch (e) {
    return [];   // leerer Store zaehlt als null Geraete
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
