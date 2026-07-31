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
import { lesen as positionenLesen, LADEN as POSITIONEN } from "./positionen.js";
import { saeubern as bildId } from "./bild.js";
import { chefLesen, geheimnis, notieren } from "./sitzung.js";

const MAX_TITEL = 60;
const MAX_TEXT = 300;
const MAX_MARKEN = 6;

export default async (request) => {
  if (!geheimnis()) {
    return json({ ok: false, fehler: "RCP_GEHEIMNIS ist nicht gesetzt" }, 503);
  }

  const chef = await chefLesen(request);
  if (!chef) return json({ ok: false, fehler: "nur fuer die Verwaltung" }, 403);

  const store = getStore("aktien-push");

  /* Beim Zaehlen kommt gleich die Liste der Positionen mit: die Verwaltung
     braucht sie, um Kuerzel anbieten zu koennen, und ein zweiter Gang zum
     Speicher waere dafuer zu viel. */
  if (request.method !== "POST") {
    const [wieViele, welche] = await Promise.all([geraete(store), symbole()]);
    return json({ ok: true, geraete: wieViele.length, symbole: welche });
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

  /* Markierte Positionen. Geprueft wird gegen die echte Liste — was es nicht
     gibt, faellt weg; sonst stuende in der Meldung ein Kuerzel, hinter dem
     keine Karte liegt. */
  const gemeint = await marken(body.symbole);
  const kuerzel = gemeint.map((p) => p.badge);

  /* Ein Bild zur Meldung. Uebergeben wird nur die ID, die bild.js beim
     Hochladen zurueckgegeben hat — eine beliebige Adresse waere ein Weg,
     fremde Bilder in die Glocke zu haengen. */
  const bild = bildId(body.bild) ? "/.netlify/functions/bild?id=" + bildId(body.bild) : "";

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

  /* Im Push gibt es keine Zeichen, nur Text — deshalb stehen die Kuerzel
     dort vorn. In der Glocke stehen sie als eigene Zeichen an der Meldung,
     der Text bleibt dort, wie er getippt wurde. */
  /* Ohne Markierung fuehrt sie zu den Meldungen — dort steht sie zum
     Nachlesen. Frueher ging es auf die blosse Liste, und wer die Meldung
     vom Sperrbildschirm weggewischt hatte, fand sie nirgends wieder. */
  const ziel = gemeint.length ? "/#" + gemeint[0].id : "/?meldungen=1";
  const rumpf = kuerzel.length ? kuerzel.join(" · ") + (text ? " · " + text : "") : text;

  // Eigener Tag je Nachricht, damit eine neue die vorige nicht ueberschreibt
  const nutzlast = JSON.stringify({
    title: titel || "Aktien-Liste",
    body: rumpf,
    tag: "nachricht-" + Date.now().toString(36),
    url: ziel,
    // Android zeigt das im Banner; iOS nicht. In der Glocke steht es immer.
    image: bild ? new URL(request.url).origin + bild : ""
  });

  await notieren({
    titel: titel || "Aktien-Liste",
    text: text,
    url: ziel,
    art: "nachricht",
    zeichen: kuerzel,
    bild: bild
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
    markiert: kuerzel,
    bild: bild,
    fehler: fehler.length ? fehler : undefined,
    von: chef.mail
  });
};

/* Die Positionen, so knapp wie die Verwaltung sie zum Anbieten braucht. */
async function symbole() {
  try {
    return (await positionenLesen(getStore(POSITIONEN)))
      .map((p) => ({ id: p.id, badge: p.badge, name: p.name }));
  } catch (e) {
    return [];
  }
}

async function marken(roh) {
  if (!Array.isArray(roh) || !roh.length) return [];
  const gewollt = roh.slice(0, MAX_MARKEN).map((x) => String(x || "").trim().toLowerCase());
  const alle = await symbole();
  // Reihenfolge der Auswahl beibehalten, Doppelte wegwerfen
  const raus = [];
  for (const id of gewollt) {
    const p = alle.find((x) => x.id === id);
    if (p && !raus.some((r) => r.id === p.id)) raus.push(p);
  }
  return raus;
}

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
