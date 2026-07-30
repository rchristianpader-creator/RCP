/* Wer ist gerade da, und wer war zuletzt da.

   POST /.netlify/functions/besuch   { geraet, weg }
     Jede offene Seite meldet sich alle 45 Sekunden, solange sie sichtbar
     ist. Wandert sie in den Hintergrund oder wird geschlossen, kommt ein
     letzter Ruf mit weg: true. Das darf jedes angemeldete Konto.

   GET /.netlify/functions/besuch
     Nur fuer die Verwaltung: je Person, ob sie gerade da ist, seit wann,
     mit welchen Geraeten und wann sie zuletzt da war.

   Gespeichert wird in Netlify Blobs, Store "aktien-besuch", ein Eintrag je
   Geraet:  da/<konto-schluessel>/<geraet-id>

   Ein Eintrag je Geraet, nicht je Konto — sonst wuerde das Schliessen des
   einen Fensters jemanden abmelden, der auf einem zweiten Geraet noch liest.

   Hier steht bewusst keine IP-Adresse und kein voller User-Agent. Fuer die
   Frage "wer ist gerade da" reicht Name, Geraeteart und Zeit. */

import { getStore } from "@netlify/blobs";
import { BESUCH, schluessel, kontoLesen, chefLesen } from "./sitzung.js";

// So lange nach dem letzten Ruf gilt jemand noch als da. Der Takt im
// Browser ist 45 s — zwei verpasste Rufe sind erlaubt, bevor er verschwindet.
const FENSTER = 120 * 1000;

// Was so lange keinen Ruf mehr hatte, wird beim Nachsehen weggeraeumt.
const VERFALL = 60 * 24 * 60 * 60 * 1000;

export default async (request) => {
  try {
    if (request.method === "POST") return await melden(request);
    if (request.method === "GET") return await nachsehen(request);
    return json({ ok: false, fehler: "nur GET oder POST" }, 405);
  } catch (e) {
    return json({ ok: false, fehler: String((e && e.message) || e) }, 500);
  }
};

/* ---------- Melden ---------- */

async function melden(request) {
  const konto = await kontoLesen(request);
  if (!konto) return json({ ok: false, fehler: "nicht angemeldet" }, 401);

  const body = await leseBody(request);
  const geraet = saubereId(body.geraet);
  const weg = body.weg === true;

  const store = getStore(BESUCH);
  const key = "da/" + schluessel(konto.mail) + "/" + geraet;
  const alt = await store.get(key, { type: "json" }).catch(() => null);

  const jetzt = Date.now();
  // Derselbe Besuch geht weiter, solange die Rufe nicht abgerissen sind
  const weiter =
    alt && !alt.weg && alt.zuletzt && jetzt - Date.parse(alt.zuletzt) < FENSTER;

  await store.setJSON(key, {
    mail: konto.mail,
    name: konto.name || "",
    rolle: konto.rolle || "gast",
    geraet: geraeteArt(request.headers.get("user-agent")),
    seit: weiter ? alt.seit : new Date(jetzt).toISOString(),
    zuletzt: new Date(jetzt).toISOString(),
    weg: weg
  });

  return json({ ok: true });
}

/* Aus der Geraete-Kennung des Browsers wird nur die Art behalten. */
function geraeteArt(ua) {
  const s = String(ua || "");
  if (/iPhone/i.test(s)) return "iPhone";
  if (/iPad/i.test(s)) return "iPad";
  if (/Android/i.test(s)) return "Android";
  if (/Macintosh|Mac OS X/i.test(s)) return "Mac";
  if (/Windows/i.test(s)) return "Windows";
  if (/Linux|X11/i.test(s)) return "Linux";
  return "Gerät";
}

/* Die Kennung kommt aus dem Browser und geht in einen Blob-Schluessel —
   deshalb nur Kleinbuchstaben und Ziffern, sonst ein fester Ersatz. */
function saubereId(roh) {
  const s = String(roh || "").toLowerCase();
  return /^[a-z0-9]{4,32}$/.test(s) ? s : "ohnekennung";
}

/* ---------- Nachsehen ---------- */

async function nachsehen(request) {
  const chef = await chefLesen(request);
  if (!chef) return json({ ok: false, fehler: "nur fuer die Verwaltung" }, 403);

  const store = getStore(BESUCH);
  const liste = await store.list({ prefix: "da/" }).catch(() => ({ blobs: [] }));
  const jetzt = Date.now();
  const proPerson = new Map();

  // Alle Eintraege auf einmal holen. Nacheinander waere jeder eine eigene
  // Anfrage an den Speicher, und die Verwaltung wartet beim Oeffnen darauf.
  const eintraege = await Promise.all(
    (liste.blobs || []).map((b) =>
      store.get(b.key, { type: "json" }).catch(() => null).then((e) => ({ key: b.key, e: e }))
    )
  );

  const wegdamit = [];
  for (const { key, e } of eintraege) {
    const t = e && e.zuletzt ? Date.parse(e.zuletzt) : 0;
    if (!e || !e.mail || !t || jetzt - t > VERFALL) {
      wegdamit.push(key);
      continue;
    }

    const da = !e.weg && jetzt - t < FENSTER;

    let p = proPerson.get(e.mail);
    if (!p) {
      p = { mail: e.mail, name: e.name || "", da: false, seit: null, zuletzt: null, geraete: [] };
      proPerson.set(e.mail, p);
    }
    if (e.name && !p.name) p.name = e.name;
    p.geraete.push({ art: e.geraet || "Gerät", da: da, zuletzt: e.zuletzt });

    if (da) {
      p.da = true;
      // Bei zwei Geraeten gilt der frueheste Beginn — so lange ist die Person schon da
      if (!p.seit || Date.parse(e.seit) < Date.parse(p.seit)) p.seit = e.seit || e.zuletzt;
    }
    if (!p.zuletzt || t > Date.parse(p.zuletzt)) p.zuletzt = e.zuletzt;
  }

  // Aufraeumen darf die Antwort nicht aufhalten
  if (wegdamit.length) {
    await Promise.all(wegdamit.map((k) => store.delete(k).catch(() => {})));
  }

  const leute = Array.from(proPerson.values());
  for (const p of leute) {
    p.geraete.sort((a, b) => Date.parse(b.zuletzt) - Date.parse(a.zuletzt));
  }
  // Wer gerade da ist, zuerst; danach nach dem letzten Mal
  leute.sort((a, b) => {
    if (a.da !== b.da) return a.da ? -1 : 1;
    return Date.parse(b.zuletzt) - Date.parse(a.zuletzt);
  });

  return json({
    ok: true,
    jetzt: new Date(jetzt).toISOString(),
    fenster: FENSTER,
    da: leute.filter((p) => p.da).length,
    leute: leute
  });
}

/* ---------- Kleinkram ---------- */

async function leseBody(request) {
  try {
    return (await request.json()) || {};
  } catch (e) {
    return {};
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
