/* Bilder zu Meldungen.

   /.netlify/functions/bild

     POST { daten: "data:image/jpeg;base64,…" }  -> { ok, id, url }   nur Verwaltung
     GET  ?id=<id>                               -> das Bild selbst

   Abgelegt wird im Store "aktien-bilder", als JSON mit Typ und Base64. Das
   ist nicht die sparsamste Form — ein Drittel mehr als die reinen Bytes —,
   aber es kommt mit demselben Speicher aus wie alles andere hier, und die
   Bilder sind klein: die App verkleinert sie vor dem Hochladen auf hoechstens
   1280 Pixel.

   Der Schluessel traegt die Zeit rueckwaerts, wie beim Meldungsbuch. Beim
   Hochladen wird weggeraeumt, was aelter als 90 Tage ist.

   Ausgeliefert wird mit langer Frist: eine ID zeigt immer auf dasselbe Bild.
   Hinter dem Tor bleibt es trotzdem — wer nicht angemeldet ist, kommt hier
   so wenig durch wie sonst irgendwo. */

import { getStore } from "@netlify/blobs";
import { chefLesen, kontoLesen, geheimnis } from "./sitzung.js";

const LADEN = "aktien-bilder";
const VERFALL = 90 * 24 * 60 * 60 * 1000;
/* Base64 macht aus drei Megabyte vier. Sechs Megabyte sind das, was eine
   Function als Anfrage entgegennimmt — darunter bleibt Luft fuer den Rest.
   Die App schickt nichts Groesseres: sie rechnet erst dann um. */
const HOECHSTENS = 6 * 1024 * 1024;
const TYPEN = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default async (request) => {
  if (!geheimnis()) {
    return json({ ok: false, fehler: "RCP_GEHEIMNIS ist nicht gesetzt" }, 503);
  }

  try {
    const store = getStore(LADEN);

    if (request.method !== "POST") {
      const konto = await kontoLesen(request);
      if (!konto) return json({ ok: false, fehler: "nicht angemeldet" }, 401);

      const id = saeubern(new URL(request.url).searchParams.get("id"));
      if (!id) return json({ ok: false, fehler: "welches denn" }, 400);
      const b = await store.get("b/" + id, { type: "json" }).catch(() => null);
      if (!b || !b.daten) return json({ ok: false, fehler: "nicht gefunden" }, 404);

      return new Response(Buffer.from(b.daten, "base64"), {
        headers: {
          "Content-Type": b.typ || "image/jpeg",
          "Cache-Control": "private, max-age=31536000, immutable"
        }
      });
    }

    const chef = await chefLesen(request);
    if (!chef) return json({ ok: false, fehler: "nur fuer die Verwaltung" }, 403);

    let body = {};
    try {
      body = (await request.json()) || {};
    } catch (e) {
      return json({ ok: false, fehler: "kein gueltiges JSON" }, 400);
    }

    const teile = String(body.daten || "").match(/^data:([a-z/+-]+);base64,(.+)$/i);
    if (!teile) return json({ ok: false, fehler: "Das ist kein Bild." }, 400);

    const typ = teile[1].toLowerCase();
    const daten = teile[2];
    if (TYPEN.indexOf(typ) < 0) return json({ ok: false, fehler: "Dieses Format geht nicht." }, 400);
    if (daten.length > HOECHSTENS) return json({ ok: false, fehler: "Das Bild ist zu groß." }, 413);

    const zeit = Date.now();
    const id = String(1e15 - zeit) + "-" + Math.random().toString(36).slice(2, 8);
    /* Die Masse kommen mit: damit die App den Platz im richtigen
       Seitenverhaeltnis freihalten kann, bevor das Bild da ist — und
       nichts beschneiden muss. */
    const breite = Math.max(0, Math.min(20000, Math.round(Number(body.breite) || 0)));
    const hoehe = Math.max(0, Math.min(20000, Math.round(Number(body.hoehe) || 0)));
    await store.setJSON("b/" + id, {
      zeit: new Date(zeit).toISOString(), typ: typ, daten: daten,
      breite: breite, hoehe: hoehe
    });

    aufraeumen(store).catch(() => {});

    return json({ ok: true, id: id, breite: breite, hoehe: hoehe,
                  url: "/.netlify/functions/bild?id=" + id });
  } catch (e) {
    return json({ ok: false, fehler: String((e && e.message) || e) }, 500);
  }
};

/* Wer ein Bild hochlaedt, raeumt die alten mit weg. Ein eigener Lauf dafuer
   waere ein Dienst mehr, den niemand vermisst. */
async function aufraeumen(store) {
  const l = await store.list({ prefix: "b/" }).catch(() => ({ blobs: [] }));
  const jetzt = Date.now();
  await Promise.all((l.blobs || []).map(async (b) => {
    const e = await store.get(b.key, { type: "json" }).catch(() => null);
    const t = e && e.zeit ? Date.parse(e.zeit) : 0;
    if (!t || jetzt - t > VERFALL) await store.delete(b.key).catch(() => {});
  }));
}

export function saeubern(id) {
  return String(id || "").replace(/[^0-9a-z-]/gi, "").slice(0, 40);
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
