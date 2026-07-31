/* Das Meldungsbuch — was hinter der Glocke steht.

   GET /.netlify/functions/meldungen?seit=<ms>

   Jede Push-Meldung wird beim Versenden auch hier notiert (siehe notieren()
   in sitzung.js). Die Glocke in der App liest sie zurueck.

   Der Parameter "seit" ist der Moment, in dem die App auf diesem Geraet zum
   ersten Mal lief. Aelteres wird nicht ausgeliefert: wer sich heute die App
   holt, soll nicht die Meldungen von vorletzter Woche vorfinden, zu denen er
   nie gefragt wurde.

   Meldungen mit nur: "chef" sieht nur die Verwaltung — Zugangsanfragen gehen
   niemanden sonst etwas an.

   Geschrieben wird hier nichts. Das tun die Stellen, die auch den Push
   verschicken. */

import { getStore } from "@netlify/blobs";
import { MELDUNGEN, kontoLesen } from "./sitzung.js";

const VERFALL = 60 * 24 * 60 * 60 * 1000;   // aelter wird beim Nachsehen weggeraeumt
const HOECHSTENS = 40;                       // so viele gehen an die Glocke
const GELESEN = 200;                         // so viele werden ueberhaupt angesehen

export default async (request) => {
  try {
    const konto = await kontoLesen(request);
    if (!konto) return json({ ok: false, fehler: "nicht angemeldet" }, 401);
    const chef = konto.rolle === "chef";

    const url = new URL(request.url);
    const seit = Number(url.searchParams.get("seit") || 0) || 0;

    const store = getStore(MELDUNGEN);
    const liste = await store.list({ prefix: "m/" }).catch(() => ({ blobs: [] }));

    // Der Schluessel traegt die Zeit rueckwaerts — aufsteigend sortiert
    // steht damit das Neueste vorn.
    const schluessel = (liste.blobs || []).map((b) => b.key).sort().slice(0, GELESEN);
    const alle = await Promise.all(
      schluessel.map((k) =>
        store.get(k, { type: "json" }).catch(() => null).then((e) => ({ key: k, e: e }))
      )
    );

    const jetzt = Date.now();
    const wegdamit = [];
    const raus = [];

    for (const { key, e } of alle) {
      const t = e && e.zeit ? Date.parse(e.zeit) : 0;
      if (!e || !t || jetzt - t > VERFALL) { wegdamit.push(key); continue; }
      if (e.nur === "chef" && !chef) continue;
      if (seit && t < seit) continue;
      if (raus.length < HOECHSTENS) raus.push(e);
    }

    if (wegdamit.length) {
      await Promise.all(wegdamit.map((k) => store.delete(k).catch(() => {})));
    }

    return json({ ok: true, jetzt: new Date(jetzt).toISOString(), meldungen: raus });
  } catch (e) {
    return json({ ok: false, fehler: String((e && e.message) || e) }, 500);
  }
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
