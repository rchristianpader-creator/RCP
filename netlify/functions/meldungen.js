/* Das Meldungsbuch — was hinter der Glocke steht.

     GET  ?seit=<ms>          -> { ok, jetzt, meldungen }   fuer die Glocke
     GET  ?alle=1             -> { ok, jetzt, meldungen }   das ganze Buch, nur Verwaltung
     POST { tat: "weg", id }  -> { ok, meldungen }          eine wegraeumen
     POST { tat: "leeren" }   -> { ok, meldungen }          alle wegraeumen

   Jede Push-Meldung wird beim Versenden auch hier notiert (siehe notieren()
   in sitzung.js). Die Glocke in der App liest sie zurueck.

   Der Parameter "seit" ist der Moment, in dem die App auf diesem Geraet zum
   ersten Mal lief. Aelteres wird nicht ausgeliefert: wer sich heute die App
   holt, soll nicht die Meldungen von vorletzter Woche vorfinden, zu denen er
   nie gefragt wurde.

   Meldungen mit nur: "chef" sieht nur die Verwaltung — Zugangsanfragen gehen
   niemanden sonst etwas an.

   Geschrieben wird hier nichts. Was hier steht, kommt von den Stellen, die
   auch den Push verschicken — weggeraeumt wird dagegen nur hier, und nur von
   der Verwaltung. Eine Meldung ist fuer alle dieselbe: was hier weggeht, ist
   auf jedem Geraet weg. */

import { getStore } from "@netlify/blobs";
import { MELDUNGEN, kontoLesen, chefLesen } from "./sitzung.js";
import { ausAdresse, loeschen as bildLoeschen } from "./bild.js";

const VERFALL = 60 * 24 * 60 * 60 * 1000;   // aelter wird beim Nachsehen weggeraeumt
const HOECHSTENS = 40;                       // so viele gehen an die Glocke
const GELESEN = 200;                         // so viele werden ueberhaupt angesehen

export default async (request) => {
  try {
    const store = getStore(MELDUNGEN);

    if (request.method === "POST") return schreiben(request, store);

    const konto = await kontoLesen(request);
    if (!konto) return json({ ok: false, fehler: "nicht angemeldet" }, 401);
    const chef = konto.rolle === "chef";

    const url = new URL(request.url);
    const seit = Number(url.searchParams.get("seit") || 0) || 0;
    /* Die Verwaltung sieht das ganze Buch: ohne Stichtag, mit allem, was
       darin steht. Sonst raeumte sie weg, was sie gar nicht sieht. */
    const alles = chef && url.searchParams.get("alle") === "1";

    const { eintraege, wegdamit, jetzt } = await buch(store);
    if (wegdamit.length) await entsorgen(store, wegdamit, eintraege);

    const raus = [];
    for (const e of eintraege) {
      if (e.nur === "chef" && !chef) continue;
      if (!alles && seit && Date.parse(e.zeit) < seit) continue;
      if (alles || raus.length < HOECHSTENS) raus.push(nackt(e));
    }

    return json({ ok: true, jetzt: new Date(jetzt).toISOString(), meldungen: raus });
  } catch (e) {
    return json({ ok: false, fehler: String((e && e.message) || e) }, 500);
  }
};

async function schreiben(request, store) {
  const chef = await chefLesen(request);
  if (!chef) return json({ ok: false, fehler: "nur fuer die Verwaltung" }, 403);

  let body = {};
  try {
    body = (await request.json()) || {};
  } catch (e) {
    return json({ ok: false, fehler: "kein gueltiges JSON" }, 400);
  }

  const { eintraege } = await buch(store);

  if (body.tat === "leeren") {
    await entsorgen(store, eintraege.map((e) => e.key), []);
    return json({ ok: true, geloescht: eintraege.length, meldungen: [] });
  }

  if (body.tat === "weg") {
    const id = String(body.id || "");
    if (!id) return json({ ok: false, fehler: "welche denn" }, 400);
    const weg = eintraege.filter((e) => e.id === id);
    if (!weg.length) return json({ ok: false, fehler: "nicht gefunden" }, 404);
    const bleibt = eintraege.filter((e) => e.id !== id);
    await entsorgen(store, weg.map((e) => e.key), bleibt);
    return json({ ok: true, geloescht: weg.length, meldungen: bleibt.map(nackt) });
  }

  return json({ ok: false, fehler: "unbekannte Tat" }, 400);
}

/* Das Buch einmal lesen: was gilt, was verfallen ist, und wie spaet es ist.
   Der Schluessel traegt die Zeit rueckwaerts — aufsteigend sortiert steht
   damit das Neueste vorn. */
async function buch(store) {
  const liste = await store.list({ prefix: "m/" }).catch(() => ({ blobs: [] }));
  const schluessel = (liste.blobs || []).map((b) => b.key).sort().slice(0, GELESEN);
  const alle = await Promise.all(
    schluessel.map((k) =>
      store.get(k, { type: "json" }).catch(() => null).then((e) => ({ key: k, e: e }))
    )
  );

  const jetzt = Date.now();
  const eintraege = [];
  const wegdamit = [];
  for (const { key, e } of alle) {
    const t = e && e.zeit ? Date.parse(e.zeit) : 0;
    if (!e || !t || jetzt - t > VERFALL) { wegdamit.push(key); continue; }
    // Der Schluessel reist mit, damit das Wegraeumen ihn nicht neu sucht
    eintraege.push(Object.assign({}, e, { key: key }));
  }
  return { eintraege, wegdamit, jetzt };
}

/* Der Schluessel ist Hausgebrauch und geht niemanden draussen etwas an. */
function nackt(e) {
  const k = Object.assign({}, e);
  delete k.key;
  return k;
}

/* Meldungen wegraeumen — samt ihrer Bilder.

   Ein Bild geht nur mit, wenn keine der bleibenden Meldungen noch darauf
   zeigt. Zwei Meldungen mit demselben Bild kommen beim Verschicken zwar
   nicht vor, aber ein verwaistes Bild waere Muell und ein zu frueh
   geloeschtes ein Loch in einer Meldung, die noch steht. */
async function entsorgen(store, schluessel, bleiben) {
  const gebraucht = new Set(
    (bleiben || []).map((e) => ausAdresse(e && e.bild)).filter(Boolean)
  );
  const weg = [...new Set(schluessel)];

  const bilder = new Set();
  for (const k of weg) {
    const e = await store.get(k, { type: "json" }).catch(() => null);
    const b = ausAdresse(e && e.bild);
    if (b && !gebraucht.has(b)) bilder.add(b);
  }

  await Promise.all(
    weg.map((k) => store.delete(k).catch(() => {}))
      .concat([...bilder].map((b) => bildLoeschen(b)))
  );
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
