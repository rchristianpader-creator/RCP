/* Konten: Registrierung, Anmeldung, Freigabe.

   Aufruf: /.netlify/functions/konto?tat=...

     wer           GET   — wer ist gerade angemeldet
     registrieren  POST  { mail, passwort, name }   — legt ein wartendes Konto an
     anmelden      POST  { mail, passwort, merken } — setzt den Sitzungs-Keks
     abmelden      POST                             — loescht den Keks
     passwort      POST  { alt, neu }               — eigenes Passwort aendern

   Nur fuer die Verwaltung (Rolle "chef"):

     liste         GET
     entscheiden   POST  { mail, status }  status = frei | wartet | gesperrt
     loeschen      POST  { mail }

   Das erste Konto wird automatisch Chef und ist sofort frei. Ist die
   Environment-Variable ADMIN_MAIL gesetzt, gilt das nur fuer diese Adresse.
   Alle weiteren Konten stehen auf "wartet", bis der Chef sie freigibt.

   Konten liegen in Netlify Blobs, Store "aktien-konten". Passwoerter als
   scrypt-Hash mit eigenem Salz — im Klartext steht nichts. */

import webpush from "web-push";
import { getStore } from "@netlify/blobs";
import { keys } from "./vapid.js";
import {
  LADEN,
  DAUER_KURZ,
  DAUER_LANG,
  geheimnis,
  signieren,
  pruefen,
  keksLesen,
  keksSetzen,
  keksLoeschen,
  hashen,
  passtPasswort,
  mailNormal,
  mailGueltig,
  schluessel,
  KEKS
} from "./sitzung.js";

const MIN_PASSWORT = 10;
const MAX_FEHLER = 5;
const SPERRE = 15 * 60 * 1000;

export default async (request) => {
  if (!geheimnis()) {
    return json({ ok: false, fehler: "RCP_GEHEIMNIS ist nicht gesetzt" }, 503);
  }

  const url = new URL(request.url);
  const tat = url.searchParams.get("tat") || "wer";
  const store = getStore(LADEN);

  try {
    switch (tat) {
      case "wer":
        return await wer(request, store);
      case "registrieren":
        return await registrieren(request, store);
      case "anmelden":
        return await anmelden(request, store);
      case "abmelden":
        return abmelden();
      case "passwort":
        return await passwortAendern(request, store);
      case "liste":
        return await liste(request, store);
      case "entscheiden":
        return await entscheiden(request, store);
      case "loeschen":
        return await loeschen(request, store);
      default:
        return json({ ok: false, fehler: "unbekannte Tat" }, 400);
    }
  } catch (e) {
    return json({ ok: false, fehler: String((e && e.message) || e) }, 500);
  }
};

/* ---------- Sitzung ---------- */

function sitzung(request) {
  const token = keksLesen(request, KEKS) || request.headers.get("x-rcp-sitzung") || "";
  return pruefen(token);
}

async function wer(request, store) {
  const s = sitzung(request);
  if (!s || !s.m) return json({ ok: true, angemeldet: false }, 200);

  const konto = await store.get(schluessel(s.m), { type: "json" }).catch(() => null);
  if (!konto || konto.status !== "frei") {
    return new Response(JSON.stringify({ ok: true, angemeldet: false }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Set-Cookie": keksLoeschen()
      }
    });
  }

  return json({
    ok: true,
    angemeldet: true,
    mail: konto.mail,
    name: konto.name || "",
    rolle: konto.rolle || "gast",
    chef: konto.rolle === "chef",
    // Die Verwaltung sieht sofort, ob etwas offen ist
    wartend: konto.rolle === "chef" ? await zaehleWartende(store) : 0
  });
}

async function zaehleWartende(store) {
  try {
    const l = await store.list({ prefix: "nutzer/" });
    let n = 0;
    for (const blob of l.blobs || []) {
      const k = await store.get(blob.key, { type: "json" }).catch(() => null);
      if (k && k.status === "wartet") n++;
    }
    return n;
  } catch (e) {
    return 0;
  }
}

/* ---------- Registrierung ---------- */

async function registrieren(request, store) {
  const body = await leseBody(request);
  const mail = mailNormal(body.mail);
  const passwort = String(body.passwort || "");
  const name = String(body.name || "").trim().slice(0, 60);

  if (!mailGueltig(mail)) return json({ ok: false, fehler: "Bitte eine gueltige E-Mail-Adresse." }, 400);
  if (passwort.length < MIN_PASSWORT) {
    return json({ ok: false, fehler: "Das Passwort braucht mindestens " + MIN_PASSWORT + " Zeichen." }, 400);
  }

  const key = schluessel(mail);
  const da = await store.get(key, { type: "json" }).catch(() => null);

  // Vorhandene Adressen werden nicht verraten: dieselbe Antwort wie bei neu
  if (da) return json({ ok: true, status: "wartet", hinweis: "Anfrage ist eingegangen." });

  const erste = !(await esGibtKonten(store));
  const adminMail = mailNormal(process.env.ADMIN_MAIL || "");
  const chef = adminMail ? mail === adminMail : erste;

  const { salz, hash } = hashen(passwort);
  const konto = {
    mail: mail,
    name: name,
    salz: salz,
    hash: hash,
    rolle: chef ? "chef" : "gast",
    status: chef ? "frei" : "wartet",
    erstellt: new Date().toISOString(),
    zuletzt: null,
    fehler: 0,
    sperre_bis: 0
  };
  await store.setJSON(key, konto);

  if (!chef) await meldeAnfrage(konto);

  return json({
    ok: true,
    status: konto.status,
    hinweis: chef
      ? "Konto angelegt und freigegeben."
      : "Anfrage ist eingegangen. Sie wird freigegeben, dann kannst du dich anmelden."
  });
}

/* Push an die Geraete der Verwaltung, sobald jemand Zugang anfragt.
   Schlaegt das fehl, ist die Anfrage trotzdem gespeichert — sie steht dann
   eben nur in der Verwaltung und meldet sich nicht von selbst. */
async function meldeAnfrage(konto) {
  try {
    const push = getStore("aktien-push");
    const l = await push.list({ prefix: "sub-" });

    const ziele = [];
    for (const blob of l.blobs || []) {
      const s = await push.get(blob.key, { type: "json" }).catch(() => null);
      if (s && s.endpoint && s.rolle === "chef") ziele.push({ key: blob.key, sub: s });
    }
    if (!ziele.length) return;

    const k = await keys();
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:push@rcp-aktien.netlify.app",
      k.publicKey,
      k.privateKey
    );

    const nutzlast = JSON.stringify({
      title: "Neue Zugangsanfrage",
      body: (konto.name ? konto.name + " · " : "") + konto.mail,
      tag: "zugang",
      url: "/verwaltung.html"
    });

    for (const z of ziele) {
      try {
        await webpush.sendNotification(z.sub, nutzlast);
      } catch (e) {
        // Abgemeldetes Geraet: Eintrag aufraeumen
        if (e && (e.statusCode === 404 || e.statusCode === 410)) {
          await push.delete(z.key).catch(() => {});
        }
      }
    }
  } catch (e) {
    // stiller Fehlschlag, die Anfrage steht
  }
}

async function esGibtKonten(store) {
  try {
    const l = await store.list({ prefix: "nutzer/" });
    return (l.blobs || []).length > 0;
  } catch (e) {
    return false;
  }
}

/* ---------- Anmeldung ---------- */

async function anmelden(request, store) {
  const body = await leseBody(request);
  const mail = mailNormal(body.mail);
  const passwort = String(body.passwort || "");
  const merken = body.merken === true || body.merken === "1";

  const key = schluessel(mail);
  const konto = await store.get(key, { type: "json" }).catch(() => null);

  // Kein Konto: gleiche Antwort wie falsches Passwort
  if (!konto) return json({ ok: false, fehler: "E-Mail oder Passwort stimmt nicht." }, 401);

  const jetzt = Date.now();
  if (konto.sperre_bis && konto.sperre_bis > jetzt) {
    const min = Math.ceil((konto.sperre_bis - jetzt) / 60000);
    return json({ ok: false, fehler: "Zu viele Versuche. Bitte in " + min + " Minuten noch einmal." }, 429);
  }

  if (!passtPasswort(passwort, konto.salz, konto.hash)) {
    konto.fehler = (konto.fehler || 0) + 1;
    if (konto.fehler >= MAX_FEHLER) {
      konto.fehler = 0;
      konto.sperre_bis = jetzt + SPERRE;
    }
    await store.setJSON(key, konto);
    return json({ ok: false, fehler: "E-Mail oder Passwort stimmt nicht." }, 401);
  }

  if (konto.status === "wartet") {
    return json({ ok: false, fehler: "Das Konto ist noch nicht freigegeben." }, 403);
  }
  if (konto.status !== "frei") {
    return json({ ok: false, fehler: "Das Konto ist gesperrt." }, 403);
  }

  konto.fehler = 0;
  konto.sperre_bis = 0;
  konto.zuletzt = new Date().toISOString();
  await store.setJSON(key, konto);

  const dauer = merken ? DAUER_LANG : DAUER_KURZ;
  const token = signieren({ m: konto.mail, r: konto.rolle }, dauer);

  return new Response(
    JSON.stringify({ ok: true, mail: konto.mail, name: konto.name || "", chef: konto.rolle === "chef" }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        // Bei "merken" bleibt der Keks nach dem Schliessen erhalten,
        // sonst gilt er nur fuer diese Sitzung.
        "Set-Cookie": keksSetzen(token, merken ? dauer : 0)
      }
    }
  );
}

function abmelden() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Set-Cookie": keksLoeschen()
    }
  });
}

async function passwortAendern(request, store) {
  const s = sitzung(request);
  if (!s || !s.m) return json({ ok: false, fehler: "nicht angemeldet" }, 401);

  const body = await leseBody(request);
  const alt = String(body.alt || "");
  const neu = String(body.neu || "");
  if (neu.length < MIN_PASSWORT) {
    return json({ ok: false, fehler: "Das neue Passwort braucht mindestens " + MIN_PASSWORT + " Zeichen." }, 400);
  }

  const key = schluessel(s.m);
  const konto = await store.get(key, { type: "json" }).catch(() => null);
  if (!konto) return json({ ok: false, fehler: "nicht angemeldet" }, 401);
  if (!passtPasswort(alt, konto.salz, konto.hash)) {
    return json({ ok: false, fehler: "Das alte Passwort stimmt nicht." }, 401);
  }

  const frisch = hashen(neu);
  konto.salz = frisch.salz;
  konto.hash = frisch.hash;
  await store.setJSON(key, konto);
  return json({ ok: true });
}

/* ---------- Verwaltung ---------- */

async function alsChef(request, store) {
  const s = sitzung(request);
  if (!s || !s.m) return null;
  const konto = await store.get(schluessel(s.m), { type: "json" }).catch(() => null);
  if (!konto || konto.status !== "frei" || konto.rolle !== "chef") return null;
  return konto;
}

async function liste(request, store) {
  const chef = await alsChef(request, store);
  if (!chef) return json({ ok: false, fehler: "nur fuer die Verwaltung" }, 403);

  const l = await store.list({ prefix: "nutzer/" });
  const konten = [];
  for (const blob of l.blobs || []) {
    const k = await store.get(blob.key, { type: "json" }).catch(() => null);
    if (!k) continue;
    konten.push({
      mail: k.mail,
      name: k.name || "",
      rolle: k.rolle || "gast",
      status: k.status,
      erstellt: k.erstellt || null,
      zuletzt: k.zuletzt || null,
      gesperrt_bis: k.sperre_bis && k.sperre_bis > Date.now() ? new Date(k.sperre_bis).toISOString() : null
    });
  }

  const rang = { wartet: 0, frei: 1, gesperrt: 2 };
  konten.sort((a, b) => (rang[a.status] - rang[b.status]) || a.mail.localeCompare(b.mail));

  return json({ ok: true, ich: chef.mail, konten: konten });
}

async function entscheiden(request, store) {
  const chef = await alsChef(request, store);
  if (!chef) return json({ ok: false, fehler: "nur fuer die Verwaltung" }, 403);

  const body = await leseBody(request);
  const mail = mailNormal(body.mail);
  const status = String(body.status || "");
  if (["frei", "wartet", "gesperrt"].indexOf(status) < 0) {
    return json({ ok: false, fehler: "unbekannter Status" }, 400);
  }
  if (mail === chef.mail && status !== "frei") {
    return json({ ok: false, fehler: "Das eigene Konto kann nicht gesperrt werden." }, 400);
  }

  const key = schluessel(mail);
  const konto = await store.get(key, { type: "json" }).catch(() => null);
  if (!konto) return json({ ok: false, fehler: "Konto nicht gefunden" }, 404);

  konto.status = status;
  konto.fehler = 0;
  konto.sperre_bis = 0;
  await store.setJSON(key, konto);
  return json({ ok: true, mail: mail, status: status });
}

async function loeschen(request, store) {
  const chef = await alsChef(request, store);
  if (!chef) return json({ ok: false, fehler: "nur fuer die Verwaltung" }, 403);

  const body = await leseBody(request);
  const mail = mailNormal(body.mail);
  if (mail === chef.mail) {
    return json({ ok: false, fehler: "Das eigene Konto kann nicht geloescht werden." }, 400);
  }

  await store.delete(schluessel(mail));
  return json({ ok: true, mail: mail });
}

/* ---------- Kleinkram ---------- */

async function leseBody(request) {
  if (request.method !== "POST") return {};
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
