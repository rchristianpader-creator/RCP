/* Die Watchlist als Daten.

   Bis hierher standen die zehn Karten als HTML in index.html und mussten von
   Hand gepflegt werden; status.js und alerts.js lasen die Zonen wieder aus
   dieser Seite heraus. Jetzt liegt die Liste in Netlify Blobs, die Seite baut
   ihre Karten daraus, und die Alarme lesen dieselbe Quelle.

   Aufruf: /.netlify/functions/positionen

     GET                        -> { ok, positionen: [...] }   fuer jeden Angemeldeten
     POST { positionen: [...] } -> ganze Liste ersetzen         nur Verwaltung

   Gespeichert wird die vollstaendige Liste in einem Eintrag: sie ist klein,
   die Reihenfolge steckt darin, und ein Schreibvorgang ist immer vollstaendig.

   Beim allerersten Aufruf, solange nichts gespeichert ist, wird der Bestand
   aus positionen-start.js uebernommen. */

import { getStore } from "@netlify/blobs";
import { START } from "./positionen-start.js";
import { keys } from "./vapid.js";
import { kontoLesen, chefLesen, geheimnis } from "./sitzung.js";

export const LADEN = "aktien-positionen";
export const EINTRAG = "liste";

const GRENZEN = {
  id: 24, name: 80, badge: 12, chip: 10, branche: 60,
  zone: 40, ziel: 40, tv: 40, yahoo: 20, frage: 80, keys: 120
};

export default async (request) => {
  if (!geheimnis()) {
    return json({ ok: false, fehler: "RCP_GEHEIMNIS ist nicht gesetzt" }, 503);
  }

  const store = getStore(LADEN);

  if (request.method !== "POST") {
    // Lesen darf jeder, der angemeldet ist — die Seite braucht es zum Aufbauen
    if (!(await kontoLesen(request))) {
      return json({ ok: false, fehler: "nicht angemeldet" }, 401);
    }
    const liste = await lesen(store);
    return json({ ok: true, anzahl: liste.length, positionen: liste });
  }

  const chef = await chefLesen(request);
  if (!chef) return json({ ok: false, fehler: "nur fuer die Verwaltung" }, 403);

  let body = {};
  try {
    body = (await request.json()) || {};
  } catch (e) {
    return json({ ok: false, fehler: "kein gueltiges JSON" }, 400);
  }

  const gepruft = pruefen(body.positionen);
  if (gepruft.fehler) return json({ ok: false, fehler: gepruft.fehler }, 400);

  const vorher = await lesen(store);
  await store.setJSON(EINTRAG, { zeit: new Date().toISOString(), von: chef.mail, liste: gepruft.liste });

  // Was ist dazugekommen? Das ist die Meldung wert.
  const alteIds = vorher.map((p) => p.id);
  const neu = gepruft.liste.filter((p) => alteIds.indexOf(p.id) < 0);
  let gemeldet = 0;
  if (neu.length && body.melden !== false) {
    gemeldet = await melden(neu);
  }

  return json({
    ok: true,
    anzahl: gepruft.liste.length,
    neu: neu.map((p) => p.badge),
    gemeldet: gemeldet
  });
};

export async function lesen(store) {
  let da = null;
  try {
    da = await store.get(EINTRAG, { type: "json" });
  } catch (e) {
    da = null;
  }
  if (da && Array.isArray(da.liste)) return da.liste;

  // Erster Aufruf: Bestand uebernehmen
  const start = pruefen(START).liste || [];
  try {
    await store.setJSON(EINTRAG, { zeit: new Date().toISOString(), von: "start", liste: start });
  } catch (e) {
    // nicht schreiben zu koennen ist kein Grund, nichts zu liefern
  }
  return start;
}

/* ---------- Pruefen ---------- */

function pruefen(roh) {
  if (!Array.isArray(roh)) return { fehler: "Liste fehlt" };
  if (!roh.length) return { fehler: "Die Liste darf nicht leer sein." };
  if (roh.length > 60) return { fehler: "Mehr als 60 Positionen sind nicht vorgesehen." };

  const liste = [];
  const gesehen = {};

  for (let i = 0; i < roh.length; i++) {
    const p = roh[i] || {};
    const wo = "Position " + (i + 1) + (p.badge ? " (" + text(p.badge, 12) + ")" : "");

    const id = String(p.id || "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,23}$/.test(id)) {
      return { fehler: wo + ": Kürzel darf nur Kleinbuchstaben, Ziffern und Bindestrich enthalten." };
    }
    if (gesehen[id]) return { fehler: "Das Kürzel „" + id + "“ kommt zweimal vor." };
    gesehen[id] = true;

    for (const feld of ["name", "badge", "chip", "zone", "tv", "yahoo"]) {
      if (!String(p[feld] || "").trim()) return { fehler: wo + ": „" + feld + "“ fehlt." };
    }

    const zone = String(p.zone).trim();
    if (!zonenZahlen(zone)) {
      return {
        fehler: wo + ": Die Einkaufszone muss zwei Zahlen enthalten, z. B. „29,52 – 27,05 USD“."
      };
    }

    if (!/^[A-Za-z0-9_.]+:[A-Za-z0-9_.!-]+$/.test(String(p.tv).trim())) {
      return { fehler: wo + ": TradingView-Symbol muss so aussehen: NASDAQ:INTC." };
    }

    for (const feld of ["fn", "fibo"]) {
      const url = String(p[feld] || "").trim();
      if (url && !/^https:\/\/[^\s"'<>]+$/.test(url)) {
        return { fehler: wo + ": „" + feld + "“ muss eine https-Adresse sein." };
      }
    }

    liste.push({
      id: id,
      name: text(p.name, GRENZEN.name),
      badge: text(p.badge, GRENZEN.badge),
      chip: text(p.chip, GRENZEN.chip),
      neu: p.neu === true || p.neu === "1",
      // Ueberarbeitet: dieselbe Machart wie "neu", nur leiser. Beides
      // gleichzeitig ist erlaubt — angezeigt wird dann NEU, denn was gerade
      // erst dazugekommen ist, ist nicht auch schon ueberarbeitet.
      update: p.update === true || p.update === "1",
      branche: text(p.branche, GRENZEN.branche),
      zone: text(zone, GRENZEN.zone),
      ziel: text(p.ziel, GRENZEN.ziel),
      tv: text(p.tv, GRENZEN.tv),
      yahoo: text(p.yahoo, GRENZEN.yahoo),
      frage: text(p.frage, GRENZEN.frage),
      fn: text(p.fn, 200),
      keys: text(p.keys, GRENZEN.keys),
      fibo: text(p.fibo, 200)
    });
  }

  return { liste: liste };
}

function text(wert, max) {
  // Steuerzeichen raus, damit nichts Unsichtbares in den Daten landet
  return String(wert === undefined || wert === null ? "" : wert)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

/* "29,52 – 27,05 USD" -> { high: 29.52, low: 27.05 }
   Dieselbe Lesart wie in status.js und alerts.js. */
export function zonenZahlen(zone) {
  const teile = String(zone || "").split(/[–—-]/);
  if (teile.length < 2) return null;
  const a = zahl(teile[0]);
  const b = zahl(teile[1]);
  if (!isFinite(a) || !isFinite(b) || a <= 0 || b <= 0) return null;
  return { high: Math.max(a, b), low: Math.min(a, b) };
}

function zahl(s) {
  return parseFloat(
    String(s || "")
      .replace(/[^\d.,]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  );
}

/* ---------- Meldung bei neuen Positionen ---------- */

async function melden(neu) {
  try {
    const push = getStore("aktien-push");
    const l = await push.list({ prefix: "sub-" });
    const alle = await Promise.all(
      (l.blobs || []).map((b) =>
        push.get(b.key, { type: "json" }).catch(() => null).then((s) => ({ key: b.key, sub: s }))
      )
    );
    const ziele = alle.filter((z) => z.sub && z.sub.endpoint && z.sub.keys);
    if (!ziele.length) return 0;

    // Erst hier laden: das Lesen der Liste braucht web-push nie
    const webpush = (await import("web-push")).default;
    const k = await keys();
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:push@rcp-aktien.netlify.app",
      k.publicKey,
      k.privateKey
    );

    const namen = neu.map((p) => p.badge).join(" · ");
    const nutzlast = JSON.stringify({
      title: neu.length === 1 ? "Neu in der Liste" : "Neu in der Liste",
      body: namen,
      tag: "neu-" + Date.now().toString(36),
      url: "/#" + neu[0].id
    });

    let raus = 0;
    await Promise.all(ziele.map(async (z) => {
      try {
        await webpush.sendNotification(z.sub, nutzlast);
        raus++;
      } catch (e) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) {
          await push.delete(z.key).catch(() => {});
        }
      }
    }));
    return raus;
  } catch (e) {
    return 0;
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
